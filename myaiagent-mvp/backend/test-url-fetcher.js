/**
 * Test script for URL fetching and content extraction
 *
 * This script demonstrates the URL fetching and content extraction capabilities
 * without requiring a running server or database.
 *
 * Usage: node test-url-fetcher.js
 */

import { fetchUrl, isValidUrl } from './src/services/urlFetcher.js';
import { summarizeUrl, analyzeContentType } from './src/services/contentExtractor.js';

// Test URLs - feel free to modify these
const TEST_URLS = [
  'https://www.example.com',
  'https://en.wikipedia.org/wiki/Artificial_intelligence',
  'https://news.ycombinator.com',
];

async function testUrlFetcher() {
  console.log('🧪 URL Fetcher Test Suite\n');
  console.log('='.repeat(60));

  // Test 1: URL Validation
  console.log('\n📋 Test 1: URL Validation');
  console.log('-'.repeat(60));

  const validUrls = [
    'https://example.com',
    'http://example.com',
  ];

  const invalidUrls = [
    'ftp://example.com',
    'not-a-url',
    'javascript:alert(1)',
  ];

  validUrls.forEach(url => {
    console.log(`✅ ${url} - Valid: ${isValidUrl(url)}`);
  });

  invalidUrls.forEach(url => {
    console.log(`❌ ${url} - Valid: ${isValidUrl(url)}`);
  });

  // Test 2: Basic URL Fetching
  console.log('\n📋 Test 2: Basic URL Fetching');
  console.log('-'.repeat(60));

  const testUrl = TEST_URLS[0];
  console.log(`\nFetching: ${testUrl}\n`);

  try {
    const result = await fetchUrl(testUrl, {
      includeImages: true,
      includeLinks: false,
    });

    if (result.success) {
      console.log('✅ Fetch successful!');
      console.log('\nMetadata:');
      console.log(`  Title: ${result.metadata.title || 'N/A'}`);
      console.log(`  Description: ${result.metadata.description || 'N/A'}`);
      console.log(`  Author: ${result.metadata.author || 'N/A'}`);
      console.log(`  Site Name: ${result.metadata.siteName || 'N/A'}`);

      console.log('\nContent:');
      console.log(`  Word Count: ${result.content.wordCount}`);
      console.log(`  Character Count: ${result.content.characterCount}`);
      console.log(`  Headings: ${result.content.headings.length}`);

      if (result.content.headings.length > 0) {
        console.log('\n  First 3 Headings:');
        result.content.headings.slice(0, 3).forEach(h => {
          console.log(`    H${h.level}: ${h.text}`);
        });
      }

      console.log(`\nImages: ${result.images.length}`);
      if (result.images.length > 0) {
        console.log('  First 3 images:');
        result.images.slice(0, 3).forEach((img, i) => {
          console.log(`    ${i + 1}. ${img.url}`);
        });
      }

      console.log(`\nText Preview (first 200 chars):`);
      console.log(`  ${result.content.text.substring(0, 200)}...`);

    } else {
      console.log('❌ Fetch failed!');
      console.log(`  Error: ${result.error.message}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Content Summarization (requires Gemini API key)
  console.log('\n📋 Test 3: Content Summarization with Gemini');
  console.log('-'.repeat(60));

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  Skipping - GEMINI_API_KEY not configured');
    console.log('   Set GEMINI_API_KEY environment variable to test this feature');
  } else {
    try {
      console.log(`\nSummarizing: ${TEST_URLS[1]}\n`);

      const summary = await summarizeUrl(TEST_URLS[1], {
        summaryLength: 'short',
        includeKeyPoints: true,
        includeEntities: false,
        includeTopics: true,
      });

      if (summary.success) {
        console.log('✅ Summary generated!');
        console.log(`\nTitle: ${summary.metadata.title}`);
        console.log(`\nAnalysis:`);
        console.log(JSON.stringify(summary.analysis, null, 2));
      } else {
        console.log('❌ Summary failed!');
        console.log(`  Error: ${summary.error.message}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  // Test 4: Content Type Analysis (requires Gemini API key)
  console.log('\n📋 Test 4: Content Type Analysis with Gemini');
  console.log('-'.repeat(60));

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  Skipping - GEMINI_API_KEY not configured');
  } else {
    try {
      console.log(`\nAnalyzing: ${TEST_URLS[2]}\n`);

      const analysis = await analyzeContentType(TEST_URLS[2]);

      if (analysis.success) {
        console.log('✅ Analysis complete!');
        console.log(`\nContent Type: ${analysis.analysis.contentType}`);
        console.log(`Confidence: ${analysis.analysis.confidence}`);
        console.log(`\nStructured Data:`);
        console.log(JSON.stringify(analysis.analysis.structuredData, null, 2));
      } else {
        console.log('❌ Analysis failed!');
        console.log(`  Error: ${analysis.error.message}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test suite completed!\n');
}

// Run tests
testUrlFetcher().catch(console.error);
