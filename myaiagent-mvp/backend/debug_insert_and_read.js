import pool from './src/utils/database.js';

async function testJsonStorage() {
    try {
        const dummyData = {
            noticeId: "TIMETEST_" + Date.now(),
            title: "Full JSON Example for User",
            solicitationNumber: "SOL-123",
            department: "Test Dept",
            raw_data_content: "This is the raw content"
        };

        // Insert
        const insertRes = await pool.query(
            `INSERT INTO samgov_opportunities_cache (notice_id, title, raw_data, organization_id) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
            [dummyData.noticeId, dummyData.title, JSON.stringify(dummyData), 1] // explicit org_id 1
        );
        console.log('Inserted ID:', insertRes.rows[0].id);

        // Read Back
        const readRes = await pool.query(
            `SELECT raw_data FROM samgov_opportunities_cache WHERE id = $1`,
            [insertRes.rows[0].id]
        );

        console.log('--- RETRIEVED JSON ---');
        console.log(JSON.stringify(readRes.rows[0].raw_data, null, 2));

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        pool.end();
    }
}

testJsonStorage();
