const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  rootDir: path.resolve(__dirname),
  roots: ['<rootDir>/src', '<rootDir>/tests/unit'],
  testMatch: ['**/?(*.)+(test|spec).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        sourceMaps: 'inline',
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: false, dynamicImport: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.svg$': '<rootDir>/tests/__mocks__/svgMock.js',
    '^@grafana/data$': '<rootDir>/tests/__mocks__/grafana-data.ts',
    '^@grafana/ui$': '<rootDir>/tests/__mocks__/grafana-ui.tsx',
    '^@grafana/runtime$': '<rootDir>/tests/__mocks__/grafana-runtime.ts',
    '^react-window$': '<rootDir>/tests/__mocks__/react-window.tsx',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/module.ts'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/e2e/'],
};
