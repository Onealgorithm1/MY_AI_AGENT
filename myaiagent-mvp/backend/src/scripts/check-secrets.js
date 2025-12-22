import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

console.log('Checking secrets...');
console.log('CSRF_SECRET:', process.env.CSRF_SECRET ? 'Present' : 'MISSING');
console.log('HMAC_SECRET:', process.env.HMAC_SECRET ? 'Present' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Present' : 'MISSING');

if (!process.env.CSRF_SECRET && !process.env.HMAC_SECRET) {
    console.log('❌ ISSUE: Both CSRF and HMAC secrets are missing!');
}
