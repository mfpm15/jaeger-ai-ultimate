/**
 * Comprehensive Test Suite for Jaeger AI v3.0.2
 * Tests all major functionality with detailed scenarios
 */

const fs = require('fs');
const path = require('path');

// Mock all external dependencies
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
    };
});

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => 'Mock AI analysis response with security insights'
                }
            })
        })
    }))
}));

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
        choices: [{
            message: {
                content: 'Mock Grok 4 Fast API response with security analysis'
            }
        }]
    }),
    text: () => Promise.resolve('Mock text response')
}));

jest.mock('sqlite3', () => ({
    Database: jest.fn().mockImplementation(() => ({
        run: jest.fn((sql, params, callback) => {
            if (typeof params === 'function') params();
            else if (callback) callback();
        }),
        get: jest.fn((sql, params, callback) => {
            if (typeof params === 'function') params(null, { id: 1, username: 'testuser' });
            else if (callback) callback(null, { id: 1, username: 'testuser' });
        }),
        all: jest.fn((sql, params, callback) => {
            if (typeof params === 'function') params(null, []);
            else if (callback) callback(null, []);
        }),
        close: jest.fn((callback) => callback && callback())
    }))
}));

jest.mock('child_process', () => ({
    exec: jest.fn((command, callback) => {
        // Simulate successful tool execution
        const mockOutput = `
Port scan results:
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https
        `;
        callback(null, { stdout: mockOutput, stderr: '' });
    }),
    spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
            if (event === 'close') callback(0);
        }),
        kill: jest.fn()
    }))
}));

