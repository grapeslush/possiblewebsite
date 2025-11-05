const path = require('path');

module.exports = {
  extends: [
    'next/core-web-vitals',
    path.join(__dirname, 'shared.cjs')
  ],
  parserOptions: {
    project: true
  }
};
