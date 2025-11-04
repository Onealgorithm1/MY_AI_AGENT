import { useState, useRef, useCallback } from 'react';
import { stt } from '../services/api';

export default function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          setIsProcessing(true);
          
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          
          const transcript = await stt.transcribe(audioBlob);
          
          setIsRecording(false);
          setIsProcessing(false);
          resolve(transcript);
        } catch (err) {
          console.error('Error processing audio:', err);
          setError(err.message || 'Failed to transcribe audio');
          setIsRecording(false);
          setIsProcessing(false);
          reject(err);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
