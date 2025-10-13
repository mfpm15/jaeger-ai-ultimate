#!/usr/bin/env node

/**
 * JAEGER AI - Telegram Bot for Penetration Testing
 *
 * Grand Design:
 * 1. Jaeger AI (150+ tools, MCP Intelligence Engine) - Core
 * 2. LLM (DeepSeek/Chimera/Z AI) - Analysis & Interface
 * 3. Telegram Bot - User Interface
 *
 * Flow:
 * User Request → Telegram Bot → LLM Analyze Request → Jaeger Intelligence API
 * → Auto Tool Selection & Execution → LLM Analyze Results → Telegram Bot Response
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const JaegerIntelligence = require('./jaeger-intelligence');
const LLMAnalyzer = require('./llm-analyzer');

// Initialize components with improved polling and error resilience
const bot = new TelegramBot(process.env.BOT_TOKEN, {
    polling: {
        autoStart: true,
        interval: 2000, // Slower polling = more stable (2s)
        params: {
            timeout: 30, // Reduced timeout to prevent ECONNRESET
            allowed_updates: ['message', 'callback_query']
        }
    },
    request: {
        agentOptions: {
            keepAlive: true,
            keepAliveMsecs: 10000, // Reduced keep-alive time
            maxSockets: 1, // Limit concurrent connections
            maxFreeSockets: 1
        },
        timeout: 60000 // 60s timeout for requests
    },
    filepath: false // Disable file downloads
});
const jaeger = new JaegerIntelligence();
const llm = new LLMAnalyzer({
    geminiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    providerPriority: ['gemini', 'openrouter', 'deepseek', 'chimera', 'zai'],
    maxTokens: Number(process.env.LLM_MAX_TOKENS) || 8000
});

// Color codes for console
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m'
};

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([\\`*_\[\]()])/g, '\\$1');
}

function normalizeObjective(objective = '', analysisType = '') {
    const value = String(objective || analysisType || '').toLowerCase();

    if (['recon', 'reconnaissance', 'osint', 'quick'].includes(value)) {
        return 'quick';
    }

    if (['stealth', 'monitor', 'blueteam'].includes(value)) {
        return 'stealth';
    }

    if (['vulnerability_hunting', 'vuln', 'vulnerability', 'offensive', 'redteam'].includes(value)) {
        return 'comprehensive';
    }

    return value || 'comprehensive';
}

function determineMaxTools(objective, specificToolsCount, original = '') {
    if (specificToolsCount > 0) {
        return Math.min(Math.max(specificToolsCount, 1), 10);
    }

    const normalized = objective || '';
    const raw = (original || '').toLowerCase();

    if (raw === 'vulnerability_hunting') {
        return 10;
    }

    switch (normalized) {
        case 'quick':
            return 5;
        case 'stealth':
            return 4;
        case 'comprehensive':
            return 10;
        default:
            return 8;
    }
}

async function performHexstrikeAutomation({ chatId = null, target, objective, specificTools = [], analysisType }) {
    const normalizedObjective = normalizeObjective(objective, analysisType);
    const uniqueTools = Array.isArray(specificTools)
        ? Array.from(new Set(specificTools.map((tool) => String(tool).trim().toLowerCase()).filter(Boolean)))
        : [];

    const options = {
        max_tools: determineMaxTools(normalizedObjective, uniqueTools.length, objective || analysisType)
    };

    if (uniqueTools.length) {
        options.specific_tools = uniqueTools;
        options.max_tools = Math.min(uniqueTools.length, options.max_tools || uniqueTools.length);
    }

    const context = {
        objective: normalizedObjective,
        comprehensive: normalizedObjective === 'comprehensive',
        quick: normalizedObjective === 'quick',
        stealth: normalizedObjective === 'stealth',
        aggressive: normalizedObjective === 'comprehensive',
        prefer_faster_tools: normalizedObjective === 'quick',
        retry_on_timeout: true,
        use_cache: false,
        cache_result: false,
        request_timeout: 180
    };

    if (uniqueTools.length) {
        context.preferred_tools = uniqueTools;
    }

    if (Object.keys(context).length) {
        options.context = context;
    }

    const progressUpdates = [
        'Jaeger masih mengumpulkan data…',
        'Jaeger menjalankan tool lanjutan, mohon tunggu…',
        'Analisis AI akan dibuat setelah semua tool selesai…'
    ];

    let progressInterval = null;
    const startedAt = Date.now();
    let progressIndex = 0;

    if (chatId) {
        try {
            await bot.sendMessage(chatId, '⚙️ Jaeger automation berjalan. Update status akan dikirimkan setiap 60 detik.');
        } catch (error) {
            console.error(`${colors.red}❌ Initial progress message error: ${error.message}${colors.reset}`);
        }
        progressInterval = setInterval(async () => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const message = `${progressUpdates[progressIndex % progressUpdates.length]}\n⏱️ Waktu berjalan: ${minutes}m ${seconds}s`;
            progressIndex += 1;
            try {
                await bot.sendMessage(chatId, `⏳ ${message}`);
            } catch (error) {
                console.error(`${colors.red}❌ Progress update error: ${error.message}${colors.reset}`);
            }
        }, 60000);
    }

    try {
        const result = await jaeger.smartScan(target, normalizedObjective, options);
        if (chatId) {
            try {
                await bot.sendMessage(chatId, '✅ Jaeger automation selesai. Menyusun laporan akhir…');
            } catch (error) {
                console.error(`${colors.red}❌ Completion message error: ${error.message}${colors.reset}`);
            }
        }
        return result;
    } finally {
        if (progressInterval) {
            clearInterval(progressInterval);
        }
    }
}

function formatExecutionSummary({ result, target, objective }) {
    const toolsExecuted = Array.isArray(result.tools_executed) ? result.tools_executed : [];
    const successfulTools = toolsExecuted.filter((tool) => tool.success !== false && tool.status !== 'failed');
    const failedTools = toolsExecuted.length - successfulTools.length;
    const selectedTools = Array.isArray(result.selected_tools) ? result.selected_tools : [];

    const safeTarget = escapeMarkdown(target);
    const safeObjective = escapeMarkdown(objective || normalizeObjective(objective));

    const lines = [
        '📊 *Jaeger Execution Summary*',
        `🎯 Target  : \`${safeTarget}\``,
        `🧭 Mode    : \`${safeObjective}\``,
        `🛠️ Tools   : ${toolsExecuted.length} total | ✅ ${successfulTools.length}${failedTools > 0 ? ` | ❌ ${failedTools}` : ''}`,
        `⏱️ Runtime : ${result.execution_time ? `${Math.round(result.execution_time)}s` : 'N/A'}`,
        `🚨 Findings: ${result.total_vulnerabilities || 0} potential issues`
    ];

    const toolNames = selectedTools.length
        ? selectedTools
        : successfulTools.map((tool) => tool.tool).filter(Boolean);

    if (toolNames.length) {
        const displayNames = toolNames
            .slice(0, 6)
            .map((name) => escapeMarkdown(name.toUpperCase()));
        const suffix = toolNames.length > 6 ? '…' : '';
        lines.push(`🛠 Tools: ${displayNames.join(', ')}${suffix}`);
    }

    return lines.join('\n');
}

function trimOutput(output = '', limit = 1500) {
    const text = String(output || '').trim();
    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit)}\n… (truncated)`;
}

function extractHighlights(text = '', { maxLines = 8, fallbackLines = 3 } = {}) {
    const KEYWORDS = ['critical', 'high', 'medium', 'low', 'vulnerab', 'found', 'open', 'port', 'http', 'status', 'error', 'warning', 'info', 'redirect', 'ssl'];
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !/^\[\d*K/.test(line) && !line.startsWith('::') && !/^Progress:\s*\d+/.test(line));

    if (!lines.length) {
        return '';
    }

    const keywordMatches = lines.filter((line) => {
        const lower = line.toLowerCase();
        return KEYWORDS.some((key) => lower.includes(key));
    });

    if (keywordMatches.length) {
        return keywordMatches.slice(0, maxLines).join('\n');
    }

    const fallbackHead = lines.slice(0, fallbackLines);
    const fallbackTail = lines.slice(-fallbackLines);
    const fallback = [...fallbackHead];

    for (const line of fallbackTail) {
        if (!fallback.includes(line)) {
            fallback.push(line);
        }
    }

    return fallback.join('\n');
}

function formatToolOutput(tool) {
    const name = (tool?.tool || 'unknown').toString().toUpperCase();
    const status = tool?.success === false || tool?.status === 'failed' ? '❌ Failed' : '✅ Success';
    const executionTime = tool?.execution_time ? `${Math.round(tool.execution_time)}s` : 'N/A';
    const command = tool?.command ? tool.command : null;
    const stdout = extractHighlights(tool?.stdout);
    const stderr = extractHighlights(tool?.stderr, { maxLines: 4, fallbackLines: 0 });
    const error = trimOutput(tool?.error, 400);

    const lines = [`🔧 ${name} — ${status}`, `🕒 Duration: ${executionTime}`];

    if (command) {
        lines.push(`💻 Command: ${command}`);
    }

    if (stdout) {
        lines.push('📄 Output:');
        lines.push(stdout);
    }

    if (stderr) {
        lines.push('⚠️ Stderr:');
        lines.push(stderr);
    }

    if (error && error !== stderr) {
        lines.push('❗ Error:');
        lines.push(error);
    }

    const failureText = `${stderr} ${error} ${stdout}`.toLowerCase();
    if (failureText.includes('timeout')) {
        lines.push('⚠️ Catatan: Permintaan ke target mengalami timeout. Pastikan target responsif atau naikkan pengaturan timeout/proxy.');
    }

    if (failureText.includes('not found') || failureText.includes('command not found')) {
        lines.push('💡 Tip: Binary tidak ditemukan di server Jaeger. Instal tool ini dan pastikan ada di PATH.');
    } else if (name === 'NUCLEI' && (tool?.success === false || (error && error.length))) {
        lines.push('💡 Tip: Pastikan nuclei terinstal dan path binary tersedia di server Jaeger.');
    }

    return lines.join('\n');
}

async function sendToolOutputs(chatId, tools = []) {
    if (!Array.isArray(tools) || tools.length === 0) {
        return;
    }

    const missingTools = new Set();

    for (const tool of tools) {
        const message = formatToolOutput(tool);
        if (!message) {
            continue;
        }

        const parts = splitMessage(message, 3500);
        for (const part of parts) {
            await bot.sendMessage(chatId, part);
        }

        const failureText = `${tool?.stderr || ''} ${tool?.error || ''} ${tool?.stdout || ''}`.toLowerCase();
        if (failureText.includes('not found') || failureText.includes('command not found')) {
            missingTools.add((tool?.tool || '').toUpperCase());
        }
    }

    if (missingTools.size) {
        await bot.sendMessage(chatId, `⚠️ Tool belum terinstal: ${Array.from(missingTools).join(', ')}. Silakan instal pada server Jaeger agar otomatisasi lengkap.`);
    }
}

function buildLLMPayload(result, target) {
    const tools = Array.isArray(result.tools_executed) ? result.tools_executed : [];

    const toolSummaries = tools.map((tool) => ({
        tool: tool.tool,
        status: tool.status,
        success: tool.success,
        execution_time: tool.execution_time,
        vulnerabilities_found: tool.vulnerabilities_found,
        highlights: extractHighlights(tool.stdout, { maxLines: 12, fallbackLines: 4 }) || extractHighlights(tool.stderr, { maxLines: 6, fallbackLines: 2 }),
        stdout_snippet: trimOutput(tool.stdout, 1600),
        stderr_snippet: trimOutput(tool.stderr, 800)
    }));

    return {
        target: result.target || target,
        execution_summary: result.execution_summary,
        total_vulnerabilities: result.total_vulnerabilities,
        tools: toolSummaries.slice(0, 12),
        notes: result.execution_summary?.notes || '',
        combined_highlights: extractHighlights(result.combined_output, { maxLines: 18, fallbackLines: 8 }),
        combined_output_snippet: trimOutput(result.combined_output, 2400)
    };
}

async function deliverScanOutcome({ chatId, target, objective, result, originalText }) {
    if (!result || result.success === false) {
        const errorMsg = (result && result.error) || 'Unknown Jaeger error';
        await bot.sendMessage(chatId, `❌ Scan failed: ${errorMsg}`);
        return;
    }

    const summary = formatExecutionSummary({ result, target, objective });
    await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });

    await sendToolOutputs(chatId, result.tools_executed);

    if (originalText && (originalText.toLowerCase().includes('detail') || originalText.toLowerCase().includes('raw'))) {
        const rawData = `\`\`\`json\n${JSON.stringify(result, null, 2).substring(0, 3000)}\n\`\`\``;
        await bot.sendMessage(chatId, rawData, { parse_mode: 'Markdown' });
    }

    await bot.sendMessage(chatId, '🧠 Analyzing results with AI...');

    const llmPayload = buildLLMPayload(result, target);

    try {
        const report = await llm.analyzeScanResults(llmPayload, target);

        if (report.length > 4000) {
            const parts = splitMessage(report, 4000);
            for (const part of parts) {
                await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
            }
        } else {
            await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
        }
    } catch (analysisError) {
        console.error(`${colors.red}❌ LLM report generation error: ${analysisError.message}${colors.reset}`);
        await bot.sendMessage(chatId, `⚠️ AI report unavailable: ${analysisError.message}`);
    }
}

async function ensureHexstrikeHealth(chatId) {
    try {
        const health = await jaeger.checkHealth();
        if (!health || health.status !== 'healthy') {
            await bot.sendMessage(chatId, '❌ Jaeger tidak siap saat ini. Coba restart server MCP lalu jalankan kembali.');
            return null;
        }

        const toolCount = health.tools_available || 'N/A';
        await bot.sendMessage(chatId, `🩺 Jaeger online (tools terdeteksi: ${toolCount}).`);

        if (typeof health.tools_available === 'number' && health.tools_available < 40) {
            await bot.sendMessage(chatId, '⚠️ Beberapa tool Jaeger belum terdeteksi. Jalankan skrip instalasi tambahan bila diperlukan.');
        }
        return health;
    } catch (error) {
        await bot.sendMessage(chatId, `⚠️ Gagal memeriksa kesehatan Jaeger: ${error.message}`);
        return null;
    }
}

console.log(`${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   JAEGER AI - Penetration Testing Bot    ║${colors.reset}`);
console.log(`${colors.cyan}║   Powered by Jaeger Intelligence       ║${colors.reset}`);
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

Saya adalah bot AI untuk security testing yang menggunakan Jaeger Intelligence Engine (150+ tools).

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
/status - Status Jaeger server
/tools - Daftar tools available

*⚡ Objective Options:*
• reconnaissance - Recon dan subdomain enum
• vulnerability hunting - Vuln scanning
• comprehensive - Full scan (all tools)
• quick - Fast scan (essential tools only)
• osint - OSINT dan information gathering

Ready untuk membantu! 🚀
`;

    const keyboard = {
        keyboard: [
            [
                { text: '🔍 Quick Scan' },
                { text: '🎯 Reconnaissance' }
            ],
            [
                { text: '🔬 Vulnerability Hunt' },
                { text: '🕵️ OSINT' }
            ],
            [
                { text: '📊 Status' },
                { text: '🔧 Tools' }
            ],
            [
                { text: '❓ Help' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
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
• /fullscan <target> - Comprehensive multi-tool workflow
• /tech <target> - Technology detection

*Utility Commands:*
• /status - Check Jaeger server status
• /tools - List available tools
• /cancel - Cancel active scan

*🧠 AI Features:*
✅ Auto tool selection berdasarkan target type
✅ Smart parameter optimization
✅ Result analysis & reporting
✅ Natural language understanding

Pertanyaan? Kirim pesan Anda! 💬
`;

    bot.sendMessage(chatId, helpMessage);
});

/**
 * Status command - Check Jaeger server
 */
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, '⏳ Checking Jaeger server status...');

    const health = await jaeger.checkHealth();

    if (health.status === 'healthy') {
        const statusMsg = `
✅ *Jaeger Server Online*

🔧 Tools Available: ${health.tools_available || 'N/A'}
⏱️ Uptime: ${Math.floor((health.uptime || 0) / 3600)}h ${Math.floor(((health.uptime || 0) % 3600) / 60)}m
📦 Version: ${health.version || 'N/A'}

Status: *READY* 🚀
`;
        bot.sendMessage(chatId, statusMsg);
    } else {
        bot.sendMessage(chatId, `❌ Jaeger server offline!\n\nError: ${health.error}`);
    }
});

