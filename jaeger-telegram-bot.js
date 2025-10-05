#!/usr/bin/env node

/**
 * JAEGER AI - Telegram Bot for Penetration Testing
 *
 * Grand Design:
 * 1. HexStrike AI (150+ tools, MCP Intelligence Engine) - Core
 * 2. LLM (DeepSeek/Chimera/Z AI) - Analysis & Interface
 * 3. Telegram Bot - User Interface
 *
 * Flow:
 * User Request → Telegram Bot → LLM Analyze Request → HexStrike Intelligence API
 * → Auto Tool Selection & Execution → LLM Analyze Results → Telegram Bot Response
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const HexStrikeIntelligence = require('./hexstrike-intelligence');
const LLMAnalyzer = require('./llm-analyzer');

// Initialize components
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const hexstrike = new HexStrikeIntelligence();
const llm = new LLMAnalyzer();

// Color codes for console
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m'
};

console.log(`${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   JAEGER AI - Penetration Testing Bot    ║${colors.reset}`);
console.log(`${colors.cyan}║   Powered by HexStrike Intelligence       ║${colors.reset}`);
console.log(`${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`);

// Active scans tracker
const activeScans = new Map();

/**
 * Start command - Welcome message
 */
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    const welcomeMessage = `
🤖 *Jaeger AI - Penetration Testing Assistant*

Saya adalah bot AI untuk security testing yang menggunakan HexStrike Intelligence Engine (150+ tools).

*🎯 Cara Penggunaan:*
Kirim perintah natural language, contoh:
• "scan ibnusaad.com"
• "reconnaissance telkom.co.id"
• "vulnerability hunting example.com"
• "osint target.com"
• "quick scan 192.168.1.1"

*🔧 Commands:*
/start - Tampilkan pesan ini
/help - Panduan lengkap
/status - Status HexStrike server
/tools - Daftar tools available

*⚡ Objective Options:*
• reconnaissance - Recon & subdomain enum
• vulnerability_hunting - Vuln scanning
• comprehensive - Full scan (all tools)
• quick - Fast scan (essential tools only)
• osint - OSINT & information gathering

Ready untuk membantu! 🚀
`;

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

/**
 * Help command
 */
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 *Jaeger AI - Help Guide*

*Natural Language Commands:*
Kirim perintah dalam bahasa natural, AI akan memahami intent Anda.

*Contoh Perintah:*
1️⃣ "scan google.com" → Comprehensive scan
2️⃣ "recon ibnusaad.com" → Reconnaissance only
3️⃣ "vuln hunting target.com" → Vulnerability scan
4️⃣ "quick scan example.com" → Fast scan
5️⃣ "osint target.com" → OSINT gathering

*Workflow Commands:*
• /recon <target> - Full reconnaissance workflow
• /vulnhunt <target> - Vulnerability hunting workflow
• /osint <target> - OSINT workflow
• /tech <target> - Technology detection

*Utility Commands:*
• /status - Check HexStrike server status
• /tools - List available tools
• /cancel - Cancel active scan

*🧠 AI Features:*
✅ Auto tool selection berdasarkan target type
✅ Smart parameter optimization
✅ Result analysis & reporting
✅ Natural language understanding

Pertanyaan? Kirim pesan Anda! 💬
`;

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

/**
 * Status command - Check HexStrike server
 */
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, '⏳ Checking HexStrike server status...');

    const health = await hexstrike.checkHealth();

    if (health.status === 'healthy') {
        const statusMsg = `
✅ *HexStrike Server Online*

🔧 Tools Available: ${health.tools_available || 'N/A'}
⏱️ Uptime: ${Math.floor((health.uptime || 0) / 3600)}h ${Math.floor(((health.uptime || 0) % 3600) / 60)}m
📦 Version: ${health.version || 'N/A'}

Status: *READY* 🚀
`;
        bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ HexStrike server offline!\n\nError: ${health.error}`, { parse_mode: 'Markdown' });
    }
});

/**
 * Tools command - List available tools
 */
