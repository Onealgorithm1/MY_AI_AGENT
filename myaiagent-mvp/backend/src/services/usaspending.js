import axios from 'axios';

const USASPENDING_BASE_URL = 'https://api.usaspending.gov/api/v2';

/**
 * USAspending API Service
 * Provides comprehensive federal spending analysis and budget forecasting
 */

/**
 * Get agency spending by NAICS code
 * @param {string} agencyCode - Agency toptier code (e.g., '097' for DoD)
 * @param {string} naicsCode - NAICS code
 * @param {number} fiscalYear - Fiscal year
 * @returns {Promise<Object>} Spending data
 */
export async function getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear) {
  try {
    const startDate = `${fiscalYear}-10-01`;
    const endDate = `${fiscalYear + 1}-09-30`;

    const response = await axios.post(`${USASPENDING_BASE_URL}/search/spending_by_award/`, {
      filters: {
        agencies: [{ type: 'awarding', tier: 'toptier', name: agencyCode }],
        naics_codes: [naicsCode],
        time_period: [{ start_date: startDate, end_date: endDate }]
      },
      fields: ['Award ID', 'Award Amount', 'Awarding Agency', 'Recipient Name', 'Award Type'],
      page: 1,
      limit: 1000,
      sort: 'Award Amount',
      order: 'desc'
    }, {
      timeout: 30000
    });

    const results = response.data.results || [];
    const total = results.reduce((sum, r) => sum + parseFloat(r['Award Amount'] || 0), 0);

    return {
      fiscalYear,
      total,
      count: results.length,
      results,
      agency: agencyCode,
      naics: naicsCode
    };
  } catch (error) {
    console.error('USAspending API error:', error.response?.data || error.message);
    throw new Error('Failed to fetch agency spending data');
  }
}

/**
 * Get spending trend analysis over multiple years
 * @param {string} agencyCode - Agency code
 * @param {string} naicsCode - NAICS code
 * @param {number} years - Number of years to analyze (default: 3)
 * @returns {Promise<Object>} Trend analysis
 */
export async function getSpendingTrends(agencyCode, naicsCode, years = 3) {
  try {
    const currentYear = new Date().getFullYear();
    const promises = [];

    for (let i = 0; i < years; i++) {
      const fiscalYear = currentYear - i;
      promises.push(getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear));
    }

    const results = await Promise.all(promises);
    return calculateTrends(results);
  } catch (error) {
    console.error('Spending trends error:', error);
    throw error;
  }
}

/**
 * Calculate year-over-year trends
 * @param {Array} yearlyData - Array of yearly spending data
 * @returns {Object} Trend analysis
 */
function calculateTrends(yearlyData) {
  const totalSpending = yearlyData.reduce((sum, year) => sum + year.total, 0);
  const averageAwardSize = yearlyData.reduce((sum, year) => sum + (year.total / (year.count || 1)), 0) / yearlyData.length;

  const yearOverYear = yearlyData.map((year, idx) => {
    if (idx === yearlyData.length - 1) {
      return { year: year.fiscalYear, growth: 0, spending: year.total };
    }
    const previousYear = yearlyData[idx + 1];
    const growth = previousYear.total > 0
      ? ((year.total - previousYear.total) / previousYear.total) * 100
      : 0;
    return {
      year: year.fiscalYear,
      growth: parseFloat(growth.toFixed(2)),
      spending: year.total
    };
  });

  return {
    totalSpending,
    yearOverYear,
    averageAwardSize,
    yearlyBreakdown: yearlyData.map(y => ({
      year: y.fiscalYear,
      spending: y.total,
      count: y.count,
      avgAward: y.count > 0 ? y.total / y.count : 0
    }))
  };
}

/**
 * Get top contractors by agency and NAICS
 * @param {string} agencyCode - Agency code
 * @param {string} naicsCode - NAICS code
 * @param {number} limit - Number of top contractors (default: 10)
 * @returns {Promise<Object>} Top contractors
 */
