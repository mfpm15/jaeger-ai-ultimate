#!/usr/bin/env node

/**
 * JAEGER INTELLIGENCE BRIDGE
 *
 * Purpose: Bridge to Jaeger AI Intelligence Engine
 * Menggunakan Jaeger AI Decision Engine untuk auto tool selection & execution
 *
 * Jaeger Intelligence API Endpoints:
 * - /api/intelligence/analyze-target - Analyze target profile
 * - /api/intelligence/select-tools - Auto select best tools
 * - /api/intelligence/optimize-parameters - Optimize tool parameters
 * - /api/intelligence/smart-scan - Execute intelligent scan
 * - /api/intelligence/technology-detection - Detect technologies
 * - /api/bugbounty/reconnaissance-workflow - Full recon workflow
 * - /api/bugbounty/vulnerability-hunting-workflow - Vuln hunting
 * - /api/bugbounty/osint-workflow - OSINT workflow
 */

const fetch = require('node-fetch');

class JaegerIntelligence {
    constructor(baseUrl = 'http://127.0.0.1:8888') {
        this.baseUrl = baseUrl;
        this.timeout = 180000; // 3 minutes - faster response for better UX
    }

    /**
     * Normalize user-provided target into a domain/IP acceptable by Jaeger API
     */
    static normalizeTarget(input) {
        if (!input) {
            return '';
        }

        const value = String(input).trim();
        if (!value) {
            return '';
        }

        const ipMatch = value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
        if (ipMatch) {
            return ipMatch[0];
        }

        const domainMatch = value.match(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}/i);
        if (domainMatch) {
            return domainMatch[0].toLowerCase();
        }

