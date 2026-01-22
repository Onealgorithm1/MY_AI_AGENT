import { query } from '../utils/database.js';
import samGov from './samGov.js';

class IntelligenceService {
    /**
     * Generate recommendations for a user based on:
     * 1. Saved Searches (highest weight)
     * 2. Saved Opportunities (Pipeline)
     */
    async getRecommendations(userId, limit = 10) {
        try {
            // 1. Get User Profile Signals
            // Fetch saved searches to get preferred NAICS, keywords, Set-Asides
            const savedSearchesFn = query(
                `SELECT filters FROM saved_searches WHERE user_id = $1 AND is_active = TRUE`,
                [userId]
            );

            // Fetch saved/interested opportunities to find common patterns
            const savedOppsFn = query(
                `SELECT naics_code, set_aside_type, contracting_office, place_of_performance 
                 FROM opportunities o
                 JOIN user_opportunities uo ON o.id = uo.opportunity_id
                 WHERE uo.user_id = $1`,
                [userId]
            );

            const [searchesRes, oppsRes] = await Promise.all([savedSearchesFn, savedOppsFn]);

            // 2. Aggregate Signals
            const signals = {
                naics: new Set(),
                setAside: new Set(),
                agencies: new Set(), // extract from office or full path
                keywords: new Set()
            };

            // Process Saved Searches
            searchesRes.rows.forEach(row => {
                const f = row.filters;
                if (f.naicsCode) signals.naics.add(f.naicsCode);
                if (f.setAsideType) signals.setAside.add(f.setAsideType);
                if (f.agency) signals.agencies.add(f.agency);
                if (f.keyword) signals.keywords.add(f.keyword);
            });

            // Process Saved Opportunities (boost signal)
            oppsRes.rows.forEach(opp => {
                if (opp.naics_code) signals.naics.add(opp.naics_code);
                if (opp.set_aside_type) signals.setAside.add(opp.set_aside_type);
                // Simple agency extraction if needed
            });

            // If no signals, return generic recent high-value items or empty
            if (signals.naics.size === 0 && signals.keywords.size === 0) {
                return await this.getGenericTrending(limit);
            }

            // 3. Build Weighted Query
            // We'll dynamically construct a query that assigns scores
            // This is a simplified version of a recommendation engine
            const params = [];
            let paramIdx = 1;

            let scoreClause = `0`;

            // NAICS Score (+50)
            if (signals.naics.size > 0) {
                const naicsArr = Array.from(signals.naics);
                scoreClause += ` + (CASE WHEN naics_code = ANY($${paramIdx}) THEN 50 ELSE 0 END)`;
                params.push(naicsArr);
                paramIdx++;
            }

            // Set Aside Score (+30)
            if (signals.setAside.size > 0) {
                const setAsideArr = Array.from(signals.setAside);
                scoreClause += ` + (CASE WHEN set_aside_type = ANY($${paramIdx}) THEN 30 ELSE 0 END)`;
                params.push(setAsideArr);
                paramIdx++;
            }

            // Keyword Score (+20 per match, max 60 - simplified SQL ILIKE via OR)
            // For MVP, if we have keywords, we might just filter or boost. 
            // SQL-only keyword scoring is heavy. Let's stick to NAICS/Type driven for speed, 
            // or use specific keyword matches if critical.
            // Let's rely on Recency (+10)
            scoreClause += ` + (CASE WHEN posted_date > NOW() - INTERVAL '2 days' THEN 10 ELSE 0 END)`;

            // 4. Query
            // Exclude already saved/viewed items if track_view exists, or just saved items
            // Assuming user_opportunities tracks what they already acted on
            params.push(userId);
            const userParamIdx = paramIdx;

            const sql = `
                SELECT o.*, 
                       (${scoreClause}) as match_score
                FROM opportunities o
                WHERE NOT EXISTS (
                    SELECT 1 FROM user_opportunities uo 
                    WHERE uo.opportunity_id = o.id AND uo.user_id = $${userParamIdx}
                )
                AND (${scoreClause}) > 0
                ORDER BY match_score DESC, posted_date DESC
                LIMIT $${userParamIdx + 1}
            `;

            params.push(limit);

            const result = await query(sql, params);
            return result.rows;

        } catch (error) {
            console.error('Error generating recommendations:', error);
            return [];
        }
    }

    async getGenericTrending(limit) {
        // Fallback: Recent posted opportunities
        const result = await query(
            `SELECT * FROM opportunities 
             ORDER BY posted_date DESC 
             LIMIT $1`,
            [limit]
        );
        return result.rows.map(r => ({ ...r, match_score: 0 }));
    }
}

export default new IntelligenceService();