export async function getTopContractors(agencyCode, naicsCode, limit = 10) {
  try {
    const currentYear = new Date().getFullYear();
    const spendingData = await getAgencySpendingByNAICS(agencyCode, naicsCode, currentYear);

    // Aggregate by contractor
    const contractorMap = {};
    spendingData.results.forEach(award => {
      const name = award['Recipient Name'] || 'Unknown';
      if (!contractorMap[name]) {
        contractorMap[name] = {
          name,
          amount: 0,
          count: 0
        };
      }
      contractorMap[name].amount += parseFloat(award['Award Amount'] || 0);
      contractorMap[name].count += 1;
    });

    const contractors = Object.values(contractorMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    return {
      contractors,
      totalContractors: Object.keys(contractorMap).length,
      fiscalYear: currentYear
    };
  } catch (error) {
    console.error('Top contractors error:', error);
    throw error;
  }
}

/**
 * Get spending by award type
 * @param {string} agencyCode - Agency code
 * @param {string} naicsCode - NAICS code
 * @param {number} fiscalYear - Fiscal year
 * @returns {Promise<Object>} Spending by award type
 */
export async function getSpendingByAwardType(agencyCode, naicsCode, fiscalYear) {
  try {
    const spendingData = await getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear);

    const typeMap = {};
    spendingData.results.forEach(award => {
      const type = award['Award Type'] || 'Unknown';
      if (!typeMap[type]) {
        typeMap[type] = {
          type,
          amount: 0,
          count: 0
        };
      }
      typeMap[type].amount += parseFloat(award['Award Amount'] || 0);
      typeMap[type].count += 1;
    });

    return {
      byType: Object.values(typeMap).sort((a, b) => b.amount - a.amount),
      totalSpending: spendingData.total,
      fiscalYear
    };
  } catch (error) {
    console.error('Spending by award type error:', error);
    throw error;
  }
}

/**
 * Get agency budget information
 * @param {string} agencyCode - Agency toptier code
 * @param {number} fiscalYear - Fiscal year
 * @returns {Promise<Object>} Agency budget data
 */
export async function getAgencyBudget(agencyCode, fiscalYear) {
  try {
    const response = await axios.get(`${USASPENDING_BASE_URL}/agency/${agencyCode}/budgetary_resources/`, {
      params: {
        fiscal_year: fiscalYear
      },
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error('Agency budget error:', error.response?.data || error.message);
    // Return null if budget data not available (not all agencies publish this)
    return null;
  }
}

/**
 * Search awards with advanced filters
 * @param {Object} filters - Search filters
 * @returns {Promise<Object>} Search results
 */
export async function searchAwards(filters) {
  try {
    const {
      keywords,
      agencyCodes = [],
      naicsCodes = [],
      startDate,
      endDate,
      awardTypes = [],
      limit = 100
    } = filters;

    const searchFilters = {};

    if (agencyCodes.length > 0) {
      searchFilters.agencies = agencyCodes.map(code => ({
        type: 'awarding',
        tier: 'toptier',
        name: code
      }));
    }

    if (naicsCodes.length > 0) {
      searchFilters.naics_codes = naicsCodes;
    }

    if (startDate && endDate) {
      searchFilters.time_period = [{ start_date: startDate, end_date: endDate }];
    }

    if (awardTypes.length > 0) {
      searchFilters.award_type_codes = awardTypes;
    }

    if (keywords) {
      searchFilters.keywords = [keywords];
    }

    const response = await axios.post(`${USASPENDING_BASE_URL}/search/spending_by_award/`, {
      filters: searchFilters,
      fields: ['Award ID', 'Award Amount', 'Awarding Agency', 'Recipient Name', 'Award Type', 'Start Date', 'End Date'],
      page: 1,
      limit,
      sort: 'Award Amount',
      order: 'desc'
    }, {
      timeout: 30000
    });

    return {
      results: response.data.results || [],
      total: response.data.page_metadata?.total || 0
    };
  } catch (error) {
    console.error('Award search error:', error.response?.data || error.message);
    throw new Error('Failed to search awards');
  }
}

export default {
  getAgencySpendingByNAICS,
  getSpendingTrends,
  getTopContractors,
  getSpendingByAwardType,
  getAgencyBudget,
  searchAwards
};
