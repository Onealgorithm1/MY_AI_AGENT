import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Errors that are safe to ignore (idempotent operations)
const SAFE_ERROR_CODES = [
  '42P07', // DUPLICATE_TABLE - table already exists
  '42701', // DUPLICATE_COLUMN - column already exists
  '42P14', // DUPLICATE_INDEX - index already exists
  '42710', // DUPLICATE_OBJECT - trigger already exists
  '23505', // UNIQUE_VIOLATION - unique constraint violation (from insert)
];

const SAFE_ERROR_MESSAGES = [
  'already exists',
  'column exists',
  'trigger',
  'constraint',
  'foreign key constraint',
  'already been added',
];

function isSafeError(error) {
  // Check if it's a safe code
  if (SAFE_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  // Check if error message contains safe keywords
  const errorMsg = (error.message || '').toLowerCase();
  return SAFE_ERROR_MESSAGES.some(msg => errorMsg.includes(msg));
}

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');

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
    const errors = [];

    for (const file of files) {
      console.log(`⏳ Running migration: ${file}`);

      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ Successfully applied: ${file}\n`);
        successCount++;
      } catch (error) {
        if (isSafeError(error)) {
          console.log(`⏭️  Skipped (${error.code || 'already exists'}): ${file}\n`);
          skippedCount++;
        } else {
          console.error(`❌ Error in ${file}:`);
          console.error(`   Code: ${error.code}`);
          console.error(`   Message: ${error.message}`);
          errors.push({ file, error });
          
          // Don't exit immediately - continue to try other migrations
          // This helps identify all issues
          console.log();
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.length}`);
    }
    console.log('='.repeat(50));

    if (errors.length > 0) {
      console.error('\n⚠️  Some migrations had errors:');
      errors.forEach(({ file, error }) => {
        console.error(`   - ${file}: ${error.code} - ${error.message}`);
      });
      process.exit(1);
    }

    console.log('\n🎉 All migrations completed!\n');
  } catch (error) {
    console.error('❌ Fatal migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