/**
 * Tools command - List available tools
 */
bot.onText(/\/tools/, async (msg) => {
    const chatId = msg.chat.id;

    const toolsMessage = `
🔧 *Jaeger Available Tools (60+)*

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

    bot.sendMessage(chatId, toolsMessage);
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
 * Full scan command - Comprehensive workflow
 */
bot.onText(/\/fullscan (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1].trim();

    await executeWorkflow(chatId, target, 'comprehensive');
});

/**
 * Technology detection command
 */
bot.onText(/\/tech (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1].trim();

    bot.sendMessage(chatId, `🔬 Detecting technologies on ${target}...`);

    const result = await jaeger.detectTechnology(target);

    if (result.success) {
        const techMsg = formatTechnologyResult(result);
        bot.sendMessage(chatId, techMsg);
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

    // Handle keyboard button presses
    if (text === '📊 Status') {
        // Execute status check directly
        bot.sendMessage(chatId, '⏳ Checking Jaeger server status...');
        const health = await jaeger.checkHealth();
        if (health.status === 'healthy') {
            const statusMsg = `
✅ *Jaeger Server Online*

🔧 Tools Available: ${health.tools_available || 'N/A'}
⏱️ Uptime: ${Math.floor((health.uptime || 0) / 3600)}h ${Math.floor(((health.uptime || 0) % 3600) / 60)}m
📦 Version: ${health.version || 'N/A'}

Status: *READY* 🚀
`;
            bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, `❌ Jaeger server offline!\n\nError: ${health.error}`);
        }
        return;
    } else if (text === '🔧 Tools') {
        // Show tools list directly
        const toolsMessage = `
🔧 *Jaeger Available Tools (60+)*

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
        return;
    } else if (text === '❓ Help') {
        // Show help directly
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
• /status - Check Jaeger server status
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
        return;
    } else if (text === '🔍 Quick Scan' || text === '🎯 Reconnaissance' || text === '🔬 Vulnerability Hunt' || text === '🕵️ OSINT') {
        // Ask for target
        let scanType = 'quick';
        if (text === '🎯 Reconnaissance') scanType = 'reconnaissance';
        else if (text === '🔬 Vulnerability Hunt') scanType = 'vulnerability_hunting';
        else if (text === '🕵️ OSINT') scanType = 'osint';

        bot.sendMessage(chatId, `🎯 ${text}\n\nSilakan masukkan target (domain/IP):\nContoh: example.com atau 192.168.1.1`);

        // Store scan type for next message
        if (!activeScans.has(chatId)) {
            activeScans.set(chatId, { pendingScanType: scanType });
        }
        return;
    }

    // Check if there's a pending scan type
    if (activeScans.has(chatId) && activeScans.get(chatId).pendingScanType) {
        const pendingScanType = activeScans.get(chatId).pendingScanType;
        activeScans.delete(chatId); // Clear pending state

        // Execute workflow with the target
        await executeWorkflow(chatId, text.trim(), pendingScanType);
        return;
    }

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
        const confirmMsgLines = [
            '✅ *Request Analyzed*',
            '',
            `🎯 Target: \`${analysis.target}\``,
            `📊 Objective: ${analysis.objective}`,
            `🔍 Analysis Type: ${analysis.analysis_type}`
        ];

        if (analysis.specific_tools.length) {
            confirmMsgLines.push(`🔧 Specific Tools: ${analysis.specific_tools.join(', ')}`);
        }

        confirmMsgLines.push('', `Starting ${analysis.specific_tools.length ? analysis.specific_tools.join(', ') : analysis.objective} scan... ⏳`);

        const confirmMsg = confirmMsgLines.join('\n');
        bot.sendMessage(chatId, confirmMsg);

        // Mark scan as active
        activeScans.set(chatId, {
            target: analysis.target,
            startTime: Date.now()
        });

        const health = await ensureHexstrikeHealth(chatId);
        if (!health) {
            activeScans.delete(chatId);
            return;
        }

        if (analysis.objective === 'vulnerability_hunting') {
            await bot.sendMessage(chatId, '🎯 Fokus: vulnerability hunting. Jaeger akan mencoba menjalankan sebanyak mungkin tool terkait (SQLi, dir brute-force, nuclei, dll).');
        }

        // Step 2: Execute scan using Jaeger Intelligence
        const scanResult = await performHexstrikeAutomation({
            chatId,
            target: analysis.target,
            objective: analysis.objective,
            specificTools: analysis.specific_tools,
            analysisType: analysis.analysis_type
        });

        // Remove from active scans
        activeScans.delete(chatId);

        // Step 3: Deliver outcome and AI analysis
        await deliverScanOutcome({
            chatId,
            target: analysis.target,
            objective: analysis.objective,
            result: scanResult,
            originalText: text
        });

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

    const health = await ensureHexstrikeHealth(chatId);
    if (!health) {
        activeScans.delete(chatId);
        return;
    }

    const scanResult = await performHexstrikeAutomation({
        chatId,
        target,
        objective: workflowType,
        specificTools: [],
        analysisType: workflowType
    });

    activeScans.delete(chatId);

    await deliverScanOutcome({
        chatId,
        target,
        objective: workflowType,
        result: scanResult,
        originalText: workflowType
    });
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
 * Error handling with improved retry mechanism
 */
let pollingErrorCount = 0;
const MAX_POLLING_ERRORS = 10; // Increased tolerance
let lastErrorTime = Date.now();

bot.on('polling_error', (error) => {
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime;

    // Reset counter if errors are spaced out (successful recovery)
    if (timeSinceLastError > 60000) { // 1 minute
        pollingErrorCount = 0;
    }

    pollingErrorCount++;
    lastErrorTime = now;

    // Log error with context
    console.error(`${colors.red}❌ Polling error (${pollingErrorCount}/${MAX_POLLING_ERRORS}): ${error.message}${colors.reset}`);

    // Common network errors - graceful handling
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'EFATAL' ||
        error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {

        console.log(`${colors.yellow}⚠️  Network error (${error.code}), bot will retry in 5s...${colors.reset}`);

        // Only restart if too many consecutive errors
        if (pollingErrorCount >= MAX_POLLING_ERRORS) {
            console.log(`${colors.red}❌ Too many consecutive errors, restarting bot...${colors.reset}`);
            bot.stopPolling({ cancel: true }).then(() => {
                setTimeout(() => {
                    console.log(`${colors.cyan}🔄 Restarting polling...${colors.reset}`);
                    bot.startPolling();
                    pollingErrorCount = 0;
                }, 5000);
            }).catch(err => {
                console.error(`${colors.red}❌ Failed to restart: ${err.message}${colors.reset}`);
                process.exit(1);
            });
        }
    } else {
        // Unknown error - log and continue
        console.error(`${colors.red}❌ Unexpected error: ${error.stack}${colors.reset}`);
    }
});

// Reset error count on successful message
bot.on('message', () => {
    if (pollingErrorCount > 0) {
        pollingErrorCount = 0;
    }
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
