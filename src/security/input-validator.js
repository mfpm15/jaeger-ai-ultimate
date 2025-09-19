/**
 * Input Validation & Security Module for Jaeger AI
 *
 * This module provides comprehensive input validation and security measures
 * to protect against common attack vectors including injection attacks,
 * malformed inputs, and malicious payloads.
 */

const validator = require('validator');
const xss = require('xss');

class InputValidator {
    /**
     * Validate and sanitize target input (IP, domain, URL)
     * @param {string} target - Target to validate
     * @returns {Object} Validation result
     */
    static validateTarget(target) {
        if (!target || typeof target !== 'string') {
            throw new Error('Target is required and must be a string');
        }

        // Remove excessive whitespace and normalize
        const cleaned = target.trim().toLowerCase();

        if (cleaned.length === 0) {
            throw new Error('Target cannot be empty');
        }

        if (cleaned.length > 255) {
            throw new Error('Target too long (max 255 characters)');
        }

        // Check for dangerous characters that could be used for injection
        const dangerousChars = /[;&|`$(){}[\]\\<>"']/;
        if (dangerousChars.test(cleaned)) {
            throw new Error('Target contains potentially dangerous characters');
        }

        // Validate different target types
        const validation = {
            original: target.trim(),
            cleaned: cleaned,
            type: null,
            isValid: false
        };

        // Check if it's an IP address
        if (this.isValidIP(cleaned)) {
            validation.type = 'ip';
            validation.isValid = true;
            validation.cleaned = cleaned;
        }
        // Check if it's a domain
        else if (this.isValidDomain(cleaned)) {
            validation.type = 'domain';
            validation.isValid = true;
            validation.cleaned = cleaned;
        }
        // Check if it's a URL
        else if (this.isValidURL(target.trim())) {
            validation.type = 'url';
            validation.isValid = true;
            validation.cleaned = target.trim(); // Preserve case for URLs
        }
        else {
            throw new Error('Invalid target format. Must be a valid IP address, domain, or URL');
        }

        return validation;
    }

    /**
     * Validate IP address
     * @param {string} ip - IP address to validate
     * @returns {boolean} True if valid IP
     */
    static isValidIP(ip) {
        // Check IPv4
        if (validator.isIP(ip, 4)) {
            // Additional checks for private/reserved ranges
            const parts = ip.split('.').map(Number);

            // Block certain ranges for security
            if (
                // Loopback
                (parts[0] === 127) ||
                // Link-local
                (parts[0] === 169 && parts[1] === 254) ||
                // Multicast
                (parts[0] >= 224 && parts[0] <= 239) ||
                // Reserved
                (parts[0] >= 240)
            ) {
                throw new Error('IP address is in a restricted range');
            }

            return true;
        }

        // Check IPv6
        if (validator.isIP(ip, 6)) {
            // Block certain IPv6 ranges
            if (
                ip.startsWith('::1') ||  // Loopback
                ip.startsWith('fe80:') || // Link-local
                ip.startsWith('ff00:')    // Multicast
            ) {
                throw new Error('IPv6 address is in a restricted range');
            }

            return true;
        }

        return false;
    }

    /**
     * Validate domain name
     * @param {string} domain - Domain to validate
     * @returns {boolean} True if valid domain
     */
    static isValidDomain(domain) {
        // Basic domain validation
        if (!validator.isFQDN(domain, {
            require_tld: true,
            allow_underscores: false,
            allow_trailing_dot: false
        })) {
            return false;
        }

        // Additional security checks
        const parts = domain.split('.');

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /localhost/i,
            /internal/i,
            /private/i,
            /admin/i,
            /test/i,
            /dev/i,
            /staging/i
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(domain)) {
                throw new Error('Domain appears to be internal or restricted');
            }
        }

        // Check minimum parts (domain + TLD)
        if (parts.length < 2) {
            return false;
        }

        // Validate each part
        for (const part of parts) {
            if (part.length === 0 || part.length > 63) {
                return false;
            }

            if (part.startsWith('-') || part.endsWith('-')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    static isValidURL(url) {
        if (!validator.isURL(url, {
            protocols: ['http', 'https'],
            require_protocol: true,
            require_host: true,
            require_valid_protocol: true,
            allow_underscores: false,
            allow_trailing_dot: false,
            allow_protocol_relative_urls: false
        })) {
            return false;
        }

        try {
            const urlObj = new URL(url);

            // Security checks
            if (
                urlObj.hostname === 'localhost' ||
                urlObj.hostname === '127.0.0.1' ||
                urlObj.hostname.startsWith('192.168.') ||
                urlObj.hostname.startsWith('10.') ||
                urlObj.hostname.startsWith('172.')
            ) {
                throw new Error('URL points to a private or restricted address');
            }

            // Check for suspicious ports
            const suspiciousPorts = [22, 23, 25, 53, 110, 143, 993, 995];
            if (urlObj.port && suspiciousPorts.includes(parseInt(urlObj.port))) {
                throw new Error('URL uses a potentially restricted port');
            }

            return true;
        } catch (error) {
            if (error.message.includes('private') || error.message.includes('restricted')) {
                throw error;
            }
            return false;
        }
    }

    /**
     * Validate and sanitize tool parameters
     * @param {string} toolName - Name of the tool
     * @param {Object} params - Parameters to validate
     * @returns {Object} Sanitized parameters
     */
    static validateToolParams(toolName, params = {}) {
        const sanitized = {};

        // Define allowed parameters for each tool
        const allowedParams = {
            nmap: ['ports', 'scan_type', 'timing', 'output_format'],
            gobuster: ['wordlist', 'extensions', 'status_codes', 'threads'],
            nuclei: ['severity', 'tags', 'templates', 'rate_limit'],
            subfinder: ['sources', 'passive', 'recursive'],
            nikto: ['plugins', 'tuning', 'timeout'],
            sqlmap: ['level', 'risk', 'technique', 'dbms']
        };

        const toolParams = allowedParams[toolName] || [];

        for (const [key, value] of Object.entries(params)) {
            // Check if parameter is allowed
            if (!toolParams.includes(key)) {
                throw new Error(`Parameter '${key}' is not allowed for tool '${toolName}'`);
            }

            // Sanitize the value
            const sanitizedValue = this.sanitizeValue(value);
            if (sanitizedValue !== null) {
                sanitized[key] = sanitizedValue;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize individual parameter values
     * @param {any} value - Value to sanitize
     * @returns {any} Sanitized value
     */
    static sanitizeValue(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            // Remove dangerous characters
            let sanitized = value.replace(/[;&|`$(){}[\]\\<>"']/g, '');

            // Remove excessive whitespace
            sanitized = sanitized.trim();

            // Check length
            if (sanitized.length === 0 || sanitized.length > 1000) {
                throw new Error('Parameter value is empty or too long');
            }

            // XSS protection
            sanitized = xss(sanitized, {
                whiteList: {}, // No HTML tags allowed
                stripIgnoreTag: true,
                stripIgnoreTagBody: ['script']
            });

            return sanitized;
        }

        if (typeof value === 'number') {
            // Validate numeric ranges
            if (!Number.isFinite(value) || value < 0 || value > 1000000) {
                throw new Error('Numeric parameter out of allowed range');
            }
            return value;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        throw new Error('Unsupported parameter type');
    }

    /**
     * Validate command injection attempts
     * @param {string} input - Input to check
     * @returns {boolean} True if safe
     */
    static validateCommandSafety(input) {
        const dangerousPatterns = [
            // Command injection
            /[;&|`$()]/,
            // Path traversal
            /\.\.\//,
            // Shell commands
            /\b(rm|del|format|shutdown|reboot|kill|pkill)\b/i,
            // Script execution
            /\b(bash|sh|cmd|powershell|python|perl|ruby)\b/i,
            // Network commands
            /\b(curl|wget|nc|netcat|telnet|ssh)\b/i,
            // File operations
            /\b(cat|less|more|head|tail|grep|awk|sed)\b/i
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(input)) {
                throw new Error('Input contains potentially dangerous command patterns');
            }
        }

        return true;
    }

    /**
     * Validate file paths to prevent directory traversal
     * @param {string} filePath - File path to validate
     * @returns {string} Sanitized path
     */
    static validateFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('File path is required and must be a string');
        }

        // Remove dangerous patterns
        const sanitized = filePath
            .replace(/\.\.\//g, '') // Remove ../ patterns
            .replace(/\.\.\\/g, '') // Remove ..\ patterns
            .replace(/[<>:"|?*]/g, '') // Remove Windows forbidden chars
            .trim();

        if (sanitized.length === 0) {
            throw new Error('File path is empty after sanitization');
        }

        // Check for absolute paths to system directories
        const forbiddenPaths = [
            '/etc/',
            '/var/',
            '/usr/',
            '/bin/',
            '/sbin/',
            '/boot/',
            '/dev/',
            '/proc/',
            '/sys/',
            'C:\\Windows\\',
            'C:\\System32\\',
            'C:\\Program Files\\'
        ];

        for (const forbidden of forbiddenPaths) {
            if (sanitized.toLowerCase().startsWith(forbidden.toLowerCase())) {
                throw new Error('Access to system directories is not allowed');
            }
        }

        return sanitized;
    }

    /**
     * Rate limiting check
     * @param {string} identifier - User/IP identifier
     * @param {number} limit - Request limit
     * @param {number} window - Time window in milliseconds
     * @returns {boolean} True if within limits
     */
    static checkRateLimit(identifier, limit = 10, window = 60000) {
        const now = Date.now();
        const key = `rate_limit_${identifier}`;

        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map();
        }

        const record = this.rateLimitStore.get(key) || { count: 0, resetTime: now + window };

        if (now > record.resetTime) {
            // Reset the window
            record.count = 1;
            record.resetTime = now + window;
        } else {
            record.count++;
        }

        this.rateLimitStore.set(key, record);

        if (record.count > limit) {
            throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds`);
        }

        return true;
    }

    /**
     * Validate session token
     * @param {string} token - Session token to validate
     * @returns {boolean} True if valid
     */
    static validateSessionToken(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }

        // Check format (should be alphanumeric)
        if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
            return false;
        }

