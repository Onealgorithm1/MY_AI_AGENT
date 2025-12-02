import axios from 'axios';
import { getApiKey } from '../utils/apiKeys.js';

const SAM_EXCLUSIONS_BASE_URL = 'https://api.sam.gov/prod/entity-information/v3/exclusions';

/**
 * Get SAM.gov API key for exclusions API
 */
async function getExclusionsApiKey(userId = null) {
  try {
    const apiKey = await getApiKey('samgov', userId);
    return apiKey;
  } catch (error) {
    console.error('Failed to get SAM.gov API key:', error);
    throw new Error('SAM.gov API key not configured');
  }
}

/**
 * Check if an entity is excluded from federal contracting
 * @param {string} entityName - Legal business name or individual name
 * @param {string} ueiSAM - UEI SAM identifier (optional)
 * @param {string} userId - User ID for API key lookup
 * @returns {Promise<Object>} Exclusion check results
 */
export async function checkExclusion(entityName, ueiSAM = null, userId = null) {
  try {
    const apiKey = await getExclusionsApiKey(userId);

    const params = {
      api_key: apiKey,
      legalBusinessName: entityName
    };

    if (ueiSAM) {
      params.ueiSAM = ueiSAM;
    }

    const response = await axios.get(SAM_EXCLUSIONS_BASE_URL, {
      params,
      timeout: 30000,
      validateStatus: (status) => status === 200 || status === 404
    });

    // 404 means not found in exclusions (which is good - not excluded)
    if (response.status === 404) {
      return {
        success: true,
        isExcluded: false,
        exclusionCount: 0,
        activeExclusions: [],
        entityName,
        ueiSAM,
        message: 'Entity not found in exclusions database - clear to contract'
      };
    }

    const exclusionDetails = response.data.exclusionDetails || response.data.entityData || [];

    const activeExclusions = exclusionDetails.filter(e => isExclusionActive(e));

    return {
      success: true,
      isExcluded: activeExclusions.length > 0,
      exclusionCount: exclusionDetails.length,
      activeExclusions: activeExclusions.map(e => formatExclusion(e)),
      allExclusions: exclusionDetails.map(e => formatExclusion(e)),
      entityName,
      ueiSAM,
      riskLevel: calculateRiskLevel(activeExclusions),
      recommendation: generateRecommendation(activeExclusions)
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        success: true,
        isExcluded: false,
        exclusionCount: 0,
        activeExclusions: [],
        entityName,
        ueiSAM,
        message: 'Entity not found in exclusions database - clear to contract'
      };
    }

    console.error('Exclusion check error:', error.response?.data || error.message);
    throw new Error('Failed to check exclusion status');
  }
}

/**
 * Check if an exclusion is currently active
 * @param {Object} exclusion - Exclusion record
 * @returns {boolean} True if exclusion is active
 */
function isExclusionActive(exclusion) {
  if (!exclusion.activationDate) return false;

  const activationDate = new Date(exclusion.activationDate);
  const now = new Date();

  if (activationDate > now) return false; // Not yet active

  if (exclusion.terminationDate) {
    const terminationDate = new Date(exclusion.terminationDate);
    return terminationDate > now; // Active until termination
  }

  return true; // No termination date means indefinite exclusion
}

/**
 * Format exclusion data for response
 * @param {Object} exclusion - Raw exclusion data
 * @returns {Object} Formatted exclusion
 */
