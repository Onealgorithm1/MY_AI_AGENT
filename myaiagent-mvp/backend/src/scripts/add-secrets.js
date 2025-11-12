#!/usr/bin/env node
import pkg from 'pg';
const { Client } = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Encryption function (matches your backend)
function encryptSecret(text) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function addSecrets() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if ENCRYPTION_KEY is set
    if (!process.env.ENCRYPTION_KEY) {
      console.error('❌ ENCRYPTION_KEY not set!');
      console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }

    // Get admin user ID
    const adminResult = await client.query(
      "SELECT id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1"
    );

    if (adminResult.rows.length === 0) {
      console.error('❌ No admin user found! Create an admin user first.');
      process.exit(1);
    }

    const adminUserId = adminResult.rows[0].id;
    console.log(`📧 Using admin user ID: ${adminUserId}\n`);

    // Secrets to add
    const secrets = [
      {
        keyName: 'SAM_GOV_API_KEY',
        serviceName: 'SAM.gov',
        keyValue: 'SAM-4722a397-88b2-402b-b6b7-d84b2e726046',
        keyLabel: 'Production Key',
        description: 'SAM.gov API key for federal procurement data and entity information',
        docsUrl: 'https://open.gsa.gov/api/sam-entity-api/',
        keyType: 'other',
      },
      // Add more secrets here if needed
      // {
      //   keyName: 'OPENAI_API_KEY',
      //   serviceName: 'OpenAI',
      //   keyValue: 'sk-proj-...',
      //   keyLabel: 'Project Key',
      //   description: 'OpenAI API key for GPT models',
      //   docsUrl: 'https://platform.openai.com/api-keys',
      //   keyType: 'project',
      // },
    ];

    for (const secret of secrets) {
      try {
        console.log(`🔐 Adding ${secret.serviceName} key...`);

        // Check if already exists
        const existing = await client.query(
          'SELECT id FROM api_secrets WHERE service_name = $1 AND key_label = $2',
          [secret.serviceName, secret.keyLabel]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⚠️  ${secret.serviceName} ${secret.keyLabel} already exists. Updating...`);

          // Update existing
          const encrypted = encryptSecret(secret.keyValue);
          await client.query(
            `UPDATE api_secrets
             SET key_value = $1, key_name = $2, description = $3, docs_url = $4,
                 key_type = $5, is_active = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6`,
            [encrypted, secret.keyName, secret.description, secret.docsUrl, secret.keyType, existing.rows[0].id]
          );
          console.log(`   ✅ Updated ${secret.serviceName} ${secret.keyLabel}`);
        } else {
          // Set as default if first key for this service
          const defaultCheck = await client.query(
            'SELECT id FROM api_secrets WHERE service_name = $1',
            [secret.serviceName]
          );
          const isDefault = defaultCheck.rows.length === 0;

          if (isDefault) {
            console.log(`   📌 Setting as default key for ${secret.serviceName}`);
          }

          // Insert new
          const encrypted = encryptSecret(secret.keyValue);
          await client.query(
            `INSERT INTO api_secrets
             (key_name, key_value, service_name, key_label, key_type, description, docs_url, is_active, is_default, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)`,
            [
              secret.keyName,
              encrypted,
              secret.serviceName,
              secret.keyLabel,
              secret.keyType,
              secret.description,
              secret.docsUrl,
              isDefault,
              adminUserId,
            ]
          );
          console.log(`   ✅ Added ${secret.serviceName} ${secret.keyLabel}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to add ${secret.serviceName}:`, error.message);
      }
    }

    console.log('\n🎉 Secrets setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify in Admin Dashboard → API Keys');
    console.log('   2. Test the keys using the "Test" button');
    console.log('   3. Add more keys as needed via the UI');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addSecrets();
}

export default addSecrets;
