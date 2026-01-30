import { query } from './src/utils/database.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    const sqlPath = path.join(process.cwd(), 'migrations', '055_create_contract_awards.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration from:', sqlPath);

    await query(sql);
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

runMigration();
