import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * OneAlgorithm Company Profile Service
 * Analyzes company capabilities and matches them with federal opportunities
 */

const ONEALGORITHM_BASE_URL = 'https://onealgorithm.com';

// OneAlgorithm company profile based on sitemap analysis
const ONEALGORITHM_PROFILE = {
  name: 'OneAlgorithm',
  website: 'https://onealgorithm.com',

  // Core Capabilities from Services
  capabilities: {
    // IT Services & Consulting
    'IT Consulting': {
      naicsCodes: ['541512', '541513'],
      pscCodes: ['D302', 'D307', 'D310'],
      description: 'IT consulting and professional services',
      maturity: 'High',
      page: 'https://onealgorithm.com/services/it-consulting'
    },

    // Website & Software Development
    'Website Development': {
      naicsCodes: ['541511', '541512'],
      pscCodes: ['D302', 'D307', '7030'],
      description: 'Custom website and software development',
      maturity: 'High',
      page: 'https://onealgorithm.com/services/website-development'
    },

    // Operations Technology
    'Operations Technology': {
      naicsCodes: ['541512', '541330', '541618'],
      pscCodes: ['D302', 'D399', 'R408'],
      description: 'Operations technology consulting and implementation',
      maturity: 'Medium',
      page: 'https://onealgorithm.com/services/operations-technology'
    },

    // Marketing & Digital Services
    'Marketing Services': {
      naicsCodes: ['541613', '541810', '541820'],
      pscCodes: ['R499', 'R608'],
      description: 'Digital marketing and brand management',
      maturity: 'Medium',
      page: 'https://onealgorithm.com/services/marketing'
    },

    // Staff Augmentation
    'Staff Augmentation': {
      naicsCodes: ['541511', '541512', '541519'],
      pscCodes: ['D302', 'R425', 'R499'],
      description: 'IT and professional staff augmentation',
      maturity: 'High',
      page: 'https://onealgorithm.com/services/staff-augmentation'
    }
  },

  // Industry Experience
  industries: [
    { name: 'Construction', page: 'https://onealgorithm.com/industries/construction' },
    { name: 'Manufacturing', page: 'https://onealgorithm.com/industries/manufacturing' },
    { name: 'E-commerce', page: 'https://onealgorithm.com/industries/ecommerce' },
    { name: 'Marketing', page: 'https://onealgorithm.com/industries/marketing' },
    { name: 'Website Development', page: 'https://onealgorithm.com/industries/website-development' }
  ],

  // Current Certifications & Status (to be updated)
  certifications: {
    smallBusiness: true, // Assume true - verify in SAM.gov
    veteran: false,
    womanOwned: false,
    '8a': false,
    hubzone: false,
    sdvosb: false
  },

  // Keywords for opportunity matching
  keywords: [
    'website', 'web development', 'software development', 'IT consulting',
    'operations technology', 'marketing', 'staff augmentation', 'digital services',
    'custom software', 'web applications', 'IT services', 'consulting',
    'technology consulting', 'digital transformation', 'e-commerce', 'construction tech'
  ]
};

/**
 * Fetch company data from website (if needed for dynamic updates)
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} Parsed content
 */
export async function fetchCompanyPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OneAlgorithmAnalyzer/1.0)'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract key information
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text();

    // Extract all text content
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      title,
      description,
      h1,
      textContent: textContent.substring(0, 5000), // First 5000 chars
      fetched: new Date()
    };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Get OneAlgorithm company profile
 * @returns {Object} Company profile
 */
export function getCompanyProfile() {
  return ONEALGORITHM_PROFILE;
}

/**
 * Match opportunities with company capabilities
 * @param {Array} opportunities - SAM.gov opportunities
 * @returns {Object} Matched and recommended opportunities
 */
