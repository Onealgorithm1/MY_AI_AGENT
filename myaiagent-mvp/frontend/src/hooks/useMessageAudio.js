import { useState, useRef, useCallback, useEffect } from 'react';
import { getCachedAudio, cacheAudio } from '../utils/audioCache';
import { calculateWordTimings, getCurrentWordIndex } from '../utils/wordTiming';
import { tts } from '../services/api';
import telemetryService from '../services/telemetry';

const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  ERROR: 'error',
};

// Global state to track currently playing message
let currentlyPlayingMessageId = null;
let currentlyPlayingStopFn = null;

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
      setState(AUDIO_STATES.IDLE);
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

    const loadStartTime = performance.now();
    let wasFromCache = false;

    try {
      let audioBlob = await getCachedAudio(messageId, voiceId);
      
      if (!audioBlob) {
        const apiStartTime = performance.now();
        audioBlob = await tts.synthesize(text, voiceId);
        const apiDuration = performance.now() - apiStartTime;
        
        // Track API call time (includes network + backend processing)
        telemetryService.trackPerformance('tts_api_call_time', apiDuration);
        
        await cacheAudio(messageId, voiceId, audioBlob);
        wasFromCache = false;
      } else {
        wasFromCache = true;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const decodeStartTime = performance.now();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const decodeDuration = performance.now() - decodeStartTime;
      
      // Track audio decoding time
      telemetryService.trackPerformance('tts_audio_decode_time', decodeDuration);
      
      audioBufferRef.current = audioBuffer;

      wordTimingsRef.current = calculateWordTimings(text, audioBuffer.duration);

      const totalLoadTime = performance.now() - loadStartTime;
      
      // Track total load time
      telemetryService.sendEvent('performance', {
        metric: 'tts_audio_load_time',
        value: totalLoadTime,
        unit: 'ms',
        tags: { fromCache: wasFromCache },
        metadata: { textLength: text.length, voiceId }
      });

      return audioBuffer;
    } catch (err) {
      console.error('Failed to load audio:', err);
      setError(err.message || 'Failed to load audio');
      setState(AUDIO_STATES.ERROR);
      return null;
    }
  }, [messageId, text, voiceId]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    
    cancelAnimationFrame(animationFrameRef.current);
    pausedAtRef.current = 0;
    setCurrentWordIndex(-1);
    setState(AUDIO_STATES.IDLE);
    
    // Clear global tracking if this was the playing message
    if (currentlyPlayingMessageId === messageId) {
      currentlyPlayingMessageId = null;
      currentlyPlayingStopFn = null;
    }
  }, [messageId]);

  const play = useCallback(async () => {
    if (state === AUDIO_STATES.PLAYING) return;

    // Stop any other currently playing message
    if (currentlyPlayingMessageId && currentlyPlayingMessageId !== messageId && currentlyPlayingStopFn) {
      currentlyPlayingStopFn();
    }

    if (!audioBufferRef.current) {
      const buffer = await loadAudio();
      if (!buffer) return;
    }

    try {
      // Start timing after audio is loaded and ready
      const audioReadyTime = audioContextRef.current.currentTime;
      
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
          setState(AUDIO_STATES.IDLE);
          setCurrentWordIndex(-1);
          pausedAtRef.current = 0;
          cancelAnimationFrame(animationFrameRef.current);
          
          // Clear global tracking
          if (currentlyPlayingMessageId === messageId) {
            currentlyPlayingMessageId = null;
            currentlyPlayingStopFn = null;
          }
        }
      };

      // Always start from beginning
      source.start(0, 0);
      
      // Measure playback delay using audio context time
      const playbackStartTime = audioContextRef.current.currentTime;
      const playbackDelayMs = (playbackStartTime - audioReadyTime) * 1000;
      
      // Track frontend playback delay (from audio buffer ready to actual playback start)
      telemetryService.sendEvent('performance', {
        metric: 'tts_frontend_playback_delay',
        value: playbackDelayMs,
        unit: 'ms',
        tags: {},
        metadata: { messageId, voiceId: voiceId || 'unknown' }
      });
      
      sourceNodeRef.current = source;
      startTimeRef.current = playbackStartTime;
      pausedAtRef.current = 0;
      
      setState(AUDIO_STATES.PLAYING);
      setHasPlayed(true);
      
      // Set global tracking
      currentlyPlayingMessageId = messageId;
      currentlyPlayingStopFn = stop;
      
      animationFrameRef.current = requestAnimationFrame(updateCurrentWord);
    } catch (err) {
      console.error('Failed to play audio:', err);
      setError(err.message || 'Failed to play audio');
      setState(AUDIO_STATES.ERROR);
    }
  }, [state, loadAudio, updateCurrentWord, messageId, voiceId, stop]);

  const toggle = useCallback(() => {
    if (state === AUDIO_STATES.IDLE || state === AUDIO_STATES.ERROR) {
      play();
    } else if (state === AUDIO_STATES.PLAYING) {
      stop();
    }
  }, [state, play, stop]);

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
    stop,
    toggle,
    retry,
    isLoading: state === AUDIO_STATES.LOADING,
    isPlaying: state === AUDIO_STATES.PLAYING,
    isError: state === AUDIO_STATES.ERROR,
    isIdle: state === AUDIO_STATES.IDLE,
  };
}
