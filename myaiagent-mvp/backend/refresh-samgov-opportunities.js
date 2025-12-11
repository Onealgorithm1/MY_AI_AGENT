#!/usr/bin/env node

/**
 * SAM.gov Opportunities Hourly Refresh Script
 *
 * This script fetches the latest opportunities from SAM.gov API
 * and caches them in the database. It should be run via cron every hour.
 *
 * Usage: node refresh-samgov-opportunities.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend .env
dotenv.config({ path: join(__dirname, 'myaiagent-mvp', 'backend', '.env') });

const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'myaiagent',
  user: process.env.DB_USER || 'myaiagent',
  password: process.env.DB_PASSWORD,
});

// SAM.gov API configuration
const SAM_GOV_API_KEY = process.env.SAM_GOV_API_KEY;
const SAM_GOV_API_BASE = 'https://api.sam.gov/opportunities/v2/search';

/**
 * Fetch opportunities from SAM.gov API with pagination
 */
async function fetchOpportunitiesFromAPI() {
  console.log('[SAM.gov Refresh] Fetching opportunities from API...');

  if (!SAM_GOV_API_KEY) {
    throw new Error('SAM_GOV_API_KEY not found in environment variables');
  }

  // Calculate date range (last 30 days)
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  const allOpportunities = [];
  const limit = 1000; // Maximum per request
  let offset = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const params = new URLSearchParams({
        api_key: SAM_GOV_API_KEY,
        postedFrom: fromDate.toISOString().split('T')[0],
        postedTo: toDate.toISOString().split('T')[0],
        limit: limit.toString(),
        offset: offset.toString()
      });

      console.log(`[SAM.gov Refresh] Fetching page at offset ${offset}...`);

      const response = await fetch(`${SAM_GOV_API_BASE}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`SAM.gov API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const opportunities = data.opportunitiesData || [];

      console.log(`[SAM.gov Refresh] Found ${opportunities.length} opportunities in this page`);

      allOpportunities.push(...opportunities);

      // Check if there are more pages
      if (opportunities.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[SAM.gov Refresh] Total opportunities fetched: ${allOpportunities.length}`);
    return allOpportunities;
  } catch (error) {
    console.error('[SAM.gov Refresh] Error fetching from API:', error);
    throw error;
  }
}

/**
 * Cache opportunity in database
 */
async function cacheOpportunity(opp) {
  try {
    const query = `
      INSERT INTO samgov_opportunities_cache (
        notice_id, solicitation_number, title, type, base_type,
        archive_type, archive_date, posted_date, response_deadline,
        naics_code, classification_code, active, award, point_of_contact,
        description, organization_type, office_address, place_of_performance,
        additional_info_link, uilink, links, contact, award_number, award_date,
        award_amount, awardee, set_aside_type, contracting_office,
        full_parent_path_name, full_parent_path_code, raw_data,
        first_seen_at, last_seen_at, seen_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, NOW(), NOW(), 1
      )
      ON CONFLICT (notice_id)
      DO UPDATE SET
        last_seen_at = NOW(),
        seen_count = samgov_opportunities_cache.seen_count + 1,
        title = EXCLUDED.title,
        response_deadline = EXCLUDED.response_deadline,
        description = EXCLUDED.description,
        raw_data = EXCLUDED.raw_data
      RETURNING id, notice_id, title, (xmax = 0) AS inserted
    `;

    const values = [
      opp.noticeId,
      opp.solicitationNumber,
      opp.title,
      opp.type,
      opp.baseType,
      opp.archiveType,
      opp.archiveDate,
      opp.postedDate,
      opp.responseDeadLine,
      opp.naicsCode,
      opp.classificationCode,
      opp.active || 'Yes',
      JSON.stringify(opp.award || null),
      JSON.stringify(opp.pointOfContact || []),
      opp.description,
      opp.organizationType,
      JSON.stringify(opp.officeAddress || null),
      JSON.stringify(opp.placeOfPerformance || null),
      opp.additionalInfoLink,
      opp.uiLink,
      JSON.stringify(opp.links || []),
      JSON.stringify(opp.contact || null),
      opp.award?.number,
      opp.award?.date,
      opp.award?.amount,
      opp.award?.awardee?.name,
      opp.typeOfSetAsideDescription || opp.typeOfSetAside,
      opp.fullParentPathName?.split('.')[0] || opp.departmentName,
      opp.fullParentPathName,
      opp.fullParentPathCode,
      JSON.stringify(opp)
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    if (row.inserted) {
      console.log(`  ✅ NEW: ${row.notice_id} - ${row.title.substring(0, 60)}`);
      return 'new';
    } else {
      console.log(`  🔄 UPDATED: ${row.notice_id} - ${row.title.substring(0, 60)}`);
      return 'updated';
    }
  } catch (error) {
    console.error(`  ❌ Error caching opportunity ${opp.noticeId}:`, error.message);
    return 'error';
  }
}

/**
 * Main refresh function
 */
async function refreshOpportunities() {
  const startTime = Date.now();
  console.log('========================================');
  console.log('🔄 SAM.gov Opportunities Refresh');
  console.log('========================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
    console.log('');

    // Fetch opportunities from SAM.gov API
    const opportunities = await fetchOpportunitiesFromAPI();

    if (opportunities.length === 0) {
      console.log('⚠️  No opportunities found in API response');
      return;
    }

    console.log('');
    console.log('[SAM.gov Refresh] Caching opportunities...');
    console.log('');

    // Cache each opportunity
    let stats = { new: 0, updated: 0, error: 0 };

    for (const opp of opportunities) {
      const result = await cacheOpportunity(opp);
      stats[result]++;
    }

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM samgov_opportunities_cache');
    const totalCached = countResult.rows[0].count;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('========================================');
    console.log('✅ Refresh Complete!');
    console.log('========================================');
    console.log(`Duration: ${duration}s`);
    console.log(`Processed: ${opportunities.length} opportunities`);
    console.log(`  - New: ${stats.new}`);
    console.log(`  - Updated: ${stats.updated}`);
    console.log(`  - Errors: ${stats.error}`);
    console.log(`Total in cache: ${totalCached}`);
    console.log('========================================');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ Refresh Failed!');
    console.error('========================================');
    console.error('Error:', error);
    console.error('========================================');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run refresh
refreshOpportunities();
