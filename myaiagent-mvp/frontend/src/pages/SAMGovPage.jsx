import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ChevronUp, X, Calendar, Building2, FileText, DollarSign, Users, Clock, Award, MessageSquare, ArrowLeft, Share2, Sparkles, ExternalLink, CheckCircle } from 'lucide-react';
import api, { samGov } from '../services/api';

const SAMGovPage = () => {
  const navigate = useNavigate();

  // State
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Enhanced filters matching SAM.gov
  const [filters, setFilters] = useState({
    keyword: '',
    keywordType: 'ALL', // ALL, ANY, EXACT
    setAsideType: '',
    naicsCode: '',
    noticeType: '',
    status: 'active',
    dateFrom: '',
    dateTo: '',
    agency: '',
    sortBy: '-modifiedDate',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);

  // Filter panel state
  const [expandedFilters, setExpandedFilters] = useState({
    keyword: true,
    dates: false,
    notice: false,
    setAside: false,
    status: true,
  });

  // Domain filtering and AI features
  const [selectedDomain, setSelectedDomain] = useState('');
  const [aiSummaries, setAiSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);

  useEffect(() => {
    loadData();

    // Auto-refresh every 1 hour
    const interval = setInterval(() => {
      loadData(true);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const cachedRes = await samGov.getCachedOpportunities({ limit: 1000, offset: 0 });
      setOpportunities(cachedRes.opportunities || []);
      setLastRefreshTime(new Date());

      if (isBackgroundRefresh) {
        console.log(`✅ Auto-refresh: ${cachedRes.opportunities?.length || 0} opportunities`);
      }
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      if (isBackgroundRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Keyword matching logic
  const matchesKeyword = (opp, keyword, keywordType) => {
    if (!keyword) return true;
    const searchText = `${opp.title} ${opp.solicitation_number} ${opp.description || ''}`.toLowerCase();
    const keywords = keyword.toLowerCase().split(' ').filter(k => k);

    switch (keywordType) {
      case 'ALL':
        return keywords.every(k => searchText.includes(k));
      case 'ANY':
        return keywords.some(k => searchText.includes(k));
      case 'EXACT':
        return searchText.includes(keyword.toLowerCase());
      default:
        return true;
    }
  };

  // Apply all filters
  const filteredOpps = opportunities.filter(opp => {
    if (!matchesKeyword(opp, filters.keyword, filters.keywordType)) return false;
    if (filters.setAsideType && opp.set_aside_type !== filters.setAsideType) return false;
    if (filters.naicsCode && !opp.naics_code?.includes(filters.naicsCode)) return false;
    if (filters.noticeType && opp.type !== filters.noticeType) return false;

    // Domain filter
    if (selectedDomain) {
      const oppDomain = opp.raw_data?.fullParentPathName?.split('.')[0] || opp.contracting_office?.split(',')[0] || '';
      if (!oppDomain.toLowerCase().includes(selectedDomain.toLowerCase())) return false;
    }

    // Status filter
    if (filters.status === 'active') {
      const now = new Date();
      if (opp.archive_date && new Date(opp.archive_date) < now) return false;
    } else if (filters.status === 'inactive') {
      const now = new Date();
      if (!opp.archive_date || new Date(opp.archive_date) >= now) return false;
    }

    // Date filters
    if (filters.dateFrom && new Date(opp.posted_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(opp.posted_date) > new Date(filters.dateTo)) return false;
    if (filters.agency && !opp.contracting_office?.toLowerCase().includes(filters.agency.toLowerCase())) return false;

    return true;
  });

  // Sorting
  const sortedOpps = [...filteredOpps].sort((a, b) => {
    const direction = filters.sortBy.startsWith('-') ? -1 : 1;
    const field = filters.sortBy.replace('-', '');

    switch (field) {
      case 'modifiedDate':
        return direction * (new Date(b.updated_at) - new Date(a.updated_at));
      case 'postedDate':
        return direction * (new Date(b.posted_date) - new Date(a.posted_date));
      case 'responseDate':
        if (!a.response_deadline) return 1;
        if (!b.response_deadline) return -1;
        return direction * (new Date(a.response_deadline) - new Date(b.response_deadline));
      default:
        return 0;
    }
  });

  // Pagination
  const totalResults = sortedOpps.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startIdx = (currentPage - 1) * resultsPerPage;
  const endIdx = startIdx + resultsPerPage;
  const paginatedOpps = sortedOpps.slice(startIdx, endIdx);

  // Get unique values
  const setAsideTypes = [...new Set(opportunities.map(o => o.set_aside_type).filter(Boolean))];
  const noticeTypes = [...new Set(opportunities.map(o => o.type).filter(Boolean))];

  const formatContractValue = (opp) => {
    const award = opp.raw_data?.award;
    if (award?.amount) {
      const amount = parseFloat(award.amount);
      if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
      return `$${amount.toLocaleString()}`;
    }
    return null;
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      keywordType: 'ALL',
      setAsideType: '',
      naicsCode: '',
      noticeType: '',
      status: 'active',
      dateFrom: '',
      dateTo: '',
      agency: '',
      sortBy: '-modifiedDate',
    });
    setSelectedDomain('');
    setCurrentPage(1);
  };

  // Generate AI Summary for opportunity
  const generateAISummary = async (opportunity) => {
    if (aiSummaries[opportunity.id]) {
      return; // Already have summary
    }

    setLoadingSummary(opportunity.id);
    try {
      // Create a temporary conversation for AI summary
      const conversationRes = await api.post('/conversations', {
        title: 'SAM.gov Summary',
        model: 'gemini-2.5-flash',
      });

      const conversationId = conversationRes.data.conversation.id;

      // Send message to get AI summary
      const response = await api.post('/messages', {
        conversationId,
        content: `Provide a concise 3-sentence summary of this contract opportunity:\n\nTitle: ${opportunity.title}\nAgency: ${opportunity.contracting_office}\nType: ${opportunity.type}\nNAICS: ${opportunity.naics_code || 'N/A'}\nSet-Aside: ${opportunity.set_aside_type || 'None'}\nDeadline: ${opportunity.response_deadline ? new Date(opportunity.response_deadline).toLocaleDateString() : 'Not specified'}\n\nFocus on: What they need, who can bid, and key deadlines.`,
        model: 'gemini-2.5-flash',
        stream: false,
      });

      setAiSummaries(prev => ({
        ...prev,
        [opportunity.id]: response.data.content || response.data.response || 'Summary not available',
      }));

      // Clean up the temporary conversation
      await api.delete(`/conversations/${conversationId}`);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      setAiSummaries(prev => ({
        ...prev,
        [opportunity.id]: 'Failed to generate summary. Please try again.',
      }));
    } finally {
      setLoadingSummary(null);
    }
  };

  // Open opportunity in chat for detailed discussion
  const openInChat = (opportunity) => {
    const context = `I'd like to discuss this SAM.gov contract opportunity:

📋 **${opportunity.title}**
🏛️ Agency: ${opportunity.contracting_office}
📝 Solicitation: ${opportunity.solicitation_number}
📅 Posted: ${new Date(opportunity.posted_date).toLocaleDateString()}
${opportunity.response_deadline ? `⏰ Deadline: ${new Date(opportunity.response_deadline).toLocaleDateString()}` : ''}
🏷️ Type: ${opportunity.type}
${opportunity.naics_code ? `🔢 NAICS: ${opportunity.naics_code}` : ''}
${opportunity.set_aside_type ? `🎯 Set-Aside: ${opportunity.set_aside_type}` : ''}
${opportunity.raw_data?.uiLink ? `🔗 SAM.gov: ${opportunity.raw_data.uiLink}` : ''}

What would you like to know about this opportunity?`;

    // Navigate to chat with pre-filled context
    navigate('/chat', { state: { initialMessage: context } });
  };

  // Share opportunity
  const shareOpportunity = async (opportunity) => {
    const shareUrl = `${window.location.origin}/sam-gov?opp=${opportunity.notice_id || opportunity.id}`;
    const shareText = `${opportunity.title}\n${opportunity.contracting_office}\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: opportunity.title,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus({ id: opportunity.id, message: 'Shared successfully!' });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus({ id: opportunity.id, message: 'Link copied to clipboard!' });
      }
      setTimeout(() => setShareStatus(null), 3000);
    } catch (error) {
      console.error('Failed to share:', error);
      setShareStatus({ id: opportunity.id, message: 'Failed to share' });
      setTimeout(() => setShareStatus(null), 3000);
    }
  };

  // Extract unique domains from opportunities
  const getDomains = () => {
    const domains = opportunities.map(opp => {
      const parts = opp.raw_data?.fullParentPathName?.split('.') || [];
      return parts[0] || opp.contracting_office?.split(',')[0] || 'Unknown';
    });
    return [...new Set(domains)].slice(0, 15); // Top 15 domains
  };

  // Filter Section Component
  const FilterSection = ({ title, name, children, count }) => (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setExpandedFilters(prev => ({ ...prev, [name]: !prev[name] }))}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 text-sm">{title}</span>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {count}
            </span>
          )}
          {expandedFilters[name] ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>
      {expandedFilters[name] && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <h1 className="text-xl font-bold">Contract Opportunities</h1>
            </div>
            {refreshing && (
              <div className="flex items-center gap-2 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Refreshing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <select
              value={filters.keywordType}
              onChange={(e) => setFilters({...filters, keywordType: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-l-lg bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Words</option>
              <option value="ANY">Any Words</option>
              <option value="EXACT">Exact Phrase</option>
            </select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. salesforce"
                value={filters.keyword}
                onChange={(e) => {
                  setFilters({...filters, keyword: e.target.value});
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => loadData()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-r-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden sticky top-4">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter By
                </h2>
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Reset
                </button>
              </div>

              <FilterSection
                title="Status"
                name="status"
                count={filters.status !== 'all' ? 1 : 0}
              >
                <div className="space-y-2">
                  {['active', 'inactive', 'all'].map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={filters.status === status}
                        onChange={() => {
                          setFilters({...filters, status});
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection
                title="Dates"
                name="dates"
                count={(filters.dateFrom || filters.dateTo) ? 1 : 0}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => {
                        setFilters({...filters, dateFrom: e.target.value});
                        setCurrentPage(1);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => {
                        setFilters({...filters, dateTo: e.target.value});
                        setCurrentPage(1);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                title="Notice Type"
                name="notice"
                count={filters.noticeType ? 1 : 0}
              >
                <select
                  value={filters.noticeType}
                  onChange={(e) => {
                    setFilters({...filters, noticeType: e.target.value});
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">All Types</option>
                  {noticeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection
                title="Set Aside"
                name="setAside"
                count={filters.setAsideType ? 1 : 0}
              >
                <select
                  value={filters.setAsideType}
                  onChange={(e) => {
                    setFilters({...filters, setAsideType: e.target.value});
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">All Set-Asides</option>
                  {setAsideTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FilterSection>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Domain Filter Chips */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter by Department/Agency:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedDomain('');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    selectedDomain === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Departments
                </button>
                {getDomains().map((domain, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDomain(domain);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      selectedDomain === domain
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Showing {startIdx + 1} - {Math.min(endIdx, totalResults)} of {totalResults} results
                </h2>
                {lastRefreshTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {lastRefreshTime.toLocaleTimeString()} • Auto-refresh every hour
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Sort by</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="-modifiedDate">Updated Date (Newest)</option>
                    <option value="modifiedDate">Updated Date (Oldest)</option>
                    <option value="-postedDate">Posted Date (Newest)</option>
                    <option value="postedDate">Posted Date (Oldest)</option>
                    <option value="responseDate">Response Date (Earliest)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Opportunity Cards */}
            <div className="space-y-4">
              {paginatedOpps.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No opportunities found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                paginatedOpps.map((opp) => {
                  const contractValue = formatContractValue(opp);
                  const agencyParts = opp.raw_data?.fullParentPathName?.split('.') || [];

                  return (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedOpportunity(opp)}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                    >
                      {/* Title and Notice Type */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-600">Notice ID: {opp.notice_id || opp.solicitation_number}</span>
                          </div>
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOpportunity(opp);
                            }}
                            className="text-base font-semibold text-blue-700 hover:text-blue-800 mb-2 line-clamp-2 cursor-pointer"
                          >
                            {opp.title}
                          </h3>
                        </div>
                        {contractValue && (
                          <div className="flex-shrink-0">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded">
                              {contractValue}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Agency Info */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-700">Department/Ind.Agency</span>
                          <p className="text-gray-600">{agencyParts[0] || opp.contracting_office}</p>
                        </div>
                        {agencyParts[1] && (
                          <div>
                            <span className="font-medium text-gray-700">Subtier</span>
                            <p className="text-gray-600">{agencyParts[1]}</p>
                          </div>
                        )}
                        {agencyParts[2] && (
                          <div>
                            <span className="font-medium text-gray-700">Office</span>
                            <p className="text-gray-600">{agencyParts[2]}</p>
                          </div>
                        )}
                      </div>

                      {/* Contract Opportunities Section */}
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Notice Type</span>
                            <p className="text-gray-900">{opp.type}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Updated Date</span>
                            <p className="text-gray-900">
                              {new Date(opp.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Published Date</span>
                            <p className="text-gray-900">
                              {new Date(opp.posted_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          {opp.response_deadline && (
                            <div>
                              <span className="font-medium text-gray-700">Response Deadline</span>
                              <p className="text-red-600 font-medium">
                                {new Date(opp.response_deadline).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Additional Info */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {opp.naics_code && (
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded">
                              NAICS: {opp.naics_code}
                            </span>
                          )}
                          {opp.set_aside_type && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">
                              {opp.set_aside_type}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Summary Section */}
                      {aiSummaries[opp.id] && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-purple-900 mb-1">AI Summary</p>
                              <p className="text-sm text-purple-800">{aiSummaries[opp.id]}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateAISummary(opp);
                          }}
                          disabled={loadingSummary === opp.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingSummary === opp.id ? (
                            <>
                              <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>AI Summary</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInChat(opp);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Discuss in Chat</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareOpportunity(opp);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </button>

                        {shareStatus?.id === opp.id && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            <CheckCircle className="w-3 h-3" />
                            {shareStatus.message}
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOpportunity(opp);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors ml-auto"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Results per page</span>
                  <select
                    value={resultsPerPage}
                    onChange={(e) => {
                      setResultsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opportunity Detail Modal - keep existing implementation */}
      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          formatContractValue={formatContractValue}
        />
      )}
    </div>
  );
};

// Opportunity Detail Modal Component (simplified)
const OpportunityDetailModal = ({ opportunity, onClose, formatContractValue }) => {
  const contractValue = formatContractValue(opportunity);
  const agencyHierarchy = opportunity.raw_data?.fullParentPathName?.split('.') || [];
  const awardInfo = opportunity.raw_data?.award;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{opportunity.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-gray-600">Solicitation: {opportunity.solicitation_number}</p>
              {contractValue && (
                <span className="px-3 py-1 text-sm font-bold rounded bg-emerald-100 text-emerald-700">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  {contractValue}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
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

          {/* Additional details as per existing implementation */}
          {/* ... rest of detail modal content ... */}

          <div className="space-y-4">
            {/* Agency Hierarchy */}
            {agencyHierarchy.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Agency Hierarchy
                </h3>
                <div className="bg-blue-50 p-3 rounded">
                  <ol className="text-sm text-gray-700 space-y-1">
                    {agencyHierarchy.map((level, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-600 font-medium mr-2">{idx + 1}.</span>
                        <span>{level.trim()}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Contracting Officer Contact */}
            {opportunity.raw_data?.pointOfContact && opportunity.raw_data.pointOfContact.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Contracting Officer / Point of Contact
                </h3>
                {opportunity.raw_data.pointOfContact.map((contact, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded mb-2">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">{contact.fullName}</p>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">
                        {contact.type} Contact
                      </span>
                    </div>
                    {contact.title && (
                      <p className="text-sm text-gray-600 mb-2">{contact.title}</p>
                    )}
                    <div className="space-y-1">
                      {contact.email && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Email:</span>{' '}
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                            {contact.email}
                          </a>
                        </p>
                      )}
                      {contact.phone && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Phone:</span> {contact.phone}
                        </p>
                      )}
                    </div>
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
                  View Full Details on SAM.gov →
                </a>
              )}
              {opportunity.raw_data?.resourceLinks && opportunity.raw_data.resourceLinks.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    Attachments ({opportunity.raw_data.resourceLinks.length})
                  </h4>
                  <div className="space-y-1">
                    {opportunity.raw_data.resourceLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        📎 Document {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SAMGovPage;
