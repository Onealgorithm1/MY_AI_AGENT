import crypto from 'crypto';

// Encryption key from environment (should be 32 bytes)
// CRITICAL: Must be set in environment or all encrypted data will be unrecoverable
if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY environment variable is required. ' +
    'Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
  );
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

// Encrypt a secret value
export function encryptSecret(text) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return IV + authTag + encrypted data as single string
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt a secret value
export function decryptSecret(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Mask secret for display (show first/last 4 chars)
export function maskSecret(secret) {
  if (!secret || secret.length < 12) {
    return '••••••••';
  }
  return `${secret.substring(0, 4)}••••••••${secret.substring(secret.length - 4)}`;
}

// Validate API key format
export function validateApiKey(keyName, keyValue) {
  const patterns = {
    'OPENAI_API_KEY': /^sk-[a-zA-Z0-9-_]{20,}$/,
    'ELEVENLABS_API_KEY': /^[a-f0-9]{32}$/,
    'ANTHROPIC_API_KEY': /^sk-ant-[a-zA-Z0-9-_]{20,}$/,
  };

  if (patterns[keyName]) {
    return patterns[keyName].test(keyValue);
  }

  // Generic validation: at least 20 characters
  return keyValue.length >= 20;
}

export default {
  encryptSecret,
  decryptSecret,
  maskSecret,
  validateApiKey,
};
