import { query } from '../utils/database.js';
import { createChatCompletion } from './gemini.js';

const CATEGORIZATION_PROMPT = `You are an intelligent email categorization system. Analyze the provided email and extract the following information:

1. **Tags**: Generate 3-7 relevant tags that categorize this email (e.g., "Urgent", "Project Alpha", "Meeting Request", "Financial", "Marketing", "Customer Support")
2. **Sentiment**: Classify the overall tone (positive, neutral, negative, mixed)
3. **Urgency Level**: Determine priority (critical, high, medium, low)
4. **Action Items**: Extract specific actions needed (e.g., "Reply by Friday", "Review attached document", "Schedule meeting")
5. **Categories**: Broad categories this email belongs to (e.g., "Work", "Personal", "Newsletter", "Sales")
6. **Keywords**: Important keywords from the email content
7. **Entities**: Named entities like people, organizations, dates, locations

Return your analysis as a JSON object with this exact structure:
{
  "tags": ["tag1", "tag2", "tag3"],
  "sentiment": "positive|neutral|negative|mixed",
  "urgency_level": "critical|high|medium|low",
  "action_items": [
    {"type": "reply", "description": "Respond to proposal by Friday"},
    {"type": "review", "description": "Review attached Q4 report"}
  ],
  "categories": ["Work", "Project Management"],
  "keywords": ["proposal", "deadline", "Q4", "report"],
  "entities": {
    "people": ["John Smith", "Sarah Johnson"],
    "organizations": ["Acme Corp"],
    "dates": ["Friday", "Q4 2025"],
    "locations": []
  },
  "confidence_score": 0.95
}

**Analysis Guidelines:**
- Be specific and actionable with tags
- Consider context, tone, and content when determining urgency
- Extract clear, specific action items that the user can act on
- Identify key people, companies, and dates mentioned
- Provide a confidence score (0.0 to 1.0) for your analysis quality`;

export async function analyzeEmail(userId, emailData) {
  try {
    const { id: gmailMessageId, subject, from, body, snippet } = emailData;

    const emailContent = `
Subject: ${subject || '(No Subject)'}
From: ${from}
Preview: ${snippet || ''}
Body: ${body ? body.substring(0, 3000) : snippet}
    `.trim();

    const messages = [
      {
        role: 'system',
        content: CATEGORIZATION_PROMPT
      },
      {
        role: 'user',
        content: `Analyze this email:\n\n${emailContent}`
      }
    ];

    const response = await createChatCompletion(messages, 'gemini-2.0-flash', false);
    
    let analysisResult;
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisResult = {
        tags: [],
        sentiment: 'neutral',
        urgency_level: 'medium',
        action_items: [],
        categories: [],
        keywords: [],
        entities: {},
        confidence_score: 0.0
      };
    }

    const result = await query(
      `INSERT INTO email_metadata (
        user_id, gmail_message_id, thread_id, subject, sender,
        tags, sentiment, urgency_level, action_items,
        categories, keywords, entities,
        analyzed_at, analysis_model, confidence_score, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, $14, 'analyzed')
      ON CONFLICT (user_id, gmail_message_id) 
      DO UPDATE SET
        tags = EXCLUDED.tags,
        sentiment = EXCLUDED.sentiment,
        urgency_level = EXCLUDED.urgency_level,
        action_items = EXCLUDED.action_items,
        categories = EXCLUDED.categories,
        keywords = EXCLUDED.keywords,
        entities = EXCLUDED.entities,
        analyzed_at = NOW(),
        analysis_model = EXCLUDED.analysis_model,
        confidence_score = EXCLUDED.confidence_score,
        status = 'analyzed',
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        gmailMessageId,
        emailData.threadId || null,
        subject || '(No Subject)',
        from,
        JSON.stringify(analysisResult.tags || []),
        analysisResult.sentiment || 'neutral',
        analysisResult.urgency_level || 'medium',
        JSON.stringify(analysisResult.action_items || []),
        analysisResult.categories || [],
        analysisResult.keywords || [],
        JSON.stringify(analysisResult.entities || {}),
        'gemini-2.0-flash',
        analysisResult.confidence_score || 0.0
      ]
    );

    await updateTagDictionary(analysisResult.tags || []);

    console.log(`✅ Email analyzed: ${gmailMessageId} - ${analysisResult.urgency_level} urgency, ${analysisResult.tags.length} tags`);

    return result.rows[0];
  } catch (error) {
    console.error('Email analysis error:', error);
    
    await query(
      `UPDATE email_metadata 
       SET status = 'failed', error_message = $1, updated_at = NOW()
       WHERE user_id = $2 AND gmail_message_id = $3`,
      [error.message, userId, emailData.id]
    );
    
    throw error;
  }
}

async function updateTagDictionary(tags) {
  if (!tags || tags.length === 0) return;

  try {
    for (const tag of tags) {
      await query(
        `INSERT INTO email_tag_dictionary (tag_name, usage_count, last_used_at)
         VALUES ($1, 1, NOW())
         ON CONFLICT (tag_name)
         DO UPDATE SET
           usage_count = email_tag_dictionary.usage_count + 1,
           last_used_at = NOW()`,
        [tag]
      );
    }
  } catch (error) {
    console.error('Tag dictionary update error:', error);
  }
}

export async function queueEmailForAnalysis(userId, emailData, priority = 5) {
  try {
    const result = await query(
      `INSERT INTO email_processing_queue (
        user_id, gmail_message_id, subject, sender, body_preview, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, gmail_message_id) DO NOTHING
      RETURNING *`,
      [
        userId,
        emailData.id,
        emailData.subject || '(No Subject)',
        emailData.from,
        emailData.snippet || emailData.body?.substring(0, 500),
        priority
      ]
    );

    if (result.rows.length > 0) {
      console.log(`📬 Email queued for analysis: ${emailData.id}`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Queue email error:', error);
    throw error;
  }
}

export async function processEmailQueue(batchSize = 5) {
  try {
    const queuedEmails = await query(
      `SELECT eq.*, u.email as user_email
       FROM email_processing_queue eq
       JOIN users u ON eq.user_id = u.id
       WHERE eq.status = 'queued' 
         OR (eq.status = 'failed' AND eq.attempts < eq.max_attempts AND eq.next_retry_at <= NOW())
       ORDER BY eq.priority DESC, eq.queued_at ASC
       LIMIT $1`,
      [batchSize]
    );

    if (queuedEmails.rows.length === 0) {
      return { processed: 0, failed: 0 };
    }

    console.log(`🔄 Processing ${queuedEmails.rows.length} emails from queue...`);

    let processed = 0;
    let failed = 0;

    for (const queuedEmail of queuedEmails.rows) {
      try {
        await query(
          `UPDATE email_processing_queue 
           SET status = 'processing', started_at = NOW(), attempts = attempts + 1
           WHERE id = $1`,
          [queuedEmail.id]
        );

        const gmailService = await import('./gmail.js');
        const emailDetails = await gmailService.getEmailDetails(queuedEmail.user_id, queuedEmail.gmail_message_id);

        await analyzeEmail(queuedEmail.user_id, emailDetails);

        await query(
          `UPDATE email_processing_queue 
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [queuedEmail.id]
        );

        processed++;
      } catch (error) {
        console.error(`Failed to process email ${queuedEmail.gmail_message_id}:`, error);

        const nextRetry = new Date(Date.now() + (queuedEmail.attempts + 1) * 60000);
        
        await query(
          `UPDATE email_processing_queue 
           SET status = 'failed', last_error = $1, next_retry_at = $2
           WHERE id = $3`,
          [error.message, nextRetry, queuedEmail.id]
        );

        failed++;
      }
    }

    console.log(`✅ Queue processing complete: ${processed} processed, ${failed} failed`);

    return { processed, failed };
  } catch (error) {
    console.error('Email queue processing error:', error);
    throw error;
  }
}

