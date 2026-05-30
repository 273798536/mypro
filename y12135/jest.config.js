module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  maxWorkers: 1,
  setupFiles: ['<rootDir>/src/__tests__/setup.ts']
};
