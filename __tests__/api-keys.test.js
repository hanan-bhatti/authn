// api-keys.test.js
// Basic test to verify API key routes structure and feature flags

const config = require('../utils/config');

describe('API Key Routes Feature Flags', () => {
  test('FEATURE_API_KEYS_ENABLED is defined in config', () => {
    expect(config).toHaveProperty('FEATURE_API_KEYS_ENABLED');
    expect(typeof config.FEATURE_API_KEYS_ENABLED).toBe('boolean');
  });

  test('FEATURE_API_KEYS_ENABLED defaults to true', () => {
    // This ensures no breaking changes
    expect(config.FEATURE_API_KEYS_ENABLED).toBe(true);
  });
});

describe('User Model API Key Methods', () => {
  const User = require('../models/User');
  
  test('User model has generateApiKey method', () => {
    expect(typeof User.schema.methods.generateApiKey).toBe('function');
  });

  test('User model has revokeApiKey method', () => {
    expect(typeof User.schema.methods.revokeApiKey).toBe('function');
  });
});
