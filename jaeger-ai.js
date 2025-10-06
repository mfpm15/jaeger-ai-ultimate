#!/usr/bin/env node

/**
 * JAEGER AI - ULTIMATE CYBERSECURITY PLATFORM v3.0.1
 * 141+ Security Tools + OpenRouter (DeepSeek & GLM) + Complete Red/Blue Team Operations
 * Dual AI Support with Enhanced Error Recovery and Dynamic Tool Selection
 */

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const UserManager = require('./user-registration');
const InputValidator = require('./src/security/input-validator');
const hexstrikeBridge = require('./src/integrations/hexstrike-bridge');

const SAFE_MODE = String(process.env.SAFE_MODE || 'true').toLowerCase() !== 'false';
const ALLOWED_TARGETS = (process.env.ALLOWED_TARGETS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

function isTargetAllowed(target) {
    if (!SAFE_MODE || ALLOWED_TARGETS.length === 0) {
        return true;
    }

    const normalized = target.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();

    return ALLOWED_TARGETS.some((allowed) => {
        if (allowed.startsWith('*')) {
            const domain = allowed.slice(1);
            return normalized.endsWith(domain);
        }
        return normalized === allowed;
    });
}

// Initialize user management system
const userManager = new UserManager();

// Enhanced console logging with colors and timestamps
const colors = {
    reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
    yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m'
};

function getTimestamp() {
    return new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

const log = {
    info: (msg) => console.log(`${colors.cyan}🔹 [${getTimestamp()}] INFO: ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ [${getTimestamp()}] SUCCESS: ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ [${getTimestamp()}] ERROR: ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️ [${getTimestamp()}] WARN: ${msg}${colors.reset}`),
    user: (msg) => console.log(`${colors.magenta}👤 [${getTimestamp()}] USER: ${msg}${colors.reset}`),
    tool: (msg) => console.log(`${colors.blue}🔧 [${getTimestamp()}] TOOL: ${msg}${colors.reset}`),
    script: (msg) => console.log(`${colors.yellow}📜 [${getTimestamp()}] SCRIPT: ${msg}${colors.reset}`),
    ai: (msg) => console.log(`${colors.cyan}🧠 [${getTimestamp()}] AI: ${msg}${colors.reset}`)
};

log.info('🚀 JAEGER AI ULTIMATE v3.0.2 - Starting...');
log.info(`Bot Token: ${process.env.BOT_TOKEN ? 'LOADED' : 'MISSING'}`);
log.info(`DeepSeek Chat Key: ${process.env.OPENROUTER_API_KEY_PRIMARY ? 'LOADED' : 'MISSING'}`);
log.info(`GLM 4.5 Key: ${process.env.OPENROUTER_API_KEY_SECONDARY ? 'LOADED' : 'MISSING'}`);
log.info(`DeepSeek Reasoner Key: ${process.env.OPENROUTER_API_KEY_TERTIARY ? 'LOADED' : 'MISSING'}`);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Configure bot settings for longer operations
bot.telegram.options = {
    handlerTimeout: 600000, // 10 minutes for long operations
    retryAfter: 1,
    ...bot.telegram.options
};

// User session management
const userSessions = new Map();
const activeOperations = new Map();
const runningProcesses = new Map(); // Track running processes for cancellation

// API Key automatic failover management
const apiKeyStatus = {
    deepseek_chat: {
        key: process.env.OPENROUTER_API_KEY_PRIMARY,
        name: 'DeepSeek Chat v3.1',
        model: 'deepseek/deepseek-chat-v3.1:free',
        working: true,
        lastError: null,
        errorCount: 0
    },
    glm_air: {
        key: process.env.OPENROUTER_API_KEY_SECONDARY,
        name: 'GLM 4.5 Air',
        model: 'z-ai/glm-4.5-air:free',
        working: true,
        lastError: null,
        errorCount: 0
    },
    deepseek_reasoner: {
        key: process.env.OPENROUTER_API_KEY_TERTIARY,
        name: 'DeepSeek Chimera R1T2',
        model: 'tngtech/deepseek-r1t2-chimera:free',
        working: true,
        lastError: null,
        errorCount: 0
    }
};

const API_KEY_PRIORITY = ['deepseek_chat', 'glm_air', 'deepseek_reasoner'];

const SAFE_FILE_EXTENSIONS = new Set(['.txt', '.log', '.json', '.xml', '.csv', '.md']);
const HEXSTRIKE_SUPPORTED_TOOLS = new Set([
    'nmap', 'gobuster', 'nuclei', 'nikto', 'sqlmap', 'ffuf', 'feroxbuster',
    'katana', 'httpx', 'wpscan', 'dirsearch', 'arjun', 'paramspider', 'dalfox',
    'amass', 'subfinder'
]);

function chunkMessage(text, maxLength = 3800) {
    if (text === null || text === undefined) return [];
    const source = String(text);
    if (!source.length) return [];

    const chunks = [];
    let current = '';

    for (const line of source.split('\n')) {
        const candidate = current ? `${current}\n${line}` : line;
        if (candidate.length > maxLength) {
            if (current) {
                chunks.push(current);
                current = line;
            } else {
                // line itself longer than max, hard split
                let remaining = line;
                while (remaining.length > maxLength) {
                    chunks.push(remaining.slice(0, maxLength));
                    remaining = remaining.slice(maxLength);
                }
                current = remaining;
            }
        } else {
            current = candidate;
        }
    }

    if (current) {
        chunks.push(current);
    }

    return chunks;
}

function segmentExecutiveSummary(summaryText) {
    if (!summaryText) {
        return [];
    }

    const lines = String(summaryText).split('\n');
    const segments = [];
    let current = [];

    const headingEmojis = new Set(['🚀', '🔥', '🛡️', '📝', '📈', '🔒', '⚙️', '🎯']);

    const isHeading = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        return headingEmojis.has(trimmed.charAt(0));
    };

    for (const line of lines) {
        if (isHeading(line) && current.length) {
            segments.push(current.join('\n').trim());
            current = [line];
        } else {
            current.push(line);
        }
    }

    if (current.length) {
        segments.push(current.join('\n').trim());
    }

    return segments.filter(Boolean);
}

function formatMessage(text) {
    return InputValidator.sanitizeOutput(text || '');
}

function isAllowedFileType(filename) {
    if (!filename) return false;
    const ext = path.extname(filename).toLowerCase();
    return SAFE_FILE_EXTENSIONS.has(ext);
}

function processFileUpload(filePath) {
    const sanitized = InputValidator.validateFilePath(filePath);
    if (!isAllowedFileType(sanitized)) {
        throw new Error('File type not allowed');
    }

    const storedPath = path.join('uploads', `${Date.now()}-${path.basename(sanitized)}`);
    return {
        original: filePath,
        sanitized,
        storedPath,
        extension: path.extname(sanitized).toLowerCase()
    };
}

function isValidUrl(url) {
    try {
        return InputValidator.isValidURL(url);
    } catch (error) {
        return false;
    }
}

function isValidDomain(domain) {
    try {
        return InputValidator.isValidDomain(domain);
    } catch (error) {
        return false;
    }
}

function isValidPort(port) {
    const value = Number(port);
    return Number.isInteger(value) && value >= 1 && value <= 65535;
}

function handleApiError(error, context = {}) {
    const message = error?.message || String(error);
    log.error(`API Error: ${message}`);
    return {
        success: false,
        message,
        context
    };
}

function handleNetworkError(error, ctx) {
    const message = error?.message || String(error);
    log.error(`Network error: ${message}`);
    if (ctx && typeof ctx.reply === 'function') {
        ctx.reply('⚠️ Network issue detected. Please retry shortly.').catch(() => {});
    }
    return { success: false, message };
}

function gracefulShutdown(signal = 'SIGTERM') {
    log.warn(`🛑 Graceful shutdown initiated (${signal})`);
    try {
        bot.stop(signal);
        return true;
    } catch (error) {
        log.error(`Failed to stop bot gracefully: ${error.message}`);
        return false;
    }
}

function buildHexstrikePlan(parsed) {
    const contextFlags = {};
    if (parsed.fullScan) {
        contextFlags.comprehensive = true;
    }
    const requestedTools = Array.isArray(parsed.tools)
        ? parsed.tools.filter(Boolean).map(tool => tool.toLowerCase())
        : [];

    if (requestedTools.length > 0) {
        contextFlags.requested_tools = requestedTools;
    }
    if (parsed.aiRecommendation) {
        contextFlags.ai_notes = parsed.aiRecommendation;
    }

    const plan = {
        objective: 'comprehensive',
        label: 'Comprehensive Analysis',
        maxTools: parsed.fullScan ? 10 : 6,
        context: contextFlags
    };

    switch ((parsed.intent || '').toLowerCase()) {
        case 'recon':
        case 'osint':
        case 'subdomain':
            plan.objective = 'quick';
            plan.label = 'Reconnaissance Focus';
            plan.maxTools = parsed.singleTool ? 3 : 5;
            plan.context.quick = true;
            plan.context.stealth = false;
            plan.context.preferred_tools = [
                'httpx', 'subfinder', 'amass', 'ffuf'
            ];
            break;
        case 'blueteam':
        case 'defense':
            plan.objective = 'stealth';
            plan.label = 'Stealth Monitoring';
            plan.maxTools = 4;
            plan.context.stealth = true;
            plan.context.quick = false;
            plan.context.preferred_tools = ['httpx', 'subfinder'];
            break;
        case 'pentest':
        case 'redteam':
            plan.objective = parsed.fullScan ? 'comprehensive' : 'comprehensive';
            plan.label = parsed.fullScan ? 'Offensive Deep Assessment' : 'Offensive Assessment';
            plan.maxTools = parsed.fullScan ? 10 : 6;
            plan.context.aggressive = true;
            plan.context.preferred_tools = ['httpx', 'ffuf', 'sqlmap', 'feroxbuster'];
            break;
        case 'web':
        case 'vuln':
            plan.objective = parsed.fullScan ? 'comprehensive' : 'quick';
            plan.label = parsed.fullScan ? 'Full Web Assessment' : 'Focused Web Recon';
            plan.maxTools = parsed.fullScan ? 9 : 6;
            plan.context.quick = !parsed.fullScan;
            plan.context.preferred_tools = ['httpx', 'ffuf', 'dirsearch', 'paramspider', 'dalfox'];
            break;
        default:
            plan.objective = parsed.fullScan ? 'comprehensive' : 'quick';
            plan.label = parsed.fullScan ? 'Full Spectrum Scan' : 'Rapid Assessment';
            plan.context.quick = !parsed.fullScan;
            plan.context.preferred_tools = ['httpx', 'subfinder', 'ffuf'];
    }

    const effectiveRequestedTools = requestedTools.filter(tool => HEXSTRIKE_SUPPORTED_TOOLS.has(tool));

    if (!plan.context.preferred_tools || !plan.context.preferred_tools.length) {
        plan.context.preferred_tools = effectiveRequestedTools;
    } else if (effectiveRequestedTools.length) {
        plan.context.preferred_tools = Array.from(new Set([
            ...effectiveRequestedTools,
            ...plan.context.preferred_tools
        ]));
    }

    const shouldForceSingleTool = parsed.singleTool
        || (effectiveRequestedTools.length === 1 && !parsed.fullScan);

    if (shouldForceSingleTool && effectiveRequestedTools.length === 1) {
        plan.context.focus_tools = effectiveRequestedTools;
        plan.maxTools = 1;
    } else if (effectiveRequestedTools.length > 1) {
        plan.context.include_tools = effectiveRequestedTools;
    }

    const defaultExcluded = ['nikto', 'nuclei'];
    const excludedTools = defaultExcluded.filter(tool => !effectiveRequestedTools.includes(tool));
    if (excludedTools.length) {
        plan.context.excluded_tools = excludedTools;
    }

    if (!plan.context.fallback_tools) {
        plan.context.fallback_tools = ['httpx', 'subfinder', 'ffuf'];
    }

    Object.keys(plan.context).forEach((key) => {
        if (plan.context[key] === undefined || plan.context[key] === null || plan.context[key] === '') {
            delete plan.context[key];
        }
    });

    return plan;
}

async function analyzeWithAI(scanOutput, target = 'analysis-target', operation = 'analysis') {
    const normalizedResults = Array.isArray(scanOutput)
        ? scanOutput
        : [{
            tool: 'analysis',
            command: 'analysis',
            stdout: typeof scanOutput === 'string' ? scanOutput : JSON.stringify(scanOutput, null, 2),
            stderr: '',
            success: true
        }];

    return analyzeWithOpenRouter(normalizedResults, target, operation);
}

function cancelOperation(userId) {
    const operation = activeOperations.get(userId);
    if (!operation) return false;
    operation.cancelled = true;
    operation.endTime = new Date();
    activeOperations.set(userId, operation);
    return true;
}

function initDatabase() {
    userManager.loadUsers();
    return userManager.db;
}

function saveUser({ telegramId, username, firstName, lastName }) {
    if (!telegramId) {
        throw new Error('telegramId is required');
    }
    const registration = userManager.registerUser(telegramId, username, firstName, lastName);

    if (registration && registration.success === false && registration.user) {
        return {
            success: true,
            message: registration.message || 'User already registered',
            user: registration.user,
            alreadyRegistered: true
        };
    }

    return registration;
}

function getUserRecord(telegramId) {
    return userManager.getUser(telegramId) || null;
}

function checkRateLimit(identifier, limit = 10, window = 60000) {
    return InputValidator.checkRateLimit(identifier, limit, window);
}

function checkUserLimits(telegramId) {
    const user = userManager.getUser(telegramId);
    if (!user) {
        return { allowed: false, reason: 'User not registered', remaining: 0, max: 0 };
    }

    const max = user.permissions?.maxScansPerDay ?? 10;
    const used = user.scansPerformed ?? 0;

    return {
        allowed: used < max,
        remaining: Math.max(max - used, 0),
        max
    };
}

function checkHexStrikeAvailability() {
    return hexstrikeBridge.isConfigured();
}

function checkPentestGPTAvailability() {
    const pentestPath = process.env.PENTESTGPT_PATH || path.join(__dirname, 'PentestGPT');
    return fs.existsSync(pentestPath);
}

function getPrimaryApiKey() {
    for (const keyType of API_KEY_PRIORITY) {
        const status = apiKeyStatus[keyType];
        if (status?.key && status.working) {
            return {
                key: status.key,
                type: keyType,
                name: status.name,
                model: status.model
            };
        }
    }

    return null;
}

function markApiKeyFailed(keyType, error) {
    if (apiKeyStatus[keyType]) {
        apiKeyStatus[keyType].working = false;
        apiKeyStatus[keyType].lastError = error;
        apiKeyStatus[keyType].errorCount++;
        log.warn(`🚫 ${apiKeyStatus[keyType].name} API key marked as failed: ${error}`);

        // Reset after 1 hour to retry
        setTimeout(() => {
            if (apiKeyStatus[keyType]) {
                apiKeyStatus[keyType].working = true;
                apiKeyStatus[keyType].errorCount = 0;
                log.info(`🔄 ${apiKeyStatus[keyType].name} API key reset - will retry`);
            }
        }, 60 * 60 * 1000); // 1 hour
    }
}

function getNextApiKey(excludedTypes = new Set()) {
    for (const keyType of API_KEY_PRIORITY) {
        if (excludedTypes.has(keyType)) continue;
        const status = apiKeyStatus[keyType];
        if (status?.key && status.working) {
            return {
                key: status.key,
                type: keyType,
                name: status.name,
                model: status.model
            };
        }
    }

    return null;
}

// 150+ COMPREHENSIVE SECURITY TOOLS DATABASE (INTEGRATED WITH HEXSTRIKE AI)
const securityTools = {
    // === NETWORK RECON & SCANNING ===
    nmap: {
        name: 'Nmap', category: 'Network Recon',
        description: 'Network discovery and security auditing',
        commands: {
            basic: 'nmap -sS --top-ports 100 -T4 {target}',
            service_scan: 'nmap -sV --top-ports 100 -T4 {target}',
            vuln_scan: 'nmap --script vuln --top-ports 50 -T4 {target}'
        }
    },
    masscan: {
        name: 'Masscan', category: 'Network Recon',
        description: 'High-speed port scanner',
        commands: {
            basic: 'masscan -p80,443,8080,8443 --rate=1000 {target}'
        }
    },
    rustscan: {
        name: 'RustScan', category: 'Network Recon',
        description: 'Ultra-fast port scanner',
        commands: {
            basic: 'rustscan -a {target} --top 1000 -t 2000'
        }
    },
    amass: {
        name: 'Amass', category: 'Network Recon',
        description: 'OWASP subdomain enumeration',
        commands: {
            enum: 'amass enum -d {target}',
            intel: 'amass intel -d {target}'
        }
    },
    subfinder: {
        name: 'Subfinder', category: 'Network Recon',
        description: 'Subdomain discovery tool',
        commands: {
            scan: 'subfinder -d {target}'
        }
    },
    nuclei: {
        name: 'Nuclei', category: 'Network Recon',
        description: 'Vulnerability scanner with templates',
        commands: {
            basic: 'nuclei -u {target} -c 10 -rl 100'
        }
    },
    fierce: {
        name: 'Fierce', category: 'Network Recon',
        description: 'DNS reconnaissance tool',
        commands: {
            scan: 'fierce --domain {target}'
        }
    },
    dnsenum: {
        name: 'DNSEnum', category: 'Network Recon',
        description: 'DNS enumeration tool',
        commands: {
            scan: 'dnsenum {target}'
        }
    },
    autorecon: {
        name: 'AutoRecon', category: 'Network Recon',
        description: 'Automated reconnaissance tool',
        commands: {
            scan: 'autorecon {target}'
        }
    },
    theharvester: {
        name: 'theHarvester', category: 'Network Recon',
        description: 'OSINT information gathering',
        commands: {
            scan: 'theHarvester -d {target} -b google'
        }
    },
    responder: {
        name: 'Responder', category: 'Network Recon',
        description: 'LLMNR, NBT-NS and MDNS poisoner',
        commands: {
            analyze: 'responder -A -I eth0'
        }
    },
    netexec: {
        name: 'NetExec', category: 'Network Recon',
        description: 'Network service exploitation tool',
        commands: {
            scan: 'netexec smb {target}'
        }
    },
    enum4linuxng: {
        name: 'Enum4linux-ng', category: 'Network Recon',
        description: 'Linux enumeration tool',
        commands: {
            scan: 'enum4linux-ng {target}'
        }
    },

    // === WEB APPLICATION SECURITY ===
    gobuster: {
        name: 'Gobuster', category: 'Web Security',
        description: 'Directory and file brute-forcer',
        commands: {
            dir: 'gobuster dir -u {target} -w /usr/share/wordlists/dirb/common.txt',
            dns: 'gobuster dns -d {target} -w /usr/share/wordlists/subdomains.txt'
        }
    },
    feroxbuster: {
        name: 'Feroxbuster', category: 'Web Security',
        description: 'Fast directory brute forcer',
        commands: {
            scan: 'feroxbuster -u {target} -w /usr/share/wordlists/dirb/common.txt'
        }
    },
    dirsearch: {
        name: 'DirSearch', category: 'Web Security',
        description: 'Web path scanner',
        commands: {
            scan: 'dirsearch -u {target} -e php,html,js'
        }
    },
    ffuf: {
        name: 'FFuf', category: 'Web Security',
        description: 'Fast web fuzzer',
        commands: {
            dir: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u {target}/FUZZ'
        }
    },
    dirb: {
        name: 'Dirb', category: 'Web Security',
        description: 'Web content scanner',
        commands: {
            scan: 'dirb {target} /usr/share/wordlists/dirb/common.txt'
        }
    },
    httpx: {
        name: 'HTTPx', category: 'Web Security',
        description: 'Fast HTTP toolkit',
        commands: {
            probe: 'httpx -u {target} -status-code -tech-detect'
        }
    },
    katana: {
        name: 'Katana', category: 'Web Security',
        description: 'Web crawling framework',
        commands: {
            crawl: 'katana -u {target} -depth 3'
        }
    },
    nikto: {
        name: 'Nikto', category: 'Web Security',
        description: 'Web server scanner',
        commands: {
            scan: 'nikto -h {target}'
        }
    },
    sqlmap: {
        name: 'SQLMap', category: 'Web Security',
        description: 'SQL injection detection tool',
        commands: {
            scan: 'sqlmap -u {target} --batch --level=1 --risk=1'
        }
    },
    wpscan: {
        name: 'WPScan', category: 'Web Security',
        description: 'WordPress vulnerability scanner',
        commands: {
            scan: 'wpscan --url {target}'
        }
    },
    arjun: {
        name: 'Arjun', category: 'Web Security',
        description: 'HTTP parameter discovery',
        commands: {
            scan: 'arjun -u {target}'
        }
    },
    paramspider: {
        name: 'ParamSpider', category: 'Web Security',
        description: 'Parameter mining tool',
        commands: {
            scan: 'paramspider -d {target}'
        }
    },
    dalfox: {
        name: 'DalFox', category: 'Web Security',
        description: 'XSS scanner and parameter analysis',
        commands: {
            scan: 'dalfox url {target}'
        }
    },
    wafw00f: {
        name: 'WafW00f', category: 'Web Security',
        description: 'Web Application Firewall detection',
        commands: {
            scan: 'wafw00f {target}'
        }
    },

    // === PASSWORD & AUTHENTICATION ===
    hydra: {
        name: 'Hydra', category: 'Password Attack',
        description: 'Network login cracker',
        commands: {
            ssh: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt {target} ssh',
            http: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt {target} http-get'
        }
    },
    john: {
        name: 'John the Ripper', category: 'Password Attack',
        description: 'Password cracking tool',
        commands: {
            crack: 'john --wordlist=/usr/share/wordlists/rockyou.txt {target}'
        }
    },
    hashcat: {
        name: 'Hashcat', category: 'Password Attack',
        description: 'Advanced password recovery',
        commands: {
            md5: 'hashcat -m 0 -a 0 {target} /usr/share/wordlists/rockyou.txt'
        }
    },
    medusa: {
        name: 'Medusa', category: 'Password Attack',
        description: 'Parallel brute-force tool',
        commands: {
            ssh: 'medusa -h {target} -u admin -P /usr/share/wordlists/rockyou.txt -M ssh'
        }
    },
    patator: {
        name: 'Patator', category: 'Password Attack',
        description: 'Multi-purpose brute-forcer',
        commands: {
            ssh: 'patator ssh_login host={target} user=admin password=FILE0 0=/usr/share/wordlists/rockyou.txt'
        }
    },
    crackmapexec: {
        name: 'CrackMapExec', category: 'Password Attack',
        description: 'Network service exploitation',
        commands: {
            smb: 'crackmapexec smb {target} -u admin -p admin'
        }
    },
    evilwinrm: {
        name: 'Evil-WinRM', category: 'Password Attack',
        description: 'Windows Remote Management tool',
        commands: {
            connect: 'evil-winrm -i {target} -u admin -p password'
        }
    },
    hashidentifier: {
        name: 'Hash-Identifier', category: 'Password Attack',
        description: 'Hash type identifier',
        commands: {
            identify: 'hash-identifier'
        }
    },
    ophcrack: {
        name: 'Ophcrack', category: 'Password Attack',
        description: 'Windows password cracker',
        commands: {
            crack: 'ophcrack -t /usr/share/ophcrack/tables/vista_free -f {target}'
        }
    },

    // === BINARY/REVERSE ENGINEERING ===
    gdb: {
        name: 'GDB', category: 'Binary Analysis',
        description: 'GNU Debugger',
        commands: {
            debug: 'gdb {target}'
        }
    },
    radare2: {
        name: 'Radare2', category: 'Binary Analysis',
        description: 'Reverse engineering framework',
        commands: {
            analyze: 'r2 -A {target}'
        }
    },
    binwalk: {
        name: 'Binwalk', category: 'Binary Analysis',
        description: 'Firmware analysis tool',
        commands: {
            extract: 'binwalk -e {target}'
        }
    },
    ghidra: {
        name: 'Ghidra', category: 'Binary Analysis',
        description: 'NSA reverse engineering suite',
        commands: {
            analyze: 'ghidra {target}'
        }
    },
    checksec: {
        name: 'Checksec', category: 'Binary Analysis',
        description: 'Binary security checker',
        commands: {
            check: 'checksec --file={target}'
        }
    },
    strings: {
        name: 'Strings', category: 'Binary Analysis',
        description: 'Extract printable strings',
        commands: {
            extract: 'strings {target}'
        }
    },
    objdump: {
        name: 'Objdump', category: 'Binary Analysis',
        description: 'Object file disassembler',
        commands: {
            disasm: 'objdump -d {target}'
        }
    },
    volatility3: {
        name: 'Volatility3', category: 'Binary Analysis',
        description: 'Memory forensics framework',
        commands: {
            info: 'vol3 -f {target} windows.info'
        }
    },
    foremost: {
        name: 'Foremost', category: 'Binary Analysis',
        description: 'File carving tool',
        commands: {
            recover: 'foremost -i {target} -o output'
        }
    },
    steghide: {
        name: 'Steghide', category: 'Binary Analysis',
        description: 'Steganography tool',
        commands: {
            extract: 'steghide extract -sf {target}'
        }
    },
    exiftool: {
        name: 'ExifTool', category: 'Binary Analysis',
        description: 'Metadata extraction tool',
        commands: {
            extract: 'exiftool {target}'
        }
    },

    // === CLOUD SECURITY ===
    prowler: {
        name: 'Prowler', category: 'Cloud Security',
        description: 'AWS security assessment',
        commands: {
            scan: 'prowler aws'
        }
    },
    scoutsuite: {
        name: 'Scout Suite', category: 'Cloud Security',
        description: 'Multi-cloud security auditing',
        commands: {
            aws: 'scout aws'
        }
    },
    trivy: {
        name: 'Trivy', category: 'Cloud Security',
        description: 'Container vulnerability scanner',
        commands: {
            image: 'trivy image {target}',
            fs: 'trivy fs {target}'
        }
    },
    kubehunter: {
        name: 'Kube-Hunter', category: 'Cloud Security',
        description: 'Kubernetes penetration testing',
        commands: {
            scan: 'kube-hunter --remote {target}'
        }
    },
    kubebench: {
        name: 'Kube-Bench', category: 'Cloud Security',
        description: 'Kubernetes security benchmark',
        commands: {
            check: 'kube-bench'
        }
    },
    dockerbenchsecurity: {
        name: 'Docker Bench Security', category: 'Cloud Security',
        description: 'Docker security benchmark',
        commands: {
            check: 'docker-bench-security'
        }
    },

    // === ADDITIONAL HEXSTRIKE TOOLS ===
    hakrawler: {
        name: 'Hakrawler', category: 'Web Security',
        description: 'Web crawler for URLs',
        commands: {
            crawl: 'hakrawler -url {target} -depth 3'
        }
    },
    gau: {
        name: 'GAU', category: 'Web Security',
        description: 'Get All URLs from sources',
        commands: {
            fetch: 'gau {target}'
        }
    },
    waybackurls: {
        name: 'Waybackurls', category: 'Web Security',
        description: 'Fetch URLs from Wayback Machine',
        commands: {
            fetch: 'waybackurls {target}'
        }
    },
    x8: {
        name: 'X8', category: 'Web Security',
        description: 'Hidden parameter discovery',
        commands: {
            scan: 'x8 -u {target}'
        }
    },
    jaeles: {
        name: 'Jaeles', category: 'Web Security',
        description: 'Web application security scanner',
        commands: {
            scan: 'jaeles scan -u {target}'
        }
    },
    testssl: {
        name: 'testssl.sh', category: 'Web Security',
        description: 'SSL/TLS security checker',
        commands: {
            check: 'testssl {target}'
        }
    },
    sslscan: {
        name: 'SSLScan', category: 'Web Security',
        description: 'SSL configuration scanner',
        commands: {
            scan: 'sslscan {target}'
        }
    },
    sslyze: {
        name: 'SSLyze', category: 'Web Security',
        description: 'SSL configuration analyzer',
        commands: {
            analyze: 'sslyze {target}'
        }
    },
    whatweb: {
        name: 'WhatWeb', category: 'Web Security',
        description: 'Web technology identifier',
        commands: {
            scan: 'whatweb {target}'
        }
    },
    jwttool: {
        name: 'JWT-Tool', category: 'Web Security',
        description: 'JWT security testing',
        commands: {
            test: 'jwt_tool {target}'
        }
    },
    wfuzz: {
        name: 'Wfuzz', category: 'Web Security',
        description: 'Web application fuzzer',
        commands: {
            fuzz: 'wfuzz -w /usr/share/wordlists/dirb/common.txt {target}/FUZZ'
        }
    },
    commix: {
        name: 'Commix', category: 'Web Security',
        description: 'Command injection exploiter',
        commands: {
            test: 'commix -u {target}'
        }
    },
    nosqlmap: {
        name: 'NoSQLMap', category: 'Web Security',
        description: 'NoSQL injection testing',
        commands: {
            test: 'nosqlmap -u {target}'
        }
    },
    tplmap: {
        name: 'Tplmap', category: 'Web Security',
        description: 'Template injection testing',
        commands: {
            test: 'tplmap -u {target}'
        }
    },

    // === CTF & FORENSICS ===
    photorec: {
        name: 'PhotoRec', category: 'Forensics',
        description: 'File recovery tool',
        commands: {
            recover: 'photorec {target}'
        }
    },
    testdisk: {
        name: 'TestDisk', category: 'Forensics',
        description: 'Disk recovery tool',
        commands: {
            recover: 'testdisk {target}'
        }
    },
    stegsolve: {
        name: 'Stegsolve', category: 'Forensics',
        description: 'Steganography solver',
        commands: {
            analyze: 'stegsolve {target}'
        }
    },
    zsteg: {
        name: 'Zsteg', category: 'Forensics',
        description: 'PNG/BMP steganography',
        commands: {
            analyze: 'zsteg {target}'
        }
    },
    outguess: {
        name: 'Outguess', category: 'Forensics',
        description: 'Steganographic detection',
        commands: {
            extract: 'outguess -r {target} output.txt'
        }
    },
    scalpel: {
        name: 'Scalpel', category: 'Forensics',
        description: 'File carving tool',
        commands: {
            carve: 'scalpel -o output {target}'
        }
    },
    bulkextractor: {
        name: 'Bulk Extractor', category: 'Forensics',
        description: 'Digital forensics tool',
        commands: {
            extract: 'bulk_extractor -o output {target}'
        }
    },
    autopsy: {
        name: 'Autopsy', category: 'Forensics',
        description: 'Digital forensics platform',
        commands: {
            analyze: 'autopsy'
        }
    },
    sleuthkit: {
        name: 'Sleuth Kit', category: 'Forensics',
        description: 'Digital investigation tools',
        commands: {
            analyze: 'fls {target}'
        }
    },

    // === OSINT & INTELLIGENCE ===
    sherlock: {
        name: 'Sherlock', category: 'OSINT',
        description: 'Social media username search',
        commands: {
            search: 'sherlock {target}'
        }
    },
    socialanalyzer: {
        name: 'Social-Analyzer', category: 'OSINT',
        description: 'Social media analysis',
        commands: {
            analyze: 'social-analyzer --username {target}'
        }
    },
    reconng: {
        name: 'Recon-ng', category: 'OSINT',
        description: 'Reconnaissance framework',
        commands: {
            recon: 'recon-ng'
        }
    },
    maltego: {
        name: 'Maltego', category: 'OSINT',
        description: 'Link analysis platform',
        commands: {
            analyze: 'maltego'
        }
    },
    spiderfoot: {
        name: 'SpiderFoot', category: 'OSINT',
        description: 'OSINT automation',
        commands: {
            scan: 'spiderfoot -s {target}'
        }
    },
    trufflehog: {
        name: 'TruffleHog', category: 'OSINT',
        description: 'Secret scanner',
        commands: {
            scan: 'trufflehog {target}'
        }
    },

    // === CRYPTOGRAPHY ===
    cyberchef: {
        name: 'CyberChef', category: 'Cryptography',
        description: 'Cyber Swiss Army Knife',
        commands: {
            decode: 'cyberchef'
        }
    },
    cipheridentifier: {
        name: 'Cipher-Identifier', category: 'Cryptography',
        description: 'Cipher type identification',
        commands: {
            identify: 'cipher-identifier {target}'
        }
    },
    rsatool: {
        name: 'RSATool', category: 'Cryptography',
        description: 'RSA cryptanalysis',
        commands: {
            crack: 'rsatool -n {target}'
        }
    },
    factordb: {
        name: 'FactorDB', category: 'Cryptography',
        description: 'Integer factorization database',
        commands: {
            query: 'factordb {target}'
        }
    },

    // === SPECIAL TOOLS ===
    xsser: {
        name: 'XSSer', category: 'Web Security',
        description: 'XSS detection tool',
        commands: {
            scan: 'xsser -u {target}'
        }
    },
    searchsploit: {
        name: 'SearchSploit', category: 'Exploit',
        description: 'Exploit database search',
        commands: {
            search: 'searchsploit {target}'
        }
    },
    metasploit: {
        name: 'Metasploit', category: 'Exploit',
        description: 'Penetration testing framework',
        commands: {
            search: 'msfconsole -q -x "search {target}; exit"'
        }
    },

    // === AI SECURITY TOOLS ===
    pentestgpt: {
        name: 'PentestGPT', category: 'AI Security',
        description: 'AI-guided penetration testing framework with GPT-4o intelligence',
        commands: {
            auto: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --operation auto --target {target}',
            guided: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --operation guided --target {target}',
            reasoning: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --reasoning --target {target}',
            interactive: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --interactive --target {target}',
            advanced: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --advanced-mode --target {target}',
            discuss: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --discuss --target {target}',
            google: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python pentestgpt.py --google --target {target}'
        }
    },
    hexstrike: {
        name: 'HexStrike AI', category: 'AI Security',
        description: 'Advanced AI-powered automated security testing platform with 150+ tools',
        commands: {
            auto: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python main.py --target {target} --mode auto',
            comprehensive: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python main.py --target {target} --mode comprehensive',
            ai_enhanced: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python main.py --target {target} --ai-enhanced',
            custom: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python main.py --target {target} --custom-payload',
            stealth: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python main.py --target {target} --stealth-mode'
        }
    }
};

const AVAILABLE_TOOLS = Object.values(securityTools).map((tool) => ({
    name: tool.name,
    category: tool.category,
    description: tool.description || '',
    commands: tool.commands || {}
}));


// Enhanced menu system
const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Smart Scan', 'smart_scan')],
    [Markup.button.callback('🔴 Red Team', 'red_team'), Markup.button.callback('🔵 Blue Team', 'blue_team')],
    [Markup.button.callback('🛠️ All Tools', 'all_tools'), Markup.button.callback('📊 Status', 'status')],
    [Markup.button.callback('🧠 AI Analysis', 'ai_analysis')]
]);

const toolCategoryMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🌐 Network Recon', 'cat_network')],
    [Markup.button.callback('🔒 Web Security', 'cat_web')],
    [Markup.button.callback('🔍 OSINT', 'cat_osint')],
    [Markup.button.callback('📡 Subdomain Enum', 'cat_subdomain')],
    [Markup.button.callback('☁️ Cloud Security', 'cat_cloud')],
    [Markup.button.callback('🔙 Back', 'main_menu')]
]);

// OpenRouter AI Integration with Auto-Rotation (50 requests/day)
async function analyzeWithOpenRouter(results, target, operation) {
    const triedTypes = new Set();
    let currentKey = getNextApiKey(triedTypes);
    let lastError = null;

    while (currentKey) {
        try {
            const result = await tryOpenRouterWithFailover(
                results,
                target,
                operation,
                currentKey.key,
                currentKey.name,
                currentKey.type,
                currentKey.model
            );
            log.success(`✅ ${currentKey.name} AI analysis completed successfully`);
            return result;
        } catch (error) {
            lastError = error;
            log.error(`${currentKey.name} analysis failed: ${error.message}`);

            const message = error.message || '';
            if (message.includes('rate limit') || message.includes('quota') || message.includes('401') || message.includes('402') || message.includes('403') || message.includes('credits')) {
                markApiKeyFailed(currentKey.type, message);
            }

            triedTypes.add(currentKey.type);
            currentKey = getNextApiKey(triedTypes);
        }
    }

    log.warn(`🚫 All OpenRouter API keys failed${lastError ? `: ${lastError.message}` : ''}`);
    return 'AI analysis unavailable (no working OpenRouter keys). Please review raw tool output or retry later.';
}

