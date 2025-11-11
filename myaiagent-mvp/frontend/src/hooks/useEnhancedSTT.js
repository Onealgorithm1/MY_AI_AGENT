import { useState, useRef, useCallback, useEffect } from 'react';
import { stt } from '../services/api.js';

/**
 * Enhanced Speech-to-Text hook with WebSocket streaming and Voice Activity Detection
 *
 * Features:
 * - Real-time streaming transcription via WebSocket
 * - Automatic Voice Activity Detection (VAD)
 * - Optimized audio settings (16kHz for speech)
 * - Automatic fallback to REST API
 * - Backward compatible with useStreamingSTT
 */
export default function useEnhancedSTT(options = {}) {
  const {
    enableWebSocket = true,        // Enable WebSocket streaming
    enableVAD = true,               // Enable Voice Activity Detection
    vadSilenceThreshold = 1500,    // Stop after 1.5s of silence
    vadVolumeThreshold = 0.01,     // Volume threshold for VAD
    sampleRate = 16000,             // Optimized for speech (16kHz vs 48kHz)
    autoStopOnSilence = true,       // Auto-stop when silence detected
    chunkIntervalMs = 250,          // Send chunks every 250ms
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState(null);
  const [useWebSocket, setUseWebSocket] = useState(enableWebSocket);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const chunkIntervalRef = useRef(null);
  const vadCheckIntervalRef = useRef(null);

  /**
   * Initialize WebSocket connection for streaming
   */
  const initWebSocket = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          reject(new Error('No authentication token'));
          return;
        }

        // Determine WebSocket URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const wsUrl = apiUrl
          .replace('http://', 'ws://')
          .replace('https://', 'wss://')
          .replace('/api', '');

        const ws = new WebSocket(`${wsUrl}/stt-stream?token=${token}`);

        ws.onopen = () => {
          console.log('✅ WebSocket STT connected');
          wsRef.current = ws;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'ready') {
              console.log('🎤 STT service ready');
              resolve(ws);
            } else if (message.type === 'partial') {
              setPartialTranscript(message.transcript);
              console.log('📝 Partial:', message.transcript);
            } else if (message.type === 'final') {
              setFinalTranscript(prev => {
                const updated = prev ? `${prev} ${message.transcript}` : message.transcript;
                setPartialTranscript(''); // Clear partial
                return updated;
              });
              console.log('✅ Final:', message.transcript);
            } else if (message.type === 'error') {
              console.error('STT error:', message.message);
              setError(message.message);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket STT disconnected');
          wsRef.current = null;
        };

      } catch (err) {
        reject(err);
      }
    });
  }, []);

  /**
   * Setup Voice Activity Detection
   */
  const setupVAD = useCallback((stream) => {
    if (!enableVAD || !autoStopOnSilence) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate
      });
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 2048;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start VAD monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSoundTime = Date.now();

      vadCheckIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);

        // Calculate volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / dataArray.length);

        // Check if sound detected
        if (volume > vadVolumeThreshold) {
          lastSoundTime = Date.now();

          // Clear silence timeout if exists
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else {
          // Check if silence duration exceeded threshold
          const silenceDuration = Date.now() - lastSoundTime;

          if (silenceDuration > vadSilenceThreshold && !silenceTimeoutRef.current) {
            console.log('🤐 Silence detected, auto-stopping...');
            silenceTimeoutRef.current = setTimeout(() => {
              stopListening();
            }, 100);
          }
        }
      }, 100); // Check every 100ms

    } catch (err) {
      console.warn('VAD setup failed (non-critical):', err);
    }
  }, [enableVAD, autoStopOnSilence, vadSilenceThreshold, vadVolumeThreshold, sampleRate]);

  /**
   * Cleanup VAD resources
   */
  const cleanupVAD = useCallback(() => {
    if (vadCheckIntervalRef.current) {
      clearInterval(vadCheckIntervalRef.current);
      vadCheckIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  /**
   * Start listening - WebSocket or REST mode
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      setPartialTranscript('');
      setFinalTranscript('');
      audioChunksRef.current = [];

      // Get microphone access with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // Setup Voice Activity Detection
      setupVAD(stream);

      // Try WebSocket first if enabled
      if (useWebSocket) {
        try {
          const ws = await initWebSocket();

          // Send start signal
          ws.send(JSON.stringify({ type: 'start' }));

          // Create MediaRecorder for streaming chunks
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000, // Lower bitrate for speech
          });

          mediaRecorderRef.current = mediaRecorder;

          // Collect chunks for both WebSocket and fallback
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);

              // Send chunk to WebSocket
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = reader.result.split(',')[1];
                  wsRef.current.send(JSON.stringify({
                    type: 'audio',
                    data: base64
                  }));
                };
                reader.readAsDataURL(event.data);
              }
            }
          };

          // Start recording with chunked output
          mediaRecorder.start(chunkIntervalMs);
          setIsListening(true);

          console.log('🎤 WebSocket streaming started');
          return;

        } catch (wsError) {
          console.warn('WebSocket failed, falling back to REST:', wsError);
          setUseWebSocket(false); // Disable for this session
          // Continue to REST fallback below
        }
      }

      // Fallback to REST mode
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      console.log('🎤 REST recording started');

    } catch (err) {
      console.error('Error starting voice input:', err);
      setError('Microphone access denied');
      cleanupVAD();
    }
  }, [useWebSocket, initWebSocket, setupVAD, cleanupVAD, sampleRate, chunkIntervalMs]);

  /**
   * Stop listening - finalize transcription
   */
  const stopListening = useCallback(async () => {
    return new Promise((resolve, reject) => {
      // Cleanup VAD
      cleanupVAD();

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(finalTranscript || partialTranscript || '');
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          setIsListening(false);

          // Stop microphone stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // WebSocket mode
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Send stop signal
            wsRef.current.send(JSON.stringify({ type: 'stop' }));

            // Wait a bit for final results
            await new Promise(r => setTimeout(r, 500));

            // Close WebSocket
            wsRef.current.close();
            wsRef.current = null;

            const result = finalTranscript || partialTranscript || '';
            setPartialTranscript('');
            resolve(result);
            return;
          }

          // REST fallback mode
          setIsTranscribing(true);

          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm;codecs=opus'
          });

          console.log('🎤 Sending to REST API:', {
            size: audioBlob.size,
            chunks: audioChunksRef.current.length
          });

          const transcript = await stt.transcribe(audioBlob, 'en-US');

          console.log('✅ REST transcript:', transcript);

          setIsTranscribing(false);
          setPartialTranscript('');
          resolve(transcript || '');

        } catch (error) {
          console.error('Error transcribing audio:', error);
          setError(error.response?.data?.error || 'Transcription failed');
          setIsTranscribing(false);
          setPartialTranscript('');
          reject(error);
        }
      };

      // Stop recording
      mediaRecorderRef.current.stop();
    });
  }, [finalTranscript, partialTranscript, cleanupVAD]);

  /**
   * Cancel listening - cleanup without transcription
   */
  const cancelListening = useCallback(() => {
    cleanupVAD();

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    setIsTranscribing(false);
    setPartialTranscript('');
    setFinalTranscript('');
    setError(null);
    audioChunksRef.current = [];
  }, [cleanupVAD]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelListening();
    };
  }, [cancelListening]);

  return {
    isListening,
    isTranscribing,
    partialTranscript: partialTranscript || finalTranscript, // Show either
    error,
    startListening,
    stopListening,
    cancelListening,
    isUsingWebSocket: useWebSocket && wsRef.current !== null,
  };
}