        // Handle domain-like strings and strip protocol/path
        try {
            const url = new URL(value.includes('://') ? value : `http://${value}`);
            return url.hostname || value;
        } catch (_) {
            return value
                .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
                .split(/[\s/]/)[0]
                .trim();
        }
    }

    /**
     * Check Jaeger server health
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                timeout: 5000
            });

            if (!response.ok) {
                return { status: 'unhealthy', error: 'Server returned error' };
            }

            const data = await response.json();
            return {
                status: 'healthy',
                tools_available: data.total_tools_available,
                uptime: data.uptime,
                version: data.version
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    /**
     * Analyze target using Jaeger Intelligence
     */
    async analyzeTarget(target, analysisType = 'quick') {
        const normalizedTarget = JaegerIntelligence.normalizeTarget(target);

        if (!normalizedTarget) {
            console.error('❌ Target analysis error: Target domain is missing');
            return {
                success: false,
                error: 'Target domain is missing'
            };
        }

        console.log(`🎯 Analyzing target: ${normalizedTarget} (${analysisType})`);

        try {
            const response = await fetch(`${this.baseUrl}/api/intelligence/analyze-target`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target: normalizedTarget,
                    analysis_type: analysisType
                }),
                timeout: 30000 // 30 seconds for analysis
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Target analysis failed: ${error}`);
            }

            const data = await response.json();
            console.log(`✅ Target analyzed: ${data.target_profile.target_type}, Risk: ${data.target_profile.risk_level}`);

            return {
                success: true,
                profile: data.target_profile,
                timestamp: data.timestamp
            };
        } catch (error) {
            console.error(`❌ Target analysis error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Auto-select tools using Jaeger Intelligence
     */
    async selectTools(target, objective = 'comprehensive') {
        const normalizedTarget = JaegerIntelligence.normalizeTarget(target);

        if (!normalizedTarget) {
            console.error('❌ Tool selection error: Target domain is missing');
            return {
                success: false,
                error: 'Target domain is missing',
                tools: []
            };
        }

        console.log(`🔧 Selecting tools for ${normalizedTarget} (objective: ${objective})`);

        try {
            const response = await fetch(`${this.baseUrl}/api/intelligence/select-tools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target: normalizedTarget,
                    objective: objective
                }),
                timeout: 15000
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Tool selection failed: ${error}`);
            }

            const data = await response.json();
            console.log(`✅ ${data.tool_count} tools selected: ${data.selected_tools.slice(0, 5).join(', ')}${data.tool_count > 5 ? '...' : ''}`);

            return {
                success: true,
                tools: data.selected_tools,
                count: data.tool_count,
                profile: data.target_profile
            };
        } catch (error) {
            console.error(`❌ Tool selection error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                tools: []
            };
        }
    }

    /**
     * Execute smart scan using Jaeger Intelligence
     * This is the MAIN method - uses AI to analyze, select tools, and execute
     */
    async smartScan(target, objective = 'comprehensive', options = {}) {
        const normalizedTarget = JaegerIntelligence.normalizeTarget(target);

        if (!normalizedTarget) {
            console.error('❌ Smart scan error: Target domain is missing');
            return {
                success: false,
                error: 'Target domain is missing'
            };
        }

        console.log(`🚀 Starting smart scan: ${normalizedTarget}`);
        console.log(`   Objective: ${objective}`);
        console.log(`   Options:`, options);

        try {
            const response = await fetch(`${this.baseUrl}/api/intelligence/smart-scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target: normalizedTarget,
                    objective: objective,
                    ...options
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Smart scan failed: ${error}`);
            }

            const data = await response.json();
            const scanResults = data.scan_results || {};
            const toolsExecuted = Array.isArray(scanResults.tools_executed) ? scanResults.tools_executed : [];
            const summary = scanResults.execution_summary || {};

            console.log(`✅ Smart scan completed!`);
            console.log(`   Tools executed: ${toolsExecuted.length}`);
            console.log(`   Duration: ${summary.total_execution_time || 'unknown'}s`);

            return {
                success: data.success !== false,
                target: scanResults.target || normalizedTarget,
                profile: scanResults.target_profile,
                execution_summary: summary,
                tools_executed: toolsExecuted,
                combined_output: scanResults.combined_output || '',
                total_vulnerabilities: scanResults.total_vulnerabilities || 0,
                execution_time: summary.total_execution_time,
                selected_tools: Array.isArray(summary.tools_used)
                    ? summary.tools_used
                    : toolsExecuted.map((tool) => tool.tool).filter(Boolean),
                timestamp: data.timestamp,
                raw: data
            };
        } catch (error) {
            console.error(`❌ Smart scan error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute bug bounty reconnaissance workflow
     */
    async reconWorkflow(target, depth = 'standard') {
        console.log(`🔍 Starting reconnaissance workflow: ${target}`);

        try {
            const domain = JaegerIntelligence.normalizeTarget(target);
            if (!domain) {
                throw new Error('Target domain is missing');
            }

            const response = await fetch(`${this.baseUrl}/api/bugbounty/reconnaissance-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: domain,
                    depth: depth // quick, standard, deep
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Recon workflow failed: ${error}`);
            }

            const data = await response.json();
            console.log(`✅ Reconnaissance completed!`);

            return {
                success: true,
                ...data
            };
        } catch (error) {
            console.error(`❌ Recon workflow error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute vulnerability hunting workflow
     */
    async vulnHuntingWorkflow(target, focus = 'all') {
        console.log(`🎯 Starting vulnerability hunting: ${target}`);

        try {
            const domain = JaegerIntelligence.normalizeTarget(target);
            if (!domain) {
                throw new Error('Target domain is missing');
            }

            const response = await fetch(`${this.baseUrl}/api/bugbounty/vulnerability-hunting-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: domain,
                    focus: focus // all, web, network, api
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Vuln hunting failed: ${error}`);
            }

            const data = await response.json();
            console.log(`✅ Vulnerability hunting completed!`);

            return {
                success: true,
                ...data
            };
        } catch (error) {
            console.error(`❌ Vuln hunting error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute OSINT workflow
     */
    async osintWorkflow(target) {
        console.log(`🕵️ Starting OSINT workflow: ${target}`);

        try {
            const domain = JaegerIntelligence.normalizeTarget(target);
            if (!domain) {
                throw new Error('Target domain is missing');
            }

            const response = await fetch(`${this.baseUrl}/api/bugbounty/osint-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: domain
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OSINT workflow failed: ${error}`);
            }

            const data = await response.json();
            console.log(`✅ OSINT completed!`);

            return {
                success: true,
                ...data
            };
        } catch (error) {
            console.error(`❌ OSINT workflow error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detect technologies on target
     */
    async detectTechnology(target) {
        const normalizedTarget = JaegerIntelligence.normalizeTarget(target);

        if (!normalizedTarget) {
            console.error('❌ Technology detection error: Target domain is missing');
            return {
                success: false,
                error: 'Target domain is missing'
            };
        }

        console.log(`🔬 Detecting technologies: ${normalizedTarget}`);

        try {
            const response = await fetch(`${this.baseUrl}/api/intelligence/technology-detection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target: normalizedTarget
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Technology detection failed: ${error}`);
            }

            const data = await response.json();
            console.log(`✅ Technologies detected!`);

            return {
                success: true,
                ...data
            };
        } catch (error) {
            console.error(`❌ Technology detection error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute single tool with optimized parameters
     */
    async executeSingleTool(toolName, target) {
        const normalizedTarget = JaegerIntelligence.normalizeTarget(target);

        if (!normalizedTarget) {
            console.error('❌ Single tool execution error: Target domain is missing');
            return {
                success: false,
                error: 'Target domain is missing'
            };
        }

        console.log(`⚡ Executing single tool: ${toolName} on ${normalizedTarget}`);

        try {
            // First optimize parameters
            const optimizeResponse = await fetch(`${this.baseUrl}/api/intelligence/optimize-parameters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tool: toolName,
                    target: normalizedTarget
                }),
                timeout: Math.min(this.timeout, 60000)
            });

            let command = `${toolName} ${normalizedTarget}`;
            if (optimizeResponse.ok) {
                const optimizeData = await optimizeResponse.json();
                if (optimizeData.optimized_command) {
                    command = optimizeData.optimized_command;
                }
            }

            console.log(`   Optimized command: ${command}`);

            // Execute command
            const response = await fetch(`${this.baseUrl}/api/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: command,
                    use_cache: false
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Tool execution failed: ${error}`);
            }

            const data = await response.json();
            const exitCode = data.return_code !== undefined ? data.return_code : data.exit_code;

            return {
                success: data.success || exitCode === 0,
                output: data.stdout || data.output || '',
                error: data.stderr || '',
                exit_code: exitCode,
                command: command
            };
        } catch (error) {
            console.error(`❌ Tool execution error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                output: ''
            };
        }
    }
}

module.exports = JaegerIntelligence;

// Standalone testing
if (require.main === module) {
    const jaeger = new JaegerIntelligence();

    async function test() {
        console.log('🧪 Testing Jaeger Intelligence Bridge\n');

        // Test 1: Health check
        console.log('1️⃣ Testing health check...');
        const health = await jaeger.checkHealth();
        console.log('   Result:', health);

        if (health.status !== 'healthy') {
            console.error('❌ Jaeger server not healthy!');
            process.exit(1);
        }

        // Test 2: Analyze target
        console.log('\n2️⃣ Testing target analysis...');
        const analysis = await jaeger.analyzeTarget('scanme.nmap.org', 'quick');
        console.log('   Result:', JSON.stringify(analysis, null, 2));

        // Test 3: Select tools
        console.log('\n3️⃣ Testing tool selection...');
        const selection = await jaeger.selectTools('scanme.nmap.org', 'quick');
        console.log('   Result:', selection);

        // Test 4: Technology detection
        console.log('\n4️⃣ Testing technology detection...');
        const tech = await jaeger.detectTechnology('scanme.nmap.org');
        console.log('   Result:', JSON.stringify(tech, null, 2));

        console.log('\n✅ All tests completed!');
    }

    test().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}
