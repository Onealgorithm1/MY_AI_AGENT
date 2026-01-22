import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Globe,
  Award,
  CheckCircle,
  Target,
  TrendingUp,
  Lightbulb,
  Shield,
  Code,
  Database,
  Cloud,
  Cpu,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Star,
  Briefcase,
  FileCheck,
  Zap,
  History,
  Download
} from 'lucide-react';
import api from '../services/api';
import { downloadCSV } from '../utils/csvExport';

import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const CompanyProfilePage = () => {
  const { user, currentOrganization } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [matchedOpportunities, setMatchedOpportunities] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 5
  });
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Past Performance State
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pastPerformance, setPastPerformance] = useState({
    contracts: [],
    totalValue: 0,
    totalCount: 0
  });

  // Competitor Analysis Mode
  const { uei: routeUei } = useParams();
  const isCompetitorView = !!routeUei;
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    naicsCodes: '',
    keywords: '',
    certifications: {
      smallBusiness: false,
      veteran: false,
      womanOwned: false,
      '8a': false,
      hubzone: false,
      sdvosb: false
    }
  });

  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.org_role === 'admin' || user?.org_role === 'owner';
  // Removed legacy useEffect calling fetchCompanyProfile


  useEffect(() => {
    if (isCompetitorView) {
      loadCompetitorProfile(routeUei);
    } else {
      loadCompanyProfile();
    }
  }, [routeUei, currentOrganization?.id]);

  const loadCompetitorProfile = async (uei) => {
    try {
      setLoading(true);
      setLoadingProfile(true);

      // Use our new Entity Service Endpoint
      const response = await api.get(`/fpds/entity/${uei}`);

      if (response.data.success) {
        const ent = response.data.profile;
        setProfile({
          company_name: ent.name,
          uei: ent.uei,
          cage_code: ent.cage,
          business_types: ent.businessTypes,
          naicsCodes: [], // Entity service might not return this yet, or we need to extract
          psc_codes: [],
          contact_email: 'N/A', // Public data usually doesn't have direct contact email easily
          website: '',
          description: ent.description || 'Public competitor profile sourced from award history.'
        });

        // Also fetch their past performance immediately
        fetchPastPerformance(uei);
      }
    } catch (error) {
      console.error('Failed to load competitor profile:', error);
      toast.error('Failed to load vendor profile');
    } finally {
      setLoading(false);
      setLoadingProfile(false);
    }
  };

  // Effect to update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || profile.company_name || '',
        website: profile.website || profile.website_url || '',
        naicsCodes: (profile.naicsCodes || profile.naics_codes || []).join(', '),
        keywords: (profile.keywords || []).join(', '),
        certifications: {
          smallBusiness: profile.certifications?.smallBusiness || false,
          veteran: profile.certifications?.veteran || false,
          womanOwned: profile.certifications?.womanOwned || false,
          '8a': profile.certifications?.['8a'] || false,
          hubzone: profile.certifications?.hubzone || false,
          sdvosb: profile.certifications?.sdvosb || false
        }
      });
    }
  }, [profile]);


  const fetchMatchedOpportunities = async (page) => {
    try {
      setLoadingMatches(true);
      const res = await api.get(`/company/matched-opportunities?page=${page}&limit=${pagination.limit}`);
      if (res.data.success) {
        setMatchedOpportunities(res.data.matches || []);
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalPages: res.data.pagination?.totalPages || 1,
          totalItems: res.data.pagination?.totalItems || 0
        }));
      }
    } catch (err) {
      console.error("Failed to fetch matches", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, eligibilityRes] = await Promise.all([
        api.get('/company/profile'),
        api.get('/company/eligibility-analysis'),
      ]);

      setProfile(profileRes.data.profile);
      setEligibility(eligibilityRes.data);
      setRecommendations(eligibilityRes.data.recommendations || []);

      // Initial fetch for opportunities
      fetchMatchedOpportunities(1);

      // Fetch Past Performance if UEI is available
      if (profileRes.data.profile?.uei || profileRes.data.profile?.vendor_uei) {
        fetchPastPerformance(profileRes.data.profile.uei || profileRes.data.profile.vendor_uei);
      }
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updateData = {
        name: formData.name,
        website: formData.website,
        naicsCodes: formData.naicsCodes.split(',').map(s => s.trim()).filter(Boolean),
        keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean),
        certifications: formData.certifications,
        // Preserve existing capabilities if not edited
        capabilities: profile?.capabilities || {},
      };

      const response = await api.put('/company/profile', updateData);
      if (response.data.success) {
        setProfile(response.data.profile);
        setIsEditing(false);
        toast.success('Company profile updated');
        // Refresh analysis potentially?
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ... runAIAnalysis ...
  const runAIAnalysis = async () => {
    try {
      setAnalyzing(true);
      const response = await api.post('/company/ai-eligibility-analysis');

      // Handle the response structure from the API
      if (response.data.success) {
        const analysis = response.data.analysis;
        setRecommendations(analysis.priorityActions || response.data.recommendations || []);

        // Update eligibility with the new analysis data
        setEligibility({
          ...response.data.readiness,
          score: response.data.readiness?.percentage || eligibility?.score,
          level: response.data.readiness?.level || eligibility?.level,
          recommendation: response.data.readiness?.recommendation || eligibility?.recommendation
        });
        toast.success('AI Analysis complete');
      }
    } catch (error) {
      console.error('AI analysis failed:', error);

      // Provide more informative error messages
      let errorMessage = 'Failed to run AI analysis. Please try again.';

      if (error.response?.status === 500) {
        const errorData = error.response?.data;
        if (errorData?.error) {
          errorMessage = `AI Analysis Error: ${errorData.error}`;
        } else {
          errorMessage = 'Server error while running AI analysis. Please check that the API server is properly configured.';
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      toast.error(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchPastPerformance = async (uei) => {
    try {
      setLoadingHistory(true);
      // Construct API call
      // const response = await api.get(`/fpds/vendor/${uei}/contracts?limit=10`);

      // Mocking for now as we might not have real UEI or API key in this env
      // In production: setPastPerformance({ contracts: response.data.contracts, ... })

      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock Data
      const mockContracts = [
        {
          piid: 'N0001921C0001',
          agency: 'Department of the Navy',
          date: '2021-03-15',
          value: 4500000.00,
          type: 'Definitive Contract',
          description: 'Engineering Services for Naval Systems'
        },
        {
          piid: 'FA862022C0005',
          agency: 'Department of the Air Force',
          date: '2022-06-20',
          value: 2100000.00,
          type: 'Delivery Order',
          description: 'Software Maintenance Support'
        },
        {
          piid: 'W9127S23P0012',
          agency: 'Department of the Army',
          date: '2023-01-10',
          value: 850000.00,
          type: 'Purchase Order',
          description: 'Cybersecurity Training'
        }
      ];

      setPastPerformance({
        contracts: mockContracts,
        totalValue: mockContracts.reduce((sum, c) => sum + c.value, 0),
        totalCount: mockContracts.length
      });

    } catch (error) {
      console.error('Failed to fetch past performance:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExportHistory = () => {
    if (pastPerformance.contracts.length === 0) return;

    const exportData = pastPerformance.contracts.map(c => ({
      PIID: c.piid,
      Agency: c.agency,
      Date: c.date,
      Value: c.value,
      Type: c.type,
      Description: c.description
    }));

    downloadCSV(exportData, `past_performance_${new Date().toISOString().split('T')[0]}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading company profile...</p>
        </div>
      </div>
    );
  }

  const capabilityIcons = {
    'AI/ML Development': Cpu,
    'Software Development': Code,
    'Cloud Solutions': Cloud,
    'Data Analytics': Database,
    'Cybersecurity': Shield,
    'Mobile Development': Cpu,
    'DevOps': Cloud,
    'Blockchain': Database,
    'IoT Solutions': Cpu,
    'Automation': Zap
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4 w-full">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex-1">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isCompetitorView ? 'Competitor Analysis' : 'Company Profile'}
                  </h1>
                  <p className="mt-1 text-sm text-gray-100">
                    {isCompetitorView
                      ? 'View public information and award history for this vendor.'
                      : 'Manage your company information and capability statement.'
                    }
                  </p>
                </div>

                {isEditing ? (
                  <div className="space-y-2 max-w-md mt-4">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 rounded-lg border-0 focus:ring-2 focus:ring-blue-300"
                      placeholder="Company Name"
                    />
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-100" />
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-900 rounded-lg border-0 focus:ring-2 focus:ring-blue-300"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold">{profile?.name || profile?.company_name || 'OneAlgorithm'}</h1>
                    <a
                      href={profile?.website || profile?.website_url || 'https://onealgorithm.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-100 hover:text-white mt-1"
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      {profile?.website || profile?.website_url || 'onealgorithm.com'}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </>
                )}

                {profile?.certifications?.smallBusiness && (
                  <span className="inline-flex items-center px-3 py-1 mt-2 bg-green-500 text-white text-sm rounded-full">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Small Business Certified
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Edit Profile
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              {!isEditing && (
                <button
                  onClick={runAIAnalysis}
                  disabled={analyzing}
                  className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run AI Analysis
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Company Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Capabilities */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Code className="w-5 h-5 mr-2 text-blue-600" />
                Core Capabilities & Keywords
              </h2>
              {isEditing ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Enter keywords/capabilities separated by commas</p>
                  <textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="w-full px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600"
                    rows={3}
                    placeholder="e.g. Web Development, AI Consulting, Cybersecurity"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Prefer keywords, otherwise fall back to core_capabilities or default list */}
                  {((profile?.keywords && profile.keywords.length > 0 ? profile.keywords : (profile?.core_capabilities || [
                    'AI/ML Development',
                    'Software Development',
                    'Cloud Solutions',
                    'Data Analytics',
                    'Cybersecurity',
                    'Mobile Development',
                    'DevOps & Automation',
                    'Blockchain Solutions',
                    'IoT Solutions',
                    'Business Intelligence'
                  ]))).map((capability, index) => {
                    const IconComponent = capabilityIcons[capability] || Zap;
                    return (
                      <div
                        key={index}
                        className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <IconComponent className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {capability}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NAICS Codes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileCheck className="w-5 h-5 mr-2 text-purple-600" />
                NAICS Codes
              </h2>
              {isEditing ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Enter NAICS codes separated by commas</p>
                  <textarea
                    value={formData.naicsCodes}
                    onChange={(e) => setFormData({ ...formData, naicsCodes: e.target.value })}
                    className="w-full px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600"
                    rows={3}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(profile?.naicsCodes || profile?.naics_codes || ['541511', '541512', '541513', '541519', '518210', '541330']).map((code, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700"
                      >
                        <span className="font-mono text-sm font-bold text-purple-900 dark:text-purple-300">
                          {code}
                        </span>
                        <Briefcase className="w-4 h-4 text-purple-600" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Primary: Custom Computer Programming (541511) | Software Development (541512)
                  </p>
                </>
              )}
            </div>

            {/* Certifications */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-600" />
                Certifications & Set-Asides
              </h2>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(formData.certifications).map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.certifications[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          certifications: {
                            ...formData.certifications,
                            [key]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(profile?.certifications || {}).filter(([_, v]) => v).map(([key]) => (
                    <div
                      key={key}
                      className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700"
                    >
                      <Award className="w-5 h-5 text-yellow-600 mr-3" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                  {!Object.values(profile?.certifications || {}).some(v => v) && (
                    <p className="text-sm text-gray-500 italic">No certifications listed</p>
                  )}
                </div>
              )}
            </div>

            {Array.isArray(profile?.set_aside_types) && profile.set_aside_types.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Eligible Set-Aside Programs:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.set_aside_types.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-medium rounded-full"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 shadow-sm border-2 border-purple-200 dark:border-purple-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-purple-600" />
                AI-Powered Recommendations
              </h2>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700"
                  >
                    <div className={`p-2 rounded-lg mr-3 ${rec.priority === 'High' ? 'bg-red-100 text-red-600' :
                      rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {rec.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${rec.priority === 'High' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {rec.description}
                      </p>
                      {rec.impact && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                          <Target className="w-3 h-3 mr-1" />
                          Impact: {rec.impact}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Eligibility & Opportunities */}
        <div className="space-y-6">
          {/* Eligibility Score */}
          {eligibility && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                Eligibility Score
              </h2>
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - (eligibility.score || 75) / 100)}`}
                      className="text-blue-600 transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {eligibility.score || 75}%
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {eligibility.eligible_count || 0} Recommended Opportunities
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {eligibility.potential_count || 0} Potential Matches
                </p>
              </div>
            </div>
          )}

          {/* Top Matched Opportunities */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-600" />
              Top Matched Opportunities
            </h2>
            {matchedOpportunities && matchedOpportunities.length > 0 ? (
              <>
                <div className="space-y-3">
                  {matchedOpportunities.slice(0, 5).map((match, index) => {
                    // Handle different possible property names from API
                    const title = match.opportunity_title || match.title || match.raw_data?.title || 'Untitled Opportunity';
                    const matchScore = match.matchScore?.total || match.match_score || 0;

                    return (
                      <div
                        key={match.id || index}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {title}
                          </h3>
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-medium rounded flex-shrink-0">
                            {matchScore}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          {(match.matchScore?.naics || match.naics_match) > 0 && (
                            <span className="flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                              NAICS
                            </span>
                          )}
                          {(match.matchScore?.setAside || match.set_aside_match) > 0 && (
                            <span className="flex items-center">
                              <Shield className="w-3 h-3 mr-1 text-blue-600" />
                              Set-Aside
                            </span>
                          )}
                          {(match.matchScore?.keywords || match.capability_match) > 0 && (
                            <span className="flex items-center">
                              <Cpu className="w-3 h-3 mr-1 text-purple-600" />
                              Skills
                            </span>
                          )}
                        </div>
                        {match.naics_code && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            NAICS: {match.naics_code}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>


                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <button
                      disabled={pagination.currentPage === 1 || loadingMatches}
                      onClick={() => fetchMatchedOpportunities(pagination.currentPage - 1)}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                    <button
                      disabled={pagination.currentPage === pagination.totalPages || loadingMatches}
                      onClick={() => fetchMatchedOpportunities(pagination.currentPage + 1)}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No matched opportunities found.</p>
                <p className="text-sm mt-1">Run AI Analysis to find opportunities matching your capabilities.</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Capabilities</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {profile?.core_capabilities?.length || 10}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">NAICS Codes</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {profile?.naics_codes?.length || 6}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Certifications</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {profile?.certifications?.length || 5}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Matches</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {matchedOpportunities.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Past Performance Section (Full Width) */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <History className="w-6 h-6 mr-2 text-blue-600" />
              Past Performance & Awards
            </h2>
            {pastPerformance.contracts.length > 0 && (
              <button
                onClick={handleExportHistory}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </button>
            )}
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500">Loading contract history...</p>
            </div>
          ) : pastPerformance.contracts.length > 0 ? (
            <div>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Contracts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{pastPerformance.totalCount}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Obligated Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${(pastPerformance.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate (Est.)</p>
                  <p className="text-2xl font-bold text-green-600">35%</p>
                </div>
              </div>

              {/* Contracts Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PIID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {pastPerformance.contracts.map((contract, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400">
                          {contract.piid}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {contract.agency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {contract.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          ${contract.value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {contract.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <History className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Past Performance Records</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Link your company UEI to see your historical contract awards and performance metrics.
              </p>
            </div>
          )}
        </div>
      </div >
    </div >
  );
};

export default CompanyProfilePage;
