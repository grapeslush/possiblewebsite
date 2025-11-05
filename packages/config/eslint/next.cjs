const path = require('path');

module.exports = {
  extends: ['next/core-web-vitals', path.join(__dirname, 'shared.cjs')],
  parserOptions: {
    project: true,
  },
  settings: {
    next: {
      rootDir: ['apps/web', 'apps/api'],
    },
  },
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
