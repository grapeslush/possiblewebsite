module.exports = {
  root: true,
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
      extends: ['./packages/config/eslint/next.cjs']
    },
    {
      files: ['packages/**/*.{ts,tsx,js,jsx}', '*.cjs'],
      extends: ['./packages/config/eslint/node.cjs']
    }
  ]
};
