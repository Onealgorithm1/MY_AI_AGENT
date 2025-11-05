import axios from 'axios';
import { query } from '../utils/database.js';
import { decryptSecret } from './secrets.js';
import { monitorExternalApi } from '../middleware/performanceMonitoring.js';

export async function performWebSearch(searchQuery, numResults = 5) {
  try {
    let apiKey, searchEngineId;

    console.log('🔍 Web Search Request:', { query: searchQuery, numResults });

    const apiKeyResult = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'GOOGLE_SEARCH_API_KEY' 
       AND is_active = true 
       ORDER BY is_default DESC NULLS LAST, created_at DESC 
       LIMIT 1`
    );

    const searchEngineIdResult = await query(
      `SELECT key_value FROM api_secrets 
       WHERE key_name = 'GOOGLE_SEARCH_ENGINE_ID' 
       AND is_active = true 
       ORDER BY is_default DESC NULLS LAST, created_at DESC 
       LIMIT 1`
    );

    if (apiKeyResult.rows.length > 0) {
      apiKey = decryptSecret(apiKeyResult.rows[0].key_value);
    } else {
      // Try environment variables, fallback to GEMINI_API_KEY
      apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Google Search API key not configured. Please add GOOGLE_SEARCH_API_KEY, GEMINI_API_KEY, or configure via Admin Dashboard.');
      }
    }

    if (searchEngineIdResult.rows.length > 0) {
      searchEngineId = decryptSecret(searchEngineIdResult.rows[0].key_value);
    } else {
      searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      if (!searchEngineId) {
        throw new Error('Google Search Engine ID not configured. Please add GOOGLE_SEARCH_ENGINE_ID to environment variables or Admin Dashboard. Create one at: https://programmablesearchengine.google.com/');
      }
    }

    const response = await monitorExternalApi('google_search', '/customsearch/v1', async () => {
      return await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: searchQuery,
          num: Math.min(numResults, 10),
        },
        timeout: 10000,
      });
    });

    const results = response.data.items || [];
    
    const formattedResults = results.map((item, index) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      rank: index + 1,
      image: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null,
    }));

    console.log(`✅ Web Search Success: Found ${formattedResults.length} results for "${searchQuery}"`);

    return {
      success: true,
      query: searchQuery,
      results: formattedResults,
      totalResults: response.data.searchInformation?.totalResults || 0,
    };
  } catch (error) {
    console.error('❌ Web search error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      throw new Error('Search API rate limit exceeded. Please try again later.');
    }
    
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.error?.message || 'Invalid search query or API configuration';
      throw new Error(errorMsg);
    }

    if (error.response?.status === 403) {
      const errorMsg = error.response?.data?.error?.message || 'Search API access denied';
      throw new Error(errorMsg);
    }

    throw new Error(error.message || 'Web search failed');
  }
}

export async function logSearchUsage(userId, searchQuery, resultsCount, conversationId = null) {
  try {
    await query(
      `INSERT INTO search_history (user_id, query, results_count, conversation_id, searched_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, searchQuery, resultsCount, conversationId]
    );
  } catch (error) {
    console.error('Failed to log search usage:', error);
  }
}
