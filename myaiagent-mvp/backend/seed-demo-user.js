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

    // Create demo user
    const userResult = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, created_at`,
      ['admin@myaiagent.com', passwordHash, 'Admin User', 'admin', true, true]
    );

    const user = userResult.rows[0];
    console.log('✅ Demo user created successfully');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.full_name);
    console.log('   Role:', user.role);
    console.log('   Created:', user.created_at);

    // Create default organization for demo user
    const orgResult = await query(
      `INSERT INTO organizations (name, slug, owner_id, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, slug`,
      ['Demo Organization', 'demo-org', user.id]
    );

    const organization = orgResult.rows[0];
    console.log('✅ Demo organization created');
    console.log('   ID:', organization.id);
    console.log('   Name:', organization.name);
    console.log('   Slug:', organization.slug);

    // Add user as owner of organization
    await query(
      `INSERT INTO organization_users (organization_id, user_id, role, is_active)
       VALUES ($1, $2, $3, true)`,
      [organization.id, user.id, 'owner']
    );

    console.log('✅ User assigned to organization as owner');

    // Initialize usage tracking
    await query(
      `INSERT INTO usage_tracking (user_id, organization_id, date)
       VALUES ($1, $2, CURRENT_DATE)
       ON CONFLICT (user_id, organization_id, date) DO NOTHING`,
      [user.id, organization.id]
    );

    console.log('✅ Usage tracking initialized');
    console.log('\n📋 Demo account credentials:');
    console.log('   Email: admin@myaiagent.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');

  } catch (error) {
    console.error('❌ Error seeding demo user:', error);
    process.exit(1);
  }
}

seedDemoUser().then(() => {
  console.log('\n✨ Seeding completed successfully');
  process.exit(0);
});
