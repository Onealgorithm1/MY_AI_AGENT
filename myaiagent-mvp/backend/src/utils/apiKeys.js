import { query } from './database.js';
import crypto from 'crypto';

// Encryption key from environment (should be 32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

// Encrypt value (using same method as secrets service)
export function encrypt(text) {
  if (!text) return null;

  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + authTag + encrypted data as single string
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt value (using same method as secrets service)
export function decrypt(encryptedText) {
  if (!encryptedText) return null;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.error('Invalid encrypted data format');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return '[DECRYPTION_ERROR]';
  }
}

// Map provider to service_name format
const SERVICE_NAME_MAP = {
  'openai': 'OpenAI',
  'openai-api': 'OpenAI',  // Fallback name
  'elevenlabs': 'ElevenLabs',
  'anthropic': 'Anthropic',
  'google': 'Google APIs',
  'google-search_api': 'Google APIs',  // Google Search API uses Google APIs service
  'gemini': 'gemini',       // Fixed: Gemini keys are stored as 'gemini', not 'Google APIs'
  'stripe': 'Stripe',
  'samgov': 'SAM.gov',
  'sam-gov': 'SAM.gov',
  'cohere': 'Cohere',
  'groq': 'Groq'
};

// Helper to normalize provider name
function getServiceName(provider) {
  const normalized = provider.toLowerCase().trim();
  return SERVICE_NAME_MAP[normalized] || provider; // Fallback to original if not found
}

// Get API key from database with support for multiple keys per service
export async function getApiKey(provider, keyType = 'project', organizationId = null) {
  try {
    const serviceName = getServiceName(provider);

    // If mapped name wasn't found in our map but provided, we warn but proceed with fallback
    // if (!SERVICE_NAME_MAP[provider.toLowerCase().trim()]) {
    //    console.warn(`⚠️  Unknown provider: ${provider} - using as-is: ${serviceName}`);
    // }

    console.log(`🔑 getApiKey: Looking for ${provider} (service: ${serviceName})`, organizationId ? `for Org ${organizationId}` : 'System-wide');

    let result;

    // 1. If organizationId is provided, try to find an active key for that organization
    if (organizationId) {
      result = await query(
        `SELECT key_value FROM api_secrets 
         WHERE service_name = $1 AND is_active = true AND organization_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [serviceName, organizationId]
      );
    }

    // 2. If no org key found (or no orgId provided), try System Default key (organization_id IS NULL)
    if (!result || result.rows.length === 0) {
      if (organizationId) {
        console.log(`ℹ️  No Org key found for ${serviceName} (Org ${organizationId}), checking System key...`);
      }
      result = await query(
        `SELECT key_value FROM api_secrets 
         WHERE service_name = $1 AND is_active = true AND organization_id IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [serviceName]
      );
    }

    // If no key found in database, fall back to environment variable
    if (!result || result.rows.length === 0) {
      // Only log if we were really expecting a key (optional to reduce noise)
      // console.log(`⚠️  No database key found for ${serviceName}, checking environment variables`);

      const envKeyMap = {
        'openai': 'OPENAI_API_KEY',
        'elevenlabs': 'ELEVENLABS_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'google': 'GOOGLE_API_KEY',
        'gemini': 'GOOGLE_API_KEY',
        'stripe': 'STRIPE_SECRET_KEY'
      };

      const envKey = envKeyMap[provider.toLowerCase()];
      if (envKey && process.env[envKey]) {
        console.log(`✅ Using ${provider} API key from environment variable`);
        return process.env[envKey];
      }

      console.error(`❌ No ${provider} API key found in database or environment`);
      return null;
    }

    console.log(`✅ Found ${provider} key in database`);
    const encryptedValue = result.rows[0].key_value;
    const decrypted = decrypt(encryptedValue);
    if (!decrypted) {
      console.error(`❌ Failed to decrypt ${provider} API key`);
    }
    return decrypted;
  } catch (error) {
    console.error(`❌ Error fetching ${provider} API key:`, error.message);
    return null;
  }
}

// Save API key to database
export async function saveApiKey(provider, apiKey, userId, organizationId = null, keyLabel = null) {
  try {
    // Use the helper to ensure we save with the same name we look up
    const serviceName = getServiceName(provider);

    // Deactivate old keys for this specific scope (System or Organization)
    const timestamp = Math.floor(Date.now() / 1000).toString(); // Convert to string for SQL safety

    if (organizationId) {
      await query(
        `UPDATE api_secrets 
         SET is_active = false, 
         key_label = SUBSTRING(key_label, 1, 200) || ' (Archived ' || $3::text || ')'
         WHERE service_name = $1 AND organization_id = $2 AND is_active = true`,
        [serviceName, organizationId, timestamp]
      );
    } else {
      await query(
        `UPDATE api_secrets 
         SET is_active = false, 
         key_label = SUBSTRING(key_label, 1, 200) || ' (Archived ' || $2::text || ')'
         WHERE service_name = $1 AND organization_id IS NULL AND is_active = true`,
        [serviceName, timestamp]
      );
    }

    // Insert new key
    const encryptedValue = encrypt(apiKey);
    const label = keyLabel || `${serviceName} API Key`;

    // Generate a unique key_name to satisfy legacy schema constraints
    // Format: SERVICE_NAME_TIMESTAMP_RANDOM
    const keyName = `${serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const result = await query(
      'INSERT INTO api_secrets (service_name, key_name, key_label, key_value, created_by, is_active, organization_id) VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id, key_label, service_name, organization_id, is_active, created_at',
      [serviceName, keyName, label, encryptedValue, userId, organizationId]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`❌ Critical Error in saveApiKey (Provider: ${provider}, Org: ${organizationId}):`, error);
    throw error;
  }
}

// Check if API key is configured
export async function hasApiKey(provider, organizationId = null) {
  try {
    const serviceName = getServiceName(provider);
    let result;

    if (organizationId) {
      result = await query(
        'SELECT 1 FROM api_secrets WHERE service_name = $1 AND is_active = true AND organization_id = $2 LIMIT 1',
        [serviceName, organizationId]
      );
      if (result.rows.length > 0) return true;
    }

    // Check system key
    result = await query(
      'SELECT 1 FROM api_secrets WHERE service_name = $1 AND is_active = true AND organization_id IS NULL LIMIT 1',
      [serviceName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking ${provider} API key:`, error);
    return false;
  }
}

export default {
  encrypt,
  decrypt,
  getApiKey,
  saveApiKey,
  hasApiKey
};
