#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Fixing authentication schema...\n');
    
    console.log('📁 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations', '029_fix_auth_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⏳ Applying migration to database...');
    await pool.query(migrationSQL);
    
    console.log('✅ Auth schema migration completed successfully!\n');
    
    // Verify columns exist
    console.log('🔍 Verifying schema changes...');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('is_active', 'phone', 'profile_image', 'google_id', 'profile_picture')
      ORDER BY column_name;
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ New columns found in users table:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️  No new columns found - they may already exist');
    }
    
    // Also verify search_history table
    console.log('\n🔍 Verifying search_history table...');
    const searchResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'search_history'
      ORDER BY column_name;
    `);
    
    if (searchResult.rows.length > 0) {
      console.log('✅ search_history table has the following columns:');
      searchResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️  search_history table not found or empty');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Schema verification complete!');
    console.log('='.repeat(50));
    console.log('\n📋 Next steps:');
    console.log('   1. Restart backend: pm2 restart myaiagent-backend');
    console.log('   2. Try logging in at https://werkules.com');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
