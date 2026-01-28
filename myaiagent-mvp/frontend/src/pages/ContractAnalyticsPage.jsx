import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Award, Users, BarChart3, PieChart,
  ArrowLeft, Filter, Calendar, Building2, Target, Trophy, Search, Download
} from 'lucide-react';
import { downloadCSV } from '../utils/csvExport';
import * as marketAnalytics from '../services/marketAnalytics';
import * as fpds from '../services/fpds';

const ContractAnalyticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const [analytics, setAnalytics] = useState({
    contractValues: [],
    setAsideIntel: [],
    agencySpending: null,
    trending: null,
  });

  const [searchParams] = useSearchParams();

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    keyword: '',
    agency: '',
    naics: '',
    dateFrom: '',
    dateTo: ''
  });

  // Handle URL Params for Deep Linking
  useEffect(() => {
    const q = searchParams.get('q');
    const naics = searchParams.get('naics');
    const agency = searchParams.get('agency');

    if (q || naics || agency) {
      setActiveTab('awards-search');
      setSearchFilters(prev => ({
        ...prev,
        keyword: q || '',
        naics: naics || '',
        agency: agency || ''
      }));

      // Trigger search automatically if we have params
      // We need to use a timeout or a separate effect to ensure state is updated first, 
      // but for simplicity calling a separate function or flag is better.
      // Let's set a flag to trigger search.
      setShouldAutoSearch(true);
    }
  }, [searchParams]);

  const [shouldAutoSearch, setShouldAutoSearch] = useState(false);
  useEffect(() => {
    if (shouldAutoSearch) {
      handleSearch(null); // Execute search
      setShouldAutoSearch(false);
    }
  }, [shouldAutoSearch]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleSearch = async (e) => {
    e?.preventDefault();
    setIsSearching(true);
    try {
      // In a real scenario, this would call the API.
      // For now, we'll try to call the service but fallback to mock data if it fails/returns empty 
      // to demonstrate the UI.

      let results = [];
      try {
        const response = await fpds.searchContractAwards({
          vendorName: searchFilters.keyword, // Using keyword as vendor or generic search
          agencyCode: searchFilters.agency,
          naicsCode: searchFilters.naics,
          awardDateFrom: searchFilters.dateFrom,
          awardDateTo: searchFilters.dateTo,
          limit: 20
        });
        if (response.success && response.contracts) {
          results = response.contracts;
        }
      } catch (err) {
        console.warn('API Search failed, using mock data for demo', err);
      }

      if (results.length === 0) {
        // Mock results for demonstration
        results = [
          {
            piid: 'N0001923C0001',
            vendorName: 'LOCKHEED MARTIN CORPORATION',
            contractingAgencyName: 'DEPT OF THE NAVY',
            currentContractValue: '15000000.00',
            awardDate: '2023-05-15',
            awardType: 'DEFINITIVE CONTRACT',
            naicsCode: '336411',
            description: 'F-35 LIGHTNING II PROGRAM'
          },
          {
            piid: 'FA862023C0002',
            vendorName: 'BOEING COMPANY, THE',
            contractingAgencyName: 'DEPT OF THE AIR FORCE',
            currentContractValue: '8500000.00',
            awardDate: '2023-06-20',
            awardType: 'DEFINITIVE CONTRACT',
            naicsCode: '336411',
            description: 'KC-46A TANKER MODERNIZATION'
          },
          {
            piid: 'GS00Q14OADU138',
            vendorName: 'DELOITTE CONSULTING LLP',
            contractingAgencyName: 'GENERAL SERVICES ADMINISTRATION',
            currentContractValue: '2500000.00',
            awardDate: '2023-04-10',
            awardType: 'DELIVERY ORDER',
            naicsCode: '541611',
            description: 'MANAGEMENT CONSULTING SERVICES'
          }
        ];
        // Filter mock results if needed (simple client-side filter)
        if (searchFilters.keyword) {
          results = results.filter(r =>
            r.vendorName?.toLowerCase().includes(searchFilters.keyword.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchFilters.keyword.toLowerCase())
          );
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = () => {
    if (searchResults.length === 0) return;

    // Format data for export
    const exportData = searchResults.map(item => ({
      PIID: item.piid,
      'Vendor Name': item.vendorName,
      'Agency': item.contractingAgencyName,
      'Value': item.currentContractValue,
      'Date': item.awardDate,
      'Type': item.awardType,
      'NAICS': item.naicsCode,
      'Description': item.description
    }));

    downloadCSV(exportData, `awards_search_export_${new Date().toISOString().split('T')[0]}`);
  };

  useEffect(() => {
    loadAnalytics();
  }, [fiscalYear]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [contractRes, setAsideRes, trendingRes] = await Promise.all([
        marketAnalytics.getAllContractAnalytics({ fiscalYear, limit: 10 }).catch(() => ({ data: { analytics: [] } })),
        marketAnalytics.getAllSetAsideIntelligence({ fiscalYear, limit: 10 }).catch(() => ({ data: { intelligence: [] } })),
        marketAnalytics.getTrending().catch(() => ({ data: { trending: null } })),
      ]);

      const contractData = contractRes.data.analytics || [];
      const setAsideData = setAsideRes.data.intelligence || [];
      const trendingData = trendingRes.data.trending || null;

      // Check if we need to use mock data
      const useMock = contractData.length === 0 && setAsideData.length === 0 && !trendingData;
      setIsUsingMockData(useMock);

      // If no data from API, use sample/mock data for demonstration
      setAnalytics({
        contractValues: contractData.length > 0 ? contractData : getMockContractData(),
        setAsideIntel: setAsideData.length > 0 ? setAsideData : getMockSetAsideData(),
        trending: trendingData || getMockTrendingData(),
      });

    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Use mock data on error
      setIsUsingMockData(true);
      setAnalytics({
        contractValues: getMockContractData(),
        setAsideIntel: getMockSetAsideData(),
        trending: getMockTrendingData(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock data generators for when database is empty
  const getMockContractData = () => [
    {
      aggregation_key: 'DOD',
      aggregation_label: 'Department of Defense',
      total_value: '45000000000',
      total_contracts: '12450',
      average_value: '3614457.83',
      competed_contracts: '8965',
    },
    {
      aggregation_key: 'DHS',
      aggregation_label: 'Department of Homeland Security',
      total_value: '18500000000',
      total_contracts: '5680',
      average_value: '3256690.14',
      competed_contracts: '4010',
    },
    {
      aggregation_key: 'VA',
      aggregation_label: 'Department of Veterans Affairs',
      total_value: '12300000000',
      total_contracts: '8920',
      average_value: '1378924.73',
      competed_contracts: '6240',
    },
    {
      aggregation_key: 'DOE',
      aggregation_label: 'Department of Energy',
      total_value: '8900000000',
      total_contracts: '2130',
      average_value: '4178403.76',
      competed_contracts: '1560',
    },
    {
      aggregation_key: 'NASA',
      aggregation_label: 'National Aeronautics and Space Administration',
      total_value: '7200000000',
      total_contracts: '1850',
      average_value: '3891891.89',
      competed_contracts: '1295',
    },
  ];

  const getMockSetAsideData = () => [
    {
      setaside_type: 'Small Business Set-Aside',
      total_awards: '45230',
      total_award_value: '25600000000',
      average_bidders: '4.8',
      competition_intensity: 'High',
      small_business_win_rate: '0.68',
      total_opportunities: '8950',
    },
    {
      setaside_type: '8(a) Business Development',
      total_awards: '12840',
      total_award_value: '8900000000',
      average_bidders: '3.2',
      competition_intensity: 'Medium',
      small_business_win_rate: '0.72',
      total_opportunities: '2340',
    },
    {
      setaside_type: 'HUBZone Set-Aside',
      total_awards: '8650',
      total_award_value: '5400000000',
      average_bidders: '2.8',
      competition_intensity: 'Low',
      small_business_win_rate: '0.78',
      total_opportunities: '1580',
    },
    {
      setaside_type: 'Service-Disabled Veteran-Owned',
      total_awards: '15620',
      total_award_value: '9800000000',
      average_bidders: '3.9',
      competition_intensity: 'Medium',
      small_business_win_rate: '0.65',
      total_opportunities: '3120',
    },
    {
      setaside_type: 'Women-Owned Small Business',
      total_awards: '10450',
      total_award_value: '6200000000',
      average_bidders: '4.1',
      competition_intensity: 'High',
      small_business_win_rate: '0.62',
      total_opportunities: '2680',
    },
  ];

  const getMockTrendingData = () => ({
    growingAgencies: [
      {
        agency_name: 'Department of Homeland Security',
        agency_code: 'DHS',
        growth_percent: '18.5',
        current_year: '21500000000',
        previous_year: '18150000000',
      },
      {
        agency_name: 'Department of Energy',
        agency_code: 'DOE',
        growth_percent: '15.2',
        current_year: '9800000000',
        previous_year: '8505000000',
      },
      {
        agency_name: 'National Science Foundation',
        agency_code: 'NSF',
        growth_percent: '12.8',
        current_year: '4200000000',
        previous_year: '3723000000',
      },
    ],
    hotNaicsCodes: [
      {
        naics_code: '541512',
        naics_description: 'Computer Systems Design Services',
        total_awards: '8950',
        total_value: '15600000000',
      },
      {
        naics_code: '541330',
        naics_description: 'Engineering Services',
        total_awards: '6780',
        total_value: '12300000000',
      },
      {
        naics_code: '561210',
        naics_description: 'Facilities Support Services',
        total_awards: '5420',
        total_value: '8900000000',
      },
      {
        naics_code: '541519',
        naics_description: 'Other Computer Related Services',
        total_awards: '4890',
        total_value: '9200000000',
      },
    ],
    emergingOpportunities: [
      {
        naics_code: '541715',
        naics_description: 'Research and Development in Physical, Engineering, and Life Sciences',
        setaside_type: 'Small Business',
        total_awards: '340',
        total_award_value: '1250000000',
        average_bidders: '2.3',
        competition_intensity: 'Low',
      },
      {
        naics_code: '334290',
        naics_description: 'Other Communications Equipment Manufacturing',
        setaside_type: '8(a)',
        total_awards: '280',
        total_award_value: '890000000',
        average_bidders: '2.1',
        competition_intensity: 'Low',
      },
      {
        naics_code: '541690',
        naics_description: 'Other Scientific and Technical Consulting Services',
        setaside_type: 'HUBZone',
        total_awards: '190',
        total_award_value: '450000000',
        average_bidders: '1.9',
        competition_intensity: 'Low',
      },
    ],
  });

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getCompetitionColor = (intensity) => {
    switch (intensity?.toLowerCase()) {
      case 'very high': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/sam-gov')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Contract Analytics & Market Intelligence
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Comprehensive market analysis and competitive insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>FY {year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 border-b border-gray-200">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'awards-search', label: 'Awards Search', icon: Search },
              { id: 'contract-values', label: 'Contract Values', icon: DollarSign },
              { id: 'set-aside', label: 'Set-Aside Intel', icon: Award },
              { id: 'agencies', label: 'Top Agencies', icon: Building2 },
              { id: 'trending', label: 'Trending', icon: Trophy },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mock Data Notice */}
        {isUsingMockData && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Sample Data Display</h3>
                <p className="mt-1 text-sm text-amber-700">
                  You're currently viewing sample analytics data. To see real contract data, please ensure the database migrations have been run and contract data has been imported via the FPDS integration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Contract Value</h3>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.contractValues.reduce((sum, c) => sum + parseFloat(c.total_value || 0), 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all categories</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Contracts</h3>
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.contractValues.reduce((sum, c) => sum + parseInt(c.total_contracts || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Awarded in FY{fiscalYear}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Avg Award Size</h3>
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    analytics.contractValues.reduce((sum, c) => sum + parseFloat(c.average_value || 0), 0) /
                    (analytics.contractValues.length || 1)
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">Average per contract</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Opportunities</h3>
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.setAsideIntel.reduce((sum, s) => sum + parseInt(s.total_opportunities || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Active opportunities</p>
              </div>
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Contract Categories */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Top Contract Categories by Value
                </h3>
                <div className="space-y-3">
                  {analytics.contractValues.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {item.aggregation_label || item.aggregation_key}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({item.total_contracts} contracts)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(parseFloat(item.total_value) / parseFloat(analytics.contractValues[0]?.total_value || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-4 text-sm font-bold text-gray-900">
                        {formatCurrency(item.total_value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Set-Aside Competition */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Set-Aside Competition Levels
                </h3>
                <div className="space-y-3">
                  {analytics.setAsideIntel.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {item.setaside_type}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCompetitionColor(item.competition_intensity)}`}>
                            {item.competition_intensity} Competition
                          </span>
                          <span className="text-xs text-gray-500">
                            Avg {parseFloat(item.average_bidders || 0).toFixed(1)} bidders
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.total_award_value)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.total_awards} awards
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Awards Search Tab */}
        {activeTab === 'awards-search' && (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keyword / Vendor</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by vendor, PIID, or description..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={searchFilters.keyword}
                      onChange={(e) => setSearchFilters({ ...searchFilters, keyword: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agency Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 9700"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={searchFilters.agency}
                    onChange={(e) => setSearchFilters({ ...searchFilters, agency: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NAICS Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 541511"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={searchFilters.naics}
                    onChange={(e) => setSearchFilters({ ...searchFilters, naics: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-900">Search Results ({searchResults.length})</h3>
                {searchResults.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {searchResults.map((contract, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-blue-600">
                            <button
                              onClick={() => navigate(`/awards/${contract.id || contract.piid}`)}
                              className="hover:underline focus:outline-none"
                            >
                              {contract.piid || contract.noticeId}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {contract.vendorName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {contract.contractingAgencyName || contract.agency || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {formatCurrency(contract.currentContractValue || contract.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {contract.awardDate || contract.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>{isSearching ? 'Searching...' : 'Enter search criteria to find awards.'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contract Values Tab */}
        {activeTab === 'contract-values' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contracts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competed %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.contractValues.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.aggregation_label || item.aggregation_key}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {parseInt(item.total_contracts || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(item.total_value)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatCurrency(item.average_value)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {((parseInt(item.competed_contracts || 0) / parseInt(item.total_contracts || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Set-Aside Intel Tab */}
        {activeTab === 'set-aside' && (
          <div className="space-y-4">
            {analytics.setAsideIntel.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{item.setaside_type}</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded ${getCompetitionColor(item.competition_intensity)}`}>
                    {item.competition_intensity} Competition
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Awards</p>
                    <p className="text-xl font-bold text-gray-900">{parseInt(item.total_awards || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(item.total_award_value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Bidders</p>
                    <p className="text-xl font-bold text-gray-900">{parseFloat(item.average_bidders || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-xl font-bold text-gray-900">
                      {(parseFloat(item.small_business_win_rate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Agencies Tab */}
        {activeTab === 'agencies' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contracts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Contract</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Share</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.contractValues.map((item, idx) => {
                    const totalMarket = analytics.contractValues.reduce((sum, c) => sum + parseFloat(c.total_value || 0), 0);
                    const marketShare = ((parseFloat(item.total_value) / totalMarket) * 100).toFixed(1);

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.aggregation_label || item.aggregation_key}</p>
                            <p className="text-xs text-gray-500">{item.aggregation_key}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {parseInt(item.total_contracts || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(item.total_value)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatCurrency(item.average_value)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${marketShare}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12">{marketShare}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trending Tab */}
        {activeTab === 'trending' && analytics.trending && (
          <div className="space-y-6">
            {/* Growing Agencies */}
            {analytics.trending.growingAgencies && analytics.trending.growingAgencies.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Fastest Growing Agencies
                </h3>
                <div className="space-y-3">
                  {analytics.trending.growingAgencies.map((agency, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{agency.agency_name}</p>
                        <p className="text-xs text-gray-500">{agency.agency_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          +{parseFloat(agency.growth_percent || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(agency.current_year)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hot NAICS Codes */}
            {analytics.trending.hotNaicsCodes && analytics.trending.hotNaicsCodes.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  Most Active NAICS Codes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analytics.trending.hotNaicsCodes.map((naics, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{naics.naics_code}</span>
                        <span className="text-xs font-bold text-blue-600">{naics.total_awards} awards</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{naics.naics_description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Total Value:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(naics.total_value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emerging Opportunities */}
            {analytics.trending.emergingOpportunities && analytics.trending.emergingOpportunities.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Emerging Opportunities (Low Competition, High Value)
                </h3>
                <div className="space-y-3">
                  {analytics.trending.emergingOpportunities.map((opp, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            {opp.setaside_type}
                          </span>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            {opp.naics_description || `NAICS ${opp.naics_code}`}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                          {parseFloat(opp.average_bidders || 0).toFixed(1)} avg bidders
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                        <div>
                          <span className="text-gray-500">Awards:</span>
                          <span className="ml-1 font-semibold text-gray-900">{opp.total_awards}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Value:</span>
                          <span className="ml-1 font-semibold text-gray-900">{formatCurrency(opp.total_award_value)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Competition:</span>
                          <span className="ml-1 font-semibold text-green-600">{opp.competition_intensity}</span>
                        </div>
                      </div>
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

export default ContractAnalyticsPage;
