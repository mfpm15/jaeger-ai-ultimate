#!/usr/bin/env node

/**
 * LLM ANALYZER - AI Brain untuk Jaeger Telegram Bot
 *
 * Purpose: Menganalisis user request dan hasil scan menggunakan multiple LLMs
 * LLMs (via OpenRouter): DeepSeek, Chimera, Z AI
 *
 * Flow:
 * 1. User Request → LLM → Extract intent, target, scan type
 * 2. Scan Results → LLM → Analyze vulnerabilities, create report
 */

const fetch = require('node-fetch');

class LLMAnalyzer {
    constructor(config = {}) {
        const verboseEnv = process.env.LLM_VERBOSE;
        this.enableLogging = config.enableLogging ?? (verboseEnv === 'true' || verboseEnv === '1');
        this.log = (...args) => {
            if (this.enableLogging) {
                console.log(...args);
            }
        };
        this.warn = (...args) => {
            if (this.enableLogging) {
                console.warn(...args);
            }
        };
        this.error = (...args) => console.error(...args);

        // Collect all available API keys with priority
        this.apiKeys = [
            process.env.OPENROUTER_API_KEY_PRIMARY,
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_API_KEY_SECONDARY,
            process.env.OPENROUTER_API_KEY_TERTIARY
        ].filter(Boolean);
        this.apiKeys = Array.from(new Set(this.apiKeys));

        this.currentKeyIndex = 0;
        this.deepseekApiKey = config.deepseekKey || process.env.DEEPSEEK_API_KEY || '';
        this.chimeraApiKey = config.chimeraKey || process.env.CHIMERA_API_KEY || '';
        this.zAiApiKey = config.zAiKey || process.env.ZAI_API_KEY || '';

        // NO GEMINI - Only OpenRouter, DeepSeek, Chimera, Z-AI
        const defaultPriority = ['openrouter', 'deepseek', 'chimera', 'zai'];
        if (process.env.LLM_PROVIDER_PRIORITY) {
            this.providerPriority = process.env.LLM_PROVIDER_PRIORITY
                .split(',')
                .map(name => name.trim().toLowerCase())
                .filter(Boolean);
        } else if (Array.isArray(config.providerPriority)) {
            this.providerPriority = config.providerPriority;
        } else {
            this.providerPriority = defaultPriority;
        }

        this.maxTokens = Number(config.maxTokens || process.env.LLM_MAX_TOKENS) || 8000;

        // API Endpoints
        this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
        this.chimeraUrl = process.env.CHIMERA_API_URL || '';
        this.zAiUrl = process.env.ZAI_API_URL || '';

        // ONLY OpenRouter - No Gemini fallback!
        if (this.apiKeys.length > 0) {
            this.primaryLLM = 'openrouter';
        } else {
            this.primaryLLM = this.providerPriority.find((name) => this.isProviderConfigured(name)) || 'openrouter';
        }

        // Ensure we never use Gemini
        this.providerPriority = this.providerPriority.filter(p => p !== 'gemini');
        const envModels = process.env.LLM_OPENROUTER_MODELS
            ? process.env.LLM_OPENROUTER_MODELS.split(',').map(m => m.trim()).filter(Boolean)
            : null;
        const defaultModels = [
            'deepseek/deepseek-chat-v3.1:free',
            'tngtech/deepseek-r1t2-chimera:free',
            'z-ai/glm-4.5-air:free'
        ];
        this.openRouterModels = Array.isArray(config.models)
            ? config.models.filter(Boolean)
            : envModels || defaultModels;
        this.model = this.openRouterModels[0];

        // Response cache to reduce API calls (cache for 5 minutes)
        this.responseCache = new Map();
        this.CACHE_TTL = 300000; // 5 minutes

        // Token usage tracking
        this.totalTokensUsed = 0;
        this.apiCallCount = 0;

        this.log(`🔑 Loaded ${this.apiKeys.length} OpenRouter API keys for fallback`);
        this.log(`⚙️  Max tokens per request: ${this.maxTokens} (optimized for cost)`);
    }

