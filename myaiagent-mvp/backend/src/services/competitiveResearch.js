import { query } from '../utils/database.js';
import { performWebSearch as searchWeb } from './webSearch.js';
import { generateContent } from './gemini.js';

const COMPETITOR_SOURCES = [
  'ChatGPT',
  'Claude',
  'Grok',
  'Perplexity AI',
  'Google Gemini',
  'Microsoft Copilot',
  'DeepSeek'
];

const RESEARCH_CATEGORIES = [
  'UI/UX Features',
  'Core Capabilities',
  'User Experience',
  'Code Editing',
  'Voice & Audio',
  'File Handling',
  'Personalization',
  'Performance'
];

export async function conductWeeklyResearch() {
  const sessionStart = new Date();
  const researchSession = await query(
    `INSERT INTO research_sessions (research_type, query, started_at)
     VALUES ($1, $2, $3) RETURNING id`,
    ['weekly_competitive_scan', 'Latest AI chatbot features and UX improvements', sessionStart]
  );
  const sessionId = researchSession.rows[0].id;

  const findings = [];
  const sourcesConsulted = [];

  try {
    for (const category of RESEARCH_CATEGORIES.slice(0, 3)) {
      const searchQuery = `latest ${category} in AI chatbots 2025 ChatGPT Claude Grok features`;
      
      console.log(`🔍 Researching: ${category}`);
      
      const searchResults = await searchWeb(searchQuery);
      sourcesConsulted.push(searchQuery);
      
      const analysisPrompt = `You are researching competitive features for an AI chatbot called "My AI Agent".

Analyze these search results about ${category} and extract:
1. Specific features mentioned (with source attribution)
2. UI/UX patterns described
3. User benefits highlighted
4. Implementation approaches if mentioned

Search results:
${searchResults.results?.slice(0, 5).map(r => `
Source: ${r.title}
URL: ${r.link}
Content: ${r.snippet}
`).join('\n\n')}

Return a JSON array of findings in this format:
[
  {
    "feature_name": "Canvas Mode",
    "source": "ChatGPT",
    "category": "Code Editing",
    "description": "Side-by-side code editor panel",
    "ux_notes": "Persistent panel, real-time sync, syntax highlighting",
    "implementation_notes": "Monaco editor integration",
    "novelty_score": 8,
    "reliability_score": 9,
    "documentation_url": "https://..."
  }
]`;

      const analysis = await generateContent(analysisPrompt, {
        temperature: 0.3,
        responseMimeType: 'application/json'
      });

      let features = [];
      try {
        features = JSON.parse(analysis);
        if (!Array.isArray(features)) features = [];
      } catch (e) {
        console.error('Failed to parse research results:', e);
        continue;
      }

      for (const feature of features) {
        try {
          await query(
            `INSERT INTO ai_feature_intel 
             (source, feature_name, category, description, ux_notes, implementation_notes,
              novelty_score, reliability_score, documentation_url, researcher_notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (source, feature_name) 
             DO UPDATE SET
               description = EXCLUDED.description,
               ux_notes = EXCLUDED.ux_notes,
               research_date = CURRENT_TIMESTAMP`,
            [
              feature.source || 'Unknown',
              feature.feature_name,
              feature.category || category,
              feature.description,
              feature.ux_notes,
              feature.implementation_notes,
              feature.novelty_score || 5,
              feature.reliability_score || 5,
              feature.documentation_url,
              `Discovered in weekly research for ${category}`
            ]
          );
          findings.push(feature);
        } catch (err) {
          console.error('Failed to store feature:', err);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const sessionEnd = new Date();
    const duration = Math.floor((sessionEnd - sessionStart) / 1000);

    await query(
      `UPDATE research_sessions 
       SET completed_at = $1, duration_seconds = $2, sources_consulted = $3,
           findings_count = $4, features_discovered = $5
       WHERE id = $6`,
      [sessionEnd, duration, sourcesConsulted, findings.length, findings.length, sessionId]
    );

    console.log(`✅ Research complete: ${findings.length} features discovered`);
    return findings;

  } catch (error) {
    console.error('Research session failed:', error);
    await query(
      `UPDATE research_sessions SET completed_at = $1, insights_generated = $2 WHERE id = $3`,
      [new Date(), `Error: ${error.message}`, sessionId]
    );
    throw error;
  }
}

export async function analyzeFeatureGap(featureName) {
  const competitorData = await query(
    `SELECT * FROM ai_feature_intel 
     WHERE feature_name ILIKE $1 OR description ILIKE $1
     ORDER BY reliability_score DESC, novelty_score DESC
     LIMIT 5`,
    [`%${featureName}%`]
  );

  if (competitorData.rows.length === 0) {
    return null;
  }

  const competitors = competitorData.rows.map(r => ({
    source: r.source,
    description: r.description,
    uxNotes: r.ux_notes,
    implementationNotes: r.implementation_notes
  }));

  return {
    feature: featureName,
    foundIn: competitors.map(c => c.source),
    implementations: competitors,
    competitiveGap: competitors.length > 0 ? 'Missing this feature' : 'On par with competitors'
  };
}

export async function getLatestResearchFindings(limit = 10) {
  const result = await query(
    `SELECT * FROM ai_feature_intel 
     ORDER BY research_date DESC, novelty_score DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getResearchSummary() {
  const stats = await query(
    `SELECT 
       COUNT(*) as total_features,
       COUNT(DISTINCT source) as sources_tracked,
       COUNT(DISTINCT category) as categories_covered,
       AVG(novelty_score) as avg_novelty,
       MAX(research_date) as last_research
     FROM ai_feature_intel`
  );

  const recentSession = await query(
    `SELECT * FROM research_sessions 
     ORDER BY started_at DESC LIMIT 1`
  );

  return {
    ...stats.rows[0],
    lastSession: recentSession.rows[0]
  };
}