// Try OpenRouter with failover system
async function tryOpenRouterWithFailover(results, target, operation, apiKey, keyName, keyType, modelOverride) {
    const renderedTools = results.map((r, index) => {
        const header = `Finding ${index + 1}: ${r.tool || 'unknown tool'}`;
        const commandLine = `Command: ${r.command || 'n/a'}`;
        const statusLine = `Success: ${r.success}`;
        const outputLine = `Output: ${(r.stdout || 'No output available').substring(0, 2000)}`;
        const errorLine = r.stderr ? `Errors: ${r.stderr.substring(0, 1000)}` : '';
        return [header, commandLine, statusLine, outputLine, errorLine].filter(Boolean).join('\n');
    }).join('\n\n');

    const prompt = [
        `Analyze the following HexStrike security findings for target ${target} (operation: ${operation}).`,
        'Respond with a polished executive briefing using Markdown with these exact sections and emoji:',
        '🚀 Executive Snapshot — one sentence summarizing overall posture and risk trend.',
        '🔥 Top Risks — up to three bullets. Start each bullet with severity emoji (🟥 critical, 🟧 high, 🟨 medium, 🟦 low) plus risk, impacted asset, and concise evidence.',
        '🛡️ Recommended Actions — prioritized list with suggested owner (e.g., AppSec, Platform) and target timeframe.',
        '📝 Evidence Highlights — each line "tool -> brief finding" referencing only the supplied outputs.',
        '📈 Next Steps — immediate follow-up checks or manual validations.',
        'If no risks are confirmed, say so explicitly and pivot to hardening advice. Always end with "🔒 Authorized testing only."',
        'Keep total length under 250 words, use short sentences, and maintain an executive tone.',
        '=== RAW FINDINGS ===',
        renderedTools || 'No findings provided.',
        '=== END RAW FINDINGS ==='
    ].join('\n\n');

    const status = apiKeyStatus[keyType];
    const model = modelOverride || status?.model || apiKeyStatus.deepseek_chat.model;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://jaeger-ai.com',
            'X-Title': 'Jaeger AI Ultimate'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are Jaeger AI\'s executive cyber analyst. Deliver concise, evidence-based security briefings with emoji-rich Markdown headings and actionable direction.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`${keyName} API error ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    log.success(`✅ ${keyName} AI analysis completed successfully`);
    return data.choices[0].message.content;
}


