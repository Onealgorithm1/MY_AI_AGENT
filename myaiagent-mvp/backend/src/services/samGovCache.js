import pool from '../utils/database.js';

/**
 * Extract notice_id from SAM.gov opportunity data
 * @param {Object} opp - SAM.gov opportunity object
 * @returns {string} notice_id
 */
function getNoticeId(opp) {
  return opp.noticeId || opp.notice_id || opp.id;
}

/**
 * Cache SAM.gov opportunities and identify new vs existing
 * @param {Array} opportunities - Array of SAM.gov opportunity objects
 * @param {string} userId - User ID who performed the search
 * @param {string} organizationId - Organization ID for isolation
 * @returns {Promise<Object>} Results with new and existing opportunities categorized
 */
export async function cacheOpportunities(opportunities, userId = null, organizationId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const newOpportunities = [];
    const existingOpportunities = [];
    const updatedOpportunities = [];

    for (const opp of opportunities) {
      const noticeId = getNoticeId(opp);
      if (!noticeId) {
        console.warn('Skipping opportunity without notice_id:', opp);
        continue;
      }

      // Check if opportunity already exists for this specific organization (or system if null)
      const existingResult = await client.query(
        `SELECT id, notice_id, first_seen_at, seen_count 
         FROM samgov_opportunities_cache 
         WHERE notice_id = $1 
         AND (($2::INTEGER IS NULL AND organization_id IS NULL) OR organization_id = $2)`,
        [noticeId, organizationId]
      );

      if (existingResult.rows.length > 0) {
        // Existing opportunity - update last_seen_at and increment seen_count
        const existing = existingResult.rows[0];
        await client.query(
          `UPDATE samgov_opportunities_cache
           SET last_seen_at = CURRENT_TIMESTAMP,
               seen_count = seen_count + 1,
               raw_data = $1
           WHERE id = $2`,
          [JSON.stringify(opp), existing.id]
        );

        existingOpportunities.push({
          ...opp,
          _cache_info: {
            id: existing.id,
            first_seen_at: existing.first_seen_at,
            seen_count: existing.seen_count + 1,
            status: 'existing'
          }
        });
      } else {
        // New opportunity - insert into cache
        const insertResult = await client.query(
          `INSERT INTO samgov_opportunities_cache (
            notice_id,
            solicitation_number,
            title,
            type,
            posted_date,
            response_deadline,
            archive_date,
            naics_code,
            set_aside_type,
            contracting_office,
            place_of_performance,
            description,
            raw_data,
            created_by,
            organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id, first_seen_at`,
          [
            noticeId,
            opp.solicitationNumber || opp.solicitation_number || null,
            opp.title || 'Untitled',
            opp.type || null,
            opp.postedDate || opp.posted_date || null,
            opp.responseDeadLine || opp.response_deadline || null,
            opp.archiveDate || opp.archive_date || null,
            opp.naicsCode || opp.naics_code || null,
            opp.typeOfSetAside || opp.set_aside_type || null,
            opp.officeAddress?.city || opp.contracting_office || null,
            opp.placeOfPerformance?.city?.name || opp.place_of_performance || null,
            opp.description || null,
            JSON.stringify(opp),
            userId,
            organizationId
          ]
        );

        newOpportunities.push({
          ...opp,
          _cache_info: {
            id: insertResult.rows[0].id,
            first_seen_at: insertResult.rows[0].first_seen_at,
            seen_count: 1,
            status: 'new'
          }
        });
      }
    }

    await client.query('COMMIT');

    return {
      total: opportunities.length,
      new: newOpportunities.length,
      existing: existingOpportunities.length,
      newOpportunities,
      existingOpportunities,
      summary: {
        message: `Found ${opportunities.length} total opportunities: ${newOpportunities.length} new, ${existingOpportunities.length} already in database`,
        breakdown: {
          total: opportunities.length,
          new: newOpportunities.length,
          existing: existingOpportunities.length
        }
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error caching opportunities:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Record a SAM.gov search in history
 * @param {Object} params - Search parameters
 * @param {Object} results - Results from cacheOpportunities
 * @param {string} userId - User ID who performed the search
 * @returns {Promise<Object>} Search history record
 */
export async function recordSearchHistory(params, results, userId = null) {
  try {
    const result = await pool.query(
      `INSERT INTO samgov_search_history (
        keyword,
        posted_from,
        posted_to,
        naics_code,
        total_records,
        new_records,
        existing_records,
        searched_by,
        search_params
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        params.keyword || null,
        params.postedFrom || null,
        params.postedTo || null,
        params.naicsCode || null,
        results.total,
        results.new,
        results.existing,
        userId,
        JSON.stringify(params)
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error recording search history:', error);
    throw error;
  }
}

/**
 * Search and cache SAM.gov opportunities (combines search + cache)
 * @param {Object} searchParams - Search parameters for SAM.gov
 * @param {Function} searchFunction - SAM.gov search function to use
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Search results with new/existing categorization
 */
export async function searchAndCache(searchParams, searchFunction, userId = null, organizationId = null) {
  try {
    // Perform the search
    const searchResults = await searchFunction(searchParams, userId, organizationId);

    if (!searchResults.success || !searchResults.opportunities) {
      return searchResults;
    }

    // Cache the results
    const cacheResults = await cacheOpportunities(searchResults.opportunities, userId, organizationId);

    // Record search history
    await recordSearchHistory(searchParams, cacheResults, userId);

    return {
      ...searchResults,
      cache: cacheResults,
      categorized: {
        new: cacheResults.newOpportunities,
        existing: cacheResults.existingOpportunities
      },
      summary: cacheResults.summary
    };
  } catch (error) {
    console.error('Error in searchAndCache:', error);
    throw error;
  }
}

/**
 * Get cached opportunity by notice_id
 * @param {string} noticeId - Notice ID
 * @returns {Promise<Object|null>} Cached opportunity or null
 */
export async function getCachedOpportunity(noticeId) {
  try {
    const result = await pool.query(
      `SELECT * FROM samgov_opportunities_cache WHERE notice_id = $1 OR id::text = $1`,
      [noticeId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting cached opportunity:', error);
    throw error;
  }
}

/**
 * Get recent SAM.gov searches
 * @param {string} userId - User ID (optional)
 * @param {number} limit - Number of searches to return
 * @returns {Promise<Array>} Recent searches
 */
export async function getRecentSearches(userId = null, limit = 10) {
  try {
    const query = userId
      ? 'SELECT * FROM samgov_search_history WHERE searched_by = $1 ORDER BY searched_at DESC LIMIT $2'
      : 'SELECT * FROM samgov_search_history ORDER BY searched_at DESC LIMIT $1';

    const params = userId ? [userId, limit] : [limit];
    const result = await pool.query(query, params);

    return result.rows;
  } catch (error) {
    console.error('Error getting recent searches:', error);
    throw error;
  }
}

/**
 * Get cached opportunities with filters
 * @param {Object} options - Filter options
 * @param {number} options.limit - Number of results
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.keyword - Filter by keyword in title
 * @param {string} options.type - Filter by opportunity type
 * @param {string} options.status - Filter by active status
 * @param {string} options.userId - User ID (optional)
 * @param {string} options.organizationId - Organization ID (optional, for isolation)
 * @param {boolean} options.isMasterAdmin - Whether user is Master Admin (bypasses org filter)
 * @returns {Promise<Object>} Cached opportunities
 */
export async function getCachedOpportunities(options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      keyword,
      type,
      status,
      userId,
      organizationId,
      isMasterAdmin = false,
      // New filters
      naicsCode,
      naicsCodes, // Add support for array of matched NAICS
      setAside,
      agency,
      placeOfPerformance,
      postedFrom,
      postedTo,
      responseFrom,
      responseTo
    } = options;

    let queryText = 'SELECT * FROM samgov_opportunities_cache WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Add filters
    if (keyword) {
      queryText += ` AND (title ILIKE $${paramIndex} OR solicitation_number ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status === 'active') {
      // Active: Deadline is in future OR null (assuming null means open/unknown)
      queryText += ` AND (response_deadline >= CURRENT_TIMESTAMP OR response_deadline IS NULL)`;
    } else if (status === 'inactive') {
      // Inactive: Deadline is in past
      queryText += ` AND response_deadline < CURRENT_TIMESTAMP`;
    }

    if (naicsCode) {
      queryText += ` AND naics_code ILIKE $${paramIndex}`;
      params.push(`%${naicsCode}%`);
      paramIndex++;
    }

    if (naicsCodes && Array.isArray(naicsCodes) && naicsCodes.length > 0) {
      queryText += ` AND naics_code = ANY($${paramIndex})`;
      params.push(naicsCodes);
      paramIndex++;
    }

    if (setAside) {
      queryText += ` AND set_aside_type = $${paramIndex}`;
      params.push(setAside);
      paramIndex++;
    }

    if (agency) {
      queryText += ` AND contracting_office ILIKE $${paramIndex}`;
      params.push(`%${agency}%`);
      paramIndex++;
    }

    if (placeOfPerformance) {
      queryText += ` AND place_of_performance ILIKE $${paramIndex}`;
      params.push(`%${placeOfPerformance}%`);
      paramIndex++;
    }

    if (postedFrom) {
      queryText += ` AND posted_date::date >= $${paramIndex}`;
      params.push(postedFrom);
      paramIndex++;
    }

    if (postedTo) {
      queryText += ` AND posted_date::date <= $${paramIndex}`;
      params.push(postedTo);
      paramIndex++;
    }

    if (responseFrom) {
      queryText += ` AND response_deadline >= $${paramIndex}`;
      params.push(responseFrom);
      paramIndex++;
    }

    if (responseTo) {
      queryText += ` AND response_deadline <= $${paramIndex}`;
      params.push(responseTo);
      paramIndex++;
    }

    if (userId) {
      queryText += ` AND created_by = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Organization Isolation Logic - DISABLED for SAM.gov Cache (Public Data)
    /*
    if (!isMasterAdmin && organizationId) {
      queryText += ` AND (organization_id = $${paramIndex} OR organization_id IS NULL)`;
      params.push(organizationId);
      paramIndex++;
    } else if (!isMasterAdmin && !organizationId) {
      queryText += ` AND (organization_id IS NULL)`;
    }
    */
    // Master Admin sees ALL (no filter added)

    // Count total
    const countQuery = queryText.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    queryText += ` ORDER BY last_seen_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(queryText, params);

    return {
      success: true,
      total,
      opportunities: result.rows,
      limit,
      offset
    };
  } catch (error) {
    // Handle missing table gracefully
    if (error.code === '42P01') {
      console.warn('⚠️ samgov_opportunities_cache table does not exist yet');
      return {
        success: true,
        total: 0,
        opportunities: [],
        limit: options.limit || 20,
        offset: options.offset || 0
      };
    }
    console.error('Error getting cached opportunities:', error);
    throw error;
  }
}

/**
 * Link cached opportunity to manually tracked opportunity
 * @param {string} noticeId - Notice ID from SAM.gov
 * @param {number} opportunityId - ID from opportunities table
 * @returns {Promise<boolean>} Success status
 */
export async function linkToTrackedOpportunity(noticeId, opportunityId) {
  try {
    await pool.query(
      'UPDATE samgov_opportunities_cache SET opportunity_id = $1 WHERE notice_id = $2',
      [opportunityId, noticeId]
    );

    return true;
  } catch (error) {
    console.error('Error linking cached opportunity:', error);
    throw error;
  }
}

/**
 * Get all cached opportunities with pagination
 * @param {number} limit - Number of opportunities to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Opportunities and total count
 */
export async function getAllCachedOpportunities(limit = 50, offset = 0) {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM samgov_opportunities_cache');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, notice_id, solicitation_number, title, type, posted_date,
              response_deadline, naics_code, set_aside_type, contracting_office,
              place_of_performance, description, first_seen_at, last_seen_at, seen_count
       FROM samgov_opportunities_cache
       ORDER BY first_seen_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      opportunities: result.rows,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting all cached opportunities:', error);
    throw error;
  }
}

/**
 * Get facets (counts) for filter categories
 * @param {string} category - Category to facet by (naics, agency, set_aside, place)
 * @returns {Promise<Array>} Array of { value, count }
 */
export async function getFacets(category) {
  try {
    let column = '';
    switch (category) {
      case 'naics': column = 'naics_code'; break;
      case 'agency': column = 'contracting_office'; break;
      case 'set_aside': column = 'set_aside_type'; break;
      case 'place': column = 'place_of_performance'; break;
      default: throw new Error('Invalid facet category');
    }

    const query = `
      SELECT ${column} as value, COUNT(*) as count 
      FROM samgov_opportunities_cache 
      WHERE ${column} IS NOT NULL AND ${column} != ''
      GROUP BY ${column} 
      ORDER BY count DESC 
      LIMIT 1000
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error(`Error getting facets for ${category}:`, error);
    return [];
  }
}

export default {
  cacheOpportunities,
  recordSearchHistory,
  searchAndCache,
  getCachedOpportunity,
  getCachedOpportunities,
  getRecentSearches,
  linkToTrackedOpportunity,
  getAllCachedOpportunities,
  getFacets,
};
