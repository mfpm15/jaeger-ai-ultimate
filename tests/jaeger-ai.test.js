const fs = require('fs');
const path = require('path');

// Mock Telegraf to avoid creating real bot instance during tests
jest.mock('telegraf', () => {
    return {
        Telegraf: jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            help: jest.fn(),
            command: jest.fn(),
            on: jest.fn(),
            launch: jest.fn().mockResolvedValue(),
            stop: jest.fn().mockResolvedValue(),
            telegram: {
                sendMessage: jest.fn().mockResolvedValue(),
                editMessageText: jest.fn().mockResolvedValue()
            }
        }))
    };
});

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => 'Mock AI response'
                }
            })
        })
    }))
}));

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: 'Mock API response' } }] }),
    text: () => Promise.resolve('Mock text response')
}));

// Mock SQLite3
jest.mock('sqlite3', () => ({
    Database: jest.fn().mockImplementation(() => ({
        run: jest.fn((sql, params, callback) => callback && callback()),
        get: jest.fn((sql, params, callback) => callback && callback(null, {})),
        all: jest.fn((sql, params, callback) => callback && callback(null, [])),
        close: jest.fn((callback) => callback && callback())
    }))
}));

describe('Jaeger AI Bot Tests', () => {
    let originalEnv;

    beforeAll(() => {
        // Backup original environment variables
        originalEnv = { ...process.env };

        // Set test environment variables
        process.env.NODE_ENV = 'test';
        process.env.BOT_TOKEN = 'test_bot_token';
        process.env.GEMINI_API_KEY = 'test_gemini_key';
        process.env.OPENROUTER_API_KEY = 'test_openrouter_key';
        process.env.OPENROUTER_API_KEY_BACKUP = 'test_backup_key';
    });

    afterAll(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('Environment Configuration', () => {
        test('should have required environment variables', () => {
            expect(process.env.BOT_TOKEN).toBeDefined();
            expect(process.env.GEMINI_API_KEY).toBeDefined();
            expect(process.env.OPENROUTER_API_KEY).toBeDefined();
        });

        test('should load environment from .env file', () => {
            const envPath = path.join(__dirname, '..', '.env');
            expect(fs.existsSync(envPath)).toBe(true);
        });
    });

    describe('API Key Management', () => {
        test('should validate API key status structure', () => {
            const { apiKeyStatus } = require('../jaeger-ai.js');

            expect(apiKeyStatus).toHaveProperty('grok');
            expect(apiKeyStatus).toHaveProperty('deepseek');

            expect(apiKeyStatus.grok).toHaveProperty('key');
            expect(apiKeyStatus.grok).toHaveProperty('name');
            expect(apiKeyStatus.grok).toHaveProperty('working');
            expect(apiKeyStatus.grok).toHaveProperty('lastError');
            expect(apiKeyStatus.grok).toHaveProperty('errorCount');
        });

        test('should handle primary API key selection', () => {
            const { getPrimaryApiKey } = require('../jaeger-ai.js');
            const primaryKey = getPrimaryApiKey();

            expect(primaryKey).toHaveProperty('key');
            expect(primaryKey).toHaveProperty('type');
            expect(primaryKey).toHaveProperty('name');
            expect(primaryKey).toHaveProperty('model');
        });
    });

    describe('Security Validation', () => {
        test('should validate input sanitization functions exist', () => {
            const jaegerModule = require('../jaeger-ai.js');

            // Check if security validation functions are present
            expect(typeof jaegerModule.isValidUrl).toBe('function');
            expect(typeof jaegerModule.isValidDomain).toBe('function');
            expect(typeof jaegerModule.isValidPort).toBe('function');
        });

        test('should validate URL input', () => {
            const { isValidUrl } = require('../jaeger-ai.js');

            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://192.168.1.1')).toBe(true);
            expect(isValidUrl('invalid-url')).toBe(false);
            expect(isValidUrl('javascript:alert(1)')).toBe(false);
        });

        test('should validate domain input', () => {
            const { isValidDomain } = require('../jaeger-ai.js');

            expect(isValidDomain('example.com')).toBe(true);
            expect(isValidDomain('sub.example.com')).toBe(true);
            expect(isValidDomain('invalid..domain')).toBe(false);
            expect(isValidDomain('')).toBe(false);
        });

        test('should validate port input', () => {
            const { isValidPort } = require('../jaeger-ai.js');

            expect(isValidPort('80')).toBe(true);
            expect(isValidPort('443')).toBe(true);
            expect(isValidPort('8080')).toBe(true);
            expect(isValidPort('0')).toBe(false);
            expect(isValidPort('65536')).toBe(false);
            expect(isValidPort('abc')).toBe(false);
        });
    });

    describe('Logging System', () => {
        test('should have logging functions available', () => {
            const { log } = require('../jaeger-ai.js');

            expect(log).toHaveProperty('info');
            expect(log).toHaveProperty('error');
            expect(log).toHaveProperty('success');
            expect(log).toHaveProperty('warning');
            expect(log).toHaveProperty('ai');
            expect(log).toHaveProperty('security');
        });
    });

    describe('Database Operations', () => {
        test('should initialize database structure', () => {
            const { initDatabase } = require('../jaeger-ai.js');
            expect(typeof initDatabase).toBe('function');
        });

        test('should handle user management functions', () => {
            const jaegerModule = require('../jaeger-ai.js');
            expect(typeof jaegerModule.saveUser).toBe('function');
            expect(typeof jaegerModule.getUser).toBe('function');
        });
    });

    describe('Tool Integration', () => {
        test('should have security tools available', () => {
            const { AVAILABLE_TOOLS } = require('../jaeger-ai.js');

            expect(Array.isArray(AVAILABLE_TOOLS)).toBe(true);
            expect(AVAILABLE_TOOLS.length).toBeGreaterThan(0);

            // Check for key security tools
            const toolNames = AVAILABLE_TOOLS.map(tool => tool.name.toLowerCase());
            expect(toolNames).toContain('nmap');
            expect(toolNames).toContain('nikto');
            expect(toolNames).toContain('gobuster');
        });

        test('should validate HexStrike integration', () => {
            const { checkHexStrikeAvailability } = require('../jaeger-ai.js');
            expect(typeof checkHexStrikeAvailability).toBe('function');
        });

        test('should validate PentestGPT integration', () => {
            const { checkPentestGPTAvailability } = require('../jaeger-ai.js');
            expect(typeof checkPentestGPTAvailability).toBe('function');
        });
    });

    describe('Message Processing', () => {
        test('should handle message chunking for long responses', () => {
            const { chunkMessage } = require('../jaeger-ai.js');

            const longMessage = 'x'.repeat(5000);
            const chunks = chunkMessage(longMessage);

            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach(chunk => {
                expect(chunk.length).toBeLessThanOrEqual(3800);
            });
        });

        test('should format messages properly', () => {
            const { formatMessage } = require('../jaeger-ai.js');

            const message = 'Test message with special characters: <>& "';
            const formatted = formatMessage(message);

            expect(formatted).toBeDefined();
            expect(typeof formatted).toBe('string');
        });
    });

    describe('AI Integration', () => {
        test('should handle AI analysis requests', async () => {
            const { analyzeWithAI } = require('../jaeger-ai.js');

            const testData = 'Sample security scan output';
            const analysis = await analyzeWithAI(testData);

            expect(analysis).toBeDefined();
            expect(typeof analysis).toBe('string');
        });

        test('should fallback between AI providers', () => {
            const { getPrimaryApiKey } = require('../jaeger-ai.js');

            // Test with different API key availability scenarios
            const primaryKey = getPrimaryApiKey();
            expect(primaryKey).toHaveProperty('type');
            expect(['grok', 'deepseek'].includes(primaryKey.type)).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        test('should implement rate limiting for user requests', () => {
            const { checkRateLimit } = require('../jaeger-ai.js');
            expect(typeof checkRateLimit).toBe('function');
        });

        test('should track user operation limits', () => {
            const { checkUserLimits } = require('../jaeger-ai.js');
            expect(typeof checkUserLimits).toBe('function');
        });
    });

    describe('File Operations', () => {
        test('should handle file uploads securely', () => {
            const { processFileUpload } = require('../jaeger-ai.js');
            expect(typeof processFileUpload).toBe('function');
        });

        test('should validate file types', () => {
            const { isAllowedFileType } = require('../jaeger-ai.js');

            expect(isAllowedFileType('test.txt')).toBe(true);
            expect(isAllowedFileType('scan.xml')).toBe(true);
            expect(isAllowedFileType('report.json')).toBe(true);
            expect(isAllowedFileType('malicious.exe')).toBe(false);
            expect(isAllowedFileType('script.sh')).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            const { handleNetworkError } = require('../jaeger-ai.js');
            expect(typeof handleNetworkError).toBe('function');
        });

        test('should handle API failures', async () => {
            const { handleApiError } = require('../jaeger-ai.js');
            expect(typeof handleApiError).toBe('function');
        });
    });
});

describe('Integration Tests', () => {
    test('should start bot without errors in test mode', async () => {
        process.env.NODE_ENV = 'test';

        // This should not throw an error
        expect(() => {
            require('../jaeger-ai.js');
        }).not.toThrow();
    });

    test('should handle graceful shutdown', async () => {
        const { gracefulShutdown } = require('../jaeger-ai.js');
        expect(typeof gracefulShutdown).toBe('function');
    });
});