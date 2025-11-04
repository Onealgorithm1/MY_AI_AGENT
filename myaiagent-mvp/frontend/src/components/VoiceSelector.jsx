import { useState, useEffect } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function VoiceSelector({ selectedVoice, onVoiceChange, className = '' }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/tts/voices');
      const voiceList = response.data.voices || [];
      
      setVoices(voiceList);
      
      if (!selectedVoice && voiceList.length > 0) {
        onVoiceChange(voiceList[0].voice_id);
      }
      
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      
      setError('Failed to load voices');
      toast.error('Could not load voice options');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading voices...</span>
      </div>
    );
  }

  if (error || voices.length === 0) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        {error || 'No voices available'}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Volume2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <select
        value={selectedVoice}
        onChange={(e) => onVoiceChange(e.target.value)}
        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        {voices.map((voice) => (
          <option key={voice.voice_id} value={voice.voice_id}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
}
