#!/usr/bin/env node

/**
 * LLM ANALYZER - AI Brain untuk Jaeger Telegram Bot
 *
 * Purpose: Menganalisis user request dan hasil scan menggunakan multiple LLMs
 * LLMs: DeepSeek, Chimera, Z AI
 *
 * Flow:
 * 1. User Request → LLM → Extract intent, target, scan type
 * 2. Scan Results → LLM → Analyze vulnerabilities, create report
 */

const fetch = require('node-fetch');

class LLMAnalyzer {
    constructor(config = {}) {
        // Collect all available API keys with priority
        this.apiKeys = [
            process.env.OPENROUTER_API_KEY_PRIMARY,
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_API_KEY_SECONDARY,
            process.env.OPENROUTER_API_KEY_TERTIARY
        ].filter(Boolean);

        this.geminiKey = config.geminiKey || process.env.GEMINI_API_KEY || '';
        this.geminiModel = config.geminiModel || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

        this.currentKeyIndex = 0;
        this.deepseekApiKey = config.deepseekKey || process.env.DEEPSEEK_API_KEY || '';
        this.chimeraApiKey = config.chimeraKey || process.env.CHIMERA_API_KEY || '';
        this.zAiApiKey = config.zAiKey || process.env.ZAI_API_KEY || '';

        this.providerPriority = Array.isArray(config.providerPriority)
            ? config.providerPriority
            : ['openrouter', 'gemini', 'deepseek', 'chimera', 'zai'];

        this.maxTokens = Number(config.maxTokens || process.env.LLM_MAX_TOKENS) || 4000; // Reduced from 8000

        // API Endpoints
        this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
        this.chimeraUrl = process.env.CHIMERA_API_URL || '';
        this.zAiUrl = process.env.ZAI_API_URL || '';

        // Default to OpenRouter (supports multiple models) or fall back to Gemini if only that is configured
        if (this.apiKeys.length > 0) {
            this.primaryLLM = 'openrouter';
        } else if (this.geminiKey) {
            this.primaryLLM = 'gemini';
        } else {
            this.primaryLLM = 'deepseek';
        }
        this.model = config.model || 'deepseek/deepseek-chat'; // Default model for OpenRouter

        // Response cache to reduce API calls (cache for 5 minutes)
        this.responseCache = new Map();
        this.CACHE_TTL = 300000; // 5 minutes

        // Token usage tracking
        this.totalTokensUsed = 0;
        this.apiCallCount = 0;

        console.log(`🔑 Loaded ${this.apiKeys.length} OpenRouter API keys for fallback`);
        console.log(`⚙️  Max tokens per request: ${this.maxTokens} (optimized for cost)`);
    }

    /**
     * Analyze user request to extract security testing intent (with caching)
     */
    async analyzeUserRequest(userMessage) {
        console.log(`🧠 LLM analyzing user request: "${userMessage}"`);

        // Check cache first
        const cacheKey = `request_${userMessage}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log('✅ Using cached analysis (saved API call)');
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
                console.error('❌ LLM response not in JSON format');
                return this.fallbackAnalysis(userMessage);
            }

            const analysis = JSON.parse(jsonMatch[0]);
            console.log('✅ LLM Analysis:', JSON.stringify(analysis, null, 2));

            // Cache the result
            this.setCached(cacheKey, analysis);

            return analysis;
        } catch (error) {
            console.error('❌ LLM analysis failed:', error.message);
            return this.fallbackAnalysis(userMessage);
        }
    }

    /**
     * Analyze scan results and create user-friendly report (optimized for token usage)
     */
    async analyzeScanResults(scanResults, target) {
        console.log(`🧠 LLM analyzing scan results for ${target}...`);

        // Check cache first
        const cacheKey = `report_${target}_${JSON.stringify(scanResults).substring(0, 100)}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log('✅ Using cached report (saved API call)');
            return cached;
        }

        // Truncate large scan data to save tokens
        const compactData = this.compactScanData(scanResults);

        // Extract tools that were actually executed
        const executedTools = compactData.tools.map(t => t.tool).filter(Boolean).join(', ') || 'unknown';

        // Optimized prompt - more concise with MORE EMOJIS!
        const prompt = `Target: ${target}
Data: ${JSON.stringify(compactData)}

Tulis laporan keamanan INTERAKTIF dalam Bahasa Indonesia (min 500 kata) dengan BANYAK EMOJI:

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
- Setiap section harus ada box/border
- Gunakan tree structure (├─ └─) untuk bullets
- Severity HARUS ada emoji: 🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🟢 LOW, ✅ SECURE
- Footer di atas WAJIB ada di akhir
- Analisis HANYA tools yang dijalankan: ${executedTools}. JANGAN menyebutkan tools lain yang tidak ada dalam list ini.`;

