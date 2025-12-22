import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

const NEW_KEY = '1e49667d242fa64d31e813e443c7fdf6240eb2012709b41c170457ed7a1fd8b6';

try {
    let content = fs.readFileSync(envPath, 'utf8');
    content = content.replace(/ENCRYPTION_KEY=your_encryption_key_here_32_bytes_hex/g, `ENCRYPTION_KEY=${NEW_KEY}`);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ Updated ENCRYPTION_KEY in .env');
} catch (e) {
    console.error('Failed to update .env:', e);
}
