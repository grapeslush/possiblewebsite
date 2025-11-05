const path = require('path');

module.exports = {
  extends: [
    'eslint:recommended',
    path.join(__dirname, 'shared.cjs')
  ],
  env: {
    node: true,
    es2022: true
  }
};
