import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEach: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000, // 통합 테스트 기본 10초
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testTimeout: 5000,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 10000,
    },
    {
      displayName: 'concurrent',
      testMatch: ['<rootDir>/tests/integration/concurrent.test.ts'],
      testTimeout: 30000,
    },
  ],
};

export default config;