bot.onText(/\/tools/, async (msg) => {
    const chatId = msg.chat.id;

    const toolsMessage = `
🔧 *HexStrike Available Tools (60+)*

*Network Scanning:*
nmap, masscan, rustscan, zmap

*Web Security:*
nuclei, nikto, gobuster, ffuf, dirsearch, dirb, wpscan

*Vulnerability Testing:*
sqlmap, dalfox, wfuzz, httpx

*OSINT:*
subfinder, amass, theharvester, sherlock, spiderfoot

*Exploitation:*
metasploit, msfvenom, hydra, medusa

*Forensics:*
autopsy, binwalk, exiftool, foremost

*Password:*
hashcat, john, ophcrack

*Cloud Security:*
trivy, nxc

Dan 40+ tools lainnya!

Gunakan objective yang sesuai untuk auto-select tools optimal. 🎯
`;

    bot.sendMessage(chatId, toolsMessage, { parse_mode: 'Markdown' });
});

/**
 * Recon workflow command
 */
bot.onText(/\/recon (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1].trim();

    await executeWorkflow(chatId, target, 'reconnaissance');
});

/**
 * Vulnerability hunting workflow command
 */
bot.onText(/\/vulnhunt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1].trim();

    await executeWorkflow(chatId, target, 'vulnerability_hunting');
});

/**
 * OSINT workflow command
 */
bot.onText(/\/osint (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1].trim();

    await executeWorkflow(chatId, target, 'osint');
});

/**
 * Technology detection command
 */
