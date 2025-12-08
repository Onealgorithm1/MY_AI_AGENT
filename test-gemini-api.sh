#!/bin/bash

# ===========================================
# TEST GEMINI API DIRECTLY
# ===========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🧪 TESTING GEMINI API DIRECTLY${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd /home/ubuntu/MY_AI_AGENT/MY_AI_AGENT/myaiagent-mvp/backend

# Create comprehensive test script in the backend directory (where node_modules exists)
cat > test-gemini-complete.js << 'EOFJS'
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from './src/utils/apiKeys.js';

async function testGeminiAPI() {
  console.log('='.repeat(50));
  console.log('🧪 TESTING GEMINI API CONFIGURATION');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Step 1: Get API key from database
    console.log('Step 1: Retrieving Google API key from database...');
    const apiKey = await getApiKey('gemini');

    if (!apiKey) {
      console.error('❌ FAILED: No Gemini API key found in database');
      console.error('');
      console.error('Solution:');
      console.error('1. Go to https://werkules.com/admin/secrets');
      console.error('2. Add a Google API key');
      console.error('3. Make sure it\'s from a project with Generative Language API enabled');
      process.exit(1);
    }

    console.log(`✅ API Key found: ${apiKey.substring(0, 20)}... (length: ${apiKey.length})`);
    console.log('');

    // Step 2: Initialize Gemini client
    console.log('Step 2: Initializing Google Generative AI client...');
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Client initialized');
    console.log('');

    // Step 3: Test API call
    console.log('Step 3: Testing Gemini API call with simple prompt...');
    console.log('Model: gemini-2.0-flash-001');
    console.log('Prompt: "Say hello"');
    console.log('');

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'Say hello in one sentence.' }]
        }]
      });

      const response = result.response;
      const text = response.text();

      console.log('✅✅✅ GEMINI API WORKING!');
      console.log('');
      console.log('Response from Gemini:');
      console.log(`"${text}"`);
      console.log('');
      console.log('='.repeat(50));
      console.log('✅ SUCCESS: Gemini API is properly configured');
      console.log('='.repeat(50));
      console.log('');
      console.log('Your chat should now work at https://werkules.com');

    } catch (apiError) {
      console.error('❌ GEMINI API CALL FAILED');
      console.error('');
      console.error('Error details:');
      console.error(`  Message: ${apiError.message}`);
      console.error(`  Status: ${apiError.status || 'N/A'}`);

      if (apiError.message && apiError.message.includes('SERVICE_DISABLED')) {
        console.error('');
        console.error('='.repeat(50));
        console.error('🚨 PROBLEM: Generative Language API is DISABLED');
        console.error('='.repeat(50));
        console.error('');

        // Extract project ID if available
        const projectMatch = apiError.message.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : '1062446755505';

        console.error('This API key is from a Google Cloud project that has');
        console.error('the Generative Language API disabled.');
        console.error('');
        console.error('TO FIX:');
        console.error('');
        console.error('1. Click this link to enable the API:');
        console.error(`   https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=${projectId}`);
        console.error('');
        console.error('2. Click the ENABLE button');
        console.error('');
        console.error('3. Wait 2-3 minutes for Google to activate it');
        console.error('');
        console.error('4. Run this test again:');
        console.error('   sudo ./test-gemini-api.sh');
        console.error('');
        console.error('TROUBLESHOOTING:');
        console.error('');
        console.error('• If you don\'t have access to this project:');
        console.error('  - Generate a NEW API key from YOUR Google Cloud project');
        console.error('  - Make sure to enable Generative Language API first');
        console.error('  - Add the new key at https://werkules.com/admin/secrets');
        console.error('');
        console.error('• If you just enabled the API:');
        console.error('  - Wait 5 minutes for propagation');
        console.error('  - Clear browser cache');
        console.error('  - Try again');

      } else if (apiError.message && apiError.message.includes('API_KEY_INVALID')) {
        console.error('');
        console.error('='.repeat(50));
        console.error('🚨 PROBLEM: Invalid API Key');
        console.error('='.repeat(50));
        console.error('');
        console.error('The API key in your database is not valid.');
        console.error('');
        console.error('TO FIX:');
        console.error('1. Go to https://console.cloud.google.com/apis/credentials');
        console.error('2. Create a new API key or copy an existing one');
        console.error('3. Go to https://werkules.com/admin/secrets');
        console.error('4. Delete the old Google API key');
        console.error('5. Add the new API key');

      } else if (apiError.message && apiError.message.includes('PERMISSION_DENIED')) {
        console.error('');
        console.error('='.repeat(50));
        console.error('🚨 PROBLEM: Permission Denied');
        console.error('='.repeat(50));
        console.error('');
        console.error('This API key doesn\'t have permission to use Generative Language API.');
        console.error('');
        console.error('TO FIX:');
        console.error('1. Go to your Google Cloud Console');
        console.error('2. Enable Generative Language API');
        console.error('3. Make sure the API key has access to this API');

      } else {
        console.error('');
        console.error('Full error:');
        console.error(JSON.stringify(apiError, null, 2));
      }

      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testGeminiAPI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
EOFJS

echo "Running Gemini API test..."
echo ""

# Run the test from the backend directory
node test-gemini-complete.js

# Save exit code
TEST_RESULT=$?

# Cleanup
rm -f test-gemini-complete.js

exit $TEST_RESULT
