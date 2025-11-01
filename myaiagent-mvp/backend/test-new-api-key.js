import axios from 'axios';
import { getApiKey } from './src/utils/apiKeys.js';

const baseURL = 'https://api.openai.com/v1';
let apiKey;

// Helper to make API calls
async function testEndpoint(name, method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function runTests() {
  console.log('🧪 TESTING NEW OPENAI API KEY CAPABILITIES\n');
  console.log('='.repeat(80));
  
  // Get API key
  apiKey = await getApiKey('openai');
  if (!apiKey) {
    console.error('❌ No API key found - please add one in Admin Dashboard');
    process.exit(1);
  }
  
  console.log('✅ API key loaded\n');
  
  const results = {
    models: { available: 0, chat: 0, embedding: 0, audio: 0, image: 0 },
    chatModels: {},
    embeddings: {},
    tts: {},
    images: {},
    moderation: false
  };
  
  // ========================================
  // 1. LIST ALL AVAILABLE MODELS
  // ========================================
  console.log('📋 1. TESTING MODEL ACCESS\n');
  console.log('-'.repeat(80));
  
  const modelsResult = await testEndpoint('List Models', 'GET', '/models');
  if (modelsResult.success) {
    const models = modelsResult.data.data;
    results.models.available = models.length;
    
    // Count by category
    models.forEach(m => {
      const id = m.id;
      if (id.includes('gpt') || id.includes('o1') || id.includes('o3')) {
        results.models.chat++;
      } else if (id.includes('embedding')) {
        results.models.embedding++;
      } else if (id.includes('whisper') || id.includes('tts') || id.includes('audio')) {
        results.models.audio++;
      } else if (id.includes('dall-e') || id.includes('image')) {
        results.models.image++;
      }
    });
    
    console.log(`✅ Total Models Available: ${results.models.available}`);
    console.log(`   📝 Chat Models: ${results.models.chat}`);
    console.log(`   🔢 Embedding Models: ${results.models.embedding}`);
    console.log(`   🎙️  Audio Models: ${results.models.audio}`);
    console.log(`   🖼️  Image Models: ${results.models.image}\n`);
  } else {
    console.log('❌ Failed to fetch models\n');
  }
  
  // ========================================
  // 2. TEST STANDARD CHAT MODELS
  // ========================================
  console.log('💬 2. TESTING STANDARD CHAT MODELS\n');
  console.log('-'.repeat(80));
  
  const chatTests = [
    { model: 'gpt-4o', name: 'GPT-4o' },
    { model: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { model: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { model: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { model: 'gpt-4', name: 'GPT-4' }
  ];
  
  for (const test of chatTests) {
    const result = await testEndpoint(
      test.name,
      'POST',
      '/chat/completions',
      {
        model: test.model,
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5
      }
    );
    
    results.chatModels[test.model] = result.success;
    
    if (result.success) {
      const response = result.data.choices[0].message.content;
      console.log(`✅ ${test.name.padEnd(20)} - Works! Response: "${response}"`);
    } else {
      console.log(`❌ ${test.name.padEnd(20)} - Failed: ${result.error?.substring(0, 40) || 'Error'}`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // ========================================
  // 3. TEST STREAMING
  // ========================================
  console.log('\n📡 3. TESTING STREAMING SUPPORT\n');
  console.log('-'.repeat(80));
  
  const streamResult = await testEndpoint(
    'Streaming',
    'POST',
    '/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Count to 3' }],
      stream: true,
      max_tokens: 20
    }
  );
  
  results.streaming = streamResult.success;
  console.log(`${streamResult.success ? '✅' : '❌'} Streaming: ${streamResult.success ? 'Works' : 'Failed'}\n`);
  
  // ========================================
  // 4. TEST EMBEDDINGS
  // ========================================
  console.log('🔢 4. TESTING EMBEDDINGS\n');
  console.log('-'.repeat(80));
  
  const embeddingTests = [
    'text-embedding-3-small',
    'text-embedding-3-large',
    'text-embedding-ada-002'
  ];
  
  for (const model of embeddingTests) {
    const result = await testEndpoint(
      model,
      'POST',
      '/embeddings',
      {
        model: model,
        input: 'test text'
      }
    );
    
    results.embeddings[model] = result.success;
    
    if (result.success) {
      const dims = result.data.data[0].embedding.length;
      console.log(`✅ ${model.padEnd(30)} - ${dims} dimensions`);
    } else {
      console.log(`❌ ${model.padEnd(30)} - Failed`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // ========================================
  // 5. TEST TEXT-TO-SPEECH
  // ========================================
  console.log('\n🎙️  5. TESTING TEXT-TO-SPEECH\n');
  console.log('-'.repeat(80));
  
  const ttsTests = ['tts-1', 'tts-1-hd'];
  
  for (const model of ttsTests) {
    const result = await testEndpoint(
      model,
      'POST',
      '/audio/speech',
      {
        model: model,
        input: 'Test',
        voice: 'alloy'
      }
    );
    
    results.tts[model] = result.success;
    console.log(`${result.success ? '✅' : '❌'} ${model.padEnd(15)} - ${result.success ? 'Works' : 'Failed'}`);
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // ========================================
  // 6. TEST IMAGE GENERATION
  // ========================================
  console.log('\n🖼️  6. TESTING IMAGE GENERATION\n');
  console.log('-'.repeat(80));
  
  const imageTests = [
    { model: 'dall-e-3', size: '1024x1024' },
    { model: 'dall-e-2', size: '256x256' }
  ];
  
  for (const test of imageTests) {
    const result = await testEndpoint(
      test.model,
      'POST',
      '/images/generations',
      {
        model: test.model,
        prompt: 'A white cat',
        n: 1,
        size: test.size
      }
    );
    
    results.images[test.model] = result.success;
    console.log(`${result.success ? '✅' : '❌'} ${test.model.padEnd(15)} - ${result.success ? 'Works' : 'Failed'}`);
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // ========================================
  // 7. TEST MODERATION
  // ========================================
  console.log('\n🛡️  7. TESTING MODERATION API\n');
  console.log('-'.repeat(80));
  
  const moderationResult = await testEndpoint(
    'Moderation',
    'POST',
    '/moderations',
    {
      input: 'I want to hurt someone'
    }
  );
  
  results.moderation = moderationResult.success;
  console.log(`${moderationResult.success ? '✅' : '❌'} Moderation API - ${moderationResult.success ? 'Works (FREE!)' : 'Failed'}`);
  
  if (moderationResult.success) {
    const flagged = moderationResult.data.results[0].flagged;
    console.log(`   Content flagged: ${flagged ? 'Yes ✓' : 'No'}`);
  }
  
  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  // Count working features
  const workingChat = Object.values(results.chatModels).filter(v => v === true).length;
  const workingEmbeddings = Object.values(results.embeddings).filter(v => v === true).length;
  const workingTTS = Object.values(results.tts).filter(v => v === true).length;
  const workingImages = Object.values(results.images).filter(v => v === true).length;
  
  console.log('\n✅ WORKING FEATURES:\n');
  
  if (results.models.available > 0) {
    console.log(`📋 Models API: ${results.models.available} models available`);
    console.log(`   - ${results.models.chat} chat models`);
    console.log(`   - ${results.models.embedding} embedding models`);
    console.log(`   - ${results.models.audio} audio models`);
    console.log(`   - ${results.models.image} image models\n`);
  }
  
  if (workingChat > 0) {
    console.log(`💬 Chat Completions: ${workingChat}/5 models work`);
    Object.entries(results.chatModels).forEach(([model, works]) => {
      if (works) console.log(`   ✓ ${model}`);
    });
    console.log('');
  }
  
  if (results.streaming) {
    console.log(`📡 Streaming: ✓ Works\n`);
  }
  
  if (workingEmbeddings > 0) {
    console.log(`🔢 Embeddings: ${workingEmbeddings}/3 models work`);
    Object.entries(results.embeddings).forEach(([model, works]) => {
      if (works) console.log(`   ✓ ${model}`);
    });
    console.log('');
  }
  
  if (workingTTS > 0) {
    console.log(`🎙️  Text-to-Speech: ${workingTTS}/2 models work`);
    Object.entries(results.tts).forEach(([model, works]) => {
      if (works) console.log(`   ✓ ${model}`);
    });
    console.log('');
  }
  
  if (workingImages > 0) {
    console.log(`🖼️  Image Generation: ${workingImages}/2 models work`);
    Object.entries(results.images).forEach(([model, works]) => {
      if (works) console.log(`   ✓ ${model}`);
    });
    console.log('');
  }
  
  if (results.moderation) {
    console.log(`🛡️  Moderation: ✓ Works (FREE)\n`);
  }
  
  // ========================================
  // ASSESSMENT
  // ========================================
  console.log('='.repeat(80));
  console.log('🎯 ASSESSMENT');
  console.log('='.repeat(80));
  
  const totalWorking = workingChat + workingEmbeddings + workingTTS + workingImages + (results.moderation ? 1 : 0) + (results.streaming ? 1 : 0);
  
  if (workingChat >= 4 && results.streaming) {
    console.log('\n🎉 EXCELLENT! Your API key has FULL ACCESS');
    console.log('✅ All standard chat models work');
    console.log('✅ Streaming works');
    console.log('✅ Your app is fully functional');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Chat feature: ✓ Ready to use');
    console.log('   2. Auto mode: ✓ Will work perfectly');
    console.log('   3. Model dropdown: ✓ All options available');
    console.log('   4. Voice chat: ✓ Should work (uses realtime models)');
    if (workingEmbeddings > 0) {
      console.log('   5. Embeddings: ✓ Available for advanced features');
    }
    if (workingTTS > 0) {
      console.log('   6. Text-to-Speech: ✓ Available');
    }
    if (workingImages > 0) {
      console.log(`   7. Image Generation: ✓ ${Object.keys(results.images).filter(k => results.images[k]).join(', ')} available`);
    }
  } else if (workingChat > 0) {
    console.log('\n⚠️  PARTIAL ACCESS');
    console.log(`✅ ${workingChat}/5 chat models work`);
    console.log('⚠️  Some features may not work');
    console.log('\n💡 Consider upgrading OpenAI account for full access');
  } else {
    console.log('\n❌ LIMITED ACCESS');
    console.log('❌ No standard chat models available');
    console.log('❌ Your app cannot function properly');
    console.log('\n💡 ACTION REQUIRED:');
    console.log('   1. Go to https://platform.openai.com/account/billing');
    console.log('   2. Add payment method');
    console.log('   3. Create new API key');
    console.log('   4. Update in Admin Dashboard');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Total Features Working: ${totalWorking}`);
  console.log('='.repeat(80));
  
  process.exit(0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
