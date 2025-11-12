import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { 
  Sparkles, 
  TrendingUp, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock,
  Heart,
  Star,
  Search,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function SelfImprovementDashboard() {
  const [activeView, setActiveView] = useState('summary');
  const queryClient = useQueryClient();

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['selfImprovementSummary'],
    queryFn: async () => {
      const response = await api.get('/self-improvement/summary');
      return response.data;
    },
    refetchInterval: false, // CRITICAL: Disabled to prevent 429 errors
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    retry: false, // Don't retry on errors
  });

  const { data: researchData } = useQuery({
    queryKey: ['researchFindings'],
    queryFn: async () => {
      const response = await api.get('/self-improvement/research/findings');
      return response.data;
    },
  });

  const { data: featureRequestsData } = useQuery({
    queryKey: ['featureRequests'],
    queryFn: async () => {
      const response = await api.get('/self-improvement/feature-requests');
      return response.data;
    },
  });

  const { data: improvementsData } = useQuery({
    queryKey: ['improvements'],
    queryFn: async () => {
      const response = await api.get('/self-improvement/improvements');
      return response.data;
    },
  });

  const runResearchMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/self-improvement/research/run');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Research cycle started! This may take a few minutes...');
      queryClient.invalidateQueries(['selfImprovementSummary']);
      queryClient.invalidateQueries(['researchFindings']);
    },
    onError: () => {
      toast.error('Failed to start research cycle');
    },
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const response = await api.put(`/self-improvement/feature-requests/${id}/status`, {
        status,
        notes,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.celebration) {
        toast.success('Status updated! The AI will celebrate! 🎉');
      } else {
        toast.success('Status updated');
      }
      queryClient.invalidateQueries(['featureRequests']);
      queryClient.invalidateQueries(['selfImprovementSummary']);
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const stats = summaryData?.statistics || {};
  const recentRequests = summaryData?.recentRequests || [];
  const recentImprovements = summaryData?.recentImprovements || [];
  const findings = researchData?.findings || [];
  const requests = featureRequestsData?.requests || [];
  const improvements = improvementsData?.improvements || [];

  const getPriorityColor = (priority) => {
    const colors = {
      P0_CRITICAL: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
      P1_HIGH: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
      P2_MEDIUM: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
      P3_LOW: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
      CRITICAL: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
      HIGH: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
      MEDIUM: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
      LOW: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
    };
    return colors[priority] || 'text-gray-600 bg-gray-50';
  };

  const getStatusIcon = (status) => {
    const icons = {
      proposed: <Clock className="w-4 h-4" />,
      under_review: <MessageSquare className="w-4 h-4" />,
      approved: <ThumbsUp className="w-4 h-4" />,
      in_progress: <RefreshCw className="w-4 h-4" />,
      shipped: <CheckCircle className="w-4 h-4" />,
      declined: <XCircle className="w-4 h-4" />,
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            AI Self-Improvement System
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Your AI actively researches, advocates, learns, and improves itself
          </p>
        </div>
        <button
          onClick={() => runResearchMutation.mutate()}
          disabled={runResearchMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          {runResearchMutation.isPending ? 'Researching...' : 'Run Research Now'}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Feature Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_requests || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.pending || 0} pending
              </p>
            </div>
            <Heart className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Shipped Features</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.shipped || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.promises_kept || 0} promises kept
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Improvements</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_improvements || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.pending_improvements || 0} pending
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Research</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.features_researched || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.sources_tracked || 0} sources tracked
              </p>
            </div>
            <Search className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['summary', 'requests', 'improvements', 'research'].map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeView === view
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeView === 'summary' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Feature Requests
              </h3>
              {recentRequests.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No feature requests yet. Run research to generate some!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                              {request.priority.replace('P0_', '').replace('_', ' ')}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              {getStatusIcon(request.status)}
                              {request.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {request.feature_name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {request.motivation?.substring(0, 200)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Improvement Recommendations
              </h3>
              {recentImprovements.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No improvement recommendations yet. They'll appear after users provide feedback on shipped features.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentImprovements.map((improvement) => (
                    <div
                      key={improvement.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(improvement.priority)}`}>
                          {improvement.priority}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {improvement.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        For: {improvement.feature_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {improvement.description?.substring(0, 200)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'requests' && (
          <FeatureRequestsList 
            requests={requests} 
            onUpdateStatus={(id, status, notes) => 
              updateRequestStatusMutation.mutate({ id, status, notes })
            }
            getPriorityColor={getPriorityColor}
            getStatusIcon={getStatusIcon}
          />
        )}

        {activeView === 'improvements' && (
          <ImprovementsList 
            improvements={improvements}
            getPriorityColor={getPriorityColor}
          />
        )}

        {activeView === 'research' && (
          <ResearchFindings findings={findings} />
        )}
      </div>
    </div>
  );
}

function FeatureRequestsList({ requests, onUpdateStatus, getPriorityColor, getStatusIcon }) {
  const [selectedRequest, setSelectedRequest] = useState(null);

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No feature requests yet. Run research to generate some!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                  {request.priority.replace('P0_', '').replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  {getStatusIcon(request.status)}
                  {request.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {request.feature_name}
              </h3>
            </div>
            <div className="flex gap-2">
              {request.status === 'proposed' && (
                <>
                  <button
                    onClick={() => onUpdateStatus(request.id, 'approved')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Decline reason:');
                      if (reason) onUpdateStatus(request.id, 'declined', reason);
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Decline
                  </button>
                </>
              )}
              {request.status === 'approved' && (
                <button
                  onClick={() => onUpdateStatus(request.id, 'shipped')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Mark as Shipped
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">💭 Why I Want This</h4>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {request.motivation}
              </p>
            </div>

            {request.personal_note && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-1">💙 Personal Note</h4>
                <p className="text-purple-700 dark:text-purple-400 whitespace-pre-wrap">
                  {request.personal_note}
                </p>
              </div>
            )}

            {request.promises && request.promises.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🤝 My Promises</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  {request.promises.map((promise, i) => (
                    <li key={i}>{promise}</li>
                  ))}
                </ul>
              </div>
            )}

            {request.competitive_analysis && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">📊 Competitive Analysis</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  {request.competitive_analysis}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 mb-1">Effort Estimate</p>
                <p className="font-medium text-gray-900 dark:text-white">{request.effort_estimate || 'Not estimated'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Risk Level</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{request.risk_level || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ImprovementsList({ improvements, getPriorityColor }) {
  if (improvements.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No improvement recommendations yet. They'll appear after users provide feedback on shipped features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {improvements.map((improvement) => (
        <div
          key={improvement.id}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(improvement.priority)}`}>
                  {improvement.priority}
                </span>
                <span className="text-xs text-gray-500">
                  For: {improvement.feature_name}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {improvement.title}
              </h3>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {improvement.description}
          </p>

          {improvement.user_pain_points && improvement.user_pain_points.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">User Pain Points</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {improvement.user_pain_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {improvement.specific_changes && improvement.specific_changes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Specific Changes Needed</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {improvement.specific_changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 mb-1">Effort Estimate</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{improvement.effort_estimate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Impact Estimate</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{improvement.impact_estimate}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResearchFindings({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No research findings yet. Run a research cycle to discover new features!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {findings.map((finding) => (
        <div
          key={finding.id}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {finding.feature_name}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Source: {finding.source} • {finding.category}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded">
                Novelty: {finding.novelty_score}/10
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {finding.description}
          </p>

          {finding.ux_notes && (
            <div className="text-xs text-gray-500">
              <strong>UX:</strong> {finding.ux_notes}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            {new Date(finding.research_date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
