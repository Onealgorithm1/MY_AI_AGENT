import axios from 'axios';

const CALC_BASE_URL = 'https://calc.gsa.gov/api';

/**
 * CALC (Contract-Awarded Labor Category) API Service
 * Provides labor rate benchmarking for services contracts
 */

/**
 * Search labor rates by category
 * @param {string} laborCategory - Labor category search term
 * @param {string} education - Education level filter
 * @param {number} experience - Minimum years of experience
 * @param {number} limit - Max results (default: 100)
 * @returns {Promise<Object>} Labor rate search results
 */
export async function searchRates(laborCategory, education = null, experience = null, limit = 100) {
  try {
    const params = {
      q: laborCategory,
      price__gte: 0,
      price__lte: 500,
      limit
    };

    if (education) {
      params.education = education;
    }

    if (experience) {
      params.min_years_experience__gte = experience;
    }

    const response = await axios.get(`${CALC_BASE_URL}/rates/`, {
      params,
      timeout: 30000
    });

    return {
      results: response.data.results || [],
      count: response.data.count || 0,
      next: response.data.next,
      previous: response.data.previous
    };
  } catch (error) {
    console.error('CALC search rates error:', error.response?.data || error.message);
    throw new Error('Failed to search labor rates');
  }
}

/**
 * Get rate statistics for benchmarking
 * @param {string} laborCategory - Labor category
 * @param {string} education - Education level
 * @param {number} experience - Years of experience
 * @returns {Promise<Object>} Rate statistics
 */
export async function getRateStatistics(laborCategory, education = null, experience = null) {
  try {
    const rates = await searchRates(laborCategory, education, experience, 1000);

    if (rates.results.length === 0) {
      return {
        found: false,
        message: 'No rates found for this labor category'
      };
    }

    const hourlyRates = rates.results
      .map(r => parseFloat(r.current_price || r.price))
      .filter(rate => rate > 0);

    if (hourlyRates.length === 0) {
      return {
        found: false,
        message: 'No valid rates found'
      };
    }

    return {
      found: true,
      laborCategory,
      count: hourlyRates.length,
      min: Math.min(...hourlyRates),
      max: Math.max(...hourlyRates),
      average: hourlyRates.reduce((sum, rate) => sum + rate, 0) / hourlyRates.length,
      median: calculateMedian(hourlyRates),
      percentile25: calculatePercentile(hourlyRates, 25),
      percentile50: calculatePercentile(hourlyRates, 50),
      percentile75: calculatePercentile(hourlyRates, 75),
      percentile90: calculatePercentile(hourlyRates, 90),
      distributionByEducation: groupByEducation(rates.results),
      distributionByExperience: groupByExperience(rates.results),
      distributionByContract: groupByContract(rates.results)
    };
  } catch (error) {
    console.error('Rate statistics error:', error);
    throw error;
  }
}

/**
 * Calculate median from array of values
 * @param {Array<number>} values - Array of numbers
 * @returns {number} Median value
 */
function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate percentile from array of values
 * @param {Array<number>} values - Array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
