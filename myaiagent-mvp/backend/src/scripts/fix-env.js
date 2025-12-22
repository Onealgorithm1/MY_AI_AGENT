import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

console.log('Fixing .env at:', envPath);

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Regex to fix key=valkey=val pattern
    // specifically for the ones we added

    // 1. Fix GMAIL_USER squashed with GMAIL_APP_PASSWORD
    content = content.replace(
        /GMAIL_USER=(.*?)GMAIL_APP_PASSWORD=/g,
        'GMAIL_USER=$1\nGMAIL_APP_PASSWORD='
    );

    // 2. Fix GMAIL_APP_PASSWORD squashed with EMAIL_FROM
    content = content.replace(
        /GMAIL_APP_PASSWORD=(.*?)EMAIL_FROM=/g,
        'GMAIL_APP_PASSWORD=$1\nEMAIL_FROM='
    );

    // 3. Ensure GMAIL_APP_PASSWORD with spaces is handled if needed (dotenv usually handles it, but let's cleanup)
    // Logic: If it looks like 'cywt frmw euus beke', wrapping in quotes is safer but standard dotenv works without if it's the rest of the line.
    // The issue is mostly the missing newlines.

    // 4. Ensure newline before GMAIL_USER if it was stuck to previous line
    // If we see 'falseGMAIL_USER', split it.
    content = content.replace(/falseGMAIL_USER=/g, 'false\nGMAIL_USER=');

    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ .env fixed.');

    // verify
    console.log('--- New .env tail ---');
    console.log(content.split('\n').slice(-5).join('\n'));
} catch (e) {
    console.error('Failed to fix .env:', e);
}
