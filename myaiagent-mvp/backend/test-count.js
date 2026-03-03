import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
    try {
        const r = await client.query('SELECT COUNT(*) FROM samgov_opportunities_cache');
        console.log("TOTAL DB ROWS EXACT: " + r.rows[0].count);

        const r2 = await client.query('EXPLAIN (FORMAT JSON) SELECT * FROM samgov_opportunities_cache WHERE response_deadline >= CURRENT_TIMESTAMP');
        console.log("ESTIMATED ACTIVE ROWS: " + r2.rows[0]['QUERY PLAN'][0].Plan['Plan Rows']);

    } catch (e) {
        console.error(e);
    } finally {
        client.end();
    }
});
