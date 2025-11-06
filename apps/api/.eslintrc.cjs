const path = require('path');

module.exports = {
  root: true,
  extends: [path.resolve(__dirname, '../../packages/config/eslint/next.cjs')],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  settings: {
    next: {
      rootDir: __dirname,
    },
  },
};
