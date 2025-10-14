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
 * Create JSON response with CORS
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: corsHeaders
    });
}
