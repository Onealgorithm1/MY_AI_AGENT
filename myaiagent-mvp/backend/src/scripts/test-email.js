import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

// Debug: Check .env content
console.log('Reading .env from:', envPath);
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('--- .env content snippet (last 5 lines) ---');
    const lines = envContent.split('\n');
    console.log(lines.slice(-5).join('\n'));
    console.log('-------------------------------------------');

    // Checking for GMAIL keys in raw content
    console.log('Contains GMAIL_USER?', envContent.includes('GMAIL_USER'));
    console.log('Contains GMAIL_APP_PASSWORD?', envContent.includes('GMAIL_APP_PASSWORD'));
} catch (e) {
    console.error('Error reading .env:', e.message);
}

// Load env vars
dotenv.config({ path: envPath });

// Import service dynamically AFTER env vars are loaded
const { default: emailService } = await import('../services/emailService.js');

console.log('Testing Email Service...');
console.log('GMAIL_USER env var:', process.env.GMAIL_USER);
console.log('Is Configured?', emailService.transporter ? 'YES (Gmail/SMTP)' : 'NO (Mock)');

if (process.env.GMAIL_USER) {
    console.log('Attempting to send email...');
    try {
        const result = await emailService.sendEmail({
            to: process.env.GMAIL_USER,
            subject: 'Test Email from Werkules (Real)',
            html: '<h1>It Works!</h1><p>This is a real email sent from the test script.</p>',
            text: 'It Works! This is a real email sent from the test script.'
        });
        console.log('Result:', result);
    } catch (error) {
        console.error('Test Failed:', error);
    }
} else {
    console.log('Skipping send: GMAIL_USER not found in env.');
}
