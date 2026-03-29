import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@reservation/shared$': '<rootDir>/../shared/src',
  },
};

export default config;
