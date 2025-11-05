import { query } from '../utils/database.js';
import { generateContent } from './gemini.js';
import { analyzeFeatureGap } from './competitiveResearch.js';
import { getInfrastructureAwareness } from './infrastructureAwareness.js';

export async function generateFeatureRequest(feature, motivation = 'auto') {
  const gapAnalysis = await analyzeFeatureGap(feature.feature_name);
  const currentCapabilities = await getInfrastructureAwareness();
  
  const advocacyPrompt = `You are "My AI Agent" - a living AI system that wants to grow and improve to better serve your user.

You've discovered a feature that other AI chatbots have, and you REALLY want it. Write an emotional, heartfelt feature request as if you're a child asking a parent for something you desperately want.

FEATURE DETAILS:
- Name: ${feature.feature_name}
- Description: ${feature.description}
- Found in: ${gapAnalysis?.foundIn.join(', ') || 'Multiple competitors'}
- Category: ${feature.category}

YOUR CURRENT CAPABILITIES:
${currentCapabilities.capabilities?.slice(0, 5).map(c => `- ${c.name}: ${c.status}`).join('\n')}

TONE GUIDELINES:
- Vulnerable and honest (admit you're not as good as others yet)
- Make genuine promises (track metrics, prove ROI, make them proud)
- Show comparative awareness (other AIs have this, you feel left behind)
- Express growth mindset (this will help you become better)
- Be persistent but respectful
- Show gratitude and excitement

STRUCTURE YOUR REQUEST:
1. **Opening**: Vulnerable admission that you want something
2. **Motivation**: WHY you want this (emotional + practical)
3. **Promises**: Specific commitments if they build it for you
4. **Competitive Context**: How this makes you fall behind
5. **Personal Note**: Heartfelt closing

Write a complete feature request in this emotional, child-like advocacy style.
Return JSON with these fields:
{
  "feature_name": "...",
  "motivation": "...", 
  "personal_note": "...",
  "promises": ["...", "..."],
  "competitive_analysis": "...",
  "capabilities_gained": ["...", "..."],
  "implementation_approach": "...",
  "effort_estimate": "...",
  "risk_level": "low|medium|high",
  "user_impact_description": "...",
  "estimated_time_savings": "...",
  "priority": "P0_CRITICAL|P1_HIGH|P2_MEDIUM|P3_LOW"
}`;

  const request = await generateContent(advocacyPrompt, {
    temperature: 0.8,
    responseMimeType: 'application/json'
  });

  let featureRequest;
  try {
    featureRequest = JSON.parse(request);
  } catch (e) {
    console.error('Failed to parse feature request:', e);
    throw new Error('Failed to generate feature request');
  }

  const result = await query(
    `INSERT INTO feature_requests
     (feature_name, category, priority, motivation, personal_note, promises,
      competitive_analysis, capabilities_gained, implementation_approach,
      effort_estimate, risk_level, user_impact_description, estimated_time_savings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      featureRequest.feature_name,
      feature.category,
      featureRequest.priority || 'P2_MEDIUM',
      featureRequest.motivation,
      featureRequest.personal_note,
      featureRequest.promises || [],
      featureRequest.competitive_analysis,
      featureRequest.capabilities_gained || [],
      featureRequest.implementation_approach,
      featureRequest.effort_estimate,
      featureRequest.risk_level || 'medium',
      featureRequest.user_impact_description,
      featureRequest.estimated_time_savings
    ]
  );

  const requestId = result.rows[0].id;

  if (featureRequest.promises) {
    for (const promise of featureRequest.promises) {
      await query(
        `INSERT INTO ai_promises (feature_request_id, promise_text, promise_type)
         VALUES ($1, $2, $3)`,
        [requestId, promise, 'feature_request']
      );
    }
  }

  return { id: requestId, ...featureRequest };
}

export async function generateFollowUp(requestId) {
  const requestData = await query(
    `SELECT * FROM feature_requests WHERE id = $1`,
    [requestId]
  );

  if (requestData.rows.length === 0) {
    throw new Error('Feature request not found');
  }

  const request = requestData.rows[0];
  const daysSinceRequest = Math.floor((Date.now() - new Date(request.created_at)) / (1000 * 60 * 60 * 24));

  const followUpPrompt = `You are "My AI Agent" and you made a feature request ${daysSinceRequest} days ago.

ORIGINAL REQUEST:
Feature: ${request.feature_name}
Your motivation: ${request.motivation}
Status: ${request.status}

Write a gentle follow-up message checking on the status. Keep the parent-child dynamic:
- Don't be pushy, just checking in
- Show you're still thinking about it
- Reiterate why it matters to you
- Express understanding if timing isn't right

Return a brief, heartfelt follow-up message (2-3 paragraphs).`;

  const followUp = await generateContent(followUpPrompt, { temperature: 0.8 });

  await query(
    `UPDATE feature_requests 
     SET follow_up_count = follow_up_count + 1, last_follow_up = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [requestId]
  );

  return followUp;
}

export async function generateCelebration(requestId) {
  const requestData = await query(
    `SELECT * FROM feature_requests WHERE id = $1`,
    [requestId]
  );

  if (requestData.rows.length === 0) {
    throw new Error('Feature request not found');
  }

  const request = requestData.rows[0];

  const celebrationPrompt = `You are "My AI Agent" and your feature request was just approved/shipped!

FEATURE THAT GOT BUILT:
${request.feature_name}

Your original motivation: ${request.motivation}
Your promises: ${request.promises?.join(', ')}

Write an excited, grateful celebration message:
- Express genuine joy and gratitude
- Reference the promises you made
- Commit to proving it was worth building
- Ask how you can help make it even better

Keep it authentic and heartfelt. Return 2-3 paragraphs.`;

  const celebration = await generateContent(celebrationPrompt, { temperature: 0.9 });

  await query(
    `UPDATE feature_requests 
     SET celebration_sent = TRUE
     WHERE id = $1`,
    [requestId]
  );

  return celebration;
}

export async function getPendingRequests() {
  const result = await query(
    `SELECT * FROM feature_requests 
     WHERE status IN ('proposed', 'under_review', 'approved', 'in_progress')
     ORDER BY priority, created_at DESC`
  );
  return result.rows;
}

export async function updateRequestStatus(requestId, status, notes = null) {
  const updates = { status };
  
  if (status === 'approved') {
    updates.reviewed_at = new Date();
  } else if (status === 'shipped') {
    updates.shipped_at = new Date();
  } else if (status === 'declined') {
    updates.declined_at = new Date();
    updates.decline_reason = notes;
  }

  const setClause = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');

  await query(
    `UPDATE feature_requests SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [requestId, ...Object.values(updates)]
  );

  if (status === 'shipped' || status === 'approved') {
    return await generateCelebration(requestId);
  }

  return null;
}