        try {
            const report = await this.callLLM(prompt);
            console.log('✅ LLM Report generated');

            // Cache the report
            this.setCached(cacheKey, report);

            return report;
        } catch (error) {
            console.error('❌ LLM report generation failed:', error.message);
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

        if (Array.isArray(scanResults.tools)) {
            compact.tools = scanResults.tools.slice(0, 8).map(tool => ({
                tool: tool.tool,
                success: tool.success,
                highlights: tool.highlights ? tool.highlights.substring(0, 300) : '',
                vulnerabilities_found: tool.vulnerabilities_found
            }));
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

        console.log(`📊 API Call #${this.apiCallCount} | Max tokens: ${effectiveMaxTokens}`);

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
                    case 'gemini':
                        result = await this.callGemini(prompt, model);
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
                console.log(`📊 Estimated tokens used: ${estimatedTokens} | Total: ${this.totalTokensUsed}`);

                return result;
            } catch (error) {
                lastError = error;
                console.error(`❌ ${provider} provider failed: ${error.message}`);
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
            case 'gemini':
                return Boolean(this.geminiKey);
            case 'deepseek':
                return Boolean(this.deepseekApiKey);
            case 'chimera':
                return Boolean(this.chimeraApiKey && this.chimeraUrl);
            case 'zai':
                return Boolean(this.zAiApiKey && this.zAiUrl);
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

        const selectedModel = model || this.model;
        const effectiveMaxTokens = maxTokens || this.maxTokens;
        let lastError = null;

        // Try all available API keys
        for (let i = 0; i < this.apiKeys.length; i++) {
            const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
            const apiKey = this.apiKeys[keyIndex];

            try {
                console.log(`🔑 Trying OpenRouter API key #${keyIndex + 1}...`);

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
                                content: 'Cybersecurity expert for pentest analysis.' // Shortened system prompt
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.5, // Reduced from 0.7 for more consistent outputs
                        max_tokens: effectiveMaxTokens
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    lastError = new Error(`OpenRouter API error: ${errorText}`);
                    console.log(`❌ API key #${keyIndex + 1} failed: ${errorText.substring(0, 100)}`);

                    // If insufficient credits, try next key
                    if (errorText.includes('Insufficient credits') || errorText.includes('402')) {
                        console.log(`💳 Key #${keyIndex + 1} has insufficient credits, trying next...`);
                        continue;
                    }

                    // For other errors, throw immediately
                    throw lastError;
                }

                const data = await response.json();
                console.log(`✅ API key #${keyIndex + 1} succeeded!`);

                // Log token usage if available
                if (data.usage) {
                    console.log(`📊 Tokens used: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
                }

                // Update current key index for next call
                this.currentKeyIndex = keyIndex;

                return data.choices[0].message.content;

            } catch (error) {
                lastError = error;
                console.log(`❌ API key #${keyIndex + 1} error: ${error.message.substring(0, 100)}`);

                // Continue to next key if available
                if (i < this.apiKeys.length - 1) {
                    continue;
                }
            }
        }

        // All keys failed
        throw lastError || new Error('All OpenRouter API keys failed');
    }

    /**
     * Google Gemini API call
     */
    async callGemini(prompt, model = null) {
        if (!this.geminiKey) {
            throw new Error('Gemini API key not configured');
        }

        const modelId = (model && typeof model === 'string' ? model : this.geminiModel) || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.geminiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: Math.min(this.maxTokens, 8000)
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts
            .map((part) => part?.text)
            .filter(Boolean)
            .join('\n')
            .trim();

        if (!text) {
            throw new Error('Gemini API returned empty response');
        }

        return text;
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
        console.log('⚠️ Using fallback analysis (no LLM)');

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
        console.log('⚠️ Using fallback report (no LLM)');

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
        console.log('🧪 Testing LLM Analyzer\n');

        // Test 1: Analyze user request
        const testMessage = "scan ibnusaad.com untuk vulnerability";
        const analysis = await analyzer.analyzeUserRequest(testMessage);
        console.log('\n📊 Analysis Result:', JSON.stringify(analysis, null, 2));

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

        console.log('\n🧪 Testing report generation...');
        const report = await analyzer.analyzeScanResults(mockResults, 'ibnusaad.com');
        console.log('\n📄 Report:\n', report);
    }

    test().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}
