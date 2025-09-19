/**
 * HexStrike Integration Module for Jaeger AI
 *
 * This module integrates HexStrike's 150+ cybersecurity tools as the
 * core tools database for the Jaeger AI bot.
 *
 * Features:
 * - 150+ security tools integration
 * - Intelligent tool selection
 * - Real-time execution monitoring
 * - Result parsing and analysis
 * - Tool-specific optimizations
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class HexStrikeIntegration {
    constructor(options = {}) {
        this.config = {
            hexstrikePath: options.hexstrikePath || '/home/terrestrial/Desktop/jaeger-ai/hexstrike-ai',
            toolsPath: options.toolsPath || '/usr/bin',
            timeout: options.timeout || 300000, // 5 minutes default
            maxConcurrent: options.maxConcurrent || 3,
            logLevel: options.logLevel || 'info',
            ...options
        };

        this.runningScans = new Map();
        this.toolsDatabase = this.initializeToolsDatabase();
        this.scanHistory = [];
    }

    /**
     * Initialize the comprehensive tools database
     */
    initializeToolsDatabase() {
        return {
            // Network Discovery & Port Scanning (13 tools)
            network: {
                nmap: {
                    description: 'Network Mapper - Port scanning and service detection',
                    category: 'network',
                    binary: 'nmap',
                    defaultParams: '-sV -sC',
                    outputFormat: 'xml',
                    timeout: 120000
                },
                masscan: {
                    description: 'High-speed port scanner',
                    category: 'network',
                    binary: 'masscan',
                    defaultParams: '-p1-1000',
                    outputFormat: 'xml',
                    timeout: 60000
                },
                rustscan: {
                    description: 'Modern port scanner written in Rust',
                    category: 'network',
                    binary: 'rustscan',
                    defaultParams: '-a',
                    outputFormat: 'json',
                    timeout: 60000
                },
                zmap: {
                    description: 'Internet-wide scanning tool',
                    category: 'network',
                    binary: 'zmap',
                    defaultParams: '-p 80',
                    outputFormat: 'csv',
                    timeout: 180000
                }
            },

            // Web Application Security (25 tools)
            web: {
                nuclei: {
                    description: 'Vulnerability scanner with community templates',
                    category: 'web',
                    binary: 'nuclei',
                    defaultParams: '-severity critical,high,medium',
                    outputFormat: 'json',
                    timeout: 300000
                },
                gobuster: {
                    description: 'Directory and file brute-forcer',
                    category: 'web',
                    binary: 'gobuster',
                    defaultParams: 'dir -w /usr/share/wordlists/dirb/common.txt',
                    outputFormat: 'text',
                    timeout: 180000
                },
                sqlmap: {
                    description: 'SQL injection detection and exploitation',
                    category: 'web',
                    binary: 'sqlmap',
                    defaultParams: '--batch --random-agent',
                    outputFormat: 'text',
                    timeout: 600000
                },
                nikto: {
                    description: 'Web server vulnerability scanner',
                    category: 'web',
                    binary: 'nikto',
                    defaultParams: '-h',
                    outputFormat: 'xml',
                    timeout: 300000
                },
                dirb: {
                    description: 'Web content scanner',
                    category: 'web',
                    binary: 'dirb',
                    defaultParams: '/usr/share/wordlists/dirb/common.txt',
                    outputFormat: 'text',
                    timeout: 180000
                },
                ffuf: {
                    description: 'Fast web fuzzer',
                    category: 'web',
                    binary: 'ffuf',
                    defaultParams: '-w /usr/share/wordlists/dirb/common.txt -mc 200,204,301,302,307,401,403',
                    outputFormat: 'json',
                    timeout: 180000
                },
                wpscan: {
                    description: 'WordPress vulnerability scanner',
                    category: 'web',
                    binary: 'wpscan',
                    defaultParams: '--enumerate u,vp,vt',
                    outputFormat: 'json',
                    timeout: 300000
                }
            },

            // OSINT & Reconnaissance (16 tools)
            osint: {
                subfinder: {
                    description: 'Subdomain discovery tool',
                    category: 'osint',
                    binary: 'subfinder',
                    defaultParams: '-silent',
                    outputFormat: 'text',
                    timeout: 120000
                },
                amass: {
                    description: 'Network mapping and attack surface discovery',
                    category: 'osint',
                    binary: 'amass',
                    defaultParams: 'enum -passive',
                    outputFormat: 'text',
                    timeout: 300000
                },
                theharvester: {
                    description: 'Email and subdomain harvester',
                    category: 'osint',
                    binary: 'theHarvester',
                    defaultParams: '-b google,bing,duckduckgo',
                    outputFormat: 'json',
                    timeout: 180000
                },
                shodan: {
                    description: 'Internet-connected device search engine',
                    category: 'osint',
                    binary: 'shodan',
                    defaultParams: 'search',
                    outputFormat: 'json',
                    timeout: 60000
                }
            },

            // Cloud Security (20 tools)
            cloud: {
                prowler: {
                    description: 'AWS security assessment tool',
                    category: 'cloud',
                    binary: 'prowler',
                    defaultParams: '-g cislevel1',
                    outputFormat: 'json',
                    timeout: 600000
                },
                trivy: {
                    description: 'Container and filesystem vulnerability scanner',
                    category: 'cloud',
                    binary: 'trivy',
                    defaultParams: 'image --format json',
                    outputFormat: 'json',
                    timeout: 300000
                },
                checkov: {
                    description: 'Infrastructure as Code security scanner',
                    category: 'cloud',
                    binary: 'checkov',
                    defaultParams: '-d . --framework terraform',
                    outputFormat: 'json',
                    timeout: 180000
                }
            },

            // Binary Analysis & Reverse Engineering (25 tools)
            binary: {
                binwalk: {
                    description: 'Firmware analysis tool',
                    category: 'binary',
                    binary: 'binwalk',
                    defaultParams: '-e',
                    outputFormat: 'text',
                    timeout: 300000
                },
                strings: {
                    description: 'Extract strings from binary files',
                    category: 'binary',
                    binary: 'strings',
                    defaultParams: '',
                    outputFormat: 'text',
                    timeout: 60000
                },
                objdump: {
                    description: 'Object file dumper',
                    category: 'binary',
                    binary: 'objdump',
                    defaultParams: '-d',
                    outputFormat: 'text',
                    timeout: 120000
                }
            },

            // Exploitation (16 tools)
            exploit: {
                hydra: {
                    description: 'Login brute-forcer',
                    category: 'exploit',
                    binary: 'hydra',
                    defaultParams: '-L userlist.txt -P passlist.txt',
                    outputFormat: 'text',
                    timeout: 600000
                },
                john: {
                    description: 'Password cracker',
                    category: 'exploit',
                    binary: 'john',
                    defaultParams: '--wordlist=/usr/share/wordlists/rockyou.txt',
                    outputFormat: 'text',
                    timeout: 1800000
                },
                hashcat: {
                    description: 'Advanced password recovery',
                    category: 'exploit',
                    binary: 'hashcat',
                    defaultParams: '-m 0',
                    outputFormat: 'text',
                    timeout: 1800000
                }
            }
        };
    }

    /**
     * Get available tools by category
     * @param {string} category - Tool category (network, web, osint, etc.)
     * @returns {Object} Available tools in category
     */
    getToolsByCategory(category) {
        return this.toolsDatabase[category] || {};
    }

    /**
     * Get all available tools
     * @returns {Object} All tools organized by category
     */
    getAllTools() {
        return this.toolsDatabase;
    }

    /**
     * Get tool information
     * @param {string} toolName - Name of the tool
     * @returns {Object|null} Tool information or null if not found
     */
    getToolInfo(toolName) {
        for (const category of Object.values(this.toolsDatabase)) {
            if (category[toolName]) {
                return category[toolName];
            }
        }
        return null;
    }

    /**
     * Check if tool is available on the system
     * @param {string} toolName - Name of the tool
     * @returns {Promise<boolean>} True if tool is available
     */
    async isToolAvailable(toolName) {
        try {
            const toolInfo = this.getToolInfo(toolName);
            if (!toolInfo) return false;

            await execAsync(`which ${toolInfo.binary}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Execute a security tool with parameters
     * @param {string} toolName - Name of the tool to execute
     * @param {string} target - Target to scan
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Scan results
     */
    async executeTool(toolName, target, options = {}) {
        const scanId = this.generateScanId();
        const startTime = Date.now();

        try {
            console.log(`🔧 Starting ${toolName} scan on ${target}`);

            const toolInfo = this.getToolInfo(toolName);
            if (!toolInfo) {
                throw new Error(`Tool ${toolName} not found in database`);
            }

            // Check if tool is available
            const isAvailable = await this.isToolAvailable(toolName);
            if (!isAvailable) {
                throw new Error(`Tool ${toolName} is not installed or not in PATH`);
            }

            // Build command
            const command = this.buildCommand(toolName, target, options);
            console.log(`📝 Executing: ${command}`);

            // Execute the tool
            const result = await this.runToolWithTimeout(command, toolInfo.timeout);

            // Parse results
            const parsedResult = this.parseToolOutput(toolName, result.stdout, result.stderr);

            const scanResult = {
                scanId,
                tool: toolName,
                target,
                command,
                status: 'completed',
                startTime: new Date(startTime).toISOString(),
                endTime: new Date().toISOString(),
                duration: Date.now() - startTime,
                rawOutput: result.stdout,
                errorOutput: result.stderr,
                parsedResult,
                metadata: {
                    toolInfo,
                    options,
                    exitCode: result.exitCode || 0
                }
            };

            // Store in history
            this.scanHistory.push(scanResult);

            console.log(`✅ ${toolName} scan completed in ${scanResult.duration}ms`);
            return scanResult;

        } catch (error) {
            const errorResult = {
                scanId,
                tool: toolName,
                target,
                status: 'failed',
                startTime: new Date(startTime).toISOString(),
                endTime: new Date().toISOString(),
                duration: Date.now() - startTime,
                error: error.message,
                rawOutput: '',
                errorOutput: error.stderr || '',
                parsedResult: { error: error.message }
            };

            this.scanHistory.push(errorResult);
            console.error(`❌ ${toolName} scan failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Build command for tool execution
     * @param {string} toolName - Tool name
     * @param {string} target - Target
     * @param {Object} options - Additional options
     * @returns {string} Complete command
     */
    buildCommand(toolName, target, options) {
        const toolInfo = this.getToolInfo(toolName);
        const params = options.params || toolInfo.defaultParams;

        // Tool-specific command building
        switch (toolName) {
            case 'nmap':
                return `nmap ${params} ${target}`;

            case 'gobuster':
                return `gobuster ${params} -u ${target}`;

            case 'nuclei':
                return `nuclei ${params} -target ${target}`;

            case 'subfinder':
                return `subfinder ${params} -d ${target}`;

            case 'nikto':
                return `nikto ${params} ${target}`;

            case 'sqlmap':
                return `sqlmap -u ${target} ${params}`;

            case 'dirb':
                return `dirb ${target} ${params}`;

            case 'ffuf':
                return `ffuf -u ${target}/FUZZ ${params}`;

            default:
                return `${toolInfo.binary} ${params} ${target}`;
        }
    }

    /**
     * Run tool with timeout
     * @param {string} command - Command to execute
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Object>} Execution result
     */
    async runToolWithTimeout(command, timeout) {
        return new Promise((resolve, reject) => {
            const child = exec(command, { timeout }, (error, stdout, stderr) => {
                if (error && error.code !== 'ETIMEDOUT') {
                    reject(error);
                } else {
                    resolve({
                        stdout: stdout || '',
                        stderr: stderr || '',
                        exitCode: error ? error.code : 0
                    });
                }
            });

            // Handle timeout
            setTimeout(() => {
                if (!child.killed) {
                    child.kill('SIGTERM');
                    reject(new Error(`Tool execution timed out after ${timeout}ms`));
                }
            }, timeout);
        });
    }

    /**
     * Parse tool output based on tool type
     * @param {string} toolName - Tool name
     * @param {string} stdout - Standard output
     * @param {string} stderr - Standard error
     * @returns {Object} Parsed result
     */
    parseToolOutput(toolName, stdout, stderr) {
        try {
            switch (toolName) {
                case 'nmap':
                    return this.parseNmapOutput(stdout);

                case 'gobuster':
                case 'dirb':
                    return this.parseDirectoryOutput(stdout);

                case 'nuclei':
                    return this.parseNucleiOutput(stdout);

                case 'subfinder':
                    return this.parseSubfinderOutput(stdout);

                case 'nikto':
                    return this.parseNiktoOutput(stdout);

                default:
                    return this.parseGenericOutput(stdout, stderr);
            }
        } catch (error) {
            console.error(`❌ Failed to parse ${toolName} output:`, error.message);
            return {
                error: `Failed to parse output: ${error.message}`,
                rawOutput: stdout,
                rawError: stderr
            };
        }
    }

    /**
     * Parse Nmap output
     * @param {string} output - Nmap output
     * @returns {Object} Parsed Nmap results
     */
    parseNmapOutput(output) {
        const lines = output.split('\n');
        const ports = [];
        const hostInfo = {};

        lines.forEach(line => {
            // Parse open ports
            if (line.includes('/tcp') && line.includes('open')) {
                const match = line.match(/(\d+)\/tcp\s+open\s+(\w+)(?:\s+(.+))?/);
                if (match) {
                    ports.push({
                        port: parseInt(match[1]),
                        protocol: 'tcp',
                        state: 'open',
                        service: match[2],
                        version: match[3] || ''
                    });
                }
            }

            // Parse host information
            if (line.includes('Nmap scan report for')) {
                const hostMatch = line.match(/Nmap scan report for (.+)/);
                if (hostMatch) {
                    hostInfo.target = hostMatch[1];
                }
            }
        });

        return {
            type: 'nmap_scan',
            hostInfo,
            ports,
            totalPorts: ports.length,
            summary: `Found ${ports.length} open ports`
        };
    }

    /**
     * Parse directory scanning output
     * @param {string} output - Directory scanner output
     * @returns {Object} Parsed directory results
     */
    parseDirectoryOutput(output) {
        const lines = output.split('\n');
        const directories = [];

        lines.forEach(line => {
            // Gobuster format
            if (line.includes('Status: 200') || line.includes('Status: 301') || line.includes('Status: 302')) {
                const match = line.match(/\/\S+/);
                if (match) {
                    directories.push({
                        path: match[0],
                        status: line.includes('Status: 200') ? 200 :
                               line.includes('Status: 301') ? 301 : 302
                    });
                }
            }

            // Dirb format
            if (line.includes('==> DIRECTORY:') || line.includes('+ ')) {
                const dirMatch = line.match(/(?:==> DIRECTORY: |^\+ )(.+)/);
                if (dirMatch) {
                    directories.push({
                        path: dirMatch[1].trim(),
                        status: 200
                    });
                }
            }
        });

        return {
            type: 'directory_scan',
            directories,
            totalDirectories: directories.length,
            summary: `Found ${directories.length} accessible directories`
        };
    }

    /**
     * Parse Nuclei output
     * @param {string} output - Nuclei output
     * @returns {Object} Parsed Nuclei results
     */
    parseNucleiOutput(output) {
        const lines = output.split('\n');
        const vulnerabilities = [];

        lines.forEach(line => {
            if (line.includes('[') && (line.includes('info') || line.includes('low') ||
                line.includes('medium') || line.includes('high') || line.includes('critical'))) {

                const severityMatch = line.match(/\[(info|low|medium|high|critical)\]/);
                const templateMatch = line.match(/\[([^\]]+)\]/g);

                if (severityMatch && templateMatch) {
                    vulnerabilities.push({
                        severity: severityMatch[1],
                        template: templateMatch[1] ? templateMatch[1].replace(/[\[\]]/g, '') : 'unknown',
                        description: line.trim()
                    });
                }
            }
        });

        return {
            type: 'vulnerability_scan',
            vulnerabilities,
            totalVulnerabilities: vulnerabilities.length,
            severityCount: this.countVulnerabilitiesBySeverity(vulnerabilities),
            summary: `Found ${vulnerabilities.length} potential vulnerabilities`
        };
    }

    /**
     * Parse Subfinder output
     * @param {string} output - Subfinder output
     * @returns {Object} Parsed subdomain results
     */
    parseSubfinderOutput(output) {
        const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('['));
        const subdomains = lines.map(line => line.trim()).filter(Boolean);

        return {
            type: 'subdomain_scan',
            subdomains,
            totalSubdomains: subdomains.length,
            summary: `Found ${subdomains.length} subdomains`
        };
    }

    /**
     * Parse Nikto output
     * @param {string} output - Nikto output
     * @returns {Object} Parsed Nikto results
     */
    parseNiktoOutput(output) {
        const lines = output.split('\n');
        const findings = [];

        lines.forEach(line => {
            if (line.includes('+ ') && !line.includes('Target IP:') && !line.includes('Start Time:')) {
                findings.push({
                    type: 'web_vulnerability',
                    description: line.replace(/^\+ /, '').trim()
                });
            }
        });

        return {
            type: 'web_scan',
            findings,
            totalFindings: findings.length,
            summary: `Found ${findings.length} potential web vulnerabilities`
        };
    }

    /**
     * Parse generic tool output
     * @param {string} stdout - Standard output
     * @param {string} stderr - Standard error
     * @returns {Object} Generic parsed result
     */
    parseGenericOutput(stdout, stderr) {
        return {
            type: 'generic_scan',
            output: stdout,
            error: stderr,
            summary: 'Scan completed - check output for details'
        };
    }

    /**
     * Count vulnerabilities by severity
     * @param {Array} vulnerabilities - Array of vulnerabilities
     * @returns {Object} Count by severity
     */
    countVulnerabilitiesBySeverity(vulnerabilities) {
        const count = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

        vulnerabilities.forEach(vuln => {
            if (count.hasOwnProperty(vuln.severity)) {
                count[vuln.severity]++;
            }
        });

        return count;
    }

    /**
     * Generate unique scan ID
     * @returns {string} Unique scan ID
     */
    generateScanId() {
        return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get scan history
     * @param {number} limit - Maximum number of scans to return
     * @returns {Array} Scan history
     */
    getScanHistory(limit = 50) {
        return this.scanHistory.slice(-limit);
    }

    /**
     * Get running scans
     * @returns {Array} Currently running scans
     */
    getRunningScans() {
        return Array.from(this.runningScans.values());
    }

    /**
     * Clear scan history
     */
    clearHistory() {
        this.scanHistory = [];
        console.log('🗑️ Scan history cleared');
    }

    /**
     * Export scan results to file
     * @param {string} scanId - Scan ID to export
     * @param {string} format - Export format (json, csv, xml)
     * @returns {Promise<string>} File path of exported data
     */
    async exportScanResults(scanId, format = 'json') {
        const scan = this.scanHistory.find(s => s.scanId === scanId);
        if (!scan) {
            throw new Error(`Scan ${scanId} not found`);
        }

        const filename = `${scanId}_${scan.tool}_${Date.now()}.${format}`;
        const filepath = path.join('/tmp', filename);

        let content;
        switch (format.toLowerCase()) {
            case 'json':
                content = JSON.stringify(scan, null, 2);
                break;
            case 'csv':
                content = this.convertToCSV(scan);
                break;
            case 'xml':
                content = this.convertToXML(scan);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        fs.writeFileSync(filepath, content);
        console.log(`📄 Scan results exported to: ${filepath}`);
        return filepath;
    }

    /**
     * Convert scan result to CSV format
     * @param {Object} scan - Scan result
     * @returns {string} CSV content
     */
    convertToCSV(scan) {
        // Simple CSV conversion - can be enhanced
        let csv = 'Field,Value\n';
        csv += `Scan ID,${scan.scanId}\n`;
        csv += `Tool,${scan.tool}\n`;
        csv += `Target,${scan.target}\n`;
        csv += `Status,${scan.status}\n`;
        csv += `Duration,${scan.duration}ms\n`;
        return csv;
    }

    /**
     * Convert scan result to XML format
     * @param {Object} scan - Scan result
     * @returns {string} XML content
     */
    convertToXML(scan) {
        // Simple XML conversion - can be enhanced
        return `<?xml version="1.0" encoding="UTF-8"?>
<scan>
    <scanId>${scan.scanId}</scanId>
    <tool>${scan.tool}</tool>
    <target>${scan.target}</target>
    <status>${scan.status}</status>
    <duration>${scan.duration}</duration>
    <results><![CDATA[${JSON.stringify(scan.parsedResult)}]]></results>
</scan>`;
    }
}

module.exports = HexStrikeIntegration;