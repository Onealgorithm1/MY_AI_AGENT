import React, { useState, useEffect } from 'react';
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
  Zap
} from 'lucide-react';
import api from '../services/api';

const CompanyProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [matchedOpportunities, setMatchedOpportunities] = useState([]);

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, eligibilityRes, matchesRes] = await Promise.all([
        api.get('/company/profile'),
        api.get('/company/eligibility-analysis'),
        api.get('/company/matched-opportunities?limit=10')
      ]);

      setProfile(profileRes.data.profile);
      setEligibility(eligibilityRes.data);
      setMatchedOpportunities(matchesRes.data.matches || []);
      setRecommendations(eligibilityRes.data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('Failed to run AI analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile?.company_name || 'OneAlgorithm'}</h1>
                <a
                  href={profile?.website || 'https://onealgorithm.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-100 hover:text-white mt-1"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  {profile?.website || 'onealgorithm.com'}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                {profile?.is_small_business && (
                  <span className="inline-flex items-center px-3 py-1 mt-2 bg-green-500 text-white text-sm rounded-full">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Small Business Certified
                  </span>
                )}
              </div>
            </div>
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Company Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Capabilities */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Code className="w-5 h-5 mr-2 text-blue-600" />
                Core Capabilities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(profile?.core_capabilities || [
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
                ]).map((capability, index) => {
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
            </div>

            {/* NAICS Codes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileCheck className="w-5 h-5 mr-2 text-purple-600" />
                NAICS Codes
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(profile?.naics_codes || ['541511', '541512', '541513', '541519', '518210', '541330']).map((code, index) => (
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
            </div>

            {/* Certifications */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-600" />
                Certifications & Set-Asides
              </h2>
              <div className="space-y-3">
                {(Array.isArray(profile?.certifications) ? profile.certifications : [
                  'ISO 27001 Certified',
                  'CMMI Level 3',
                  'AWS Certified Solutions Architect',
                  'Agile/Scrum Certified',
                  'SOC 2 Type II Compliant'
                ]).map((cert, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700"
                  >
                    <Award className="w-5 h-5 text-yellow-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cert}
                    </span>
                  </div>
                ))}
              </div>

              {profile?.set_aside_types && (
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
                      <div className={`p-2 rounded-lg mr-3 ${
                        rec.priority === 'High' ? 'bg-red-100 text-red-600' :
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            rec.priority === 'High' ? 'bg-red-100 text-red-700' :
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
                    {eligibility.eligible_count || 0} Eligible Opportunities
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
                  {matchedOpportunities.length > 5 && (
                    <button className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center">
                      View all {matchedOpportunities.length} matches
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
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
        </div>
      </div>
    </div>
  );
};

export default CompanyProfilePage;
