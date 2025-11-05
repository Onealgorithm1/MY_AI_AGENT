import { useState, useRef, useCallback } from 'react';
import telemetryService from '../services/telemetry';

const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  STREAMING: 'streaming',
  PLAYING: 'playing',
  ERROR: 'error',
};

/**
 * Streaming audio hook for progressive TTS playback
 * Plays audio chunks as they arrive from the server
 */
export default function useStreamingAudio(messageId, voiceId) {
  const [state, setState] = useState(AUDIO_STATES.IDLE);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [latencyMs, setLatencyMs] = useState(null);
  const [totalLatencyMs, setTotalLatencyMs] = useState(null);
  
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const currentSourceRef = useRef(null);
  const isPlayingRef = useRef(false);
  const streamStartTimeRef = useRef(0);
  const firstChunkTimeRef = useRef(null);

  /**
   * Play next audio chunk from queue
   */
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    const chunk = audioQueueRef.current.shift();
    isPlayingRef.current = true;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(chunk.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);

      // Create and play source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      currentSourceRef.current = source;

      source.onended = () => {
        isPlayingRef.current = false;
        currentSourceRef.current = null;
        
        // Update progress
        setProgress(prev => ({ ...prev, current: chunk.chunkIndex + 1 }));
        
        // Play next chunk if available, otherwise go idle
        if (audioQueueRef.current.length > 0) {
          playNextChunk();
        } else if (chunk.isLast) {
          setState(AUDIO_STATES.IDLE);
          
          // Record total streaming session time
          const totalTime = Date.now() - streamStartTimeRef.current;
          telemetryService.sendEvent('performance', {
            metric: 'tts_streaming_total_time',
            value: totalTime,
            unit: 'ms',
            tags: { messageId, totalChunks: chunk.totalChunks },
            metadata: { 
              firstChunkTime: firstChunkTimeRef.current,
              voiceId: voiceId || 'unknown'
            }
          });
        }
      };

      source.start(0);
      setState(AUDIO_STATES.PLAYING);
      
    } catch (err) {
      console.error('Failed to play audio chunk:', err);
      isPlayingRef.current = false;
      setError(err.message || 'Failed to play audio chunk');
      setState(AUDIO_STATES.ERROR);
    }
  }, [messageId, voiceId]);

  /**
   * Stream audio from backend
   */
  const streamAudio = useCallback(async (text) => {
    if (!text || state === AUDIO_STATES.STREAMING) {
      return;
    }

    setState(AUDIO_STATES.LOADING);
    setError(null);
    setProgress({ current: 0, total: 0 });
    setLatencyMs(null); // Reset latency for new session
    setTotalLatencyMs(null); // Reset total latency
    streamStartTimeRef.current = Date.now();
    firstChunkTimeRef.current = null;

    try {
      const response = await fetch('/api/tts/synthesize-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text, voiceId: voiceId || 'en-US-Neural2-F' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setState(AUDIO_STATES.STREAMING);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line);
            
            if (chunk.error) {
              console.error(`Chunk ${chunk.chunkIndex} error:`, chunk.error);
              continue;
            }

            // Record first chunk arrival time
            if (firstChunkTimeRef.current === null) {
              firstChunkTimeRef.current = Date.now() - streamStartTimeRef.current;
              
              // Update latency state for UI display
              setLatencyMs(Math.round(firstChunkTimeRef.current));
              
              telemetryService.sendEvent('performance', {
                metric: 'tts_streaming_first_chunk_time',
                value: firstChunkTimeRef.current,
                unit: 'ms',
                tags: { messageId },
                metadata: { voiceId: voiceId || 'unknown', totalChunks: chunk.totalChunks }
              });
            }

            // Update total chunks
            setProgress(prev => ({ ...prev, total: chunk.totalChunks }));

            // Add chunk to queue
            audioQueueRef.current.push(chunk);

            // Start playback if not already playing
            if (!isPlayingRef.current) {
              playNextChunk();
            }

            console.log(`📦 Received chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} (${chunk.chunkLatency}ms)`);

          } catch (parseError) {
            console.error('Failed to parse chunk:', parseError);
          }
        }
      }

      console.log('🎬 Stream complete, all chunks received');
      
      // Calculate and store total latency
      const totalTime = Date.now() - streamStartTimeRef.current;
      setTotalLatencyMs(Math.round(totalTime));

    } catch (err) {
      console.error('Failed to stream audio:', err);
      setError(err.message || 'Failed to stream audio');
      setState(AUDIO_STATES.ERROR);
    }
  }, [state, voiceId, messageId, playNextChunk]);

  /**
   * Stop playback and clear queue
   */
  const stop = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setState(AUDIO_STATES.IDLE);
    setProgress({ current: 0, total: 0 });
  }, []);

  return {
    state,
    error,
    progress,
    latencyMs,
    totalLatencyMs,
    streamAudio,
    stop,
    isLoading: state === AUDIO_STATES.LOADING,
    isStreaming: state === AUDIO_STATES.STREAMING,
    isPlaying: state === AUDIO_STATES.PLAYING,
    isError: state === AUDIO_STATES.ERROR,
    isIdle: state === AUDIO_STATES.IDLE,
  };
}
