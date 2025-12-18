import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { query } from '../utils/database.js';
import { generateToken } from '../utils/auth.js';
import { verifyPassword } from '../utils/auth.js';

async function testLoginFlow() {
    try {
        const email = 'admin@myaiagent.com';
        console.log(`Testing login for: ${email}`);

        // 1. Simulate Login
        const res = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const user = res.rows[0];
        console.log('User found:', user.id, user.role);

        // 2. Generate Token (simulating /login)
        const token = generateToken({ ...user, organization_id: user.organization_id }); // Note: user.organization_id might be undefined here if not fetched?
        // In real login, we fetch orgs.
        const orgResult = await query(
            `SELECT ou.organization_id, ou.role as org_role
       FROM organization_users ou
       JOIN organizations o ON o.id = ou.organization_id
       WHERE ou.user_id = $1 AND ou.is_active = TRUE AND o.is_active = TRUE
       ORDER BY ou.joined_at DESC`,
            [user.id]
        );

        let selectedOrgId = null;
        if (orgResult.rows.length > 0) {
            selectedOrgId = orgResult.rows[0].organization_id;
        }
        console.log('Selected Org ID for token:', selectedOrgId);

        const realToken = generateToken({ ...user, organization_id: selectedOrgId });

        // 3. Simulate /me endpoint authentication
        // Mimic middleware logic
        const decoded = { id: user.id, organization_id: selectedOrgId };

        // Logic from auth.js middleware
        // let targetOrgId = req.headers['x-organization-id'] ? ... : decoded.organization_id;

        // Case A: No header (First load)
        let targetOrgId = decoded.organization_id;
        console.log('Testing middleware with targetOrgId:', targetOrgId);

        if (targetOrgId) {
            const orgCheck = await query(
                `SELECT ou.organization_id, ou.role as org_role, o.name as org_name, o.slug as org_slug
         FROM organization_users ou
         JOIN organizations o ON o.id = ou.organization_id
         WHERE ou.user_id = $1 AND ou.organization_id = $2 AND ou.is_active = TRUE`,
                [user.id, targetOrgId]
            );
            console.log('Org Check Result Rows:', orgCheck.rows.length);
        } else {
            console.log('No targetOrgId to check');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testLoginFlow();