    /**
     * Analyze user request to extract security testing intent (with caching)
     */
    async analyzeUserRequest(userMessage) {
        this.log(`🧠 LLM analyzing user request: "${userMessage}"`);

        // Check cache first
        const cacheKey = `request_${userMessage}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            this.log('✅ Using cached analysis (saved API call)');
            return cached;
        }

        // Optimized prompt - shorter but effective
        const prompt = `Extract from: "${userMessage}"
Return JSON:
{
  "target": "domain/IP",
  "objective": "reconnaissance|vulnerability_hunting|comprehensive|quick|osint",
  "specific_tools": [],
  "analysis_type": "quick|comprehensive",
  "user_intent": "brief desc"
}`;

        try {
            const result = await this.callLLM(prompt, null, 500); // Limit to 500 tokens max

            // Parse JSON response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                this.error('❌ LLM response not in JSON format');
                return this.fallbackAnalysis(userMessage);
            }

            const analysis = JSON.parse(jsonMatch[0]);
            this.log('✅ LLM Analysis:', JSON.stringify(analysis, null, 2));

            // Cache the result
            this.setCached(cacheKey, analysis);

            return analysis;
        } catch (error) {
            this.error('❌ LLM analysis failed:', error.message);
            return this.fallbackAnalysis(userMessage);
        }
    }

    /**
     * Analyze scan results and create user-friendly report (optimized for token usage)
     */
    async analyzeScanResults(scanResults, target) {
        this.log(`🧠 LLM analyzing scan results for ${target}...`);

        // Check cache first
        const cacheKey = `report_${target}_${JSON.stringify(scanResults).substring(0, 100)}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            this.log('✅ Using cached report (saved API call)');
            return cached;
        }

        // Truncate large scan data to save tokens
        const compactData = this.compactScanData(scanResults);

        // Extract tools that were actually executed
        const executedTools = compactData.tools.map(t => t.tool).filter(Boolean).join(', ') || 'unknown';

        // Optimized prompt - more concise with MORE EMOJIS!
        const prompt = `Target: ${target}
Data: ${JSON.stringify(compactData)}

Tulis laporan keamanan INTERAKTIF dalam Bahasa Indonesia (minimum 4000 kata, pastikan total output mendekati 8000 token) dengan BANYAK EMOJI:

📋 **FORMAT LAPORAN:**

╔═══════════════════════════════════════╗
║  🎯 JAEGER AI SECURITY REPORT  ║
╚═══════════════════════════════════════╝

1️⃣ 🚀 *EXECUTIVE SUMMARY*
   ├─ 🎯 Target & teknologi terdeteksi
   ├─ 🔐 Status keamanan overall (gunakan emoji: ✅🟢🟡🟠🔴)
   ├─ ⚡ Risiko CRITICAL/HIGH/MEDIUM/LOW dengan emoji sesuai severity
   └─ 💼 Dampak bisnis potensial

2️⃣ 🔍 *DETAILED FINDINGS* (Gunakan box seperti ini untuk setiap finding):

   ┌─────────────────────────────────┐
   │ 🚨 Finding #1: [Nama]           │
   ├─────────────────────────────────┤
   │ Severity: 🔴 CRITICAL           │
   │ Tool: [tool name]               │
   │ 📌 Deskripsi: ...               │
   │ 💥 Impact: ...                  │
   │ ✅ Rekomendasi: ...             │
   └─────────────────────────────────┘

3️⃣ 🛠️ *TOOLS EXECUTION SUMMARY*
   Untuk setiap tool, gunakan emoji sesuai tool:
   🔍 Nmap - [hasil]
   🌐 Subfinder - [hasil]
   📡 HTTPx - [hasil]
   💣 Nuclei - [hasil]
   Dan tool lainnya dengan emoji unik

4️⃣ ✨ *SECURITY RECOMMENDATIONS* (5-7 prioritas dengan emoji)
   🔥 PRIORITY 1: ...
   ⚡ PRIORITY 2: ...
   💡 PRIORITY 3: ...
   (dst)

5️⃣ 🛡️ *INCIDENT RESPONSE PLAN*
   Jika terjadi serangan aktif:
   🚨 Step 1: ...
   🚨 Step 2: ...
   🚨 Step 3: ...

6️⃣ 📊 *COMPLIANCE & BEST PRACTICES*
   Berikan saran compliance (ISO, NIST, OWASP) dengan emoji

PENTING - WAJIB akhiri dengan footer ini:

═════════════════════════════════════════

📞 **LAPORKAN INSIDEN KEAMANAN:**
Jika menemukan kebocoran data atau insiden keamanan:
🔐 **VAPT Telkom Indonesia**

═════════════════════════════════════════

✍️ **Ditulis oleh:**
**JAEGER AI, Your Cyber Security Partner**
🤖 Powered by Advanced AI Security Intelligence

═════════════════════════════════════════

PENTING:
- Gunakan MINIMAL 50+ emoji di seluruh laporan
- Setiap section wajib berada dalam box/border ASCII penuh (gunakan garis vertikal dan horizontal di sisi kiri & kanan)
- Gunakan tree structure (├─ └─) untuk bullets
- Severity HARUS ada emoji: 🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🟢 LOW, ✅ SECURE
- Footer di atas WAJIB ada di akhir
- Analisis HANYA tools yang dijalankan: ${executedTools}. JANGAN menyebutkan tools lain yang tidak ada dalam list ini.
- Footer harus persis menuliskan "🔐 **VAPT Telkom Indonesia**" tanpa menambahkan website, nomor telepon, atau kontak lain.

Catatan internal (JANGAN tampilkan ke user, jangan tulis kembali kata "PENTING"):
- Jangan tampilkan proses internal, percobaan API key, statistik token, atau log debugging.
- Jangan salin ulang daftar instruksi ini. Gunakan hanya sebagai panduan penulisan.
- Isi setiap section dengan paragraf panjang, insight teknis, dan contoh mitigasi mendetail agar total panjang mendekati 8000 token.
 - Jika hasil laporan masih jauh dari target 8000 token, tambahkan detail tambahan, contoh kasus, serta uraian mitigasi lanjutan hingga mendekati batas token maksimum yang diizinkan.
- Gunakan variasi emoji kreatif pada setiap paragraf tanpa mengurangi profesionalitas.
- Pastikan rekomendasi dan rencana incident response bersifat actionable dengan langkah terurut.
- Bila tidak ada kerentanan, jelaskan alasan teknis dan rekomendasi hardening lanjutan secara rinci.
- Jangan tambahkan informasi kontak selain footer yang ditentukan.`;

