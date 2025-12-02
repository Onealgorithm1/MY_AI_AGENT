import axios from 'axios';
import { getApiKey } from '../utils/apiKeys.js';

const SAM_SUBAWARD_BASE_URL = 'https://api.sam.gov/prod/federalsubawarding/v1';

/**
 * Get SAM.gov API key for subaward APIs
 */
async function getSubawardApiKey(userId = null) {
  try {
    const apiKey = await getApiKey('samgov', userId);
    return apiKey;
  } catch (error) {
    console.error('Failed to get SAM.gov API key:', error);
    throw new Error('SAM.gov API key not configured');
  }
}

/**
 * Get subawards for a prime contractor
 * @param {string} primeContractorName - Prime contractor name
 * @param {Object} options - Search options
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Subaward data
 */
export async function getPrimeSubawards(primeContractorName, options = {}, userId = null) {
  try {
    const apiKey = await getSubawardApiKey(userId);
    const { limit = 100, offset = 0, naicsCode = null } = options;

    const params = {
      api_key: apiKey,
      prime_awardee_name: primeContractorName,
      limit,
      offset
    };

    if (naicsCode) {
      params.naics_code = naicsCode;
    }

    const response = await axios.get(`${SAM_SUBAWARD_BASE_URL}/subawards`, {
      params,
      timeout: 30000
    });

    return {
      success: true,
      subawards: response.data.subawards || [],
      totalRecords: response.data.totalRecords || 0,
      primeName: primeContractorName
    };
  } catch (error) {
    console.error('Get prime subawards error:', error.response?.data || error.message);
    throw new Error('Failed to fetch prime contractor subawards');
  }
}

/**
 * Find potential teaming partners based on subcontracting activity
 * @param {string} naicsCode - NAICS code
 * @param {Object} options - Search options
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Potential prime partners
 */
export async function findTeamingPartners(naicsCode, options = {}, userId = null) {
  try {
    const apiKey = await getSubawardApiKey(userId);
    const { limit = 500, minSubawards = 3 } = options;

    const params = {
      api_key: apiKey,
      naics_code: naicsCode,
      limit
    };

    const response = await axios.get(`${SAM_SUBAWARD_BASE_URL}/subawards`, {
      params,
      timeout: 30000
    });

    const subawards = response.data.subawards || [];

    // Analyze which primes give the most subcontracts
    const primeAnalysis = {};

    subawards.forEach(sub => {
      const primeName = sub.primeAwardeeName || sub.prime_awardee_name || 'Unknown';
      if (!primeAnalysis[primeName]) {
        primeAnalysis[primeName] = {
          name: primeName,
          totalSubawards: 0,
          totalValue: 0,
          subcontractors: new Set(),
          avgSubawardSize: 0,
          recentActivity: []
        };
      }

      primeAnalysis[primeName].totalSubawards++;
      const amount = parseFloat(sub.subawardAmount || sub.subaward_amount || 0);
      primeAnalysis[primeName].totalValue += amount;
      primeAnalysis[primeName].subcontractors.add(sub.subawardeeName || sub.subawardee_name);

      // Track recent activity
      const subawardDate = sub.subawardDate || sub.subaward_date;
      if (subawardDate) {
        primeAnalysis[primeName].recentActivity.push({
          date: subawardDate,
          amount
        });
      }
    });

    // Calculate averages and filter by minimum activity
    const partners = Object.values(primeAnalysis)
      .map(prime => ({
        name: prime.name,
        totalSubawards: prime.totalSubawards,
        totalValue: prime.totalValue,
        uniqueSubcontractors: prime.subcontractors.size,
        avgSubawardSize: prime.totalSubawards > 0 ? prime.totalValue / prime.totalSubawards : 0,
        recentActivity: prime.recentActivity.length,
        teamingScore: calculateTeamingScore(prime)
      }))
      .filter(p => p.totalSubawards >= minSubawards)
      .sort((a, b) => b.teamingScore - a.teamingScore)
      .slice(0, 20);

    return {
      success: true,
      naicsCode,
      partners,
      totalAnalyzed: Object.keys(primeAnalysis).length,
      recommendedPartners: partners.slice(0, 5)
    };
  } catch (error) {
    console.error('Find teaming partners error:', error.response?.data || error.message);
    throw new Error('Failed to find teaming partners');
  }
}

