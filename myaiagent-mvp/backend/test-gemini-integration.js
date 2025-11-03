import { createChatCompletion } from './src/services/gemini.js';
import { UI_FUNCTIONS } from './src/services/uiFunctions.js';

console.log('='.repeat(60));
console.log('🧪 Gemini Integration Test Suite');
console.log('='.repeat(60));

async function testBasicChatCompletion() {
  console.log('\n📝 Test 1: Basic Chat Completion (Non-streaming)');
  console.log('-'.repeat(60));
  
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello from Gemini!" in exactly 5 words.' }
    ];
    
    const response = await createChatCompletion(messages, 'gemini-2.0-flash-exp', false);
    
    console.log('✅ Response received:', {
      role: response.choices[0].message.role,
      content: response.choices[0].message.content.substring(0, 100),
      model: response.model
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testStreamingChatCompletion() {
  console.log('\n📝 Test 2: Streaming Chat Completion');
  console.log('-'.repeat(60));
  
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Count from 1 to 5.' }
    ];
    
    const stream = await createChatCompletion(messages, 'gemini-2.0-flash-exp', true);
    
    let chunks = 0;
    let fullText = '';
    
    return new Promise((resolve) => {
      stream.on('data', (chunk) => {
        chunks++;
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.includes('[DONE]')) continue;
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            if (parsed.choices[0]?.delta?.content) {
              fullText += parsed.choices[0].delta.content;
            }
          } catch (e) {}
        }
      });
      
      stream.on('end', () => {
        console.log('✅ Streaming completed:', {
          chunksReceived: chunks,
          fullTextLength: fullText.length,
          preview: fullText.substring(0, 50)
        });
        resolve(true);
      });
      
      stream.on('error', (error) => {
        console.error('❌ Streaming failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testFunctionCalling() {
  console.log('\n📝 Test 3: Function Calling with Tools');
  console.log('-'.repeat(60));
  
  try {
    // Create a simple test function
    const testFunctions = [
      {
        name: 'getCurrentWeather',
        description: 'Get the current weather in a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city name, e.g. San Francisco'
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit']
            }
          },
          required: ['location']
        }
      }
    ];
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant with access to weather data.' },
      { role: 'user', content: 'What is the weather like in San Francisco?' }
    ];
    
    console.log('🔵 Sending request with', testFunctions.length, 'function(s)');
    
    const response = await createChatCompletion(messages, 'gemini-2.0-flash-exp', false, testFunctions);
    
    console.log('✅ Function calling response:', {
      hasMessage: !!response.choices[0].message,
      hasContent: !!response.choices[0].message.content,
      hasFunctionCall: !!response.choices[0].message.function_call,
      functionName: response.choices[0].message.function_call?.name,
      model: response.model
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

async function testUIFunctionsTransformation() {
  console.log('\n📝 Test 4: UI Functions Transformation (26 functions)');
  console.log('-'.repeat(60));
  
  try {
    console.log('📊 UI Functions Count:', UI_FUNCTIONS.length);
    console.log('📋 Sample functions:', UI_FUNCTIONS.slice(0, 3).map(f => f.name));
    
    const messages = [
      { role: 'system', content: 'You are an AI assistant with UI manipulation capabilities.' },
      { role: 'user', content: 'List the available functions you have access to.' }
    ];
    
    const response = await createChatCompletion(messages, 'gemini-2.0-flash-exp', false, UI_FUNCTIONS);
    
    console.log('✅ UI functions test completed:', {
      functionsProvided: UI_FUNCTIONS.length,
      responseReceived: !!response.choices[0].message,
      contentPreview: response.choices[0].message.content?.substring(0, 100)
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testModelSelection() {
  console.log('\n📝 Test 5: Model Selection (Multiple Gemini Models)');
  console.log('-'.repeat(60));
  
  const models = ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  
  try {
    for (const model of models) {
      const messages = [
        { role: 'user', content: 'Say "Hello"' }
      ];
      
      const response = await createChatCompletion(messages, model, false);
      
      console.log(`✅ ${model}:`, {
        success: !!response.choices[0].message.content,
        responseModel: response.model
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Model selection test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    basicChat: await testBasicChatCompletion(),
    streaming: await testStreamingChatCompletion(),
    functionCalling: await testFunctionCalling(),
    uiFunctions: await testUIFunctionsTransformation(),
    modelSelection: await testModelSelection()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log('Basic Chat Completion:', results.basicChat ? '✅ PASS' : '❌ FAIL');
  console.log('Streaming:', results.streaming ? '✅ PASS' : '❌ FAIL');
  console.log('Function Calling:', results.functionCalling ? '✅ PASS' : '❌ FAIL');
  console.log('UI Functions (26):', results.uiFunctions ? '✅ PASS' : '❌ FAIL');
  console.log('Model Selection:', results.modelSelection ? '✅ PASS' : '❌ FAIL');
  
  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.values(results).length;
  
  console.log('\n🎯 Overall:', `${passCount}/${totalCount} tests passed`);
  console.log('='.repeat(60));
  
  process.exit(passCount === totalCount ? 0 : 1);
}

runAllTests();
