const path = require('path');

module.exports = {
  root: true,
  extends: [path.resolve(__dirname, '../config/eslint/node.cjs')],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [path.resolve(__dirname, './tsconfig.eslint.json')],
  },
  ignorePatterns: ['dist', 'node_modules'],
};
