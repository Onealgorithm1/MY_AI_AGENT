import fs from 'fs';
import dotenv from 'dotenv';
const envConfig = dotenv.parse(fs.readFileSync('.env'));
console.log('Keys in .env:', Object.keys(envConfig).join(', '));
