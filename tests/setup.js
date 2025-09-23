// Test setup file
require('dotenv').config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

// Suppress console output during tests unless there's an error
const originalConsole = { ...console };

// Mock console methods to reduce test noise
console.log = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();

// Global test utilities
global.testUtils = {
    createMockTelegramContext: () => ({
        from: { id: 12345, first_name: 'Test', username: 'testuser' },
        chat: { id: 12345, type: 'private' },
        message: { text: '/test', date: Date.now() },
        reply: jest.fn().mockResolvedValue(),
        replyWithHTML: jest.fn().mockResolvedValue(),
        replyWithMarkdown: jest.fn().mockResolvedValue(),
        telegram: {
            sendMessage: jest.fn().mockResolvedValue(),
            editMessageText: jest.fn().mockResolvedValue()
        }
    }),

    createMockScanResult: () => ({
        target: 'example.com',
        tool: 'nmap',
        output: 'Mock scan output',
        startTime: new Date(),
        endTime: new Date(),
        success: true
    })
};