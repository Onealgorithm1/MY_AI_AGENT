import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from './src/utils/database.js';
import { decrypt } from './src/utils/apiKeys.js';

async function test() {
    const result = await query('SELECT key_value FROM api_secrets WHERE service_name = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1', ['gemini']);
    const key = decrypt(result.rows[0].key_value);

    console.log('Testing key:', key.substring(0, 10) + '...');

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const result = await model.generateContent("Hello!");
        console.log("Success:", result.response.text());
    } catch (err) {
        console.error("Failed:", err.message);
    }
    process.exit(0);
}

test().catch(console.error);
