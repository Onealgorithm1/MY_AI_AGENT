import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Award, Users, BarChart3, PieChart,
  ArrowLeft, Filter, Calendar, Building2, Target, Trophy
} from 'lucide-react';
import * as marketAnalytics from '../services/marketAnalytics';
import * as fpds from '../services/fpds';

const ContractAnalyticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  const [analytics, setAnalytics] = useState({
    contractValues: [],
    setAsideIntel: [],
    agencySpending: null,
    trending: null,
  });

  useEffect(() => {
    loadAnalytics();
  }, [fiscalYear]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [contractRes, setAsideRes, trendingRes] = await Promise.all([
        marketAnalytics.getAllContractAnalytics({ fiscalYear, limit: 10 }),
        marketAnalytics.getAllSetAsideIntelligence({ fiscalYear, limit: 10 }),
        marketAnalytics.getTrending(),
      ]);

      setAnalytics({
        contractValues: contractRes.data.analytics || [],
        setAsideIntel: setAsideRes.data.intelligence || [],
        trending: trendingRes.data.trending || null,
      });

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

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
              { id: 'contract-values', label: 'Contract Values', icon: DollarSign },
              { id: 'set-aside', label: 'Set-Aside Intel', icon: Award },
              { id: 'agencies', label: 'Top Agencies', icon: Building2 },
              { id: 'trending', label: 'Trending', icon: Trophy },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
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