        try {
            const report = await this.callLLM(prompt);
            this.log('✅ LLM Report generated');

            // Cache the report
            this.setCached(cacheKey, report);

            return report;
        } catch (error) {
            this.error('❌ LLM report generation failed:', error.message);
            return this.fallbackReport(scanResults, target);
        }
    }

    /**
     * Compact scan data to reduce token usage
     */
    compactScanData(scanResults) {
        const compact = {
            target: scanResults.target,
            total_vulnerabilities: scanResults.total_vulnerabilities,
            tools: []
        };

        const toolEntries = Array.isArray(scanResults.tools)
            ? scanResults.tools
            : Array.isArray(scanResults.tools_executed)
                ? scanResults.tools_executed
                : [];

        if (toolEntries.length) {
            compact.tools = toolEntries.slice(0, 8).map((tool) => ({
                tool: tool.tool,
                success: tool.success,
                highlights: tool.highlights ? tool.highlights.substring(0, 300) : '',
                vulnerabilities_found: tool.vulnerabilities_found
            }));
        }

        if (Array.isArray(scanResults.unsupported_tools) && scanResults.unsupported_tools.length) {
            compact.unsupported_tools = scanResults.unsupported_tools.slice(0, 10);
        }

        if (Array.isArray(scanResults.recommended_alternatives) && scanResults.recommended_alternatives.length) {
            compact.recommended_alternatives = scanResults.recommended_alternatives.slice(0, 10);
        }

        return compact;
    }

    /**
     * Cache management
     */
    getCached(key) {
        const cached = this.responseCache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_TTL) {
            this.responseCache.delete(key);
            return null;
        }

        return cached.value;
    }

    setCached(key, value) {
        this.responseCache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Cleanup old cache entries
        if (this.responseCache.size > 50) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
    }

    /**
     * Call LLM API (using primary LLM) with token tracking
     */
    async callLLM(prompt, model = null, maxTokens = null) {
        this.apiCallCount++;
        const effectiveMaxTokens = maxTokens || this.maxTokens;

        this.log(`📊 API Call #${this.apiCallCount} | Max tokens: ${effectiveMaxTokens}`);

        const providers = this.resolveProviders();

        if (providers.length === 0) {
            throw new Error('No LLM providers are configured');
        }

        let lastError = null;

        for (const provider of providers) {
            try {
                let result;
                switch (provider) {
                    case 'openrouter':
                        result = await this.callOpenRouter(prompt, model, effectiveMaxTokens);
                        break;
                    case 'deepseek':
                        result = await this.callDeepSeek(prompt);
                        break;
                    case 'chimera':
                        result = await this.callChimera(prompt);
                        break;
                    case 'zai':
                        result = await this.callZAI(prompt);
                        break;
                    default:
                        continue;
                }

                // Track token usage (approximate)
                const estimatedTokens = Math.ceil((prompt.length + (result?.length || 0)) / 4);
                this.totalTokensUsed += estimatedTokens;
                this.log(`📊 Estimated tokens used: ${estimatedTokens} | Total: ${this.totalTokensUsed}`);

                return result;
            } catch (error) {
                lastError = error;
                this.warn(`❌ ${provider} provider failed: ${error.message}`);
            }
        }

        throw lastError || new Error('All configured LLM providers failed');
    }

    resolveProviders() {
        const order = [];
        const seen = new Set();

        const addProvider = (provider) => {
            if (!provider || seen.has(provider)) {
                return;
            }
            if (!this.isProviderConfigured(provider)) {
                return;
            }
            order.push(provider);
            seen.add(provider);
        };

        addProvider(this.primaryLLM);

        for (const provider of this.providerPriority) {
            addProvider(provider);
        }

        return order;
    }

    isProviderConfigured(provider) {
        switch (provider) {
            case 'openrouter':
                return this.apiKeys.length > 0;
            case 'deepseek':
                return Boolean(this.deepseekApiKey);
            case 'chimera':
                return Boolean(this.chimeraApiKey && this.chimeraUrl);
            case 'zai':
                return Boolean(this.zAiApiKey && this.zAiUrl);
            case 'gemini':
                return false; // NEVER use Gemini
            default:
                return false;
        }
    }

    /**
     * OpenRouter API call (optimized with shorter system prompt and configurable max tokens)
     */
    async callOpenRouter(prompt, model = null, maxTokens = null) {
        if (this.apiKeys.length === 0) {
            throw new Error('OpenRouter API key not configured');
        }

        const modelsToTry = [...new Set([model, ...this.openRouterModels.filter(Boolean)])].filter(Boolean);
        const effectiveMaxTokens = maxTokens || this.maxTokens;
        let lastError = null;

        for (const selectedModel of modelsToTry) {
            // Try all available API keys for each model
            for (let i = 0; i < this.apiKeys.length; i++) {
                const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
                const apiKey = this.apiKeys[keyIndex];

                try {
                    this.log(`🔑 Trying OpenRouter API key #${keyIndex + 1} (${selectedModel})...`);

                    const response = await fetch(this.openrouterUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                            'HTTP-Referer': 'https://github.com/jaeger-ai',
                            'X-Title': 'Jaeger AI Security Bot'
                        },
                        body: JSON.stringify({
                            model: selectedModel,
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Cybersecurity expert for pentest analysis.'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            temperature: 0.5,
                            max_tokens: effectiveMaxTokens
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        lastError = new Error(`OpenRouter API error: ${errorText}`);
                        this.log(`❌ API key #${keyIndex + 1} failed: ${errorText.substring(0, 120)}`);

                        if (errorText.includes('Insufficient credits') || errorText.includes('402')) {
                            this.log(`💳 Key #${keyIndex + 1} has insufficient credits, trying next key...`);
                            continue;
                        }

                        if (errorText.includes('model') && errorText.includes('not found')) {
                            this.log(`🔄 Model ${selectedModel} unavailable, trying alternative model...`);
                            break; // keluar dari loop key untuk coba model lain
                        }

                        throw lastError;
                    }

                    const data = await response.json();
                    this.log(`✅ API key #${keyIndex + 1} succeeded using ${selectedModel}!`);

                    if (data.usage) {
                        this.log(`📊 Tokens used: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
                    }

                    this.currentKeyIndex = keyIndex;
                    return data.choices?.[0]?.message?.content || '';

                } catch (error) {
                    lastError = error;
                    this.log(`❌ API key #${keyIndex + 1} error: ${error.message.substring(0, 120)}`);

                    if (i < this.apiKeys.length - 1) {
                        continue;
                    }
                }
            }
        }

        // All keys failed
        throw lastError || new Error('All OpenRouter API keys failed');
    }

    /**
     * DeepSeek API call
     */
    async callDeepSeek(prompt) {
        if (!this.deepseekApiKey) {
            throw new Error('DeepSeek API key not configured');
        }

        const response = await fetch(this.deepseekUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.deepseekApiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a cybersecurity expert assistant for penetration testing and security analysis.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`DeepSeek API error: ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Chimera API call (placeholder - adjust based on actual API)
     */
    async callChimera(prompt) {
        if (!this.chimeraApiKey || !this.chimeraUrl) {
            throw new Error('Chimera API not configured');
        }

        // Implement Chimera API call here
        throw new Error('Chimera integration not yet implemented');
    }

    /**
     * Z AI API call (placeholder - adjust based on actual API)
     */
    async callZAI(prompt) {
        if (!this.zAiApiKey || !this.zAiUrl) {
            throw new Error('Z AI not configured');
        }

        // Implement Z AI API call here
        throw new Error('Z AI integration not yet implemented');
    }

    /**
     * Fallback analysis when LLM fails
     */
    fallbackAnalysis(userMessage) {
        this.log('⚠️ Using fallback analysis (no LLM)');

        const message = userMessage.toLowerCase();

        // Extract target using regex
        const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i;
        const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

        let target = null;
        const urlMatch = message.match(urlPattern);
        const ipMatch = message.match(ipPattern);

        if (urlMatch) {
            target = urlMatch[1];
        } else if (ipMatch) {
            target = ipMatch[0];
        }

        const toolKeywords = [
            { keyword: 'nmap', tool: 'nmap' },
            { keyword: 'httpx', tool: 'httpx' },
            { keyword: 'subfinder', tool: 'subfinder' },
            { keyword: 'amass', tool: 'amass' },
            { keyword: 'gobuster', tool: 'gobuster' },
            { keyword: 'ffuf', tool: 'ffuf' },
            { keyword: 'nikto', tool: 'nikto' },
            { keyword: 'dirsearch', tool: 'dirsearch' },
            { keyword: 'wpscan', tool: 'wpscan' },
            { keyword: 'sqlmap', tool: 'sqlmap' },
            { keyword: 'feroxbuster', tool: 'feroxbuster' },
            { keyword: 'katana', tool: 'katana' },
            { keyword: 'nuclei', tool: 'nuclei' }
        ];

        let objective = 'comprehensive';
        const specificTools = [];

        for (const { keyword, tool } of toolKeywords) {
            if (message.includes(keyword) && !specificTools.includes(tool)) {
                specificTools.push(tool);
            }
        }

        if (!specificTools.length) {
            if (message.includes('quick') || message.includes('cepat')) {
                objective = 'quick';
            } else if (message.includes('recon') || message.includes('reconnaissance')) {
                objective = 'reconnaissance';
            } else if (message.includes('vuln') || message.includes('vulnerability')) {
                objective = 'vulnerability_hunting';
            } else if (message.includes('osint')) {
                objective = 'osint';
            }
        } else {
            objective = 'quick';
        }

        return {
            target: target || 'unknown',
            objective,
            specific_tools: specificTools,
            analysis_type: objective === 'quick' ? 'quick' : 'comprehensive',
            user_intent: userMessage
        };
    }

    /**
     * Fallback report when LLM fails
     */
    fallbackReport(scanResults, target) {
        this.log('⚠️ Using fallback report (no LLM)');

        const lines = [
            `🎯 Security Scan Report - ${target}`,
            '',
            `📊 Scan completed at ${new Date().toLocaleString()}`
        ];

        const tools = Array.isArray(scanResults.tools_executed) ? scanResults.tools_executed : [];

        if (tools.length) {
            lines.push('', '🔧 Tool Detail:');
            tools.forEach((tool) => {
                const name = tool.tool || tool.name || 'unknown';
                const status = tool.status || (tool.success ? 'success' : 'error');
                lines.push(`• ${name} — ${status}`);

                if (tool.stdout) {
                    lines.push('```');
                    lines.push(tool.stdout.slice(0, 1500));
                    lines.push('```');
                }

                if (tool.stderr) {
                    lines.push(`⚠️ Error: ${tool.stderr.slice(0, 600)}`);
                }

                lines.push('');
            });
        } else if (scanResults.results) {
            lines.push('', '📄 Raw results:', '```');
            lines.push(JSON.stringify(scanResults.results, null, 2).slice(0, 3500));
            lines.push('```');
        } else {
            lines.push('', '📄 No tool output recorded.');
        }

        return lines.join('\n');
    }
}

module.exports = LLMAnalyzer;

// Standalone testing
if (require.main === module) {
    const analyzer = new LLMAnalyzer();

    async function test() {
        analyzer.log('🧪 Testing LLM Analyzer\n');

        // Test 1: Analyze user request
        const testMessage = "scan ibnusaad.com untuk vulnerability";
        const analysis = await analyzer.analyzeUserRequest(testMessage);
        analyzer.log('\n📊 Analysis Result:', JSON.stringify(analysis, null, 2));

        // Test 2: Analyze results (mock data)
        const mockResults = {
            target_profile: {
                target: 'ibnusaad.com',
                risk_level: 'medium',
                open_ports: [80, 443, 22],
                technologies: ['nginx', 'php']
            },
            findings: ['Port 22 open', 'SSL certificate valid']
        };

        analyzer.log('\n🧪 Testing report generation...');
        const report = await analyzer.analyzeScanResults(mockResults, 'ibnusaad.com');
        analyzer.log('\n📄 Report:\n', report);
    }

    test().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}
