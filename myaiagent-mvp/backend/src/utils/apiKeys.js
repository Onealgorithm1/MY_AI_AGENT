import { query } from './database.js';
import crypto from 'crypto';

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';

// Encrypt value
export function encrypt(text) {
  if (!text) return null;
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt value
export function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const [ivHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !encrypted) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Get API key from database
export async function getApiKey(provider) {
  try {
    const result = await query(
      'SELECT encrypted_value FROM api_secrets WHERE provider = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
      [provider]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const encryptedValue = result.rows[0].encrypted_value;
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
      'UPDATE api_secrets SET is_active = false WHERE provider = $1',
      [provider]
    );
    
    // Insert new key
    const encryptedValue = encrypt(apiKey);
    await query(
      'INSERT INTO api_secrets (provider, encrypted_value, created_by, is_active) VALUES ($1, $2, $3, true)',
      [provider, encryptedValue, userId]
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
      'SELECT 1 FROM api_secrets WHERE provider = $1 AND is_active = true LIMIT 1',
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