export function matchOpportunities(opportunities) {
  const profile = ONEALGORITHM_PROFILE;
  const matched = [];
  const nearMatch = [];
  const stretch = [];

  opportunities.forEach(opp => {
    const score = calculateMatchScore(opp, profile);

    if (score.total >= 70) {
      matched.push({ ...opp, matchScore: score });
    } else if (score.total >= 50) {
      nearMatch.push({ ...opp, matchScore: score });
    } else if (score.total >= 30) {
      stretch.push({ ...opp, matchScore: score });
    }
  });

  return {
    matched: matched.sort((a, b) => b.matchScore.total - a.matchScore.total),
    nearMatch: nearMatch.sort((a, b) => b.matchScore.total - a.matchScore.total),
    stretch: stretch.sort((a, b) => b.matchScore.total - a.matchScore.total),
    totalAnalyzed: opportunities.length
  };
}

/**
 * Calculate match score between opportunity and company profile
 * @param {Object} opportunity - Opportunity data
 * @param {Object} profile - Company profile
 * @returns {Object} Match score breakdown
 */
function calculateMatchScore(opportunity, profile) {
  let score = {
    naics: 0,
    psc: 0,
    keywords: 0,
    setAside: 0,
    total: 0,
    reasons: [],
    gaps: []
  };

  // Check NAICS match (0-30 points)
  const oppNaics = opportunity.naics_code || opportunity.raw_data?.naicsCode;
  if (oppNaics) {
    const allCompanyNaics = Object.values(profile.capabilities)
      .flatMap(cap => cap.naicsCodes);

    if (allCompanyNaics.includes(oppNaics)) {
      score.naics = 30;
      score.reasons.push(`NAICS match: ${oppNaics}`);
    } else {
      score.gaps.push(`NAICS ${oppNaics} not in our primary codes`);
    }
  }

  // Check PSC match (0-20 points)
  const oppPsc = opportunity.psc_code || opportunity.raw_data?.productServiceCode;
  if (oppPsc) {
    const allCompanyPsc = Object.values(profile.capabilities)
      .flatMap(cap => cap.pscCodes);

    if (allCompanyPsc.includes(oppPsc)) {
      score.psc = 20;
      score.reasons.push(`PSC match: ${oppPsc}`);
    } else {
      score.gaps.push(`PSC ${oppPsc} not in our service codes`);
    }
  }

  // Check keyword match (0-30 points)
  const oppTitle = (opportunity.title || '').toLowerCase();
  const oppDesc = (opportunity.description || '').toLowerCase();
  const oppText = `${oppTitle} ${oppDesc}`;

  let keywordMatches = 0;
  profile.keywords.forEach(keyword => {
    if (oppText.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  });

  score.keywords = Math.min(30, keywordMatches * 3);
  if (keywordMatches > 0) {
    score.reasons.push(`${keywordMatches} keyword matches`);
  }

  // Check set-aside compatibility (0-20 points)
  const setAside = opportunity.set_aside_type || opportunity.raw_data?.typeOfSetAside;
  if (!setAside || setAside === 'None' || setAside.includes('Total Small Business')) {
    score.setAside = 20;
    score.reasons.push('Set-aside compatible');
  } else {
    // Check if we have the certification
    const hasCert = checkCertification(setAside, profile.certifications);
    if (hasCert) {
      score.setAside = 20;
      score.reasons.push(`Have ${setAside} certification`);
    } else {
      score.gaps.push(`Need ${setAside} certification`);
    }
  }

  score.total = score.naics + score.psc + score.keywords + score.setAside;

  return score;
}

/**
 * Check if company has required certification
 * @param {string} setAside - Set-aside type
 * @param {Object} certs - Company certifications
 * @returns {boolean} Has certification
 */
function checkCertification(setAside, certs) {
  const setAsideLower = setAside.toLowerCase();

  if (setAsideLower.includes('8(a)')) return certs['8a'];
  if (setAsideLower.includes('hubzone')) return certs.hubzone;
  if (setAsideLower.includes('woman') || setAsideLower.includes('wosb')) return certs.womanOwned;
  if (setAsideLower.includes('veteran') || setAsideLower.includes('sdvosb')) return certs.sdvosb || certs.veteran;
  if (setAsideLower.includes('small business')) return certs.smallBusiness;

  return false;
}

/**
 * Generate recommendations for improving opportunity matching
 * @param {Array} opportunities - All opportunities
 * @returns {Object} Recommendations
 */
export function generateRecommendations(opportunities) {
  const profile = ONEALGORITHM_PROFILE;
  const recommendations = {
    certifications: [],
    naicsCodes: [],
    capabilities: [],
    pastPerformance: [],
    strategic: []
  };

  // Analyze missed opportunities
  const naicsFrequency = {};
  const pscFrequency = {};
  const setAsideFrequency = {};

  opportunities.forEach(opp => {
    const naics = opp.naics_code || opp.raw_data?.naicsCode;
    const psc = opp.psc_code || opp.raw_data?.productServiceCode;
    const setAside = opp.set_aside_type || opp.raw_data?.typeOfSetAside;

    if (naics) naicsFrequency[naics] = (naicsFrequency[naics] || 0) + 1;
    if (psc) pscFrequency[psc] = (pscFrequency[psc] || 0) + 1;
    if (setAside && setAside !== 'None') {
      setAsideFrequency[setAside] = (setAsideFrequency[setAside] || 0) + 1;
    }
  });

  // Certification recommendations
  const topSetAsides = Object.entries(setAsideFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  topSetAsides.forEach(([setAside, count]) => {
    const hasCert = checkCertification(setAside, profile.certifications);
    if (!hasCert && count > 5) {
      recommendations.certifications.push({
        certification: setAside,
        opportunities: count,
        priority: count > 20 ? 'High' : count > 10 ? 'Medium' : 'Low',
        action: `Pursue ${setAside} certification`,
        benefit: `Access to ${count} opportunities`
      });
    }
  });

  // NAICS code recommendations
  const companyNaics = Object.values(profile.capabilities).flatMap(c => c.naicsCodes);
  const topNaics = Object.entries(naicsFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  topNaics.forEach(([naics, count]) => {
    if (!companyNaics.includes(naics) && count > 10) {
      recommendations.naicsCodes.push({
        naicsCode: naics,
        opportunities: count,
        priority: count > 50 ? 'High' : count > 25 ? 'Medium' : 'Low',
        action: `Add NAICS ${naics} to SAM.gov registration`,
        benefit: `Qualify for ${count} additional opportunities`
      });
    }
  });

  // Capability gaps
  const commonKeywords = extractCommonKeywords(opportunities);
  commonKeywords.forEach(keyword => {
    if (!profile.keywords.some(k => k.toLowerCase().includes(keyword.term.toLowerCase()))) {
      recommendations.capabilities.push({
        capability: keyword.term,
        frequency: keyword.count,
        priority: keyword.count > 30 ? 'High' : 'Medium',
        action: `Develop capability: ${keyword.term}`,
        benefit: `Appear in ${keyword.count} more searches`
      });
    }
  });

  // Past performance recommendations
  recommendations.pastPerformance.push({
    action: 'Build past performance record',
    priority: 'High',
    strategies: [
      'Pursue small contracts ($25K-$150K) to build track record',
      'Target "Sources Sought" notices for relationship building',
      'Respond to RFIs to demonstrate expertise',
      'Pursue prime contracts in your strong NAICS codes',
      'Seek subcontracting opportunities with established primes'
    ]
  });

  // Strategic recommendations
  recommendations.strategic = [
    {
      title: 'Focus on Core Strengths',
      action: 'Target opportunities in NAICS 541511, 541512 (IT Services)',
      rationale: 'High maturity capabilities with proven expertise'
    },
    {
      title: 'Build Federal Portfolio',
      action: 'Start with small contracts under simplified acquisition threshold',
      rationale: 'Establish past performance with lower competition'
    },
    {
      title: 'Leverage Small Business Status',
      action: 'Focus on Total Small Business Set-Aside opportunities',
      rationale: 'Most accessible entry point for new federal contractors'
    },
    {
      title: 'Geographic Targeting',
      action: 'Target local/regional federal offices first',
      rationale: 'Build relationships and past performance locally'
    }
  ];

  return recommendations;
}

/**
 * Extract common keywords from opportunities
 * @param {Array} opportunities - Opportunities
 * @returns {Array} Common keywords with frequency
 */
function extractCommonKeywords(opportunities) {
  const keywordFreq = {};

  opportunities.forEach(opp => {
    const title = (opp.title || '').toLowerCase();
    const words = title.match(/\b[a-z]{4,}\b/g) || [];

    words.forEach(word => {
      if (!['this', 'that', 'with', 'from', 'have', 'will', 'been'].includes(word)) {
        keywordFreq[word] = (keywordFreq[word] || 0) + 1;
      }
    });
  });

  return Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term, count]) => ({ term, count }));
}