/**
 * Calculate teaming score for a prime contractor
 * Higher score = better teaming partner
 * @param {Object} prime - Prime contractor data
 * @returns {number} Teaming score (0-100)
 */
function calculateTeamingScore(prime) {
  let score = 0;

  // Factor 1: Number of subawards (max 30 points)
  score += Math.min(prime.totalSubawards / 2, 30);

  // Factor 2: Diversity of subcontractors (max 20 points)
  score += Math.min(prime.subcontractors.size * 2, 20);

  // Factor 3: Total value (max 25 points)
  const valueScore = Math.min(prime.totalValue / 10000000, 25);
  score += valueScore;

  // Factor 4: Average subaward size (max 15 points)
  // Prefer $100K - $5M range
  const avgSize = prime.totalSubawards > 0 ? prime.totalValue / prime.totalSubawards : 0;
  if (avgSize >= 100000 && avgSize <= 5000000) {
    score += 15;
  } else if (avgSize > 5000000) {
    score += 10;
  } else {
    score += 5;
  }

  // Factor 5: Recent activity (max 10 points)
  score += Math.min(prime.recentActivity.length / 3, 10);

  return parseFloat(score.toFixed(2));
}

/**
 * Analyze subcontracting patterns for an agency and NAICS
 * @param {string} agencyCode - Agency code
 * @param {string} naicsCode - NAICS code
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Subcontracting pattern analysis
 */
export async function analyzeSubcontractingPatterns(agencyCode, naicsCode, userId = null) {
  try {
    const apiKey = await getSubawardApiKey(userId);

    const params = {
      api_key: apiKey,
      awarding_agency_code: agencyCode,
      naics_code: naicsCode,
      limit: 500
    };

    const response = await axios.get(`${SAM_SUBAWARD_BASE_URL}/subawards`, {
      params,
      timeout: 30000
    });

    const subawards = response.data.subawards || [];

    if (subawards.length === 0) {
      return {
        success: true,
        found: false,
        message: 'No subcontracting data found for this agency and NAICS combination'
      };
    }

    const totalValue = subawards.reduce((sum, s) => sum + parseFloat(s.subawardAmount || s.subaward_amount || 0), 0);
    const avgSubawardSize = totalValue / subawards.length;

    return {
      success: true,
      found: true,
      agencyCode,
      naicsCode,
      totalSubawards: subawards.length,
      totalValue,
      averageSubawardSize: avgSubawardSize,
      topSubcontractors: getTopSubcontractors(subawards, 10),
      topPrimes: getTopPrimes(subawards, 10),
      smallBusinessPercentage: calculateSmallBusinessPercentage(subawards),
      valueDistribution: analyzeValueDistribution(subawards)
    };
  } catch (error) {
    console.error('Analyze subcontracting patterns error:', error.response?.data || error.message);
    throw new Error('Failed to analyze subcontracting patterns');
  }
}

/**
 * Get top subcontractors by total value
 * @param {Array} subawards - Subaward data
 * @param {number} limit - Number of top subcontractors
 * @returns {Array} Top subcontractors
 */
function getTopSubcontractors(subawards, limit) {
  const contractors = {};

  subawards.forEach(sub => {
    const name = sub.subawardeeName || sub.subawardee_name || 'Unknown';
    if (!contractors[name]) {
      contractors[name] = { name, count: 0, totalValue: 0 };
    }
    contractors[name].count++;
    contractors[name].totalValue += parseFloat(sub.subawardAmount || sub.subaward_amount || 0);
  });

  return Object.values(contractors)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit)
    .map((c, idx) => ({
      rank: idx + 1,
      ...c,
      avgValue: c.count > 0 ? c.totalValue / c.count : 0
    }));
}

