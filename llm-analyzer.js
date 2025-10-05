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
    constructor() {
        // API Keys from environment
        this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
        this.chimeraApiKey = process.env.CHIMERA_API_KEY || '';
        this.zAiApiKey = process.env.ZAI_API_KEY || '';

        // API Endpoints
        this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
        this.chimeraUrl = process.env.CHIMERA_API_URL || '';
        this.zAiUrl = process.env.ZAI_API_URL || '';

        // Default to OpenRouter (supports multiple models including DeepSeek)
        this.primaryLLM = this.openrouterApiKey ? 'openrouter' : 'deepseek';
        this.model = 'deepseek/deepseek-chat'; // Default model for OpenRouter
    }

    /**
     * Analyze user request to extract security testing intent
     */
    async analyzeUserRequest(userMessage) {
        console.log(`🧠 LLM analyzing user request: "${userMessage}"`);

        const prompt = `You are a cybersecurity expert assistant. Analyze the user's request and extract:
1. Target (domain/IP/URL)
2. Scan objective (reconnaissance, vulnerability_hunting, comprehensive, quick, stealth, osint, etc.)
3. Specific tools requested (if any)
4. Analysis type preference

User request: "${userMessage}"

Respond ONLY with JSON in this exact format:
{
    "target": "extracted target URL/domain/IP",
    "objective": "reconnaissance|vulnerability_hunting|comprehensive|quick|stealth|osint",
    "specific_tools": ["tool1", "tool2"] or [],
    "analysis_type": "quick|comprehensive|stealth",
    "user_intent": "brief description of what user wants"
}`;

        try {
            const result = await this.callLLM(prompt);

            // Parse JSON response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('❌ LLM response not in JSON format');
                return this.fallbackAnalysis(userMessage);
            }

            const analysis = JSON.parse(jsonMatch[0]);
            console.log('✅ LLM Analysis:', JSON.stringify(analysis, null, 2));

            return analysis;
        } catch (error) {
            console.error('❌ LLM analysis failed:', error.message);
            return this.fallbackAnalysis(userMessage);
        }
    }

    /**
     * Analyze scan results and create user-friendly report
     */
    async analyzeScanResults(scanResults, target) {
        console.log(`🧠 LLM analyzing scan results for ${target}...`);

        const prompt = `You are a cybersecurity expert. Analyze these penetration testing results and create a clear, actionable report.

Target: ${target}
Scan Results:
${JSON.stringify(scanResults, null, 2)}

Create a report with:
1. Executive Summary (2-3 sentences about overall security posture)
2. Critical Findings (vulnerabilities found with severity HIGH/CRITICAL)
3. Medium/Low Findings (other issues discovered)
4. Recommendations (specific actions to take)
5. Technical Details (ports, services, technologies detected)

Format the response in clear sections with emojis for better readability.
Keep it concise but informative - suitable for Telegram message (max 4000 chars).`;

        try {
            const report = await this.callLLM(prompt);
            console.log('✅ LLM Report generated');
            return report;
        } catch (error) {
            console.error('❌ LLM report generation failed:', error.message);
            return this.fallbackReport(scanResults, target);
        }
    }

    /**
     * Call LLM API (using primary LLM)
     */
    async callLLM(prompt, model = null) {
        const llm = model || this.primaryLLM;

        switch(llm) {
            case 'openrouter':
                return await this.callOpenRouter(prompt);
            case 'deepseek':
                return await this.callDeepSeek(prompt);
            case 'chimera':
                return await this.callChimera(prompt);
            case 'zai':
                return await this.callZAI(prompt);
            default:
                return await this.callOpenRouter(prompt);
        }
    }

    /**
     * OpenRouter API call (supports multiple models)
     */
    async callOpenRouter(prompt, model = null) {
        if (!this.openrouterApiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const selectedModel = model || this.model;

        const response = await fetch(this.openrouterUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openrouterApiKey}`,
                'HTTP-Referer': 'https://github.com/jaeger-ai',
                'X-Title': 'Jaeger AI Security Bot'
            },
            body: JSON.stringify({
                model: selectedModel,
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
            throw new Error(`OpenRouter API error: ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
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

        // Determine objective from keywords
        let objective = 'comprehensive';
        if (message.includes('quick') || message.includes('cepat')) {
            objective = 'quick';
        } else if (message.includes('recon') || message.includes('reconnaissance')) {
            objective = 'reconnaissance';
        } else if (message.includes('vuln') || message.includes('vulnerability')) {
            objective = 'vulnerability_hunting';
        } else if (message.includes('osint')) {
            objective = 'osint';
        }

        return {
            target: target || 'unknown',
            objective: objective,
            specific_tools: [],
            analysis_type: objective === 'quick' ? 'quick' : 'comprehensive',
            user_intent: userMessage
        };
    }

    /**
     * Fallback report when LLM fails
     */
    fallbackReport(scanResults, target) {
        console.log('⚠️ Using fallback report (no LLM)');

        let report = `🎯 Security Scan Report - ${target}\n\n`;
        report += `📊 Scan completed at ${new Date().toLocaleString()}\n\n`;

        if (scanResults.tools_executed) {
            report += `🔧 Tools executed: ${scanResults.tools_executed.length}\n`;
            scanResults.tools_executed.forEach(tool => {
                report += `   • ${tool}\n`;
            });
            report += '\n';
        }

        if (scanResults.findings) {
            report += `🔍 Findings:\n${JSON.stringify(scanResults.findings, null, 2)}\n\n`;
        }

        report += `📋 Full results available in detailed output.`;

        return report;
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
