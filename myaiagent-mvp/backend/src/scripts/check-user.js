import { query } from '../utils/database.js';

async function checkUser() {
    try {
        const email = 'admin@myaiagent.com';
        console.log(`Checking user: ${email}`);

        const res = await query('SELECT id, email, full_name, role, is_active, password_hash FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.log('User not found!');
        } else {
            console.log('User found:', res.rows[0]);

            // Also check organization roles
            const orgRes = await query('SELECT * FROM organization_users WHERE user_id = $1', [res.rows[0].id]);
            console.log('Organization roles:', orgRes.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