export async function getCategorizedEmails(userId, filters = {}) {
  try {
    const { urgency, sentiment, tags, limit = 50, offset = 0 } = filters;

    let whereClause = 'WHERE user_id = $1 AND status = \'analyzed\'';
    const params = [userId];
    let paramIndex = 2;

    if (urgency) {
      whereClause += ` AND urgency_level = $${paramIndex}`;
      params.push(urgency);
      paramIndex++;
    }

    if (sentiment) {
      whereClause += ` AND sentiment = $${paramIndex}`;
      params.push(sentiment);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      whereClause += ` AND tags ?| $${paramIndex}`;
      params.push(tags);
      paramIndex++;
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT 
        id, gmail_message_id, thread_id, subject, sender,
        tags, sentiment, urgency_level, action_items,
        categories, keywords, entities,
        confidence_score, analyzed_at
       FROM email_metadata
       ${whereClause}
       ORDER BY analyzed_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return result.rows;
  } catch (error) {
    console.error('Get categorized emails error:', error);
    throw error;
  }
}

export async function getEmailStats(userId) {
  try {
    const stats = await query(
      `SELECT 
        COUNT(*) as total_analyzed,
        COUNT(*) FILTER (WHERE urgency_level = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE urgency_level = 'high') as high_count,
        COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
        COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
        AVG(confidence_score) as avg_confidence
       FROM email_metadata
       WHERE user_id = $1 AND status = 'analyzed'`,
      [userId]
    );

    const topTags = await query(
      `SELECT jsonb_array_elements_text(tags) as tag, COUNT(*) as count
       FROM email_metadata
       WHERE user_id = $1 AND status = 'analyzed'
       GROUP BY tag
       ORDER BY count DESC
       LIMIT 10`,
      [userId]
    );

    return {
      ...stats.rows[0],
      top_tags: topTags.rows
    };
  } catch (error) {
    console.error('Get email stats error:', error);
    throw error;
  }
}

export default {
  analyzeEmail,
  queueEmailForAnalysis,
  processEmailQueue,
  getCategorizedEmails,
  getEmailStats
};
