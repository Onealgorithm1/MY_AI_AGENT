import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  TrendingUp,
  Target,
  Award,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  BarChart3,
  FileText,
  Star,
  Trophy,
  Zap,
  Clock,
  DollarSign,
  Users,
  Shield,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import api from '../services/api';

const CompanyDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchDailyPicks();
  }, []);

  const [dailyPicks, setDailyPicks] = useState([]);

  const fetchDailyPicks = async () => {
    try {
      const res = await api.recommendations.list(10);
      setDailyPicks(res.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load daily picks:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/company/dashboard-summary');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getReadinessColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getReadinessLevel = (score) => {
    if (score >= 80) return { level: 'Highly Ready', icon: Trophy, color: 'green' };
    if (score >= 60) return { level: 'Ready', icon: CheckCircle, color: 'blue' };
    if (score >= 40) return { level: 'Developing', icon: TrendingUp, color: 'yellow' };
    return { level: 'Building Capacity', icon: AlertCircle, color: 'red' };
  };

  const getCategoryStatus = (status) => {
    const statusMap = {
      'Excellent': { color: 'text-green-600 bg-green-100', icon: Star },
      'Good': { color: 'text-blue-600 bg-blue-100', icon: CheckCircle },
      'Adequate': { color: 'text-yellow-600 bg-yellow-100', icon: TrendingUp },
      'Needs Improvement': { color: 'text-orange-600 bg-orange-100', icon: AlertCircle },
      'Critical': { color: 'text-red-600 bg-red-100', icon: AlertCircle }
    };
    return statusMap[status] || statusMap['Adequate'];
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      'High': 'bg-red-100 text-red-700 border-red-300',
      'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Low': 'bg-green-100 text-green-700 border-green-300'
    };
    return priorityMap[priority] || priorityMap['Medium'];
  };

  const getMatchColor = (type) => {
    const colorMap = {
      'matched': 'border-green-500 bg-green-50',
      'nearMatch': 'border-blue-500 bg-blue-50',
      'stretch': 'border-yellow-500 bg-yellow-50'
    };
    return colorMap[type] || 'border-gray-300 bg-white';
  };

  const getMatchBadge = (score) => {
    if (score >= 70) return { label: 'Strong Match', color: 'bg-green-100 text-green-700' };
    if (score >= 50) return { label: 'Near Match', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Stretch', color: 'bg-yellow-100 text-yellow-700' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { profile, readiness, matchResults, recommendations, history } = dashboardData;
  const readinessInfo = getReadinessLevel(readiness?.overallScore || 0);
  const ReadinessIcon = readinessInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-sm text-gray-500">Federal Contracting Intelligence Dashboard</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Readiness Score - Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ReadinessIcon className="h-10 w-10" />
                <div>
                  <p className="text-blue-100 text-sm uppercase tracking-wide">Federal Contracting Readiness</p>
                  <h2 className="text-3xl font-bold">{readinessInfo.level}</h2>
                </div>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl font-bold">{readiness.overallScore}</span>
                  <span className="text-2xl text-blue-200">/ 100</span>
                </div>
                <div className="w-full bg-blue-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-300 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${readiness.percentage}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-blue-100 text-sm leading-relaxed">
                {readiness.recommendation}
              </p>
            </div>

            {/* Readiness Categories */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(readiness.categories).map(([category, data]) => {
                const statusInfo = getCategoryStatus(data.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <div key={category} className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</p>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl font-bold">{data.score}</span>
                      <span className="text-sm text-blue-200">/ {data.maxScore}</span>
                    </div>
                    <span className="inline-block px-2 py-1 bg-white/20 rounded text-xs">
                      {data.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'dailyPicks', label: 'Daily Picks', icon: Sparkles },
                { id: 'matched', label: `Matched (${matchResults.matched.length})`, icon: Target },
                { id: 'nearMatch', label: `Near Match (${matchResults.nearMatch.length})`, icon: TrendingUp },
                { id: 'stretch', label: `Stretch (${matchResults.stretch.length})`, icon: Zap },
                { id: 'recommendations', label: `Strategic Advice`, icon: Lightbulb }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Company Profile */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Company Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Core Capabilities</h4>
                  <div className="space-y-2">
                    {Object.entries(profile.capabilities).map(([name, capability]) => (
                      <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-500">NAICS: {capability.naicsCodes.join(', ')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${capability.maturity === 'High' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {capability.maturity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Certifications & Set-Asides</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(profile.certifications).map(([cert, hasIt]) => (
                      <div
                        key={cert}
                        className={`p-3 rounded-lg border-2 ${hasIt ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          {hasIt ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                          )}
                          <span className={`text-sm font-medium ${hasIt ? 'text-gray-900' : 'text-gray-400'}`}>
                            {cert === 'smallBusiness' ? 'Small Business' :
                              cert === 'womanOwned' ? 'Woman Owned' :
                                cert === 'veteran' ? 'Veteran Owned' :
                                  cert.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-6 text-white">
                <Target className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-sm opacity-90">Matched Opportunities</p>
                <p className="text-3xl font-bold">{matchResults.matched.length}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
                <TrendingUp className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-sm opacity-90">Near Match</p>
                <p className="text-3xl font-bold">{matchResults.nearMatch.length}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-6 text-white">
                <Zap className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-sm opacity-90">Stretch Opportunities</p>
                <p className="text-3xl font-bold">{matchResults.stretch.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-6 text-white">
                <FileText className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-sm opacity-90">Total Analyzed</p>
                <p className="text-3xl font-bold">{matchResults.totalAnalyzed}</p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Picks Tab */}
        {activeTab === 'dailyPicks' && (
          <div className="space-y-4">
            {dailyPicks.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No daily picks yet</p>
                <p className="text-gray-400 text-sm mt-2">Interact with more opportunities to get personalized recommendations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {dailyPicks.map((opp, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-purple-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-100 to-transparent w-32 h-full opacity-50 pointer-events-none"></div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                          {opp.match_score > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Score: {opp.match_score}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{opp.solicitation_number} • {new Date(opp.posted_date).toLocaleDateString()}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                            <Building2 className="h-3 w-3" />
                            {opp.contracting_office}
                          </span>
                          {opp.naics_code && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">NAICS: {opp.naics_code}</span>
                          )}
                          {opp.set_aside_type && (
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded">{opp.set_aside_type}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{opp.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => navigate(`/opportunities?search=${opp.solicitation_number}`)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        View Details <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Matched Opportunities Tab */}
        {activeTab === 'matched' && (
          <div className="space-y-4">
            {matchResults.matched.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No matched opportunities yet</p>
                <p className="text-gray-400 text-sm mt-2">Opportunities with a match score of 70+ will appear here</p>
              </div>
            ) : (
              matchResults.matched.map((opp, idx) => (
                <div key={idx} className={`bg-white rounded-lg border-l-4 ${getMatchColor('matched')} p-6 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{opp.opportunity.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMatchBadge(opp.matchScore.total).color}`}>
                          {getMatchBadge(opp.matchScore.total).label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{opp.opportunity.solicitation_number}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {opp.opportunity.agency}
                        </span>
                        {opp.opportunity.naics_code && (
                          <span>NAICS: {opp.opportunity.naics_code}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600 mb-1">{opp.matchScore.total}</div>
                      <p className="text-xs text-gray-500">Match Score</p>
                    </div>
                  </div>

                  {/* Match Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 rounded p-2">
                      <p className="text-xs text-gray-600">NAICS</p>
                      <p className="text-lg font-bold text-blue-600">{opp.matchScore.naics}/30</p>
                    </div>
                    <div className="bg-purple-50 rounded p-2">
                      <p className="text-xs text-gray-600">PSC</p>
                      <p className="text-lg font-bold text-purple-600">{opp.matchScore.psc}/20</p>
                    </div>
                    <div className="bg-indigo-50 rounded p-2">
                      <p className="text-xs text-gray-600">Keywords</p>
                      <p className="text-lg font-bold text-indigo-600">{opp.matchScore.keywords}/30</p>
                    </div>
                    <div className="bg-green-50 rounded p-2">
                      <p className="text-xs text-gray-600">Set-Aside</p>
                      <p className="text-lg font-bold text-green-600">{opp.matchScore.setAside}/20</p>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  {opp.matchScore.reasons.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Why it matches:</p>
                      <div className="flex flex-wrap gap-2">
                        {opp.matchScore.reasons.map((reason, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/opportunities?search=${opp.opportunity.solicitation_number}`)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Full Details
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Near Match Tab */}
        {activeTab === 'nearMatch' && (
          <div className="space-y-4">
            {matchResults.nearMatch.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No near-match opportunities</p>
              </div>
            ) : (
              matchResults.nearMatch.map((opp, idx) => (
                <div key={idx} className={`bg-white rounded-lg border-l-4 ${getMatchColor('nearMatch')} p-6 shadow-sm`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{opp.opportunity.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMatchBadge(opp.matchScore.total).color}`}>
                          {getMatchBadge(opp.matchScore.total).label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{opp.opportunity.solicitation_number}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600 mb-1">{opp.matchScore.total}</div>
                      <p className="text-xs text-gray-500">Match Score</p>
                    </div>
                  </div>

                  {/* Gaps */}
                  {opp.matchScore.gaps.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">What's missing:</p>
                      <div className="flex flex-wrap gap-2">
                        {opp.matchScore.gaps.map((gap, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Stretch Tab */}
        {activeTab === 'stretch' && (
          <div className="space-y-4">
            {matchResults.stretch.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No stretch opportunities</p>
              </div>
            ) : (
              matchResults.stretch.map((opp, idx) => (
                <div key={idx} className={`bg-white rounded-lg border-l-4 ${getMatchColor('stretch')} p-6 shadow-sm`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{opp.opportunity.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMatchBadge(opp.matchScore.total).color}`}>
                          {getMatchBadge(opp.matchScore.total).label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{opp.opportunity.solicitation_number}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">{opp.matchScore.total}</div>
                      <p className="text-xs text-gray-500">Match Score</p>
                    </div>
                  </div>

                  {/* Gaps */}
                  {opp.matchScore.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Significant gaps to address:</p>
                      <div className="flex flex-wrap gap-2">
                        {opp.matchScore.gaps.map((gap, i) => (
                          <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {/* Strategic Recommendations */}
            {recommendations.strategic && recommendations.strategic.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="h-6 w-6 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Strategic Recommendations</h3>
                </div>
                <div className="space-y-3">
                  {recommendations.strategic.map((rec, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-gray-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {recommendations.certifications && recommendations.certifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Certification Opportunities</h3>
                </div>
                <div className="space-y-3">
                  {recommendations.certifications.map((cert, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-300">
                        High Priority
                      </span>
                      <p className="flex-1 text-gray-800">{cert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NAICS Codes */}
            {recommendations.naicsCodes && recommendations.naicsCodes.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">NAICS Code Expansion</h3>
                </div>
                <div className="space-y-3">
                  {recommendations.naicsCodes.map((naics, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded border border-yellow-300">
                        Medium Priority
                      </span>
                      <p className="flex-1 text-gray-800">{naics}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {recommendations.capabilities && recommendations.capabilities.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-6 w-6 text-yellow-600" />
                  <h3 className="text-lg font-bold text-gray-900">Capability Development</h3>
                </div>
                <div className="space-y-3">
                  {recommendations.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded border border-yellow-300">
                        Medium Priority
                      </span>
                      <p className="flex-1 text-gray-800">{cap}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Performance */}
            {recommendations.pastPerformance && recommendations.pastPerformance.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900">Build Past Performance</h3>
                </div>
                <div className="space-y-3">
                  {recommendations.pastPerformance.map((pp, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-300">
                        High Priority
                      </span>
                      <p className="flex-1 text-gray-800">{pp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboardPage;
