import axios from 'axios';
import { getApiKey } from './src/utils/apiKeys.js';

async function testOpenAIModels() {
  console.log('🔍 Testing OpenAI API for available models...\n');
  
  // Get API key (properly decrypted)
  const apiKey = await getApiKey('openai');
  
  if (!apiKey) {
    console.error('❌ No OpenAI API key found or failed to decrypt');
    process.exit(1);
  }
  const baseURL = 'https://api.openai.com/v1';
  
  console.log('📋 Step 1: Fetching complete models list from OpenAI API...\n');
  
  try {
    // Get all available models
    const modelsResponse = await axios.get(`${baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const allModels = modelsResponse.data.data;
    console.log(`✅ Found ${allModels.length} total models\n`);
    
    // Filter for chat/GPT models
    const chatModels = allModels.filter(m => 
      m.id.includes('gpt') || 
      m.id.includes('o1') || 
      m.id.includes('o3') || 
      m.id.includes('o4')
    ).map(m => m.id).sort();
    
    console.log(`💬 Chat/GPT Models Available (${chatModels.length}):`);
    chatModels.forEach(m => console.log(`   - ${m}`));
    console.log('');
    
  } catch (error) {
    console.error('❌ Error fetching models list:', error.response?.data || error.message);
  }
  
  console.log('🧪 Step 2: Testing popular models with actual API calls...\n');
  
  // Models to test
  const modelsToTest = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-5',
    'gpt-5-mini',
    'o1',
    'o1-mini',
    'o1-preview',
    'o3',
    'o3-mini',
    'o4-mini',
    'chatgpt-4o-latest'
  ];
  
  const workingModels = [];
  const failedModels = [];
  
  for (const model of modelsToTest) {
    try {
      const response = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ ${model.padEnd(25)} - WORKS`);
      workingModels.push(model);
      
    } catch (error) {
      const status = error.response?.status;
      const errorCode = error.response?.data?.error?.code;
      const errorMsg = error.response?.data?.error?.message || error.message;
      
      if (status === 404 || errorCode === 'model_not_found') {
        console.log(`❌ ${model.padEnd(25)} - NOT AVAILABLE (404)`);
      } else if (status === 400) {
        console.log(`⚠️  ${model.padEnd(25)} - EXISTS but has restrictions (${errorMsg.substring(0, 60)}...)`);
      } else {
        console.log(`❌ ${model.padEnd(25)} - ERROR: ${errorMsg.substring(0, 60)}...`);
      }
      
      failedModels.push({ model, error: errorMsg.substring(0, 100) });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n✅ WORKING MODELS (${workingModels.length}):`);
  workingModels.forEach(m => console.log(`   - ${m}`));
  
  console.log(`\n❌ NON-WORKING MODELS (${failedModels.length}):`);
  failedModels.forEach(f => console.log(`   - ${f.model}`));
  
  console.log('\n📌 CURRENTLY CONFIGURED IN AUTO MODE:');
  console.log('   - gpt-4o');
  console.log('   - gpt-4o-mini');
  console.log('   - gpt-4-turbo');
  console.log('   - gpt-3.5-turbo');
  
  console.log('\n💡 RECOMMENDATIONS:');
  
  const newModels = workingModels.filter(m => 
    !['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(m)
  );
  
  if (newModels.length > 0) {
    console.log('   You have access to these additional models:');
    newModels.forEach(m => console.log(`   ✨ ${m}`));
    console.log('\n   Consider adding them to Auto mode for better performance!');
  } else {
    console.log('   Your Auto mode is already using all available models.');
  }
  
  console.log('\n' + '='.repeat(80));
  
  process.exit(0);
}

testOpenAIModels().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
