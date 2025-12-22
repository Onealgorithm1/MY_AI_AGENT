import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

const WRONG_URL = 'postgresql://user:password@localhost:5432/myaiagent_db';
const CORRECT_URL = 'postgresql://postgres:root@localhost:5432/myaiagent_db';

try {
    let content = fs.readFileSync(envPath, 'utf8');
    if (content.includes(WRONG_URL)) {
        content = content.replace(WRONG_URL, CORRECT_URL);
        fs.writeFileSync(envPath, content, 'utf8');
        console.log('✅ Updated DATABASE_URL in .env');
    } else {
        console.log('⚠️ DATABASE_URL format not matched or already correct?');
        // It might be generic in .env.example if I read it before?
        // Let's just try to replace the USER:PASSWORD part if specific URL fails
        // But reset-env.js copied .env.example exactly.
    }
} catch (e) {
    console.error('Failed to update .env:', e);
}
