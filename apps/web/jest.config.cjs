/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/lib'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\.\./.*)\.js$': '$1',
    '^(\./.*)\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@possiblewebsite/db$': ['<rootDir>/../../packages/db/src/index.ts'],
    '^@possiblewebsite/(.*)$': ['<rootDir>/../../packages/$1/src/index.ts'],
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },
};

module.exports = config;
