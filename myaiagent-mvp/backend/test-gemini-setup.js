#!/usr/bin/env node

/**
 * Test Gemini API key setup
 * Run: node test-gemini-setup.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiSetup() {
  console.log('🧪 Testing Gemini API Key Configuration\n');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('\n📋 Environment Variables:');
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  console.log(`  ✓ GEMINI_API_KEY set: ${hasGeminiKey ? '✅ YES' : '❌ NO'}`);
  console.log(`  ✓ GOOGLE_API_KEY set: ${hasGoogleKey ? '✅ YES' : '❌ NO'}`);
  console.log(`  ✓ Using API key: ${apiKey ? '✅ YES (from ' + (hasGeminiKey ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY') + ')' : '❌ NO'}`);

  if (!apiKey) {
    console.error('\n❌ ERROR: No API key found!');
    console.error('\nHow to fix:');
    console.error('  1. Add GOOGLE_API_KEY or GEMINI_API_KEY to .env file');
    console.error('  2. Or set as environment variable before running');
    console.error('  3. See API_CONFIGURATION.md for setup instructions');
    process.exit(1);
  }

  // Test API key validity
  console.log('\n🔐 Testing API Key Validity:');
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Make a simple test request
    const result = await model.generateContent('Say "Gemini is working" in exactly 3 words.');
    
    const responseText = result.response?.text?.();
    
    if (responseText) {
      console.log(`  ✅ API Key is valid!`);
      console.log(`  ✅ Model response: "${responseText}"`);
    } else {
      console.log(`  ⚠️  API Key is valid but no response received`);
    }
  } catch (error) {
    console.error(`  ❌ API Key validation failed: ${error.message}`);
    console.error('\nTroubleshooting:');
    console.error('  • Verify API key is not expired');
    console.error('  • Check Google Cloud Console quota limits');
    console.error('  • Ensure Generative Language API is enabled');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All checks passed! Gemini API is configured correctly.\n');
}

testGeminiSetup().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
