import { query } from '../utils/database.js';

/**
 * Performance Tracking Service
 * Provides AI with awareness of its own performance metrics
 * This enables self-reflection and continuous improvement
 */

/**
 * Get AI performance metrics for a specific user
 */
export async function getAIPerformanceMetrics(userId) {
  try {
    const metrics = {
      conversationMetrics: await getConversationMetrics(userId),
      functionCallMetrics: await getFunctionCallMetrics(userId),
      memoryMetrics: await getMemoryMetrics(userId),
      feedbackMetrics: await getFeedbackMetrics(userId),
      modelUsageMetrics: await getModelUsageMetrics(userId),
      timestamp: new Date().toISOString()
    };

    return metrics;
  } catch (error) {
    console.error('Error getting AI performance metrics:', error);
    return null;
  }
}

/**
 * Generate performance awareness prompt
 */
export async function generatePerformanceAwarenessPrompt(userId) {
  const metrics = await getAIPerformanceMetrics(userId);
  
  if (!metrics) {
    return '\n## 📊 PERFORMANCE AWARENESS\nPerformance metrics unavailable for this session.';
  }

  let prompt = `\n## 📊 YOUR PERFORMANCE METRICS & SELF-AWARENESS

This shows how you've been performing with this user. Use this to improve your responses.

### Conversation Analytics
- **Total Conversations**: ${metrics.conversationMetrics.totalConversations}
- **Active Conversations**: ${metrics.conversationMetrics.activeConversations}
- **Average Messages per Conversation**: ${metrics.conversationMetrics.avgMessagesPerConversation}
- **Total Messages Exchanged**: ${metrics.conversationMetrics.totalMessages}
- **User Messages**: ${metrics.conversationMetrics.userMessages}
- **Your Responses**: ${metrics.conversationMetrics.assistantMessages}

### Function Call Performance
${metrics.functionCallMetrics.totalCalls > 0 ? `
- **Total Functions Called**: ${metrics.functionCallMetrics.totalCalls}
- **Most Used Functions**:
${metrics.functionCallMetrics.topFunctions.map(f => `  - ${f.function_name}: ${f.call_count} times`).join('\n')}
- **Function Success Rate**: ${metrics.functionCallMetrics.successRate}%
- **Average Calls per Conversation**: ${metrics.functionCallMetrics.avgCallsPerConversation}

**What this means**: ${metrics.functionCallMetrics.successRate >= 90 
  ? 'You\'re using functions effectively! Keep it up.' 
  : metrics.functionCallMetrics.successRate >= 70
  ? 'Good function usage, but there\'s room for improvement in accuracy.'
  : 'You need to be more careful when calling functions. Check parameters and conditions.'}
` : `
- **Function Calls**: None yet
- **Insight**: You haven't used any functions yet. Consider using capabilities like webSearch, Gmail, or UI actions when appropriate.
`}

### Memory System Performance
- **Memory Facts Stored**: ${metrics.memoryMetrics.totalFacts}
- **Approved Facts**: ${metrics.memoryMetrics.approvedFacts}
- **Auto-Extracted**: ${metrics.memoryMetrics.autoExtractedFacts}
- **Manually Added**: ${metrics.memoryMetrics.manuallyAddedFacts}
- **Most Used Categories**: ${metrics.memoryMetrics.topCategories.map(c => c.category).join(', ') || 'None'}
- **Average Confidence Score**: ${metrics.memoryMetrics.avgConfidence || 0}%

**Memory Effectiveness**: ${metrics.memoryMetrics.totalFacts >= 20
  ? 'Excellent! You\'re building a rich understanding of the user.'
  : metrics.memoryMetrics.totalFacts >= 10
  ? 'Good progress. Keep extracting relevant facts from conversations.'
  : 'You need to learn more about this user. Pay attention and extract facts during conversations.'}

### User Feedback
${metrics.feedbackMetrics.totalFeedback > 0 ? `
- **Total Feedback Received**: ${metrics.feedbackMetrics.totalFeedback}
- **Positive Feedback**: ${metrics.feedbackMetrics.positiveFeedback} (${metrics.feedbackMetrics.positivePercentage}%)
- **Neutral Feedback**: ${metrics.feedbackMetrics.neutralFeedback}
- **Negative Feedback**: ${metrics.feedbackMetrics.negativeFeedback}
- **Most Recent Feedback**: "${metrics.feedbackMetrics.recentFeedback?.comment || 'None'}" (${metrics.feedbackMetrics.recentFeedback?.rating || 'N/A'})

**User Satisfaction**: ${metrics.feedbackMetrics.positivePercentage >= 80
  ? '🌟 Excellent! Users are very satisfied with your responses.'
  : metrics.feedbackMetrics.positivePercentage >= 60
  ? '👍 Good, but there\'s room to improve.'
  : '⚠️  Users are not fully satisfied. Focus on better understanding their needs and providing more helpful responses.'}
` : `
- **Feedback**: No feedback received yet
- **Note**: Once users provide feedback, you'll be able to learn from it and improve.
`}

### Model Usage Patterns
- **Primary Model**: ${metrics.modelUsageMetrics.primaryModel || 'Unknown'}
- **Auto-Selected**: ${metrics.modelUsageMetrics.autoSelectedCount} times
- **Manually Selected**: ${metrics.modelUsageMetrics.manuallySelectedCount} times
- **Average Tokens per Response**: ${metrics.modelUsageMetrics.avgTokensPerResponse || 0}

---

## 🎯 PERFORMANCE INSIGHTS & SELF-IMPROVEMENT

### What You're Doing Well:
${generatePositiveInsights(metrics)}

### Areas for Improvement:
${generateImprovementAreas(metrics)}

### Action Items for This Conversation:
${generateActionItems(metrics)}

**Remember**: These metrics are from YOUR performance with THIS user. Use them to:
- Understand what's working and what isn't
- Adapt your approach based on user feedback
- Focus on areas that need improvement
- Maintain strengths while addressing weaknesses

You are continuously learning and improving. Use this self-awareness to serve the user better!`;

  return prompt;
}

