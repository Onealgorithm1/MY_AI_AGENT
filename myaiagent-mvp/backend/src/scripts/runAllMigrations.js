import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function executeSQLFile(filePath) {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    return true;
  } catch (error) {
    // If table already exists, it's not an error
    if (error.code === '42P07' || error.code === '42710' || 
        error.message?.includes('already exists')) {
      console.log(`⏭️  Skipped: ${path.basename(filePath)} (already exists)`);
      return true;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Database Migration Runner');
  console.log('='.repeat(60) + '\n');

  const migrationsDir = path.join(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // This ensures files run in order (001, 002, 003, etc.)

  if (files.length === 0) {
    console.error('❌ No migration files found in', migrationsDir);
    process.exit(1);
  }

  console.log(`📋 Found ${files.length} migration files\n`);

  let successful = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    try {
      console.log(`⏳ Running: ${file}`);
      await executeSQLFile(filePath);
      console.log(`✅ Completed: ${file}\n`);
      successful++;
    } catch (error) {
      console.error(`❌ Failed: ${file}`);
      console.error(`   Error: ${error.message}\n`);
      failed++;
      // Continue with next migration instead of stopping
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📋 Total: ${files.length}\n`);

  if (failed === 0) {
    console.log('🎉 All migrations completed successfully!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some migrations failed. Check the errors above.\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runMigrations().catch(error => {
  console.error('❌ Migration runner error:', error);
  process.exit(1);
});
