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
    console.error('Decryption error:', error);
    return null;
  }
}

// Get API key from database with support for multiple keys per service
export async function getApiKey(provider, keyType = 'project') {
  try {
    // Map provider to service_name format
    const serviceNameMap = {
      'openai': 'OpenAI',
      'elevenlabs': 'ElevenLabs',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'stripe': 'Stripe'
    };
    
    const serviceName = serviceNameMap[provider.toLowerCase()];
    if (!serviceName) {
      console.error(`Unknown provider: ${provider}`);
      return null;
    }
    
    // Try to get key in this order:
    // 1. Default key of matching type (if specified)
    // 2. Any default key
    // 3. Any active key of matching type
    // 4. Any active key
    let result;
    
    // Try default key of matching type first
    result = await query(
      `SELECT key_value FROM api_secrets 
       WHERE service_name = $1 AND is_active = true AND is_default = true AND key_type = $2
       LIMIT 1`,
      [serviceName, keyType]
    );
    
    // If not found, try any default key
    if (result.rows.length === 0) {
      result = await query(
        `SELECT key_value FROM api_secrets 
         WHERE service_name = $1 AND is_active = true AND is_default = true
         LIMIT 1`,
        [serviceName]
      );
    }
    
    // If still not found, try any key of matching type
    if (result.rows.length === 0) {
      result = await query(
        `SELECT key_value FROM api_secrets 
         WHERE service_name = $1 AND is_active = true AND key_type = $2
         ORDER BY created_at DESC LIMIT 1`,
        [serviceName, keyType]
      );
    }
    
    // Last resort: any active key
    if (result.rows.length === 0) {
      result = await query(
        `SELECT key_value FROM api_secrets 
         WHERE service_name = $1 AND is_active = true
         ORDER BY created_at DESC LIMIT 1`,
        [serviceName]
      );
    }
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const encryptedValue = result.rows[0].key_value;
    return decrypt(encryptedValue);
  } catch (error) {
    console.error(`Error fetching ${provider} API key:`, error);
    return null;
  }
}

// Save API key to database
export async function saveApiKey(provider, apiKey, userId) {
  try {
    // Deactivate old keys
    await query(
      'UPDATE api_secrets SET is_active = false WHERE service_name = $1',
      [provider]
    );
    
    // Insert new key
    const encryptedValue = encrypt(apiKey);
    await query(
      'INSERT INTO api_secrets (service_name, key_name, key_value, created_by, is_active) VALUES ($1, $2, $3, $4, true)',
      [provider, `${provider}_api_key`, encryptedValue, userId]
    );
    
    return true;
  } catch (error) {
    console.error(`Error saving ${provider} API key:`, error);
    return false;
  }
}

// Check if API key is configured
export async function hasApiKey(provider) {
  try {
    const result = await query(
      'SELECT 1 FROM api_secrets WHERE service_name = $1 AND is_active = true LIMIT 1',
      [provider]
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