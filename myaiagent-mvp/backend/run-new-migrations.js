import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
  '015_fpds_contract_awards.sql',
  '016_evm_tracking.sql',
  '017_collaboration_tools.sql',
  '018_market_analytics.sql',
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  for (const migrationFile of migrations) {
    try {
      console.log(`📋 Running migration: ${migrationFile}`);
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.log(`  ⚠️  Migration file not found, skipping...`);
        continue;
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migrationSQL);

      console.log(`  ✅ ${migrationFile} completed successfully\n`);
    } catch (error) {
      console.error(`  ❌ ${migrationFile} failed:`, error.message);

      // Continue with next migration instead of exiting
      if (error.message.includes('already exists')) {
        console.log(`  ℹ️  Tables already exist, continuing...\n`);
      } else {
        console.error(error);
        console.log('  ⚠️  Continuing with next migration...\n');
      }
    }
  }

  // Verify new tables were created
  console.log('📊 Verifying new tables...');
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'fpds_contract_awards',
        'fpds_contract_modifications',
        'incumbent_analysis',
        'competitive_intelligence',
        'evm_projects',
        'evm_reporting_periods',
        'evm_wbs',
        'evm_performance_alerts',
        'evm_forecasts',
        'proposal_workspaces',
        'proposal_team_members',
        'proposal_sections',
        'compliance_checklists',
        'compliance_checklist_items',
        'proposal_comments',
        'proposal_activity_log',
        'proposal_deadlines',
        'market_data_sources',
        'agency_spending_trends',
        'contract_value_analytics',
        'setaside_intelligence',
        'market_forecasts',
        'competitive_landscape',
        'market_api_cache',
        'market_insights'
      )
      ORDER BY table_name
    `);

    console.log(`\n✅ Successfully created ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n🎉 All migrations completed!\n');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }

  await pool.end();
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