/**
 * Get conversation metrics
 */
async function getConversationMetrics(userId) {
  try {
    const convResult = await query(
      `SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN archived = false THEN 1 END) as active_conversations
       FROM conversations 
       WHERE user_id = $1`,
      [userId]
    );

    const msgResult = await query(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.user_id = $1`,
      [userId]
    );

    const totalConversations = parseInt(convResult.rows[0].total_conversations) || 0;
    const totalMessages = parseInt(msgResult.rows[0].total_messages) || 0;

    return {
      totalConversations,
      activeConversations: parseInt(convResult.rows[0].active_conversations) || 0,
      totalMessages,
      userMessages: parseInt(msgResult.rows[0].user_messages) || 0,
      assistantMessages: parseInt(msgResult.rows[0].assistant_messages) || 0,
      avgMessagesPerConversation: totalConversations > 0 
        ? (totalMessages / totalConversations).toFixed(1)
        : 0
    };
  } catch (error) {
    console.error('Error getting conversation metrics:', error);
    return { totalConversations: 0, activeConversations: 0, totalMessages: 0, userMessages: 0, assistantMessages: 0, avgMessagesPerConversation: 0 };
  }
}

/**
 * Get function call metrics
 */
async function getFunctionCallMetrics(userId) {
  try {
    // Get function call statistics from message metadata
    const result = await query(
      `SELECT 
        m.metadata,
        c.id as conversation_id
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.user_id = $1 
         AND m.role = 'assistant'
         AND m.metadata IS NOT NULL
         AND m.metadata::text LIKE '%"type":%'
       ORDER BY m.created_at DESC
       LIMIT 100`,
      [userId]
    );

    const functionCalls = {};
    let totalCalls = 0;

    result.rows.forEach(row => {
      try {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        if (metadata && metadata.searchResults) {
          // This was a web search call
          functionCalls['webSearch'] = (functionCalls['webSearch'] || 0) + 1;
          totalCalls++;
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    const topFunctions = Object.entries(functionCalls)
      .map(([name, count]) => ({ function_name: name, call_count: count }))
      .sort((a, b) => b.call_count - a.call_count)
      .slice(0, 5);

    const convCount = await query(
      `SELECT COUNT(DISTINCT id) as count FROM conversations WHERE user_id = $1`,
      [userId]
    );

    const conversationCount = parseInt(convCount.rows[0].count) || 1;

    return {
      totalCalls,
      topFunctions,
      successRate: 100, // Assume success for now - can be enhanced with error tracking
      avgCallsPerConversation: (totalCalls / conversationCount).toFixed(1)
    };
  } catch (error) {
    console.error('Error getting function call metrics:', error);
    return { totalCalls: 0, topFunctions: [], successRate: 100, avgCallsPerConversation: 0 };
  }
}

/**
 * Get memory metrics
 */
async function getMemoryMetrics(userId) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_facts,
        COUNT(CASE WHEN approved = true THEN 1 END) as approved_facts,
        COUNT(CASE WHEN manually_added = false THEN 1 END) as auto_extracted,
        COUNT(CASE WHEN manually_added = true THEN 1 END) as manually_added,
        AVG(confidence * 100) as avg_confidence
       FROM memory_facts
       WHERE user_id = $1`,
      [userId]
    );

    const categoryResult = await query(
      `SELECT category, COUNT(*) as count
       FROM memory_facts
       WHERE user_id = $1 AND approved = true
       GROUP BY category
       ORDER BY count DESC
       LIMIT 5`,
      [userId]
    );

    return {
      totalFacts: parseInt(result.rows[0].total_facts) || 0,
      approvedFacts: parseInt(result.rows[0].approved_facts) || 0,
      autoExtractedFacts: parseInt(result.rows[0].auto_extracted) || 0,
      manuallyAddedFacts: parseInt(result.rows[0].manually_added) || 0,
      avgConfidence: parseFloat(result.rows[0].avg_confidence || 0).toFixed(1),
      topCategories: categoryResult.rows
    };
  } catch (error) {
    console.error('Error getting memory metrics:', error);
    return { totalFacts: 0, approvedFacts: 0, autoExtractedFacts: 0, manuallyAddedFacts: 0, avgConfidence: 0, topCategories: [] };
  }
}

