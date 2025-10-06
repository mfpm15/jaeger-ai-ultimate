/**
 * Jaeger AI Comprehensive Test Suite (DeepSeek + HexStrike Edition)
 */

const fs = require('fs');
const path = require('path');

jest.mock('telegraf', () => ({
        Telegraf: jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            help: jest.fn(),
            command: jest.fn(),
            on: jest.fn(),
            use: jest.fn(),
            catch: jest.fn(),
            launch: jest.fn().mockResolvedValue(),
            stop: jest.fn().mockResolvedValue(),
            telegram: {
                sendMessage: jest.fn().mockResolvedValue(),
                editMessageText: jest.fn().mockResolvedValue(),
                options: {}
            }
        })),
    Markup: {
        inlineKeyboard: jest.fn().mockReturnValue({ reply_markup: {} }),
        button: {
            callback: jest.fn().mockReturnValue({ text: 'test', callback_data: 'test' }),
            url: jest.fn().mockReturnValue({ text: 'test', url: 'test' })
        }
    }
}));

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
        choices: [{
            message: {
                content: 'Mock OpenRouter response with actionable security analysis.'
            }
        }]
    }),
    text: () => Promise.resolve('Mock text response')
}));

const InputValidator = require('../src/security/input-validator');

let jaegerModule;

beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.BOT_TOKEN = 'test_bot_token';
    process.env.OPENROUTER_API_KEY_PRIMARY = 'test_primary_key';
    process.env.OPENROUTER_API_KEY_SECONDARY = 'test_secondary_key';
    process.env.OPENROUTER_API_KEY_TERTIARY = 'test_tertiary_key';
    process.env.HEXSTRIKE_BASE_URL = ''; // force simulation path for tests

    jaegerModule = require('../jaeger-ai.js');
});

describe('Core Initialization', () => {
    test('exposes logging utilities', () => {
        expect(jaegerModule.log).toBeDefined();
        expect(typeof jaegerModule.log.info).toBe('function');
        expect(typeof jaegerModule.log.error).toBe('function');
        expect(typeof jaegerModule.log.success).toBe('function');
    });

    test('has DeepSeek API key priority', () => {
        const { apiKeyStatus, API_KEY_PRIORITY } = jaegerModule;
        expect(apiKeyStatus.deepseek_chat).toBeDefined();
        expect(apiKeyStatus.glm_air).toBeDefined();
        expect(apiKeyStatus.deepseek_reasoner).toBeDefined();
        expect(API_KEY_PRIORITY).toEqual(['deepseek_chat', 'glm_air', 'deepseek_reasoner']);
    });

    test('getPrimaryApiKey respects priority', () => {
        const key = jaegerModule.getPrimaryApiKey();
        expect(key).toBeDefined();
        expect(['deepseek_chat', 'glm_air', 'deepseek_reasoner']).toContain(key.type);
        expect(key.model).toBeDefined();
    });
});

describe('Validation & Security Helpers', () => {
    test('validates URLs, domains, and ports', () => {
        expect(jaegerModule.isValidUrl('https://example.com')).toBe(true);
        expect(jaegerModule.isValidDomain('sub.example.com')).toBe(true);
        expect(jaegerModule.isValidPort('443')).toBe(true);

        expect(jaegerModule.isValidUrl('javascript:alert(1)')).toBe(false);
        expect(jaegerModule.isValidDomain('invalid..domain')).toBe(false);
        expect(jaegerModule.isValidPort('99999')).toBe(false);
    });

    test('formats messages safely', () => {
        const dangerous = '<script>alert(1)</script> Critical finding';
        const formatted = jaegerModule.formatMessage(dangerous);
        expect(formatted).not.toContain('<script>');
        expect(typeof formatted).toBe('string');
    });

    test('chunks long messages', () => {
        const longText = 'X'.repeat(10000);
        const chunks = jaegerModule.chunkMessage(longText);
        expect(Array.isArray(chunks)).toBe(true);
        expect(chunks.length).toBeGreaterThan(2);
        expect(chunks.every((chunk) => chunk.length <= 3800)).toBe(true);
    });

    test('processes file uploads with safe extensions', () => {
        expect(jaegerModule.isAllowedFileType('report.json')).toBe(true);
        expect(jaegerModule.isAllowedFileType('payload.exe')).toBe(false);

        const upload = jaegerModule.processFileUpload('reports/findings.json');
        expect(upload).toHaveProperty('sanitized');
        expect(upload).toHaveProperty('storedPath');
    });

    test('rate limiting and user limits', () => {
        expect(() => jaegerModule.checkRateLimit('tester', 2, 1000)).not.toThrow();
        expect(() => jaegerModule.checkRateLimit('tester', 2, 1000)).not.toThrow();
        expect(() => jaegerModule.checkRateLimit('tester', 2, 1000)).toThrow();

        const register = jaegerModule.saveUser({ telegramId: 999, username: 'tester' });
        expect(register.success).toBe(true);
        const limits = jaegerModule.checkUserLimits(999);
        expect(limits).toHaveProperty('allowed');
        expect(limits).toHaveProperty('max');
    });
});

