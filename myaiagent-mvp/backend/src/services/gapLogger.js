import { query } from '../utils/database.js';

/**
 * Gap Logger Service
 * Tracks when AI encounters limitations or missing capabilities
 * This enables continuous improvement by identifying what the AI needs
 */

/**
 * Log a capability gap
 * Called when AI tries to do something it can't
 */
export async function logCapabilityGap(gapData) {
  try {
    const {
      userId,
      conversationId,
      requestedCapability,
      gapType, // 'missing_function', 'missing_access', 'missing_integration', 'missing_data'
      description,
      suggestedSolution
    } = gapData;

    // Check if this gap already exists (to avoid duplicates)
    const existing = await query(
      `SELECT id FROM capability_gaps 
       WHERE user_id = $1 AND requested_capability = $2 AND gap_type = $3
       ORDER BY created_at DESC LIMIT 1`,
      [userId, requestedCapability, gapType]
    );

    if (existing.rows.length > 0) {
      // Update occurrence count instead of creating duplicate
      await query(
        `UPDATE capability_gaps 
         SET occurrence_count = occurrence_count + 1,
             last_occurred_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [existing.rows[0].id]
      );

      console.log(`📊 Updated gap occurrence: ${requestedCapability} (${gapType})`);
      return { logged: true, updated: true };
    }

    // Insert new gap
    await query(
      `INSERT INTO capability_gaps 
       (user_id, conversation_id, requested_capability, gap_type, description, suggested_solution, occurrence_count)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [userId, conversationId, requestedCapability, gapType, description, suggestedSolution]
    );

    console.log(`📝 Logged new capability gap: ${requestedCapability} (${gapType})`);
    return { logged: true, updated: false };

  } catch (error) {
    // Check if table doesn't exist - this is expected on first run
    if (error.message.includes('relation "capability_gaps" does not exist')) {
      console.log('⚠️  Capability gaps table not created yet. Creating it now...');
      await createCapabilityGapsTable();
      // Retry logging
      return logCapabilityGap(gapData);
    }
    
    console.error('Error logging capability gap:', error);
    return { logged: false, error: error.message };
  }
}

/**
 * Create capability gaps table if it doesn't exist
 */
async function createCapabilityGapsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS capability_gaps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        requested_capability TEXT NOT NULL,
        gap_type TEXT NOT NULL,
        description TEXT,
        suggested_solution TEXT,
        occurrence_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved BOOLEAN DEFAULT FALSE,
        resolution_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_capability_gaps_user ON capability_gaps(user_id);
      CREATE INDEX IF NOT EXISTS idx_capability_gaps_type ON capability_gaps(gap_type);
      CREATE INDEX IF NOT EXISTS idx_capability_gaps_resolved ON capability_gaps(resolved);
    `);

    console.log('✅ Created capability_gaps table');
  } catch (error) {
    console.error('Error creating capability_gaps table:', error);
  }
}

/**
 * Get capability gaps for a user (for learning insights)
 */
export async function getUserCapabilityGaps(userId, limit = 10) {
  try {
    const result = await query(
      `SELECT 
        requested_capability,
        gap_type,
        description,
        suggested_solution,
        occurrence_count,
        created_at,
        last_occurred_at
       FROM capability_gaps
       WHERE user_id = $1 AND resolved = FALSE
       ORDER BY occurrence_count DESC, last_occurred_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    if (error.message.includes('relation "capability_gaps" does not exist')) {
      await createCapabilityGapsTable();
      return [];
    }
    console.error('Error getting capability gaps:', error);
    return [];
  }
}

/**
 * Generate gap awareness prompt
 * Shows AI what limitations have been encountered
 */
export async function generateGapAwarenessPrompt(userId) {
  if (!userId) return '';

  const gaps = await getUserCapabilityGaps(userId, 5);

  if (gaps.length === 0) {
    return `\n## 🔍 CAPABILITY GAPS & LEARNING

**Status**: No capability gaps logged yet.

When you encounter something you cannot do, the system will track it here so you can:
- Be aware of your limitations
- Explain them clearly to users
- Learn what capabilities need to be added
`;
  }

  let prompt = `\n## 🔍 CAPABILITY GAPS & CONTINUOUS LEARNING

These are capabilities users have requested that you couldn't provide. Learn from this:

`;

  gaps.forEach((gap, index) => {
    prompt += `
**Gap #${index + 1}: ${gap.requested_capability}**
- Type: ${gap.gap_type.replace('_', ' ').toUpperCase()}
- What happened: ${gap.description || 'User requested this capability'}
- How to fix: ${gap.suggested_solution || 'Needs implementation'}
- Times requested: ${gap.occurrence_count}
- First seen: ${new Date(gap.created_at).toLocaleDateString()}
- Last seen: ${new Date(gap.last_occurred_at).toLocaleDateString()}
`;
  });

  prompt += `
---

**Learning from Gaps**:
When you encounter these or similar requests:
1. Acknowledge the limitation clearly
2. Reference this gap log to explain why
3. Suggest the documented solution
4. Offer alternative capabilities that CAN help

**Example Response**:
"I understand you want to [requested capability]. This is currently a known gap in my capabilities (logged ${gaps.length} time${gaps.length > 1 ? 's' : ''} before). ${gaps[0]?.suggested_solution || 'To enable this, we would need to implement the necessary integration.'}  However, I can help you with [alternative] instead."

Use this to provide informed, helpful responses even when you can't do exactly what's asked!`;

  return prompt;
}

/**
 * Mark a gap as resolved
 */
export async function resolveCapabilityGap(gapId, resolutionNotes) {
  try {
    await query(
      `UPDATE capability_gaps 
       SET resolved = TRUE, resolution_notes = $1
       WHERE id = $2`,
      [resolutionNotes, gapId]
    );

    console.log(`✅ Resolved capability gap #${gapId}`);
    return { success: true };
  } catch (error) {
    console.error('Error resolving capability gap:', error);
    return { success: false, error: error.message };
  }
}

export default {
  logCapabilityGap,
  getUserCapabilityGaps,
  generateGapAwarenessPrompt,
  resolveCapabilityGap
};
