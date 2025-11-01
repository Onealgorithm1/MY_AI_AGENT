import { useState, useEffect } from 'react';
import { conversations as conversationsApi } from '../services/api';
import {
  BarChart3,
  MessageSquare,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  TrendingUp
} from 'lucide-react';

export default function ConversationInsights({ conversationId, className = '' }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await conversationsApi.analytics(conversationId);
        setAnalytics(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load insights');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [conversationId]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return null;
  }

  const { analytics: data } = analytics;
  const totalMessages = (parseInt(data.user_messages) || 0) + (parseInt(data.ai_messages) || 0);
  const positiveRating = parseInt(data.positive_feedback) || 0;
  const negativeRating = parseInt(data.negative_feedback) || 0;
  const totalFeedback = positiveRating + negativeRating;
  const satisfactionRate = totalFeedback > 0 ? Math.round((positiveRating / totalFeedback) * 100) : 0;

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border border-blue-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Conversation Insights</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Message Count */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Messages</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalMessages}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.user_messages} you, {data.ai_messages} AI
          </div>
        </div>

        {/* Memory Facts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Facts Learned</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.facts_extracted || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            About you
          </div>
        </div>

        {/* Models Used */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-gray-600 dark:text-gray-400">AI Models</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.models_used || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1 truncate">
            {data.models_list && data.models_list.length > 0 ? (
              <span title={data.models_list.join(', ')}>
                {data.models_list[0]}
                {data.models_list.length > 1 && ` +${data.models_list.length - 1}`}
              </span>
            ) : (
              'None'
            )}
          </div>
        </div>

        {/* Satisfaction */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Satisfaction</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalFeedback > 0 ? `${satisfactionRate}%` : '-'}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> {positiveRating}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="w-3 h-3" /> {negativeRating}
            </span>
          </div>
        </div>
      </div>

      {/* Auto Mode Usage */}
      {data.auto_selections > 0 && (
        <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium text-blue-600 dark:text-blue-400">Auto Mode</span> selected the optimal model {data.auto_selections} time{data.auto_selections !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