/**
 * Get top prime contractors by subcontracting activity
 * @param {Array} subawards - Subaward data
 * @param {number} limit - Number of top primes
 * @returns {Array} Top primes
 */
function getTopPrimes(subawards, limit) {
  const primes = {};

  subawards.forEach(sub => {
    const name = sub.primeAwardeeName || sub.prime_awardee_name || 'Unknown';
    if (!primes[name]) {
      primes[name] = { name, count: 0, totalValue: 0 };
    }
    primes[name].count++;
    primes[name].totalValue += parseFloat(sub.subawardAmount || sub.subaward_amount || 0);
  });

  return Object.values(primes)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((p, idx) => ({
      rank: idx + 1,
      ...p,
      avgValue: p.count > 0 ? p.totalValue / p.count : 0
    }));
}

/**
 * Calculate percentage of small business subawards
 * @param {Array} subawards - Subaward data
 * @returns {number} Percentage (0-100)
 */
function calculateSmallBusinessPercentage(subawards) {
  const smallBusinessSubawards = subawards.filter(s =>
    s.smallBusinessIndicator === 'Y' ||
    s.small_business_indicator === 'Y' ||
    s.smallBusiness === true
  );

  return subawards.length > 0
    ? parseFloat(((smallBusinessSubawards.length / subawards.length) * 100).toFixed(2))
    : 0;
}

/**
 * Analyze value distribution of subawards
 * @param {Array} subawards - Subaward data
 * @returns {Object} Value distribution
 */
function analyzeValueDistribution(subawards) {
  const ranges = {
    'Under $50K': 0,
    '$50K - $250K': 0,
    '$250K - $1M': 0,
    '$1M - $5M': 0,
    'Over $5M': 0
  };

  subawards.forEach(sub => {
    const amount = parseFloat(sub.subawardAmount || sub.subaward_amount || 0);

    if (amount < 50000) ranges['Under $50K']++;
    else if (amount < 250000) ranges['$50K - $250K']++;
    else if (amount < 1000000) ranges['$250K - $1M']++;
    else if (amount < 5000000) ranges['$1M - $5M']++;
    else ranges['Over $5M']++;
  });

  return ranges;
}

/**
 * Get subcontracting history for a specific subcontractor
 * @param {string} subcontractorName - Subcontractor name
 * @param {Object} options - Search options
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Subcontractor history
 */
export async function getSubcontractorHistory(subcontractorName, options = {}, userId = null) {
  try {
    const apiKey = await getSubawardApiKey(userId);
    const { limit = 100 } = options;

    const params = {
      api_key: apiKey,
      subawardee_name: subcontractorName,
      limit
    };

    const response = await axios.get(`${SAM_SUBAWARD_BASE_URL}/subawards`, {
      params,
      timeout: 30000
    });

    const subawards = response.data.subawards || [];

    // Analyze the history
    const primes = new Set();
    const agencies = new Set();
    let totalValue = 0;

    subawards.forEach(sub => {
      primes.add(sub.primeAwardeeName || sub.prime_awardee_name);
      agencies.add(sub.awardingAgencyName || sub.awarding_agency_name);
      totalValue += parseFloat(sub.subawardAmount || sub.subaward_amount || 0);
    });

    return {
      success: true,
      subcontractorName,
      totalSubawards: subawards.length,
      totalValue,
      uniquePrimes: primes.size,
      uniqueAgencies: agencies.size,
      avgSubawardSize: subawards.length > 0 ? totalValue / subawards.length : 0,
      primePartners: Array.from(primes).slice(0, 10),
      agencies: Array.from(agencies),
      subawards: subawards.slice(0, 20)
    };
  } catch (error) {
    console.error('Get subcontractor history error:', error.response?.data || error.message);
    throw new Error('Failed to fetch subcontractor history');
  }
}

export default {
  getPrimeSubawards,
  findTeamingPartners,
  analyzeSubcontractingPatterns,
  getSubcontractorHistory
};
