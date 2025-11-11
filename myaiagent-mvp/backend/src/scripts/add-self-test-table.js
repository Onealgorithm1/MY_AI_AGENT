import { query } from '../utils/database.js';

/**
 * Database migration: Add system_health_checks table for self-testing
 */

async function addSelfTestTable() {
  console.log('📊 Adding system_health_checks table...');

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_health_checks (
        id SERIAL PRIMARY KEY,
        check_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        details JSONB NOT NULL,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ system_health_checks table created');

    // Add indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_health_checks_type_time
      ON system_health_checks(check_type, checked_at DESC);
    `);

    console.log('✅ Indexes created');

    // Insert initial health check
    await query(`
      INSERT INTO system_health_checks
      (check_type, status, details)
      VALUES ('initialization', 'healthy', '{"message": "Self-testing system initialized"}')
    `);

    console.log('✅ Initial health check inserted');
    console.log('🎉 Self-testing system ready!');

  } catch (error) {
    console.error('❌ Error setting up self-testing table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addSelfTestTable()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export default addSelfTestTable;
