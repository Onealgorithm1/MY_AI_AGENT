import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';

const output = [];
output.push('--- Email Config Diagnostic ---');
output.push('GMAIL_USER: ' + (process.env.GMAIL_USER ? process.env.GMAIL_USER : '(missing)'));
output.push('GMAIL_APP_PASSWORD: ' + (process.env.GMAIL_APP_PASSWORD ? '***' + process.env.GMAIL_APP_PASSWORD.slice(-3) : '(missing)'));
output.push('SMTP_HOST: ' + (process.env.SMTP_HOST || '(missing)'));
output.push('EMAIL_FROM: ' + (process.env.EMAIL_FROM || '(missing)'));
output.push('-------------------------------');

const status = output.join('\n');
console.log(status);
fs.writeFileSync(path.join(__dirname, 'email_status.txt'), status);
