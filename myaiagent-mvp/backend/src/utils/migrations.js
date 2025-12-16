import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('⏭️  Migrations directory not found, skipping...');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ensures files run in order (001, 002, 003, etc.)

  if (files.length === 0) {
    console.log('⏭️  No migration files found');
    return;
  }

  console.log(`\n📋 Found ${files.length} migration files, running...\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    try {
      console.log(`⏳ Running: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await query(sql);
      console.log(`✅ Completed: ${file}`);
    } catch (error) {
      // Skip if tables already exist
      if (error.code === '42P07' || error.code === '42710' || 
          error.message?.includes('already exists')) {
        console.log(`⏭️  Skipped: ${file} (already exists)`);
      } else {
        console.error(`⚠️  Warning in ${file}:`, error.message);
      }
    }
  }

  console.log('\n✅ Migrations completed!\n');
}

export default runMigrations;