function calculatePercentile(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Group rates by education level
 * @param {Array} results - CALC API results
 * @returns {Array} Grouped by education
 */
function groupByEducation(results) {
  const groups = {};

  results.forEach(r => {
    const edu = r.education_level || r.education || 'Not Specified';
    if (!groups[edu]) {
      groups[edu] = [];
    }
    const price = parseFloat(r.current_price || r.price);
    if (price > 0) {
      groups[edu].push(price);
    }
  });

  return Object.entries(groups).map(([education, rates]) => ({
    education,
    count: rates.length,
    average: rates.reduce((sum, r) => sum + r, 0) / rates.length,
    min: Math.min(...rates),
    max: Math.max(...rates)
  })).sort((a, b) => b.average - a.average);
}

/**
 * Group rates by experience level
 * @param {Array} results - CALC API results
 * @returns {Array} Grouped by experience
 */
function groupByExperience(results) {
  const groups = {
    '0-2 years': [],
    '3-5 years': [],
    '6-10 years': [],
    '11-15 years': [],
    '16+ years': []
  };

  results.forEach(r => {
    const exp = parseInt(r.min_years_experience || r.experience) || 0;
    const price = parseFloat(r.current_price || r.price);

    if (price <= 0) return;

    if (exp <= 2) groups['0-2 years'].push(price);
    else if (exp <= 5) groups['3-5 years'].push(price);
    else if (exp <= 10) groups['6-10 years'].push(price);
    else if (exp <= 15) groups['11-15 years'].push(price);
    else groups['16+ years'].push(price);
  });

  return Object.entries(groups).map(([range, rates]) => ({
    experienceRange: range,
    count: rates.length,
    average: rates.length > 0 ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 0,
    min: rates.length > 0 ? Math.min(...rates) : 0,
    max: rates.length > 0 ? Math.max(...rates) : 0
  })).filter(g => g.count > 0);
}

/**
 * Group rates by contract type
 * @param {Array} results - CALC API results
 * @returns {Array} Grouped by contract
 */
function groupByContract(results) {
  const groups = {};

  results.forEach(r => {
    const contract = r.schedule || r.contract_number || 'Unknown';
    if (!groups[contract]) {
      groups[contract] = {
        contract,
        rates: [],
        categories: new Set()
      };
    }
    const price = parseFloat(r.current_price || r.price);
    if (price > 0) {
      groups[contract].rates.push(price);
      if (r.labor_category) {
        groups[contract].categories.add(r.labor_category);
      }
    }
  });

  return Object.values(groups).map(g => ({
    contract: g.contract,
    categoryCount: g.categories.size,
    rateCount: g.rates.length,
    averageRate: g.rates.reduce((sum, r) => sum + r, 0) / g.rates.length,
    minRate: Math.min(...g.rates),
    maxRate: Math.max(...g.rates)
  })).sort((a, b) => b.categoryCount - a.categoryCount).slice(0, 10);
}

/**
 * Compare user's rates against market
 * @param {Array} userRates - Array of {category, rate} objects
 * @returns {Promise<Object>} Comparison analysis
 */
export async function compareRates(userRates) {
  try {
    const comparisons = await Promise.all(
      userRates.map(async (userRate) => {
        const stats = await getRateStatistics(userRate.category);

        if (!stats.found) {
          return {
            category: userRate.category,
            userRate: userRate.rate,
            comparison: 'No market data available'
          };
        }

        const position = calculateMarketPosition(userRate.rate, stats);

        return {
          category: userRate.category,
          userRate: userRate.rate,
          marketAverage: stats.average,
          marketMedian: stats.median,
          marketMin: stats.min,
          marketMax: stats.max,
          percentile: position.percentile,
          competitive: position.competitive,
          recommendation: position.recommendation
        };
      })
    );

    return {
      comparisons,
      summary: generateComparisonSummary(comparisons)
    };
  } catch (error) {
    console.error('Rate comparison error:', error);
    throw error;
  }
}

/**
 * Calculate market position for a rate
 * @param {number} userRate - User's proposed rate
 * @param {Object} stats - Market statistics
 * @returns {Object} Position analysis
 */
function calculateMarketPosition(userRate, stats) {
  const percentile = ((userRate - stats.min) / (stats.max - stats.min)) * 100;

  let competitive = 'Average';
  let recommendation = '';

  if (userRate < stats.percentile25) {
    competitive = 'Very Competitive (Low)';
    recommendation = 'Your rate is in the bottom 25% - consider if this adequately reflects your value';
  } else if (userRate < stats.median) {
    competitive = 'Competitive';
    recommendation = 'Your rate is below market median - good positioning for cost-sensitive bids';
  } else if (userRate < stats.percentile75) {
    competitive = 'Market Rate';
    recommendation = 'Your rate is at market median - balanced positioning';
  } else if (userRate < stats.percentile90) {
    competitive = 'Premium';
    recommendation = 'Your rate is in top 25% - ensure you can justify the premium value';
  } else {
    competitive = 'Very Premium (High)';
    recommendation = 'Your rate is in top 10% - high risk unless exceptional qualifications';
  }

  return {
    percentile: parseFloat(percentile.toFixed(1)),
    competitive,
    recommendation
  };
}

/**
 * Generate summary of rate comparisons
 * @param {Array} comparisons - Array of comparison objects
 * @returns {Object} Summary
 */
function generateComparisonSummary(comparisons) {
  const valid = comparisons.filter(c => c.marketAverage);

  if (valid.length === 0) {
    return {
      message: 'No market data available for comparison'
    };
  }

  const avgDifference = valid.reduce((sum, c) => {
    return sum + ((c.userRate - c.marketAverage) / c.marketAverage * 100);
  }, 0) / valid.length;

  const competitive = valid.filter(c => c.competitive.includes('Competitive')).length;
  const premium = valid.filter(c => c.competitive.includes('Premium')).length;

  return {
    categoriesAnalyzed: valid.length,
    averageDifferenceFromMarket: parseFloat(avgDifference.toFixed(2)),
    competitiveRates: competitive,
    premiumRates: premium,
    overallPosition: avgDifference < -10 ? 'Very Competitive' :
                     avgDifference < 0 ? 'Competitive' :
                     avgDifference < 10 ? 'Market Rate' :
                     avgDifference < 25 ? 'Premium' : 'Very Premium'
  };
}

export default {
  searchRates,
  getRateStatistics,
  compareRates
};
