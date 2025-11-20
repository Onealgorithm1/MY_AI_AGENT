/**
 * SAM.gov Document Analyzer Service
 * Uses AI to analyze document content and extract key information
 */

import OpenAI from 'openai';
import pool from '../utils/database.js';
import { getDocumentById } from './samGovDocumentFetcher.js';

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please configure it to use AI analysis features.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Analyze document text using AI
 * @param {string} documentText - Extracted document text
 * @param {Object} opportunityInfo - Basic opportunity information
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeDocumentWithAI(documentText, opportunityInfo = {}) {
  const { title = 'Unknown', type = 'Unknown', noticeId = 'Unknown' } = opportunityInfo;

  // Truncate text if too long (GPT-4 has token limits)
  const maxChars = 50000; // ~12,500 tokens
  const truncatedText = documentText.length > maxChars
    ? documentText.substring(0, maxChars) + '\n\n[Document truncated...]'
    : documentText;

  const prompt = `You are an expert government contract analyst. Analyze the following document from a SAM.gov opportunity and extract key information.

OPPORTUNITY DETAILS:
- Title: ${title}
- Type: ${type}
- Notice ID: ${noticeId}

DOCUMENT CONTENT:
${truncatedText}

Please analyze this document and provide a comprehensive breakdown in the following JSON format:

{
  "executiveSummary": "Brief 2-3 sentence overview of the opportunity",
  "keyRequirements": [
    {
      "category": "Technical|Administrative|Personnel|etc",
      "requirement": "Description of requirement",
      "mandatory": true|false,
      "priority": "high|medium|low"
    }
  ],
  "evaluationCriteria": [
    {
      "criterion": "Name of evaluation criterion",
      "weight": "Percentage or description",
      "description": "What is being evaluated"
    }
  ],
  "deadlines": [
    {
      "type": "Proposal Due|Questions Due|Site Visit|etc",
      "date": "Date if specified",
      "description": "Additional context"
    }
  ],
  "technicalSpecifications": {
    "summary": "Overview of technical requirements",
    "details": ["List of specific technical specs"]
  },
  "contactInfo": [
    {
      "name": "Contact name",
      "role": "Role/title",
      "email": "Email if provided",
      "phone": "Phone if provided"
    }
  ],
  "pricingInfo": {
    "budgetRange": "Budget range if mentioned",
    "contractType": "FFP|T&M|CPFF|etc",
    "paymentTerms": "Payment terms if specified"
  },
  "complianceRequirements": [
    "List of certifications, clearances, or compliance items required"
  ],
  "riskAssessment": {
    "risks": ["Identified risks or challenges"],
    "mitigations": ["Suggested mitigation strategies"]
  },
  "bidRecommendation": {
    "recommendation": "bid|no-bid|consider",
    "reasoning": "Detailed reasoning for recommendation",
    "strengths": ["Reasons to bid"],
    "concerns": ["Reasons not to bid"],
    "winProbability": 75
  }
}

Provide thorough, actionable analysis. Extract all relevant information from the document.`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert government contract analyst. Provide detailed, accurate analysis in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const analysisText = response.choices[0].message.content;
    const analysis = JSON.parse(analysisText);

    return analysis;

  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Generate additional summaries for specific aspects
 * @param {string} documentText - Document text
 * @param {Object} analysis - Initial analysis results
 * @returns {Promise<Object>} Additional summaries
 */
async function generateSummaries(documentText, analysis) {
  const summaries = {};

  try {
    // Generate requirements summary
    if (analysis.keyRequirements && analysis.keyRequirements.length > 0) {
      summaries.requirementsSummary = `This opportunity has ${analysis.keyRequirements.length} identified requirements:\n\n` +
        analysis.keyRequirements
          .filter(req => req.mandatory)
          .map((req, idx) => `${idx + 1}. [${req.category}] ${req.requirement}`)
          .join('\n');
    }

    // Generate technical summary
    if (analysis.technicalSpecifications) {
      summaries.technicalSummary = analysis.technicalSpecifications.summary || 'No technical specifications identified.';
    }

    // Generate compliance requirements summary
    if (analysis.complianceRequirements && analysis.complianceRequirements.length > 0) {
      summaries.complianceRequirements = 'Required Certifications/Compliance:\n' +
        analysis.complianceRequirements.map((req, idx) => `${idx + 1}. ${req}`).join('\n');
    }

    return summaries;

  } catch (error) {
    console.error('Summary generation error:', error);
    return {};
  }
}

/**
 * Analyze a document and store results
 * @param {number} documentId - Document ID
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeDocument(documentId) {
  const client = await pool.connect();

  try {
    // Get document
    const document = await getDocumentById(documentId);

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (!document.raw_text || document.raw_text.length < 100) {
      throw new Error('Document text is too short or empty');
    }

    // Get opportunity info for context
    const oppResult = await client.query(
      'SELECT title, type FROM samgov_opportunities_cache WHERE id = $1',
      [document.opportunity_cache_id]
    );

    const opportunityInfo = oppResult.rows[0] || {};
    opportunityInfo.noticeId = document.notice_id;

    console.log(`Analyzing document ${documentId} with AI...`);

    // Perform AI analysis
    const analysis = await analyzeDocumentWithAI(document.raw_text, opportunityInfo);

    // Generate additional summaries
    const summaries = await generateSummaries(document.raw_text, analysis);

    // Update document with analysis
    const updateResult = await client.query(
      `UPDATE samgov_documents
       SET analyzed = TRUE,
           analysis_completed_at = NOW(),
           key_requirements = $1,
           evaluation_criteria = $2,
           deadlines = $3,
           technical_specifications = $4,
           contact_info = $5,
           pricing_info = $6,
           executive_summary = $7,
           requirements_summary = $8,
           technical_summary = $9,
           compliance_requirements = $10,
           risk_assessment = $11,
           bid_recommendation = $12,
           win_probability = $13,
           fetch_status = 'analyzed',
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        JSON.stringify(analysis.keyRequirements || []),
        JSON.stringify(analysis.evaluationCriteria || []),
        JSON.stringify(analysis.deadlines || []),
        JSON.stringify(analysis.technicalSpecifications || {}),
        JSON.stringify(analysis.contactInfo || []),
        JSON.stringify(analysis.pricingInfo || {}),
        analysis.executiveSummary || '',
        summaries.requirementsSummary || '',
        summaries.technicalSummary || '',
        summaries.complianceRequirements || '',
        JSON.stringify(analysis.riskAssessment || {}),
        analysis.bidRecommendation?.reasoning || '',
        analysis.bidRecommendation?.winProbability || null,
        documentId
      ]
    );

    console.log(`✅ Document ${documentId} analyzed successfully`);

    return updateResult.rows[0];

  } catch (error) {
    console.error(`❌ Error analyzing document ${documentId}:`, error);

    // Update document with error
    await client.query(
      `UPDATE samgov_documents
       SET fetch_status = 'analysis_failed',
           fetch_error = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [error.message, documentId]
    );

    throw error;

  } finally {
    client.release();
  }
}

/**
 * Queue document for analysis
 * @param {number} documentId - Document ID
 * @param {number} priority - Priority (1-10, higher = more urgent)
 * @returns {Promise<Object>} Queue entry
 */
export async function queueDocumentForAnalysis(documentId, priority = 5) {
  const result = await pool.query(
    `INSERT INTO samgov_document_analysis_queue (document_id, priority, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (document_id) DO UPDATE
     SET priority = GREATEST(samgov_document_analysis_queue.priority, $2),
         updated_at = NOW()
     RETURNING *`,
    [documentId, priority]
  );

  return result.rows[0];
}

/**
 * Process analysis queue (run this periodically)
 * @param {number} batchSize - Number of documents to process
 * @returns {Promise<Array>} Processed documents
 */
export async function processAnalysisQueue(batchSize = 5) {
  const client = await pool.connect();

  try {
    // Get pending jobs
    const queueResult = await client.query(
      `SELECT * FROM samgov_document_analysis_queue
       WHERE status = 'pending' AND retry_count < max_retries
       ORDER BY priority DESC, created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize]
    );

    const jobs = queueResult.rows;
    const results = [];

    for (const job of jobs) {
      try {
        // Mark as processing
        await client.query(
          `UPDATE samgov_document_analysis_queue
           SET status = 'processing', started_at = NOW()
           WHERE id = $1`,
          [job.id]
        );

        // Analyze document
        const analysis = await analyzeDocument(job.document_id);

        // Mark as completed
        await client.query(
          `UPDATE samgov_document_analysis_queue
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [job.id]
        );

        results.push({ job, analysis, status: 'success' });

      } catch (error) {
        console.error(`Failed to analyze document ${job.document_id}:`, error);

        // Mark as failed, increment retry count
        await client.query(
          `UPDATE samgov_document_analysis_queue
           SET status = 'failed',
               error_message = $1,
               retry_count = retry_count + 1,
               updated_at = NOW()
           WHERE id = $2`,
          [error.message, job.id]
        );

        results.push({ job, error: error.message, status: 'failed' });
      }

      // Small delay between analyses
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;

  } finally {
    client.release();
  }
}

/**
 * Get analysis for a document
 * @param {number} documentId - Document ID
 * @returns {Promise<Object>} Document with analysis
 */
export async function getDocumentAnalysis(documentId) {
  const result = await pool.query(
    `SELECT * FROM samgov_documents WHERE id = $1`,
    [documentId]
  );

  return result.rows[0];
}

/**
 * Get all analyzed documents for an opportunity
 * @param {number} opportunityCacheId - Opportunity cache ID
 * @returns {Promise<Array>} Analyzed documents
 */
export async function getOpportunityAnalysis(opportunityCacheId) {
  const result = await pool.query(
    `SELECT * FROM samgov_documents
     WHERE opportunity_cache_id = $1 AND analyzed = TRUE
     ORDER BY analysis_completed_at DESC`,
    [opportunityCacheId]
  );

  return result.rows;
}
