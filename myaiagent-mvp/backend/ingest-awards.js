import { fetchAwards, saveAwards } from './src/services/contractAwardService.js';

// Helper to format date YYYY-MM-DD (or MM/DD/YYYY for API?)
// Docs say MM/DD/YYYY.
function formatDate(date) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}

async function ingest() {
    console.log('🚀 Starting Contract Awards Ingestion...');

    const today = new Date();
    const daysToFetch = 30; // Last 30 days
    let totalSaved = 0;

    for (let i = 0; i < daysToFetch; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = formatDate(d);

        console.log(`\n📅 Processing ${dateStr}...`);

        try {
            // Fetch daily batch (pagination loop needed if > 1000)
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
                console.log(`   Fetching offset ${offset}...`);
                const result = await fetchAwards({
                    dateSignedStart: dateStr,
                    dateSignedEnd: dateStr,
                    limit: limit,
                    offset: offset
                });

                if (result.awards && result.awards.length > 0) {
                    const count = await saveAwards(result.awards);
                    console.log(`   ✅ Saved ${count} awards.`);
                    totalSaved += count;

                    if (result.awards.length < limit) hasMore = false;
                    else offset += limit;

                    // Safety break
                    if (offset > 5000) {
                        console.warn('   ⚠️ Daily limit safety break hit (5000 records).');
                        hasMore = false;
                    }

                    // Throttle
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    console.log('   No awards found or end of list.');
                    hasMore = false;
                }
            }
        } catch (err) {
            console.error(`   ❌ Error fetching for ${dateStr}:`, err.message);
        }
    }

    console.log(`\n✨ Ingestion Complete. Total Awards Saved: ${totalSaved}`);
}

ingest();
