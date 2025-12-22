import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
const examplePath = path.resolve(__dirname, '../../.env.example');

console.log('Resetting .env from:', examplePath);

try {
    const exampleContent = fs.readFileSync(examplePath, 'utf8');

    // Define new config
    const newConfig = `
# ---------------
# ADDED CONFIG
# ---------------
GMAIL_USER=shaikarief298@gmail.com
GMAIL_APP_PASSWORD="cywt frmw euus beke"
EMAIL_FROM=shaikarief298@gmail.com
`;

    const finalContent = exampleContent + '\n' + newConfig;

    fs.writeFileSync(envPath, finalContent, 'utf8');
    console.log('✅ .env reset and updated.');

} catch (e) {
    console.error('Failed to reset .env:', e);
}
