
import pg from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../../');

async function initLocalDb() {
    console.log('🚀 Starting local database initialization...');

    // Connect to default 'postgres' database to create the new one
    const client = new Client({
        connectionString: 'postgresql://postgres:root@localhost:5432/postgres'
    });

    try {
        await client.connect();
        console.log('✅ Connected to postgres database.');
    } catch (err) {
        console.error('❌ Failed to connect to postgres database:', err.message);
        console.error('Check your credentials (postgres/root) and ensure PostgreSQL is running.');
        process.exit(1);
    }

    try {
        const dbName = 'myaiagent_db';

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✨ Created database: ${dbName}`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }

    } catch (err) {
        console.error('❌ Database access/creation failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // Run migrations and seeds
    try {
        console.log('\n📦 Running migrations...');
        execSync('npm run migrate', { stdio: 'inherit', cwd: rootDir });

        console.log('\n🌱 Seeding database...');
        execSync('npm run seed', { stdio: 'inherit', cwd: rootDir });

        console.log('\n✅ Database initialization complete!');
    } catch (err) {
        console.error('❌ Failed to run migrations or seed:', err.message);
        // Don't exit here, maybe the DB is fine but seeds failed
    }
}

initLocalDb();
