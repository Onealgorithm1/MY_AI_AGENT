import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('📋 Reading URL cache migration file...');
    const migrationPath = path.join(__dirname, 'migrations', '012_url_content_cache.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Executing migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify tables were created
    console.log('\n📊 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('url_cache', 'url_summaries')
      ORDER BY table_name
    `);

    console.log('Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check indexes
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('url_cache', 'url_summaries')
      ORDER BY indexname
    `);

    console.log('\nCreated indexes:');
    indexResult.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
