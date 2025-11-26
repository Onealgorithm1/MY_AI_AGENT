import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign, Award, Users, ArrowLeft, MessageSquare } from 'lucide-react';
import api, { samGov } from '../services/api';

const SAMGovPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    newOpportunities: 0,
    analyzedDocuments: 0,
    pendingAnalysis: 0,
  });

  const [recentOpportunities, setRecentOpportunities] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyStatus, setApiKeyStatus] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load search history
      const historyRes = await samGov.getSearchHistory(5);
      const searches = historyRes.searches || [];

      // Load cached opportunities
      const cachedRes = await samGov.getCachedOpportunities({ limit: 20 });
      const opportunities = cachedRes.opportunities || [];

      // Calculate stats from search history
      const totalNew = searches.reduce((sum, s) => sum + (s.new_records || 0), 0);
      const totalExisting = searches.reduce((sum, s) => sum + (s.existing_records || 0), 0);

      setStats({
        totalOpportunities: cachedRes.total || 0,
        newOpportunities: totalNew,
        analyzedDocuments: 0, // Will update when we fetch document stats
        pendingAnalysis: 0,
      });

      setRecentOpportunities(opportunities);
      setSearchHistory(searches);

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

      {searchHistory.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No searches yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Start by searching for opportunities in the chat
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {searchHistory.map((search, idx) => (
            <div
              key={search.id || idx}
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

  const OpportunitiesList = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cached Opportunities</h3>
        <button
          onClick={loadDashboardData}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {recentOpportunities.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No opportunities cached yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Search for opportunities in the chat to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {recentOpportunities.map((opp) => (
            <div
              key={opp.id}
              onClick={() => setSelectedOpportunity(opp)}
              className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-gray-200 hover:border-blue-300"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                    {opp.title}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    {opp.solicitation_number}
                  </p>
                </div>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                  opp.type === 'Combined Synopsis/Solicitation' ? 'bg-green-100 text-green-700' :
                  opp.type === 'Sources Sought' ? 'bg-blue-100 text-blue-700' :
                  opp.type === 'Presolicitation' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {opp.type}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {opp.response_deadline ? new Date(opp.response_deadline).toLocaleDateString() : 'No deadline'}
                </span>
                {opp.naics_code && (
                  <span>NAICS: {opp.naics_code}</span>
                )}
              </div>

              <p className="text-xs text-gray-600 line-clamp-2">
                {opp.contracting_office}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const OpportunityDetail = ({ opportunity, onClose }) => {
    if (!opportunity) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{opportunity.title}</h2>
              <p className="text-sm text-gray-600">Solicitation: {opportunity.solicitation_number}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Type and Status */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                opportunity.type === 'Combined Synopsis/Solicitation' ? 'bg-green-100 text-green-700' :
                opportunity.type === 'Sources Sought' ? 'bg-blue-100 text-blue-700' :
                opportunity.type === 'Presolicitation' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {opportunity.type}
              </span>
              {opportunity.set_aside_type && (
                <span className="px-3 py-1 text-sm font-medium rounded bg-purple-100 text-purple-700">
                  {opportunity.set_aside_type}
                </span>
              )}
            </div>

            {/* Key Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Posted Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(opportunity.posted_date).toLocaleDateString()}
                </p>
              </div>
              {opportunity.response_deadline && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Response Deadline</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(opportunity.response_deadline).toLocaleDateString()}
                  </p>
                </div>
              )}
              {opportunity.archive_date && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Archive Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(opportunity.archive_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Contracting Office</h3>
                <p className="text-sm text-gray-700">{opportunity.contracting_office}</p>
              </div>

              {opportunity.naics_code && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">NAICS Code</h3>
                  <p className="text-sm text-gray-700">{opportunity.naics_code}</p>
                </div>
              )}

              {opportunity.place_of_performance && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Place of Performance</h3>
                  <p className="text-sm text-gray-700">{opportunity.place_of_performance}</p>
                </div>
              )}

              {/* Raw Data - Contact Info */}
              {opportunity.raw_data?.pointOfContact && opportunity.raw_data.pointOfContact.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Point of Contact</h3>
                  {opportunity.raw_data.pointOfContact.map((contact, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded mb-2">
                      <p className="text-sm font-medium text-gray-900">{contact.fullName}</p>
                      {contact.email && (
                        <p className="text-sm text-gray-700">Email: {contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-sm text-gray-700">Phone: {contact.phone}</p>
                      )}
                      <span className="text-xs text-gray-500 capitalize">{contact.type} Contact</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Links */}
              <div className="space-y-2">
                {opportunity.raw_data?.uiLink && (
                  <a
                    href={opportunity.raw_data.uiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg transition-colors"
                  >
                    View on SAM.gov →
                  </a>
                )}
                {opportunity.description && opportunity.description.startsWith('http') && (
                  <a
                    href={opportunity.description}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center rounded-lg transition-colors"
                  >
                    View Description →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            <OpportunitiesList />
            <RecentSearches />
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            <CredentialsStatus />
            <QuickActions />
          </div>
        </div>

        {/* Opportunity Detail Modal */}
        {selectedOpportunity && (
          <OpportunityDetail
            opportunity={selectedOpportunity}
            onClose={() => setSelectedOpportunity(null)}
          />
        )}

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
                Configure your OpenAI API key to enable AI-powered analysis including bid recommendations,
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