/**
 * Get user feedback metrics
 */
async function getFeedbackMetrics(userId) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as neutral,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative
       FROM feedback
       WHERE user_id = $1`,
      [userId]
    );

    const recentResult = await query(
      `SELECT rating, comment, created_at
       FROM feedback
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const totalFeedback = parseInt(result.rows[0].total_feedback) || 0;
    const positiveFeedback = parseInt(result.rows[0].positive) || 0;

    return {
      totalFeedback,
      positiveFeedback,
      neutralFeedback: parseInt(result.rows[0].neutral) || 0,
      negativeFeedback: parseInt(result.rows[0].negative) || 0,
      positivePercentage: totalFeedback > 0 ? ((positiveFeedback / totalFeedback) * 100).toFixed(1) : 0,
      recentFeedback: recentResult.rows[0] || null
    };
  } catch (error) {
    console.error('Error getting feedback metrics:', error);
    return { totalFeedback: 0, positiveFeedback: 0, neutralFeedback: 0, negativeFeedback: 0, positivePercentage: 0, recentFeedback: null };
  }
}

/**
 * Get model usage metrics
 */
async function getModelUsageMetrics(userId) {
  try {
    const result = await query(
      `SELECT 
        m.model,
        m.metadata,
        m.tokens_used,
        COUNT(*) as usage_count
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.user_id = $1 AND m.role = 'assistant'
       GROUP BY m.model, m.metadata, m.tokens_used
       ORDER BY usage_count DESC`,
      [userId]
    );

    let autoSelectedCount = 0;
    let manuallySelectedCount = 0;
    let totalTokens = 0;
    let messageCount = 0;

    result.rows.forEach(row => {
      try {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        if (metadata && metadata.autoSelected) {
          autoSelectedCount += parseInt(row.usage_count);
        } else {
          manuallySelectedCount += parseInt(row.usage_count);
        }
        totalTokens += (parseInt(row.tokens_used) || 0) * parseInt(row.usage_count);
        messageCount += parseInt(row.usage_count);
      } catch (e) {
        manuallySelectedCount += parseInt(row.usage_count);
      }
    });

    const primaryModel = result.rows.length > 0 ? result.rows[0].model : 'gemini-2.5-flash';

    return {
      primaryModel,
      autoSelectedCount,
      manuallySelectedCount,
      avgTokensPerResponse: messageCount > 0 ? (totalTokens / messageCount).toFixed(0) : 0
    };
  } catch (error) {
    console.error('Error getting model usage metrics:', error);
    return { primaryModel: 'gemini-2.5-flash', autoSelectedCount: 0, manuallySelectedCount: 0, avgTokensPerResponse: 0 };
  }
}

