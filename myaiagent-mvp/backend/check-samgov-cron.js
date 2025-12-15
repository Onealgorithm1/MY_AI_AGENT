#!/usr/bin/env node

/**
 * SAM.gov Cron Job Diagnostic Script
 * 
 * Checks:
 * 1. If SAM_GOV_API_KEY is configured
 * 2. Database connectivity
 * 3. When SAM.gov opportunities were last updated
 * 4. How many opportunities are cached
 * 5. If cron job is likely running
 * 
 * Usage: node check-samgov-cron.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

async function checkSAMGovCron() {
  log('cyan', '========================================');
  log('cyan', '🔍 SAM.gov Cron Job Status Check');
  log('cyan', '========================================');
  console.log('');

  // 1. Check API Key
  log('blue', '1️⃣  Configuration Check');
  log('blue', '─────────────────────');
  
  if (process.env.SAM_GOV_API_KEY) {
    const keyPreview = process.env.SAM_GOV_API_KEY.substring(0, 10) + '...';
    log('green', `✅ SAM_GOV_API_KEY is configured (${keyPreview})`);
  } else {
    log('red', '❌ SAM_GOV_API_KEY is NOT configured');
    log('red', '   ⚠️  The cron job cannot run without this API key');
  }
  console.log('');

  // 2. Test database connection
  log('blue', '2️⃣  Database Connectivity Check');
  log('blue', '───────────────────────────────');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'myaiagent',
    user: process.env.DB_USER || 'myaiagent',
    password: process.env.DB_PASSWORD,
  });

  try {
    const result = await pool.query('SELECT NOW()');
    log('green', `✅ Database connected successfully`);
    console.log(`   Connected to: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'myaiagent'}`);
    console.log('');

    // 3. Check cache statistics
    log('blue', '3️⃣  SAM.gov Cache Statistics');
    log('blue', '─────────────────────────────');

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_cached,
        MAX(last_seen_at) as last_refresh_time,
        MIN(first_seen_at) as first_cached_time,
        AVG(seen_count) as avg_seen_count,
        COUNT(CASE WHEN last_seen_at > NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour,
        COUNT(CASE WHEN last_seen_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_last_24h,
        COUNT(CASE WHEN last_seen_at > NOW() - INTERVAL '7 days' THEN 1 END) as updated_last_7d
      FROM samgov_opportunities_cache
    `);

    const stats = statsResult.rows[0];
    const totalCached = parseInt(stats.total_cached);
    
    if (totalCached === 0) {
      log('yellow', `⚠️  No cached opportunities found`);
      log('yellow', '   The cache appears to be empty');
    } else {
      log('green', `✅ Total cached opportunities: ${totalCached}`);
    }

    const lastRefreshTime = stats.last_refresh_time ? new Date(stats.last_refresh_time) : null;
    if (lastRefreshTime) {
      const now = new Date();
      const diffMinutes = Math.round((now - lastRefreshTime) / 1000 / 60);
      const diffHours = Math.round(diffMinutes / 60);
      
      console.log(`   Last refresh: ${lastRefreshTime.toISOString()}`);
      
      if (diffMinutes < 70) {
        log('green', `   ✅ Cron appears HEALTHY (updated ${diffMinutes} minutes ago)`);
      } else if (diffHours < 24) {
        log('yellow', `   ⚠️  Cron may be STALE (last update ${diffHours} hours ago)`);
      } else {
        log('red', `   ❌ Cron appears OFFLINE (last update ${diffHours} hours ago)`);
      }
    } else {
      log('red', '   ❌ No refresh history found');
    }

    const firstCachedTime = stats.first_cached_time ? new Date(stats.first_cached_time).toISOString() : null;
    if (firstCachedTime) {
      console.log(`   First cached: ${firstCachedTime}`);
    }

    console.log('');
    console.log(`   Recent activity:`);
    console.log(`     • Updated in last 1 hour: ${stats.updated_last_hour} opportunities`);
    console.log(`     • Updated in last 24 hours: ${stats.updated_last_24h} opportunities`);
    console.log(`     • Updated in last 7 days: ${stats.updated_last_7d} opportunities`);
    console.log(`     • Average times seen: ${parseFloat(stats.avg_seen_count).toFixed(2)}`);
    console.log('');

    // 4. Cron job status
    log('blue', '4️⃣  Cron Job Status');
    log('blue', '──────────────────');

    const cronCheckCmd = `crontab -l 2>/dev/null | grep -c "refresh-samgov"`;
    
    // We can't actually run shell commands here, so provide instructions
    console.log('   To check if cron job is configured, run:');
    log('cyan', '   $ crontab -l | grep refresh-samgov');
    console.log('');
    console.log('   To see cron execution logs, run:');
    log('cyan', '   $ grep CRON /var/log/syslog | tail -20');
    console.log('');

    // 5. Recommendations
    log('blue', '5️⃣  Recommendations');
    log('blue', '───────────────────');

    const issues = [];

    if (!process.env.SAM_GOV_API_KEY) {
      issues.push({
        severity: 'critical',
        message: 'SAM_GOV_API_KEY not configured - cron cannot run',
        action: 'Set SAM_GOV_API_KEY environment variable',
      });
    }

    if (totalCached === 0) {
      issues.push({
        severity: 'high',
        message: 'Cache is empty - cron has never run',
        action: 'Run: node refresh-samgov-opportunities.js',
      });
    }

    if (lastRefreshTime) {
      const diffMinutes = Math.round((new Date() - lastRefreshTime) / 1000 / 60);
      if (diffMinutes > 1500) {
        issues.push({
          severity: 'high',
          message: 'Cron job appears to be offline',
          action: 'Run: bash setup-hourly-refresh.sh',
        });
      }
    }

    if (issues.length === 0) {
      log('green', '✅ No issues detected. SAM.gov cron job appears to be running normally.');
    } else {
      log('red', `⚠️  Found ${issues.length} issue(s):`);
      console.log('');
      
      issues.forEach((issue, index) => {
        const prefix = issue.severity === 'critical' ? '🚨' : '⚠️ ';
        log(issue.severity === 'critical' ? 'red' : 'yellow', `   ${index + 1}. ${prefix} ${issue.message}`);
        console.log(`      Action: ${issue.action}`);
      });
    }

    console.log('');
    log('cyan', '========================================');
    log('cyan', '✅ Diagnostic Complete');
    log('cyan', '========================================');

  } catch (error) {
    log('red', `❌ Database connection failed`);
    console.error('Error:', error.message);
    console.log('');
    log('yellow', 'Make sure:');
    console.log('  1. Database is running');
    console.log('  2. DB_HOST, DB_NAME, DB_USER, DB_PASSWORD are set in .env');
    console.log('  3. migrations have been run');
  } finally {
    await pool.end();
  }
}

// Run the diagnostic
checkSAMGovCron().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
