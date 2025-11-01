import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth as authApi } from '../services/api';
import { toast } from 'sonner';
import {
  Brain,
  MessageSquare,
  Sparkles,
  Volume2,
  Save,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function PreferencesPanel() {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({
    communication: true,
    ai: true,
    interface: false,
  });

  // Default preferences structure
  const defaultPreferences = {
    // Communication Style
    responseStyle: 'balanced', // casual, balanced, professional
    responseLength: 'medium', // brief, medium, detailed
    tone: 'friendly', // formal, friendly, enthusiastic
    
    // AI Behavior
    creativity: 'balanced', // conservative, balanced, creative
    explanationDepth: 'medium', // simple, medium, technical
    examplesPreference: true,
    proactiveSuggestions: true,
    
    // Topics of Interest
    topicsOfInterest: [],
    
    // Interaction Preferences
    useEmojis: false,
    codeFormatPreference: 'readable', // minimal, readable, detailed
    
    // Voice Preferences
    voiceEnabled: false,
    voiceSpeed: 'normal', // slow, normal, fast
  };

  // Fetch current preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const response = await authApi.getPreferences();
      return response.data.preferences || defaultPreferences;
    },
  });

  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    if (preferencesData) {
      setPreferences({ ...defaultPreferences, ...preferencesData });
    }
  }, [preferencesData]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences) => authApi.updatePreferences(newPreferences),
    onSuccess: (response) => {
      toast.success('Preferences saved successfully!');
      queryClient.invalidateQueries(['preferences']);
      if (response.data.user) {
        queryClient.setQueryData(['userProfile'], response.data.user);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to save preferences');
    },
  });

  // Reset preferences mutation
  const resetPreferencesMutation = useMutation({
    mutationFn: () => authApi.resetPreferences(),
    onSuccess: () => {
      toast.success('Preferences reset to defaults');
      setPreferences(defaultPreferences);
      queryClient.invalidateQueries(['preferences']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to reset preferences');
    },
  });

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      resetPreferencesMutation.mutate();
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Preferences
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Customize how the AI communicates with you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetPreferencesMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={updatePreferencesMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {updatePreferencesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Communication Style Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('communication')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              Communication Style
            </span>
          </div>
          {expandedSections.communication ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.communication && (
          <div className="p-4 pt-0 space-y-4">
            {/* Response Style */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Response Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['casual', 'balanced', 'professional'].map((style) => (
                  <button
                    key={style}
                    onClick={() => updatePreference('responseStyle', style)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.responseStyle === style
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Response Length */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Response Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['brief', 'medium', 'detailed'].map((length) => (
                  <button
                    key={length}
                    onClick={() => updatePreference('responseLength', length)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.responseLength === length
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {length.charAt(0).toUpperCase() + length.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Tone
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['formal', 'friendly', 'enthusiastic'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => updatePreference('tone', tone)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.tone === tone
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Use Emojis */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Use Emojis in Responses
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add emojis to make responses more expressive
                </p>
              </div>
              <button
                onClick={() => updatePreference('useEmojis', !preferences.useEmojis)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.useEmojis ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.useEmojis ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Behavior Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('ai')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              AI Behavior
            </span>
          </div>
          {expandedSections.ai ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.ai && (
          <div className="p-4 pt-0 space-y-4">
            {/* Creativity Level */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Creativity Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['conservative', 'balanced', 'creative'].map((level) => (
                  <button
                    key={level}
                    onClick={() => updatePreference('creativity', level)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.creativity === level
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Higher creativity = more varied and innovative responses
              </p>
            </div>

            {/* Explanation Depth */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Explanation Depth
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['simple', 'medium', 'technical'].map((depth) => (
                  <button
                    key={depth}
                    onClick={() => updatePreference('explanationDepth', depth)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.explanationDepth === depth
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {depth.charAt(0).toUpperCase() + depth.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Provide Examples */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Provide Examples
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Include practical examples in explanations
                </p>
              </div>
              <button
                onClick={() => updatePreference('examplesPreference', !preferences.examplesPreference)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.examplesPreference ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.examplesPreference ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Proactive Suggestions */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Proactive Suggestions
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Offer helpful suggestions without being asked
                </p>
              </div>
              <button
                onClick={() => updatePreference('proactiveSuggestions', !preferences.proactiveSuggestions)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.proactiveSuggestions ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.proactiveSuggestions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Code Format Preference */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Code Format Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['minimal', 'readable', 'detailed'].map((format) => (
                  <button
                    key={format}
                    onClick={() => updatePreference('codeFormatPreference', format)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.codeFormatPreference === format
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {format.charAt(0).toUpperCase() + format.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
