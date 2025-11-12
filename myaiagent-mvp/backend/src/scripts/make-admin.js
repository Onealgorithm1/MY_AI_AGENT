import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function makeUserAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get your email
    const email = process.argv[2];
    if (!email) {
      console.error('❌ Please provide your email address');
      console.error('   Usage: node make-admin.js your-email@example.com');
      process.exit(1);
    }

    // Check if user exists
    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`\n📧 Found user: ${user.email}`);
    console.log(`   Current role: ${user.role || 'user'}`);

    // Update to admin
    await client.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['admin', user.id]
    );

    console.log(`\n✅ Successfully updated ${user.email} to admin role!`);
    console.log('   You can now access the admin dashboard at /admin');
    console.log('   Look for the Shield icon in the navigation bar');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

makeUserAdmin();
