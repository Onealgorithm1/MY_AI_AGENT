module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Code Quality
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',  // Allow console.log in Node.js
    'prefer-const': 'warn',
    'no-var': 'error',

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Best Practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-multi-spaces': 'error',
    'no-trailing-spaces': 'error',

    // ES6+
    'arrow-spacing': 'error',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn'
  }
};
