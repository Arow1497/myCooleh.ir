module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
      'controllers/**/*.js',
      'routes/**/*.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    setupFilesAfterEnv: ['./tests/setup.js']
  };