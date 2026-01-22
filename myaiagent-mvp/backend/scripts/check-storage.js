import pool from '../src/utils/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables manually since we are running a script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkStorage() {

    try {
        const tables = [
            'opportunities',
            'samgov_opportunities_cache',
            'samgov_documents',
            'fpds_contract_awards',
            'incumbent_analysis',
            'competitive_intelligence',
            'samgov_search_history',
            'attachments'
        ];

        const results = [];
        let totalSize = 0;

        for (const table of tables) {
            // Check if table exists first
            const existsRes = await pool.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                [table]
            );

            if (!existsRes.rows[0].exists) {
                continue;
            }

            // Get size and row count
            const sizeRes = await pool.query(
                "SELECT pg_total_relation_size($1) as size_bytes, pg_size_pretty(pg_total_relation_size($1)) as size_pretty",
                [table]
            );

            const countRes = await pool.query(`SELECT count(*) as count FROM ${table}`);

            const bytes = parseInt(sizeRes.rows[0].size_bytes);
            totalSize += bytes;

            results.push({
                table,
                size: sizeRes.rows[0].size_pretty,
                bytes: bytes,
                rows: parseInt(countRes.rows[0].count)
            });
        }

        // Sort by size
        results.sort((a, b) => b.bytes - a.bytes);

        console.log('JSON_RESULT:' + JSON.stringify({
            total_mb: (totalSize / (1024 * 1024)).toFixed(2),
            breakdown: results.map(r => ({ table: r.table, size: r.size, rows: r.rows }))
        }));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkStorage();
