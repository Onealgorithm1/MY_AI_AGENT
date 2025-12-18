
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../../');
const envPath = path.join(rootDir, '.env');

async function tryConnect() {
    const connectionStrings = [
        'postgres://postgres:postgres@localhost:5432/postgres', // Standard
        'postgres://postgres:admin@localhost:5432/postgres',    // Common alternative
        'postgres://postgres:1234@localhost:5432/postgres',     // Common weak
        'postgres://postgres@localhost:5432/postgres',          // No password
        'postgres://root@localhost:5432/postgres',              // Root user
    ];

    for (const connStr of connectionStrings) {
        // Mask password in logs
        console.log(`Trying connection: ${connStr.replace(/:[^:@]+@/, ':****@')}`);
        const client = new Client({ connectionString: connStr });
        try {
            await client.connect();
            console.log('✅ Connected successfully!');
            return { client, connectionString: connStr };
        } catch (err) {
            console.log(`   Failed: ${err.message}`);
        }
    }
    throw new Error('Could not connect to PostgreSQL with any common credentials.');
}

async function initDevDb() {
    console.log('🚀 Starting fresh database initialization...');

    let client;
    let successConnString;

    try {
        const result = await tryConnect();
        client = result.client;
        successConnString = result.connectionString;
    } catch (err) {
        console.error('❌ All connection attempts failed.');
        console.error('Please ensure Local Postgres is running.');
        process.exit(1);
    }

    try {
        // 2. Drop and Create Database
        const dbName = 'myaiagent_dev';

        // Terminate other connections to the database to allow dropping
        await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
    `);

        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
        console.log(`🗑️  Dropped existing ${dbName} (if any).`);

        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`✨ Created new database: ${dbName}`);

    } catch (err) {
        console.error('❌ Database creation failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 3. Update .env file
    try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Construct new DB URL using the successful base credentials but pointing to the new DB
        const baseConn = successConnString.substring(0, successConnString.lastIndexOf('/'));
        const newDbUrl = `${baseConn}/myaiagent_dev`;

        // Replace or Append DATABASE_URL
        if (envContent.includes('DATABASE_URL=')) {
            envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${newDbUrl}`);
        } else {
            envContent += `\nDATABASE_URL=${newDbUrl}\n`;
        }

        // Ensure JWT_SECRET is present (if setup-env.js was skipped or failed)
        if (!envContent.includes('JWT_SECRET=')) {
            const crypto = await import('crypto');
            const secret = crypto.randomBytes(32).toString('hex');
            envContent += `\nJWT_SECRET=${secret}\n`;
            console.log('🔑 Added missing JWT_SECRET.');
        }

        fs.writeFileSync(envPath, envContent);
        console.log('📝 Updated .env with new DATABASE_URL.');

    } catch (err) {
        console.error('❌ Failed to update .env:', err.message);
        process.exit(1);
    }

    // 4. Run Migrations & Seeds
    try {
        console.log('\n📦 Running migrations...');
        execSync('npm run migrate', { stdio: 'inherit', cwd: rootDir });

        console.log('\n🌱 Seeding database...');
        execSync('npm run seed', { stdio: 'inherit', cwd: rootDir });

        console.log('\n✅ Database initialization complete!');
        console.log('👉 Please RESTART your backend server to pick up the new .env configuration.');

    } catch (err) {
        console.error('❌ Failed to run migrations or seed:', err.message);
        process.exit(1);
    }
}

initDevDb();
