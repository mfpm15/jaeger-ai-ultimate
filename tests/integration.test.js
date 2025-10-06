const fs = require('fs');
const path = require('path');

// Mock dependencies before requiring the main module
jest.mock('telegraf', () => {
    return {
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
                callback: jest.fn().mockReturnValue({ text: 'test', callback_data: 'test' }),
                url: jest.fn().mockReturnValue({ text: 'test', url: 'test' })
            }
        }
    };
});

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

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: 'Mock API response' } }] }),
    text: () => Promise.resolve('Mock text response')
}));

jest.mock('sqlite3', () => ({
    Database: jest.fn().mockImplementation(() => ({
        run: jest.fn((sql, params, callback) => {
            if (typeof params === 'function') {
                params();
            } else if (callback) {
                callback();
            }
        }),
        get: jest.fn((sql, params, callback) => {
            if (typeof params === 'function') {
                params(null, {});
            } else if (callback) {
                callback(null, {});
            }
        }),
        all: jest.fn((sql, params, callback) => {
            if (typeof params === 'function') {
                params(null, []);
            } else if (callback) {
                callback(null, []);
            }
        }),
        close: jest.fn((callback) => callback && callback())
    }))
}));

describe('Jaeger AI Integration Tests', () => {
    beforeAll(() => {
        // Set required environment variables for testing
        process.env.NODE_ENV = 'test';
        process.env.BOT_TOKEN = 'test_token';
        process.env.OPENROUTER_API_KEY_PRIMARY = 'test_primary';
        process.env.OPENROUTER_API_KEY_SECONDARY = 'test_secondary';
        process.env.OPENROUTER_API_KEY_TERTIARY = 'test_tertiary';
    });

    describe('File Structure', () => {
        test('should have main jaeger-ai.js file', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            expect(fs.existsSync(mainFile)).toBe(true);
        });

        test('should have package.json with correct configuration', () => {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            expect(packageJson.name).toBe('jaeger-ai');
            expect(packageJson.main).toBe('jaeger-ai.js');
            expect(packageJson.dependencies).toBeDefined();
            expect(packageJson.devDependencies).toBeDefined();
        });

        test('should have .env file with required structure', () => {
            const envPath = path.join(__dirname, '..', '.env');
            expect(fs.existsSync(envPath)).toBe(true);

            const envContent = fs.readFileSync(envPath, 'utf8');
            expect(envContent).toContain('BOT_TOKEN');
            expect(envContent).toContain('OPENROUTER_API_KEY_PRIMARY');
            expect(envContent).toContain('OPENROUTER_API_KEY_SECONDARY');
            expect(envContent).toContain('OPENROUTER_API_KEY_TERTIARY');
        });

        test('should have backup directory for old files', () => {
            const backupPath = path.join(__dirname, '..', 'backup');
            expect(fs.existsSync(backupPath)).toBe(true);
        });
    });

    describe('Code Structure Validation', () => {
        test('should contain security tool definitions', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            const content = fs.readFileSync(mainFile, 'utf8');

            expect(content).toContain('securityTools');
            expect(content).toContain('nmap');
            expect(content).toContain('nikto');
            expect(content).toContain('gobuster');
        });

        test('should reference DeepSeek models via OpenRouter', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            const content = fs.readFileSync(mainFile, 'utf8');

            expect(content).toContain('deepseek/deepseek-chat-v3.1:free');
            expect(content).toContain('z-ai/glm-4.5-air:free');
            expect(content).toContain('tngtech/deepseek-r1t2-chimera:free');
            expect(content).not.toContain('sonoma-sky');
        });

        test('should have proper error handling structure', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            const content = fs.readFileSync(mainFile, 'utf8');

            expect(content).toContain('try');
            expect(content).toContain('catch');
            expect(content).toContain('error');
        });

        test('should have logging functionality', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            const content = fs.readFileSync(mainFile, 'utf8');

            expect(content).toContain('log.');
            expect(content).toContain('console.');
        });
    });

    describe('Dependencies Validation', () => {
        test('should load required dependencies without errors', () => {
            expect(() => {
                require('telegraf');
                require('@google/generative-ai');
                require('node-fetch');
                require('sqlite3');
                require('dotenv');
                require('validator');
                require('xss');
            }).not.toThrow();
        });

        test('should have test dependencies installed', () => {
            expect(() => {
                require('jest');
                require('supertest');
            }).not.toThrow();
        });
    });

    describe('Environment Configuration', () => {
        test('should load .env configuration properly', () => {
            const dotenv = require('dotenv');
            const envPath = path.join(__dirname, '..', '.env');
            const result = dotenv.config({ path: envPath });

            expect(result.error).toBeUndefined();
        });

        test('should have updated API key configuration', () => {
            const envPath = path.join(__dirname, '..', '.env');
            const envContent = fs.readFileSync(envPath, 'utf8');

            expect(envContent).toContain('OPENROUTER_API_KEY_PRIMARY');
            expect(envContent).toContain('OPENROUTER_API_KEY_SECONDARY');
            expect(envContent).toContain('OPENROUTER_API_KEY_TERTIARY');
        });
    });

    describe('Security Validation', () => {
        test('should not expose sensitive data in code', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            const content = fs.readFileSync(mainFile, 'utf8');

            // Check that no hardcoded API keys are present
            expect(content).not.toMatch(/sk-[a-zA-Z0-9]{32,}/);
            expect(content).not.toMatch(/AIza[a-zA-Z0-9]{35}/);
        });

        test('should use environment variables for sensitive data', () => {
            const mainFile = path.join(__dirname, '..', 'jaeger-ai.js');
            const content = fs.readFileSync(mainFile, 'utf8');

            expect(content).toContain('process.env.BOT_TOKEN');
            expect(content).toContain('process.env.OPENROUTER_API_KEY_PRIMARY');
            expect(content).toContain('process.env.OPENROUTER_API_KEY_SECONDARY');
            expect(content).toContain('process.env.OPENROUTER_API_KEY_TERTIARY');
        });
    });
});
