#!/usr/bin/env node

/**
 * Test AI Agents Endpoint
 * Verifies that the /api/ai-agents endpoint is properly registered and accessible
 * 
 * Run: node test-ai-agents-endpoint.js
 */

import http from 'http';
import https from 'https';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const isHttps = BASE_URL.startsWith('https');
    const client = isHttps ? https : http;
    const url = new URL(path, BASE_URL);

    console.log(`\n🔍 Testing: ${url.href}`);

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  console.log('🧪 AI Agents Endpoint Test\n');
  console.log('='.repeat(50));
  console.log(`API Base URL: ${BASE_URL}`);
  console.log('='.repeat(50));

  try {
    // Test 1: Health check
    console.log('\n1️⃣  Testing server health...');
    try {
      const health = await testEndpoint('/health');
      console.log(`   Status: ${health.status}`);
      if (health.status === 200) {
        console.log('   ✅ Server is running');
      } else {
        console.log(`   ⚠️  Unexpected status: ${health.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Server not responding: ${error.message}`);
      process.exit(1);
    }

    // Test 2: Check if /api exists (not authorized, but should exist)
    console.log('\n2️⃣  Testing /api route...');
    try {
      const apiTest = await testEndpoint('/api/health');
      console.log(`   Status: ${apiTest.status}`);
      if (apiTest.status === 200) {
        console.log('   ✅ /api routes are accessible');
      } else {
        console.log(`   ⚠️  /api responded with status ${apiTest.status}`);
      }
    } catch (error) {
      console.log(`   ❌ /api is not accessible: ${error.message}`);
    }

    // Test 3: Check if /api/ai-agents/providers exists
    console.log('\n3️⃣  Testing /api/ai-agents/providers route...');
    try {
      const providersTest = await testEndpoint('/api/ai-agents/providers');
      console.log(`   Status: ${providersTest.status}`);
      
      if (providersTest.status === 404) {
        console.log('   ❌ Route not found (404)');
        console.log('   This means the /api/ai-agents endpoint is not registered on the server');
        console.log('   Possible causes:');
        console.log('   - Backend code hasn\'t been deployed');
        console.log('   - aiAgents.js route is not imported/registered in server.js');
        console.log('   - Server needs to be restarted');
      } else if (providersTest.status === 401 || providersTest.status === 403) {
        console.log('   ✅ Route exists (authentication required)');
        console.log('   The endpoint is properly registered, but requires authentication');
      } else if (providersTest.status === 200) {
        console.log('   ✅ Route is accessible without authentication');
        try {
          const data = JSON.parse(providersTest.body);
          console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        } catch (e) {
          console.log(`   Response body: ${providersTest.body.substring(0, 200)}`);
        }
      } else {
        console.log(`   ⚠️  Unexpected status: ${providersTest.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n📋 Diagnostic Summary:\n');
    console.log('If you\'re getting 404 errors:');
    console.log('1. Verify backend code includes aiAgents.js route');
    console.log('2. Check server.js has: app.use(\'/api/ai-agents\', aiAgentsRoutes)');
    console.log('3. Redeploy backend to production (Fly.io)');
    console.log('4. Restart the backend server');
    console.log('\n');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

main();
