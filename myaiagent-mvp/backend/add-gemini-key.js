#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

// Encryption function (matches backend)
function encryptSecret(text) {
  const algorithm = 'aes-256-gcm';
  
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  if (process.env.ENCRYPTION_KEY.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be exactly 64 hex characters (got ${process.env.ENCRYPTION_KEY.length})`);
  }
  
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function addGeminiKey(apiKey) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Validate encryption key
    if (!process.env.ENCRYPTION_KEY) {
      console.error('❌ ENCRYPTION_KEY not set in environment!');
      console.error('   Set it with: export ENCRYPTION_KEY="your_64_char_hex_string"');
      process.exit(1);
    }

    // Get or create admin user
    let adminUserId;
    const adminResult = await client.query(
      "SELECT id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1"
    );

    if (adminResult.rows.length > 0) {
      adminUserId = adminResult.rows[0].id;
      console.log(`📧 Using admin user ID: ${adminUserId}\n`);
    } else {
      console.warn('⚠️  No admin user found. Using NULL as created_by.\n');
      adminUserId = null;
    }

    // Check if Gemini key already exists
    const existing = await client.query(
      "SELECT id FROM api_secrets WHERE key_name = 'GEMINI_API_KEY' AND is_active = true"
    );

    const encryptedKey = encryptSecret(apiKey);

    if (existing.rows.length > 0) {
      console.log('🔄 Updating existing Gemini API key...\n');
      
      await client.query(
        `UPDATE api_secrets
         SET key_value = $1, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [encryptedKey, existing.rows[0].id]
      );
      
      console.log('✅ Gemini API key updated successfully!\n');
    } else {
      console.log('➕ Adding new Gemini API key...\n');
      
      // Check if any Gemini keys exist (for is_default flag)
      const anyGemini = await client.query(
        "SELECT id FROM api_secrets WHERE key_name = 'GEMINI_API_KEY'"
      );
      const isDefault = anyGemini.rows.length === 0;

      await client.query(
        `INSERT INTO api_secrets
         (key_name, key_value, service_name, key_label, key_type, description, docs_url, is_active, is_default, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)`,
        [
          'GEMINI_API_KEY',
          encryptedKey,
          'Google',
          'Gemini API Key',
          'project',
          'Google Gemini API key for AI chat and content generation',
          'https://aistudio.google.com/app/apikey',
          isDefault,
          adminUserId
        ]
      );
      
      console.log('✅ Gemini API key added successfully!\n');
    }

    console.log('📋 Next steps:');
    console.log('   1. Restart the backend: pm2 restart myaiagent-backend');
    console.log('   2. Test in the admin panel: https://werkules.com/admin/secrets');
    console.log('   3. Try using the chat feature\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get API key from command line
const apiKey = process.argv[2];

if (!apiKey) {
  console.log('Usage: node add-gemini-key.js <API_KEY>');
  console.log('');
  console.log('Example:');
  console.log('  node add-gemini-key.js "AIzaSyDpuLB-Rcz_5ay9-RaS4QTfvuU7jKLhUrk"');
  process.exit(1);
}

if (apiKey.length < 30) {
  console.error('❌ API key seems too short. Please check and try again.');
  process.exit(1);
}

addGeminiKey(apiKey);
