const path = require('path');

module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    path.join(__dirname, 'shared.cjs'),
  ],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
};
