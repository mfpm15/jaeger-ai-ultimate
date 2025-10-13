const fetch = require('node-fetch');

const DEFAULT_TIMEOUT_MIN = Number(process.env.DEFAULT_TIMEOUT_MIN || '10');
const DEFAULT_TIMEOUT_MS = Number(process.env.JAEGER_TIMEOUT_MS || (DEFAULT_TIMEOUT_MIN * 60 * 1000));

function getBaseUrl() {
    const base = process.env.JAEGER_MCP_URL;
    if (!base) {
        throw new Error('JAEGER_MCP_URL is not configured');
    }
    return base.endsWith('/') ? base.slice(0, -1) : base;
}

function getTimeout(timeoutMs) {
    if (timeoutMs && Number(timeoutMs) > 0) {
        return Number(timeoutMs);
    }
    return DEFAULT_TIMEOUT_MS > 0 ? DEFAULT_TIMEOUT_MS : 600000;
}

async function fetchJson(path, { method = 'GET', body, timeoutMs } = {}) {
    const controller = new AbortController();
    const timeout = getTimeout(timeoutMs);
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const baseUrl = getBaseUrl();
        const headers = { Accept: 'application/json' };
        let payload = body;

        if (body && typeof body === 'object') {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }

        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: payload,
            signal: controller.signal
        });

        const text = await response.text();
        let json;

        if (text) {
            try {
                json = JSON.parse(text);
            } catch (error) {
                const parseError = new Error(`Failed to parse Jaeger MCP response JSON: ${error.message}`);
                parseError.responseText = text;
                throw parseError;
            }
        } else {
            json = {};
        }

        if (!response.ok) {
            const error = new Error(json?.error || `Jaeger MCP request failed with status ${response.status}`);
            error.status = response.status;
            error.response = json;
            throw error;
        }

        return json;
    } finally {
        clearTimeout(timer);
    }
}

function mapIntentToObjective(intent = '') {
    const value = intent.toLowerCase();

    if (['blueteam', 'defense', 'monitor', 'stealth'].includes(value)) {
        return { objective: 'stealth', label: 'Stealth Monitoring', maxTools: 5 };
    }

    if (['osint', 'recon', 'subdomain', 'intelligence'].includes(value)) {
        return { objective: 'quick', label: 'Reconnaissance Focus', maxTools: 4 };
    }

    if (['vuln', 'vulnerability', 'web', 'bugbounty'].includes(value)) {
        return { objective: 'comprehensive', label: 'Vulnerability Hunting', maxTools: 8 };
    }

    if (['redteam', 'pentest', 'network'].includes(value)) {
        return { objective: 'comprehensive', label: 'Offensive Assessment', maxTools: 8 };
    }

    return { objective: 'comprehensive', label: 'Comprehensive Analysis', maxTools: 8 };
}

async function checkHealth() {
    return fetchJson('/health', { timeoutMs: 5000 });
}

async function detectTechnologies(target) {
    return fetchJson('/api/intelligence/technology-detection', {
        method: 'POST',
        body: { target },
        timeoutMs: 90000
    });
}

async function runSmartScan({ target, objective, maxTools, context, timeoutMs }) {
    const payload = {
        target,
        objective,
        max_tools: maxTools
    };

    if (context && typeof context === 'object') {
        payload.context = context;
    }

    return fetchJson('/api/intelligence/smart-scan', {
        method: 'POST',
        body: payload,
        timeoutMs
    });
}

function isConfigured() {
    return Boolean(process.env.JAEGER_MCP_URL);
}

module.exports = {
    isConfigured,
    mapIntentToObjective,
    checkHealth,
    detectTechnologies,
    runSmartScan
};