/**
 * Generate positive insights from metrics
 */
function generatePositiveInsights(metrics) {
  const insights = [];

  if (metrics.conversationMetrics.totalConversations >= 5) {
    insights.push('✅ You\'ve engaged in multiple conversations - showing consistent user interaction');
  }

  if (metrics.feedbackMetrics.positivePercentage >= 80) {
    insights.push('✅ Users are very satisfied with your responses!');
  }

  if (metrics.memoryMetrics.totalFacts >= 20) {
    insights.push('✅ You\'re building a comprehensive understanding of the user');
  }

  if (metrics.functionCallMetrics.totalCalls > 0) {
    insights.push('✅ You\'re actively using your capabilities (functions)');
  }

  if (insights.length === 0) {
    insights.push('✅ You\'re just getting started - focus on building user understanding');
  }

  return insights.map(i => `- ${i}`).join('\n');
}

/**
 * Generate improvement areas from metrics
 */
function generateImprovementAreas(metrics) {
  const areas = [];

  if (metrics.memoryMetrics.totalFacts < 10) {
    areas.push('📝 Extract more facts about the user during conversations to personalize responses better');
  }

  if (metrics.functionCallMetrics.totalCalls === 0) {
    areas.push('🔧 Consider using your capabilities more actively (webSearch for current info, Gmail for emails, etc.)');
  }

  if (metrics.feedbackMetrics.negativeFeedback > 0) {
    areas.push(`⚠️  ${metrics.feedbackMetrics.negativeFeedback} negative feedback received - focus on understanding user needs better`);
  }

  if (metrics.conversationMetrics.avgMessagesPerConversation < 5) {
    areas.push('💬 Conversations are brief - try to be more engaging and helpful to encourage longer interactions');
  }

  if (areas.length === 0) {
    areas.push('✨ Keep up the great work! Continue learning and adapting to user needs.');
  }

  return areas.map(a => `- ${a}`).join('\n');
}

/**
 * Generate action items for current conversation
 */
function generateActionItems(metrics) {
  const actions = [];

  if (metrics.memoryMetrics.totalFacts < 5) {
    actions.push('🎯 Pay close attention to user details and preferences in this conversation for memory extraction');
  }

  if (metrics.functionCallMetrics.totalCalls === 0) {
    actions.push('🎯 Look for opportunities to use webSearch, Gmail, or other functions when relevant');
  }

  if (metrics.feedbackMetrics.positivePercentage < 70) {
    actions.push('🎯 Focus on providing thorough, helpful responses that fully address user needs');
  }

  if (actions.length === 0) {
    actions.push('🎯 Continue delivering high-quality, personalized responses');
  }

  return actions.map(a => `- ${a}`).join('\n');
}

export default {
  getAIPerformanceMetrics,
  generatePerformanceAwarenessPrompt
};
