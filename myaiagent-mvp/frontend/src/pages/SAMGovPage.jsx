import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ChevronUp, X, Calendar, Building2, FileText, DollarSign, Users, Clock, Award, MessageSquare, ArrowLeft, Share2, Sparkles, ExternalLink, CheckCircle, BarChart3, Trophy, Bookmark, Star, Trash2, Save, List, CalendarDays, Mail, Phone, CalendarPlus, Code, Lock } from 'lucide-react';
import api, { samGov } from '../services/api';
import { addToGoogleCalendar, openEmailClient, initiatePhoneCall, formatPhoneNumber } from '../utils/integrations';
import OpportunityDetailModal from '../components/OpportunityDetailModal';
import NotificationsDropdown from '../components/NotificationsDropdown';

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
    dateFrom: '', // Posted From
    dateTo: '',   // Posted To
    responseFrom: '',
    responseTo: '',
    agency: '',
    placeOfPerformance: '', // Zip or State
    sortBy: '-modifiedDate',
  });

  // Facets state
  const [facets, setFacets] = useState({
    naics: [],
    agency: [],
    setAside: [],
    place: []
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
    place: false,
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

  // Department filter state (Legacy, keeping for compatibility but moving to facets)
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserProfile();
    loadFacets(); // Load initial facets
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

  // Load facets for filters
  const loadFacets = async () => {
    try {
      const [naicsRes, agencyRes, placeRes] = await Promise.all([
        samGov.getFacets('naics'),
        samGov.getFacets('agency'),
        samGov.getFacets('place')
      ]);

      setFacets({
        naics: naicsRes.facets || [],
        agency: agencyRes.facets || [],
        place: placeRes.facets || [],
        setAside: [] // Often static, but could fetch if needed
      });
    } catch (error) {
      console.error('Failed to load facets:', error);
    }
  };

  // Load saved searches from Backend
  const loadSavedSearches = async () => {
    try {
      const response = await api.savedSearches.list();
      setSavedSearches(response.data.searches || []);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const loadData = async (isBackgroundRefresh = false, filterOverrides = null) => {
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
        console.log(`ðŸ“¥ Only ${cachedCount} cached opportunities, batch-fetching from SAM.gov...`);
        console.log('âš ï¸  This may take a few minutes due to SAM.gov API rate limits');
        setLoadingBatch(true);
        try {
          await samGov.batchFetchAll({ keyword: '' });
          await samGov.batchFetchAll({ keyword: '' });
          // await loadDepartments(); // Reload departments after batch fetch - Deprecated in favor of facets
        } catch (batchError) {
          const errorMessage = batchError?.response?.data?.error || batchError?.message || 'Unknown error';
          console.error('âŒ Batch fetch failed:', errorMessage);

          // Check for rate limit errors
          if (errorMessage.includes('throttled') || errorMessage.includes('rate') || errorMessage.includes('Message throttled')) {
            console.warn('âš ï¸  SAM.gov API rate limited. Please wait a few minutes and refresh the page to try again.');
          } else {
            console.warn('âš ï¸  Batch fetch failed, using cached data. Error:', errorMessage);
          }
        } finally {
          setLoadingBatch(false);
        }
      }

      const activeFilters = filterOverrides || filters;

      const fullRes = await samGov.getCachedOpportunities({
        limit: 30000, // Fetch plenty for client-side sorting if needed, or rely on server
        offset: 0,
        keyword: activeFilters.keyword,
        type: activeFilters.noticeType,
        status: activeFilters.status === 'all' ? undefined : activeFilters.status,
        // Pass new filters
        naicsCode: activeFilters.naicsCode,
        setAside: activeFilters.setAsideType,
        agency: activeFilters.agency,
        placeOfPerformance: activeFilters.placeOfPerformance,
        postedFrom: activeFilters.dateFrom,
        postedTo: activeFilters.dateTo,
        responseFrom: activeFilters.responseFrom,
        responseTo: activeFilters.responseTo
      });

      setOpportunities(fullRes.opportunities || []);
      setLastRefreshTime(new Date());

      if (isBackgroundRefresh) {
        console.log(`âœ… Auto-refresh: ${fullRes.opportunities?.length || 0} opportunities`);
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

  // Apply extra client-side filtering if needed (though backend handles most now)
  // We keep this lightweight or remove if backend does everything. 
  // Let's keep it minimal for domain/keywordType which might be complex on backend
  const filteredOpps = opportunities.filter(opp => {
    // Domain filter (client side for now as it parses raw_data)
    if (selectedDomain) {
      const oppDomain = opp.raw_data?.fullParentPathName?.split('.')[0] || opp.contracting_office?.split(',')[0] || '';
      if (!oppDomain.toLowerCase().includes(selectedDomain.toLowerCase())) return false;
    }
    return true;
  });

  // Sorting
  const sortedOpps = [...filteredOpps].sort((a, b) => {
    const direction = filters.sortBy.startsWith('-') ? -1 : 1;
    const field = filters.sortBy.replace('-', '');

    switch (field) {
      case 'modifiedDate':
        return direction * (new Date(a.updated_at) - new Date(b.updated_at));
      case 'postedDate':
        return direction * (new Date(a.posted_date) - new Date(b.posted_date));
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
    const defaultFilters = {
      keyword: '',
      keywordType: 'ALL',
      setAsideType: '',
      naicsCode: '',
      noticeType: '',
      status: '', // Show all opportunities by default (active and inactive)
      dateFrom: '', // Posted From
      dateTo: '',   // Posted To
      responseFrom: '',
      responseTo: '',
      agency: '',
      placeOfPerformance: '', // Zip or State
      sortBy: '-modifiedDate',
    };
    setFilters(defaultFilters);
    setSelectedDomain('');
    setCurrentPage(1);
    loadData(false, defaultFilters);
  };

  // Save current search
  const saveCurrentSearch = async () => {
    if (!searchName.trim()) {
      alert('Please enter a name for this search');
      return;
    }

    try {
      const response = await api.savedSearches.create({
        name: searchName.trim(),
        filters: { ...filters, selectedDomain }, // Include active filters
        frequency: 'daily'
      });

      setSavedSearches(prev => [response.data.search, ...prev]);
      setSearchName('');
      setShowSaveSearchDialog(false);
      alert(`Search "${searchName}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save search:', error);
      alert('Failed to save search. Please try again.');
    }
  };

  // Load a saved search
  const loadSavedSearch = (search) => {
    if (search.filters) {
      setFilters(search.filters);
      // Handle flattened or nested structure if needed
      if (search.filters.selectedDomain) setSelectedDomain(search.filters.selectedDomain);
    }
    setCurrentPage(1);
    setIsMobileFilterOpen(false);
    // Trigger load
    loadData(false, search.filters);
  };

  // Delete a saved search
  const deleteSavedSearch = async (id) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      try {
        await api.savedSearches.delete(id);
        setSavedSearches(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('Failed to delete search:', error);
        alert('Failed to delete search.');
      }
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
        content: `Analyze this contract opportunity and provide a structured JSON response (do NOT use markdown formatting).
        
        Opportunity:
        Title: ${opportunity.title}
        Agency: ${opportunity.contracting_office}
        Type: ${opportunity.type}
        Description: ${opportunity.description || ''}
        
        Return exactly this JSON structure:
        {
            "summary": "3 concise sentences focusing on needs, bidders, and deadlines.",
            "incumbent": {
                "name": "Name of incumbent contractor if mentioned, else null",
                "uei": "UEI of incumbent if mentioned, else null"
            }
        }`,
        model: 'gemini-2.5-flash',
        stream: false,
      });

      let content = response.data.content || response.data.response || '{}';
      // Clean up markdown code blocks if present
      content = content.replace(/```json\n?|```/g, '').trim();

      let parsedData;
      try {
        parsedData = JSON.parse(content);
      } catch (e) {
        // Fallback if AI returns plain text
        parsedData = { summary: content, incumbent: null };
      }

      setAiSummaries(prev => ({
        ...prev,
        [opportunity.id]: parsedData,
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

ðŸ“‹ **${opportunity.title}**
ðŸ›ï¸ Agency: ${opportunity.contracting_office}
ðŸ“ Solicitation: ${opportunity.solicitation_number}
ðŸ“… Posted: ${new Date(opportunity.posted_date).toLocaleDateString()}
${opportunity.response_deadline ? `â° Deadline: ${new Date(opportunity.response_deadline).toLocaleDateString()}` : ''}
ðŸ·ï¸ Type: ${opportunity.type}
${opportunity.naics_code ? `ðŸ”¢ NAICS: ${opportunity.naics_code}` : ''}
${opportunity.set_aside_type ? `ðŸŽ¯ Set-Aside: ${opportunity.set_aside_type}` : ''}
${opportunity.raw_data?.uiLink ? `ðŸ”— SAM.gov: ${opportunity.raw_data.uiLink}` : ''}

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

  const getDomains = () => {
    const domains = opportunities.map(opp => {
      const parts = opp.raw_data?.fullParentPathName?.split('.') || [];
      return parts[0] || opp.contracting_office?.split(',')[0] || 'Unknown';
    });
    return [...new Set(domains)].slice(0, 15); // Top 15 domains
  };

  // Pagination Handler
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <button
                onClick={() => navigate('/contract-analytics?tab=awards-search')} // Default link
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-1.5 bg-green-600 hover:bg-green-500 rounded transition-colors touch-manipulation min-h-[44px] md:min-h-0"
              >
                <Search className="w-4 h-4 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium hidden md:inline">Awards Search</span>
              </button>
              <h1 className="text-base md:text-xl font-bold truncate">Contract Opportunities</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
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
              onChange={(e) => setFilters({ ...filters, keywordType: e.target.value })}
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
                  setFilters({ ...filters, keyword: e.target.value });
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
                              {new Date(search.created_at).toLocaleDateString()}
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
                          const newFilters = { ...filters, status };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          loadData(false, newFilters);
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection
                title="Published Date"
                name="dates"
                count={(filters.dateFrom || filters.dateTo) ? 1 : 0}
              >
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">From</label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => {
                          const newFilters = { ...filters, dateFrom: e.target.value };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          loadData(false, newFilters);
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
                          const newFilters = { ...filters, dateTo: e.target.value };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          loadData(false, newFilters);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
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
                    const newFilters = { ...filters, noticeType: e.target.value };
                    setFilters(newFilters);
                    setCurrentPage(1);
                    loadData(false, newFilters);
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
                title="Response Date"
                name="responseDate"
                count={(filters.responseFrom || filters.responseTo) ? 1 : 0}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Offers Due After</label>
                    <input
                      type="date"
                      value={filters.responseFrom}
                      onChange={(e) => {
                        const newFilters = { ...filters, responseFrom: e.target.value };
                        setFilters(newFilters);
                        setCurrentPage(1);
                        loadData(false, newFilters);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Offers Due Before</label>
                    <input
                      type="date"
                      value={filters.responseTo}
                      onChange={(e) => {
                        const newFilters = { ...filters, responseTo: e.target.value };
                        setFilters(newFilters);
                        setCurrentPage(1);
                        loadData(false, newFilters);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                title="Set Aside"
                name="setAside"
                count={filters.setAsideType ? 1 : 0}
              >
                <select
                  value={filters.setAsideType}
                  onChange={(e) => {
                    const newFilters = { ...filters, setAsideType: e.target.value };
                    setFilters(newFilters);
                    setCurrentPage(1);
                    loadData(false, newFilters);
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
                    placeholder="Search Code or Name"
                    value={filters.naicsCode || ''}
                    onChange={(e) => {
                      setFilters({ ...filters, naicsCode: e.target.value });
                      // setCurrentPage(1); // Optional: trigger search on type, or wait for enter/button
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2"
                  />

                  <div className="text-xs text-gray-500 font-medium mb-1">Top Codes</div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {facets.naics.slice(0, 10).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newFilters = { ...filters, naicsCode: item.value };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          loadData(false, newFilters);
                        }}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs ${filters.naicsCode === item.value ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                      >
                        <span className="truncate flex-1" title={item.value}>{item.value}</span>
                        <span className="ml-2 text-gray-500 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{item.count}</span>
                      </button>
                    ))}
                    {facets.naics.length === 0 && (
                      <p className="text-xs text-gray-400 italic px-2">No NAICS data available.</p>
                    )}
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                title="Federal Organizations"
                name="agency"
                count={filters.agency ? 1 : 0}
              >
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter agencies..."
                      value={filters.agency || ''}
                      onChange={(e) => setFilters({ ...filters, agency: e.target.value })}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded mb-2"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {facets.agency.slice(0, 10).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newFilters = { ...filters, agency: item.value === filters.agency ? '' : item.value };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          loadData(false, newFilters);
                        }}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs ${filters.agency === item.value ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                      >
                        <span className="truncate flex-1" title={item.value}>{item.value}</span>
                        <span className="ml-2 text-gray-500 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{item.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                title="Place of Performance"
                name="place"
                count={filters.placeOfPerformance ? 1 : 0}
              >
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="City or State"
                    value={filters.placeOfPerformance || ''}
                    onChange={(e) => setFilters({ ...filters, placeOfPerformance: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <div className="text-xs text-gray-500 font-medium mt-2 mb-1">Top Locations</div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {facets.place.slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newFilters = { ...filters, placeOfPerformance: item.value };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          loadData(false, newFilters);
                        }}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs ${filters.placeOfPerformance === item.value ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                      >
                        <span className="truncate flex-1" title={item.value}>{item.value}</span>
                        <span className="ml-2 text-gray-500 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{item.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
            {/* Department Filter Dropdown */}
            <div className="mb-3 md:mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-600" />
              <label htmlFor="dept-select" className="text-xs md:text-sm font-medium text-gray-700">Filter by Department:</label>
              <select
                id="dept-select"
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setCurrentPage(1);
                  setIsMobileFilterOpen(false);
                }}
                className="px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
              >
                <option value="">All Departments</option>
                {getDomains().map((domain, idx) => (
                  <option key={idx} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 md:mb-4 pb-3 border-b border-gray-200">
              <div>
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                  Showing {startIdx + 1} - {Math.min(endIdx, totalResults)} of {totalResults} results
                </h2>
                {lastRefreshTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {lastRefreshTime.toLocaleTimeString()} <span className="hidden sm:inline">&bull; Auto-refresh daily</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border border-gray-300 rounded overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 md:px-3 py-2 md:py-1.5 flex items-center gap-1 text-xs md:text-sm transition-colors ${viewMode === 'list'
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
                    className={`px-2 md:px-3 py-2 md:py-1.5 flex items-center gap-1 text-xs md:text-sm transition-colors ${viewMode === 'calendar'
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
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="px-2 md:px-3 py-2 md:py-1.5 border border-gray-300 rounded text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation w-full sm:w-auto"
                    >
                      <option value="-modifiedDate">Updated Date (Newest)</option>
                      <option value="modifiedDate">Updated Date (Oldest)</option>
                      <option value="-postedDate">Published Date (Newest)</option>
                      <option value="postedDate">Published Date (Oldest)</option>
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
                          {/* AI Summary Section */}
                          {aiSummaries[opp.id] && (
                            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-purple-900 mb-1">AI Summary</p>
                                  <p className="text-sm text-purple-800">
                                    {typeof aiSummaries[opp.id] === 'string' ? aiSummaries[opp.id] : (aiSummaries[opp.id]?.summary || 'Summary not available')}
                                  </p>

                                  {/* Competitor Link from AI Analysis */}
                                  {aiSummaries[opp.id]?.incumbent?.name && (
                                    <div className="mt-2 text-xs border-t border-purple-200 pt-2">
                                      <span className="text-purple-700 font-medium">Potential Incumbent: </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const inc = aiSummaries[opp.id].incumbent;
                                          if (inc.uei) {
                                            navigate(`/vendor/${inc.uei}`);
                                          } else {
                                            // Search by name if no UEI
                                            navigate(`/contract-analytics?q=${encodeURIComponent(inc.name)}&tab=awards-search`);
                                          }
                                        }}
                                        className="text-purple-700 underline hover:text-purple-900 font-medium ml-1"
                                      >
                                        {aiSummaries[opp.id].incumbent.name}
                                      </button>
                                    </div>
                                  )}
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
                                const params = new URLSearchParams();
                                if (opp.naics_code) params.set('naics', opp.naics_code);
                                if (opp.contracting_office) params.set('agency', opp.contracting_office);
                                if (opp.title) params.set('q', opp.title);
                                navigate(`/contract-analytics?${params.toString()}`);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors touch-manipulation min-h-[44px] md:min-h-0"
                            >
                              <Trophy className="w-3 h-3" />
                              <span>Research Awards</span>
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
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        &larr; Previous
                      </button>
                      <div className="hidden md:flex">
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Next &rarr;
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
      {
        showSaveSearchDialog && (
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
                  {filters.keyword && <li>â€¢ Keyword: {filters.keyword}</li>}
                  {filters.naicsCode && <li>â€¢ NAICS: {filters.naicsCode}</li>}
                  {filters.agency && <li>â€¢ Agency: {filters.agency}</li>}
                  {filters.setAsideType && <li>â€¢ Set-Aside: {filters.setAsideType}</li>}
                  {filters.noticeType && <li>â€¢ Notice Type: {filters.noticeType}</li>}
                  {selectedDomain && <li>â€¢ Department: {selectedDomain}</li>}
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
        )
      }

      {/* Opportunity Detail Modal - keep existing implementation */}
      {
        selectedOpportunity && (
          <OpportunityDetailModal
            opportunity={selectedOpportunity}
            onClose={() => setSelectedOpportunity(null)}
            formatContractValue={formatContractValue}
          />
        )
      }
    </div >
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
              â† Previous
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
              Next â†’
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
                className={`aspect-square border rounded-lg p-1 md:p-2 transition-all ${isToday(day)
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

export default SAMGovPage;
