import { query } from './src/utils/database.js';
import { hashPassword } from './src/utils/auth.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedDemoUser() {
  try {
    console.log('🌱 Seeding demo user...');

    // Check if user already exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@myaiagent.com']
    );

    if (existing.rows.length > 0) {
      console.log('ℹ️  Demo user already exists with ID:', existing.rows[0].id);
      return;
    }

    // Hash the password
    const passwordHash = await hashPassword('admin123');

    // Create demo user (Master Admin)
    const userResult = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE 
       SET role = 'master_admin', is_active = true, email_verified = true
       RETURNING id, email, full_name, role, created_at`,
      ['admin@myaiagent.com', passwordHash, 'Master Admin User', 'master_admin', true, true]
    );

    const user = userResult.rows[0];
    console.log('✅ Master Admin user ready');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);

    // Create default organization for demo user
    const orgResult = await query(
      `INSERT INTO organizations (name, slug, owner_id, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (slug) DO UPDATE SET is_active = true
       RETURNING id, name, slug`,
      ['Demo Organization', 'demo-org', user.id]
    );

    const organization = orgResult.rows[0];
    console.log('✅ Demo organization ready:', organization.name);

    // Add Master Admin as owner of organization
    await query(
      `INSERT INTO organization_users (organization_id, user_id, role, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner'`,
      [organization.id, user.id, 'owner']
    );

    // --- Create Org Admin User ---
    const orgAdminResult = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE 
       SET role = 'user', is_active = true, email_verified = true
       RETURNING id, email, full_name, role`,
      ['orgadmin@myaiagent.com', passwordHash, 'Org Admin User', 'user', true, true]
    );

    const orgAdmin = orgAdminResult.rows[0];
    console.log('✅ Org Admin user ready');
    console.log('   Email:', orgAdmin.email);

    // Add Org Admin to the same organization with 'admin' role
    await query(
      `INSERT INTO organization_users (organization_id, user_id, role, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin'`,
      [organization.id, orgAdmin.id, 'admin']
    );
    console.log('✅ Org Admin assigned to organization');

    // Initialize usage tracking
    await query(
      `INSERT INTO usage_tracking (user_id, organization_id, date)
       VALUES ($1, $2, CURRENT_DATE), ($3, $2, CURRENT_DATE)
       ON CONFLICT (user_id, organization_id, date) DO NOTHING`,
      [user.id, organization.id, orgAdmin.id]
    );

    console.log('✅ Usage tracking initialized');
    console.log('\n📋 Credentials:');
    console.log('   1. Master Admin: admin@myaiagent.com / admin123');
    console.log('   2. Org Admin:    orgadmin@myaiagent.com / admin123');

  } catch (error) {
    console.error('❌ Error seeding demo user:', error);
    process.exit(1);
  }
}

seedDemoUser().then(() => {
  console.log('\n✨ Seeding completed successfully');
  process.exit(0);
});