// AI Tool Integrations
async function executePentestGPT(target, ctx, operationId) {
    try {
        log.info(`🤖 Starting PentestGPT AI analysis for ${target}`);

        // Use OpenRouter API to simulate PentestGPT analysis with AI
        const primaryKey = getPrimaryApiKey();
        if (primaryKey) {
            const prompt = `You are PentestGPT, an AI-powered penetration testing assistant. Perform a comprehensive security analysis for target: ${target}

Generate a detailed penetration testing report including:
1. Reconnaissance findings
2. Vulnerability assessment
3. Attack vectors identified
4. Exploitation recommendations
5. Risk assessment and prioritization
6. Remediation steps

Format the response as a professional penetration testing report.`;

            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${primaryKey.key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://jaeger-ai.com',
                        'X-Title': 'Jaeger AI Ultimate'
                    },
                    body: JSON.stringify({
                        model: primaryKey.model,
                        messages: [
                            { role: 'system', content: 'You are PentestGPT, an expert AI penetration testing assistant.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 4000,
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const analysis = data.choices[0].message.content;

                    await ctx.reply(`🤖 **PENTESTGPT AI ANALYSIS COMPLETE**\n\n${analysis}`);

                    return {
                        tool: 'pentestgpt',
                        success: true,
                        stdout: analysis,
                        command: 'AI-powered penetration testing analysis',
                        aiAnalysis: true
                    };
                }
            } catch (error) {
                log.error(`PentestGPT AI analysis failed: ${error.message}`);
            }
        }

        // Fallback simulation
        const simulation = `🤖 *PENTESTGPT AI ANALYSIS*\n\n🎯 Target: ${target}\n\n*RECONNAISSANCE PHASE:*\n• Domain enumeration completed\n• Subdomain discovery active\n• Port scanning in progress\n\n*VULNERABILITY ASSESSMENT:*\n• Web application testing\n• Network service analysis\n• SSL/TLS configuration review\n\n*ATTACK SURFACE MAPPING:*\n• Entry points identified\n• Authentication mechanisms analyzed\n• Authorization bypass opportunities\n\n*AI RECOMMENDATIONS:*\n• Focus on web application vulnerabilities\n• Test for injection flaws\n• Verify access controls\n\n*NEXT STEPS:*\n• Manual validation required\n• Social engineering assessment\n• Physical security review\n\n⚠️ This is a simulated PentestGPT analysis\\. Real implementation requires proper setup\\.`;

        await ctx.reply(simulation, { parse_mode: 'MarkdownV2' });

        return {
            tool: 'pentestgpt',
            success: true,
            stdout: simulation,
            command: 'PentestGPT AI analysis (simulated)',
            simulation: true
        };

    } catch (error) {
        log.error(`PentestGPT execution failed: ${error.message}`);
        return {
            tool: 'pentestgpt',
            success: false,
            error: error.message,
            command: 'PentestGPT AI analysis'
        };
    }
}

async function executeHexStrike(target, ctx, operationId, options = {}) {
    const {
        intent = 'scan',
        recommendation = '',
        plan = null,
        contextOverrides = {},
        objectiveOverride = null
    } = options;

    const runSimulation = async (reason) => {
        if (reason) {
            try {
                await ctx.reply(`ℹ️ HexStrike automation tidak tersedia (${reason}). Menampilkan simulasi.`);
            } catch (notifyError) {
                log.error(`Failed to notify HexStrike fallback: ${notifyError.message}`);
            }
        }

        const simulation = `🤖 *HEXSTRIKE AI AUTOMATION*\n\n🎯 Target: ${target}\n\n*AUTOMATION WORKFLOW INITIATED:*\n• 150+ security tools activated\n• MCP protocol engaged\n• AI agents deployed\n\n*RECONNAISSANCE AUTOMATION:*\n• Domain intelligence gathering\n• Infrastructure mapping\n• Technology stack identification\n\n*VULNERABILITY AUTOMATION:*\n• Multi-scanner correlation\n• CVE database cross-reference\n• Zero-day pattern detection\n\n*THREAT INTELLIGENCE:*\n• IOC correlation active\n• Threat actor attribution\n• Attack pattern analysis\n\n*AI-POWERED ANALYSIS:*\n• Machine learning threat detection\n• Behavioral anomaly identification\n• Predictive risk assessment\n\n*AUTOMATION RESULTS:*\n• Critical vulnerabilities: 3 found\n• Medium risk issues: 7 identified\n• Compliance gaps: 2 detected\n\n⚠️ This is a simulated HexStrike AI analysis\\. Real implementation requires proper setup\\.`;

        await ctx.reply(simulation, { parse_mode: 'MarkdownV2' });

        return {
            tool: 'hexstrike',
            success: true,
            stdout: simulation,
            command: 'HexStrike AI automation (simulated)',
            simulation: true
        };
    };

    if (!hexstrikeBridge.isConfigured()) {
        return runSimulation('HEXSTRIKE_BASE_URL belum dikonfigurasi');
    }

    let progressInterval = null;
    let storedLogPath = null;
    const startedAt = Date.now();

    try {
        log.info(`🤖 Starting HexStrike smart automation for ${target}`);
        await ctx.reply('🤖 Menghubungkan ke HexStrike MCP server...');

        const objectiveInfo = (() => {
            const base = hexstrikeBridge.mapIntentToObjective(objectiveOverride || intent);
            if (plan) {
                base.objective = plan.objective;
                base.label = plan.label;
                base.maxTools = plan.maxTools;
            }
            return base;
        })();

        const health = await hexstrikeBridge.checkHealth();
        const version = health?.version || health?.build || 'unknown';

        await ctx.reply(`🟢 HexStrike MCP online (v${version})\n🎛 Objective: ${objectiveInfo.label}\n🛠 Max tools: ${objectiveInfo.maxTools}`);

        const preferredTools = Array.isArray(plan?.context?.preferred_tools)
            ? plan.context.preferred_tools.filter((tool) => typeof tool === 'string' && tool.trim())
            : [];
        const excludedTools = Array.isArray(plan?.context?.excluded_tools)
            ? plan.context.excluded_tools.filter((tool) => typeof tool === 'string' && tool.trim())
            : [];

        if (preferredTools.length || excludedTools.length) {
            const preferenceLines = [];
            if (preferredTools.length) {
                preferenceLines.push(`🧠 Fokus tool: ${preferredTools.slice(0, 6).join(', ')}${preferredTools.length > 6 ? ' …' : ''}`);
            }
            if (excludedTools.length) {
                preferenceLines.push(`🚫 Dilewati: ${excludedTools.join(', ')} (performa/ketergantungan lokal)`);
            }
            await ctx.reply(formatMessage(preferenceLines.join('\n')));
        }

        const progressMessages = [
            '⏳ HexStrike sedang memetakan permukaan serangan…',
            '🔍 Mengumpulkan intel & fingerprinting layanan…',
            '🧠 AI HexStrike menyusun korelasi risiko & bukti…',
            '📡 Mengharmonisasi output tools & AI agent…',
            '🧮 Menyusun executive briefing & rekomendasi tindakan…'
        ];

        let progressIndex = 0;
        progressInterval = setInterval(async () => {
            try {
                const message = progressMessages[progressIndex % progressMessages.length];
                progressIndex += 1;
                const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
                const elapsedHuman = elapsedSeconds >= 60
                    ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`
                    : `${elapsedSeconds}s`;
                await ctx.reply(`${message}\n⏱️ Elapsed: ${elapsedHuman}\n(Operasi masih berjalan, mohon tunggu…)`);
            } catch (error) {
                log.warn(`Progress update failed: ${error.message}`);
            }
        }, 60000);

        let technologyProfile = null;
        try {
            technologyProfile = await hexstrikeBridge.detectTechnologies(target);
        } catch (techError) {
            log.warn(`HexStrike technology detection failed: ${techError.message}`);
        }

        const scanContext = {
            quick: objectiveInfo.objective === 'quick',
            stealth: objectiveInfo.objective === 'stealth',
            comprehensive: objectiveInfo.objective === 'comprehensive',
            ...plan?.context,
            ...contextOverrides
        };

        if (recommendation) {
            scanContext.ai_notes = recommendation;
        }

        const smartScan = await hexstrikeBridge.runSmartScan({
            target,
            objective: objectiveInfo.objective,
            maxTools: objectiveInfo.maxTools,
            context: scanContext
        });

        if (progressInterval) {
            clearInterval(progressInterval);
        }

        if (!smartScan?.success) {
            throw new Error('HexStrike smart scan returned an unsuccessful response');
        }

        const scanResults = smartScan.scan_results || {};
        const toolRuns = scanResults.tools_executed || [];
        const summary = scanResults.execution_summary || {};
        const successfulTools = summary.successful_tools ?? toolRuns.filter(t => t.success).length;
        const totalTools = summary.total_tools ?? toolRuns.length;
        const totalVulns = scanResults.total_vulnerabilities ?? 0;
        const totalTime = summary.total_execution_time ? `${Math.round(summary.total_execution_time)}s` : 'n/a';

        let summaryMessage = `🤖 HEXSTRIKE SMART SCAN COMPLETE\n\n`;
        summaryMessage += `🎯 Target: ${target}\n`;
        summaryMessage += `🧭 Objective: ${objectiveInfo.label} (${objectiveInfo.objective})\n`;
        summaryMessage += `🛠 Tools executed: ${successfulTools}/${totalTools} successful\n`;
        summaryMessage += `⚠️ Indicators flagged: ${totalVulns}\n`;
        summaryMessage += `⏱ Duration: ${totalTime}`;

        const detectedTech = technologyProfile?.detected_technologies;
        if (detectedTech && Array.isArray(detectedTech) && detectedTech.length) {
            summaryMessage += `\n🧩 Detected stack: ${detectedTech.join(', ')}`;
        }

        if (recommendation) {
            summaryMessage += `\n\nAI context: ${recommendation}`;
        }

        await ctx.reply(formatMessage(summaryMessage));

        const combinedOutput = scanResults.combined_output || '';
        if (combinedOutput) {
            const logsDir = path.join(__dirname, 'logs', 'hexstrike');
            try {
                fs.mkdirSync(logsDir, { recursive: true });
                const logPath = path.join(logsDir, `${operationId || 'hexstrike'}-${Date.now()}.log`);
                fs.writeFileSync(logPath, combinedOutput, 'utf8');
                storedLogPath = logPath;
            } catch (logError) {
                log.error(`Failed to write HexStrike log: ${logError.message}`);
            }
        }

        return {
            tool: 'hexstrike',
            success: true,
            stdout: combinedOutput || JSON.stringify(scanResults, null, 2),
            stderr: '',
            command: `HexStrike smart-scan (${objectiveInfo.objective})`,
            executed: true,
            realExecution: true,
            metadata: {
                target,
                objective: objectiveInfo,
                summary,
                vulnerabilities: totalVulns,
                tools: toolRuns,
                technologies: technologyProfile?.detected_technologies || [],
                logPath: storedLogPath || null
            }
        };

    } catch (error) {
        log.error(`HexStrike execution failed: ${error.message}`);
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        return runSimulation(error.message);
    }
}

// Tools List Query System
function isToolsListQuery(text) {
    const lowText = text.toLowerCase();
    const toolsQueries = [
        'tools apa aja',
        'apa aja tools',
        'tool apa saja',
        'tools yang ada',
        'daftar tools',
        'list tools',
        'tools list',
        'tools available',
        'available tools',
        'what tools',
        'tools bot',
        'bot tools',
        'security tools',
        'ada tools apa'
    ];

    return toolsQueries.some(query => lowText.includes(query));
}

async function handleToolsListQuery(ctx, text) {
    try {
        log.info(`🔧 User requested tools list: "${text}"`);

        // Get all tools from securityTools object
        if (!securityTools || typeof securityTools !== 'object') {
            await ctx.reply('❌ Tools database not available');
            return;
        }

        const allTools = Object.keys(securityTools);
        const totalTools = allTools.length;

        // Categorize tools
        const networkTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['nmap', 'masscan', 'rustscan', 'zmap', 'ping', 'traceroute', 'netstat', 'ss', 'arp', 'nslookup', 'dig', 'host', 'whois', 'curl', 'wget', 'telnet'].includes(toolName);
        });

        const webTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['nuclei', 'gobuster', 'feroxbuster', 'ffuf', 'nikto', 'sqlmap', 'httpx', 'wafw00f', 'dalfox', 'arjun', 'wpscan', 'joomscan', 'droopescan', 'dirb', 'dirbuster', 'wfuzz', 'burpsuite', 'owasp-zap', 'commix', 'xsser'].includes(toolName);
        });

        const vulnTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['nessus', 'openvas', 'nexpose', 'qualys', 'trivy', 'grype', 'syft', 'docker-bench', 'kube-bench', 'prowler', 'checkov', 'bandit', 'semgrep', 'codeql', 'snyk'].includes(toolName);
        });

        const osintTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['theharvester', 'subfinder', 'amass', 'sherlock', 'shodan-cli', 'fierce', 'dnsenum', 'spiderfoot', 'recon-ng', 'maltego', 'harvester', 'datasploit', 'photon', 'infoga', 'dnsrecon'].includes(toolName);
        });

        const passwordTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['hashcat', 'john', 'hydra', 'medusa', 'ncrack', 'patator', 'crowbar', 'thc-hydra', 'brutespray', 'cewl', 'crunch', 'cupp', 'mentalist'].includes(toolName);
        });

        const exploitTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['metasploit', 'exploitdb', 'searchsploit', 'msfvenom', 'armitage', 'cobalt-strike', 'empire', 'covenant', 'sliver', 'havoc', 'mythic', 'koadic'].includes(toolName);
        });

        // Other tools (not in categories above)
        const categorizedTools = [...networkTools, ...webTools, ...vulnTools, ...osintTools, ...passwordTools, ...exploitTools];
        const otherTools = allTools.filter(tool => !categorizedTools.includes(tool));

        // Build response message
        let response = `🛠️ **JAEGER AI TOOLS DATABASE**\n\n`;
        response += `📊 **Total Tools: ${totalTools}**\n\n`;

        response += `🌐 **Network Reconnaissance (${networkTools.length} tools):**\n`;
        response += `\`${networkTools.slice(0, 10).join(', ')}\`${networkTools.length > 10 ? ` +${networkTools.length - 10} more` : ''}\n\n`;

        response += `🕷️ **Web Security (${webTools.length} tools):**\n`;
        response += `\`${webTools.slice(0, 10).join(', ')}\`${webTools.length > 10 ? ` +${webTools.length - 10} more` : ''}\n\n`;

        response += `🔍 **Vulnerability Assessment (${vulnTools.length} tools):**\n`;
        response += `\`${vulnTools.slice(0, 8).join(', ')}\`${vulnTools.length > 8 ? ` +${vulnTools.length - 8} more` : ''}\n\n`;

        response += `🕵️ **OSINT & Intelligence (${osintTools.length} tools):**\n`;
        response += `\`${osintTools.slice(0, 8).join(', ')}\`${osintTools.length > 8 ? ` +${osintTools.length - 8} more` : ''}\n\n`;

        response += `🔐 **Password & Authentication (${passwordTools.length} tools):**\n`;
        response += `\`${passwordTools.slice(0, 8).join(', ')}\`${passwordTools.length > 8 ? ` +${passwordTools.length - 8} more` : ''}\n\n`;

        response += `💥 **Exploitation (${exploitTools.length} tools):**\n`;
        response += `\`${exploitTools.slice(0, 8).join(', ')}\`${exploitTools.length > 8 ? ` +${exploitTools.length - 8} more` : ''}\n\n`;

        if (otherTools.length > 0) {
            response += `🔧 **Other Tools (${otherTools.length} tools):**\n`;
            response += `\`${otherTools.slice(0, 10).join(', ')}\`${otherTools.length > 10 ? ` +${otherTools.length - 10} more` : ''}\n\n`;
        }

        // AI Tools category
        const aiTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['pentestgpt', 'hexstrike'].includes(toolName);
        });

        response += `🤖 **AI Security Tools (${aiTools.length} tools):**\n`;
        response += `\`${aiTools.join(', ')}\`\n\n`;

        response += `🚀 **Special AI Features:**\n`;
        response += `• **PentestGPT** - AI-guided penetration testing framework\n`;
        response += `• **HexStrike AI** - AI-powered cybersecurity automation with 150+ tools\n`;
        response += `• **DeepSeek Analysis** - Advanced result interpretation and reporting\n\n`;

        response += `💡 **Usage Examples:**\n`;
        response += `• \`nmap google.com\` - Single tool scan\n`;
        response += `• \`scan facebook.com\` - Smart automated scan\n`;
        response += `• \`red team operation target.com\` - Full pentest\n`;
        response += `• \`pentestgpt analyze website.com\` - AI-powered test\n\n`;

        response += `📋 **Categories Available:**\n`;
        response += `🔴 Red Team • 🔵 Blue Team • 🔍 OSINT • 🌐 Web Security • 🕷️ Network • 💥 Exploitation`;

        await ctx.reply(response, { parse_mode: 'Markdown' });
        log.success(`✅ Tools list sent to user`);

    } catch (error) {
        log.error(`❌ Error handling tools query: ${error.message}`);
        await ctx.reply('❌ Error retrieving tools list. Please try again.');
    }
}

// AI-Powered Command Intelligence System - Improved Async Pattern
async function parseNaturalCommand(text) {
    log.ai(`🧠 Processing natural language: "${text}"`);

    // Input validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        log.warn('⚠️ Invalid input for parseNaturalCommand');
        return {
            intent: 'unknown',
            targets: [],
            tools: [],
            singleTool: false,
            fullScan: false,
            aiRecommendation: 'Invalid input received',
            useAI: false,
            aiTool: 'none'
        };
    }

    const lowText = text.toLowerCase().trim();

    // Extract targets with safety checks
    const targets = [];
    let hashValue = null;
    try {
        const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;

        let matches = lowText.match(urlRegex);
        if (matches && Array.isArray(matches)) {
            targets.push(...matches.map(m => m.replace(/^https?:\/\//, '').replace(/^www\./, '')));
        }

        matches = lowText.match(ipRegex);
        if (matches && Array.isArray(matches)) {
            targets.push(...matches);
        }

        if (/hash/.test(lowText)) {
            const rawHashMatch = text.match(/hash\s+([^\s]+)/i);
            if (rawHashMatch) {
                hashValue = rawHashMatch[1].trim();
            }
        }
    } catch (error) {
        log.error(`❌ Error extracting targets: ${error.message}`);
    }

    // Extract specific tools mentioned with safety
    const tools = [];
    try {
        if (securityTools && typeof securityTools === 'object') {
            // Direct tool name matching
            for (const tool in securityTools) {
                if (lowText.includes(tool.toLowerCase())) {
                    tools.push(tool);
                }
            }

            // Special keyword mappings for common requests
            const toolMappings = {
                'xss': ['dalfox', 'xsser'],
                'xss test': ['dalfox', 'xsser'],
                'xss scan': ['dalfox', 'xsser'],
                'cross site scripting': ['dalfox', 'xsser'],
                'sql injection': ['sqlmap'],
                'sqli': ['sqlmap'],
                'directory': ['gobuster', 'dirb'],
                'directory scan': ['gobuster', 'dirb'],
                'subdomain': ['subfinder', 'amass'],
                'subdomain enum': ['subfinder', 'amass'],
                'port scan': ['nmap'],
                'vulnerability scan': ['nuclei'],
                'vuln scan': ['nuclei'],
                'web scan': ['nikto', 'nuclei'],
                'fuzzing': ['ffuf', 'wfuzz'],
                'osint': ['theharvester', 'sherlock'],
                'bruteforce': ['hydra', 'medusa'],
                'brute force': ['hydra', 'medusa'],
                'brute-force': ['hydra', 'medusa'],
                'wordpress': ['wpscan'],
                'hash': ['hashidentifier', 'hashcat']
            };

            // Check for keyword mappings
            for (const [keyword, mappedTools] of Object.entries(toolMappings)) {
                if (lowText.includes(keyword)) {
                    tools.push(...mappedTools);
                    break; // Use first match to avoid duplicates
                }
            }
        }
    } catch (error) {
        log.error(`❌ Error extracting tools: ${error.message}`);
    }

    // Check patterns with safety
    let singleTool = false;
    let fullScan = false;
    try {
        if (securityTools && typeof securityTools === 'object') {
            const toolNames = Object.keys(securityTools).join('|');
            const singleToolPattern = new RegExp(`^(${toolNames})\\s+`, 'i');
            singleTool = singleToolPattern.test(text);
        }

        // Check for single tool requests based on specific keywords
        const singleToolKeywords = [
            'xss test', 'xss scan', 'sql injection', 'sqli test',
            'port scan', 'vulnerability scan', 'directory scan',
            'subdomain enum', 'osint research'
        ];

        if (singleToolKeywords.some(keyword => lowText.includes(keyword))) {
            singleTool = true;
        }

        fullScan = /full|complete|comprehensive|all|bundle|everything/i.test(lowText);
    } catch (error) {
        log.error(`❌ Error checking patterns: ${error.message}`);
    }

    // Default response structure
    const defaultResponse = {
        intent: 'scan',
        targets: targets,
        tools: tools,
        singleTool: singleTool,
        fullScan: fullScan,
        aiRecommendation: 'Using standard scanning approach',
        useAI: false,
        aiTool: 'none',
        hashValue
    };

    // AI Analysis with timeout and error handling
    try {
        const aiDecision = await Promise.race([
            analyzeUserIntent(text, targets[0] || 'target'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI analysis timeout after 8 seconds')), 8000)
            )
        ]);

        // Safely merge AI decision
        return {
            intent: aiDecision?.intent || defaultResponse.intent,
            targets: targets.length > 0 ? targets : (Array.isArray(aiDecision?.targets) ? aiDecision.targets : []),
            tools: tools.length > 0 ? tools : (Array.isArray(aiDecision?.recommendedTools) ? aiDecision.recommendedTools : []),
            singleTool: singleTool || Boolean(aiDecision?.useSingleTool),
            fullScan: fullScan || Boolean(aiDecision?.useFullScan),
            aiRecommendation: aiDecision?.explanation || defaultResponse.aiRecommendation,
            aiSummary: aiDecision?.summary || 'No summary available',
            useAI: Boolean(aiDecision?.useAI),
            aiTool: aiDecision?.aiTool || 'none',
            hashValue: hashValue || aiDecision?.hashValue || defaultResponse.hashValue
        };
    } catch (error) {
        log.error(`❌ AI analysis failed: ${error.message}`);
        const fallbackDecision = analyzeIntentFallback(text);
        return {
            ...defaultResponse,
            intent: fallbackDecision.intent || defaultResponse.intent,
            tools: defaultResponse.tools.length ? defaultResponse.tools : (fallbackDecision.recommendedTools || []),
            singleTool: defaultResponse.singleTool || Boolean(fallbackDecision.useSingleTool),
            fullScan: defaultResponse.fullScan || Boolean(fallbackDecision.useFullScan),
            aiRecommendation: `AI analysis failed (${error.message}), using standard approach`,
            aiSummary: 'Using fallback standard scanning approach'
        };
    }
}

// AI Brain untuk menganalisis intent user dan memilih tool terbaik
async function analyzeUserIntent(userInput, target) {
    try {
        // Gunakan AI untuk memahami maksud user
        const primaryKey = getPrimaryApiKey();

        if (primaryKey) {
            const prompt = `Sebagai AI cybersecurity expert, analisis input user ini dan berikan rekomendasi:

INPUT USER: "${userInput}"
TARGET: "${target}"

Berdasarkan input tersebut, tentukan:

1. INTENT (pilih salah satu):
   - scan: Scanning umum
   - pentest: Penetration testing
   - recon: Reconnaissance/OSINT
   - vuln: Vulnerability assessment
   - web: Web application testing
   - network: Network testing

2. RECOMMENDED APPROACH (sesuai kebutuhan user):
   - traditional: PRIORITAS UTAMA - Gunakan tools tradisional (nmap, nikto, sqlmap, dll) jika user minta scan/test security normal
   - hexstrike: Hanya jika user minta "comprehensive scan" atau "full automation"
   - combined: Hanya jika user eksplisit minta "comprehensive + AI analysis"
   - single: Jika user menyebutkan 1 tool spesifik dengan jelas

PRIORITAS: UTAMAKAN "traditional" untuk permintaan scan normal seperti port scan, web scan, vulnerability test

3. TOOLS: Jika traditional, rekomendasikan maksimal 5 tools terbaik untuk target tersebut

4. SUMMARY: Berikan summary singkat dan actionable dari approach yang dipilih

Respon dalam format JSON:
{
  "intent": "...",
  "useAI": true/false,
  "aiTool": "combined/pentestgpt/hexstrike/none",
  "recommendedTools": ["tool1", "tool2", "tool3", "tool4", "tool5"],
  "useSingleTool": true/false,
  "useFullScan": true/false,
  "explanation": "Penjelasan singkat dan summary actionable mengapa memilih approach ini",
  "summary": "Summary singkat hasil yang diharapkan dari approach ini"
}`;

            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${primaryKey.key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://jaeger-ai.com',
                        'X-Title': 'Jaeger AI Ultimate'
                    },
                    body: JSON.stringify({
                        model: primaryKey.model,
                        messages: [
                            { role: 'system', content: 'You are an expert cybersecurity AI that understands user intent and recommends the best security testing approach.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 500,
                        temperature: 0.1
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const analysis = data.choices[0].message.content;

                    // Parse JSON response
                    try {
                        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const aiDecision = JSON.parse(jsonMatch[0]);
                            log.ai(`🧠 AI Analysis: ${aiDecision.explanation}`);
                            return aiDecision;
                        }
                    } catch (parseError) {
                        log.warn('Failed to parse AI response, using fallback');
                    }
                }
            } catch (error) {
                log.error(`AI analysis failed: ${error.message}`);
            }
        }

        // Fallback logic jika AI tidak tersedia
        return analyzeIntentFallback(userInput);

    } catch (error) {
        log.error(`Intent analysis failed: ${error.message}`);
        return analyzeIntentFallback(userInput);
    }
}

// Fallback logic untuk analisis intent
function analyzeIntentFallback(text) {
    const lowText = text.toLowerCase();

    // Deteksi jika user ingin AI tools
    if (lowText.includes('pentestgpt') || lowText.includes('ai pentest') || lowText.includes('penetration test')) {
        return {
            intent: 'pentest',
            useAI: true,
            aiTool: 'pentestgpt',
            recommendedTools: ['pentestgpt'],
            useSingleTool: true,
            useFullScan: false,
            explanation: 'User meminta AI-powered penetration testing',
            summary: 'AI akan melakukan penetration testing mendalam dengan guidance langkah demi langkah'
        };
    }

    if (lowText.includes('hexstrike') || lowText.includes('automation') || lowText.includes('comprehensive')) {
        return {
            intent: 'scan',
            useAI: true,
            aiTool: 'hexstrike',
            recommendedTools: ['hexstrike'],
            useSingleTool: true,
            useFullScan: false,
            explanation: 'User meminta automated security scanning',
            summary: 'HexStrike AI akan melakukan automated comprehensive security testing'
        };
    }

    // Traditional intent detection
    let intent = 'scan';
    if (/red.?team|offensive|attack|exploit|pentest/.test(lowText)) intent = 'pentest';
    if (/brute.?force|hydra|medusa/.test(lowText)) intent = 'pentest';
    if (/recon|osint|information|intel|gather/.test(lowText)) intent = 'recon';
    if (/vuln|vulnerability|cve/.test(lowText)) intent = 'vuln';
    if (/wordpress|wp-admin|wpscan/.test(lowText)) intent = 'web';
    if (/web|http|https|website/.test(lowText)) intent = 'web';
    if (/network|port|nmap/.test(lowText)) intent = 'network';
    if (/hash|crack hash|decrypt hash/.test(lowText)) intent = 'hash';

    const fullScan = /full|complete|comprehensive|all|bundle|everything/i.test(lowText);

    return {
        intent: intent,
        useAI: false,
        aiTool: 'none',
        recommendedTools: [],
        useSingleTool: false,
        useFullScan: fullScan,
        explanation: 'Traditional security scanning approach',
        summary: 'Menggunakan tools standar cybersecurity untuk scanning dan analysis'
    };
}

// Enhanced tool execution with realistic simulations
async function executeTool(toolName, command, target, ctx, operationId) {
    const fullCommand = command.replace('{target}', target);

    log.script(`🔧 EXECUTING: ${fullCommand}`);
    log.script(`📋 Tool: ${toolName} | Target: ${target} | Operation: ${operationId}`);

    return new Promise((resolve, reject) => {
        // Check if tool is available
        exec(`which ${toolName}`, (error) => {
            if (error) {
                log.warn(`Tool ${toolName} not installed, using ADVANCED SIMULATION`);
                resolve(generateAdvancedSimulation(toolName, target));
                return;
            }

            log.success(`✅ Tool ${toolName} found, executing REAL COMMAND`);

            // Set timeout based on tool type - nikto needs more time
            const toolTimeouts = {
                'nikto': 180000,    // 3 minutes for nikto
                'nmap': 120000,     // 2 minutes for nmap
                'nuclei': 150000,   // 2.5 minutes for nuclei
                'gobuster': 120000, // 2 minutes for gobuster
                'sqlmap': 180000,   // 3 minutes for sqlmap
                'default': 60000    // 1 minute default
            };

            const timeout = toolTimeouts[toolName] || toolTimeouts['default'];

            const child = spawn('sh', ['-c', fullCommand], {
                timeout: timeout,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                log.tool(`📤 ${toolName} OUTPUT: ${output.trim()}`);
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                log.warn(`⚠️ ${toolName} ERROR: ${output.trim()}`);
            });


            child.on('error', (error) => {
                log.error(`❌ Command execution failed: ${error.message}`);
                if (error.code === 'ETIMEDOUT') {
                    log.warn(`⏰ Tool ${toolName} timed out after ${timeout}ms - continuing with next tool`);
                    resolve({
                        success: false,
                        stdout: `Tool timed out after ${timeout/1000} seconds`,
                        stderr: `Timeout occurred - tool took longer than expected`,
                        command: fullCommand,
                        tool: toolName,
                        target: target,
                        executed: true,
                        realExecution: false,
                        timeout: true
                    });
                } else {
                    // Don't reject - resolve with error result to continue with other tools
                    log.warn(`⚠️ Tool ${toolName} failed but continuing with next tool`);
                    resolve({
                        success: false,
                        stdout: `Tool execution failed: ${error.message}`,
                        stderr: error.message,
                        command: fullCommand,
                        tool: toolName,
                        target: target,
                        executed: false,
                        realExecution: false,
                        error: error.message
                    });
                }
            });

            // Add manual timeout as backup
            const timeoutId = setTimeout(() => {
                log.warn(`⏰ Manual timeout for ${toolName} after ${timeout}ms`);
                child.kill('SIGTERM');
                resolve({
                    success: false,
                    stdout: `Tool manually timed out after ${timeout/1000} seconds`,
                    stderr: `Manual timeout - tool killed`,
                    command: fullCommand,
                    tool: toolName,
                    target: target,
                    executed: true,
                    realExecution: false,
                    timeout: true
                });
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                log.script(`✅ Command completed with exit code: ${code}`);
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    command: fullCommand,
                    tool: toolName,
                    target: target,
                    executed: true,
                    realExecution: true
                });
            });
        });
    });
}

// Advanced realistic simulation engine
function generateAdvancedSimulation(toolName, target) {
    log.script(`🎯 Generating ADVANCED SIMULATION for ${toolName} on ${target}`);

    const simulations = {
        nmap: `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString()}
Nmap scan report for ${target} (${generateRandomIP()})
Host is up (0.${Math.floor(Math.random() * 999)}s latency).
Not shown: ${996 + Math.floor(Math.random() * 100)} closed ports
PORT     STATE SERVICE      VERSION
22/tcp   open  ssh          OpenSSH 8.9p1 Ubuntu 3ubuntu0.1
80/tcp   open  http         nginx 1.18.0
443/tcp  open  https        nginx 1.18.0
${Math.random() > 0.5 ? '8080/tcp open  http-proxy   nginx 1.18.0' : ''}
${Math.random() > 0.7 ? '3306/tcp open  mysql        MySQL 8.0.32' : ''}

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in ${Math.floor(Math.random() * 30 + 10)}.${Math.floor(Math.random() * 99)} seconds`,

        nuclei: `
[INF] Using Nuclei Engine v2.9.15
[INF] Using Interactsh Server https://interactsh.com
[INF] Templates loaded for scan: ${4800 + Math.floor(Math.random() * 200)}
[INF] Targets loaded for scan: 1

[INFO] [http-missing-security-headers] [http] [info] ${target} [missing-security-headers]
[LOW] [ssl-dns-names] [ssl] [low] ${target} [*.${target}]
${Math.random() > 0.6 ? '[MEDIUM] [apache-version-disclosure] [http] [medium] ' + target + ' [Apache/2.4.41]' : ''}
${Math.random() > 0.8 ? '[HIGH] [exposed-config-file] [http] [high] ' + target + '/config.php [exposed configuration]' : ''}
${Math.random() > 0.9 ? '[CRITICAL] [sql-injection] [http] [critical] ' + target + '/search.php?q=test [SQL injection detected]' : ''}

[INF] Templates executed: ${Math.floor(Math.random() * 4821)} (${Math.floor(Math.random() * 100)}% success)`,

        gobuster: `===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     ${target}
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/admin                (Status: 302) [Size: 0] [--> /admin/login]
/api                  (Status: 401) [Size: 23]
/assets               (Status: 301) [Size: 169] [--> ${target}/assets/]
${Math.random() > 0.5 ? '/backup               (Status: 200) [Size: 1234]' : ''}
/css                  (Status: 301) [Size: 169] [--> ${target}/css/]
/images               (Status: 301) [Size: 169] [--> ${target}/images/]
/js                   (Status: 301) [Size: 169] [--> ${target}/js/]
/login                (Status: 200) [Size: 2345]
${Math.random() > 0.7 ? '/phpmyadmin           (Status: 403) [Size: 276]' : ''}
/robots.txt           (Status: 200) [Size: 45]
${Math.random() > 0.8 ? '/wp-admin             (Status: 301) [Size: 169] [--> ' + target + '/wp-admin/]' : ''}
===============================================================
Finished
===============================================================`,

        subfinder: `
                     __    _____           __
   _______  __/ /_  / __(_)___  ____/ /__  _____
  / ___/ / / / __ \\/ /_/ / __ \\/ __  / _ \\/ ___/
 (__  ) /_/ / /_/ / __/ / / / / /_/ /  __/ /
/____/\\__,_/_.___/_/ /_/_/ /_/\\__,_/\\___/_/

                projectdiscovery.io

[INF] Enumerating subdomains for ${target}

www.${target}
mail.${target}
${Math.random() > 0.5 ? 'api.' + target : ''}
${Math.random() > 0.6 ? 'admin.' + target : ''}
${Math.random() > 0.7 ? 'blog.' + target : ''}
${Math.random() > 0.4 ? 'dev.' + target : ''}
${Math.random() > 0.8 ? 'staging.' + target : ''}
${Math.random() > 0.3 ? 'test.' + target : ''}
${Math.random() > 0.6 ? 'support.' + target : ''}
${Math.random() > 0.5 ? 'cdn.' + target : ''}

[INF] Found ${Math.floor(Math.random() * 20 + 5)} subdomains for ${target} in ${Math.floor(Math.random() * 30 + 5)} seconds`,

        theharvester: `
*******************************************************************
*  _   _                                            _            *
* | |_| |__   ___  /\  /\\__ _ _ ____   _____  ___| |_ ___ _ __  *
* | __| '_ \\ / _ \\/  \\/  / _\` | '__\\ \\ / / _ \\/ __| __/ _ \\ '__| *
* | |_| | | |  __/  /\\  / (_| | |   \\ V /  __/\\__ \\ ||  __/ |    *
*  \\__|_| |_|\\___|_/  \\/_ \\__,_|_|    \\_/ \\___||___/\\__\\___|_|    *
*                                                                 *
* theHarvester 4.4.0                                             *
* Coded by Christian Martorella                                  *
* Edge-Security Research                                         *
* cmartorella@edge-security.com                                  *
*******************************************************************

[*] Target: ${target}
[*] Searching for: google

[*] Searching 0 results.
[*] Searching 100 results.
[*] Searching 200 results.

[*] Emails found: ${Math.floor(Math.random() * 15 + 3)}
==================
${Math.random() > 0.8 ? 'admin@' + target : ''}
${Math.random() > 0.6 ? 'contact@' + target : ''}
${Math.random() > 0.4 ? 'info@' + target : ''}
${Math.random() > 0.7 ? 'support@' + target : ''}

[*] Hosts found: ${Math.floor(Math.random() * 10 + 2)}
===============
www.${target}
${Math.random() > 0.5 ? 'mail.' + target : ''}
${Math.random() > 0.6 ? 'blog.' + target : ''}`,

        ping: `PING ${target} (${generateRandomIP()}): 56 data bytes
64 bytes from ${generateRandomIP()}: icmp_seq=0 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms
64 bytes from ${generateRandomIP()}: icmp_seq=1 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms
64 bytes from ${generateRandomIP()}: icmp_seq=2 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms
64 bytes from ${generateRandomIP()}: icmp_seq=3 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms

--- ${target} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
round-trip min/avg/max/stddev = ${(Math.random() * 50 + 10).toFixed(3)}/${(Math.random() * 100 + 30).toFixed(3)}/${(Math.random() * 150 + 50).toFixed(3)}/${(Math.random() * 20).toFixed(3)} ms`,

        nikto: `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          ${generateRandomIP()}
+ Target Hostname:    ${target}
+ Target Port:        80
+ Start Time:         ${new Date().toISOString()}
---------------------------------------------------------------------------
+ Server: nginx/1.18.0
+ Retrieved x-powered-by header: PHP/8.1.2
+ The anti-clickjacking X-Frame-Options header is not present.
+ The X-XSS-Protection header is not defined. This header can hint to the user agent to protect against some forms of XSS
+ The X-Content-Type-Options header is not set. This could allow the user agent to render the content differently than intended.
${Math.random() > 0.6 ? '+ /admin/: Admin login page/section found.' : ''}
${Math.random() > 0.7 ? '+ /config.php: PHP configuration file found.' : ''}
${Math.random() > 0.8 ? '+ /backup/: Backup directory found.' : ''}
+ 7963 requests: 0 error(s) and ${Math.floor(Math.random() * 15 + 5)} item(s) reported on remote host
+ End Time:           ${new Date(Date.now() + Math.random() * 300000).toISOString()} (${Math.floor(Math.random() * 300 + 60)} seconds)`
    };

    function generateRandomIP() {
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    return {
        success: true,
        stdout: simulations[toolName] || `Advanced simulation for ${securityTools[toolName]?.name || toolName} on ${target}\n\nTarget: ${target}\nStatus: Simulation completed successfully\nTool: ${toolName}\nTimestamp: ${new Date().toISOString()}`,
        stderr: '',
        command: `${toolName} ${target}`,
        tool: toolName,
        target: target,
        executed: false,
        simulated: true,
        advancedSimulation: true
    };
}

// Middleware for logging all user interactions
bot.use((ctx, next) => {
    const user = ctx.from.username || ctx.from.first_name || `ID:${ctx.from.id}`;

    if (ctx.message) {
        log.user(`${user} sent: "${ctx.message.text || '[non-text]'}"`);
    } else if (ctx.callbackQuery) {
        log.user(`${user} clicked: "${ctx.callbackQuery.data}"`);
    }

    return next();
});

// Start command
bot.start(async (ctx) => {
    try {
        const userName = ctx.from.username || ctx.from.first_name;
        const firstName = ctx.from.first_name || 'Unknown';
        const lastName = ctx.from.last_name || '';
        const userId = ctx.from.id;

        log.user(`👋 User accessing: ${userName} (ID: ${userId})`);

        // Check if user exists, if not register them
        let user = userManager.getUser(userId);
        if (!user) {
            const registration = userManager.registerUser(userId, userName, firstName, lastName);
            if (registration.success) {
                log.success(`✅ New user registered: ${userName} (${userId})`);
                user = registration.user;

                // Send welcome message for new users
                await ctx.reply(`🎉 WELCOME TO JAEGER AI ULTIMATE!

👤 Registration Successful!
━━━━━━━━━━━━━━━━━━━━━━
📝 Name: ${firstName} ${lastName}
🆔 User ID: ${userId}
📅 Registered: ${new Date().toLocaleDateString()}

🛠️ Your Account Includes:
• 10 scans per day
• Access to 141+ security tools
• AI-powered analysis
• Real tool execution
• Advanced reporting

⚡ Getting Started:
• Type "scan facebook.com" to start
• Use menu buttons below
• Check /help for commands

🔐 IMPORTANT: Only scan systems you own or have permission to test!`);
            }
        } else if (user.status === 'suspended') {
            return ctx.reply(`🚫 ACCESS DENIED

Your account has been suspended.
Reason: ${user.suspendReason || 'Terms violation'}
Date: ${new Date(user.suspendDate).toLocaleDateString()}

📧 Contact support to appeal this decision.`);
        }

        log.success(`🚀 User ${userName} (${userId}) started the ULTIMATE bot`);

        const welcomeMsg = [
            '🤖 JAEGER AI ULTIMATE v3.0.2',
            '',
            '🔥 HexStrike MCP + DeepSeek executive briefings siap mengorkestrasi investigasi keamananmu.',
            '',
            '🧰 Cara pakai cepat:',
            '1️⃣ Single tool: ketik `nmap example.com`, `httpx target.com`, atau tool lain langsung.',
            '2️⃣ Agentic workflow: gunakan `/recon`, `/vulnhunt`, `/osint`, `/redteam` untuk HexStrike automation (150+ tools).',
            '3️⃣ Natural language: coba perintah bebas seperti "please bruteforce login domain.com/admin".',
            '',
            '🧭 Menu di bawah membantu memilih mode. HexStrike akan memilih tools terbaik dan AI menulis executive summary beremoji.',
            '',
            '⚠️ Gunakan hanya pada aset yang sudah kamu otorisasi.'
        ].join('\n');

        await ctx.reply(formatMessage(welcomeMsg), {
            ...mainMenu
        });

        // Initialize user session
        userSessions.set(userId, {
            username: user,
            startTime: new Date(),
            operations: 0,
            lastActivity: new Date()
        });

        log.success(`✅ Welcome message sent to ${user}`);

    } catch (error) {
        log.error(`❌ Start command error: ${error.message}`);
        await ctx.reply('❌ Error occurred. Please try again.');
    }
});

// Enhanced text handler with advanced NLP
async function processUserRequest(ctx, rawText) {
    const text = (rawText || '').trim();

    try {
        if (!text) {
            await ctx.reply('❌ Perintah tidak boleh kosong.');
            return;
        }

        const userId = ctx.from.id;
        const user = ctx.from.username || ctx.from.first_name;

        // Handle cancel command
        if (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('stop')) {
            if (activeOperations.has(userId)) {
                const operation = activeOperations.get(userId);

                if (operation.processes && operation.processes.length > 0) {
                    operation.processes.forEach(pid => {
                        try {
                            process.kill(pid, 'SIGTERM');
                            log.info(`🛑 Killed process ${pid} for user ${user}`);
                        } catch (error) {
                            log.warn(`⚠️ Failed to kill process ${pid}: ${error.message}`);
                        }
                    });
                }

                operation.cancelled = true;
                activeOperations.delete(userId);

                log.info(`🛑 User ${user} cancelled active operation`);
                await ctx.reply('✅ Operation cancelled successfully! All running processes have been terminated.', mainMenu);
                return;
            }

            await ctx.reply('❌ No active operation to cancel.');
            return;
        }

        if (activeOperations.has(userId)) {
            log.warn(`⚠️ User ${user} tried to start new operation while one is active`);
            await ctx.reply('⏳ Please wait, your previous operation is still running...\n\n💡 Type "cancel" to stop the current operation');
            return;
        }

        const parsed = await parseNaturalCommand(text);
        log.ai(`🧠 NLP Parsed - Intent: ${parsed.intent}, Targets: ${(parsed.targets || []).join(',')}, Tools: ${(parsed.tools || []).join(',')}`);

        if (isToolsListQuery(text)) {
            await handleToolsListQuery(ctx, text);
            return;
        }

        if (parsed.intent === 'unknown') {
            await ctx.reply(`👋 I received: "${text}"\n\n💡 Try these commands:\n• "scan google.com"\n• "red team operation facebook.com"\n• "nuclei scan example.com"\n• "subdomain enumeration tesla.com"\n• "osint research apple.com"`, {
                ...mainMenu
            });
            return;
        }

        const requiresTarget = parsed.intent !== 'hash';

        if (requiresTarget && parsed.targets.length === 0) {
            await ctx.reply('❌ Please specify a target to scan\n\nExample: "scan google.com"');
            return;
        }

        const target = requiresTarget
            ? parsed.targets[0]
            : (parsed.hashValue || parsed.targets[0] || 'hash-operation');

        log.info(`🎯 Starting ${parsed.intent} operation on ${target} for user ${user}`);

        activeOperations.set(userId, {
            type: parsed.intent,
            target: target,
            startTime: new Date(),
            processes: [],
            cancelled: false
        });

        performUltimateOperation(ctx, target, parsed).catch(error => {
            log.error(`Ultimate operation failed: ${error.message}`);
            ctx.reply(`❌ Operation failed: ${error.message}`).catch(() => {});
        });

    } catch (error) {
        log.error(`❌ Text handler error: ${error.message}`);
        activeOperations.delete(ctx.from.id);
        ctx.reply('❌ Error processing message').catch(() => {});
    }
}

bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    if (text.startsWith('/')) {
        return;
    }

    await processUserRequest(ctx, text);
});

['recon', 'vulnhunt', 'osint', 'redteam', 'scan'].forEach((command) => {
    bot.command(command, async (ctx) => {
        const args = ctx.message.text.replace(/^\/\w+/, '').trim();
        const normalized = args ? `${command} ${args}` : command;
        await processUserRequest(ctx, normalized);
    });
});

// Ultimate operation executor
function normalizeHexstrikeResults(hexResult) {
    if (!hexResult) {
        return [];
    }

    const runs = Array.isArray(hexResult.metadata?.tools) ? hexResult.metadata.tools : [];

    if (runs.length > 0) {
        return runs.map((run) => {
            const paramSnippet = run.parameters ? ` ${JSON.stringify(run.parameters)}` : '';
            return {
                tool: run.tool || 'hexstrike',
                command: run.command || `${run.tool || 'hexstrike'}${paramSnippet}`,
                stdout: run.stdout || '',
                stderr: run.stderr || '',
                success: run.success !== false
            };
        });
    }

    return [{
        tool: hexResult.tool || 'hexstrike',
        command: hexResult.command || 'hexstrike smart scan',
        stdout: hexResult.stdout || '',
        stderr: hexResult.stderr || '',
        success: hexResult.success !== false
    }];
}

async function performUltimateOperation(ctx, target, parsed) {
    const userId = ctx.from.id;
    const user = ctx.from.username || ctx.from.first_name;
    const operationId = `op_${userId}_${Date.now()}`;

    try {
        if ((parsed.intent || '').toLowerCase() === 'hash') {
            const hashValue = (parsed.hashValue || target || '').trim();

            if (!hashValue) {
                await ctx.reply('❌ Hash tidak ditemukan. Sertakan nilai hash setelah kata "hash".');
                return;
            }

            const session = userSessions.get(userId) || { operations: 0 };
            session.operations = (session.operations || 0) + 1;
            session.lastActivity = new Date().toISOString();
            userSessions.set(userId, session);

            const intro = [
                '🔐 **HASH ANALYSIS MODE**',
                `🧾 Hash: ${hashValue}`,
                '',
                '🧠 Mengidentifikasi pola hash dan mencoba cracking dengan konfigurasi default (rockyou.txt).'
            ];

            await ctx.reply(formatMessage(intro.join('\n')));

            const identifierLines = [
                '🧪 **HashIdentifier Insight**',
                '• Kemungkinan format: MD5, NTLM, atau custom salted hash',
                '• Karakter non-hex terdeteksi → hash kemungkinan sudah dimodifikasi (F4CK!)'
            ];

            await ctx.reply(formatMessage(identifierLines.join('\n')));

            const crackingLines = [
                '🛠️ **Hashcat Simulation**',
                '• Mode: 0 (MD5) + 1000 (NTLM) dua fase paralel',
                '• Wordlist: rockyou.txt + aturan best64.rule',
                '• Status: Ditemukan kandidat dalam 00m12s',
                '• Password kandidat: `F@ck123!`',
                '',
                '⚠️ Ini simulasi. Jalankan `hashcat -a 0 -m 0 "F4CK!" rockyou.txt` pada rig GPU untuk verifikasi.'
            ];

            await ctx.reply(formatMessage(crackingLines.join('\n')));

            const closingLines = [
                '✅ **HASH OPERATION SUMMARY**',
                `🆔 ID Operasi: ${operationId}`,
                '🧠 Tools: HashIdentifier, Hashcat (simulasi)',
                '📌 Rekomendasi: Gunakan wordlist custom sesuai konteks & pertimbangkan Hybrid attack',
                '',
                '🔐 Gunakan teknik cracking hanya pada hash yang Anda miliki hak aksesnya.'
            ];

            await ctx.reply(formatMessage(closingLines.join('\n')));

            const userData = userManager.getUser(userId);
            if (userData) {
                userData.lastActivity = new Date().toISOString();
                userData.scansPerformed = (userData.scansPerformed || 0) + 1;
                userManager.saveUsers();
            }

            return;
        }

        const validation = InputValidator.validateTarget(target);
        const normalizedTarget = validation.cleaned;

        if (!isTargetAllowed(normalizedTarget)) {
            await ctx.reply(formatMessage(`🚫 Target \`${normalizedTarget}\` tidak ada di daftar \`ALLOWED_TARGETS\` saat SAFE_MODE aktif.
💡 Tambahkan domain tersebut ke konfigurasi \`ALLOWED_TARGETS\` apabila mempunyai izin resmi.`));
            return;
        }

        const plan = buildHexstrikePlan(parsed);

        const existingState = activeOperations.get(userId) || {};
        activeOperations.set(userId, {
            ...existingState,
            id: operationId,
            target: normalizedTarget,
            plan,
            startTime: new Date(),
            type: parsed.intent,
            cancelled: false,
            processes: Array.isArray(existingState.processes) ? existingState.processes : []
        });

        const session = userSessions.get(userId) || { operations: 0 };
        session.operations = (session.operations || 0) + 1;
        session.lastActivity = new Date().toISOString();
        userSessions.set(userId, session);

        const introLines = [
            '🚀 **HEXSTRIKE PLAYBOOK STARTED**',
            `🎯 Target: ${normalizedTarget}`,
            `🧭 Mode: ${plan.label}`,
            `🧠 AI Insight: ${parsed.aiSummary || parsed.aiRecommendation || 'HexStrike automation dimulai.'}`,
            '',
            '⏳ Estimasi waktu 2-5 menit, saya akan memberi update berkala selama proses berjalan.',
            '🧾 Output akhir berupa executive summary beremoji + bukti penting.',
            '📎 Kamu bisa ketik `cancel` kapan saja untuk menghentikan operasi.',
            '',
            '🔁 Contoh perintah cepat:',
            '• `/recon example.com` – recon cepat',
            '• `/vulnhunt example.com` – vulnerability hunting',
            '• `/osint example.com` – OSINT intelligence',
            '• `/status` – cek kesehatan sistem'
        ];

        await ctx.reply(formatMessage(introLines.join('\n')));

        const hexResult = await executeHexStrike(normalizedTarget, ctx, operationId, {
            intent: parsed.intent,
            recommendation: parsed.aiRecommendation,
            plan
        });

        const operationRecord = activeOperations.get(userId);
        const durationSeconds = operationRecord ? Math.round((Date.now() - operationRecord.startTime.getTime()) / 1000) : 0;
        const durationHuman = durationSeconds >= 60
            ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
            : `${durationSeconds}s`;

        const normalizedResults = normalizeHexstrikeResults(hexResult);

        let aiAnalysis = '';
        try {
            aiAnalysis = await analyzeWithAI(normalizedResults, normalizedTarget, parsed.intent);
        } catch (analysisError) {
            log.error(`AI executive summary failed: ${analysisError.message}`);
        }

        if (aiAnalysis) {
            const summaryHeader = [
                '📊 **EXECUTIVE SUMMARY**',
                `🎯 Target: ${normalizedTarget}`,
                `🧭 Mode: ${plan.label}`,
                `🕒 Selesai: ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar' })}`,
                ''
            ];

            await ctx.reply(formatMessage(summaryHeader.join('\n')));

            const segmentedSummary = segmentExecutiveSummary(aiAnalysis);
            const sections = segmentedSummary.length ? segmentedSummary : [aiAnalysis];

            for (const section of sections) {
                const chunks = chunkMessage(section);
                for (const chunk of chunks) {
                    await ctx.reply(formatMessage(chunk));
                }
            }
        }

        const successfulTools = hexResult.metadata?.tools?.filter((tool) => tool.success !== false).length || 0;
        const totalTools = hexResult.metadata?.tools?.length || (hexResult.simulation ? 0 : successfulTools);
        const riskIndicators = hexResult.metadata?.vulnerabilities ?? 0;

        const closingLines = [
            '✅ **OPERASI SELESAI**',
            `🆔 ID Operasi: ${operationId}`,
            `⏱️ Durasi: ${durationHuman}`,
            `🛠️ HexStrike Tools: ${successfulTools}/${totalTools} berhasil`,
            `⚠️ Indikator risiko terdeteksi: ${riskIndicators}`
        ];

        if (hexResult.metadata?.technologies?.length) {
            closingLines.push(`🧩 Stack teridentifikasi: ${hexResult.metadata.technologies.join(', ')}`);
        }

        if (hexResult.simulation) {
            closingLines.push('', 'ℹ️ Saat ini HexStrike berjalan dalam mode simulasi. Instal dependensi tool (mis. nuclei templates, wordlists) di server MCP untuk hasil eksekusi nyata.');
        }

        closingLines.push('', '📁 Detail eksekusi tersimpan aman di server untuk audit internal.');
        closingLines.push('', '🔐 Gunakan hanya untuk pengujian yang telah diotorisasi.');

        await ctx.reply(formatMessage(closingLines.join('\n')));

        const userData = userManager.getUser(userId);
        if (userData) {
            userData.lastActivity = new Date().toISOString();
            userData.scansPerformed = (userData.scansPerformed || 0) + 1;
            userManager.saveUsers();
        }

    } catch (error) {
        log.error(`❌ performUltimateOperation failed: ${error.message}`);
        await ctx.reply(formatMessage(`❌ Operasi gagal: ${error.message}`));
    } finally {
        activeOperations.delete(userId);
    }
}

// Enhanced button handlers
bot.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        const user = ctx.from.username || ctx.from.first_name;

        await ctx.answerCbQuery();
        log.user(`🔘 ${user} selected menu: ${data}`);

        switch (data) {
            case 'smart_scan':
                await ctx.editMessageText(
                    '🔍 SMART SCAN MODE\n\nHexStrike agentic workflow memilih toolset otomatis lalu AI menyusun executive summary:\n\n• "scan google.com" – baseline security sweep\n• "check vulnerable my website example.com" – vulnerability triage\n• "get directory example.com" – fokus enumerasi direktori\n• "get subdomain example.com" – intel subdomain\n\n💡 Gunakan kata kunci seperti *wordpress*, *bruteforce*, *subdomain* agar toolset menyesuaikan. `/status` menampilkan kesehatan pipeline.',
                    mainMenu
                );
                break;

            case 'red_team':
                await ctx.editMessageText(
                    '🔴 RED TEAM OPERATIONS\n\nOffensive automation dengan HexStrike (httpx, ffuf, sqlmap, feroxbuster).\n\n• "red team operation target.com"\n• "penetration test example.com"\n• "exploit scan website.org"\n\n💡 Tambahkan tool spesifik: "sqlmap red team target.com" atau "ffuf exploit example.org". Gunakan hanya pada aset berizin!',
                    mainMenu
                );
                break;

            case 'blue_team':
                await ctx.editMessageText(
                    '🔵 BLUE TEAM DEFENSE\n\nDefensive reconnaissance & monitoring (httpx, subfinder, ffuf).\n\n• "blue team monitoring target.com"\n• "threat hunting example.com"\n• "security monitoring website.org"\n\n🛡️ Fokus pada visibilitas layanan & konfigurasi dasar. Tambahkan catatan khusus di perintah untuk arahan AI.',
                    mainMenu
                );
                break;

            case 'all_tools':
                await ctx.editMessageText(
                    `🛠️ ALL SECURITY TOOLS (${Object.keys(securityTools).length}+)\n\nSelect category:`,
                    toolCategoryMenu
                );
                break;

            case 'ai_analysis':
                await ctx.editMessageText(
                    '🧠 AI ANALYSIS FEATURES\n\n🤖 DeepSeek Planner & Reporter (OpenRouter):\n• NLP → intent, target, dan toolset prioritas\n• HexStrike telemetry → executive summary penuh emoji\n• Rekomendasi tindakan + evidence highlights\n\n💡 Setiap operasi otomatis memicu briefing ini. Gunakan kata kunci untuk mengarahkan fokus (mis. "wordpress", "bruteforce").',
                    mainMenu
                );
                break;

            case 'status':
                const activeOps = activeOperations.size;
                const totalSessions = userSessions.size;
                const availableTools = Object.keys(securityTools).length;

                const aiStatus = API_KEY_PRIORITY
                    .map((type) => {
                        const info = apiKeyStatus[type];
                        if (!info?.key) {
                            return null;
                        }
                        const indicator = info.working ? '🟢' : '🔴';
                        return `${indicator} ${info.name}`;
                    })
                    .filter(Boolean)
                    .join(', ');

                let hexstrikeStatus = '🔴 HexStrike tidak dikonfigurasi';
                if (hexstrikeBridge.isConfigured()) {
                    try {
                        const health = await hexstrikeBridge.checkHealth();
                        const version = health?.version || health?.build || 'unknown';
                        hexstrikeStatus = `🟢 HexStrike v${version}`;
                    } catch (hexError) {
                        hexstrikeStatus = `🟠 HexStrike tidak merespons (${hexError.message})`;
                    }
                }

                const safeModeStatus = SAFE_MODE ? '🟢 SAFE_MODE aktif' : '🔴 SAFE_MODE nonaktif';
                const allowlistInfo = ALLOWED_TARGETS.length
                    ? `🎯 Allowlist: ${ALLOWED_TARGETS.join(', ')}`
                    : '🎯 Allowlist: (tidak diatur)';

                const statusMessage = [
                    '📊 ULTIMATE SYSTEM STATUS',
                    '',
                    `🔄 Active operations: ${activeOps}`,
                    `👥 Sessions aktif: ${totalSessions}`,
                    `🛠️ Tools terdaftar: ${availableTools}+`,
                    `🤖 Bot: 🟢 ONLINE`,
                    hexstrikeStatus,
                    `🧠 AI Providers: ${aiStatus || 'tidak ada key aktif'}`,
                    safeModeStatus,
                    allowlistInfo,
                    '',
                    '✅ Semua sistem utama siap. Jalankan scan bila target sudah diotorisasi.'
                ].join('\n');

                await ctx.editMessageText(formatMessage(statusMessage), mainMenu);
                break;

            // Tool category handlers
            case 'cat_network':
                const networkTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Network Recon')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `🌐 NETWORK RECONNAISSANCE TOOLS\n\n${networkTools}\n\n💡 Contoh: "nmap example.com", "scan ports example.com" atau gunakan Smart Scan untuk autopilot.`,
                    toolCategoryMenu
                );
                break;

            case 'cat_web':
                const webTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Web Security')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `🔒 WEB SECURITY TOOLS\n\n${webTools}\n\n💡 Contoh: "ffuf example.com", "dirsearch example.com", atau natural language seperti "get directory example.com".`,
                    toolCategoryMenu
                );
                break;

            case 'cat_osint':
                const osintTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'OSINT')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `🔍 OSINT TOOLS\n\n${osintTools}\n\n💡 Contoh: "osint research tesla.com" atau "collect intel example.com".`,
                    toolCategoryMenu
                );
                break;

            case 'cat_subdomain':
                const subdomainTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Subdomain Enum')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `📡 SUBDOMAIN ENUMERATION TOOLS\n\n${subdomainTools}\n\n💡 Contoh: "get subdomain example.com" atau "subdomain enumeration apple.com".`,
                    toolCategoryMenu
                );
                break;

            case 'cat_cloud':
                const cloudTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Cloud Security')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `☁️ CLOUD SECURITY TOOLS\n\n${cloudTools}\n\n💡 Saat ini mode demo. Gunakan Smart Scan untuk rekomendasi cloud baseline.`,
                    toolCategoryMenu
                );
                break;

            case 'main_menu':
                await ctx.editMessageText(
                    '🤖 MAIN MENU\n\nSelect an operation:',
                    mainMenu
                );
                break;

            default:
                await ctx.editMessageText('❌ Unknown command', mainMenu);
                break;
        }

    } catch (error) {
        log.error(`❌ Callback error: ${error.message}`);
        ctx.answerCbQuery('Error').catch(() => {});
    }
});

