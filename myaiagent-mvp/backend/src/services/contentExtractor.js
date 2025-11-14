import { createChatCompletion } from './gemini.js';
import { fetchUrl, fetchMultipleUrls } from './urlFetcher.js';

/**
 * Summarize content from a URL using Gemini
 * @param {string} url - The URL to summarize
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Summary and analysis
 */
export async function summarizeUrl(url, options = {}) {
  const {
    summaryLength = 'medium', // short, medium, long
    includeKeyPoints = true,
    includeEntities = true,
    includeTopics = true,
    customPrompt = null,
  } = options;

  try {
    // Fetch the URL content
    const fetchResult = await fetchUrl(url, {
      includeImages: true,
      includeLinks: false,
    });

    if (!fetchResult.success) {
      return {
        success: false,
        url: url,
        error: fetchResult.error,
      };
    }

    // Prepare content for Gemini
    const { metadata, content } = fetchResult;

    // Build the prompt based on options
    let prompt = customPrompt || buildSummaryPrompt({
      title: metadata.title,
      description: metadata.description,
      content: content.text,
      summaryLength,
      includeKeyPoints,
      includeEntities,
      includeTopics,
    });

    // Call Gemini for analysis
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const geminiResponse = await createChatCompletion(
      messages,
      'gemini-2.5-flash', // Use flash for quick summarization
      false, // No streaming
      null
    );

    // Parse the response
    let analysis;
    try {
      // Try to parse as JSON first
      analysis = JSON.parse(geminiResponse);
    } catch (e) {
      // If not JSON, structure the text response
      analysis = {
        summary: geminiResponse,
      };
    }

    return {
      success: true,
      url: url,
      metadata: {
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        publishedDate: metadata.publishedDate,
        siteName: metadata.siteName,
      },
      content: {
        wordCount: content.wordCount,
        characterCount: content.characterCount,
        headingCount: content.headings.length,
      },
      analysis,
      images: fetchResult.images,
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Content summarization error:', error);

    return {
      success: false,
      url: url,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
}

/**
 * Extract specific information from a URL based on a user query
 * @param {string} url - The URL to analyze
 * @param {string} query - What information to extract
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Extracted information
 */
export async function extractFromUrl(url, query, options = {}) {
  const {
    responseFormat = 'text', // text, json, structured
  } = options;

  try {
    // Fetch the URL content
    const fetchResult = await fetchUrl(url, {
      includeImages: true,
      includeLinks: true,
    });

    if (!fetchResult.success) {
      return {
        success: false,
        url: url,
        error: fetchResult.error,
      };
    }

    const { metadata, content } = fetchResult;

    // Build extraction prompt
    const prompt = `You are analyzing content from a web page. Extract the requested information.

URL: ${url}
Title: ${metadata.title}
Description: ${metadata.description}

Content:
${content.text.substring(0, 20000)} ${content.text.length > 20000 ? '...(truncated)' : ''}

User Query: ${query}

Instructions:
- Answer the user's query based ONLY on the content provided
- Be accurate and specific
- If the information is not found, say so clearly
- ${responseFormat === 'json' ? 'Respond with valid JSON only' : 'Provide a clear, concise answer'}
${responseFormat === 'structured' ? '- Structure your response with clear sections and bullet points' : ''}

Response:`;

    // Call Gemini
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const geminiResponse = await createChatCompletion(
      messages,
      'gemini-2.5-flash',
      false,
      null
    );

    // Parse response based on format
    let extractedData;
    if (responseFormat === 'json') {
      try {
        extractedData = JSON.parse(geminiResponse);
      } catch (e) {
        extractedData = { text: geminiResponse };
      }
    } else {
      extractedData = geminiResponse;
    }

    return {
      success: true,
      url: url,
      query: query,
      metadata: {
        title: metadata.title,
        description: metadata.description,
      },
      extractedData,
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Content extraction error:', error);

    return {
      success: false,
      url: url,
      query: query,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
}

/**
 * Compare content from multiple URLs
 * @param {string[]} urls - Array of URLs to compare
 * @param {string} comparisonCriteria - What to compare
 * @returns {Promise<Object>} Comparison results
 */
export async function compareUrls(urls, comparisonCriteria = 'general comparison') {
  try {
    if (urls.length < 2) {
      throw new Error('At least 2 URLs are required for comparison');
    }

    if (urls.length > 5) {
      throw new Error('Maximum 5 URLs can be compared at once');
    }

    // Fetch all URLs
    const fetchResults = await fetchMultipleUrls(urls, {
      concurrent: 3,
      includeImages: false,
      includeLinks: false,
    });

    // Filter successful fetches
    const successfulFetches = fetchResults.filter(r => r.success);

    if (successfulFetches.length < 2) {
      return {
        success: false,
        error: {
          message: 'Not enough URLs could be fetched successfully',
        },
        fetchResults,
      };
    }

    // Build comparison prompt
    let prompt = `You are comparing content from multiple web pages. Provide a detailed comparison.

Comparison Criteria: ${comparisonCriteria}

Pages to compare:

`;

    successfulFetches.forEach((fetch, index) => {
      prompt += `\n--- Page ${index + 1} ---\n`;
      prompt += `URL: ${fetch.url}\n`;
      prompt += `Title: ${fetch.metadata.title}\n`;
      prompt += `Content: ${fetch.content.text.substring(0, 5000)}${fetch.content.text.length > 5000 ? '...(truncated)' : ''}\n`;
    });

    prompt += `\n\nInstructions:
- Compare the pages based on the criteria: "${comparisonCriteria}"
- Highlight key similarities and differences
- Provide insights and recommendations
- Structure your response clearly with sections

Comparison:`;

    // Call Gemini
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const geminiResponse = await createChatCompletion(
      messages,
      'gemini-2.5-flash',
      false,
      null
    );

    return {
      success: true,
      urls: urls,
      comparisonCriteria,
      comparison: geminiResponse,
      pagesAnalyzed: successfulFetches.length,
      pagesFailed: fetchResults.length - successfulFetches.length,
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('URL comparison error:', error);

    return {
      success: false,
      urls: urls,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
}

/**
 * Analyze URL for specific content types (article, product, recipe, etc.)
 * @param {string} url - The URL to analyze
 * @returns {Promise<Object>} Structured content analysis
 */
export async function analyzeContentType(url) {
  try {
    // Fetch the URL
    const fetchResult = await fetchUrl(url, {
      includeImages: true,
      includeLinks: true,
    });

    if (!fetchResult.success) {
      return {
        success: false,
        url: url,
        error: fetchResult.error,
      };
    }

    const { metadata, content } = fetchResult;

    // Detect content type and extract structured data
    const prompt = `Analyze this web page and determine its content type, then extract relevant structured information.

URL: ${url}
Title: ${metadata.title}
Description: ${metadata.description}
Keywords: ${metadata.keywords}

Content:
${content.text.substring(0, 15000)}${content.text.length > 15000 ? '...(truncated)' : ''}

Instructions:
1. Identify the content type (article, blog post, product page, recipe, tutorial, documentation, news, landing page, etc.)
2. Extract structured information relevant to that content type
3. Respond with valid JSON in this format:

{
  "contentType": "the type of content",
  "confidence": "high/medium/low",
  "structuredData": {
    // Content-type specific fields
    // For article: author, publishDate, category, tags, summary
    // For product: name, price, brand, description, specifications, availability
    // For recipe: title, ingredients, instructions, cookTime, servings
    // etc.
  },
  "mainTopics": ["topic1", "topic2"],
  "keyEntities": ["entity1", "entity2"],
  "sentiment": "positive/negative/neutral/mixed"
}

JSON Response:`;

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const geminiResponse = await createChatCompletion(
      messages,
      'gemini-2.5-flash',
      false,
      null
    );

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(geminiResponse);
    } catch (e) {
      analysis = {
        contentType: 'unknown',
        confidence: 'low',
        error: 'Failed to parse structured response',
        rawResponse: geminiResponse,
      };
    }

    return {
      success: true,
      url: url,
      metadata: {
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        publishedDate: metadata.publishedDate,
      },
      analysis,
      images: fetchResult.images,
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Content type analysis error:', error);

    return {
      success: false,
      url: url,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
}

/**
 * Build a summary prompt based on options
 * @private
 */
function buildSummaryPrompt(options) {
  const {
    title,
    description,
    content,
    summaryLength,
    includeKeyPoints,
    includeEntities,
    includeTopics,
  } = options;

  const lengthInstructions = {
    short: 'Provide a brief 2-3 sentence summary',
    medium: 'Provide a comprehensive paragraph (5-7 sentences)',
    long: 'Provide a detailed summary with multiple paragraphs',
  };

  let prompt = `Analyze and summarize the following web page content.

Title: ${title}
Description: ${description}

Content:
${content.substring(0, 20000)}${content.length > 20000 ? '...(truncated)' : ''}

Instructions:
- ${lengthInstructions[summaryLength]}
- Focus on the main ideas and important information
- Be accurate and objective
${includeKeyPoints ? '- Extract 5-7 key points or takeaways' : ''}
${includeEntities ? '- Identify key entities (people, organizations, locations, products)' : ''}
${includeTopics ? '- Identify main topics and themes' : ''}

Provide your response in JSON format:
{
  "summary": "the summary text",
  ${includeKeyPoints ? '"keyPoints": ["point1", "point2", ...],' : ''}
  ${includeEntities ? '"entities": {"people": [], "organizations": [], "locations": [], "products": []},' : ''}
  ${includeTopics ? '"topics": ["topic1", "topic2", ...],' : ''}
  "mainIdea": "one sentence capturing the main idea"
}

JSON Response:`;

  return prompt;
}
