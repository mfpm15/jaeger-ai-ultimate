/**
 * Natural Language Processing Module for Jaeger AI
 *
 * This module processes natural language input from users and determines
 * the intent, extracts targets, and suggests appropriate security tools.
 */

class IntentClassifier {
    constructor() {
        this.intents = {
            // Scanning intents
            scan: {
                keywords: [
                    'scan', 'scanning', 'scanner', 'check', 'analyze', 'analysis',
                    'test', 'testing', 'audit', 'assess', 'assessment', 'examine',
                    'investigate', 'lookup', 'find vulnerabilities', 'security check',
                    'pentest', 'penetration test', 'vulnerability scan'
                ],
                indonesian: [
                    'scan', 'pindai', 'analisis', 'periksa', 'cek', 'test', 'tes',
                    'audit', 'assessment', 'evaluasi', 'uji', 'teliti'
                ]
            },

            // Network scanning
            network: {
                keywords: [
                    'port', 'ports', 'nmap', 'network', 'service', 'services',
                    'open ports', 'port scan', 'network scan', 'host discovery',
                    'ping', 'traceroute', 'netstat'
                ],
                indonesian: [
                    'port', 'jaringan', 'network', 'layanan', 'service'
                ]
            },

            // Web application testing
            web: {
                keywords: [
                    'website', 'web', 'http', 'https', 'url', 'domain',
                    'web application', 'webapp', 'sql injection', 'xss',
                    'directory', 'directories', 'files', 'path', 'endpoint',
                    'gobuster', 'nuclei', 'nikto', 'sqlmap'
                ],
                indonesian: [
                    'website', 'web', 'situs', 'aplikasi web', 'domain'
                ]
            },

            // OSINT and reconnaissance
            osint: {
                keywords: [
                    'subdomain', 'subdomains', 'reconnaissance', 'recon', 'osint',
                    'information gathering', 'footprinting', 'enumeration',
                    'subfinder', 'amass', 'theharvester', 'shodan', 'dns'
                ],
                indonesian: [
                    'subdomain', 'reconnaissance', 'pengumpulan informasi', 'dns'
                ]
            },

            // Vulnerability assessment
            vulnerability: {
                keywords: [
                    'vulnerability', 'vulnerabilities', 'vuln', 'vulns', 'cve',
                    'exploit', 'exploits', 'weakness', 'security hole', 'bug',
                    'flaw', 'issue', 'critical', 'high risk'
                ],
                indonesian: [
                    'kerentanan', 'vulnerability', 'celah keamanan', 'bug', 'eksploit'
                ]
            },

            // Help and information
            help: {
                keywords: [
                    'help', 'assistance', 'guide', 'how to', 'tutorial',
                    'commands', 'features', 'capabilities', 'what can you do'
                ],
                indonesian: [
                    'bantuan', 'help', 'panduan', 'cara', 'gimana', 'bagaimana'
                ]
            }
        };

        this.targetPatterns = {
            ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
            domain: /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g,
            url: /https?:\/\/[^\s]+/g,
            cidr: /\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g
        };
    }

    /**
     * Process natural language input and extract intent and targets
     * @param {string} input - User input text
     * @returns {Object} Processing result
     */
    processInput(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Input is required and must be a string');
        }

        const normalizedInput = input.toLowerCase().trim();

        const result = {
            originalInput: input,
            normalizedInput: normalizedInput,
            intent: this.classifyIntent(normalizedInput),
            targets: this.extractTargets(input),
            suggestedTools: [],
            confidence: 0,
            response: ''
        };

        // Generate suggested tools based on intent
        result.suggestedTools = this.suggestTools(result.intent, result.targets);

        // Calculate confidence score
        result.confidence = this.calculateConfidence(result);

        // Generate natural language response
        result.response = this.generateResponse(result);

