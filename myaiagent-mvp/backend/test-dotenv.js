import 'dotenv/config';
import fs from 'fs';
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);
try {
    fs.writeFileSync('dotenv-test.txt', `KEY=${process.env.ENCRYPTION_KEY}\nDB=${process.env.DATABASE_URL}`);
    console.log('Written to dotenv-test.txt');
} catch (e) {
    console.error(e);
}
