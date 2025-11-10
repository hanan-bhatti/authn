/**
 * Test script to verify deployment mode logic
 * Run with: node test-deployment-modes.js
 */

// Mock environment variables for testing
const testCases = [
  {
    name: 'Same Port (Development)',
    env: {
      DEPLOYMENT_MODE: 'same-port',
      NODE_ENV: 'development',
      PORT: '5000'
    },
    expected: {
      FRONTEND_PORT: 5000,
      BACKEND_PORT: 5000,
      FRONTEND_URL: 'http://localhost:5000',
      BASE_URL: 'http://localhost:5000',
      DASHBOARD_URL: 'http://localhost:5000/dashboard'
    }
  },
  {
    name: 'Different Ports (Development)',
    env: {
      DEPLOYMENT_MODE: 'different-ports',
      NODE_ENV: 'development',
      PORT: '5000'
    },
    expected: {
      FRONTEND_PORT: 5000,
      BACKEND_PORT: 5001,
      FRONTEND_URL: 'http://localhost:5000',
      BASE_URL: 'http://localhost:5001',
      DASHBOARD_URL: 'http://localhost:5000/dashboard'
    }
  },
  {
    name: 'Separate Domains (Development)',
    env: {
      DEPLOYMENT_MODE: 'separate-domains',
      NODE_ENV: 'development',
      PORT: '5000'
    },
    expected: {
      FRONTEND_PORT: 5000,
      BACKEND_PORT: 5000,
      FRONTEND_URL: 'http://localhost:3000',
      BASE_URL: 'http://localhost:5000',
      DASHBOARD_URL: 'http://localhost:3000/dashboard'
    }
  },
  {
    name: 'Same Port (Production)',
    env: {
      DEPLOYMENT_MODE: 'same-port',
      NODE_ENV: 'production',
      PORT: '5000',
      PROD_FRONTEND_URL: 'https://yourdomain.com',
      PROD_BASE_URL: 'https://yourdomain.com'
    },
    expected: {
      FRONTEND_PORT: 5000,
      BACKEND_PORT: 5000,
      FRONTEND_URL: 'https://yourdomain.com',
      BASE_URL: 'https://yourdomain.com',
      DASHBOARD_URL: 'https://yourdomain.com/dashboard'
    }
  },
  {
    name: 'Separate Domains (Production)',
    env: {
      DEPLOYMENT_MODE: 'separate-domains',
      NODE_ENV: 'production',
      PORT: '5000',
      PROD_FRONTEND_URL: 'https://app.example.com',
      PROD_BASE_URL: 'https://api.example.com'
    },
    expected: {
      FRONTEND_PORT: 5000,
      BACKEND_PORT: 5000,
      FRONTEND_URL: 'https://app.example.com',
      BASE_URL: 'https://api.example.com',
      DASHBOARD_URL: 'https://app.example.com/dashboard'
    }
  }
];

console.log('🧪 Testing Deployment Mode Logic\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(80));
  
  // Set environment variables BEFORE loading config
  Object.keys(testCase.env).forEach(key => {
    process.env[key] = testCase.env[key];
  });
  
  // Clear module cache and reload config
  delete require.cache[require.resolve('./utils/config.js')];
  // Also clear dotenv cache
  delete require.cache[require.resolve('dotenv')];
  
  // Load config (this will re-run dotenv.config())
  const config = require('../utils/config.js');
  
  // Check results
  let testPassed = true;
  Object.keys(testCase.expected).forEach(key => {
    const expected = testCase.expected[key];
    const actual = config[key];
    const match = expected === actual;
    
    if (!match) {
      testPassed = false;
      console.log(`   ❌ ${key}: Expected "${expected}", got "${actual}"`);
    } else {
      console.log(`   ✅ ${key}: ${actual}`);
    }
  });
  
  if (testPassed) {
    console.log(`\n   ✨ Test PASSED`);
    passed++;
  } else {
    console.log(`\n   💥 Test FAILED`);
    failed++;
  }
  
  // Clean up environment variables
  Object.keys(testCase.env).forEach(key => {
    delete process.env[key];
  });
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Deployment mode logic is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the deployment mode logic.\n');
  process.exit(1);
}