        // Check length
        if (token.length < 16 || token.length > 128) {
            return false;
        }

        return true;
    }

    /**
     * Sanitize output for display
     * @param {string} output - Output to sanitize
     * @returns {string} Sanitized output
     */
    static sanitizeOutput(output) {
        if (!output || typeof output !== 'string') {
            return '';
        }

        // Remove or escape potentially dangerous content
        let sanitized = output
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n')
            .trim();

        // Limit length
        if (sanitized.length > 10000) {
            sanitized = sanitized.substring(0, 10000) + '\n[... output truncated ...]';
        }

        // XSS protection for any HTML content
        sanitized = xss(sanitized, {
            whiteList: {
                code: [],
                pre: [],
                strong: [],
                em: [],
                br: []
            },
            stripIgnoreTag: true
        });

        return sanitized;
    }

    /**
     * Validate JSON input
     * @param {string} jsonString - JSON string to validate
     * @param {number} maxDepth - Maximum object depth
     * @returns {Object} Parsed JSON
     */
    static validateJSON(jsonString, maxDepth = 10) {
        if (!jsonString || typeof jsonString !== 'string') {
            throw new Error('Invalid JSON input');
        }

        if (jsonString.length > 100000) {
            throw new Error('JSON input too large');
        }

        try {
            const parsed = JSON.parse(jsonString);

            // Check depth
            function checkDepth(obj, depth = 0) {
                if (depth > maxDepth) {
                    throw new Error('JSON object too deeply nested');
                }

                if (obj && typeof obj === 'object') {
                    for (const value of Object.values(obj)) {
                        checkDepth(value, depth + 1);
                    }
                }
            }

            checkDepth(parsed);
            return parsed;

        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    }
}

module.exports = InputValidator;