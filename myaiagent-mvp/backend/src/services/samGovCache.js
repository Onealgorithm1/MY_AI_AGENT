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
 * @returns {Promise<Object>} Results with new and existing opportunities categorized
 */
export async function cacheOpportunities(opportunities, userId = null) {
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

      // Check if opportunity already exists
      const existingResult = await client.query(
        'SELECT id, notice_id, first_seen_at, seen_count FROM samgov_opportunities_cache WHERE notice_id = $1',
        [noticeId]
      );

      if (existingResult.rows.length > 0) {
        // Existing opportunity - update last_seen_at and increment seen_count
        const existing = existingResult.rows[0];
        await client.query(
          `UPDATE samgov_opportunities_cache
           SET last_seen_at = CURRENT_TIMESTAMP,
               seen_count = seen_count + 1,
               raw_data = $1
           WHERE notice_id = $2`,
          [JSON.stringify(opp), noticeId]
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
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
            userId
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
 * @returns {Promise<Object>} Search results with new/existing categorization
 */
export async function searchAndCache(searchParams, searchFunction, userId = null) {
  try {
    // Perform the search
    const searchResults = await searchFunction(searchParams, userId);

    if (!searchResults.success || !searchResults.opportunities) {
      return searchResults;
    }

    // Cache the results
    const cacheResults = await cacheOpportunities(searchResults.opportunities, userId);

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
      'SELECT * FROM samgov_opportunities_cache WHERE notice_id = $1',
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

export default {
  cacheOpportunities,
  recordSearchHistory,
  searchAndCache,
  getCachedOpportunity,
  getRecentSearches,
  linkToTrackedOpportunity,
};
