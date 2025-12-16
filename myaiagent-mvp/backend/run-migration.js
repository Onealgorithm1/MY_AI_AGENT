#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('📦 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '031_create_usage_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n🔨 Executing migration: 031_create_usage_tracking.sql...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    console.log('📊 Verifying tables...');
    
    // Verify usage_tracking table exists
    const checkUsageTracking = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'usage_tracking'
      )`
    );
    
    // Verify settings column exists
    const checkSettings = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'settings'
      )`
    );

    if (checkUsageTracking.rows[0].exists) {
      console.log('✅ usage_tracking table created successfully');
    } else {
      console.error('❌ usage_tracking table was not created');
    }

    if (checkSettings.rows[0].exists) {
      console.log('✅ settings column added to users table');
    } else {
      console.error('❌ settings column was not added to users table');
    }

    console.log('\n✨ Migration completed! The database is now ready for login.');
    console.log('\nNext steps:');
    console.log('1. Restart the backend: pm2 restart myaiagent-backend');
    console.log('2. Try logging in with: admin@myaiagent.com / admin123');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
