#!/usr/bin/env node

/**
 * Script to add Google Search API credentials to database
 * This adds both the API key and Custom Search Engine ID
 */

import pg from 'pg';
import { encryptSecret } from './myaiagent-mvp/backend/src/services/secrets.js';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addGoogleSearchCredentials() {
  const client = await pool.connect();

  try {
    console.log('🔧 Adding Google Search credentials to database...\n');

    // Google Search API Key
    const apiKey = 'AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls';
    const searchEngineId = 'd4fcebd01520d41a0';

    // Encrypt the credentials
    const encryptedApiKey = encryptSecret(apiKey);
    const encryptedSearchEngineId = encryptSecret(searchEngineId);

    // Add API Key
    console.log('📝 Adding GOOGLE_SEARCH_API_KEY...');
    await client.query(`
      INSERT INTO api_secrets (
        service_name,
        key_name,
        key_value,
        key_label,
        is_default,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (service_name, key_name)
      DO UPDATE SET
        key_value = EXCLUDED.key_value,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `, [
      'Google',
      'GOOGLE_SEARCH_API_KEY',
      encryptedApiKey,
      'Production API Key',
      true,
      true
    ]);
    console.log('✅ GOOGLE_SEARCH_API_KEY added successfully\n');

    // Add Search Engine ID
    console.log('📝 Adding GOOGLE_SEARCH_ENGINE_ID...');
    await client.query(`
      INSERT INTO api_secrets (
        service_name,
        key_name,
        key_value,
        key_label,
        is_default,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (service_name, key_name)
      DO UPDATE SET
        key_value = EXCLUDED.key_value,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `, [
      'Google',
      'GOOGLE_SEARCH_ENGINE_ID',
      encryptedSearchEngineId,
      'Custom Search Engine ID',
      true,
      true
    ]);
    console.log('✅ GOOGLE_SEARCH_ENGINE_ID added successfully\n');

    // Verify the credentials
    console.log('🔍 Verifying credentials...');
    const result = await client.query(`
      SELECT key_name, key_label, is_active, created_at
      FROM api_secrets
      WHERE key_name IN ('GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID')
      ORDER BY key_name
    `);

    console.log('\n📊 Current Google Search credentials in database:');
    console.table(result.rows);

    console.log('\n✅ All Google Search credentials added successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Test web search with: "what time is it in New York"');
    console.log('   3. Check backend logs for confirmation\n');

  } catch (error) {
    console.error('❌ Error adding credentials:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addGoogleSearchCredentials().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