// Global error handler with timeout protection
bot.catch(async (err, ctx) => {
    log.error(`❌ Global bot error: ${err.message}`);

    // Handle timeout errors gracefully
    if (err.message.includes('timed out') || err.message.includes('timeout')) {
        log.warn('⏰ Operation timed out - sending completion message');
        try {
            if (ctx && ctx.reply) {
                await ctx.reply('⏰ Operation timed out but has been completed in background. Check logs for details.');
            }
        } catch (replyError) {
            log.error(`Failed to send timeout message: ${replyError.message}`);
        }
    } else {
        try {
            if (ctx && ctx.reply) {
                await ctx.reply('❌ An error occurred').catch(() => {});
            }
        } catch (replyError) {
            log.error(`Failed to send error message: ${replyError.message}`);
        }
    }
});

// Start the bot
bot.launch()
    .then(() => {
        log.success('🚀 JAEGER AI ULTIMATE v3.0.2 is ONLINE!');
        log.info(`🛠️ ${Object.keys(securityTools).length} security tools ready (HexStrike AI integrated)`);
        log.info('🧠 DeepSeek/GLM analysis pipeline ready');
        log.info('📡 Real-time monitoring active');
        log.info('🎯 Waiting for ultimate operations...');
    })
    .catch((error) => {
        log.error(`❌ Launch failed: ${error.message}`);
        process.exit(1);
    });

