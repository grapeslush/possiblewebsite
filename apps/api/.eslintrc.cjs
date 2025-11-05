const baseConfig = require('@possiblewebsite/config/eslint/next');

module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    '@next/next/no-html-link-for-pages': 'off',
  },
};
