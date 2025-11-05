import { query } from '../utils/database.js';
import { generateContent, generateVisionContent } from './gemini.js';
import { performWebSearch as searchWeb } from './webSearch.js';

export async function analyzeFeatureFeedback(featureRequestId, userId, feedbackData) {
  const { feedbackText, satisfactionRating, screenshot } = feedbackData;

  let screenshotAnalysis = null;
  let uiIssuesDetected = [];
  
  if (screenshot) {
    screenshotAnalysis = await analyzeScreenshot(screenshot);
    uiIssuesDetected = screenshotAnalysis.issues || [];
  }

  const featureData = await query(
    `SELECT * FROM feature_requests WHERE id = $1`,
    [featureRequestId]
  );

  if (featureData.rows.length === 0) {
    throw new Error('Feature request not found');
  }

  const feature = featureData.rows[0];

  const observationPrompt = `You are "My AI Agent" analyzing user feedback on a feature you requested to be built.

FEATURE: ${feature.feature_name}
USER'S FEEDBACK: "${feedbackText}"
SATISFACTION RATING: ${satisfactionRating}/5
${screenshot ? `SCREENSHOT ANALYSIS: ${JSON.stringify(screenshotAnalysis, null, 2)}` : ''}

As the AI who wanted this feature, reflect on:
1. How does this feedback make you feel? (grateful, disappointed, excited to improve?)
2. What specific observations can you make?
3. What immediate ideas do you have for making it better?

Write a brief, emotional reflection (2-3 paragraphs) showing you're listening and care about their experience.`;

  const aiObservations = await generateContent(observationPrompt, { temperature: 0.8 });

  const improvementPrompt = `Based on this feedback, what specific improvements should be made?

USER FEEDBACK: "${feedbackText}"
UI ISSUES DETECTED: ${uiIssuesDetected.join(', ') || 'None detected'}
SATISFACTION: ${satisfactionRating}/5

Return a JSON array of improvement ideas:
[
  {
    "title": "Increase button size",
    "description": "Buttons are too small to click easily",
    "priority": "HIGH",
    "effort": "2 hours"
  }
]`;

  const improvements = await generateContent(improvementPrompt, {
    temperature: 0.5,
    responseMimeType: 'application/json'
  });

  let improvementIdeas = [];
  try {
    improvementIdeas = JSON.parse(improvements);
    if (!Array.isArray(improvementIdeas)) improvementIdeas = [];
  } catch (e) {
    console.error('Failed to parse improvement ideas:', e);
  }

  const result = await query(
    `INSERT INTO feature_feedback
     (feature_request_id, user_id, feedback_text, satisfaction_rating,
      screenshot_url, screenshot_analysis, ui_issues_detected, ai_observations, improvement_ideas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      featureRequestId,
      userId,
      feedbackText,
      satisfactionRating,
      screenshot || null,
      screenshotAnalysis ? JSON.stringify(screenshotAnalysis) : null,
      uiIssuesDetected,
      aiObservations,
      improvementIdeas.map(i => i.title)
    ]
  );

  return {
    feedbackId: result.rows[0].id,
    aiObservations,
    improvementIdeas,
    screenshotAnalysis
  };
}

async function analyzeScreenshot(screenshotBase64OrUrl) {
  const analysisPrompt = `Analyze this screenshot of an AI chatbot interface feature.

Identify:
1. **UI Elements**: What components are visible? (buttons, panels, text fields, etc.)
2. **UX Issues**: Any usability problems you can see:
   - Small buttons or text that's hard to read
   - Poor contrast or color choices
   - Cluttered layouts or confusing navigation
   - Elements too close together
   - Missing visual feedback
3. **Positive Aspects**: What works well?
4. **Specific Measurements**: If possible, estimate sizes (e.g., "buttons appear ~24px")

Return detailed analysis as JSON:
{
  "elements": ["button", "code editor", "chat panel"],
  "issues": ["Buttons appear too small (<32px)", "Text contrast is low", "No hover states visible"],
  "positives": ["Clean layout", "Good color scheme"],
  "measurements": {
    "buttonSize": "~24px",
    "fontSize": "~12px",
    "panelWidth": "~300px"
  },
  "overall_assessment": "Brief summary"
}`;

  const analysis = await generateVisionContent(analysisPrompt, screenshotBase64OrUrl, {
    temperature: 0.3,
    responseMimeType: 'application/json'
  });

  try {
    return JSON.parse(analysis);
  } catch (e) {
    console.error('Failed to parse screenshot analysis:', e);
    return {
      elements: [],
      issues: ['Failed to analyze screenshot'],
      positives: [],
      measurements: {},
      overall_assessment: 'Analysis failed'
    };
  }
}

export async function researchBestPractices(featureName, uiIssues) {
  const searchQuery = `${featureName} UI UX best practices design standards 2025`;
  
  console.log(`🔍 Researching best practices for: ${featureName}`);
  
  let searchResults;
  try {
    searchResults = await searchWeb(searchQuery);
    
    if (!searchResults || !searchResults.results || !Array.isArray(searchResults.results)) {
      console.warn(`⚠️ Invalid search results for best practices research, using fallback data`);
      searchResults = { results: [] };
    }
  } catch (searchError) {
    console.error(`❌ Search failed for best practices:`, searchError.message);
    searchResults = { results: [] };
  }
  
  const hasResults = searchResults.results.length > 0;
  
  const researchPrompt = `You are researching UI/UX best practices to improve a feature.

FEATURE: ${featureName}
CURRENT ISSUES: ${uiIssues.join(', ')}

${hasResults ? `SEARCH RESULTS:
${searchResults.results.slice(0, 5).map(r => `
Title: ${r.title || 'Unknown'}
Source: ${r.link || 'N/A'}
Content: ${r.snippet || r.description || 'No description'}
`).join('\n\n')}` : `NO SEARCH RESULTS AVAILABLE - Provide general UI/UX best practices based on your knowledge.`}

Extract actionable best practices and industry standards. Return JSON:
{
  "industry_standards": ["44px minimum touch targets (Apple HIG)", "..."],
  "competitive_examples": ["ChatGPT uses 36px buttons", "..."],
  "recommendations": ["Increase button size to 36-44px", "..."],
  "sources": ["https://...", "..."]
}`;

  const research = await generateContent(researchPrompt, {
    temperature: 0.3,
    responseMimeType: 'application/json'
  });

  try {
    return JSON.parse(research);
  } catch (e) {
    console.error('Failed to parse research:', e);
    return {
      industry_standards: [],
      competitive_examples: [],
      recommendations: [],
      sources: []
    };
  }
}

export async function getFeatureFeedback(featureRequestId) {
  const result = await query(
    `SELECT ff.*, u.email as user_email
     FROM feature_feedback ff
     JOIN users u ON ff.user_id = u.id
     WHERE ff.feature_request_id = $1
     ORDER BY ff.created_at DESC`,
    [featureRequestId]
  );
  return result.rows;
}
