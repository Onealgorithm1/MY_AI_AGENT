
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load existing env to preserve keys
const existingEnvConfig = dotenv.parse(fs.readFileSync('.env', 'utf8') || ''); // Handle empty/missing file
const exampleEnvConfig = dotenv.parse(fs.readFileSync('.env.example', 'utf8'));

const generateSecret = () => crypto.randomBytes(32).toString('hex');

const finalConfig = { ...exampleEnvConfig };

// Preserve existing valid values
if (existingEnvConfig.ENCRYPTION_KEY) finalConfig.ENCRYPTION_KEY = existingEnvConfig.ENCRYPTION_KEY;
if (existingEnvConfig.DATABASE_URL) finalConfig.DATABASE_URL = existingEnvConfig.DATABASE_URL;

// Generate missing secrets
if (!finalConfig.JWT_SECRET || finalConfig.JWT_SECRET.includes('your_')) {
    finalConfig.JWT_SECRET = generateSecret();
}
if (!finalConfig.ENCRYPTION_KEY || finalConfig.ENCRYPTION_KEY.includes('your_')) {
    finalConfig.ENCRYPTION_KEY = generateSecret();
}
if (!finalConfig.CSRF_SECRET || finalConfig.CSRF_SECRET.includes('your_')) {
    finalConfig.CSRF_SECRET = generateSecret();
}

// Convert back to string
const envContent = Object.entries(finalConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

fs.writeFileSync('.env', envContent);
console.log('✅ .env file regenerated with secure secrets.');
console.log('Keys configured:', Object.keys(finalConfig).join(', '));
