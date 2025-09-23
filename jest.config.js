module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'jaeger-ai.js',
        'src/**/*.js',
        '!node_modules/**',
        '!backup/**',
        '!tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFiles: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000,
    verbose: true,
    detectOpenHandles: true,
    forceExit: true
};