const path = require('path');
const fs = require('fs');

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
            editMessageText: jest.fn().mockResolvedValue()
        }
    })),
    Markup: {
        inlineKeyboard: jest.fn().mockReturnValue({ reply_markup: {} }),
        button: {
            callback: jest.fn().mockReturnValue({ text: 'cb', callback_data: 'cb' }),
            url: jest.fn().mockReturnValue({ text: 'url', url: 'https://example.com' })
        }
    }
}));

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: 'Mock analysis' } }] }),
    text: () => Promise.resolve('Mock text response')
}));

describe('Jaeger AI Module Sanity', () => {
    let jaegerModule;

    beforeAll(() => {
        process.env.NODE_ENV = 'test';
        process.env.BOT_TOKEN = 'test_token';
        process.env.OPENROUTER_API_KEY_PRIMARY = 'test_primary';
        process.env.OPENROUTER_API_KEY_SECONDARY = 'test_secondary';
        process.env.OPENROUTER_API_KEY_TERTIARY = 'test_tertiary';

        jaegerModule = require('../jaeger-ai.js');
    });

    test('exposes expected exports', () => {
        const requiredExports = [
            'log',
            'apiKeyStatus',
            'getPrimaryApiKey',
            'analyzeWithAI',
            'chunkMessage',
            'formatMessage',
            'executeTool',
            'AVAILABLE_TOOLS'
        ];

        requiredExports.forEach((key) => {
            expect(jaegerModule).toHaveProperty(key);
        });
    });

    test('security tools list contains common utilities', () => {
        const names = Object.keys(jaegerModule.securityTools).map((name) => name.toLowerCase());
        expect(names).toContain('nmap');
        expect(names).toContain('nuclei');
        expect(names).toContain('gobuster');
    });

    test('environment template includes OpenRouter keys', () => {
        const envPath = path.join(__dirname, '..', '.env');
        const env = fs.readFileSync(envPath, 'utf8');
        expect(env).toContain('OPENROUTER_API_KEY_PRIMARY');
        expect(env).toContain('OPENROUTER_API_KEY_SECONDARY');
        expect(env).toContain('OPENROUTER_API_KEY_TERTIARY');
    });

    test('gracefulShutdown returns true', () => {
        expect(jaegerModule.gracefulShutdown('TEST')).toBe(true);
    });
});
