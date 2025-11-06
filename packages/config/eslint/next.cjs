const path = require('path');

module.exports = {
  plugins: ['@typescript-eslint'],
  extends: ['next/core-web-vitals', path.join(__dirname, 'shared.cjs')],
  parserOptions: {
    project: true,
  },
};
