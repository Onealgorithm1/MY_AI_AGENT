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
      
      // If no voice is selected OR the selected voice is not in the list (stale/invalid ID),
      // default to the first available voice
      if (!selectedVoice || !voiceList.find(v => v.voice_id === selectedVoice)) {
        if (voiceList.length > 0) {
          onVoiceChange(voiceList[0].voice_id);
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      
      if (error.response?.data?.code === 'CREDENTIALS_MISSING') {
        setError('Google Cloud credentials not configured');
        toast.error('Google Cloud TTS credentials missing. Please add them in Admin Dashboard.');
      } else {
        setError('Failed to load voices');
        toast.error('Could not load voice options');
      }
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

  // Group voices by quality and then by language
  const groupedVoices = voices.reduce((acc, voice) => {
    const quality = voice.quality || 'Standard';
    if (!acc[quality]) {
      acc[quality] = {};
    }
    const lang = voice.category || 'Other';
    if (!acc[quality][lang]) {
      acc[quality][lang] = [];
    }
    acc[quality][lang].push(voice);
    return acc;
  }, {});

  const qualityOrder = ['Neural2', 'WaveNet', 'Studio', 'Standard'];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Volume2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <select
        value={selectedVoice}
        onChange={(e) => onVoiceChange(e.target.value)}
        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        {qualityOrder.map(quality => 
          groupedVoices[quality] && Object.entries(groupedVoices[quality]).map(([lang, langVoices]) => (
            <optgroup key={`${quality}-${lang}`} label={`${quality} - ${lang}`}>
              {langVoices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} ({voice.ssml_gender === 'MALE' ? '♂' : '♀'})
                </option>
              ))}
            </optgroup>
          ))
        )}
      </select>
    </div>
  );
}