/**
 * Analyze company readiness for federal contracting
 * @returns {Object} Readiness analysis
 */
export function analyzeCompanyReadiness() {
  const profile = ONEALGORITHM_PROFILE;
  const readiness = {
    overallScore: 0,
    categories: {}
  };

  // SAM.gov Registration (0-20 points)
  readiness.categories.registration = {
    score: 15, // Assuming registered but may need updates
    maxScore: 20,
    status: 'Good',
    items: [
      { check: 'Active SAM.gov registration', status: 'assumed', points: 10 },
      { check: 'NAICS codes correctly listed', status: 'needs-verification', points: 5 },
      { check: 'All certifications current', status: 'unknown', points: 0 }
    ]
  };

  // Past Performance (0-25 points)
  readiness.categories.pastPerformance = {
    score: 5, // Low score - new to federal
    maxScore: 25,
    status: 'Needs Improvement',
    items: [
      { check: 'Federal contract experience', status: 'no', points: 0 },
      { check: 'Relevant commercial work', status: 'yes', points: 5 },
      { check: 'Client references available', status: 'assumed', points: 0 }
    ]
  };

  // Technical Capabilities (0-20 points)
  readiness.categories.technical = {
    score: 18,
    maxScore: 20,
    status: 'Excellent',
    items: [
      { check: 'Core IT services capability', status: 'yes', points: 10 },
      { check: 'Website/software development', status: 'yes', points: 5 },
      { check: 'Staff augmentation capability', status: 'yes', points: 3 }
    ]
  };

  // Certifications (0-15 points)
  readiness.categories.certifications = {
    score: 10, // Small business only
    maxScore: 15,
    status: 'Good',
    items: [
      { check: 'Small Business', status: 'assumed', points: 10 },
      { check: '8(a) certification', status: 'no', points: 0 },
      { check: 'Other set-aside certs', status: 'no', points: 0 }
    ]
  };

  // Financial Capacity (0-20 points)
  readiness.categories.financial = {
    score: 12, // Moderate - verify
    maxScore: 20,
    status: 'Adequate',
    items: [
      { check: 'Adequate working capital', status: 'assumed', points: 7 },
      { check: 'Bonding capability', status: 'unknown', points: 0 },
      { check: 'Financial systems in place', status: 'assumed', points: 5 }
    ]
  };

  readiness.overallScore = Object.values(readiness.categories)
    .reduce((sum, cat) => sum + cat.score, 0);
  readiness.maxPossibleScore = 100;
  readiness.percentage = (readiness.overallScore / readiness.maxPossibleScore * 100).toFixed(1);

  // Overall readiness level
  if (readiness.percentage >= 80) {
    readiness.level = 'Highly Ready';
    readiness.recommendation = 'Begin bidding on opportunities immediately';
  } else if (readiness.percentage >= 60) {
    readiness.level = 'Ready';
    readiness.recommendation = 'Start with small opportunities while building past performance';
  } else if (readiness.percentage >= 40) {
    readiness.level = 'Developing';
    readiness.recommendation = 'Focus on capability building and certification pursuit';
  } else {
    readiness.level = 'Early Stage';
    readiness.recommendation = 'Complete SAM.gov registration and build core capabilities';
  }

  return readiness;
}

export default {
  getCompanyProfile,
  fetchCompanyPage,
  matchOpportunities,
  generateRecommendations,
  analyzeCompanyReadiness
};
