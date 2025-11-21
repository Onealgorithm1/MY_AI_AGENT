import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign, Award, Users, ArrowLeft, MessageSquare } from 'lucide-react';
import api from '../services/api';

const SAMGovPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    newOpportunities: 0,
    analyzedDocuments: 0,
    pendingAnalysis: 0,
  });

  const [recentSearches, setRecentSearches] = useState([]);
  const [cachedOpportunities, setCachedOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyStatus, setApiKeyStatus] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load search history and cached opportunities in parallel
      const [historyRes, oppsRes] = await Promise.all([
        api.get('/api/sam-gov/search-history?limit=5'),
        api.get('/api/sam-gov/cached-opportunities?limit=20')
      ]);

      const searches = historyRes.data.searches || [];
      const opportunities = oppsRes.data.opportunities || [];

      // Calculate stats
      const totalNew = searches.reduce((sum, s) => sum + (s.new_records || 0), 0);

      setStats({
        totalOpportunities: oppsRes.data.total || opportunities.length,
        newOpportunities: totalNew,
        analyzedDocuments: 0,
        pendingAnalysis: 0,
      });

      setRecentSearches(searches);
      setCachedOpportunities(opportunities);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    );
  };

  const CredentialsStatus = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">API Configuration</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">SAM.gov API</p>
              <p className="text-xs text-gray-500">Connected and active</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            Active
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {apiKeyStatus === 'configured' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">Gemini API (Analysis)</p>
              <p className="text-xs text-gray-500">
                {apiKeyStatus === 'configured'
                  ? 'AI analysis available'
                  : 'Optional - Configure for AI analysis'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            apiKeyStatus === 'configured'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {apiKeyStatus === 'configured' ? 'Configured' : 'Optional'}
          </span>
        </div>
      </div>
    </div>
  );

  const RecentSearches = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Searches</h3>
        <button
          onClick={loadDashboardData}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {recentSearches.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No searches yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Start by searching for opportunities in the chat
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentSearches.map((search, idx) => (
            <div
              key={idx}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {search.keyword || 'General Search'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(search.searched_at).toLocaleDateString()} at{' '}
                    {new Date(search.searched_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {search.total_records || 0}
                  </p>
                  <p className="text-xs text-gray-500">results</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-gray-600">
                    {search.new_records || 0} new
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-xs text-gray-600">
                    {search.existing_records || 0} existing
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const CachedOpportunities = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cached Opportunities</h3>
        <span className="text-sm text-gray-500">{stats.totalOpportunities} total</span>
      </div>

      {cachedOpportunities.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No opportunities cached yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {cachedOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {opp.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span>{opp.notice_id}</span>
                {opp.type && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{opp.type}</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Posted: {opp.posted_date ? new Date(opp.posted_date).toLocaleDateString() : 'N/A'}</span>
                {opp.response_deadline && (
                  <span className="text-orange-600">Due: {new Date(opp.response_deadline).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const QuickActions = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-2">
        <button
          className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center justify-between group"
          onClick={() => navigate('/chat')}
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Search Opportunities</span>
          </div>
          <span className="text-blue-400 group-hover:text-blue-600">→</span>
        </button>

        <button
          className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors flex items-center justify-between group"
          onClick={() => {
            // Open SAM.gov cache panel
            // This would trigger the existing SAMGovPanel component
          }}
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">View Cache History</span>
          </div>
          <span className="text-purple-400 group-hover:text-purple-600">→</span>
        </button>

        <button
          className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <Award className="w-5 h-5" />
            <span className="font-medium">Browse Analyzed Docs</span>
          </div>
          <span className="text-green-400 group-hover:text-green-600">→</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/chat')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Chat</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SAM.gov Opportunities
          </h1>
          <p className="text-gray-600">
            Federal contract opportunities analysis and tracking
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={FileText}
            title="Total Opportunities"
            value={stats.totalOpportunities}
            subtitle="Cached in database"
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            title="New This Week"
            value={stats.newOpportunities}
            subtitle="Recently discovered"
            color="green"
          />
          <StatCard
            icon={CheckCircle}
            title="Documents Analyzed"
            value={stats.analyzedDocuments}
            subtitle="AI analysis complete"
            color="purple"
          />
          <StatCard
            icon={Clock}
            title="Pending Analysis"
            value={stats.pendingAnalysis}
            subtitle="In analysis queue"
            color="yellow"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            <CachedOpportunities />
            <RecentSearches />
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            <CredentialsStatus />
            <QuickActions />
          </div>
        </div>

        {/* Feature Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Document Analysis Feature
              </h4>
              <p className="text-sm text-blue-700">
                The system can automatically fetch and analyze PDFs and documents attached to opportunities.
                Uses Gemini AI for analysis including bid recommendations,
                requirements extraction, and win probability estimates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SAMGovPage;
