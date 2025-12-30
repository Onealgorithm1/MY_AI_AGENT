import { query, default as pool } from '../src/utils/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv to read from backend root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedDemoData() {
    console.log('🌱 Starting demo data seed...');

    try {
        // 1. Get all organizations
        const orgs = await query('SELECT id, name FROM organizations');
        console.log(`Found ${orgs.rows.length} organizations.`);

        if (orgs.rows.length === 0) {
            console.log('⚠️ No organizations found. Creating a demo organization...');
            // Logic to create org if needed, but usually one exists if user is logged in
        }

        // 2. Define Demo Profile Data (Software Dev Company)
        const demoProfile = {
            naicsCodes: ['541511', '541512', '518210', '541611'],
            pscCodes: ['DA01', 'R408'],
            keywords: ['software development', 'artificial intelligence', 'cloud computing', 'data analytics', 'cybersecurity'],
            capabilities: {
                "Core Competencies": {
                    "Software Engineering": "Full-stack development, API design, Microservices",
                    "AI/ML": "Predictive analytics, NLP, Computer Vision"
                }
            },
            certifications: {
                smallBusiness: true,
                womanOwned: false,
                veteranOwned: false,
                hubzone: false,
                eightA: false
            }
        };

        // 3. Update Profile for ALL organizations
        for (const org of orgs.rows) {
            console.log(`Updating profile for ${org.name} (ID: ${org.id})...`);

            await query(
                `INSERT INTO company_profile_cache (
           organization_id, company_name, website_url, 
           capabilities, certifications, naics_codes, psc_codes, keywords, last_updated
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (organization_id) DO UPDATE SET
           capabilities = EXCLUDED.capabilities,
           certifications = EXCLUDED.certifications,
           naics_codes = EXCLUDED.naics_codes,
           psc_codes = EXCLUDED.psc_codes,
           keywords = EXCLUDED.keywords,
           last_updated = CURRENT_TIMESTAMP`,
                [
                    org.id,
                    org.name,
                    'https://demo-company.com',
                    JSON.stringify(demoProfile.capabilities),
                    JSON.stringify(demoProfile.certifications),
                    demoProfile.naicsCodes,
                    demoProfile.pscCodes,
                    demoProfile.keywords
                ]
            );
        }

        console.log('✅ Demo data seeded successfully for all organizations!');

        // 4. Force MATCH updates (Trigger a match run if possible, or just let the dashboard do it)
        // The dashboard does it on load, so we are good.

    } catch (error) {
        console.error('❌ Error seeding demo data:', error);
    } finally {
        await pool.end();
    }
}

seedDemoData();
