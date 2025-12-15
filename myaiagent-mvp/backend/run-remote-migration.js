#!/usr/bin/env node

/**
 * Remote Migration Runner
 * 
 * This script can be used to run database migrations on a production server.
 * Usage: node run-remote-migration.js <DATABASE_URL>
 * 
 * Example:
 * node run-remote-migration.js "postgresql://user:pass@host:5432/db"
 * 
 * Or with environment variable:
 * DATABASE_URL="postgresql://user:pass@host:5432/db" node run-remote-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  console.error('Usage: node run-remote-migration.js <DATABASE_URL>');
  console.error('Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for most cloud databases
  });

  try {
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('❌ Migrations directory not found:', migrationsDir);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run in order

    console.log(`📁 Found ${files.length} migration files\n`);

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      console.log(`⏳ Running migration: ${file}`);

      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ Successfully applied: ${file}\n`);
        successCount++;
      } catch (error) {
        // If error is about object already existing, it's safe to continue
        if (error.message.includes('already exists') || error.code === '42P07') {
          console.log(`⏭️  Skipped (already exists): ${file}\n`);
          skippedCount++;
        } else {
          console.error(`❌ Failed: ${file}`);
          console.error(`   Error: ${error.message}\n`);
          failedCount++;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Succeeded: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);

    if (failedCount > 0) {
      console.log('\n⚠️  Some migrations failed. Please review the errors above.');
      process.exit(1);
    }

    console.log('\n🎉 All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