        return result;
    }

    /**
     * Classify user intent from natural language
     * @param {string} input - Normalized input
     * @returns {Array} Classified intents with scores
     */
    classifyIntent(input) {
        const intents = [];

        for (const [intentName, intentData] of Object.entries(this.intents)) {
            let score = 0;
            const allKeywords = [...intentData.keywords, ...intentData.indonesian];

            for (const keyword of allKeywords) {
                if (input.includes(keyword.toLowerCase())) {
                    // Exact match gets higher score
                    if (input === keyword.toLowerCase()) {
                        score += 10;
                    }
                    // Word boundary match gets medium score
                    else if (new RegExp(`\\b${keyword.toLowerCase()}\\b`).test(input)) {
                        score += 5;
                    }
                    // Partial match gets lower score
                    else {
                        score += 2;
                    }
                }
            }

            if (score > 0) {
                intents.push({
                    intent: intentName,
                    score: score,
                    confidence: Math.min(score / 10, 1.0)
                });
            }
        }

        // Sort by score descending
        return intents.sort((a, b) => b.score - a.score);
    }

    /**
     * Extract targets (IPs, domains, URLs) from input
     * @param {string} input - Original input
     * @returns {Object} Extracted targets
     */
    extractTargets(input) {
        const targets = {
            ips: [],
            domains: [],
            urls: [],
            cidrs: []
        };

        // Extract IPs
        const ipMatches = input.match(this.targetPatterns.ip);
        if (ipMatches) {
            targets.ips = [...new Set(ipMatches)];
        }

        // Extract domains
        const domainMatches = input.match(this.targetPatterns.domain);
        if (domainMatches) {
            // Filter out IPs from domain matches
            targets.domains = [...new Set(domainMatches.filter(match =>
                !this.targetPatterns.ip.test(match)
            ))];
        }

        // Extract URLs
        const urlMatches = input.match(this.targetPatterns.url);
        if (urlMatches) {
            targets.urls = [...new Set(urlMatches)];
        }

        // Extract CIDR ranges
        const cidrMatches = input.match(this.targetPatterns.cidr);
        if (cidrMatches) {
            targets.cidrs = [...new Set(cidrMatches)];
        }

        return targets;
    }

    /**
     * Suggest appropriate tools based on intent and targets
     * @param {Array} intents - Classified intents
     * @param {Object} targets - Extracted targets
     * @returns {Array} Suggested tools
     */
    suggestTools(intents, targets) {
        const suggestions = [];

        if (intents.length === 0) {
            return [{
                tool: 'general',
                reason: 'No specific intent detected',
                priority: 'low'
            }];
        }

        const primaryIntent = intents[0];

        switch (primaryIntent.intent) {
            case 'scan':
                // General scanning - suggest comprehensive tools
                if (targets.domains.length > 0 || targets.urls.length > 0) {
                    suggestions.push(
                        { tool: 'nuclei', reason: 'Comprehensive vulnerability scanning', priority: 'high' },
                        { tool: 'nmap', reason: 'Port and service discovery', priority: 'high' },
                        { tool: 'gobuster', reason: 'Directory and file discovery', priority: 'medium' },
                        { tool: 'subfinder', reason: 'Subdomain enumeration', priority: 'medium' }
                    );
                }
                if (targets.ips.length > 0) {
                    suggestions.push(
                        { tool: 'nmap', reason: 'Network scanning for IP targets', priority: 'high' },
                        { tool: 'nuclei', reason: 'Vulnerability assessment', priority: 'high' }
                    );
                }
                break;

            case 'network':
                suggestions.push(
                    { tool: 'nmap', reason: 'Network discovery and port scanning', priority: 'high' },
                    { tool: 'masscan', reason: 'High-speed port scanning', priority: 'medium' }
                );
                break;

            case 'web':
                suggestions.push(
                    { tool: 'nuclei', reason: 'Web vulnerability scanning', priority: 'high' },
                    { tool: 'gobuster', reason: 'Web directory discovery', priority: 'high' },
                    { tool: 'nikto', reason: 'Web server analysis', priority: 'medium' },
                    { tool: 'sqlmap', reason: 'SQL injection testing', priority: 'medium' }
                );
                break;

            case 'osint':
                suggestions.push(
                    { tool: 'subfinder', reason: 'Subdomain discovery', priority: 'high' },
                    { tool: 'amass', reason: 'Advanced reconnaissance', priority: 'high' },
                    { tool: 'theharvester', reason: 'Email and domain harvesting', priority: 'medium' }
                );
                break;

            case 'vulnerability':
                suggestions.push(
                    { tool: 'nuclei', reason: 'Vulnerability detection with latest templates', priority: 'high' },
                    { tool: 'nmap', reason: 'Service version detection', priority: 'medium' }
                );
                break;

            case 'help':
                suggestions.push(
                    { tool: 'help', reason: 'Show available commands and features', priority: 'high' }
                );
                break;

            default:
                suggestions.push(
                    { tool: 'general', reason: 'General security assessment', priority: 'medium' }
                );
        }

        return suggestions;
    }

    /**
     * Calculate confidence score for the overall analysis
     * @param {Object} result - Processing result
     * @returns {number} Confidence score (0-1)
     */
    calculateConfidence(result) {
        let confidence = 0;

        // Intent confidence
        if (result.intent.length > 0) {
            confidence += result.intent[0].confidence * 0.6;
        }

        // Target detection confidence
        const totalTargets = result.targets.ips.length +
                           result.targets.domains.length +
                           result.targets.urls.length +
                           result.targets.cidrs.length;

        if (totalTargets > 0) {
            confidence += Math.min(totalTargets / 3, 1.0) * 0.4;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Generate natural language response
     * @param {Object} result - Processing result
     * @returns {string} Natural language response
     */
    generateResponse(result) {
        const { intent, targets, suggestedTools, confidence } = result;

        if (confidence < 0.3) {
            return "Maaf, saya tidak yakin dengan maksud Anda. Bisa dijelaskan lebih detail? Contoh: 'scan google.com' atau 'analisis keamanan 192.168.1.1'";
        }

        if (intent.length === 0) {
            return "Saya akan membantu Anda dengan analisis keamanan umum.";
        }

        const primaryIntent = intent[0].intent;
        const totalTargets = targets.ips.length + targets.domains.length + targets.urls.length + targets.cidrs.length;

        let response = "";

        // Intent-based response
        switch (primaryIntent) {
            case 'scan':
                response = "🎯 Saya akan melakukan scanning komprehensif";
                break;
            case 'network':
                response = "🌐 Saya akan melakukan analisis jaringan";
                break;
            case 'web':
                response = "🌍 Saya akan melakukan pengujian keamanan web";
                break;
            case 'osint':
                response = "🔍 Saya akan melakukan reconnaissance dan pengumpulan informasi";
                break;
            case 'vulnerability':
                response = "🛡️ Saya akan mencari kerentanan keamanan";
                break;
            case 'help':
                return "ℹ️ Saya adalah Jaeger AI, bot cybersecurity yang dapat membantu Anda melakukan security testing. Cukup ketik target yang ingin di-scan, contoh: 'scan google.com' atau 'analisis 192.168.1.1'";
            default:
                response = "🔧 Saya akan melakukan analisis keamanan";
        }

        // Add target information
        if (totalTargets > 0) {
            const targetList = [];
            if (targets.domains.length > 0) targetList.push(`domain: ${targets.domains.join(', ')}`);
            if (targets.ips.length > 0) targetList.push(`IP: ${targets.ips.join(', ')}`);
            if (targets.urls.length > 0) targetList.push(`URL: ${targets.urls.join(', ')}`);
            if (targets.cidrs.length > 0) targetList.push(`CIDR: ${targets.cidrs.join(', ')}`);

            response += ` pada ${targetList.join(' dan ')}`;
        }

        // Add suggested tools
        if (suggestedTools.length > 0) {
            const highPriorityTools = suggestedTools
                .filter(t => t.priority === 'high')
                .map(t => t.tool)
                .slice(0, 3);

            if (highPriorityTools.length > 0) {
                response += `\n\n🔧 Tools yang akan digunakan: ${highPriorityTools.join(', ')}`;
            }
        }

        response += "\n\n⚡ Memulai proses scanning...";

        return response;
    }

    /**
     * Get all possible targets from result
     * @param {Object} result - Processing result
     * @returns {Array} All targets
     */
    getAllTargets(result) {
        const allTargets = [];

        allTargets.push(...result.targets.domains);
        allTargets.push(...result.targets.ips);
        allTargets.push(...result.targets.urls);
        allTargets.push(...result.targets.cidrs);

        return [...new Set(allTargets)];
    }

    /**
     * Check if input is a simple greeting
     * @param {string} input - User input
     * @returns {boolean} True if greeting
     */
    isGreeting(input) {
        const greetings = [
            'hi', 'hello', 'hey', 'halo', 'hai', 'selamat', 'good morning',
            'good afternoon', 'good evening', 'apa kabar', 'how are you'
        ];

        const normalizedInput = input.toLowerCase().trim();
        return greetings.some(greeting =>
            normalizedInput.includes(greeting) && normalizedInput.length < 50
        );
    }

    /**
     * Generate example inputs for testing
     * @returns {Array} Example inputs
     */
    getExampleInputs() {
        return [
            "scan google.com",
            "analisis keamanan facebook.com",
            "periksa port 192.168.1.1",
            "cari subdomain dari example.com",
            "test sql injection pada https://target.com/login",
            "vulnerability assessment untuk website.com",
            "nmap scan 10.0.0.1",
            "reconnaissance terhadap company.com",
            "audit keamanan aplikasi web",
            "cek celah keamanan di target.org"
        ];
    }
}

module.exports = IntentClassifier;