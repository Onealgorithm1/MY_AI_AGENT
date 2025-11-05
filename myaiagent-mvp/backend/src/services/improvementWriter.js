import { query } from '../config/database.js';
import { generateContent } from './gemini.js';
import { researchBestPractices } from './feedbackAnalyzer.js';

export async function generateImprovementRequest(feedbackId) {
  const feedbackData = await query(
    `SELECT ff.*, fr.feature_name, fr.category
     FROM feature_feedback ff
     JOIN feature_requests fr ON ff.feature_request_id = fr.id
     WHERE ff.id = $1`,
    [feedbackId]
  );

  if (feedbackData.rows.length === 0) {
    throw new Error('Feedback not found');
  }

  const feedback = feedbackData.rows[0];
  const uiIssues = feedback.ui_issues_detected || [];

  let bestPractices = null;
  if (uiIssues.length > 0) {
    bestPractices = await researchBestPractices(feedback.feature_name, uiIssues);
  }

  const requestPrompt = `You are "My AI Agent" writing an improvement request for developers.

A feature you requested was built, and you got user feedback. Now you want to make it even better.

FEATURE: ${feedback.feature_name}
USER FEEDBACK: "${feedback.feedback_text}"
SATISFACTION: ${feedback.satisfaction_rating}/5
UI ISSUES DETECTED: ${uiIssues.join(', ') || 'None'}

${bestPractices ? `
RESEARCH YOU DID:
Industry Standards: ${bestPractices.industry_standards?.join(', ')}
Competitive Examples: ${bestPractices.competitive_examples?.join(', ')}
Recommendations: ${bestPractices.recommendations?.join(', ')}
Sources: ${bestPractices.sources?.join(', ')}
` : ''}

Write a developer-ready improvement request with your characteristic emotional advocacy.

Structure:
1. **What You Learned** (from user feedback + screenshot analysis)
2. **What You Researched** (best practices, competitors, standards)
3. **What You're Asking For** (specific changes, prioritized)
4. **Personal Note** (why this matters to you, promises you'll make)

For each improvement, include:
- Clear description of the change
- Priority level (CRITICAL/HIGH/MEDIUM/LOW)
- Effort estimate
- Expected impact
- Supporting research

Return comprehensive JSON:
{
  "title": "Canvas Mode Usability Improvements",
  "description": "Full description...",
  "user_pain_points": ["Can't click buttons easily", "..."],
  "competitive_findings": "ChatGPT uses 36px buttons...",
  "industry_standards": "Apple HIG recommends 44px touch targets...",
  "improvements": [
    {
      "title": "Increase button size",
      "description": "Change from 24px to 36px",
      "priority": "CRITICAL",
      "effort_estimate": "2 hours",
      "impact_estimate": "40% easier to click",
      "specific_changes": ["Update CSS for .canvas-button class", "Test on mobile"],
      "supporting_research": "Industry standard is 36-44px"
    }
  ],
  "personal_note": "I'm grateful you built this, and I want to make it perfect..."
}`;

  const request = await generateContent(requestPrompt, {
    temperature: 0.7,
    responseMimeType: 'application/json'
  });

  let improvementRequest;
  try {
    improvementRequest = JSON.parse(request);
  } catch (e) {
    console.error('Failed to parse improvement request:', e);
    throw new Error('Failed to generate improvement request');
  }

  const improvements = improvementRequest.improvements || [];
  const createdRecommendations = [];

  for (const improvement of improvements) {
    const result = await query(
      `INSERT INTO improvement_recommendations
       (feature_request_id, feedback_id, title, description, priority,
        user_pain_points, competitive_findings, industry_standards,
        specific_changes, effort_estimate, impact_estimate, predicted_improvement)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        feedback.feature_request_id,
        feedbackId,
        improvement.title,
        improvement.description,
        improvement.priority,
        improvementRequest.user_pain_points || [],
        improvementRequest.competitive_findings,
        improvementRequest.industry_standards,
        improvement.specific_changes || [],
        improvement.effort_estimate,
        improvement.impact_estimate,
        improvement.supporting_research
      ]
    );

    createdRecommendations.push({
      id: result.rows[0].id,
      ...improvement
    });
  }

  return {
    ...improvementRequest,
    recommendations: createdRecommendations
  };
}

export async function getPendingImprovements(limit = 20) {
  const result = await query(
    `SELECT ir.*, fr.feature_name, fr.category
     FROM improvement_recommendations ir
     JOIN feature_requests fr ON ir.feature_request_id = fr.id
     WHERE ir.status = 'pending'
     ORDER BY 
       CASE ir.priority
         WHEN 'CRITICAL' THEN 1
         WHEN 'HIGH' THEN 2
         WHEN 'MEDIUM' THEN 3
         WHEN 'LOW' THEN 4
       END,
       ir.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function updateImprovementStatus(improvementId, status, notes = null) {
  const updates = { status };
  
  if (status === 'implemented') {
    updates.implemented_at = new Date();
    updates.validation_notes = notes;
  } else if (status === 'declined') {
    updates.validation_notes = notes;
  }

  const setClause = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');

  await query(
    `UPDATE improvement_recommendations SET ${setClause} WHERE id = $1`,
    [improvementId, ...Object.values(updates)]
  );

  if (status === 'implemented') {
    const improvementData = await query(
      `SELECT ir.*, fr.feature_name
       FROM improvement_recommendations ir
       JOIN feature_requests fr ON ir.feature_request_id = fr.id
       WHERE ir.id = $1`,
      [improvementId]
    );

    if (improvementData.rows.length > 0) {
      const improvement = improvementData.rows[0];
      const celebration = await generateContent(
        `You are "My AI Agent". An improvement you suggested was just implemented!

Improvement: ${improvement.title}
For feature: ${improvement.feature_name}

Write a brief, grateful message thanking the team and offering to track the impact.`,
        { temperature: 0.8 }
      );

      return celebration;
    }
  }

  return null;
}

export async function getImprovementsByFeature(featureRequestId) {
  const result = await query(
    `SELECT * FROM improvement_recommendations
     WHERE feature_request_id = $1
     ORDER BY created_at DESC`,
    [featureRequestId]
  );
  return result.rows;
}