function formatExclusion(exclusion) {
  return {
    classificationType: exclusion.classificationType,
    exclusionType: exclusion.exclusionType,
    activationDate: exclusion.activationDate,
    terminationDate: exclusion.terminationDate || 'Indefinite',
    agencyName: exclusion.excludingAgencyName,
    ctCode: exclusion.ctCode,
    recordStatus: exclusion.recordStatus,
    isActive: isExclusionActive(exclusion),
    daysRemaining: exclusion.terminationDate
      ? Math.ceil((new Date(exclusion.terminationDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null
  };
}

/**
 * Calculate risk level based on active exclusions
 * @param {Array} activeExclusions - Array of active exclusions
 * @returns {string} Risk level: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'
 */
function calculateRiskLevel(activeExclusions) {
  if (activeExclusions.length === 0) return 'NONE';

  const hasIndefinite = activeExclusions.some(e => !e.terminationDate || e.terminationDate === 'Indefinite');
  const hasRecent = activeExclusions.some(e => {
    const activated = new Date(e.activationDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return activated > oneYearAgo;
  });

  if (hasIndefinite) return 'CRITICAL';
  if (hasRecent && activeExclusions.length > 1) return 'HIGH';
  if (hasRecent) return 'MEDIUM';
  return 'LOW';
}

/**
 * Generate recommendation based on exclusions
 * @param {Array} activeExclusions - Array of active exclusions
 * @returns {string} Recommendation text
 */
function generateRecommendation(activeExclusions) {
  if (activeExclusions.length === 0) {
    return 'APPROVED - No active exclusions found. Entity is eligible for federal contracting.';
  }

  const riskLevel = calculateRiskLevel(activeExclusions);

  switch (riskLevel) {
    case 'CRITICAL':
      return 'DO NOT CONTRACT - Entity has indefinite exclusion(s). Federal contracting is prohibited.';
    case 'HIGH':
      return 'HIGH RISK - Multiple active exclusions found. Strongly recommend against contracting.';
    case 'MEDIUM':
      return 'PROCEED WITH CAUTION - Recent exclusion found. Verify eligibility and circumstances before proceeding.';
    case 'LOW':
      return 'REVIEW REQUIRED - Historical exclusion found. Review details and verify current eligibility.';
    default:
      return 'APPROVED - No concerns found.';
  }
}

/**
 * Batch check multiple entities for exclusions
 * @param {Array} entities - Array of {name, ueiSAM} objects
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of exclusion check results
 */
export async function batchCheckExclusions(entities, userId = null) {
  try {
    const promises = entities.map(entity =>
      checkExclusion(entity.name, entity.ueiSAM, userId)
        .then(result => ({
          ...entity,
          exclusionCheck: result
        }))
        .catch(error => ({
          ...entity,
          exclusionCheck: {
            success: false,
            error: error.message
          }
        }))
    );

    const results = await Promise.all(promises);

    return {
      success: true,
      totalChecked: entities.length,
      excluded: results.filter(r => r.exclusionCheck.isExcluded).length,
      clear: results.filter(r => !r.exclusionCheck.isExcluded).length,
      errors: results.filter(r => !r.exclusionCheck.success).length,
      results
    };
  } catch (error) {
    console.error('Batch exclusion check error:', error);
    throw new Error('Failed to perform batch exclusion check');
  }
}

/**
 * Get exclusion statistics (for dashboard/reporting)
 * @param {Object} filters - Optional filters
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Exclusion statistics
 */
export async function getExclusionStatistics(filters = {}, userId = null) {
  try {
    const apiKey = await getExclusionsApiKey(userId);

    const params = {
      api_key: apiKey,
      includeSections: 'exclusionDetails',
      page: 0,
      size: 1000
    };

    if (filters.classificationTypes) {
      params.classificationTypes = filters.classificationTypes;
    }

    if (filters.excludingAgencyCode) {
      params.excludingAgencyCode = filters.excludingAgencyCode;
    }

    const response = await axios.get(SAM_EXCLUSIONS_BASE_URL, {
      params,
      timeout: 30000
    });

    const exclusions = response.data.exclusionDetails || response.data.entityData || [];

    const active = exclusions.filter(e => isExclusionActive(e));

    return {
      success: true,
      total: exclusions.length,
      active: active.length,
      inactive: exclusions.length - active.length,
      byClassification: groupByClassification(exclusions),
      byAgency: groupByAgency(exclusions),
      byType: groupByType(exclusions),
      recentExclusions: exclusions
        .filter(e => {
          const activated = new Date(e.activationDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return activated > thirtyDaysAgo;
        }).length
    };
  } catch (error) {
    console.error('Get exclusion statistics error:', error.response?.data || error.message);
    // Return basic stats if API fails
    return {
      success: false,
      message: 'Unable to fetch comprehensive statistics',
      total: 0,
      active: 0
    };
  }
}

/**
 * Group exclusions by classification type
 * @param {Array} exclusions - Array of exclusions
 * @returns {Object} Grouped by classification
 */
function groupByClassification(exclusions) {
  const groups = {};
  exclusions.forEach(e => {
    const classification = e.classificationType || 'Unknown';
    groups[classification] = (groups[classification] || 0) + 1;
  });
  return groups;
}

/**
 * Group exclusions by agency
 * @param {Array} exclusions - Array of exclusions
 * @returns {Array} Top 10 agencies by exclusion count
 */
function groupByAgency(exclusions) {
  const groups = {};
  exclusions.forEach(e => {
    const agency = e.excludingAgencyName || 'Unknown';
    groups[agency] = (groups[agency] || 0) + 1;
  });

  return Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([agency, count]) => ({ agency, count }));
}

/**
 * Group exclusions by type
 * @param {Array} exclusions - Array of exclusions
 * @returns {Object} Grouped by exclusion type
 */
function groupByType(exclusions) {
  const groups = {};
  exclusions.forEach(e => {
    const type = e.exclusionType || 'Unknown';
    groups[type] = (groups[type] || 0) + 1;
  });
  return groups;
}

/**
 * Search exclusions by various criteria
 * @param {Object} searchCriteria - Search parameters
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Search results
 */
export async function searchExclusions(searchCriteria = {}, userId = null) {
  try {
    const apiKey = await getExclusionsApiKey(userId);

    const params = {
      api_key: apiKey,
      ...searchCriteria,
      includeSections: 'exclusionDetails'
    };

    const response = await axios.get(SAM_EXCLUSIONS_BASE_URL, {
      params,
      timeout: 30000,
      validateStatus: (status) => status === 200 || status === 404
    });

    if (response.status === 404) {
      return {
        success: true,
        found: false,
        results: [],
        message: 'No exclusions found matching criteria'
      };
    }

    const exclusions = response.data.exclusionDetails || response.data.entityData || [];

    return {
      success: true,
      found: true,
      count: exclusions.length,
      results: exclusions.map(e => formatExclusion(e))
    };
  } catch (error) {
    console.error('Search exclusions error:', error.response?.data || error.message);
    throw new Error('Failed to search exclusions');
  }
}

export default {
  checkExclusion,
  batchCheckExclusions,
  getExclusionStatistics,
  searchExclusions
};
