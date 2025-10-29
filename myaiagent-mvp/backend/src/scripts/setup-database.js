import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  console.log('🔧 Setting up database...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing schema...');
    await pool.query(schema);
    console.log('✅ Database schema created successfully!');

    // Create default admin user
    console.log('\n👤 Creating default admin user...');
    const bcrypt = await import('bcryptjs');
    const adminPassword = await bcrypt.default.hash('admin123', 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@myaiagent.com', adminPassword, 'Admin User', 'admin', true]
    );

    console.log('✅ Default admin created: admin@myaiagent.com / admin123');
    console.log('⚠️  IMPORTANT: Change this password in production!');

    console.log('\n🎉 Database setup complete!\n');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
