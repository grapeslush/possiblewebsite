import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/lib'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\.\./.*)\.js$': '$1',
    '^(\./.*)\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@possiblewebsite/db$': ['<rootDir>/../../packages/db/src/index.ts'],
    '^@possiblewebsite/(.*)$': ['<rootDir>/../../packages/$1/src/index.ts']
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json'
      }
    ]
  }
};

export default config;
