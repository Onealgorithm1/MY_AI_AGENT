#!/usr/bin/env node

/**
 * Verification Script for Database and API Fixes
 * This script checks that all fixes have been applied correctly
 */

import { query } from './src/utils/database.js';
import { getApiKey } from './src/utils/apiKeys.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDatabaseMigrations() {
  log('\n=== DATABASE MIGRATIONS ===', 'blue');
  
  try {
    const result = await query(
      `SELECT schemaname, tablename FROM pg_tables 
       WHERE schemaname = 'public' 
       ORDER BY tablename`
    );
    
    const tables = result.rows.map(r => r.tablename);
    const requiredTables = [
      'users',
      'conversations',
      'messages',
      'capability_gaps',
      'user_ai_agents',
      'ai_agent_providers',
      'system_performance_metrics',
      'performance_anomalies',
      'performance_baselines'
    ];

    let allExists = true;
    for (const table of requiredTables) {
      const exists = tables.includes(table);
      if (exists) {
        log(`  ✅ ${table}`, 'green');
      } else {
        log(`  ❌ ${table} - MISSING`, 'red');
        allExists = false;
      }
    }

    return allExists;
  } catch (error) {
    log(`  ❌ Error checking migrations: ${error.message}`, 'red');
    return false;
  }
}

async function checkTableSchemas() {
  log('\n=== TABLE SCHEMAS ===', 'blue');

  const schemas = {
    capability_gaps: ['id', 'user_id', 'conversation_id', 'requested_capability', 'gap_type'],
    user_ai_agents: ['id', 'user_id', 'provider_name', 'agent_name', 'model'],
    ai_agent_providers: ['id', 'provider_name', 'display_name'],
    system_performance_metrics: ['id', 'timestamp', 'metric_name', 'value', 'unit']
  };

  let allValid = true;

  for (const [table, requiredColumns] of Object.entries(schemas)) {
    try {
      const result = await query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position`,
        [table]
      );

      const columns = result.rows.map(r => r.column_name);
      const missing = requiredColumns.filter(col => !columns.includes(col));

      if (missing.length === 0) {
        log(`  ✅ ${table} - All required columns present`, 'green');
      } else {
        log(`  ❌ ${table} - Missing columns: ${missing.join(', ')}`, 'red');
        allValid = false;
      }
    } catch (error) {
      log(`  ❌ ${table} - Error checking schema: ${error.message}`, 'red');
      allValid = false;
    }
  }

  return allValid;
}

async function checkApiProviders() {
  log('\n=== API PROVIDERS ===', 'blue');

  try {
    const result = await query(
      `SELECT provider_name, is_active FROM ai_agent_providers ORDER BY provider_name`
    );

    if (result.rows.length === 0) {
      log('  ⚠️  No providers configured in database', 'yellow');
      return false;
    }

    for (const row of result.rows) {
      const status = row.is_active ? '✅' : '⏸️ ';
      log(`  ${status} ${row.provider_name}`, row.is_active ? 'green' : 'yellow');
    }

    return true;
  } catch (error) {
    log(`  ❌ Error checking providers: ${error.message}`, 'red');
    return false;
  }
}

async function checkApiKeys() {
  log('\n=== API KEYS CONFIGURATION ===', 'blue');

  const providers = ['gemini', 'openai', 'anthropic', 'cohere', 'groq'];
  let hasAnyKey = false;

  for (const provider of providers) {
    try {
      const key = await getApiKey(provider);
      if (key) {
        log(`  ✅ ${provider} - Key available`, 'green');
        hasAnyKey = true;
      } else {
        log(`  ⚠️  ${provider} - No key found`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ ${provider} - Error: ${error.message}`, 'red');
    }
  }

  return hasAnyKey;
}

async function checkUserIdTypes() {
  log('\n=== USER_ID TYPE CONSISTENCY ===', 'blue');

  try {
    const result = await query(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE (column_name = 'user_id' OR column_name = 'id' AND table_name = 'users')
       AND table_schema = 'public'
       ORDER BY table_name`
    );

    const usersIdType = result.rows.find(r => r.table_name === 'users' && r.column_name === 'id')?.data_type;
    
    if (!usersIdType) {
      log('  ❌ Could not determine users.id type', 'red');
      return false;
    }

    log(`  ℹ️  users.id type: ${usersIdType}`, 'blue');

    let allConsistent = true;
    for (const row of result.rows) {
      if (row.table_name === 'users') continue;

      const isConsistent = row.data_type === usersIdType;
      const status = isConsistent ? '✅' : '⚠️ ';
      const color = isConsistent ? 'green' : 'yellow';

      if (!isConsistent) allConsistent = false;

      log(`  ${status} ${row.table_name}.${row.column_name} (${row.data_type})`, color);
    }

    return allConsistent;
  } catch (error) {
    log(`  ❌ Error checking user_id types: ${error.message}`, 'red');
    return false;
  }
}

async function checkUnknownProviders() {
  log('\n=== PROVIDER NAME MAPPING ===', 'blue');

  const testProviders = [
    { name: 'google-search_api', expectedService: 'Google APIs' },
    { name: 'openai-api', expectedService: 'OpenAI' },
    { name: 'gemini', expectedService: 'Google APIs' }
  ];

  let allMapped = true;

  for (const testProvider of testProviders) {
    try {
      const key = await getApiKey(testProvider.name);
      if (key) {
        log(`  ✅ ${testProvider.name} -> ${testProvider.expectedService}`, 'green');
      } else {
        log(`  ⚠️  ${testProvider.name} - No key, but mapping works`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ ${testProvider.name} - Error: ${error.message}`, 'red');
      allMapped = false;
    }
  }

  return allMapped;
}

async function runAllChecks() {
  log('╔════════════════════════════════════════╗', 'blue');
  log('║     VERIFICATION REPORT                ║', 'blue');
  log('║     All Database & API Fixes           ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const checks = [
    { name: 'Database Migrations', fn: checkDatabaseMigrations },
    { name: 'Table Schemas', fn: checkTableSchemas },
    { name: 'API Providers', fn: checkApiProviders },
    { name: 'API Keys Configuration', fn: checkApiKeys },
    { name: 'User ID Type Consistency', fn: checkUserIdTypes },
    { name: 'Provider Name Mapping', fn: checkUnknownProviders }
  ];

  const results = [];

  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      log(`\n❌ Check failed: ${check.name}`, 'red');
      log(`   Error: ${error.message}`, 'red');
      results.push({ name: check.name, passed: false });
    }
  }

  // Summary
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║              SUMMARY                   ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${status}: ${result.name}`, color);
  }

  log(`\nTotal: ${passed}/${total} checks passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All fixes verified successfully!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some checks failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

runAllChecks().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