bot.onText(/\/tech (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1].trim();

    bot.sendMessage(chatId, `🔬 Detecting technologies on ${target}...`);

    const result = await hexstrike.detectTechnology(target);

    if (result.success) {
        const techMsg = formatTechnologyResult(result);
        bot.sendMessage(chatId, techMsg, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ Technology detection failed: ${result.error}`);
    }
});

/**
 * Cancel command - Cancel active scan
 */
bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;

    if (activeScans.has(chatId)) {
        activeScans.delete(chatId);
        bot.sendMessage(chatId, '⛔ Scan cancelled!');
    } else {
        bot.sendMessage(chatId, 'No active scan to cancel.');
    }
});

/**
 * Main message handler - Natural language processing
 */
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands
    if (text.startsWith('/')) {
        return;
    }

    console.log(`${colors.blue}📨 Message from ${chatId}: ${text}${colors.reset}`);

    // Check if scan already running
    if (activeScans.has(chatId)) {
        bot.sendMessage(chatId, '⚠️ Scan already running! Use /cancel to stop it first.');
        return;
    }

    // Send initial response
    bot.sendMessage(chatId, '🧠 Analyzing your request with AI...');

    try {
        // Step 1: LLM analyze user request
        const analysis = await llm.analyzeUserRequest(text);

        if (!analysis.target || analysis.target === 'unknown') {
            bot.sendMessage(chatId, '❌ Could not extract target from your message.\n\nPlease specify a domain/IP, e.g., "scan example.com"');
            return;
        }

        // Send analysis confirmation
        const confirmMsg = `
✅ *Request Analyzed*

🎯 Target: \`${analysis.target}\`
📊 Objective: ${analysis.objective}
🔍 Analysis Type: ${analysis.analysis_type}
${analysis.specific_tools.length > 0 ? `🔧 Specific Tools: ${analysis.specific_tools.join(', ')}` : ''}

Starting ${analysis.objective} scan... ⏳
`;
        bot.sendMessage(chatId, confirmMsg, { parse_mode: 'Markdown' });

        // Mark scan as active
        activeScans.set(chatId, {
            target: analysis.target,
            startTime: Date.now()
        });

        // Step 2: Execute scan using HexStrike Intelligence
        let result;

        if (analysis.objective === 'reconnaissance') {
            result = await hexstrike.reconWorkflow(analysis.target);
        } else if (analysis.objective === 'vulnerability_hunting') {
            result = await hexstrike.vulnHuntingWorkflow(analysis.target);
        } else if (analysis.objective === 'osint') {
            result = await hexstrike.osintWorkflow(analysis.target);
        } else {
            // Use smart scan for other objectives
            result = await hexstrike.smartScan(
                analysis.target,
                analysis.objective,
                { specific_tools: analysis.specific_tools }
            );
        }

        // Remove from active scans
        activeScans.delete(chatId);

        // Step 3: LLM analyze results and generate report
        if (result.success) {
            bot.sendMessage(chatId, '🧠 Analyzing results with AI...');

            const report = await llm.analyzeScanResults(result, analysis.target);

            // Send report (split if too long)
            if (report.length > 4000) {
                const parts = splitMessage(report, 4000);
                for (const part of parts) {
                    await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
                }
            } else {
                bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
            }

            // Send raw data if requested
            if (text.toLowerCase().includes('detail') || text.toLowerCase().includes('raw')) {
                const rawData = `\`\`\`json\n${JSON.stringify(result, null, 2).substring(0, 3000)}\n\`\`\``;
                bot.sendMessage(chatId, rawData, { parse_mode: 'Markdown' });
            }
        } else {
            bot.sendMessage(chatId, `❌ Scan failed: ${result.error}`);
        }

    } catch (error) {
        console.error(`${colors.red}❌ Error processing message: ${error.message}${colors.reset}`);
        activeScans.delete(chatId);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

/**
 * Execute workflow helper
 */
async function executeWorkflow(chatId, target, workflowType) {
    bot.sendMessage(chatId, `🚀 Starting ${workflowType} workflow for ${target}...`);

    activeScans.set(chatId, {
        target: target,
        startTime: Date.now()
    });

    let result;

    if (workflowType === 'reconnaissance') {
        result = await hexstrike.reconWorkflow(target);
    } else if (workflowType === 'vulnerability_hunting') {
        result = await hexstrike.vulnHuntingWorkflow(target);
    } else if (workflowType === 'osint') {
        result = await hexstrike.osintWorkflow(target);
    }

    activeScans.delete(chatId);

    if (result.success) {
        bot.sendMessage(chatId, '🧠 Generating AI report...');

        const report = await llm.analyzeScanResults(result, target);

        if (report.length > 4000) {
            const parts = splitMessage(report, 4000);
            for (const part of parts) {
                await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
            }
        } else {
            bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
        }
    } else {
        bot.sendMessage(chatId, `❌ Workflow failed: ${result.error}`);
    }
}

/**
 * Format technology detection result
 */
function formatTechnologyResult(result) {
    let msg = `🔬 *Technology Detection Result*\n\n`;
    msg += `🎯 Target: ${result.target || 'N/A'}\n\n`;

    if (result.technologies && result.technologies.length > 0) {
        msg += `*Technologies Detected:*\n`;
        result.technologies.forEach(tech => {
            msg += `• ${tech}\n`;
        });
    } else {
        msg += `No specific technologies detected.\n`;
    }

    return msg;
}

/**
 * Split long message into chunks
 */
function splitMessage(text, maxLength = 4000) {
    const parts = [];
    let currentPart = '';

    const lines = text.split('\n');

    for (const line of lines) {
        if ((currentPart + line + '\n').length > maxLength) {
            parts.push(currentPart);
            currentPart = line + '\n';
        } else {
            currentPart += line + '\n';
        }
    }

    if (currentPart) {
        parts.push(currentPart);
    }

    return parts;
}

/**
 * Error handling
 */
bot.on('polling_error', (error) => {
    console.error(`${colors.red}❌ Polling error: ${error.message}${colors.reset}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`${colors.red}❌ Unhandled Rejection:${colors.reset}`, reason);
});

process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}⛔ Shutting down Jaeger AI...${colors.reset}`);
    bot.stopPolling();
    process.exit(0);
});

console.log(`${colors.green}✅ Jaeger AI Bot started successfully!${colors.reset}`);
console.log(`${colors.cyan}🔗 Ready to receive commands via Telegram...${colors.reset}\n`);