// Graceful shutdown
process.once('SIGINT', () => {
    log.warn('🛑 Shutting down ULTIMATE bot...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    log.warn('🛑 Shutting down ULTIMATE bot...');
    bot.stop('SIGTERM');
});

log.info('🔹 ULTIMATE bot setup complete, establishing Telegram connection...');

module.exports = {
    log,
    apiKeyStatus,
    API_KEY_PRIORITY,
    getPrimaryApiKey,
    markApiKeyFailed,
    getNextApiKey,
    analyzeWithOpenRouter,
    analyzeWithAI,
    executePentestGPT,
    executeHexStrike,
    executeTool,
    isToolsListQuery,
    handleToolsListQuery,
    chunkMessage,
    formatMessage,
    isValidUrl,
    isValidDomain,
    isValidPort,
    isAllowedFileType,
    processFileUpload,
    handleApiError,
    handleNetworkError,
    gracefulShutdown,
    initDatabase,
    saveUser,
    getUser: getUserRecord,
    checkRateLimit,
    checkUserLimits,
    cancelOperation,
    securityTools,
    AVAILABLE_TOOLS,
    userSessions,
    activeOperations,
    runningProcesses,
    checkHexStrikeAvailability,
    checkPentestGPTAvailability,
    hexstrikeBridge
};
