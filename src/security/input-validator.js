const path = require('path');

const RATE_LIMIT_BUCKET = new Map();
const RATE_LIMIT_SWEEP_MS = 60 * 60 * 1000;
let lastSweep = Date.now();

function sweepRateLimitStore(now = Date.now()) {
    if (now - lastSweep < RATE_LIMIT_SWEEP_MS) {
        return;
    }
    for (const [key, entry] of RATE_LIMIT_BUCKET.entries()) {
        if (now - entry.firstRequest >= entry.window) {
            RATE_LIMIT_BUCKET.delete(key);
        }
    }
    lastSweep = now;
}

class InputValidator {
    static sanitizeOutput(output) {
        if (typeof output !== 'string') {
            return '';
        }
        return output
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static validateFilePath(filePath) {
        if (typeof filePath !== 'string' || !filePath.trim()) {
            throw new Error('Invalid file path');
        }
        const normalized = path.normalize(filePath.trim());
        if (normalized.includes('..')) {
            throw new Error('Path traversal detected');
        }
        return normalized;
    }

    static isValidURL(url) {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch (error) {
            return false;
        }
    }

    static isValidDomain(domain) {
        if (typeof domain !== 'string') return false;
        const regex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
        return regex.test(domain.trim());
    }

    static validateTarget(target) {
        if (typeof target !== 'string' || !target.trim()) {
            throw new Error('Target is required');
        }

        const trimmed = target.trim();
        if (this.isValidURL(trimmed)) {
            return {
                original: trimmed,
                cleaned: trimmed,
                type: 'url'
            };
        }

        if (this.isValidDomain(trimmed)) {
            return {
                original: trimmed,
                cleaned: trimmed.toLowerCase(),
                type: 'domain'
            };
        }

        const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
        if (ipRegex.test(trimmed)) {
            return {
                original: trimmed,
                cleaned: trimmed,
                type: 'ip'
            };
        }

        throw new Error('Invalid target format');
    }

    static checkRateLimit(identifier, limit = 10, window = 60_000) {
        if (!identifier) {
            return true;
        }

        const now = Date.now();
        sweepRateLimitStore(now);

        const entry = RATE_LIMIT_BUCKET.get(identifier) || {
            count: 0,
            firstRequest: now,
            window
        };

        if (now - entry.firstRequest >= window) {
            entry.count = 0;
            entry.firstRequest = now;
        }

        entry.count += 1;
        entry.window = window;
        RATE_LIMIT_BUCKET.set(identifier, entry);

        if (entry.count > limit) {
            throw new Error('Rate limit exceeded');
        }

        return true;
    }
}

module.exports = InputValidator;
