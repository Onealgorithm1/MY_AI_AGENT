import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export default function useStreamingSTT() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const finalTranscriptResolveRef = useRef(null);
  const { token } = useAuthStore();

  /**
   * Start voice input - opens WebSocket and starts streaming audio
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      setPartialTranscript('');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      streamRef.current = stream;

      // Connect to STT WebSocket
      const wsUrl = `${WS_URL}/stt-stream?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 STT WebSocket connected');
        setIsListening(true);
        
        // Send start message
        ws.send(JSON.stringify({ type: 'start' }));

        // Start streaming audio chunks
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            // Convert blob to base64 and send
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = reader.result.split(',')[1];
              ws.send(JSON.stringify({
                type: 'audio',
                data: base64Audio,
              }));
            };
            reader.readAsDataURL(event.data);
          }
        };

        // Send audio chunks every 250ms
        mediaRecorder.start(250);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'partial') {
            // Update partial transcript in real-time
            setPartialTranscript(data.transcript);
          } else if (data.type === 'final') {
            // Final transcript received
            console.log('✅ Final transcript:', data.transcript);
            setIsListening(false);
            setIsTranscribing(false);
            setPartialTranscript('');
            
            // Resolve the promise with final transcript
            if (finalTranscriptResolveRef.current) {
              finalTranscriptResolveRef.current(data.transcript);
              finalTranscriptResolveRef.current = null;
            }
          } else if (data.type === 'error') {
            console.error('STT error:', data.message);
            setError(data.message);
            setIsListening(false);
            setIsTranscribing(false);
            
            // Reject the promise
            if (finalTranscriptResolveRef.current) {
              finalTranscriptResolveRef.current(null);
              finalTranscriptResolveRef.current = null;
            }
          } else if (data.type === 'ready') {
            console.log('✅ STT service ready');
          }
        } catch (err) {
          console.error('Error parsing STT message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        setIsListening(false);
      };

      ws.onclose = () => {
        console.log('🔌 STT WebSocket closed');
        setIsListening(false);
        setIsTranscribing(false);
      };

    } catch (err) {
      console.error('Error starting voice input:', err);
      setError('Microphone access denied');
    }
  }, [token]);

  /**
   * Stop listening - closes stream and waits for final transcript
   */
  const stopListening = useCallback(() => {
    return new Promise((resolve) => {
      finalTranscriptResolveRef.current = resolve;
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop microphone stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Send stop message to backend
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      }

      setIsListening(false);
      setIsTranscribing(true); // Show "transcribing..." while waiting for final
      
      // Timeout after 10 seconds if no response
      setTimeout(() => {
        if (finalTranscriptResolveRef.current) {
          console.warn('STT timeout - no final transcript received');
          finalTranscriptResolveRef.current(null);
          finalTranscriptResolveRef.current = null;
          setIsTranscribing(false);
        }
      }, 10000);
    });
  }, []);

  /**
   * Cancel listening - cleanup without waiting for transcript
   */
  const cancelListening = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsListening(false);
    setIsTranscribing(false);
    setPartialTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isTranscribing,
    partialTranscript,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}
