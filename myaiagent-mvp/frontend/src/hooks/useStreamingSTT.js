import { useState, useRef, useCallback } from 'react';
import { stt } from '../services/api.js';

export default function useStreamingSTT() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  /**
   * Start voice input - record audio
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      // Get microphone access (optimized settings for speech)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,  // Optimized for speech (was 48000)
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,  // Better volume normalization
        }
      });
      
      streamRef.current = stream;

      // Create media recorder (optimized bitrate for speech)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000,  // Lower bitrate for speech
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      
      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Error starting voice input:', err);
      setError('Microphone access denied');
    }
  }, []);

  /**
   * Stop listening - send audio to backend for transcription
   */
  const stopListening = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          setIsListening(false);
          setIsTranscribing(true);
          
          // Stop microphone stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // Create audio blob from recorded chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          
          console.log('🎤 Audio recorded:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: audioChunksRef.current.length
          });

          // Send to backend for transcription using API service (includes CSRF token)
          const transcript = await stt.transcribe(audioBlob, 'en-US');

          console.log('✅ Transcript received:', transcript);
          
          setIsTranscribing(false);
          resolve(transcript || '');
        } catch (error) {
          console.error('Error transcribing audio:', error);
          setError(error.response?.data?.error || 'Transcription failed');
          setIsTranscribing(false);
          reject(error);
        }
      };

      // Stop recording
      mediaRecorderRef.current.stop();
    });
  }, []);

  /**
   * Cancel listening - cleanup without transcription
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

    setIsListening(false);
    setIsTranscribing(false);
    setError(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isListening,
    isTranscribing,
    partialTranscript: '', // Not available with REST approach
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}
