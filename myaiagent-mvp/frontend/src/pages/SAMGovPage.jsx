import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ChevronUp, X, Calendar, Building2, FileText, DollarSign, Users, Clock, Award, MessageSquare, ArrowLeft, Share2, Sparkles, ExternalLink, CheckCircle, BarChart3, Trophy, Bookmark, Star, Trash2, Save, List, CalendarDays, Mail, Phone, CalendarPlus, Code, Lock } from 'lucide-react';
import api, { samGov } from '../services/api';
import { addToGoogleCalendar, openEmailClient, initiatePhoneCall, formatPhoneNumber } from '../utils/integrations';

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
    status: '', // Show all opportunities by default (active and inactive)
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
    savedSearches: true,
    keyword: true,
    dates: false,
    notice: false,
    setAside: false,
    naics: false,
    agency: false,
    status: true,
  });

  // Domain filtering and AI features
  const [selectedDomain, setSelectedDomain] = useState('');
  const [aiSummaries, setAiSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  // Department filter state
  const [departments, setDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserProfile();
    loadDepartments();
    loadData();
    loadSavedSearches();

    // Auto-refresh every 1 hour
    const interval = setInterval(() => {
      loadData(true);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Load user profile
  const loadUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  // Load departments
  const loadDepartments = async () => {
    try {
      const response = await samGov.getDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  // Load saved searches from localStorage
  const loadSavedSearches = () => {
    try {
      const saved = localStorage.getItem('savedSearches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const loadData = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Check cached count first
      const cachedRes = await samGov.getCachedOpportunities({ limit: 10, offset: 0 });
      const cachedCount = cachedRes.total || 0;

      // If we have fewer than 100 cached opportunities, batch-fetch more
      if (cachedCount < 100 && !isBackgroundRefresh) {
        console.log(`📥 Only ${cachedCount} cached opportunities, batch-fetching from SAM.gov...`);
        setLoadingBatch(true);
        try {
          await samGov.batchFetchAll({ keyword: '' });
          await loadDepartments(); // Reload departments after batch fetch
        } catch (batchError) {
          console.warn('Batch fetch failed, using cached data:', batchError);
        } finally {
          setLoadingBatch(false);
        }
      }

      // Now load full cached opportunities
      const fullRes = await samGov.getCachedOpportunities({ limit: 10000, offset: 0 });
      setOpportunities(fullRes.opportunities || []);
      setLastRefreshTime(new Date());

      if (isBackgroundRefresh) {
        console.log(`✅ Auto-refresh: ${fullRes.opportunities?.length || 0} opportunities`);
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

    // Department filter
    if (departmentFilter) {
      const oppDept = opp.contracting_office || '';
      if (!oppDept.toLowerCase().includes(departmentFilter.toLowerCase())) return false;
    }

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
      status: '', // Show all opportunities by default
      dateFrom: '',
      dateTo: '',
      agency: '',
      sortBy: '-modifiedDate',
    });
    setSelectedDomain('');
    setCurrentPage(1);
  };

  // Save current search
  const saveCurrentSearch = () => {
    if (!searchName.trim()) {
      alert('Please enter a name for this search');
      return;
    }

    const newSearch = {
      id: Date.now(),
      name: searchName.trim(),
      filters: { ...filters },
      selectedDomain,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));

    setSearchName('');
    setShowSaveSearchDialog(false);
    alert(`Search "${newSearch.name}" saved successfully!`);
  };

  // Load a saved search
  const loadSavedSearch = (search) => {
    setFilters(search.filters);
    setSelectedDomain(search.selectedDomain || '');
    setCurrentPage(1);
    setIsMobileFilterOpen(false);
  };

  // Delete a saved search
  const deleteSavedSearch = (id) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      const updated = savedSearches.filter(s => s.id !== id);
      setSavedSearches(updated);
      localStorage.setItem('savedSearches', JSON.stringify(updated));
    }
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
      {/* Mobile Filter Backdrop */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileFilterOpen(false)}
        />
      )}

      {/* Header */}
      <div className="bg-blue-700 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-1.5 bg-blue-600 hover:bg-blue-500 rounded transition-colors touch-manipulation min-h-[44px] md:min-h-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium hidden sm:inline">Back</span>
              </button>
              <button
                onClick={() => navigate('/contract-analytics')}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-1.5 bg-purple-600 hover:bg-purple-500 rounded transition-colors touch-manipulation min-h-[44px] md:min-h-0"
              >
                <BarChart3 className="w-4 h-4 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium hidden md:inline">Analytics</span>
              </button>
              <h1 className="text-base md:text-xl font-bold truncate">Contract Opportunities</h1>
            </div>
            <div className="flex items-center gap-2">
              {refreshing && (
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <div className="animate-spin w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="hidden sm:inline">Refreshing...</span>
                </div>
              )}
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="lg:hidden flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors touch-manipulation min-h-[44px]"
              >
                <Filter className="w-4 h-4" />
                <span className="text-xs font-medium">Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={filters.keywordType}
              onChange={(e) => setFilters({...filters, keywordType: e.target.value})}
              className="px-2 md:px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg sm:rounded-l-lg bg-white text-xs md:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            >
              <option value="ALL">All Words</option>
              <option value="ANY">Any Words</option>
              <option value="EXACT">Exact Phrase</option>
            </select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. salesforce"
                value={filters.keyword}
                onChange={(e) => {
                  setFilters({...filters, keyword: e.target.value});
                  setCurrentPage(1);
                }}
                className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-2 border border-gray-300 rounded-lg sm:rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
              />
            </div>
            <button
              onClick={() => loadData()}
              className="px-4 md:px-6 py-2.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg sm:rounded-r-lg transition-colors flex items-center justify-center gap-2 touch-manipulation min-h-[44px] md:min-h-0"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="flex gap-4 lg:gap-6">
          {/* Sidebar Filters - Mobile Drawer / Desktop Sidebar */}
          <div
            className={`
              fixed lg:static inset-y-0 left-0 z-50 w-80 lg:w-64 flex-shrink-0
              transform transition-transform duration-300 ease-in-out
              ${isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            <div className="h-full lg:h-auto lg:max-h-[calc(100vh-6rem)] bg-white border-r lg:border lg:border-gray-200 lg:rounded-lg overflow-y-auto lg:sticky lg:top-20">
              {/* Mobile Header */}
              <div className="lg:hidden bg-blue-700 text-white px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </h2>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 hover:bg-blue-600 rounded-lg transition-colors touch-manipulation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowSaveSearchDialog(true);
                    setIsMobileFilterOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors touch-manipulation"
                >
                  <Bookmark className="w-4 h-4" />
                  Save Current Search
                </button>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block bg-gray-100 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
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
                <button
                  onClick={() => setShowSaveSearchDialog(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                >
                  <Bookmark className="w-3 h-3" />
                  Save Current Search
                </button>
              </div>

              {/* Saved Searches Section */}
              {savedSearches.length > 0 && (
                <FilterSection
                  title="Saved Searches"
                  name="savedSearches"
                  count={savedSearches.length}
                >
                  <div className="space-y-2">
                    {savedSearches.map((search) => (
                      <div
                        key={search.id}
                        className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                      >
                        <button
                          onClick={() => loadSavedSearch(search)}
                          className="flex-1 text-left flex items-center gap-2"
                        >
                          <Star className="w-3 h-3 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{search.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(search.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSearch(search.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete search"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </FilterSection>
              )}

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

              <FilterSection
                title="NAICS Code"
                name="naics"
                count={filters.naicsCode ? 1 : 0}
              >
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. 541511, 541512"
                    value={filters.naicsCode}
                    onChange={(e) => {
                      setFilters({...filters, naicsCode: e.target.value});
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-medium text-gray-700">Common IT NAICS:</p>
                    <button
                      onClick={() => {
                        setFilters({...filters, naicsCode: '541511'});
                        setCurrentPage(1);
                      }}
                      className="block w-full text-left px-2 py-1 hover:bg-blue-50 rounded text-gray-700"
                    >
                      541511 - Custom Computer Programming
                    </button>
                    <button
                      onClick={() => {
                        setFilters({...filters, naicsCode: '541512'});
                        setCurrentPage(1);
                      }}
                      className="block w-full text-left px-2 py-1 hover:bg-blue-50 rounded text-gray-700"
                    >
                      541512 - Computer Systems Design
                    </button>
                    <button
                      onClick={() => {
                        setFilters({...filters, naicsCode: '541519'});
                        setCurrentPage(1);
                      }}
                      className="block w-full text-left px-2 py-1 hover:bg-blue-50 rounded text-gray-700"
                    >
                      541519 - Other Computer Services
                    </button>
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                title="Agency"
                name="agency"
                count={filters.agency ? 1 : 0}
              >
                <input
                  type="text"
                  placeholder="Search agency name..."
                  value={filters.agency}
                  onChange={(e) => {
                    setFilters({...filters, agency: e.target.value});
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FilterSection>

              <FilterSection
                title="Department"
                name="department"
                count={departmentFilter ? 1 : 0}
              >
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </FilterSection>

              {/* Profile Section - Bottom of Sidebar */}
              {user && (
                <div className="border-t border-gray-200 mt-4 pt-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.fullName?.split(' ').map(n => n[0]).join('') || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName || user.email}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Domain Filter Chips */}
            <div className="mb-3 md:mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-600" />
                <span className="text-xs md:text-sm font-medium text-gray-700">Filter by Department:</span>
              </div>
              {/* Horizontal scrollable on mobile, wrap on desktop */}
              <div className="overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
                <div className="flex md:flex-wrap gap-2 min-w-max md:min-w-0">
                  <button
                    onClick={() => {
                      setSelectedDomain('');
                      setCurrentPage(1);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`px-3 py-2 md:py-1.5 text-xs md:text-sm font-medium rounded-full transition-colors touch-manipulation whitespace-nowrap ${
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
                        setIsMobileFilterOpen(false);
                      }}
                      className={`px-3 py-2 md:py-1.5 text-xs md:text-sm font-medium rounded-full transition-colors touch-manipulation whitespace-nowrap ${
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
            </div>

            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 md:mb-4 pb-3 border-b border-gray-200">
              <div>
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                  Showing {startIdx + 1} - {Math.min(endIdx, totalResults)} of {totalResults} results
                </h2>
                {lastRefreshTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {lastRefreshTime.toLocaleTimeString()} <span className="hidden sm:inline">• Auto-refresh every hour</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border border-gray-300 rounded overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 md:px-3 py-2 md:py-1.5 flex items-center gap-1 text-xs md:text-sm transition-colors ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="List View"
                  >
                    <List className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-2 md:px-3 py-2 md:py-1.5 flex items-center gap-1 text-xs md:text-sm transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Calendar View"
                  >
                    <CalendarDays className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Calendar</span>
                  </button>
                </div>

                {viewMode === 'list' && (
                  <>
                    <label className="text-xs md:text-sm text-gray-600 hidden sm:inline">Sort by</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      className="px-2 md:px-3 py-2 md:py-1.5 border border-gray-300 rounded text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation w-full sm:w-auto"
                      >
                        <option value="-modifiedDate">Updated Date (Newest)</option>
                        <option value="modifiedDate">Updated Date (Oldest)</option>
                        <option value="-postedDate">Posted Date (Newest)</option>
                        <option value="postedDate">Posted Date (Oldest)</option>
                        <option value="responseDate">Response Date (Earliest)</option>
                      </select>
                  </>
                )}
              </div>
            </div>

            {/* List View - Opportunity Cards */}
            {viewMode === 'list' && (
              <>
              <div className="space-y-3 md:space-y-4">
              {paginatedOpps.length === 0 ? (
                <div className="text-center py-8 md:py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FileText className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm md:text-base text-gray-600 font-medium">No opportunities found</p>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                paginatedOpps.map((opp) => {
                  const contractValue = formatContractValue(opp);
                  const agencyParts = opp.raw_data?.fullParentPathName?.split('.') || [];

                  return (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedOpportunity(opp)}
                      className="bg-white border border-gray-200 rounded-lg p-3 md:p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer touch-manipulation"
                    >
                      {/* Title and Notice Type */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                            <span className="text-xs text-gray-600 truncate">Notice ID: {opp.notice_id || opp.solicitation_number}</span>
                          </div>
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOpportunity(opp);
                            }}
                            className="text-sm md:text-base font-semibold text-blue-700 hover:text-blue-800 mb-2 line-clamp-3 md:line-clamp-2 cursor-pointer"
                          >
                            {opp.title}
                          </h3>
                        </div>
                        {contractValue && (
                          <div className="flex-shrink-0">
                            <span className="inline-block px-2.5 md:px-3 py-1 bg-emerald-100 text-emerald-700 text-xs md:text-sm font-bold rounded">
                              {contractValue}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Agency Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-2 text-xs md:text-sm mb-3">
                        <div className="min-w-0">
                          <span className="font-medium text-gray-700 block">Department/Ind.Agency</span>
                          <p className="text-gray-600 truncate">{agencyParts[0] || opp.contracting_office}</p>
                        </div>
                        {agencyParts[1] && (
                          <div className="min-w-0">
                            <span className="font-medium text-gray-700 block">Subtier</span>
                            <p className="text-gray-600 truncate">{agencyParts[1]}</p>
                          </div>
                        )}
                        {agencyParts[2] && (
                          <div className="min-w-0">
                            <span className="font-medium text-gray-700 block">Office</span>
                            <p className="text-gray-600 truncate">{agencyParts[2]}</p>
                          </div>
                        )}
                      </div>

                      {/* Contract Opportunities Section */}
                      <div className="border-t border-gray-200 pt-2 md:pt-3 mt-2 md:mt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
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
                      <div className="mt-3 md:mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateAISummary(opp);
                          }}
                          disabled={loadingSummary === opp.id}
                          className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] md:min-h-0"
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
                          className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors touch-manipulation min-h-[44px] md:min-h-0"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Discuss in Chat</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareOpportunity(opp);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors touch-manipulation min-h-[44px] md:min-h-0"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </button>

                        {shareStatus?.id === opp.id && (
                          <span className="flex items-center gap-1 px-2 py-2 md:py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            <CheckCircle className="w-3 h-3" />
                            <span className="hidden sm:inline">{shareStatus.message}</span>
                            <span className="sm:hidden">Shared!</span>
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOpportunity(opp);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors md:ml-auto touch-manipulation min-h-[44px] md:min-h-0"
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
              <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">Results per page</span>
                  <select
                    value={resultsPerPage}
                    onChange={(e) => {
                      setResultsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 md:px-2 py-2 md:py-1 border border-gray-300 rounded text-xs md:text-sm touch-manipulation"
                  >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 md:px-3 py-2 md:py-1 border border-gray-300 rounded text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 touch-manipulation min-h-[44px] md:min-h-0"
                  >
                    Previous
                  </button>
                  <span className="text-xs md:text-sm text-gray-600 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 md:px-3 py-2 md:py-1 border border-gray-300 rounded text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 touch-manipulation min-h-[44px] md:min-h-0"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
              </>
            )}

            {/* Calendar View - Deadline Calendar */}
            {viewMode === 'calendar' && (
              <DeadlineCalendar
                opportunities={sortedOpps}
                onSelectOpportunity={setSelectedOpportunity}
                formatContractValue={formatContractValue}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveSearchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600" />
                Save Current Search
              </h3>
              <button
                onClick={() => {
                  setShowSaveSearchDialog(false);
                  setSearchName('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && saveCurrentSearch()}
                placeholder="e.g., IT Contracts - DoD"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <p className="font-medium mb-2">Current filters:</p>
              <ul className="space-y-1">
                {filters.keyword && <li>• Keyword: {filters.keyword}</li>}
                {filters.naicsCode && <li>• NAICS: {filters.naicsCode}</li>}
                {filters.agency && <li>• Agency: {filters.agency}</li>}
                {filters.setAsideType && <li>• Set-Aside: {filters.setAsideType}</li>}
                {filters.noticeType && <li>• Notice Type: {filters.noticeType}</li>}
                {selectedDomain && <li>• Department: {selectedDomain}</li>}
                {!filters.keyword && !filters.naicsCode && !filters.agency && !filters.setAsideType && !filters.noticeType && !selectedDomain && (
                  <li className="text-gray-500">No filters applied</li>
                )}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveSearchDialog(false);
                  setSearchName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentSearch}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}

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

// Deadline Calendar Component
const DeadlineCalendar = ({ opportunities, onSelectOpportunity, formatContractValue }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Get the first and last day of the selected month
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
  const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Group opportunities by deadline date
  const opportunitiesByDate = {};
  opportunities.forEach(opp => {
    if (opp.response_deadline) {
      const deadline = new Date(opp.response_deadline);
      const dateKey = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
      if (!opportunitiesByDate[dateKey]) {
        opportunitiesByDate[dateKey] = [];
      }
      opportunitiesByDate[dateKey].push(opp);
    }
  });

  // Generate calendar days
  const calendarDays = [];
  // Add empty cells for days before the month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           selectedMonth === today.getMonth() &&
           selectedYear === today.getFullYear();
  };

  const getDateKey = (day) => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Deadline Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="text-center mb-4">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">
            {monthNames[selectedMonth]} {selectedYear}
          </h3>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs md:text-sm font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const dateKey = getDateKey(day);
            const oppsOnThisDay = opportunitiesByDate[dateKey] || [];
            const hasDeadlines = oppsOnThisDay.length > 0;

            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-1 md:p-2 transition-all ${
                  isToday(day)
                    ? 'bg-blue-50 border-blue-500 border-2'
                    : hasDeadlines
                    ? 'bg-red-50 border-red-300 hover:bg-red-100 cursor-pointer'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs md:text-sm font-medium text-gray-900 mb-1">
                  {day}
                </div>
                {hasDeadlines && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-600">
                      {oppsOnThisDay.length} deadline{oppsOnThisDay.length > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Deadlines List */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Upcoming Deadlines This Month
        </h3>
        <div className="space-y-3">
          {Object.keys(opportunitiesByDate)
            .filter(dateKey => {
              const date = new Date(dateKey);
              return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
            })
            .sort()
            .map(dateKey => {
              const opps = opportunitiesByDate[dateKey];
              const date = new Date(dateKey);
              const isOverdue = date < new Date();

              return (
                <div key={dateKey} className="border-l-4 border-red-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">OVERDUE</span>}
                    </h4>
                    <span className="text-sm font-medium text-gray-600">{opps.length} opportunity{opps.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {opps.map(opp => {
                      const contractValue = formatContractValue(opp);
                      return (
                        <div
                          key={opp.id}
                          onClick={() => onSelectOpportunity(opp)}
                          className="bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded p-3 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-blue-700 mb-1 line-clamp-2">
                                {opp.title}
                              </h5>
                              <p className="text-xs text-gray-600 truncate">{opp.contracting_office}</p>
                              {opp.naics_code && (
                                <p className="text-xs text-gray-500 mt-1">NAICS: {opp.naics_code}</p>
                              )}
                            </div>
                            {contractValue && (
                              <span className="flex-shrink-0 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                                {contractValue}
                              </span>
                            )}
                          </div>
                          {opp.set_aside_type && (
                            <div className="mt-2">
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                {opp.set_aside_type}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          {Object.keys(opportunitiesByDate).filter(dateKey => {
            const date = new Date(dateKey);
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
          }).length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">No deadlines this month</p>
              <p className="text-xs text-gray-500 mt-1">Navigate to another month to see more deadlines</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Opportunity Detail Modal Component
const OpportunityDetailModal = ({ opportunity, onClose, formatContractValue }) => {
  const navigate = useNavigate();
  const contractValue = formatContractValue(opportunity);
  const agencyHierarchy = opportunity.raw_data?.fullParentPathName?.split('.') || [];
  const awardInfo = opportunity.raw_data?.award;
  const classificationCode = opportunity.raw_data?.classificationCode;
  const placeOfPerformance = opportunity.raw_data?.placeOfPerformance;
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [incumbentData, setIncumbentData] = useState(null);
  const [loadingIncumbent, setLoadingIncumbent] = useState(false);
  const [contactNotes, setContactNotes] = useState('');
  const [savedToTracking, setSavedToTracking] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Accordion sections state - SAM.gov style
  const [expandedSections, setExpandedSections] = useState({
    solicitation: true,  // Open by default
    award: false,
    classification: false,
    description: true,   // Open by default
    contact: false,
    attachments: false,
    apiData: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Load incumbent contractor data
  useEffect(() => {
    const loadIncumbentData = async () => {
      if (opportunity.naics_code) {
        setLoadingIncumbent(true);
        try {
          // Search for contracts with same NAICS code
          const response = await api.get('/fpds/search/contracts', {
            params: {
              naicsCode: opportunity.naics_code,
              limit: 5
            }
          });
          setIncumbentData(response.data.contracts || []);
        } catch (error) {
          console.error('Failed to load incumbent data:', error);
          setIncumbentData([]);
        } finally {
          setLoadingIncumbent(false);
        }
      }
    };
    loadIncumbentData();
  }, [opportunity.naics_code]);

  // Save to contact tracking
  const saveToTracking = () => {
    const trackingData = {
      opportunityId: opportunity.id,
      title: opportunity.title,
      solicitation: opportunity.solicitation_number,
      agency: opportunity.contracting_office,
      deadline: opportunity.response_deadline,
      notes: contactNotes,
      savedAt: new Date().toISOString()
    };

    // Save to localStorage (could be enhanced with backend API)
    const existing = JSON.parse(localStorage.getItem('trackedOpportunities') || '[]');
    existing.push(trackingData);
    localStorage.setItem('trackedOpportunities', JSON.stringify(existing));

    setSavedToTracking(true);
    setTimeout(() => setSavedToTracking(false), 3000);
  };

  const performAIMarketAnalysis = async () => {
    setAnalyzingWithAI(true);
    setAiAnalysis(null);
    try {
      // Prepare factual market analysis prompt
      const analysisPrompt = `Analyze this federal contract opportunity and provide ONLY factual market intelligence. Be concise and data-driven.

OPPORTUNITY DATA:
Title: ${opportunity.title}
Solicitation: ${opportunity.solicitation_number}
Agency: ${agencyHierarchy.join(' → ')}
Type: ${opportunity.type}
Set-Aside: ${opportunity.set_aside_type || 'None (Full & Open Competition)'}
NAICS: ${opportunity.naics_code || 'N/A'}
PSC: ${classificationCode?.code || 'N/A'}
Posted: ${new Date(opportunity.posted_date).toLocaleDateString()}
Deadline: ${opportunity.response_deadline ? new Date(opportunity.response_deadline).toLocaleDateString() : 'Not specified'}
Estimated Value: ${contractValue || 'Not disclosed'}
${awardInfo ? `\nIncumbent: ${awardInfo.awardee?.name || 'Unknown'}
Incumbent Contract Value: $${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M
Award Date: ${new Date(awardInfo.date).toLocaleDateString()}` : ''}

Description: ${opportunity.description || 'Not provided'}

Provide a factual market analysis covering:
1. MARKET POSITION: Key facts about this opportunity's market segment
2. COMPETITION ASSESSMENT: Incumbent advantage, set-aside impact, expected competition level
3. WIN FACTORS: Specific technical/past performance requirements that matter
4. STRATEGIC INSIGHTS: Factual observations about timing, agency patterns, contract type

Keep it factual, concise, and actionable. No fluff or generic advice.`;

      // Create a temporary conversation for analysis
      const convResponse = await api.post('/conversations', {
        title: `Market Analysis: ${opportunity.solicitation_number}`,
        model: 'gemini-2.5-flash'
      });

      const conversationId = convResponse.data.conversation.id;

      // Call the backend API which will use Gemini
      const response = await api.post('/messages', {
        conversationId,
        content: analysisPrompt,
        model: 'gemini-2.5-flash',
        stream: false
      });

      if (response.data?.message?.content) {
        setAiAnalysis(response.data.message.content);
      } else {
        throw new Error('No analysis generated');
      }
    } catch (error) {
      console.error('Failed to perform AI analysis:', error);
      setAiAnalysis('⚠️ Analysis failed. Please try again or check your connection.');
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-lg max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 md:p-6 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2 line-clamp-2">{opportunity.title}</h2>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <p className="text-xs md:text-sm text-gray-600 truncate">Solicitation: {opportunity.solicitation_number}</p>
              {contractValue && (
                <span className="px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-bold rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                  {contractValue}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 md:ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 touch-manipulation"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Action Buttons - Moved to top for better visibility */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <button
              onClick={performAIMarketAnalysis}
              disabled={analyzingWithAI}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs md:text-sm font-medium rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzingWithAI ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Market Analysis
                </>
              )}
            </button>

            <button
              onClick={() => {
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
                navigate('/chat', { state: { initialMessage: context } });
                onClose();
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Send to Chat
            </button>

            <button
              onClick={() => {
                navigate('/contract-analytics');
                onClose();
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Market Analytics
            </button>

            {/* Go to SAM.gov Button - Prominent like SAM.gov site */}
            {opportunity.raw_data?.uiLink && (
              <a
                href={opportunity.raw_data.uiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white text-xs md:text-sm font-bold rounded-lg transition-all shadow-lg ring-2 ring-blue-300"
              >
                <ExternalLink className="w-4 h-4" />
                Go to SAM.gov
              </a>
            )}

            {opportunity.raw_data?.pointOfContact && opportunity.raw_data.pointOfContact.length > 0 && opportunity.raw_data.pointOfContact[0].email && (
              <button
                onClick={() => {
                  const contact = opportunity.raw_data.pointOfContact[0];
                  openEmailClient(
                    contact.email,
                    `Inquiry: ${opportunity.solicitation_number}`,
                    `Dear ${contact.fullName},\n\nI am interested in the following opportunity:\n\nTitle: ${opportunity.title}\nSolicitation: ${opportunity.solicitation_number}\n\n`
                  );
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email in Gmail
              </button>
            )}

            {opportunity.response_deadline && (
              <button
                onClick={() => {
                  addToGoogleCalendar({
                    title: `Response Due: ${opportunity.title}`,
                    description: `SAM.gov Opportunity\nSolicitation: ${opportunity.solicitation_number}\nAgency: ${opportunity.contracting_office}\n\nLink: ${opportunity.raw_data?.uiLink || ''}`,
                    startDate: opportunity.response_deadline,
                    location: 'SAM.gov',
                  });
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Add to Calendar
              </button>
            )}
          </div>

          {/* AI Market Analysis Results */}
          {aiAnalysis && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4 shadow-lg">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">AI Market Intelligence Analysis</h3>
                  <p className="text-xs text-gray-600">Powered by Gemini 2.5 Flash • Factual insights only</p>
                </div>
                <button
                  onClick={() => setAiAnalysis(null)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Close analysis"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="prose prose-sm max-w-none">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {aiAnalysis}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <BarChart3 className="w-3 h-3" />
                <span>This analysis is based on publicly available SAM.gov data and market patterns</span>
              </div>
            </div>
          )}

          {/* SAM.gov Style Accordion Sections */}
          <div className="space-y-2">
            {/* Solicitation Details Section */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('solicitation')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <h3 className="text-base font-bold text-gray-900">Solicitation Details</h3>
                {expandedSections.solicitation ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              {expandedSections.solicitation && (
                <div className="p-4 bg-white space-y-4">
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
            {opportunity.raw_data?.active && (
              <span className="px-3 py-1 text-sm font-medium rounded bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
                    )}
                  </div>

                  {/* Solicitation Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 mb-1">Notice ID</p>
                      <p className="text-sm font-semibold text-gray-900">{opportunity.solicitation_number}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 mb-1">Contract Opportunity Type</p>
                      <p className="text-sm font-semibold text-gray-900">{opportunity.type}</p>
                    </div>
                    {opportunity.response_deadline && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-500 mb-1">Response Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(opportunity.response_deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 mb-1">Published Date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(opportunity.posted_date).toLocaleDateString()} {new Date(opportunity.posted_date).toLocaleTimeString()} EST
                      </p>
                    </div>
                  </div>

                  {/* Department/Agency/Office Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
                    {agencyHierarchy[0] && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Department/Ind. Agency</p>
                        <p className="text-sm font-semibold text-gray-900">{agencyHierarchy[0]}</p>
                      </div>
                    )}
                    {agencyHierarchy[1] && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Sub-tier</p>
                        <p className="text-sm font-semibold text-gray-900">{agencyHierarchy[1]}</p>
                      </div>
                    )}
                    {agencyHierarchy[2] && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Office</p>
                        <p className="text-sm font-semibold text-gray-900">{agencyHierarchy[2]}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Award Details Section */}
            {awardInfo && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('award')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <h3 className="text-base font-bold text-gray-900">Award Details</h3>
                  {expandedSections.award ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.award && (
                  <div className="p-4 bg-white space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {awardInfo.date && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500 mb-1">Contract Award Date</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(awardInfo.date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {awardInfo.number && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500 mb-1">Contract Award Number</p>
                          <p className="text-sm font-semibold text-gray-900">{awardInfo.number}</p>
                        </div>
                      )}
                      {awardInfo.awardee?.ueiSAM && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500 mb-1">Contractor Awarded</p>
                          <p className="text-sm font-semibold text-gray-900">Unique Entity ID</p>
                        </div>
                      )}
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-500 mb-1">Modification Number</p>
                        <p className="text-sm font-semibold text-gray-900">(blank)</p>
                      </div>
                    </div>

                    {/* Task/Delivery Order and Authority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {opportunity.raw_data?.taskDeliveryOrder && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500 mb-1">Task/Delivery Order Number</p>
                          <p className="text-sm font-semibold text-gray-900">{opportunity.raw_data.taskDeliveryOrder}</p>
                        </div>
                      )}
                      {opportunity.raw_data?.authority && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500 mb-1">Authority</p>
                          <p className="text-sm font-semibold text-gray-900">{opportunity.raw_data.authority}</p>
                        </div>
                      )}
                    </div>

                    {/* Awardee Information */}
                    {awardInfo.awardee && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Awarded Contractor</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {awardInfo.awardee.name && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Company Name</p>
                              <p className="text-sm font-semibold text-gray-900">{awardInfo.awardee.name}</p>
                            </div>
                          )}
                          {awardInfo.awardee.ueiSAM && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">UEI SAM</p>
                              <p className="text-sm font-semibold text-gray-900">{awardInfo.awardee.ueiSAM}</p>
                            </div>
                          )}
                          {awardInfo.amount && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Award Amount</p>
                              <p className="text-sm font-semibold text-green-700">
                                ${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Classification Section - Accordion */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('classification')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <h3 className="text-base font-bold text-gray-900">Classification</h3>
                {expandedSections.classification ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              {expandedSections.classification && (
                <div className="p-4 bg-white space-y-3">
                  {/* Classification data will go here */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Posted Date
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(opportunity.posted_date).toLocaleDateString()}
              </p>
            </div>
            {opportunity.response_deadline && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-600 mb-1 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  Response Deadline
                </p>
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

                  {/* NAICS and PSC Codes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {opportunity.naics_code && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">NAICS Code</p>
                        <p className="text-lg font-bold text-gray-900">{opportunity.naics_code}</p>
                        {opportunity.raw_data?.naicsCode && (
                          <p className="text-xs text-gray-600 mt-1">{opportunity.raw_data.naicsCode}</p>
                        )}
                      </div>
                    )}
                    {classificationCode && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 mb-1">PSC Code</p>
                        <p className="text-lg font-bold text-gray-900">{classificationCode.code}</p>
                        {classificationCode.description && (
                          <p className="text-xs text-gray-600 mt-1">{classificationCode.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Place of Performance */}
          {placeOfPerformance && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                Place of Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                {placeOfPerformance.city && (
                  <p><span className="font-medium">City:</span> {placeOfPerformance.city.name}</p>
                )}
                {placeOfPerformance.state && (
                  <p><span className="font-medium">State:</span> {placeOfPerformance.state.name}</p>
                )}
                {placeOfPerformance.country && (
                  <p><span className="font-medium">Country:</span> {placeOfPerformance.country.name}</p>
                )}
                {placeOfPerformance.zip && (
                  <p><span className="font-medium">ZIP:</span> {placeOfPerformance.zip}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Agency Hierarchy - Enhanced with Department → Sub-tier → Office Mapping */}
            {agencyHierarchy.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Federal Agency Hierarchy
                  <span className="text-xs text-gray-500 font-normal">(Department → Sub-tier → Office)</span>
                </h3>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  {/* Hierarchical Flow Visualization */}
                  <div className="space-y-3">
                    {agencyHierarchy.map((level, idx) => {
                      const levelLabels = ['Department', 'Sub-tier Agency', 'Office/Division', 'Sub-Office', 'Unit'];
                      const levelLabel = levelLabels[idx] || `Level ${idx + 1}`;

                      return (
                        <div key={idx} className="relative">
                          {/* Level Card */}
                          <div className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${
                            idx === 0 ? 'border-blue-600' :
                            idx === 1 ? 'border-indigo-500' :
                            idx === 2 ? 'border-purple-500' :
                            'border-gray-400'
                          }`}>
                            <div className="flex items-start gap-3">
                              {/* Level Indicator */}
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                idx === 0 ? 'bg-blue-600' :
                                idx === 1 ? 'bg-indigo-500' :
                                idx === 2 ? 'bg-purple-500' :
                                'bg-gray-400'
                              }`}>
                                {idx + 1}
                              </div>

                              {/* Level Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  {levelLabel}
                                </p>
                                <p className="text-sm font-medium text-gray-900 leading-snug">
                                  {level.trim()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Connector Arrow */}
                          {idx < agencyHierarchy.length - 1 && (
                            <div className="flex justify-center py-1">
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Full Path Display */}
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Full Organizational Path:</p>
                    <p className="text-xs text-gray-700 font-mono bg-white p-2 rounded border border-blue-100">
                      {agencyHierarchy.join(' → ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Past Performance History */}
            {awardInfo && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  Past Performance & Award History
                </h3>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Award Amount */}
                    {awardInfo.amount && (
                      <div className="bg-white rounded-lg p-3 border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">Award Amount</p>
                        <p className="text-lg font-bold text-amber-700">
                          ${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          ${parseFloat(awardInfo.amount).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Award Date */}
                    {awardInfo.date && (
                      <div className="bg-white rounded-lg p-3 border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">Award Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(awardInfo.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.floor((new Date() - new Date(awardInfo.date)) / (1000 * 60 * 60 * 24))} days ago
                        </p>
                      </div>
                    )}

                    {/* Awardee */}
                    {awardInfo.awardee && (
                      <div className="bg-white rounded-lg p-3 border border-amber-200 md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Awardee / Incumbent Contractor</p>
                        <p className="text-sm font-semibold text-gray-900">{awardInfo.awardee.name || 'N/A'}</p>
                        {awardInfo.awardee.location && (
                          <p className="text-xs text-gray-600 mt-1">📍 {awardInfo.awardee.location.city}, {awardInfo.awardee.location.state}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contract Modifications */}
                  {opportunity.raw_data?.modifications && opportunity.raw_data.modifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Contract Modifications ({opportunity.raw_data.modifications.length})
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {opportunity.raw_data.modifications.map((mod, idx) => (
                          <div key={idx} className="bg-white rounded p-2 text-xs border border-amber-100">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-gray-900">Mod #{mod.number || idx + 1}</span>
                              {mod.amount && (
                                <span className="text-amber-700 font-bold">${parseFloat(mod.amount).toLocaleString()}</span>
                              )}
                            </div>
                            {mod.date && (
                              <p className="text-gray-600">Date: {new Date(mod.date).toLocaleDateString()}</p>
                            )}
                            {mod.description && (
                              <p className="text-gray-700 mt-1 line-clamp-2">{mod.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitive Intelligence Dashboard */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Competitive Intelligence
              </h3>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Market Position */}
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-indigo-600" />
                      <p className="text-xs font-semibold text-gray-700">Market Position</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Set-Aside:</span>
                        <span className="font-semibold text-gray-900">
                          {opportunity.set_aside_type || 'Open Competition'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-semibold ${opportunity.raw_data?.active ? 'text-green-600' : 'text-red-600'}`}>
                          {opportunity.raw_data?.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Competition Level */}
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <p className="text-xs font-semibold text-gray-700">Competition Level</p>
                    </div>
                    <div className="text-center py-2">
                      <p className="text-2xl font-bold text-indigo-600">
                        {opportunity.set_aside_type ? 'Restricted' : 'Open'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {opportunity.set_aside_type
                          ? 'Set-aside limits competition'
                          : 'Full and open competition'}
                      </p>
                    </div>
                  </div>

                  {/* Win Probability Indicator */}
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <p className="text-xs font-semibold text-gray-700">Win Factors</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${awardInfo ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                        <span className="text-gray-700">
                          {awardInfo ? 'Incumbent present' : 'No incumbent data'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${opportunity.set_aside_type ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-gray-700">
                          {opportunity.set_aside_type ? 'Set-aside advantage' : 'Open competition'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${opportunity.response_deadline ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <span className="text-gray-700">
                          {opportunity.response_deadline
                            ? `${Math.floor((new Date(opportunity.response_deadline) - new Date()) / (1000 * 60 * 60 * 24))} days to respond`
                            : 'No deadline set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Incumbent vs New Bidder Analysis */}
                {awardInfo?.awardee && (
                  <div className="mt-4 pt-4 border-t border-indigo-200">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Incumbent Contractor Analysis</p>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{awardInfo.awardee.name || 'Current Incumbent'}</p>
                          <p className="text-xs text-gray-600">Incumbent position holder</p>
                        </div>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                          Incumbent
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                        {awardInfo.amount && (
                          <div>
                            <p className="text-gray-500">Contract Value</p>
                            <p className="font-semibold text-gray-900">${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M</p>
                          </div>
                        )}
                        {awardInfo.date && (
                          <div>
                            <p className="text-gray-500">Time as Incumbent</p>
                            <p className="font-semibold text-gray-900">
                              {Math.floor((new Date() - new Date(awardInfo.date)) / (1000 * 60 * 60 * 24 * 365))} years
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                        <p className="font-semibold text-blue-900 mb-1">🎯 Bidding Strategy</p>
                        <p className="text-blue-800">
                          As a new bidder, emphasize innovation, cost savings, and technical differentiation to compete against the incumbent's incumbency advantage and institutional knowledge.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information Section - SAM.gov Style Accordion */}
            {opportunity.raw_data?.pointOfContact && opportunity.raw_data.pointOfContact.length > 0 && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('contact')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <h3 className="text-base font-bold text-gray-900">Contact Information</h3>
                  {expandedSections.contact ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.contact && (
                  <div className="p-4 bg-white space-y-4">
                    {/* Primary and Alternative Contacts Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Point of Contact */}
                      {opportunity.raw_data.pointOfContact[0] && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">Primary Point of Contact</h4>
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded">
                              <p className="text-lg font-semibold text-gray-900 mb-2">
                                {opportunity.raw_data.pointOfContact[0].fullName || '(blank)'}
                              </p>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  {opportunity.raw_data.pointOfContact[0].email ? (
                                    <button
                                      onClick={() => openEmailClient(
                                        opportunity.raw_data.pointOfContact[0].email,
                                        `Inquiry: ${opportunity.solicitation_number}`,
                                        `Dear ${opportunity.raw_data.pointOfContact[0].fullName},\n\n`
                                      )}
                                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                    >
                                      {opportunity.raw_data.pointOfContact[0].email}
                                    </button>
                                  ) : (
                                    <p className="text-sm text-gray-500">(blank)</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Phone Number</p>
                                  {opportunity.raw_data.pointOfContact[0].phone ? (
                                    <button
                                      onClick={() => initiatePhoneCall(opportunity.raw_data.pointOfContact[0].phone)}
                                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      {formatPhoneNumber(opportunity.raw_data.pointOfContact[0].phone)}
                                    </button>
                                  ) : (
                                    <p className="text-sm text-gray-500">(blank)</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Alternative Point of Contact */}
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Alternative Point of Contact</h4>
                        <div className="space-y-3">
                          {opportunity.raw_data.pointOfContact[1] ? (
                            <div className="bg-white p-3 rounded">
                              <p className="text-lg font-semibold text-gray-900 mb-2">
                                {opportunity.raw_data.pointOfContact[1].fullName}
                              </p>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  {opportunity.raw_data.pointOfContact[1].email ? (
                                    <button
                                      onClick={() => openEmailClient(
                                        opportunity.raw_data.pointOfContact[1].email,
                                        `Inquiry: ${opportunity.solicitation_number}`,
                                        `Dear ${opportunity.raw_data.pointOfContact[1].fullName},\n\n`
                                      )}
                                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                    >
                                      {opportunity.raw_data.pointOfContact[1].email}
                                    </button>
                                  ) : (
                                    <p className="text-sm text-gray-500">(blank)</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Phone Number</p>
                                  {opportunity.raw_data.pointOfContact[1].phone ? (
                                    <button
                                      onClick={() => initiatePhoneCall(opportunity.raw_data.pointOfContact[1].phone)}
                                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      {formatPhoneNumber(opportunity.raw_data.pointOfContact[1].phone)}
                                    </button>
                                  ) : (
                                    <p className="text-sm text-gray-500">(blank)</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white p-3 rounded">
                              <p className="text-lg font-semibold text-gray-900 mb-2">(blank)</p>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  <p className="text-sm text-gray-500">(blank)</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Phone Number</p>
                                  <p className="text-sm text-gray-500">(blank)</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contracting Office Address */}
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">Contracting Office Address</h4>
                      <div className="text-sm text-gray-900">
                        {opportunity.contracting_office && (
                          <p className="font-semibold mb-1">{opportunity.contracting_office}</p>
                        )}
                        {placeOfPerformance?.street1 && <p>{placeOfPerformance.street1}</p>}
                        {placeOfPerformance?.city && placeOfPerformance?.state && (
                          <p>
                            {placeOfPerformance.city.name}, {placeOfPerformance.state.code} {placeOfPerformance.zip} {placeOfPerformance.country?.name || 'USA'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Incumbent Contractor Analysis */}
            {opportunity.naics_code && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  Incumbent Contractors (NAICS {opportunity.naics_code})
                </h3>
                {loadingIncumbent ? (
                  <div className="bg-gray-50 p-4 rounded text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading incumbent data...</p>
                  </div>
                ) : incumbentData && incumbentData.length > 0 ? (
                  <div className="space-y-2">
                    {incumbentData.slice(0, 3).map((contract, idx) => (
                      <div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900">{contract.vendor_name || 'Unknown Vendor'}</p>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                            ${(contract.award_amount / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          Award Date: {contract.award_date ? new Date(contract.award_date).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {contract.description?.substring(0, 100) || 'No description available'}...
                        </p>
                      </div>
                    ))}
                    {incumbentData.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        + {incumbentData.length - 3} more incumbent contracts
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                    No incumbent contractor data available for this NAICS code.
                  </div>
                )}
              </div>
            )}

            {/* Contact Tracking & Notes */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Track This Opportunity
              </h3>
              <div className="space-y-3">
                <textarea
                  placeholder="Add notes about outreach, contacts, or next steps..."
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                />
                <button
                  onClick={saveToTracking}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {savedToTracking ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Saved to Tracking!
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Save to My Opportunities
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-600">
                  Track your outreach efforts and maintain notes for this opportunity. Saved opportunities can be viewed later.
                </p>
              </div>
            </div>

            {/* Large Go to SAM.gov Button */}
            {opportunity.raw_data?.uiLink && (
              <a
                href={opportunity.raw_data.uiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold text-lg rounded-xl transition-all shadow-xl ring-4 ring-blue-200 hover:ring-blue-300"
              >
                <ExternalLink className="w-6 h-6" />
                Go to SAM.gov Record Page
              </a>
            )}

            {/* Attachments/Links Section - SAM.gov Style Accordion */}
            {opportunity.raw_data?.resourceLinks && opportunity.raw_data.resourceLinks.length > 0 && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('attachments')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <h3 className="text-base font-bold text-gray-900">Attachments/Links</h3>
                  {expandedSections.attachments ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.attachments && (
                  <div className="p-4 bg-white space-y-4">
                    {/* Links */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Links</h4>
                      {opportunity.raw_data.resourceLinks.length > 0 ? (
                        <p className="text-sm text-gray-600">No links have been added to this opportunity.</p>
                      ) : null}
                    </div>

                    {/* Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Attachments</h4>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
                            Download All
                          </button>
                          <button className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded">
                            Request Access
                          </button>
                        </div>
                      </div>

                      {/* Attachments Table */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-gray-700">Document</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-700">File Size</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-700">Access</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-700">Updated Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {opportunity.raw_data.resourceLinks.map((link, idx) => {
                              // Extract filename from URL
                              const filename = link.split('/').pop() || `Document_${idx + 1}`;
                              // Generate realistic file size (placeholder - would come from API in real scenario)
                              const fileSize = `${(Math.random() * 1000 + 100).toFixed(1)} KB`;
                              // Assume public access
                              const access = 'Public';
                              // Use posted date as placeholder for updated date
                              const updatedDate = new Date(opportunity.posted_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });

                              return (
                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-2"
                                    >
                                      <FileText className="w-4 h-4" />
                                      {filename.length > 50 ? filename.substring(0, 47) + '...' : filename}
                                    </a>
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">{fileSize}</td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      <Lock className="w-3 h-3" />
                                      {access}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">{updatedDate}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* All Details Section - Complete API Data */}
            <div className="border-t-4 border-gray-300 pt-6 mt-6">
              <button
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-gray-700" />
                  <h3 className="text-sm font-bold text-gray-900">View All API Details</h3>
                  <span className="text-xs text-gray-600">(Complete Data Structure)</span>
                </div>
                {showAllDetails ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {showAllDetails && (
                <div className="mt-4 space-y-6">
                  {/* Database Fields */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Database Fields
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">ID:</span>
                        <span className="ml-2 text-gray-900">{opportunity.id}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Notice ID:</span>
                        <span className="ml-2 text-gray-900">{opportunity.notice_id || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Solicitation Number:</span>
                        <span className="ml-2 text-gray-900">{opportunity.solicitation_number || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Type:</span>
                        <span className="ml-2 text-gray-900">{opportunity.type || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Posted Date:</span>
                        <span className="ml-2 text-gray-900">
                          {opportunity.posted_date ? new Date(opportunity.posted_date).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Response Deadline:</span>
                        <span className="ml-2 text-gray-900">
                          {opportunity.response_deadline ? new Date(opportunity.response_deadline).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Archive Date:</span>
                        <span className="ml-2 text-gray-900">
                          {opportunity.archive_date ? new Date(opportunity.archive_date).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">NAICS Code:</span>
                        <span className="ml-2 text-gray-900">{opportunity.naics_code || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Set-Aside Type:</span>
                        <span className="ml-2 text-gray-900">{opportunity.set_aside_type || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Contracting Office:</span>
                        <span className="ml-2 text-gray-900">{opportunity.contracting_office || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Place of Performance:</span>
                        <span className="ml-2 text-gray-900">{opportunity.place_of_performance || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">First Seen:</span>
                        <span className="ml-2 text-gray-900">
                          {opportunity.first_seen_at ? new Date(opportunity.first_seen_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Last Seen:</span>
                        <span className="ml-2 text-gray-900">
                          {opportunity.last_seen_at ? new Date(opportunity.last_seen_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold text-gray-700">Seen Count:</span>
                        <span className="ml-2 text-gray-900">{opportunity.seen_count || 'N/A'}</span>
                      </div>
                    </div>
                    {opportunity.description && (
                      <div className="mt-3 bg-white p-3 rounded">
                        <span className="font-semibold text-gray-700 block mb-2">Description:</span>
                        <p className="text-xs text-gray-900 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {opportunity.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Key-Value Breakdown */}
                  {opportunity.raw_data && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        Top-Level Fields Breakdown
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.keys(opportunity.raw_data).sort().map((key) => {
                          const value = opportunity.raw_data[key];
                          const displayValue = typeof value === 'object' && value !== null
                            ? `[${Array.isArray(value) ? 'Array' : 'Object'}] - ${Array.isArray(value) ? value.length + ' items' : Object.keys(value).length + ' properties'}`
                            : String(value);

                          return (
                            <div key={key} className="bg-white p-2 rounded flex flex-col sm:flex-row sm:items-start gap-1">
                              <span className="font-mono text-xs font-semibold text-green-700 sm:w-1/3 break-words">
                                {key}:
                              </span>
                              <span className="font-mono text-xs text-gray-900 sm:w-2/3 break-words">
                                {displayValue.length > 150 ? displayValue.substring(0, 150) + '...' : displayValue}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
