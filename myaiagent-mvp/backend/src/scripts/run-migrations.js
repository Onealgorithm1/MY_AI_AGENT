import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run in order

    console.log(`📁 Found ${files.length} migration files\n`);

    for (const file of files) {
      console.log(`⏳ Running migration: ${file}`);

      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ Successfully applied: ${file}\n`);
      } catch (error) {
        // If error is about object already existing, it's safe to continue
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Skipped (already exists): ${file}\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