describe('AI & Bridge Behaviour', () => {
    test('analyzeWithAI returns string output', async () => {
        const result = await jaegerModule.analyzeWithAI('Mock scan output');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(10);
    });

    test('HexStrike availability reflects configuration', () => {
        expect(jaegerModule.checkHexStrikeAvailability()).toBe(false);
        expect(typeof jaegerModule.checkPentestGPTAvailability()).toBe('boolean');
    });

    test('executeHexStrike falls back to simulation when not configured', async () => {
        const mockCtx = {
            reply: jest.fn().mockResolvedValue(),
            replyWithMarkdown: jest.fn().mockResolvedValue(),
            replyWithMarkdownV2: jest.fn().mockResolvedValue()
        };

        const result = await jaegerModule.executeHexStrike('example.com', mockCtx, 'op_test');
        expect(result).toHaveProperty('simulation', true);
        expect(result.success).toBe(true);
    });
});

describe('User & Session Management', () => {
    test('initDatabase loads user store', () => {
        const db = jaegerModule.initDatabase();
        expect(db).toHaveProperty('users');
    });

    test('saveUser and getUser expose user records', () => {
        jaegerModule.saveUser({ telegramId: 1001, username: 'alice' });
        const user = jaegerModule.getUser(1001);
        expect(user).toBeDefined();
        expect(user.username).toBeDefined();
    });

    test('userSessions map tracks concurrent users', () => {
        const { userSessions } = jaegerModule;
        userSessions.clear();
        for (let i = 0; i < 5; i++) {
            userSessions.set(`user_${i}`, { id: i });
        }
        expect(userSessions.size).toBe(5);
    });
});

describe('Tooling & Operations', () => {
    test('available tools listing covers core arsenal', () => {
        expect(Array.isArray(jaegerModule.AVAILABLE_TOOLS)).toBe(true);
        expect(jaegerModule.AVAILABLE_TOOLS.length).toBeGreaterThan(50);
    });

    test('securityTools dictionary exposes key tools', () => {
        expect(jaegerModule.securityTools.nmap).toBeDefined();
        expect(jaegerModule.securityTools.nmap.commands.basic).toContain('nmap');
    });

    test('executeTool returns structured result when binary missing', async () => {
        const mockCtx = { reply: jest.fn().mockResolvedValue(), chat: { id: 1 }, from: { id: 1 } };
        const result = await jaegerModule.executeTool('nonexistenttool', 'nonexistenttool {target}', 'example.com', mockCtx, 'op_tool');
        expect(result).toHaveProperty('simulated', true);
        expect(result.tool).toBe('nonexistenttool');
    });

    test('cancelOperation flags operations', () => {
        jaegerModule.activeOperations.set(123, { startTime: new Date(), cancelled: false });
        const cancelled = jaegerModule.cancelOperation(123);
        expect(cancelled).toBe(true);
        expect(jaegerModule.activeOperations.get(123).cancelled).toBe(true);
    });
});

describe('Error Handling', () => {
    test('handleApiError returns structured payload', () => {
        const response = jaegerModule.handleApiError(new Error('boom'));
        expect(response.success).toBe(false);
        expect(response.message).toBe('boom');
    });

    test('handleNetworkError notifies context when available', () => {
        const ctx = { reply: jest.fn().mockResolvedValue() };
        const response = jaegerModule.handleNetworkError(new Error('offline'), ctx);
        expect(response.success).toBe(false);
        expect(ctx.reply).toHaveBeenCalled();
    });

    test('gracefulShutdown stops bot safely', () => {
        expect(jaegerModule.gracefulShutdown('TEST')).toBe(true);
    });
});

afterAll(() => {
    // Restore any rate limit state for subsequent test runs
    InputValidator.rateLimitStore = new Map();
});
