/**
 * SAM.gov Document Fetcher Service
 * Fetches and parses documents (PDFs, DOCs, HTML) from SAM.gov opportunities
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import pdf from 'pdf-parse';
import pool from '../utils/database.js';

/**
 * Fetch a document from a URL
 * @param {string} url - Document URL
 * @returns {Promise<Buffer>} Document buffer
 */
async function fetchDocument(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'werkules/1.0',
        'Accept': '*/*',
      },
      timeout: 60000, // 60 second timeout
    };

    const request = protocol.request(options, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchDocument(response.headers.location)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });

    request.end();
  });
}

/**
 * Extract text from PDF buffer
 * @param {Buffer} buffer - PDF buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractPdfText(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from HTML buffer
 * @param {Buffer} buffer - HTML buffer
 * @returns {string} Extracted text
 */
function extractHtmlText(buffer) {
  const html = buffer.toString('utf-8');
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Determine document type from URL and content
 * @param {string} url - Document URL
 * @param {Buffer} buffer - Document buffer
 * @returns {string} Document type
 */
function determineDocumentType(url, buffer) {
  const urlLower = url.toLowerCase();

  if (urlLower.endsWith('.pdf') || buffer.toString('ascii', 0, 4) === '%PDF') {
    return 'pdf';
  }
  if (urlLower.endsWith('.doc') || urlLower.endsWith('.docx')) {
    return 'doc';
  }
  if (urlLower.endsWith('.html') || urlLower.endsWith('.htm')) {
    return 'html';
  }
  if (urlLower.endsWith('.txt')) {
    return 'txt';
  }

  // Check buffer magic bytes
  const magic = buffer.toString('hex', 0, 4);
  if (magic === '25504446') return 'pdf'; // %PDF
  if (magic === 'd0cf11e0') return 'doc'; // MS Office

  return 'unknown';
}

/**
 * Extract text from document buffer based on type
 * @param {Buffer} buffer - Document buffer
 * @param {string} type - Document type
 * @returns {Promise<string>} Extracted text
 */
async function extractText(buffer, type) {
  switch (type) {
    case 'pdf':
      return await extractPdfText(buffer);

    case 'html':
    case 'htm':
      return extractHtmlText(buffer);

    case 'txt':
      return buffer.toString('utf-8');

    case 'doc':
    case 'docx':
      // For now, return placeholder - would need mammoth or similar library
      return '[Document text extraction not yet supported for .doc/.docx files]';

    default:
      return '[Unsupported document type]';
  }
}

/**
 * Fetch and store document for SAM.gov opportunity
 * @param {number} opportunityCacheId - Opportunity cache ID
 * @param {string} noticeId - SAM.gov notice ID
 * @param {string} documentUrl - Document URL
 * @returns {Promise<Object>} Stored document record
 */
export async function fetchAndStoreDocument(opportunityCacheId, noticeId, documentUrl) {
  const client = await pool.connect();

  try {
    // Check if document already exists
    const existing = await client.query(
      'SELECT id, fetch_status, raw_text FROM samgov_documents WHERE opportunity_cache_id = $1 AND document_url = $2',
      [opportunityCacheId, documentUrl]
    );

    if (existing.rows.length > 0 && existing.rows[0].fetch_status === 'fetched' && existing.rows[0].raw_text) {
      console.log(`Document already fetched: ${documentUrl}`);
      return existing.rows[0];
    }

    // Update or create document record
    let documentId;
    if (existing.rows.length > 0) {
      documentId = existing.rows[0].id;
      await client.query(
        'UPDATE samgov_documents SET fetch_status = $1, fetch_attempts = fetch_attempts + 1, last_fetch_attempt = NOW() WHERE id = $2',
        ['fetching', documentId]
      );
    } else {
      const insertResult = await client.query(
        `INSERT INTO samgov_documents (opportunity_cache_id, notice_id, document_url, fetch_status, fetch_attempts, last_fetch_attempt)
         VALUES ($1, $2, $3, 'fetching', 1, NOW())
         RETURNING id`,
        [opportunityCacheId, noticeId, documentUrl]
      );
      documentId = insertResult.rows[0].id;
    }

    // Fetch document
    console.log(`Fetching document: ${documentUrl}`);
    const buffer = await fetchDocument(documentUrl);

    // Determine type and extract filename
    const fileName = documentUrl.split('/').pop().split('?')[0] || 'document';
    const documentType = determineDocumentType(documentUrl, buffer);
    const fileSize = buffer.length;

    // Extract text
    console.log(`Extracting text from ${documentType} document...`);
    const rawText = await extractText(buffer, documentType);

    // Update document with extracted content
    const result = await client.query(
      `UPDATE samgov_documents
       SET document_type = $1,
           file_name = $2,
           file_size = $3,
           raw_text = $4,
           extracted_at = NOW(),
           fetch_status = 'fetched',
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [documentType, fileName, fileSize, rawText, documentId]
    );

    console.log(`✅ Document fetched and stored: ${fileName} (${fileSize} bytes, ${rawText.length} chars)`);

    return result.rows[0];

  } catch (error) {
    console.error(`❌ Error fetching document ${documentUrl}:`, error.message);

    // Update document with error
    if (client) {
      await client.query(
        `UPDATE samgov_documents
         SET fetch_status = 'failed',
             fetch_error = $1,
             updated_at = NOW()
         WHERE document_url = $2 AND opportunity_cache_id = $3`,
        [error.message, documentUrl, opportunityCacheId]
      );
    }

    throw error;

  } finally {
    client.release();
  }
}

/**
 * Fetch all documents for an opportunity
 * @param {number} opportunityCacheId - Opportunity cache ID
 * @param {string} noticeId - SAM.gov notice ID
 * @param {Array<string>} documentUrls - Array of document URLs
 * @returns {Promise<Array>} Array of stored document records
 */
export async function fetchOpportunityDocuments(opportunityCacheId, noticeId, documentUrls) {
  const results = [];

  for (const url of documentUrls) {
    try {
      const doc = await fetchAndStoreDocument(opportunityCacheId, noticeId, url);
      results.push(doc);

      // Add small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to fetch document: ${url}`, error.message);
      results.push({ url, error: error.message, status: 'failed' });
    }
  }

  return results;
}

/**
 * Get all documents for an opportunity
 * @param {number} opportunityCacheId - Opportunity cache ID
 * @returns {Promise<Array>} Array of documents
 */
export async function getOpportunityDocuments(opportunityCacheId) {
  const result = await pool.query(
    'SELECT * FROM samgov_documents WHERE opportunity_cache_id = $1 ORDER BY created_at DESC',
    [opportunityCacheId]
  );
  return result.rows;
}

/**
 * Get document by ID
 * @param {number} documentId - Document ID
 * @returns {Promise<Object>} Document record
 */
export async function getDocumentById(documentId) {
  const result = await pool.query(
    'SELECT * FROM samgov_documents WHERE id = $1',
    [documentId]
  );
  return result.rows[0];
}
