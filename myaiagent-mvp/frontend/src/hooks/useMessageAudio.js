import { useState, useRef, useCallback, useEffect } from 'react';
import { getCachedAudio, cacheAudio } from '../utils/audioCache';
import { calculateWordTimings, getCurrentWordIndex } from '../utils/wordTiming';
import { tts } from '../services/api';

const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
};

export default function useMessageAudio(messageId, text, voiceId) {
  const [state, setState] = useState(AUDIO_STATES.IDLE);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const audioBufferRef = useRef(null);
  const wordTimingsRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const animationFrameRef = useRef(null);

  const updateCurrentWord = useCallback(() => {
    if (!audioContextRef.current || !wordTimingsRef.current || state !== AUDIO_STATES.PLAYING) {
      return;
    }

    const currentTime = audioContextRef.current.currentTime - startTimeRef.current + pausedAtRef.current;
    const wordIndex = getCurrentWordIndex(wordTimingsRef.current, currentTime);
    
    setCurrentWordIndex(wordIndex);

    if (wordIndex >= wordTimingsRef.current.length) {
      setState(AUDIO_STATES.COMPLETED);
      setCurrentWordIndex(-1);
      cancelAnimationFrame(animationFrameRef.current);
    } else {
      animationFrameRef.current = requestAnimationFrame(updateCurrentWord);
    }
  }, [state]);

  const loadAudio = useCallback(async () => {
    if (!text || !voiceId) {
      setError('Missing text or voice');
      return null;
    }

    setState(AUDIO_STATES.LOADING);
    setError(null);

    try {
      let audioBlob = await getCachedAudio(messageId, voiceId);
      
      if (!audioBlob) {
        audioBlob = await tts.synthesize(text, voiceId);
        await cacheAudio(messageId, voiceId, audioBlob);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      wordTimingsRef.current = calculateWordTimings(text, audioBuffer.duration);

      return audioBuffer;
    } catch (err) {
      console.error('Failed to load audio:', err);
      setError(err.message || 'Failed to load audio');
      setState(AUDIO_STATES.ERROR);
      return null;
    }
  }, [messageId, text, voiceId]);

  const play = useCallback(async () => {
    if (state === AUDIO_STATES.PLAYING) return;

    if (!audioBufferRef.current) {
      const buffer = await loadAudio();
      if (!buffer) return;
    }

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        if (state === AUDIO_STATES.PLAYING) {
          setState(AUDIO_STATES.COMPLETED);
          setCurrentWordIndex(-1);
          pausedAtRef.current = 0;
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      const offset = pausedAtRef.current || 0;
      source.start(0, offset);
      
      sourceNodeRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime - offset;
      
      setState(AUDIO_STATES.PLAYING);
      setHasPlayed(true);
      
      animationFrameRef.current = requestAnimationFrame(updateCurrentWord);
    } catch (err) {
      console.error('Failed to play audio:', err);
      setError(err.message || 'Failed to play audio');
      setState(AUDIO_STATES.ERROR);
    }
  }, [state, loadAudio, updateCurrentWord]);

  const pause = useCallback(() => {
    if (state !== AUDIO_STATES.PLAYING) return;

    if (sourceNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime - startTimeRef.current + pausedAtRef.current;
      pausedAtRef.current = currentTime;
      
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    cancelAnimationFrame(animationFrameRef.current);
    setState(AUDIO_STATES.PAUSED);
  }, [state]);

  const resume = useCallback(() => {
    if (state !== AUDIO_STATES.PAUSED) return;
    play();
  }, [state, play]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    
    cancelAnimationFrame(animationFrameRef.current);
    pausedAtRef.current = 0;
    setCurrentWordIndex(-1);
    setState(AUDIO_STATES.IDLE);
  }, []);

  const replay = useCallback(() => {
    pausedAtRef.current = 0;
    setCurrentWordIndex(-1);
    play();
  }, [play]);

  const toggle = useCallback(() => {
    if (state === AUDIO_STATES.IDLE || state === AUDIO_STATES.COMPLETED || state === AUDIO_STATES.ERROR) {
      if (state === AUDIO_STATES.COMPLETED) {
        replay();
      } else {
        play();
      }
    } else if (state === AUDIO_STATES.PLAYING) {
      pause();
    } else if (state === AUDIO_STATES.PAUSED) {
      replay(); // Restart from beginning instead of resuming
    }
  }, [state, play, pause, replay]);

  const retry = useCallback(() => {
    audioBufferRef.current = null;
    wordTimingsRef.current = null;
    pausedAtRef.current = 0;
    setCurrentWordIndex(-1);
    setError(null);
    play();
  }, [play]);

  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    state,
    currentWordIndex,
    wordTimings: wordTimingsRef.current,
    error,
    hasPlayed,
    play,
    pause,
    resume,
    stop,
    replay,
    toggle,
    retry,
    isLoading: state === AUDIO_STATES.LOADING,
    isPlaying: state === AUDIO_STATES.PLAYING,
    isPaused: state === AUDIO_STATES.PAUSED,
    isCompleted: state === AUDIO_STATES.COMPLETED,
    isError: state === AUDIO_STATES.ERROR,
    isIdle: state === AUDIO_STATES.IDLE,
  };
}
