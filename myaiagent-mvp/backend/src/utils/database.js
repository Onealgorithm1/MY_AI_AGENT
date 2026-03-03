import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database configuration with performance optimizations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 25,
  min: 5,
  idleTimeoutMillis: 600000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 120000,
  query_timeout: 120000,
  application_name: 'werkules-backend',
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  // Only log unexpected errors (not connection terminations from pool management)
  if (err.code !== '57P01' && err.code !== 'ECONNRESET') {
    console.error('❌ Database error:', err);
  }
});

// Query helper with optimized logging
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn('⚠️  Slow query detected', {
        duration,
        rows: res.rowCount,
        query: text.substring(0, 100)
      });
    } else if (process.env.DEBUG_QUERIES === 'true') {
      console.log('📊 Query executed', { duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    // Suppress logging calls for "relation already exists" or "duplicate object" errors
    // These are common in idempotent migrations and are handled by the migration runner
    if (error.code !== '42P07' && error.code !== '42710') {
      console.error('❌ Query error:', error);
    }
    throw error;
  }
}

// Transaction helper
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
