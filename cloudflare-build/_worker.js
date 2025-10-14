/**
 * JAEGER AI - Cloudflare Workers API Handler
 * Replaces PHP handler.php with JavaScript
 */

// Configuration - CHANGE THIS TO YOUR VPS IP/DOMAIN
const JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888';
const API_TIMEOUT = 180000; // 3 minutes

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders,
                status: 204
            });
        }

        // Only handle POST requests to /api/handler.php
        if (request.method !== 'POST' || !url.pathname.includes('/api/handler')) {
            return new Response('Not Found', { status: 404 });
        }

        try {
            // Parse request body
            const body = await request.json();
            const action = body.action;

            if (!action) {
                return jsonResponse({ success: false, error: 'Missing action parameter' }, 400);
            }

            // Route actions
            let result;
            switch (action) {
                case 'health':
                    result = await proxyToJaeger('/health', {}, 'GET');
                    break;

                case 'smart_scan':
                    const scanData = {
                        target: body.target,
                        objective: body.objective || 'quick',
                        max_tools: body.max_tools || 5,
                        context: body.context || {
                            request_timeout: 180,
                            retry_on_timeout: true
                        }
                    };

                    if (body.specific_tools && Array.isArray(body.specific_tools)) {
                        scanData.specific_tools = body.specific_tools;
                    }

                    result = await proxyToJaeger('/api/intelligence/smart-scan', scanData);
                    break;

                case 'analyze_target':
                    result = await proxyToJaeger('/api/intelligence/analyze-target', {
                        target: body.target,
                        analysis_type: body.analysis_type || 'quick'
                    });
                    break;

                case 'select_tools':
                    result = await proxyToJaeger('/api/intelligence/select-tools', {
                        target: body.target,
                        objective: body.objective || 'quick'
                    });
                    break;

                case 'recon_workflow':
                    result = await proxyToJaeger('/api/bugbounty/reconnaissance-workflow', {
                        domain: body.target,
                        depth: body.depth || 'standard'
                    });
                    break;

                case 'vuln_workflow':
                    result = await proxyToJaeger('/api/bugbounty/vulnerability-hunting-workflow', {
                        domain: body.target,
                        focus: body.focus || 'all'
                    });
                    break;

                case 'osint_workflow':
                    result = await proxyToJaeger('/api/bugbounty/osint-workflow', {
                        domain: body.target
                    });
                    break;

                case 'tech_detection':
                    result = await proxyToJaeger('/api/intelligence/technology-detection', {
                        target: body.target
                    });
                    break;

                case 'llm_analyze':
                    result = await analyzeScanWithLLM(body.scan_results, body.target, env);
                    break;

                default:
                    return jsonResponse({
                        success: false,
                        error: 'Invalid action',
                        available_actions: ['health', 'smart_scan', 'analyze_target', 'select_tools', 'recon_workflow', 'vuln_workflow', 'osint_workflow', 'tech_detection']
                    }, 400);
            }

            return jsonResponse(result);

        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({
                success: false,
                error: 'Internal server error',
                details: error.message
            }, 500);
        }
    }
};

/**
 * Proxy request to Jaeger MCP Server
 */
async function proxyToJaeger(endpoint, data = {}, method = 'POST') {
    const url = `${JAEGER_MCP_URL}${endpoint}`;

    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Jaeger-Cloudflare-Worker/1.0'
            },
            signal: AbortSignal.timeout(API_TIMEOUT)
        };

        if (method === 'POST') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}`,
                http_code: response.status
            };
        }

        return { success: true, data: result };

    } catch (error) {
        console.error(`Jaeger request failed: ${error.message}`);

        if (error.name === 'TimeoutError') {
            return {
                success: false,
                error: 'Request timeout - scan is taking too long',
                details: 'Consider using a shorter scan or check MCP server'
            };
        }

        return {
            success: false,
            error: 'Failed to connect to Jaeger server',
            details: error.message
        };
    }
}

/**
 * Analyze scan results with LLM (OpenRouter/DeepSeek)
 */
async function analyzeScanWithLLM(scanResults, target, env) {
    try {
        // Get OpenRouter API key from environment (Cloudflare secret)
        const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || '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';

        // Compact scan data
        const compactData = {
            target: target,
            total_vulnerabilities: scanResults.total_vulnerabilities || 0,
            tools: (scanResults.tools || []).slice(0, 8).map(tool => ({
                tool: tool.tool,
                success: tool.success,
                vulnerabilities_found: tool.vulnerabilities_found || 0
            }))
        };

        // Build LLM prompt (same template as llm-analyzer.js)
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
- Analisis HANYA tools yang dijalankan (${compactData.tools.map(t => t.tool).join(', ')}). Jangan menyebutkan tools yang tidak ada.`;

        // Call OpenRouter API (DeepSeek)
        const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://jaeger-ai.pages.dev',
                'X-Title': 'Jaeger AI Security Scanner'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
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
                temperature: 0.7,
                max_tokens: 8000
            })
        });

        if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            throw new Error(`OpenRouter API error: ${errorText}`);
        }

        const llmData = await llmResponse.json();
        let analysis = llmData.choices[0].message.content;

        // Clean up response - remove "Berikut adalah..." phrases
        analysis = analysis
            .replace(/^Berikut adalah.*?\n+/gmi, '')
            .replace(/^Berikut laporan.*?\n+/gmi, '')
            .replace(/^Berikut ini adalah.*?\n+/gmi, '')
            .replace(/^Berikut hasil.*?\n+/gmi, '')
            .trim();

        return {
            success: true,
            analysis: analysis
        };

    } catch (error) {
        console.error('LLM analysis error:', error);
        return {
            success: false,
            error: 'Failed to generate AI analysis',
            details: error.message
        };
    }
}

/**
 * Create JSON response with CORS
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: corsHeaders
    });
}