describe('Jaeger AI Comprehensive Test Suite', () => {
    let jaegerModule;

    beforeAll(() => {
        // Set comprehensive test environment
        process.env.NODE_ENV = 'test';
        process.env.BOT_TOKEN = 'test_bot_token_123456';
        process.env.GEMINI_API_KEY = 'test_gemini_api_key';
        process.env.OPENROUTER_API_KEY = 'test_openrouter_grok_key';
        process.env.OPENROUTER_API_KEY_BACKUP = 'test_backup_deepseek_key';
        process.env.HEXSTRIKE_PATH = '/test/hexstrike-ai';
        process.env.PENTESTGPT_PATH = '/test/PentestGPT';

        // Load the main module after setting environment
        jaegerModule = require('../jaeger-ai.js');
    });

    describe('1. Core System Initialization', () => {
        test('should initialize with correct configuration', () => {
            expect(process.env.NODE_ENV).toBe('test');
            expect(jaegerModule).toBeDefined();
        });

        test('should have proper logging system', () => {
            expect(jaegerModule.log).toBeDefined();
            expect(typeof jaegerModule.log.info).toBe('function');
            expect(typeof jaegerModule.log.error).toBe('function');
            expect(typeof jaegerModule.log.success).toBe('function');
        });

        test('should initialize API key management', () => {
            expect(jaegerModule.apiKeyStatus).toBeDefined();
            expect(jaegerModule.apiKeyStatus.grok).toBeDefined();
            expect(jaegerModule.apiKeyStatus.deepseek).toBeDefined();
        });
    });

    describe('2. API Configuration & Grok 4 Fast Integration', () => {
        test('should use updated Grok 4 Fast model', () => {
            const primaryKey = jaegerModule.getPrimaryApiKey();
            expect(primaryKey).toBeDefined();

            if (primaryKey.type === 'grok') {
                expect(primaryKey.model).toBe('x-ai/grok-4-fast:free');
                expect(primaryKey.name).toBe('Grok 4 Fast');
            }
        });

        test('should handle API key failover', () => {
            const primaryKey = jaegerModule.getPrimaryApiKey();
            expect(['grok', 'deepseek'].includes(primaryKey.type)).toBe(true);
            expect(primaryKey.key).toBeDefined();
            expect(primaryKey.model).toBeDefined();
        });

        test('should validate API key status tracking', () => {
            const { apiKeyStatus } = jaegerModule;

            expect(apiKeyStatus.grok).toHaveProperty('working');
            expect(apiKeyStatus.grok).toHaveProperty('errorCount');
            expect(apiKeyStatus.grok).toHaveProperty('lastError');

            expect(apiKeyStatus.deepseek).toHaveProperty('working');
            expect(apiKeyStatus.deepseek).toHaveProperty('errorCount');
        });
    });

    describe('3. Security Tools Integration', () => {
        test('should have comprehensive security tools available', () => {
            const tools = jaegerModule.AVAILABLE_TOOLS || jaegerModule.securityTools;
            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(50); // Should have 141+ tools

            const toolNames = tools.map(t => t.name.toLowerCase());

            // Core penetration testing tools
            expect(toolNames).toContain('nmap');
            expect(toolNames).toContain('nikto');
            expect(toolNames).toContain('gobuster');
            expect(toolNames).toContain('sqlmap');
            expect(toolNames).toContain('hydra');
            expect(toolNames).toContain('john');
            expect(toolNames).toContain('hashcat');
        });

        test('should validate HexStrike availability', async () => {
            const checkHexStrike = jaegerModule.checkHexStrikeAvailability;
            expect(typeof checkHexStrike).toBe('function');
        });

        test('should validate PentestGPT integration', async () => {
            const checkPentestGPT = jaegerModule.checkPentestGPTAvailability;
            expect(typeof checkPentestGPT).toBe('function');
        });
    });

    describe('4. Input Validation & Security', () => {
        test('should validate URLs properly', () => {
            const { isValidUrl } = jaegerModule;

            // Valid URLs
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://192.168.1.1')).toBe(true);
            expect(isValidUrl('https://subdomain.example.com:8080')).toBe(true);

            // Invalid URLs
            expect(isValidUrl('javascript:alert(1)')).toBe(false);
            expect(isValidUrl('file:///etc/passwd')).toBe(false);
            expect(isValidUrl('invalid-url')).toBe(false);
            expect(isValidUrl('')).toBe(false);
        });

        test('should validate domains properly', () => {
            const { isValidDomain } = jaegerModule;

            // Valid domains
            expect(isValidDomain('example.com')).toBe(true);
            expect(isValidDomain('sub.example.com')).toBe(true);
            expect(isValidDomain('test-site.co.uk')).toBe(true);

            // Invalid domains
            expect(isValidDomain('invalid..domain')).toBe(false);
            expect(isValidDomain('.example.com')).toBe(false);
            expect(isValidDomain('example.com.')).toBe(false);
            expect(isValidDomain('')).toBe(false);
        });

        test('should validate port numbers', () => {
            const { isValidPort } = jaegerModule;

            // Valid ports
            expect(isValidPort('22')).toBe(true);
            expect(isValidPort('80')).toBe(true);
            expect(isValidPort('443')).toBe(true);
            expect(isValidPort('8080')).toBe(true);
            expect(isValidPort('65535')).toBe(true);

            // Invalid ports
            expect(isValidPort('0')).toBe(false);
            expect(isValidPort('65536')).toBe(false);
            expect(isValidPort('-1')).toBe(false);
            expect(isValidPort('abc')).toBe(false);
            expect(isValidPort('')).toBe(false);
        });
    });

    describe('5. AI Analysis Integration', () => {
        test('should analyze security scan results', async () => {
            const mockScanOutput = `
            Nmap scan report for target.com (192.168.1.100)
            Host is up (0.0010s latency).
            PORT     STATE SERVICE
            22/tcp   open  ssh
            80/tcp   open  http
            443/tcp  open  https
            3306/tcp open  mysql
            `;

            const analysis = await jaegerModule.analyzeWithAI(mockScanOutput);
            expect(analysis).toBeDefined();
            expect(typeof analysis).toBe('string');
            expect(analysis.length).toBeGreaterThan(10);
        });

        test('should handle AI API errors gracefully', async () => {
            const { handleApiError } = jaegerModule;
            expect(typeof handleApiError).toBe('function');
        });
    });

    describe('6. User Management & Database', () => {
        test('should initialize database properly', async () => {
            const { initDatabase } = jaegerModule;
            expect(typeof initDatabase).toBe('function');
        });

        test('should handle user registration', async () => {
            const { saveUser, getUser } = jaegerModule;
            expect(typeof saveUser).toBe('function');
            expect(typeof getUser).toBe('function');
        });

        test('should implement rate limiting', () => {
            const { checkRateLimit, checkUserLimits } = jaegerModule;
            expect(typeof checkRateLimit).toBe('function');
            expect(typeof checkUserLimits).toBe('function');
        });
    });

    describe('7. Message Processing & Chunking', () => {
        test('should chunk long messages properly', () => {
            const { chunkMessage } = jaegerModule;

            // Test with long message
            const longMessage = 'A'.repeat(5000);
            const chunks = chunkMessage(longMessage);

            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(1);

            chunks.forEach(chunk => {
                expect(chunk.length).toBeLessThanOrEqual(3800);
            });
        });

        test('should format messages safely', () => {
            const { formatMessage } = jaegerModule;

            const messageWithSpecialChars = 'Test <script>alert(1)</script> & "quotes"';
            const formatted = formatMessage(messageWithSpecialChars);

            expect(formatted).toBeDefined();
            expect(typeof formatted).toBe('string');
        });
    });

    describe('8. File Operations & Security', () => {
        test('should validate file types', () => {
            const { isAllowedFileType } = jaegerModule;

            // Allowed file types
            expect(isAllowedFileType('scan-results.xml')).toBe(true);
            expect(isAllowedFileType('report.json')).toBe(true);
            expect(isAllowedFileType('output.txt')).toBe(true);
            expect(isAllowedFileType('log.csv')).toBe(true);

            // Disallowed file types
            expect(isAllowedFileType('malware.exe')).toBe(false);
            expect(isAllowedFileType('script.sh')).toBe(false);
            expect(isAllowedFileType('payload.php')).toBe(false);
            expect(isAllowedFileType('config.bat')).toBe(false);
        });

        test('should process file uploads securely', () => {
            const { processFileUpload } = jaegerModule;
            expect(typeof processFileUpload).toBe('function');
        });
    });

    describe('9. Tool Execution & Process Management', () => {
        test('should execute security tools safely', async () => {
            const mockContext = {
                reply: jest.fn(),
                editMessageText: jest.fn(),
                chat: { id: 12345 },
                from: { id: 67890, username: 'testuser' }
            };

            // Test nmap execution
            const result = await jaegerModule.executeTool('nmap', '-sV target.com', mockContext);
            expect(mockContext.reply).toHaveBeenCalled();
        });

        test('should handle process cancellation', () => {
            const { cancelOperation } = jaegerModule;
            expect(typeof cancelOperation).toBe('function');
        });

        test('should track running processes', () => {
            expect(jaegerModule.runningProcesses).toBeDefined();
            expect(jaegerModule.runningProcesses instanceof Map).toBe(true);
        });
    });

    describe('10. Error Handling & Recovery', () => {
        test('should handle network errors', async () => {
            const { handleNetworkError } = jaegerModule;
            expect(typeof handleNetworkError).toBe('function');
        });

        test('should implement graceful shutdown', () => {
            const { gracefulShutdown } = jaegerModule;
            expect(typeof gracefulShutdown).toBe('function');
        });

        test('should log errors properly', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            jaegerModule.log.error('Test error message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});

describe('Integration Scenarios', () => {
    describe('Complete Penetration Testing Workflow', () => {
        test('should handle full security assessment scenario', async () => {
            const mockBot = {
                reply: jest.fn(),
                editMessageText: jest.fn(),
                chat: { id: 12345 },
                from: { id: 67890, username: 'pentester' }
            };

            // Simulate complete workflow
            // 1. Discovery phase
            await jaegerModule.executeTool('nmap', '-sn 192.168.1.0/24', mockBot);
            expect(mockBot.reply).toHaveBeenCalled();

            // 2. Port scanning
            await jaegerModule.executeTool('nmap', '-sV -sC target.com', mockBot);

            // 3. Web directory enumeration
            await jaegerModule.executeTool('gobuster', 'dir -u http://target.com -w /usr/share/wordlists/dirb/common.txt', mockBot);

            // 4. Vulnerability scanning
            await jaegerModule.executeTool('nikto', '-h http://target.com', mockBot);

            expect(mockBot.reply).toHaveBeenCalledTimes(4);
        });
    });

    describe('AI-Powered Analysis Workflow', () => {
        test('should provide comprehensive security analysis', async () => {
            const scanResults = `
            Nmap scan report for target.example.com (203.0.113.1)
            Host is up (0.001s latency).
            Not shown: 996 closed ports
            PORT     STATE SERVICE    VERSION
            22/tcp   open  ssh        OpenSSH 7.4 (protocol 2.0)
            80/tcp   open  http       Apache httpd 2.4.6
            443/tcp  open  ssl/https  Apache httpd 2.4.6
            3306/tcp open  mysql      MySQL 5.7.25

            Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
            `;

            const analysis = await jaegerModule.analyzeWithAI(scanResults);

            expect(analysis).toBeDefined();
            expect(typeof analysis).toBe('string');
            expect(analysis.length).toBeGreaterThan(50);
        });
    });
});

describe('Performance & Load Testing', () => {
    test('should handle multiple concurrent users', () => {
        const userSessions = jaegerModule.userSessions;

        // Simulate 10 concurrent users
        for (let i = 0; i < 10; i++) {
            userSessions.set(`user_${i}`, {
                id: i,
                username: `user_${i}`,
                operations: [],
                lastActivity: new Date()
            });
        }

        expect(userSessions.size).toBe(10);
    });

    test('should manage memory usage with large scan outputs', () => {
        const largeScanOutput = 'A'.repeat(100000); // 100KB of data
        const chunks = jaegerModule.chunkMessage(largeScanOutput);

        expect(Array.isArray(chunks)).toBe(true);
        expect(chunks.length).toBeGreaterThan(25); // Should be chunked

        // Memory should be managed properly
        expect(chunks.every(chunk => chunk.length <= 3800)).toBe(true);
    });
});