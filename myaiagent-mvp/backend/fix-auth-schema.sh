#!/bin/bash

# Fix Auth Schema Migration Script
# Run this on your production server in the backend directory

set -e

echo "🔧 Fixing authentication schema on production database..."
echo

# Make sure we're in the backend directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in backend directory. Please run this script from myaiagent-mvp/backend/"
  exit 1
fi

# Run the new migration specifically
echo "Running auth schema migration..."
npx ts-node << 'EOF'
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📁 Reading migration file...');
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations/029_fix_auth_schema.sql'), 'utf8');
    
    console.log('⏳ Applying migration to database...');
    await pool.query(migrationSQL);
    
    console.log('✅ Auth schema migration completed successfully!');
    
    // Verify columns exist
    console.log('\n🔍 Verifying schema changes...');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('is_active', 'phone', 'profile_image', 'google_id', 'profile_picture')
      ORDER BY column_name;
    `);
    
    if (result.rows.length > 0) {
      console.log('\n✅ New columns found in users table:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n⚠️  No new columns found - they may already exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
EOF

echo
echo "✅ Done! Your database schema has been updated."
echo
echo "Next steps:"
echo "1. Restart your backend server: pm2 restart myaiagent-backend"
echo "2. Try logging in again"
