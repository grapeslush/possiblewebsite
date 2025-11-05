import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>/__tests__'],
  moduleNameMapper: {
    '^(\.\./.*)\.js$': '$1',
    '^(\./.*)\.js$': '$1',
    '^@possiblewebsite/(.*)$': '<rootDir>/../..//packages/$1/src/index.ts',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};

export default config;
