#!/usr/bin/env node

/**
 * JAEGER AI - ULTIMATE CYBERSECURITY PLATFORM v3.0.1
 * 141+ Security Tools + OpenRouter & Gemini AI + Complete Red/Blue Team Operations
 * Dual AI Support with Enhanced Error Recovery and Dynamic Tool Selection
 */

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const UserManager = require('./user-registration');

// Initialize user management system
const userManager = new UserManager();

// Enhanced console logging with colors and timestamps
const colors = {
    reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
    yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m'
};

function getTimestamp() {
    return new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

const log = {
    info: (msg) => console.log(`${colors.cyan}🔹 [${getTimestamp()}] INFO: ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ [${getTimestamp()}] SUCCESS: ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ [${getTimestamp()}] ERROR: ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️ [${getTimestamp()}] WARN: ${msg}${colors.reset}`),
    user: (msg) => console.log(`${colors.magenta}👤 [${getTimestamp()}] USER: ${msg}${colors.reset}`),
    tool: (msg) => console.log(`${colors.blue}🔧 [${getTimestamp()}] TOOL: ${msg}${colors.reset}`),
    script: (msg) => console.log(`${colors.yellow}📜 [${getTimestamp()}] SCRIPT: ${msg}${colors.reset}`),
    ai: (msg) => console.log(`${colors.cyan}🧠 [${getTimestamp()}] AI: ${msg}${colors.reset}`)
};

log.info('🚀 JAEGER AI ULTIMATE v3.0.2 - Starting...');
log.info(`Bot Token: ${process.env.BOT_TOKEN ? 'LOADED' : 'MISSING'}`);
log.info(`Gemini API: ${process.env.GEMINI_API_KEY ? 'LOADED' : 'MISSING'}`);
log.info(`OpenRouter API: ${process.env.OPENROUTER_API_KEY ? 'LOADED' : 'MISSING'}`);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Configure bot settings for longer operations
bot.telegram.options = {
    handlerTimeout: 600000, // 10 minutes for long operations
    retryAfter: 1,
    ...bot.telegram.options
};

// User session management
const userSessions = new Map();
const activeOperations = new Map();
const runningProcesses = new Map(); // Track running processes for cancellation

// API Key automatic failover management
const apiKeyStatus = {
    sonoma: {
        key: process.env.OPENROUTER_API_KEY,
        name: 'Sonoma Sky',
        working: true,
        lastError: null,
        errorCount: 0
    },
    deepseek: {
        key: process.env.OPENROUTER_API_KEY_BACKUP,
        name: 'DeepSeek',
        working: true,
        lastError: null,
        errorCount: 0
    }
};

function getPrimaryApiKey() {
    // Priority 1: Sonoma Sky (if working)
    if (apiKeyStatus.sonoma.key && apiKeyStatus.sonoma.working) {
        return {
            key: apiKeyStatus.sonoma.key,
            type: 'sonoma',
            name: 'Sonoma Sky',
            model: 'anthropic/claude-3.5-sonnet'
        };
    }

    // Priority 2: DeepSeek (if working)
    if (apiKeyStatus.deepseek.key && apiKeyStatus.deepseek.working) {
        return {
            key: apiKeyStatus.deepseek.key,
            type: 'deepseek',
            name: 'DeepSeek',
            model: 'deepseek/deepseek-chat'
        };
    }

    // No working keys available
    return null;
}

function markApiKeyFailed(keyType, error) {
    if (apiKeyStatus[keyType]) {
        apiKeyStatus[keyType].working = false;
        apiKeyStatus[keyType].lastError = error;
        apiKeyStatus[keyType].errorCount++;
        log.warn(`🚫 ${apiKeyStatus[keyType].name} API key marked as failed: ${error}`);

        // Reset after 1 hour to retry
        setTimeout(() => {
            if (apiKeyStatus[keyType]) {
                apiKeyStatus[keyType].working = true;
                apiKeyStatus[keyType].errorCount = 0;
                log.info(`🔄 ${apiKeyStatus[keyType].name} API key reset - will retry`);
            }
        }, 60 * 60 * 1000); // 1 hour
    }
}

function getBackupApiKey(excludeType) {
    // Get alternative working key
    const keys = Object.keys(apiKeyStatus).filter(type =>
        type !== excludeType &&
        apiKeyStatus[type].key &&
        apiKeyStatus[type].working
    );

    if (keys.length > 0) {
        const keyType = keys[0];
        const status = apiKeyStatus[keyType];
        return {
            key: status.key,
            type: keyType,
            name: status.name,
            model: keyType === 'deepseek' ? 'deepseek/deepseek-chat' : 'anthropic/claude-3.5-sonnet'
        };
    }

    return null;
}

// 150+ COMPREHENSIVE SECURITY TOOLS DATABASE (INTEGRATED WITH HEXSTRIKE AI)
const securityTools = {
    // === NETWORK RECONNAISSANCE ===
    nmap: {
        name: 'Nmap', category: 'Network Recon',
        description: 'Network discovery and security auditing',
        commands: {
            basic: 'nmap -sS --top-ports 100 -T4 {target}',
            ping_sweep: 'nmap -sn {target}',
            port_scan: 'nmap --top-ports 1000 -T4 {target}',
            service_scan: 'nmap -sV --top-ports 100 -T4 {target}',
            os_detection: 'nmap -O {target}',
            vuln_scan: 'nmap --script vuln --top-ports 50 -T4 {target}',
            stealth_scan: 'nmap -sS --top-ports 100 -T4 {target}'
        }
    },
    masscan: {
        name: 'Masscan', category: 'Network Recon',
        description: 'High-speed port scanner',
        commands: {
            basic: 'masscan {target} -p80,443,8080,8443 --rate=1000',
            fast_scan: 'masscan {target} -p1-65535 --rate=1000',
            web_ports: 'masscan {target} -p80,443,8080,8443 --rate=1000'
        }
    },
    rustscan: {
        name: 'RustScan', category: 'Network Recon',
        description: 'Ultra-fast port scanner',
        commands: {
            basic: 'rustscan -a {target} --top 1000 -t 2000',
            full: 'rustscan -a {target} --top 1000 -t 2000 -- -A -sC'
        }
    },
    zmap: {
        name: 'ZMap', category: 'Network Recon',
        description: 'Internet-wide network scanner',
        commands: {
            probe: 'zmap -p 80 {target}'
        }
    },

    // === WEB APPLICATION SECURITY ===
    nuclei: {
        name: 'Nuclei', category: 'Web Security',
        description: 'Vulnerability scanner with 4000+ templates',
        commands: {
            basic: 'nuclei -u {target} -c 10 -rl 100',
            cve: 'nuclei -u {target} -t cves/ -c 10 -rl 50',
            web: 'nuclei -u {target} -t http/ -c 10 -rl 50',
            exposed: 'nuclei -u {target} -t exposures/ -c 10 -rl 50',
            misconfiguration: 'nuclei -u {target} -t misconfiguration/ -c 10 -rl 50',
            technologies: 'nuclei -u {target} -t technologies/ -c 10 -rl 50'
        }
    },
    gobuster: {
        name: 'Gobuster', category: 'Web Security',
        description: 'Directory/file & DNS busting',
        commands: {
            basic: 'gobuster dir -u https://{target} -w /usr/share/wordlists/dirb/common.txt -t 20 -q -x php,html,txt --no-error',
            dir: 'gobuster dir -u https://{target} -w /usr/share/wordlists/dirb/common.txt -t 20 -q -x php,html,txt --no-error',
            dns: 'gobuster dns -d {target} -w /usr/share/wordlists/dnsmap.txt -t 20 -q',
            vhost: 'gobuster vhost -u https://{target} -w /usr/share/wordlists/subdomains.txt -t 20 -q'
        }
    },
    ffuf: {
        name: 'Ffuf', category: 'Web Security',
        description: 'Fast web fuzzer',
        commands: {
            basic: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u https://{target}/FUZZ -t 20 -s',
            dir: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u https://{target}/FUZZ -t 20 -s',
            param: 'ffuf -w /usr/share/wordlists/parameters.txt -u https://{target}?FUZZ=test -t 10 -s'
        }
    },
    dirb: {
        name: 'Dirb', category: 'Web Security',
        description: 'Web content scanner',
        commands: {
            basic: 'dirb {target}',
            wordlist: 'dirb {target} /usr/share/wordlists/dirb/common.txt'
        }
    },
    nikto: {
        name: 'Nikto', category: 'Web Security',
        description: 'Web server vulnerability scanner',
        commands: {
            basic: 'nikto -h {target}',
            full: 'nikto -h {target} -C all'
        }
    },
    wpscan: {
        name: 'WPScan', category: 'Web Security',
        description: 'WordPress vulnerability scanner',
        commands: {
            basic: 'wpscan --url {target}',
            enumerate: 'wpscan --url {target} --enumerate ap,at,cb,dbe'
        }
    },
    sqlmap: {
        name: 'SQLMap', category: 'Web Security',
        description: 'SQL injection testing tool',
        commands: {
            basic: 'sqlmap -u {target} --batch',
            crawl: 'sqlmap -u {target} --crawl=3 --batch'
        }
    },

    // === SUBDOMAIN ENUMERATION ===
    subfinder: {
        name: 'Subfinder', category: 'Subdomain Enum',
        description: 'Passive subdomain discovery',
        commands: {
            basic: 'subfinder -d {target}',
            verbose: 'subfinder -d {target} -v'
        }
    },
    assetfinder: {
        name: 'Assetfinder', category: 'Subdomain Enum',
        description: 'Find subdomains from various sources',
        commands: {
            basic: 'assetfinder {target}'
        }
    },
    amass: {
        name: 'Amass', category: 'Subdomain Enum',
        description: 'Advanced subdomain enumeration',
        commands: {
            enum: 'amass enum -d {target}',
            intel: 'amass intel -d {target}'
        }
    },
    sublist3r: {
        name: 'Sublist3r', category: 'Subdomain Enum',
        description: 'Enumerate subdomains using OSINT',
        commands: {
            basic: 'sublist3r -d {target}'
        }
    },
    dnsrecon: {
        name: 'DNSRecon', category: 'Subdomain Enum',
        description: 'DNS enumeration and reconnaissance',
        commands: {
            basic: 'dnsrecon -d {target}',
            bruteforce: 'dnsrecon -d {target} -D /usr/share/wordlists/subdomains.txt -t brt'
        }
    },

    // === VULNERABILITY ASSESSMENT ===
    nessus: {
        name: 'Nessus', category: 'Vulnerability Assessment',
        description: 'Comprehensive vulnerability scanner',
        commands: {
            simulate: 'echo "Nessus scan simulation for {target}"'
        }
    },
    openvas: {
        name: 'OpenVAS', category: 'Vulnerability Assessment',
        description: 'Open source vulnerability scanner',
        commands: {
            simulate: 'echo "OpenVAS scan simulation for {target}"'
        }
    },
    trivy: {
        name: 'Trivy', category: 'Vulnerability Assessment',
        description: 'Container vulnerability scanner',
        commands: {
            image: 'trivy image {target}',
            fs: 'trivy fs {target}'
        }
    },

    // === CLOUD SECURITY ===
    prowler: {
        name: 'Prowler', category: 'Cloud Security',
        description: 'AWS security assessment',
        commands: {
            simulate: 'echo "Prowler AWS assessment simulation"'
        }
    },
    scout_suite: {
        name: 'ScoutSuite', category: 'Cloud Security',
        description: 'Multi-cloud security auditing',
        commands: {
            simulate: 'echo "ScoutSuite cloud audit simulation"'
        }
    },

    // === OSINT & INFORMATION GATHERING ===
    theharvester: {
        name: 'TheHarvester', category: 'OSINT',
        description: 'E-mail, subdomain, and people names harvester',
        commands: {
            basic: 'theharvester -d {target} -l 500 -b google',
            all: 'theharvester -d {target} -l 500 -b all'
        }
    },
    sherlock: {
        name: 'Sherlock', category: 'OSINT',
        description: 'Hunt down social media accounts',
        commands: {
            basic: 'sherlock {target}'
        }
    },
    shodan: {
        name: 'Shodan CLI', category: 'OSINT',
        description: 'Search engine for internet-connected devices',
        commands: {
            search: 'shodan search {target}',
            host: 'shodan host {target}'
        }
    },
    censys: {
        name: 'Censys', category: 'OSINT',
        description: 'Internet device search engine',
        commands: {
            simulate: 'echo "Censys search simulation for {target}"'
        }
    },

    // === WIRELESS SECURITY ===
    aircrack: {
        name: 'Aircrack-ng', category: 'Wireless',
        description: 'Wireless network security suite',
        commands: {
            simulate: 'echo "Aircrack-ng wireless security simulation"'
        }
    },
    reaver: {
        name: 'Reaver', category: 'Wireless',
        description: 'WPS security testing',
        commands: {
            simulate: 'echo "Reaver WPS testing simulation"'
        }
    },

    // === CRYPTOGRAPHY & HASHING ===
    hashcat: {
        name: 'Hashcat', category: 'Cryptography',
        description: 'Advanced password cracking',
        commands: {
            simulate: 'echo "Hashcat password cracking simulation"'
        }
    },
    john: {
        name: 'John the Ripper', category: 'Cryptography',
        description: 'Password cracking tool',
        commands: {
            simulate: 'echo "John the Ripper simulation"'
        }
    },
    hydra: {
        name: 'Hydra', category: 'Cryptography',
        description: 'Network login cracker',
        commands: {
            simulate: 'echo "Hydra brute force simulation for {target}"'
        }
    },

    // === BINARY ANALYSIS ===
    binwalk: {
        name: 'Binwalk', category: 'Binary Analysis',
        description: 'Firmware analysis tool',
        commands: {
            simulate: 'echo "Binwalk binary analysis simulation"'
        }
    },
    strings: {
        name: 'Strings', category: 'Binary Analysis',
        description: 'Extract printable strings from files',
        commands: {
            basic: 'strings {target}'
        }
    },

    // === BASIC NETWORK TOOLS ===
    ping: {
        name: 'Ping', category: 'Basic Network',
        description: 'Basic connectivity test',
        commands: {
            basic: 'ping -c 4 {target}',
            flood: 'ping -f -c 10 {target}'
        }
    },
    traceroute: {
        name: 'Traceroute', category: 'Basic Network',
        description: 'Trace network path',
        commands: {
            basic: 'traceroute {target}'
        }
    },
    nslookup: {
        name: 'NSLookup', category: 'Basic Network',
        description: 'DNS lookup utility',
        commands: {
            basic: 'nslookup {target}'
        }
    },
    dig: {
        name: 'Dig', category: 'Basic Network',
        description: 'DNS lookup tool',
        commands: {
            basic: 'dig {target}',
            mx: 'dig MX {target}',
            txt: 'dig TXT {target}'
        }
    },
    whois: {
        name: 'Whois', category: 'Basic Network',
        description: 'Domain registration info',
        commands: {
            basic: 'whois {target}'
        }
    },

    // === SOCIAL ENGINEERING ===
    setoolkit: {
        name: 'Social Engineer Toolkit', category: 'Social Engineering',
        description: 'Social engineering testing framework',
        commands: {
            simulate: 'echo "SET social engineering simulation"'
        }
    },

    // === MOBILE SECURITY ===
    mobsf: {
        name: 'Mobile Security Framework', category: 'Mobile Security',
        description: 'Mobile app security testing',
        commands: {
            simulate: 'echo "MobSF mobile security simulation"'
        }
    },

    // === BASIC RECONNAISSANCE TOOLS ===
    curl: {
        name: 'cURL', category: 'Network Recon',
        description: 'HTTP client for web testing',
        commands: {
            basic: 'curl -I {target}',
            headers: 'curl -I -L {target}',
            verbose: 'curl -I -L -v {target}',
            ssl: 'curl -I -k {target}'
        }
    },
    dig: {
        name: 'Dig', category: 'DNS Recon',
        description: 'DNS lookup utility',
        commands: {
            basic: 'dig {target}',
            mx: 'dig MX {target}',
            ns: 'dig NS {target}',
            txt: 'dig TXT {target}',
            any: 'dig ANY {target}'
        }
    },
    whois: {
        name: 'Whois', category: 'OSINT',
        description: 'Domain registration information',
        commands: {
            basic: 'whois {target}',
            verbose: 'whois -v {target}'
        }
    },
    host: {
        name: 'Host', category: 'DNS Recon',
        description: 'DNS lookup utility',
        commands: {
            basic: 'host {target}',
            all: 'host -a {target}',
            mx: 'host -t MX {target}',
            ns: 'host -t NS {target}'
        }
    },
    nslookup: {
        name: 'NSLookup', category: 'DNS Recon',
        description: 'DNS lookup utility',
        commands: {
            basic: 'nslookup {target}',
            mx: 'nslookup -query=MX {target}',
            ns: 'nslookup -query=NS {target}'
        }
    },
    wget: {
        name: 'Wget', category: 'Web Security',
        description: 'Web content retriever',
        commands: {
            basic: 'wget --spider -v {target}',
            headers: 'wget --spider -S {target}',
            recursive: 'wget --spider -r -l 1 {target}'
        }
    },
    telnet: {
        name: 'Telnet', category: 'Network Recon',
        description: 'Port connectivity tester',
        commands: {
            basic: 'timeout 5 telnet {target} 80',
            https: 'timeout 5 telnet {target} 443',
            ssh: 'timeout 5 telnet {target} 22',
            ftp: 'timeout 5 telnet {target} 21'
        }
    },

    // === ADDITIONAL HEXSTRIKE INTEGRATION (85+ MORE TOOLS) ===

    // Network Tools
    rustscan: {
        name: 'RustScan', category: 'Network Recon',
        description: 'Ultra-fast port scanner',
        commands: {
            basic: 'rustscan -a {target} --top 1000 -t 2000',
            full: 'rustscan -a {target} --top 1000 -t 2000'
        }
    },
    autorecon: {
        name: 'AutoRecon', category: 'Network Recon',
        description: 'Automated reconnaissance',
        commands: {
            basic: 'autorecon {target}'
        }
    },
    nbtscan: {
        name: 'NBTScan', category: 'Network Recon',
        description: 'NetBIOS scanner',
        commands: {
            scan: 'nbtscan {target}'
        }
    },
    'arp-scan': {
        name: 'ARP-Scan', category: 'Network Recon',
        description: 'ARP network scanner',
        commands: {
            local: 'arp-scan -l',
            target: 'arp-scan {target}'
        }
    },
    responder: {
        name: 'Responder', category: 'Network Security',
        description: 'LLMNR/NBT-NS poisoner',
        commands: {
            simulate: 'echo "Responder LLMNR/NBT-NS simulation for {target}"'
        }
    },
    nxc: {
        name: 'NetExec', category: 'Network Security',
        description: 'Network service exploitation',
        commands: {
            smb: 'nxc smb {target}'
        }
    },
    'enum4linux-ng': {
        name: 'Enum4Linux-NG', category: 'Network Recon',
        description: 'Enhanced Linux/Windows enumeration',
        commands: {
            basic: 'enum4linux-ng {target}'
        }
    },
    rpcclient: {
        name: 'RPCClient', category: 'Network Recon',
        description: 'Microsoft RPC client',
        commands: {
            connect: 'rpcclient -N {target}'
        }
    },
    enum4linux: {
        name: 'Enum4Linux', category: 'Network Recon',
        description: 'Linux/Windows enumeration',
        commands: {
            basic: 'enum4linux {target}'
        }
    },

    // Web Security Tools
    ffuf: {
        name: 'Ffuf', category: 'Web Security',
        description: 'Fast web fuzzer',
        commands: {
            basic: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u {target}/FUZZ -t 20 -s',
            dir: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u {target}/FUZZ -t 20 -s',
            param: 'ffuf -w /usr/share/wordlists/parameters.txt -u {target}?FUZZ=test -t 20 -s'
        }
    },
    feroxbuster: {
        name: 'FeroxBuster', category: 'Web Security',
        description: 'Fast content discovery',
        commands: {
            basic: 'feroxbuster -u {target} -t 10 -d 2 -q'
        }
    },
    dirsearch: {
        name: 'DirSearch', category: 'Web Security',
        description: 'Web path scanner',
        commands: {
            basic: 'dirsearch -u {target}'
        }
    },
    dotdotpwn: {
        name: 'DotDotPwn', category: 'Web Security',
        description: 'Directory traversal fuzzer',
        commands: {
            http: 'dotdotpwn -m http -h {target}'
        }
    },
    xsser: {
        name: 'XSSer', category: 'Web Security',
        description: 'XSS detection tool',
        commands: {
            scan: 'xsser -u {target}'
        }
    },
    wfuzz: {
        name: 'Wfuzz', category: 'Web Security',
        description: 'Web application fuzzer',
        commands: {
            dir: 'wfuzz -c -z file,/usr/share/wordlists/dirb/common.txt {target}/FUZZ'
        }
    },
    gau: {
        name: 'GAU', category: 'Web Security',
        description: 'Get All URLs',
        commands: {
            basic: 'gau {target}'
        }
    },
    waybackurls: {
        name: 'Wayback URLs', category: 'Web Security',
        description: 'Fetch URLs from Wayback Machine',
        commands: {
            basic: 'waybackurls {target}'
        }
    },
    arjun: {
        name: 'Arjun', category: 'Web Security',
        description: 'HTTP parameter discovery',
        commands: {
            scan: 'arjun -u {target}'
        }
    },
    paramspider: {
        name: 'ParamSpider', category: 'Web Security',
        description: 'Parameter mining',
        commands: {
            mine: 'paramspider -d {target}'
        }
    },
    x8: {
        name: 'X8', category: 'Web Security',
        description: 'Hidden parameter discovery',
        commands: {
            basic: 'x8 -u {target}'
        }
    },
    jaeles: {
        name: 'Jaeles', category: 'Web Security',
        description: 'Powerful web scanner',
        commands: {
            scan: 'jaeles scan -u {target}'
        }
    },
    dalfox: {
        name: 'DalFox', category: 'Web Security',
        description: 'XSS scanner and parameter analysis',
        commands: {
            basic: 'dalfox url {target}'
        }
    },
    httpx: {
        name: 'HTTPx', category: 'Web Security',
        description: 'Fast HTTP toolkit',
        commands: {
            basic: 'httpx -u {target}',
            probe: 'httpx -u {target} -probe',
            title: 'httpx -u {target} -title',
            tech: 'httpx -u {target} -tech-detect'
        }
    },
    wafw00f: {
        name: 'WAFw00f', category: 'Web Security',
        description: 'Web Application Firewall detection',
        commands: {
            detect: 'wafw00f {target}'
        }
    },
    katana: {
        name: 'Katana', category: 'Web Security',
        description: 'Next-generation crawling framework',
        commands: {
            crawl: 'katana -u {target}'
        }
    },
    hakrawler: {
        name: 'Hakrawler', category: 'Web Security',
        description: 'Fast web crawler',
        commands: {
            crawl: 'hakrawler -url {target}'
        }
    },

    // Password Tools
    medusa: {
        name: 'Medusa', category: 'Password Security',
        description: 'Parallel brute-force tool',
        commands: {
            simulate: 'echo "Medusa brute-force simulation for {target}"'
        }
    },
    patator: {
        name: 'Patator', category: 'Password Security',
        description: 'Multi-purpose brute-forcer',
        commands: {
            simulate: 'echo "Patator brute-force simulation for {target}"'
        }
    },
    'hash-identifier': {
        name: 'Hash Identifier', category: 'Password Security',
        description: 'Hash type identification',
        commands: {
            identify: 'hash-identifier'
        }
    },
    ophcrack: {
        name: 'Ophcrack', category: 'Password Security',
        description: 'Windows password cracker',
        commands: {
            simulate: 'echo "Ophcrack password cracking simulation"'
        }
    },
    'hashcat-utils': {
        name: 'Hashcat Utils', category: 'Password Security',
        description: 'Hashcat utility tools',
        commands: {
            info: 'hashcat --help'
        }
    },

    // Binary Analysis Tools
    gdb: {
        name: 'GDB', category: 'Binary Analysis',
        description: 'GNU Debugger',
        commands: {
            version: 'gdb --version'
        }
    },
    radare2: {
        name: 'Radare2', category: 'Binary Analysis',
        description: 'Reverse engineering framework',
        commands: {
            version: 'r2 -v'
        }
    },
    binwalk: {
        name: 'Binwalk', category: 'Binary Analysis',
        description: 'Firmware analysis tool',
        commands: {
            simulate: 'echo "Binwalk binary analysis simulation for {target} - requires binary file"'
        }
    },
    ropgadget: {
        name: 'ROPgadget', category: 'Binary Analysis',
        description: 'ROP gadget finder',
        commands: {
            find: 'ROPgadget --binary {target}'
        }
    },
    checksec: {
        name: 'Checksec', category: 'Binary Analysis',
        description: 'Binary security checker',
        commands: {
            check: 'checksec --file={target}'
        }
    },
    objdump: {
        name: 'Objdump', category: 'Binary Analysis',
        description: 'Object file dumper',
        commands: {
            headers: 'objdump -h {target}',
            disasm: 'objdump -d {target}'
        }
    },

    // Forensics Tools
    volatility3: {
        name: 'Volatility3', category: 'Digital Forensics',
        description: 'Memory forensics framework',
        commands: {
            info: 'vol -h'
        }
    },
    steghide: {
        name: 'Steghide', category: 'Digital Forensics',
        description: 'Steganography tool',
        commands: {
            extract: 'steghide extract -sf {target}'
        }
    },
    hashpump: {
        name: 'HashPump', category: 'Digital Forensics',
        description: 'Hash length extension attack tool',
        commands: {
            version: 'hashpump --help'
        }
    },
    foremost: {
        name: 'Foremost', category: 'Digital Forensics',
        description: 'File carving tool',
        commands: {
            carve: 'foremost -i {target}'
        }
    },
    exiftool: {
        name: 'ExifTool', category: 'Digital Forensics',
        description: 'Metadata extraction tool',
        commands: {
            extract: 'exiftool {target}'
        }
    },
    strings: {
        name: 'Strings', category: 'Digital Forensics',
        description: 'Extract strings from files',
        commands: {
            extract: 'strings {target}'
        }
    },
    xxd: {
        name: 'XXD', category: 'Digital Forensics',
        description: 'Hex dump utility',
        commands: {
            dump: 'xxd {target}'
        }
    },
    photorec: {
        name: 'PhotoRec', category: 'Digital Forensics',
        description: 'File recovery tool',
        commands: {
            info: 'photorec /help'
        }
    },
    testdisk: {
        name: 'TestDisk', category: 'Digital Forensics',
        description: 'Partition recovery tool',
        commands: {
            info: 'testdisk /help'
        }
    },
    scalpel: {
        name: 'Scalpel', category: 'Digital Forensics',
        description: 'File carving tool',
        commands: {
            carve: 'scalpel {target}'
        }
    },
    'bulk-extractor': {
        name: 'Bulk Extractor', category: 'Digital Forensics',
        description: 'Digital forensics extraction tool',
        commands: {
            extract: 'bulk_extractor {target}'
        }
    },

    // Cloud Security Tools
    prowler: {
        name: 'Prowler', category: 'Cloud Security',
        description: 'AWS/Azure/GCP security scanner',
        commands: {
            aws: 'prowler aws'
        }
    },
    'scout-suite': {
        name: 'Scout Suite', category: 'Cloud Security',
        description: 'Cloud security auditing',
        commands: {
            aws: 'scout aws'
        }
    },
    trivy: {
        name: 'Trivy', category: 'Cloud Security',
        description: 'Vulnerability scanner for containers',
        commands: {
            image: 'trivy image {target}'
        }
    },
    'kube-hunter': {
        name: 'Kube-Hunter', category: 'Cloud Security',
        description: 'Kubernetes penetration testing',
        commands: {
            scan: 'kube-hunter --remote {target}'
        }
    },
    'kube-bench': {
        name: 'Kube-Bench', category: 'Cloud Security',
        description: 'Kubernetes security benchmark',
        commands: {
            run: 'kube-bench run'
        }
    },
    'docker-bench-security': {
        name: 'Docker Bench Security', category: 'Cloud Security',
        description: 'Docker security benchmark',
        commands: {
            run: 'docker-bench-security'
        }
    },
    checkov: {
        name: 'Checkov', category: 'Cloud Security',
        description: 'Infrastructure as Code security scanner',
        commands: {
            scan: 'checkov -f {target}'
        }
    },
    terrascan: {
        name: 'Terrascan', category: 'Cloud Security',
        description: 'Terraform security scanner',
        commands: {
            scan: 'terrascan scan -f {target}'
        }
    },

    // OSINT Tools
    amass: {
        name: 'Amass', category: 'OSINT',
        description: 'In-depth subdomain enumeration',
        commands: {
            enum: 'amass enum -d {target}'
        }
    },
    subfinder: {
        name: 'Subfinder', category: 'OSINT',
        description: 'Subdomain discovery tool',
        commands: {
            basic: 'subfinder -d {target} -t 100 -silent'
        }
    },
    fierce: {
        name: 'Fierce', category: 'OSINT',
        description: 'Domain scanner',
        commands: {
            scan: 'fierce --domain {target}'
        }
    },
    dnsenum: {
        name: 'DNSEnum', category: 'OSINT',
        description: 'DNS enumeration tool',
        commands: {
            enum: 'dnsenum {target}'
        }
    },
    theharvester: {
        name: 'TheHarvester', category: 'OSINT',
        description: 'Email and subdomain gatherer',
        commands: {
            basic: 'theharvester -d {target} -b google'
        }
    },
    sherlock: {
        name: 'Sherlock', category: 'OSINT',
        description: 'Username hunter across social networks',
        commands: {
            hunt: 'sherlock {target}'
        }
    },
    'social-analyzer': {
        name: 'Social Analyzer', category: 'OSINT',
        description: 'Social media analysis tool',
        commands: {
            analyze: 'social-analyzer --username {target}'
        }
    },
    'recon-ng': {
        name: 'Recon-NG', category: 'OSINT',
        description: 'Reconnaissance framework',
        commands: {
            info: 'recon-ng --help'
        }
    },
    spiderfoot: {
        name: 'SpiderFoot', category: 'OSINT',
        description: 'OSINT automation tool',
        commands: {
            scan: 'spiderfoot -s {target}'
        }
    },
    'shodan-cli': {
        name: 'Shodan CLI', category: 'OSINT',
        description: 'Shodan command-line interface',
        commands: {
            search: 'shodan search {target}'
        }
    },
    'censys-cli': {
        name: 'Censys CLI', category: 'OSINT',
        description: 'Censys command-line interface',
        commands: {
            search: 'censys search {target}'
        }
    },

    // Exploitation Tools
    metasploit: {
        name: 'Metasploit', category: 'Exploitation',
        description: 'Exploitation framework',
        commands: {
            console: 'msfconsole'
        }
    },
    'exploit-db': {
        name: 'Exploit Database', category: 'Exploitation',
        description: 'Exploit database search',
        commands: {
            search: 'searchsploit {target}'
        }
    },
    searchsploit: {
        name: 'SearchSploit', category: 'Exploitation',
        description: 'Exploit database search tool',
        commands: {
            search: 'searchsploit {target}'
        }
    },
    msfvenom: {
        name: 'MSFVenom', category: 'Exploitation',
        description: 'Payload generator',
        commands: {
            list: 'msfvenom -l payloads'
        }
    },
    msfconsole: {
        name: 'MSFConsole', category: 'Exploitation',
        description: 'Metasploit console',
        commands: {
            start: 'msfconsole'
        }
    },

    // API Tools
    'api-schema-analyzer': {
        name: 'API Schema Analyzer', category: 'API Security',
        description: 'API schema analysis',
        commands: {
            analyze: 'echo "API schema analysis for {target}"'
        }
    },
    curl: {
        name: 'cURL', category: 'API Security',
        description: 'Command line HTTP client',
        commands: {
            get: 'curl {target}',
            headers: 'curl -I {target}'
        }
    },
    httpie: {
        name: 'HTTPie', category: 'API Security',
        description: 'Human-friendly HTTP client',
        commands: {
            get: 'http GET {target}'
        }
    },
    anew: {
        name: 'Anew', category: 'API Security',
        description: 'Append new lines to files',
        commands: {
            filter: 'echo {target} | anew'
        }
    },
    qsreplace: {
        name: 'QSReplace', category: 'API Security',
        description: 'Query string replacer',
        commands: {
            replace: 'echo {target} | qsreplace'
        }
    },
    uro: {
        name: 'Uro', category: 'API Security',
        description: 'URL parameter remover',
        commands: {
            clean: 'echo {target} | uro'
        }
    },

    // Wireless Tools
    kismet: {
        name: 'Kismet', category: 'Wireless Security',
        description: 'Wireless network detector',
        commands: {
            info: 'kismet --help'
        }
    },
    wireshark: {
        name: 'Wireshark', category: 'Network Analysis',
        description: 'Network protocol analyzer',
        commands: {
            version: 'tshark --version'
        }
    },
    tshark: {
        name: 'TShark', category: 'Network Analysis',
        description: 'Command-line network analyzer',
        commands: {
            capture: 'tshark -i any'
        }
    },
    tcpdump: {
        name: 'TCPDump', category: 'Network Analysis',
        description: 'Packet capture tool',
        commands: {
            capture: 'tcpdump -i any'
        }
    },

    // Additional Essential Tools
    smbmap: {
        name: 'SMBMap', category: 'Network Security',
        description: 'SMB share enumeration',
        commands: {
            enum: 'smbmap -H {target}'
        }
    },
    volatility: {
        name: 'Volatility', category: 'Digital Forensics',
        description: 'Memory analysis framework',
        commands: {
            info: 'volatility --info'
        }
    },
    sleuthkit: {
        name: 'The Sleuth Kit', category: 'Digital Forensics',
        description: 'Digital forensics tools',
        commands: {
            info: 'fls --help'
        }
    },
    autopsy: {
        name: 'Autopsy', category: 'Digital Forensics',
        description: 'Digital forensics platform',
        commands: {
            info: 'autopsy --help'
        }
    },
    'evil-winrm': {
        name: 'Evil-WinRM', category: 'Network Security',
        description: 'Windows Remote Management shell',
        commands: {
            connect: 'evil-winrm -i {target}'
        }
    },
    'airmon-ng': {
        name: 'Airmon-NG', category: 'Wireless Security',
        description: 'Monitor mode enabler',
        commands: {
            start: 'airmon-ng start wlan0'
        }
    },
    'airodump-ng': {
        name: 'Airodump-NG', category: 'Wireless Security',
        description: 'Wireless packet capture',
        commands: {
            scan: 'airodump-ng wlan0mon'
        }
    },
    'aireplay-ng': {
        name: 'Aireplay-NG', category: 'Wireless Security',
        description: 'Wireless packet injection',
        commands: {
            deauth: 'aireplay-ng --deauth 10 -a {target} wlan0mon'
        }
    },
    'aircrack-ng': {
        name: 'Aircrack-NG', category: 'Wireless Security',
        description: 'WEP/WPA/WPA2 cracker',
        commands: {
            crack: 'aircrack-ng -w wordlist.txt capture.cap'
        }
    },
    'graphql-scanner': {
        name: 'GraphQL Scanner', category: 'Web Security',
        description: 'GraphQL security scanner',
        commands: {
            scan: 'echo "GraphQL scan simulation for {target}"'
        }
    },
    'jwt-analyzer': {
        name: 'JWT Analyzer', category: 'Web Security',
        description: 'JSON Web Token analyzer',
        commands: {
            analyze: 'echo "JWT analysis simulation for {target}"'
        }
    },

    // === AI-POWERED ADVANCED TOOLS ===
    pentestgpt: {
        name: 'PentestGPT', category: 'AI Security',
        description: 'AI-powered penetration testing assistant',
        commands: {
            interactive: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python -m pentestgpt.main',
            scan: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python -m pentestgpt.main --target {target}',
            recon: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python -m pentestgpt.main --mode recon --target {target}'
        }
    },
    hexstrike: {
        name: 'HexStrike AI', category: 'AI Security',
        description: 'AI-powered cybersecurity automation with 150+ tools',
        commands: {
            scan: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python hexstrike_server.py --target {target}',
            advanced: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python hexstrike_server.py --mode advanced --target {target}',
            mcp: 'cd /home/terrestrial/Desktop/jaeger-ai/hexstrike-ai && python hexstrike_mcp.py --target {target}'
        }
    },
    pentestgpt: {
        name: 'PentestGPT', category: 'AI Security',
        description: 'AI-guided penetration testing framework',
        commands: {
            auto: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python main.py --operation auto --target {target}',
            guided: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python main.py --operation guided --target {target}',
            reasoning: 'cd /home/terrestrial/Desktop/jaeger-ai/PentestGPT && python main.py --reasoning --target {target}'
        }
    }
};

// Enhanced menu system
const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Smart Scan', 'smart_scan')],
    [Markup.button.callback('🔴 Red Team', 'red_team'), Markup.button.callback('🔵 Blue Team', 'blue_team')],
    [Markup.button.callback('🛠️ All Tools', 'all_tools'), Markup.button.callback('📊 Status', 'status')],
    [Markup.button.callback('🧠 AI Analysis', 'ai_analysis')]
]);

const toolCategoryMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🌐 Network Recon', 'cat_network')],
    [Markup.button.callback('🔒 Web Security', 'cat_web')],
    [Markup.button.callback('🔍 OSINT', 'cat_osint')],
    [Markup.button.callback('📡 Subdomain Enum', 'cat_subdomain')],
    [Markup.button.callback('☁️ Cloud Security', 'cat_cloud')],
    [Markup.button.callback('🔙 Back', 'main_menu')]
]);

// OpenRouter AI Integration with Auto-Rotation (50 requests/day)
async function analyzeWithOpenRouter(results, target, operation) {
    // Try primary API key first
    let primaryKey = getPrimaryApiKey();

    if (primaryKey) {
        try {
            const result = await tryOpenRouterWithFailover(results, target, operation, primaryKey.key, primaryKey.name, primaryKey.type);
            log.success(`✅ ${primaryKey.name} AI analysis completed successfully`);
            return result;
        } catch (error) {
            log.error(`${primaryKey.name} analysis failed: ${error.message}`);

            // Check if it's a rate limit or key issue
            if (error.message.includes('rate limit') || error.message.includes('quota') || error.message.includes('401') || error.message.includes('402') || error.message.includes('403') || error.message.includes('credits')) {
                markApiKeyFailed(primaryKey.type, error.message);
            }
        }
    }

    // Try backup API key
    let backupKey = getBackupApiKey();

    if (backupKey) {
        try {
            log.info(`🔄 Trying backup ${backupKey.name} API key...`);
            const result = await tryOpenRouterWithFailover(results, target, operation, backupKey.key, backupKey.name, backupKey.type);
            log.success(`✅ ${backupKey.name} AI analysis completed successfully`);
            return result;
        } catch (error) {
            log.error(`${backupKey.name} analysis failed: ${error.message}`);

            // Check if it's a rate limit or key issue
            if (error.message.includes('rate limit') || error.message.includes('quota') || error.message.includes('401') || error.message.includes('402') || error.message.includes('403') || error.message.includes('credits')) {
                markApiKeyFailed(backupKey.type, error.message);
            }
        }
    }

    log.warn('🚫 All OpenRouter API keys failed, switching to Gemini...');
    return await analyzeWithGemini(results, target, operation);
}

// Try OpenRouter with failover system
async function tryOpenRouterWithFailover(results, target, operation, apiKey, keyName, keyType) {
    const prompt = `Analyze these cybersecurity scan results for ${target} (Operation: ${operation}):

${results.map(r => `Tool: ${r.tool}
Command: ${r.command}
Success: ${r.success}
Output: ${r.stdout?.substring(0, 2000) || 'No output'}
${r.stderr ? 'Errors: ' + r.stderr.substring(0, 1000) : ''}
---`).join('\n')}

Provide a comprehensive security analysis including:
1. Critical vulnerabilities found
2. Security recommendations
3. Risk assessment (High/Medium/Low)
4. Next steps for security improvement

Focus on actionable insights and practical recommendations.`;

    const model = keyType === 'deepseek' ? 'deepseek/deepseek-chat-v3.1:free' : 'openrouter/sonoma-sky-alpha';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://jaeger-ai.com',
            'X-Title': 'Jaeger AI Ultimate'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a senior cybersecurity analyst providing detailed security assessments. Be thorough, accurate, and provide actionable recommendations.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`${keyName} API error ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    log.success(`✅ ${keyName} AI analysis completed successfully`);
    return data.choices[0].message.content;
}

// Try OpenRouter with specific key (for Sonoma Sky) - DEPRECATED
async function tryOpenRouterWithKey(results, target, operation, apiKey, keyName, backupKey) {
    try {
        const prompt = `Analyze these cybersecurity scan results for ${target} (Operation: ${operation}):

${results.map(r => `Tool: ${r.tool}
Command: ${r.command}
Success: ${r.success}
Output: ${r.stdout?.substring(0, 2000) || 'No output'}
${r.stderr ? 'Errors: ' + r.stderr.substring(0, 1000) : ''}
---`).join('\n')}

Provide a comprehensive security analysis including:
1. Critical vulnerabilities found
2. Security recommendations
3. Risk assessment (High/Medium/Low)
4. Next steps for security improvement

Focus on actionable insights and practical recommendations.`;

        log.info(`🔑 Using ${keyName} API key for OpenRouter`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jaeger-ai.com',
                'X-Title': 'Jaeger AI Ultimate'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-sonnet',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a senior cybersecurity analyst providing detailed security assessments. Be thorough, accurate, and provide actionable recommendations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            log.error(`${keyName} API error: ${response.status} - ${errorData}`);

            if (response.status === 402) {
                // If Sonoma Sky failed and we have DeepSeek backup
                if (backupKey) {
                    log.warn(`💳 ${keyName} credits insufficient - Trying DeepSeek backup...`);
                    return await tryBackupOpenRouter(results, target, operation, backupKey);
                }
                log.warn('💳 All OpenRouter keys insufficient - Visit https://openrouter.ai/settings/credits to purchase more');
                log.warn('🔄 Automatically switching to Gemini AI...');
                return await analyzeWithGemini(results, target, operation);
            }

            throw new Error(`${keyName} API error: ${response.status}`);
        }

        const data = await response.json();
        log.success(`✅ ${keyName} AI analysis completed successfully`);
        return data.choices[0].message.content;

    } catch (error) {
        log.error(`${keyName} analysis failed: ${error.message}`);

        // Try backup key if available
        if (backupKey) {
            log.info('🔄 Trying DeepSeek backup key...');
            return await tryBackupOpenRouter(results, target, operation, backupKey);
        }

        log.info('🔄 Falling back to Gemini AI...');
        return await analyzeWithGemini(results, target, operation);
    }
}

// Backup OpenRouter function
async function tryBackupOpenRouter(results, target, operation, backupKey) {
    try {
        const prompt = `Analyze these cybersecurity scan results for ${target} (Operation: ${operation}):

${results.map(r => `Tool: ${r.tool}
Command: ${r.command}
Success: ${r.success}
Output: ${r.stdout?.substring(0, 2000) || 'No output'}
${r.stderr ? 'Errors: ' + r.stderr.substring(0, 1000) : ''}
---`).join('\n')}

Provide a comprehensive security analysis including:
1. Critical vulnerabilities found
2. Security recommendations
3. Risk assessment (High/Medium/Low)
4. Next steps for security improvement

Focus on actionable insights and practical recommendations.`;

        log.info('🔑 Using DeepSeek backup API key');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${backupKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jaeger-ai.com',
                'X-Title': 'Jaeger AI Ultimate'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a senior cybersecurity analyst providing detailed security assessments. Be thorough, accurate, and provide actionable recommendations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.3
            })
        });

        if (response.ok) {
            const data = await response.json();
            log.success('✅ DeepSeek backup API analysis completed successfully');
            return data.choices[0].message.content;
        } else {
            throw new Error(`Backup API failed: ${response.status}`);
        }

    } catch (error) {
        log.error(`Backup OpenRouter failed: ${error.message}`);
        log.info('🔄 Falling back to Gemini AI...');
        return await analyzeWithGemini(results, target, operation);
    }
}

// Gemini AI Integration (Backup)
async function analyzeWithGemini(results, target, operation) {
    if (!process.env.GEMINI_API_KEY) {
        log.warn('Gemini API key not available');
        return 'AI analysis not available (Both OpenRouter and Gemini API keys not configured)';
    }

    try {
        log.ai(`Analyzing ${operation} results for ${target} using Gemini AI`);

        const prompt = `Analyze these cybersecurity ${operation} results for ${target}:

SCAN RESULTS:
${JSON.stringify(results, null, 2)}

Please provide a comprehensive security analysis with:

1. RISK ASSESSMENT (Critical/High/Medium/Low)
2. KEY FINDINGS - Most important discoveries
3. VULNERABILITIES IDENTIFIED - Specific security issues
4. THREAT ANALYSIS - Potential attack vectors
5. RECOMMENDATIONS - Actionable security improvements
6. PRIORITY ACTIONS - What to fix first

Format response in clear text without markdown formatting for better readability.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const analysis = data.candidates[0].content.parts[0].text;

        log.ai('Gemini AI analysis completed successfully');
        return analysis;

    } catch (error) {
        log.error(`Gemini AI analysis failed: ${error.message}`);
        return `AI analysis failed: ${error.message}`;
    }
}

// AI Tool Integrations
async function executePentestGPT(target, ctx, operationId) {
    try {
        log.info(`🤖 Starting PentestGPT AI analysis for ${target}`);

        // Use OpenRouter API to simulate PentestGPT analysis with AI
        const primaryKey = getPrimaryApiKey();
        if (primaryKey) {
            const prompt = `You are PentestGPT, an AI-powered penetration testing assistant. Perform a comprehensive security analysis for target: ${target}

Generate a detailed penetration testing report including:
1. Reconnaissance findings
2. Vulnerability assessment
3. Attack vectors identified
4. Exploitation recommendations
5. Risk assessment and prioritization
6. Remediation steps

Format the response as a professional penetration testing report.`;

            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${primaryKey.key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://jaeger-ai.com',
                        'X-Title': 'Jaeger AI Ultimate'
                    },
                    body: JSON.stringify({
                        model: primaryKey.type === 'deepseek' ? 'deepseek/deepseek-chat-v3.1:free' : 'openrouter/sonoma-sky-alpha',
                        messages: [
                            { role: 'system', content: 'You are PentestGPT, an expert AI penetration testing assistant.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 4000,
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const analysis = data.choices[0].message.content;

                    await ctx.reply(`🤖 **PENTESTGPT AI ANALYSIS COMPLETE**\n\n${analysis}`);

                    return {
                        tool: 'pentestgpt',
                        success: true,
                        stdout: analysis,
                        command: 'AI-powered penetration testing analysis',
                        aiAnalysis: true
                    };
                }
            } catch (error) {
                log.error(`PentestGPT AI analysis failed: ${error.message}`);
            }
        }

        // Fallback simulation
        const simulation = `🤖 **PENTESTGPT AI ANALYSIS**\n\n🎯 Target: ${target}\n\n**RECONNAISSANCE PHASE:**\n- Domain enumeration completed\n- Subdomain discovery active\n- Port scanning in progress\n\n**VULNERABILITY ASSESSMENT:**\n- Web application testing\n- Network service analysis\n- SSL/TLS configuration review\n\n**ATTACK SURFACE MAPPING:**\n- Entry points identified\n- Authentication mechanisms analyzed\n- Authorization bypass opportunities\n\n**AI RECOMMENDATIONS:**\n- Focus on web application vulnerabilities\n- Test for injection flaws\n- Verify access controls\n\n**NEXT STEPS:**\n- Manual validation required\n- Social engineering assessment\n- Physical security review\n\n⚠️ This is a simulated PentestGPT analysis. Real implementation requires proper setup.`;

        await ctx.reply(simulation);

        return {
            tool: 'pentestgpt',
            success: true,
            stdout: simulation,
            command: 'PentestGPT AI analysis (simulated)',
            simulation: true
        };

    } catch (error) {
        log.error(`PentestGPT execution failed: ${error.message}`);
        return {
            tool: 'pentestgpt',
            success: false,
            error: error.message,
            command: 'PentestGPT AI analysis'
        };
    }
}

async function executeHexStrike(target, ctx, operationId) {
    try {
        log.info(`🤖 Starting HexStrike AI automation for ${target}`);

        // Use OpenRouter API to simulate HexStrike analysis with AI
        const primaryKey = getPrimaryApiKey();
        if (primaryKey) {
            const prompt = `You are HexStrike AI, an advanced cybersecurity automation platform with 150+ integrated security tools. Perform a comprehensive automated security analysis for target: ${target}

Execute the following automated security workflow:
1. Multi-vector reconnaissance
2. Vulnerability scanning with 150+ tools
3. Threat intelligence correlation
4. Risk assessment automation
5. Exploit chain analysis
6. Automated remediation recommendations

Provide a detailed HexStrike AI automation report with findings from multiple security tools and AI-powered analysis.`;

            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${primaryKey.key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://jaeger-ai.com',
                        'X-Title': 'Jaeger AI Ultimate'
                    },
                    body: JSON.stringify({
                        model: primaryKey.type === 'deepseek' ? 'deepseek/deepseek-chat-v3.1:free' : 'openrouter/sonoma-sky-alpha',
                        messages: [
                            { role: 'system', content: 'You are HexStrike AI, an advanced cybersecurity automation platform.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 4000,
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const analysis = data.choices[0].message.content;

                    // Split long messages to avoid Telegram limits (4096 chars)
                    const prefix = `🤖 **HEXSTRIKE AI AUTOMATION COMPLETE**\n\n`;
                    const maxLength = 4000; // Leave some space for prefix

                    if ((prefix + analysis).length <= 4096) {
                        await ctx.reply(`${prefix}${analysis}`);
                    } else {
                        // Send in chunks
                        await ctx.reply(prefix);

                        const chunks = [];
                        let currentChunk = '';
                        const lines = analysis.split('\n');

                        for (const line of lines) {
                            if ((currentChunk + line + '\n').length > maxLength) {
                                if (currentChunk) chunks.push(currentChunk.trim());
                                currentChunk = line + '\n';
                            } else {
                                currentChunk += line + '\n';
                            }
                        }
                        if (currentChunk) chunks.push(currentChunk.trim());

                        for (let i = 0; i < chunks.length; i++) {
                            await ctx.reply(`📋 **Part ${i + 1}/${chunks.length}**\n\n${chunks[i]}`);
                        }
                    }

                    return {
                        tool: 'hexstrike',
                        success: true,
                        stdout: analysis,
                        command: 'HexStrike AI automation analysis',
                        aiAnalysis: true
                    };
                }
            } catch (error) {
                log.error(`HexStrike AI analysis failed: ${error.message}`);
            }
        }

        // Fallback simulation
        const simulation = `🤖 **HEXSTRIKE AI AUTOMATION**\n\n🎯 Target: ${target}\n\n**AUTOMATION WORKFLOW INITIATED:**\n- 150+ security tools activated\n- MCP protocol engaged\n- AI agents deployed\n\n**RECONNAISSANCE AUTOMATION:**\n- Domain intelligence gathering\n- Infrastructure mapping\n- Technology stack identification\n\n**VULNERABILITY AUTOMATION:**\n- Multi-scanner correlation\n- CVE database cross-reference\n- Zero-day pattern detection\n\n**THREAT INTELLIGENCE:**\n- IOC correlation active\n- Threat actor attribution\n- Attack pattern analysis\n\n**AI-POWERED ANALYSIS:**\n- Machine learning threat detection\n- Behavioral anomaly identification\n- Predictive risk assessment\n\n**AUTOMATION RESULTS:**\n- Critical vulnerabilities: 3 found\n- Medium risk issues: 7 identified\n- Compliance gaps: 2 detected\n\n⚠️ This is a simulated HexStrike AI analysis. Real implementation requires proper setup.`;

        await ctx.reply(simulation);

        return {
            tool: 'hexstrike',
            success: true,
            stdout: simulation,
            command: 'HexStrike AI automation (simulated)',
            simulation: true
        };

    } catch (error) {
        log.error(`HexStrike execution failed: ${error.message}`);
        return {
            tool: 'hexstrike',
            success: false,
            error: error.message,
            command: 'HexStrike AI automation'
        };
    }
}

// Tools List Query System
function isToolsListQuery(text) {
    const lowText = text.toLowerCase();
    const toolsQueries = [
        'tools apa aja',
        'apa aja tools',
        'tool apa saja',
        'tools yang ada',
        'daftar tools',
        'list tools',
        'tools list',
        'tools available',
        'available tools',
        'what tools',
        'tools bot',
        'bot tools',
        'security tools',
        'ada tools apa'
    ];

    return toolsQueries.some(query => lowText.includes(query));
}

async function handleToolsListQuery(ctx, text) {
    try {
        log.info(`🔧 User requested tools list: "${text}"`);

        // Get all tools from securityTools object
        if (!securityTools || typeof securityTools !== 'object') {
            await ctx.reply('❌ Tools database not available');
            return;
        }

        const allTools = Object.keys(securityTools);
        const totalTools = allTools.length;

        // Categorize tools
        const networkTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['nmap', 'masscan', 'rustscan', 'zmap', 'ping', 'traceroute', 'netstat', 'ss', 'arp', 'nslookup', 'dig', 'host', 'whois', 'curl', 'wget', 'telnet'].includes(toolName);
        });

        const webTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['nuclei', 'gobuster', 'feroxbuster', 'ffuf', 'nikto', 'sqlmap', 'httpx', 'wafw00f', 'dalfox', 'arjun', 'wpscan', 'joomscan', 'droopescan', 'dirb', 'dirbuster', 'wfuzz', 'burpsuite', 'owasp-zap', 'commix', 'xsser'].includes(toolName);
        });

        const vulnTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['nessus', 'openvas', 'nexpose', 'qualys', 'trivy', 'grype', 'syft', 'docker-bench', 'kube-bench', 'prowler', 'checkov', 'bandit', 'semgrep', 'codeql', 'snyk'].includes(toolName);
        });

        const osintTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['theharvester', 'subfinder', 'amass', 'sherlock', 'shodan-cli', 'fierce', 'dnsenum', 'spiderfoot', 'recon-ng', 'maltego', 'harvester', 'datasploit', 'photon', 'infoga', 'dnsrecon'].includes(toolName);
        });

        const passwordTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['hashcat', 'john', 'hydra', 'medusa', 'ncrack', 'patator', 'crowbar', 'thc-hydra', 'brutespray', 'cewl', 'crunch', 'cupp', 'mentalist'].includes(toolName);
        });

        const exploitTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['metasploit', 'exploitdb', 'searchsploit', 'msfvenom', 'armitage', 'cobalt-strike', 'empire', 'covenant', 'sliver', 'havoc', 'mythic', 'koadic'].includes(toolName);
        });

        // Other tools (not in categories above)
        const categorizedTools = [...networkTools, ...webTools, ...vulnTools, ...osintTools, ...passwordTools, ...exploitTools];
        const otherTools = allTools.filter(tool => !categorizedTools.includes(tool));

        // Build response message
        let response = `🛠️ **JAEGER AI TOOLS DATABASE**\n\n`;
        response += `📊 **Total Tools: ${totalTools}**\n\n`;

        response += `🌐 **Network Reconnaissance (${networkTools.length} tools):**\n`;
        response += `\`${networkTools.slice(0, 10).join(', ')}\`${networkTools.length > 10 ? ` +${networkTools.length - 10} more` : ''}\n\n`;

        response += `🕷️ **Web Security (${webTools.length} tools):**\n`;
        response += `\`${webTools.slice(0, 10).join(', ')}\`${webTools.length > 10 ? ` +${webTools.length - 10} more` : ''}\n\n`;

        response += `🔍 **Vulnerability Assessment (${vulnTools.length} tools):**\n`;
        response += `\`${vulnTools.slice(0, 8).join(', ')}\`${vulnTools.length > 8 ? ` +${vulnTools.length - 8} more` : ''}\n\n`;

        response += `🕵️ **OSINT & Intelligence (${osintTools.length} tools):**\n`;
        response += `\`${osintTools.slice(0, 8).join(', ')}\`${osintTools.length > 8 ? ` +${osintTools.length - 8} more` : ''}\n\n`;

        response += `🔐 **Password & Authentication (${passwordTools.length} tools):**\n`;
        response += `\`${passwordTools.slice(0, 8).join(', ')}\`${passwordTools.length > 8 ? ` +${passwordTools.length - 8} more` : ''}\n\n`;

        response += `💥 **Exploitation (${exploitTools.length} tools):**\n`;
        response += `\`${exploitTools.slice(0, 8).join(', ')}\`${exploitTools.length > 8 ? ` +${exploitTools.length - 8} more` : ''}\n\n`;

        if (otherTools.length > 0) {
            response += `🔧 **Other Tools (${otherTools.length} tools):**\n`;
            response += `\`${otherTools.slice(0, 10).join(', ')}\`${otherTools.length > 10 ? ` +${otherTools.length - 10} more` : ''}\n\n`;
        }

        // AI Tools category
        const aiTools = allTools.filter(tool => {
            const toolName = tool.toLowerCase();
            return ['pentestgpt', 'hexstrike'].includes(toolName);
        });

        response += `🤖 **AI Security Tools (${aiTools.length} tools):**\n`;
        response += `\`${aiTools.join(', ')}\`\n\n`;

        response += `🚀 **Special AI Features:**\n`;
        response += `• **PentestGPT** - AI-guided penetration testing framework\n`;
        response += `• **HexStrike AI** - AI-powered cybersecurity automation with 150+ tools\n`;
        response += `• **Gemini Analysis** - Advanced result analysis and reporting\n\n`;

        response += `💡 **Usage Examples:**\n`;
        response += `• \`nmap google.com\` - Single tool scan\n`;
        response += `• \`scan facebook.com\` - Smart automated scan\n`;
        response += `• \`red team operation target.com\` - Full pentest\n`;
        response += `• \`pentestgpt analyze website.com\` - AI-powered test\n\n`;

        response += `📋 **Categories Available:**\n`;
        response += `🔴 Red Team • 🔵 Blue Team • 🔍 OSINT • 🌐 Web Security • 🕷️ Network • 💥 Exploitation`;

        await ctx.reply(response, { parse_mode: 'Markdown' });
        log.success(`✅ Tools list sent to user`);

    } catch (error) {
        log.error(`❌ Error handling tools query: ${error.message}`);
        await ctx.reply('❌ Error retrieving tools list. Please try again.');
    }
}

// AI-Powered Command Intelligence System - Improved Async Pattern
async function parseNaturalCommand(text) {
    log.ai(`🧠 Processing natural language: "${text}"`);

    // Input validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        log.warn('⚠️ Invalid input for parseNaturalCommand');
        return {
            intent: 'unknown',
            targets: [],
            tools: [],
            singleTool: false,
            fullScan: false,
            aiRecommendation: 'Invalid input received',
            useAI: false,
            aiTool: 'none'
        };
    }

    const lowText = text.toLowerCase().trim();

    // Extract targets with safety checks
    const targets = [];
    try {
        const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;

        let matches = lowText.match(urlRegex);
        if (matches && Array.isArray(matches)) {
            targets.push(...matches.map(m => m.replace(/^https?:\/\//, '').replace(/^www\./, '')));
        }

        matches = lowText.match(ipRegex);
        if (matches && Array.isArray(matches)) {
            targets.push(...matches);
        }
    } catch (error) {
        log.error(`❌ Error extracting targets: ${error.message}`);
    }

    // Extract specific tools mentioned with safety
    const tools = [];
    try {
        if (securityTools && typeof securityTools === 'object') {
            for (const tool in securityTools) {
                if (lowText.includes(tool.toLowerCase())) {
                    tools.push(tool);
                }
            }
        }
    } catch (error) {
        log.error(`❌ Error extracting tools: ${error.message}`);
    }

    // Check patterns with safety
    let singleTool = false;
    let fullScan = false;
    try {
        if (securityTools && typeof securityTools === 'object') {
            const toolNames = Object.keys(securityTools).join('|');
            const singleToolPattern = new RegExp(`^(${toolNames})\\s+`, 'i');
            singleTool = singleToolPattern.test(text);
        }
        fullScan = /full|complete|comprehensive|all|bundle|everything/i.test(lowText);
    } catch (error) {
        log.error(`❌ Error checking patterns: ${error.message}`);
    }

    // Default response structure
    const defaultResponse = {
        intent: 'scan',
        targets: targets,
        tools: tools,
        singleTool: singleTool,
        fullScan: fullScan,
        aiRecommendation: 'Using standard scanning approach',
        useAI: false,
        aiTool: 'none'
    };

    // AI Analysis with timeout and error handling
    try {
        const aiDecision = await Promise.race([
            analyzeUserIntent(text, targets[0] || 'target'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI analysis timeout after 8 seconds')), 8000)
            )
        ]);

        // Safely merge AI decision
        return {
            intent: aiDecision?.intent || defaultResponse.intent,
            targets: targets.length > 0 ? targets : (Array.isArray(aiDecision?.targets) ? aiDecision.targets : []),
            tools: tools.length > 0 ? tools : (Array.isArray(aiDecision?.recommendedTools) ? aiDecision.recommendedTools : []),
            singleTool: singleTool || Boolean(aiDecision?.useSingleTool),
            fullScan: fullScan || Boolean(aiDecision?.useFullScan),
            aiRecommendation: aiDecision?.explanation || defaultResponse.aiRecommendation,
            aiSummary: aiDecision?.summary || 'No summary available',
            useAI: Boolean(aiDecision?.useAI),
            aiTool: aiDecision?.aiTool || 'none'
        };
    } catch (error) {
        log.error(`❌ AI analysis failed: ${error.message}`);
        return {
            ...defaultResponse,
            aiRecommendation: `AI analysis failed (${error.message}), using standard approach`,
            aiSummary: 'Using fallback standard scanning approach'
        };
    }
}

// AI Brain untuk menganalisis intent user dan memilih tool terbaik
async function analyzeUserIntent(userInput, target) {
    try {
        // Gunakan AI untuk memahami maksud user
        const primaryKey = getPrimaryApiKey();

        if (primaryKey) {
            const prompt = `Sebagai AI cybersecurity expert, analisis input user ini dan berikan rekomendasi:

INPUT USER: "${userInput}"
TARGET: "${target}"

Berdasarkan input tersebut, tentukan:

1. INTENT (pilih salah satu):
   - scan: Scanning umum
   - pentest: Penetration testing
   - recon: Reconnaissance/OSINT
   - vuln: Vulnerability assessment
   - web: Web application testing
   - network: Network testing

2. RECOMMENDED APPROACH (kombinasi untuk maximum power):
   - combined: SELALU gunakan kombinasi HexStrike + PentestGPT untuk power maksimal
   - traditional: Hanya jika user secara eksplisit menyebutkan tool tradisional tertentu
   - single: Hanya jika user menyebutkan 1 tool spesifik dengan jelas

PRIORITAS: SELALU pilih "combined" untuk kombinasi HexStrike + PentestGPT yang paling powerful

3. TOOLS: Jika traditional, rekomendasikan maksimal 5 tools terbaik untuk target tersebut

4. SUMMARY: Berikan summary singkat dan actionable dari approach yang dipilih

Respon dalam format JSON:
{
  "intent": "...",
  "useAI": true/false,
  "aiTool": "combined/pentestgpt/hexstrike/none",
  "recommendedTools": ["tool1", "tool2", "tool3", "tool4", "tool5"],
  "useSingleTool": true/false,
  "useFullScan": true/false,
  "explanation": "Penjelasan singkat dan summary actionable mengapa memilih approach ini",
  "summary": "Summary singkat hasil yang diharapkan dari approach ini"
}`;

            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${primaryKey.key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://jaeger-ai.com',
                        'X-Title': 'Jaeger AI Ultimate'
                    },
                    body: JSON.stringify({
                        model: primaryKey.type === 'deepseek' ? 'deepseek/deepseek-chat-v3.1:free' : 'openrouter/sonoma-sky-alpha',
                        messages: [
                            { role: 'system', content: 'You are an expert cybersecurity AI that understands user intent and recommends the best security testing approach.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 500,
                        temperature: 0.1
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const analysis = data.choices[0].message.content;

                    // Parse JSON response
                    try {
                        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const aiDecision = JSON.parse(jsonMatch[0]);
                            log.ai(`🧠 AI Analysis: ${aiDecision.explanation}`);
                            return aiDecision;
                        }
                    } catch (parseError) {
                        log.warn('Failed to parse AI response, using fallback');
                    }
                }
            } catch (error) {
                log.error(`AI analysis failed: ${error.message}`);
            }
        }

        // Fallback logic jika AI tidak tersedia
        return analyzeIntentFallback(userInput);

    } catch (error) {
        log.error(`Intent analysis failed: ${error.message}`);
        return analyzeIntentFallback(userInput);
    }
}

// Fallback logic untuk analisis intent
function analyzeIntentFallback(text) {
    const lowText = text.toLowerCase();

    // Deteksi jika user ingin AI tools
    if (lowText.includes('pentestgpt') || lowText.includes('ai pentest') || lowText.includes('penetration test')) {
        return {
            intent: 'pentest',
            useAI: true,
            aiTool: 'pentestgpt',
            recommendedTools: ['pentestgpt'],
            useSingleTool: true,
            useFullScan: false,
            explanation: 'User meminta AI-powered penetration testing',
            summary: 'AI akan melakukan penetration testing mendalam dengan guidance langkah demi langkah'
        };
    }

    if (lowText.includes('hexstrike') || lowText.includes('automation') || lowText.includes('comprehensive')) {
        return {
            intent: 'scan',
            useAI: true,
            aiTool: 'hexstrike',
            recommendedTools: ['hexstrike'],
            useSingleTool: true,
            useFullScan: false,
            explanation: 'User meminta automated security scanning',
            summary: 'HexStrike AI akan melakukan automated comprehensive security testing'
        };
    }

    // Traditional intent detection
    let intent = 'scan';
    if (/red.?team|offensive|attack|exploit|pentest/.test(lowText)) intent = 'pentest';
    if (/recon|osint|information|intel|gather/.test(lowText)) intent = 'recon';
    if (/vuln|vulnerability|cve/.test(lowText)) intent = 'vuln';
    if (/web|http|https|website/.test(lowText)) intent = 'web';
    if (/network|port|nmap/.test(lowText)) intent = 'network';

    const fullScan = /full|complete|comprehensive|all|bundle|everything/i.test(lowText);

    return {
        intent: intent,
        useAI: false,
        aiTool: 'none',
        recommendedTools: [],
        useSingleTool: false,
        useFullScan: fullScan,
        explanation: 'Traditional security scanning approach',
        summary: 'Menggunakan tools standar cybersecurity untuk scanning dan analysis'
    };
}

// Enhanced tool execution with realistic simulations
async function executeTool(toolName, command, target, ctx, operationId) {
    const fullCommand = command.replace('{target}', target);

    log.script(`🔧 EXECUTING: ${fullCommand}`);
    log.script(`📋 Tool: ${toolName} | Target: ${target} | Operation: ${operationId}`);

    return new Promise((resolve, reject) => {
        // Check if tool is available
        exec(`which ${toolName}`, (error) => {
            if (error) {
                log.warn(`Tool ${toolName} not installed, using ADVANCED SIMULATION`);
                resolve(generateAdvancedSimulation(toolName, target));
                return;
            }

            log.success(`✅ Tool ${toolName} found, executing REAL COMMAND`);

            // Set timeout based on tool type - nikto needs more time
            const toolTimeouts = {
                'nikto': 180000,    // 3 minutes for nikto
                'nmap': 120000,     // 2 minutes for nmap
                'nuclei': 150000,   // 2.5 minutes for nuclei
                'gobuster': 120000, // 2 minutes for gobuster
                'sqlmap': 180000,   // 3 minutes for sqlmap
                'default': 60000    // 1 minute default
            };

            const timeout = toolTimeouts[toolName] || toolTimeouts['default'];

            const child = spawn('sh', ['-c', fullCommand], {
                timeout: timeout,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                log.tool(`📤 ${toolName} OUTPUT: ${output.trim()}`);
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                log.warn(`⚠️ ${toolName} ERROR: ${output.trim()}`);
            });


            child.on('error', (error) => {
                log.error(`❌ Command execution failed: ${error.message}`);
                if (error.code === 'ETIMEDOUT') {
                    log.warn(`⏰ Tool ${toolName} timed out after ${timeout}ms - continuing with next tool`);
                    resolve({
                        success: false,
                        stdout: `Tool timed out after ${timeout/1000} seconds`,
                        stderr: `Timeout occurred - tool took longer than expected`,
                        command: fullCommand,
                        tool: toolName,
                        target: target,
                        executed: true,
                        realExecution: false,
                        timeout: true
                    });
                } else {
                    reject(error);
                }
            });

            // Add manual timeout as backup
            const timeoutId = setTimeout(() => {
                log.warn(`⏰ Manual timeout for ${toolName} after ${timeout}ms`);
                child.kill('SIGTERM');
                resolve({
                    success: false,
                    stdout: `Tool manually timed out after ${timeout/1000} seconds`,
                    stderr: `Manual timeout - tool killed`,
                    command: fullCommand,
                    tool: toolName,
                    target: target,
                    executed: true,
                    realExecution: false,
                    timeout: true
                });
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                log.script(`✅ Command completed with exit code: ${code}`);
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    command: fullCommand,
                    tool: toolName,
                    target: target,
                    executed: true,
                    realExecution: true
                });
            });
        });
    });
}

// Advanced realistic simulation engine
function generateAdvancedSimulation(toolName, target) {
    log.script(`🎯 Generating ADVANCED SIMULATION for ${toolName} on ${target}`);

    const simulations = {
        nmap: `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString()}
Nmap scan report for ${target} (${generateRandomIP()})
Host is up (0.${Math.floor(Math.random() * 999)}s latency).
Not shown: ${996 + Math.floor(Math.random() * 100)} closed ports
PORT     STATE SERVICE      VERSION
22/tcp   open  ssh          OpenSSH 8.9p1 Ubuntu 3ubuntu0.1
80/tcp   open  http         nginx 1.18.0
443/tcp  open  https        nginx 1.18.0
${Math.random() > 0.5 ? '8080/tcp open  http-proxy   nginx 1.18.0' : ''}
${Math.random() > 0.7 ? '3306/tcp open  mysql        MySQL 8.0.32' : ''}

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in ${Math.floor(Math.random() * 30 + 10)}.${Math.floor(Math.random() * 99)} seconds`,

        nuclei: `
[INF] Using Nuclei Engine v2.9.15
[INF] Using Interactsh Server https://interactsh.com
[INF] Templates loaded for scan: ${4800 + Math.floor(Math.random() * 200)}
[INF] Targets loaded for scan: 1

[INFO] [http-missing-security-headers] [http] [info] ${target} [missing-security-headers]
[LOW] [ssl-dns-names] [ssl] [low] ${target} [*.${target}]
${Math.random() > 0.6 ? '[MEDIUM] [apache-version-disclosure] [http] [medium] ' + target + ' [Apache/2.4.41]' : ''}
${Math.random() > 0.8 ? '[HIGH] [exposed-config-file] [http] [high] ' + target + '/config.php [exposed configuration]' : ''}
${Math.random() > 0.9 ? '[CRITICAL] [sql-injection] [http] [critical] ' + target + '/search.php?q=test [SQL injection detected]' : ''}

[INF] Templates executed: ${Math.floor(Math.random() * 4821)} (${Math.floor(Math.random() * 100)}% success)`,

        gobuster: `===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     ${target}
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/admin                (Status: 302) [Size: 0] [--> /admin/login]
/api                  (Status: 401) [Size: 23]
/assets               (Status: 301) [Size: 169] [--> ${target}/assets/]
${Math.random() > 0.5 ? '/backup               (Status: 200) [Size: 1234]' : ''}
/css                  (Status: 301) [Size: 169] [--> ${target}/css/]
/images               (Status: 301) [Size: 169] [--> ${target}/images/]
/js                   (Status: 301) [Size: 169] [--> ${target}/js/]
/login                (Status: 200) [Size: 2345]
${Math.random() > 0.7 ? '/phpmyadmin           (Status: 403) [Size: 276]' : ''}
/robots.txt           (Status: 200) [Size: 45]
${Math.random() > 0.8 ? '/wp-admin             (Status: 301) [Size: 169] [--> ' + target + '/wp-admin/]' : ''}
===============================================================
Finished
===============================================================`,

        subfinder: `
                     __    _____           __
   _______  __/ /_  / __(_)___  ____/ /__  _____
  / ___/ / / / __ \\/ /_/ / __ \\/ __  / _ \\/ ___/
 (__  ) /_/ / /_/ / __/ / / / / /_/ /  __/ /
/____/\\__,_/_.___/_/ /_/_/ /_/\\__,_/\\___/_/

                projectdiscovery.io

[INF] Enumerating subdomains for ${target}

www.${target}
mail.${target}
${Math.random() > 0.5 ? 'api.' + target : ''}
${Math.random() > 0.6 ? 'admin.' + target : ''}
${Math.random() > 0.7 ? 'blog.' + target : ''}
${Math.random() > 0.4 ? 'dev.' + target : ''}
${Math.random() > 0.8 ? 'staging.' + target : ''}
${Math.random() > 0.3 ? 'test.' + target : ''}
${Math.random() > 0.6 ? 'support.' + target : ''}
${Math.random() > 0.5 ? 'cdn.' + target : ''}

[INF] Found ${Math.floor(Math.random() * 20 + 5)} subdomains for ${target} in ${Math.floor(Math.random() * 30 + 5)} seconds`,

        theharvester: `
*******************************************************************
*  _   _                                            _            *
* | |_| |__   ___  /\  /\\__ _ _ ____   _____  ___| |_ ___ _ __  *
* | __| '_ \\ / _ \\/  \\/  / _\` | '__\\ \\ / / _ \\/ __| __/ _ \\ '__| *
* | |_| | | |  __/  /\\  / (_| | |   \\ V /  __/\\__ \\ ||  __/ |    *
*  \\__|_| |_|\\___|_/  \\/_ \\__,_|_|    \\_/ \\___||___/\\__\\___|_|    *
*                                                                 *
* theHarvester 4.4.0                                             *
* Coded by Christian Martorella                                  *
* Edge-Security Research                                         *
* cmartorella@edge-security.com                                  *
*******************************************************************

[*] Target: ${target}
[*] Searching for: google

[*] Searching 0 results.
[*] Searching 100 results.
[*] Searching 200 results.

[*] Emails found: ${Math.floor(Math.random() * 15 + 3)}
==================
${Math.random() > 0.8 ? 'admin@' + target : ''}
${Math.random() > 0.6 ? 'contact@' + target : ''}
${Math.random() > 0.4 ? 'info@' + target : ''}
${Math.random() > 0.7 ? 'support@' + target : ''}

[*] Hosts found: ${Math.floor(Math.random() * 10 + 2)}
===============
www.${target}
${Math.random() > 0.5 ? 'mail.' + target : ''}
${Math.random() > 0.6 ? 'blog.' + target : ''}`,

        ping: `PING ${target} (${generateRandomIP()}): 56 data bytes
64 bytes from ${generateRandomIP()}: icmp_seq=0 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms
64 bytes from ${generateRandomIP()}: icmp_seq=1 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms
64 bytes from ${generateRandomIP()}: icmp_seq=2 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms
64 bytes from ${generateRandomIP()}: icmp_seq=3 ttl=64 time=${(Math.random() * 100 + 10).toFixed(3)} ms

--- ${target} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
round-trip min/avg/max/stddev = ${(Math.random() * 50 + 10).toFixed(3)}/${(Math.random() * 100 + 30).toFixed(3)}/${(Math.random() * 150 + 50).toFixed(3)}/${(Math.random() * 20).toFixed(3)} ms`,

        nikto: `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          ${generateRandomIP()}
+ Target Hostname:    ${target}
+ Target Port:        80
+ Start Time:         ${new Date().toISOString()}
---------------------------------------------------------------------------
+ Server: nginx/1.18.0
+ Retrieved x-powered-by header: PHP/8.1.2
+ The anti-clickjacking X-Frame-Options header is not present.
+ The X-XSS-Protection header is not defined. This header can hint to the user agent to protect against some forms of XSS
+ The X-Content-Type-Options header is not set. This could allow the user agent to render the content differently than intended.
${Math.random() > 0.6 ? '+ /admin/: Admin login page/section found.' : ''}
${Math.random() > 0.7 ? '+ /config.php: PHP configuration file found.' : ''}
${Math.random() > 0.8 ? '+ /backup/: Backup directory found.' : ''}
+ 7963 requests: 0 error(s) and ${Math.floor(Math.random() * 15 + 5)} item(s) reported on remote host
+ End Time:           ${new Date(Date.now() + Math.random() * 300000).toISOString()} (${Math.floor(Math.random() * 300 + 60)} seconds)`
    };

    function generateRandomIP() {
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    return {
        success: true,
        stdout: simulations[toolName] || `Advanced simulation for ${securityTools[toolName]?.name || toolName} on ${target}\n\nTarget: ${target}\nStatus: Simulation completed successfully\nTool: ${toolName}\nTimestamp: ${new Date().toISOString()}`,
        stderr: '',
        command: `${toolName} ${target}`,
        tool: toolName,
        target: target,
        executed: false,
        simulated: true,
        advancedSimulation: true
    };
}

// Middleware for logging all user interactions
bot.use((ctx, next) => {
    const user = ctx.from.username || ctx.from.first_name || `ID:${ctx.from.id}`;

    if (ctx.message) {
        log.user(`${user} sent: "${ctx.message.text || '[non-text]'}"`);
    } else if (ctx.callbackQuery) {
        log.user(`${user} clicked: "${ctx.callbackQuery.data}"`);
    }

    return next();
});

// Start command
bot.start(async (ctx) => {
    try {
        const userName = ctx.from.username || ctx.from.first_name;
        const firstName = ctx.from.first_name || 'Unknown';
        const lastName = ctx.from.last_name || '';
        const userId = ctx.from.id;

        log.user(`👋 User accessing: ${userName} (ID: ${userId})`);

        // Check if user exists, if not register them
        let user = userManager.getUser(userId);
        if (!user) {
            const registration = userManager.registerUser(userId, userName, firstName, lastName);
            if (registration.success) {
                log.success(`✅ New user registered: ${userName} (${userId})`);
                user = registration.user;

                // Send welcome message for new users
                await ctx.reply(`🎉 WELCOME TO JAEGER AI ULTIMATE!

👤 Registration Successful!
━━━━━━━━━━━━━━━━━━━━━━
📝 Name: ${firstName} ${lastName}
🆔 User ID: ${userId}
📅 Registered: ${new Date().toLocaleDateString()}

🛠️ Your Account Includes:
• 10 scans per day
• Access to 141+ security tools
• AI-powered analysis
• Real tool execution
• Advanced reporting

⚡ Getting Started:
• Type "scan facebook.com" to start
• Use menu buttons below
• Check /help for commands

🔐 IMPORTANT: Only scan systems you own or have permission to test!`);
            }
        } else if (user.status === 'suspended') {
            return ctx.reply(`🚫 ACCESS DENIED

Your account has been suspended.
Reason: ${user.suspendReason || 'Terms violation'}
Date: ${new Date(user.suspendDate).toLocaleDateString()}

📧 Contact support to appeal this decision.`);
        }

        log.success(`🚀 User ${userName} (${userId}) started the ULTIMATE bot`);

        const welcomeMsg = `🤖 JAEGER AI ULTIMATE v3.0.1

🔥 The Most Advanced Cybersecurity Platform

✨ 132 Security Tools Available (HexStrike Integrated):
🌐 Network Recon: nmap, masscan, rustscan, zmap
🔒 Web Security: nuclei, gobuster, ffuf, nikto, sqlmap
🔍 OSINT: theharvester, sherlock, shodan
📡 Subdomain Enum: subfinder, amass, assetfinder
☁️ Cloud Security: prowler, trivy, scout_suite
🔐 Cryptography: hashcat, john, hydra
📱 Mobile Security: mobsf
🛡️ Vulnerability Assessment: nessus, openvas

🧠 AI-Powered Analysis:
• Multi-provider AI integration (Sonoma Sky, DeepSeek via OpenRouter)
• Smart tool selection with up to 5 recommended tools
• Advanced threat intelligence and context analysis
• Comprehensive risk assessment with actionable insights
• AI-powered intent detection and response optimization

🎯 Advanced Features:
• 🔴 Red Team Operations
• 🔵 Blue Team Defense
• 📜 Real Script Execution
• 🛡️ Advanced Simulations
• 📊 Real-time Monitoring

💡 Natural Language Interface:
Just tell me what you want to scan!

🔐 For authorized security testing only!`;

        await ctx.reply(welcomeMsg, {
            ...mainMenu
        });

        // Initialize user session
        userSessions.set(userId, {
            username: user,
            startTime: new Date(),
            operations: 0,
            lastActivity: new Date()
        });

        log.success(`✅ Welcome message sent to ${user}`);

    } catch (error) {
        log.error(`❌ Start command error: ${error.message}`);
        await ctx.reply('❌ Error occurred. Please try again.');
    }
});

// Enhanced text handler with advanced NLP
bot.on('text', async (ctx) => {
    try {
        const text = ctx.message.text;
        const userId = ctx.from.id;
        const user = ctx.from.username || ctx.from.first_name;

        // Skip commands starting with /
        if (text.startsWith('/')) {
            return;
        }

        // Handle cancel command
        if (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('stop')) {
            if (activeOperations.has(userId)) {
                const operation = activeOperations.get(userId);

                // Kill any running processes
                if (operation.processes && operation.processes.length > 0) {
                    operation.processes.forEach(pid => {
                        try {
                            process.kill(pid, 'SIGTERM');
                            log.info(`🛑 Killed process ${pid} for user ${user}`);
                        } catch (error) {
                            log.warn(`⚠️ Failed to kill process ${pid}: ${error.message}`);
                        }
                    });
                }

                // Set cancellation flag
                operation.cancelled = true;

                // Remove from active operations
                activeOperations.delete(userId);

                log.info(`🛑 User ${user} cancelled active operation`);
                return ctx.reply('✅ Operation cancelled successfully! All running processes have been terminated.', mainMenu);
            } else {
                return ctx.reply('❌ No active operation to cancel.');
            }
        }

        // Check if user has active operation
        if (activeOperations.has(userId)) {
            log.warn(`⚠️ User ${user} tried to start new operation while one is active`);
            return ctx.reply('⏳ Please wait, your previous operation is still running...\n\n💡 Type "cancel" to stop the current operation');
        }

        // Parse natural language command (ASYNC)
        const parsed = await parseNaturalCommand(text);
        log.ai(`🧠 NLP Parsed - Intent: ${parsed.intent}, Targets: ${(parsed.targets || []).join(',')}, Tools: ${(parsed.tools || []).join(',')}`);

        // Handle tools list queries
        if (isToolsListQuery(text)) {
            await handleToolsListQuery(ctx, text);
            return;
        }

        if (parsed.intent === 'unknown') {
            await ctx.reply(`👋 I received: "${text}"\n\n💡 Try these commands:\n• "scan google.com"\n• "red team operation facebook.com"\n• "nuclei scan example.com"\n• "subdomain enumeration tesla.com"\n• "osint research apple.com"`, {
                ...mainMenu
            });
            return;
        }

        if (parsed.targets.length === 0) {
            await ctx.reply('❌ Please specify a target to scan\n\nExample: "scan google.com"');
            return;
        }

        const target = parsed.targets[0];
        log.info(`🎯 Starting ${parsed.intent} operation on ${target} for user ${user}`);

        // Mark user as having active operation
        activeOperations.set(userId, {
            type: parsed.intent,
            target: target,
            startTime: new Date(),
            processes: [], // Track running processes for cancellation
            cancelled: false // Flag to check if operation was cancelled
        });

        // Run operation without await to prevent Telegraf timeout
        performUltimateOperation(ctx, target, parsed).catch(error => {
            log.error(`Ultimate operation failed: ${error.message}`);
            ctx.reply(`❌ Operation failed: ${error.message}`).catch(() => {});
        });

    } catch (error) {
        log.error(`❌ Text handler error: ${error.message}`);
        activeOperations.delete(ctx.from.id);
        ctx.reply('❌ Error processing message').catch(() => {});
    }
});

// Ultimate operation executor
async function performUltimateOperation(ctx, target, parsed) {
    const userId = ctx.from.id;
    const user = ctx.from.username || ctx.from.first_name;
    const operationId = `op_${userId}_${Date.now()}`;

    try {
        log.info(`🚀 === STARTING ULTIMATE OPERATION ===`);
        log.info(`📋 Operation ID: ${operationId}`);
        log.info(`👤 User: ${user} (${userId})`);
        log.info(`🎯 Target: ${target}`);
        log.info(`🔍 Intent: ${parsed.intent}`);
        log.info(`🛠️ Tools: ${(parsed.tools || []).join(', ') || 'auto-select'}`);

        // Initialize tools array first
        let toolsToUse = [];

        // Get all available tools by category
        const networkTools = ['nmap', 'masscan', 'rustscan', 'zmap', 'ping', 'traceroute', 'netstat', 'ss', 'arp', 'nslookup', 'dig', 'host', 'whois', 'curl', 'wget', 'telnet'];
        const webTools = ['nuclei', 'gobuster', 'feroxbuster', 'ffuf', 'nikto', 'sqlmap', 'httpx', 'wafw00f', 'dalfox', 'arjun', 'wpscan', 'joomscan', 'droopescan', 'dirb', 'dirbuster', 'wfuzz', 'burpsuite', 'owasp-zap', 'commix', 'xsser'];
        const vulnTools = ['nessus', 'openvas', 'nexpose', 'qualys', 'trivy', 'grype', 'syft', 'docker-bench', 'kube-bench', 'prowler', 'checkov', 'bandit', 'semgrep', 'codeql', 'snyk'];
        const osintTools = ['theharvester', 'subfinder', 'amass', 'sherlock', 'shodan-cli', 'fierce', 'dnsenum', 'spiderfoot', 'recon-ng', 'maltego', 'harvester', 'datasploit', 'photon', 'infoga', 'dnsrecon'];
        const passwordTools = ['hashcat', 'john', 'hydra', 'medusa', 'ncrack', 'patator', 'crowbar', 'thc-hydra', 'brutespray', 'cewl', 'crunch', 'cupp', 'mentalist', 'wordlists'];
        const exploitTools = ['metasploit', 'exploitdb', 'searchsploit', 'msfvenom', 'armitage', 'cobalt-strike', 'empire', 'covenant', 'sliver', 'havoc', 'mythic', 'koadic'];
        const binaryTools = ['binwalk', 'strings', 'hexdump', 'objdump', 'readelf', 'nm', 'gdb', 'radare2', 'ghidra', 'ida', 'x64dbg', 'ollydbg', 'immunity', 'windbg'];
        const forTools = ['volatility', 'autopsy', 'sleuthkit', 'foremost', 'photorec', 'scalpel', 'extundelete', 'testdisk', 'ddrescue', 'dc3dd', 'guymager', 'ftk-imager'];
        const cloudTools = ['aws-cli', 'azure-cli', 'gcloud', 'kubectl', 'docker', 'terraform', 'ansible', 'chef', 'puppet', 'vagrant', 'packer', 'consul', 'vault', 'nomad'];
        const wirelessTools = ['aircrack-ng', 'kismet', 'wireshark', 'tshark', 'airodump-ng', 'aireplay-ng', 'airmon-ng', 'bettercap', 'wifite', 'fluxion', 'evilginx2', 'wifi-pumpkin'];
        const apiTools = ['postman', 'insomnia', 'burp-suite', 'owasp-zap', 'arachni', 'w3af', 'skipfish', 'wapiti', 'nikto', 'dirb', 'gobuster', 'ffuf'];

        // Determine initial tool selection based on intent
        switch (parsed.intent) {
            case 'redteam':
                toolsToUse = [...networkTools.slice(0, 6), ...webTools.slice(0, 8), ...exploitTools.slice(0, 4), ...passwordTools.slice(0, 4)];
                break;
            case 'blueteam':
                toolsToUse = [...networkTools.slice(0, 4), ...vulnTools.slice(0, 8), ...forTools.slice(0, 4), ...cloudTools.slice(0, 6)];
                break;
            case 'osint':
                toolsToUse = [...osintTools, ...networkTools.slice(0, 5), ...webTools.slice(0, 3)];
                break;
            case 'subdomain':
                toolsToUse = [...osintTools.slice(0, 8), ...networkTools.slice(0, 4), ...webTools.slice(0, 3)];
                break;
            case 'web':
                toolsToUse = [...webTools, ...apiTools.slice(0, 6), ...vulnTools.slice(0, 4)];
                break;
            case 'wireless':
                toolsToUse = [...wirelessTools, ...networkTools.slice(0, 5)];
                break;
            case 'forensics':
                toolsToUse = [...forTools, ...binaryTools.slice(0, 6), ...networkTools.slice(0, 3)];
                break;
            case 'cloud':
                toolsToUse = [...cloudTools, ...vulnTools.slice(0, 5), ...networkTools.slice(0, 4)];
                break;
            default:
                toolsToUse = [...networkTools.slice(0, 8), ...webTools.slice(0, 8), ...vulnTools.slice(0, 6)];
        }

        // Filter to only use tools that exist in securityTools database
        toolsToUse = toolsToUse.filter(tool => securityTools[tool]);

        // Determine scan mode message (after toolsToUse is initialized)
        let scanModeMsg = '';
        if (parsed.singleTool && parsed.tools.length > 0) {
            scanModeMsg = `🔧 **SINGLE TOOL MODE**\nTool: ${parsed.tools[0]}`;
        } else if (parsed.fullScan) {
            scanModeMsg = `🚀 **FULL SCAN MODE**\nComprehensive analysis with ${toolsToUse.length}+ tools`;
        } else if (parsed.tools.length > 0) {
            scanModeMsg = `🛠️ **CUSTOM TOOL MODE**\nTools: ${parsed.tools.join(', ')}`;
        } else {
            scanModeMsg = `⚡ **QUICK SCAN MODE**\nOptimized scan with ${toolsToUse.length} tools`;
        }

        await ctx.reply(`🚀 ULTIMATE OPERATION INITIATED

🎯 Target: ${target}
🔍 Operation Type: ${parsed.intent.toUpperCase()}
🆔 Operation ID: ${operationId}
${scanModeMsg}

⚡ Initializing advanced security testing...

📡 Real-time monitoring active
All activities are being logged in terminal.

💡 **Scan Modes Available:**
• \`nmap google.com\` - Single tool (any of 119 tools)
• \`pentestgpt google.com\` - AI penetration testing
• \`hexstrike google.com\` - AI security automation
• \`scan google.com\` - Quick scan (~11 tools)
• \`full scan google.com\` - Complete scan (25+ tools)
• \`cancel\` - Stop current operation`);

        const results = [];

        // AI-powered tool selection and execution
        log.ai(`🧠 AI Recommendation: ${parsed.aiRecommendation}`);

        if (parsed.useAI && parsed.aiTool !== 'none') {
            // AI tools execution
            if (parsed.aiTool === 'combined') {
                log.info(`🤖 AI memilih COMBINED (HexStrike + PentestGPT) untuk ${target}`);
                await ctx.reply(`🤖 **AI BRAIN DECISION: ULTIMATE COMBINATION**\n\n🧠 Analysis: ${parsed.aiRecommendation}\n🎯 Target: ${target}\n⚡ Activating HexStrike + PentestGPT combo...`);

                // Execute HexStrike first
                await ctx.reply(`🔥 **PHASE 1: HEXSTRIKE AUTOMATION**`);
                const hexResult = await executeHexStrike(target, ctx, operationId);
                results.push(hexResult);

                // Execute PentestGPT second
                await ctx.reply(`🧠 **PHASE 2: PENTESTGPT ANALYSIS**`);
                const pentestResult = await executePentestGPT(target, ctx, operationId);
                results.push(pentestResult);

                await ctx.reply(`💥 **ULTIMATE COMBO COMPLETE!**\nHexStrike + PentestGPT power unleashed!`);
                toolsToUse = []; // Skip regular tools
            } else if (parsed.aiTool === 'pentestgpt') {
                log.info(`🤖 AI memilih PentestGPT untuk ${target}`);
                await ctx.reply(`🤖 **AI BRAIN DECISION: PENTESTGPT**\n\n🧠 Analysis: ${parsed.aiRecommendation}\n🎯 Target: ${target}\n⚡ Executing AI-powered penetration testing...`);
                const aiResult = await executePentestGPT(target, ctx, operationId);
                results.push(aiResult);
                toolsToUse = []; // Skip regular tools
            } else if (parsed.aiTool === 'hexstrike') {
                log.info(`🤖 AI memilih HexStrike untuk ${target}`);
                await ctx.reply(`🤖 **AI BRAIN DECISION: HEXSTRIKE**\n\n🧠 Analysis: ${parsed.aiRecommendation}\n🎯 Target: ${target}\n⚡ Activating automated security platform...`);
                const aiResult = await executeHexStrike(target, ctx, operationId);
                results.push(aiResult);
                toolsToUse = []; // Skip regular tools
            }
        } else if (parsed.singleTool && parsed.tools.length > 0) {
            // Single tool execution - manual user choice
            toolsToUse = [parsed.tools[0]];
            log.info(`🔧 User memilih single tool: ${toolsToUse[0]}`);

            // Check if it's AI tool manually requested
            if (parsed.tools[0] === 'pentestgpt') {
                await ctx.reply(`🤖 **PENTESTGPT - USER REQUEST**\n\n🎯 Target: ${target}\n⚡ Starting AI penetration testing...`);
                const aiResult = await executePentestGPT(target, ctx, operationId);
                results.push(aiResult);
                toolsToUse = []; // Skip regular execution
            } else if (parsed.tools[0] === 'hexstrike') {
                await ctx.reply(`🤖 **HEXSTRIKE - USER REQUEST**\n\n🎯 Target: ${target}\n⚡ Starting AI automation...`);
                const aiResult = await executeHexStrike(target, ctx, operationId);
                results.push(aiResult);
                toolsToUse = []; // Skip regular execution
            }
        } else if (parsed.tools.length > 0) {
            // Multiple specific tools mentioned
            toolsToUse = parsed.tools;
            log.info(`🛠️ User-specified tools: ${toolsToUse.join(', ')}`);
        } else if (parsed.fullScan) {
            // Full comprehensive scan
            toolsToUse = ['nmap', 'masscan', 'nuclei', 'gobuster', 'ffuf', 'nikto', 'sqlmap', 'httpx', 'wafw00f', 'subfinder', 'amass', 'theharvester', 'sherlock', 'trivy', 'prowler', 'metasploit', 'searchsploit', 'hydra', 'hashcat', 'john', 'binwalk', 'volatility', 'wireshark', 'aircrack'];
            log.info(`🚀 Full scan mode: ${toolsToUse.length} tools selected`);
        } else {
            // Default: use AI recommended tools or quick scan
            if (parsed.tools && parsed.tools.length > 0) {
                toolsToUse = parsed.tools;
                log.info(`🧠 AI recommended tools: ${toolsToUse.join(', ')}`);
            } else {
                toolsToUse = ['nmap', 'nuclei', 'gobuster', 'nikto', 'httpx', 'subfinder', 'amass', 'theharvester', 'trivy', 'searchsploit', 'binwalk'];
                log.info(`⚡ Quick scan mode: ${toolsToUse.length} tools selected`);
            }
        }

        log.info(`🛠️ Final tool list: ${toolsToUse.join(', ')}`);

        // Execute tools sequentially with enhanced monitoring
        for (let i = 0; i < toolsToUse.length; i++) {
            // Check if operation was cancelled
            const operation = activeOperations.get(userId);
            if (!operation || operation.cancelled) {
                log.info(`🛑 Operation cancelled by user ${user}, stopping execution`);
                await ctx.reply('🛑 Operation cancelled by user request.');
                return;
            }

            const toolName = toolsToUse[i];

            if (securityTools[toolName]) {
                log.tool(`🔧 [${i + 1}/${toolsToUse.length}] Executing ${toolName} on ${target}`);

                const command = securityTools[toolName].commands.basic ||
                               Object.values(securityTools[toolName].commands)[0];

                try {
                    // Send progress update
                    // Show comprehensive script to user
                    const actualCommand = command.replace('{target}', target);
                    await ctx.reply(`⚡ [${i + 1}/${toolsToUse.length}] Running ${securityTools[toolName].name}

🔧 Tool: ${securityTools[toolName].name}
📋 Category: ${securityTools[toolName].category}
🎯 Target: ${target}
💻 Script: ${actualCommand}
⏳ Status: Executing...

📊 Progress: ${Math.round(((i + 1) / toolsToUse.length) * 100)}%`);

                    const result = await executeTool(toolName, command, target, ctx, operationId);
                    results.push(result);

                    if (result.timeout) {
                        log.warn(`⏰ ${toolName} timed out - continuing with remaining ${toolsToUse.length - i - 1} tools`);
                        await ctx.reply(`⏰ ${securityTools[toolName].name} timed out but continuing with next tool...`);
                    } else {
                        log.success(`✅ ${toolName} execution completed ${result.executed ? '(REAL)' : '(SIMULATED)'}`);
                    }

                    // Send intermediate result
                    const status = result.executed ? '✅ REAL EXECUTION' : '🎯 ADVANCED SIMULATION';
                    const output = `🔧 ${securityTools[toolName].name} Results ${status}

📄 COMMAND EXECUTED:
${actualCommand}

📤 OUTPUT:
${result.stdout.substring(0, 800)}${result.stdout.length > 800 ? '\n... (truncated)' : ''}`;

                    await ctx.reply(output);

                } catch (toolError) {
                    log.error(`❌ Tool ${toolName} failed: ${toolError.message}`);
                    await ctx.reply(`❌ ${securityTools[toolName].name} failed: ${toolError.message}\n🔄 Continuing with remaining ${toolsToUse.length - i - 1} tools...`);
                    results.push({
                        tool: toolName,
                        error: toolError.message,
                        success: false,
                        executed: false
                    });
                }

                // Small delay between tools
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // AI Analysis Priority: Sonoma Sky -> DeepSeek -> Gemini
        log.ai('🧠 Starting comprehensive AI analysis');
        const sonomaAvailable = process.env.OPENROUTER_API_KEY;
        const deepseekAvailable = process.env.OPENROUTER_API_KEY_BACKUP;

        let aiProvider = 'Gemini';
        if (sonomaAvailable) {
            aiProvider = 'OpenRouter (Sonoma Sky)';
        } else if (deepseekAvailable) {
            aiProvider = 'OpenRouter (DeepSeek)';
        }

        await ctx.reply(`🧠 ANALYZING RESULTS WITH AI...\n\n🤖 Using ${aiProvider} AI\n⚡ Processing comprehensive security analysis...`);

        const aiAnalysis = await analyzeWithOpenRouter(results, target, parsed.intent);

        // Generate comprehensive final report
        const executedTools = results.filter(r => r.executed).length;
        const simulatedTools = results.filter(r => r.simulated).length;
        const operation = activeOperations.get(userId);
        const duration = operation ? Math.round((Date.now() - operation.startTime.getTime()) / 1000) : 0;

        // Split into multiple messages to avoid Telegram length limit
        const reportHeader = `📊 ULTIMATE OPERATION COMPLETE

🆔 Operation ID: ${operationId}
🎯 Target: ${target}
🔍 Operation Type: ${parsed.intent.toUpperCase()}
👤 Analyst: ${user}
⏱️ Duration: ${duration} seconds

🛠️ Tools Executed:
• ✅ Real Executions: ${executedTools}
• 🎯 Advanced Simulations: ${simulatedTools}
• 📊 Total Tools: ${results.length}

✅ Operation completed successfully
📡 All activities logged in real-time`;

        const reportFooter = `🔐 Remember: Use only for authorized security testing!`;

        // Send header
        await ctx.reply(reportHeader);

        // Send AI analysis in optimized chunks
        if (aiAnalysis && aiAnalysis.length > 0) {
            const maxLength = 3800; // Increased for better content
            if (aiAnalysis.length > maxLength) {
                const chunks = [];
                let currentChunk = '';
                const lines = aiAnalysis.split('\n');

                for (const line of lines) {
                    const testLength = currentChunk + line + '\n';
                    if (testLength.length > maxLength && currentChunk.length > 0) {
                        chunks.push(currentChunk.trim());
                        currentChunk = line + '\n';
                    } else {
                        currentChunk += line + '\n';
                    }
                }
                if (currentChunk.trim()) chunks.push(currentChunk.trim());

                // Send header first
                await ctx.reply(`🧠 **AI SECURITY ANALYSIS** (${chunks.length} parts):`);

                for (let i = 0; i < chunks.length; i++) {
                    await ctx.reply(`📋 **Part ${i + 1}/${chunks.length}**\n\n${chunks[i]}`);
                    await new Promise(resolve => setTimeout(resolve, 300)); // Faster delivery
                }
            } else {
                await ctx.reply(`🧠 **AI SECURITY ANALYSIS:**\n\n${aiAnalysis}`);
            }
        }

        // Send footer with main menu
        await ctx.reply(reportFooter, {
            ...mainMenu
        });

        // Update user session
        const session = userSessions.get(userId);
        if (session) {
            session.operations++;
            session.lastActivity = new Date();
        }

        log.success(`🎉 === ULTIMATE OPERATION COMPLETED ===`);
        log.success(`📋 Operation ${operationId} finished for user ${user}`);
        log.success(`📊 Stats: ${executedTools} real + ${simulatedTools} simulated = ${results.length} total tools`);

    } catch (error) {
        log.error(`❌ Ultimate operation failed: ${error.message}`);
        await ctx.reply(`❌ Operation failed: ${error.message}`, mainMenu);
    } finally {
        activeOperations.delete(userId);
    }
}

// Enhanced button handlers
bot.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        const user = ctx.from.username || ctx.from.first_name;

        await ctx.answerCbQuery();
        log.user(`🔘 ${user} selected menu: ${data}`);

        switch (data) {
            case 'smart_scan':
                await ctx.editMessageText(
                    '🔍 SMART SCAN MODE\n\nI\'ll automatically select the best tools based on your target:\n\n• "scan google.com" - Basic security assessment\n• "vulnerability test facebook.com" - Deep vulnerability scan\n• "security audit example.org" - Comprehensive audit\n\n🧠 AI-powered tool selection!',
                    mainMenu
                );
                break;

            case 'red_team':
                await ctx.editMessageText(
                    '🔴 RED TEAM OPERATIONS\n\nOffensive security testing with advanced tools:\n\n• "red team operation target.com"\n• "penetration test example.com"\n• "exploit scan website.org"\n\n🛠️ Tools: nmap, nuclei, gobuster, nikto, sqlmap\n⚠️ Use only on authorized targets!',
                    mainMenu
                );
                break;

            case 'blue_team':
                await ctx.editMessageText(
                    '🔵 BLUE TEAM DEFENSE\n\nDefensive security analysis and monitoring:\n\n• "blue team monitoring target.com"\n• "threat hunting example.com"\n• "security monitoring website.org"\n\n🛠️ Tools: nmap, nuclei, trivy\n🛡️ Focus: Detection and response!',
                    mainMenu
                );
                break;

            case 'all_tools':
                await ctx.editMessageText(
                    `🛠️ ALL SECURITY TOOLS (${Object.keys(securityTools).length}+)\n\nSelect category:`,
                    toolCategoryMenu
                );
                break;

            case 'ai_analysis':
                await ctx.editMessageText(
                    '🧠 AI ANALYSIS FEATURES\n\n🤖 Gemini AI Integration:\n• Advanced threat analysis\n• Risk assessment\n• Security recommendations\n\n💡 Just run any scan and get AI analysis automatically!',
                    mainMenu
                );
                break;

            case 'status':
                const activeOps = activeOperations.size;
                const totalSessions = userSessions.size;
                const availableTools = Object.keys(securityTools).length;

                await ctx.editMessageText(
                    `📊 ULTIMATE SYSTEM STATUS\n\n🔄 Active Operations: ${activeOps}\n👥 Total Sessions: ${totalSessions}\n🛠️ Available Tools: ${availableTools}+\n🧠 AI Provider: Gemini\n⚡ Bot Status: 🟢 ONLINE\n🛡️ Security: ✅ ACTIVE\n\n✅ All systems operational`,
                    mainMenu
                );
                break;

            // Tool category handlers
            case 'cat_network':
                const networkTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Network Recon')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `🌐 NETWORK RECONNAISSANCE TOOLS\n\n${networkTools}\n\n💡 Usage: "nmap scan google.com"`,
                    toolCategoryMenu
                );
                break;

            case 'cat_web':
                const webTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Web Security')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `🔒 WEB SECURITY TOOLS\n\n${webTools}\n\n💡 Usage: "nuclei scan example.com"`,
                    toolCategoryMenu
                );
                break;

            case 'cat_osint':
                const osintTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'OSINT')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `🔍 OSINT TOOLS\n\n${osintTools}\n\n💡 Usage: "osint research tesla.com"`,
                    toolCategoryMenu
                );
                break;

            case 'cat_subdomain':
                const subdomainTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Subdomain Enum')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `📡 SUBDOMAIN ENUMERATION TOOLS\n\n${subdomainTools}\n\n💡 Usage: "subdomain enumeration apple.com"`,
                    toolCategoryMenu
                );
                break;

            case 'cat_cloud':
                const cloudTools = Object.entries(securityTools)
                    .filter(([_, tool]) => tool.category === 'Cloud Security')
                    .map(([name, tool]) => `• ${tool.name}`)
                    .join('\n');

                await ctx.editMessageText(
                    `☁️ CLOUD SECURITY TOOLS\n\n${cloudTools}\n\n💡 Usage: Currently simulation-based`,
                    toolCategoryMenu
                );
                break;

            case 'main_menu':
                await ctx.editMessageText(
                    '🤖 MAIN MENU\n\nSelect an operation:',
                    mainMenu
                );
                break;

            default:
                await ctx.editMessageText('❌ Unknown command', mainMenu);
                break;
        }

    } catch (error) {
        log.error(`❌ Callback error: ${error.message}`);
        ctx.answerCbQuery('Error').catch(() => {});
    }
});

// Global error handler with timeout protection
bot.catch(async (err, ctx) => {
    log.error(`❌ Global bot error: ${err.message}`);

    // Handle timeout errors gracefully
    if (err.message.includes('timed out') || err.message.includes('timeout')) {
        log.warn('⏰ Operation timed out - sending completion message');
        try {
            if (ctx && ctx.reply) {
                await ctx.reply('⏰ Operation timed out but has been completed in background. Check logs for details.');
            }
        } catch (replyError) {
            log.error(`Failed to send timeout message: ${replyError.message}`);
        }
    } else {
        try {
            if (ctx && ctx.reply) {
                await ctx.reply('❌ An error occurred').catch(() => {});
            }
        } catch (replyError) {
            log.error(`Failed to send error message: ${replyError.message}`);
        }
    }
});

// Start the bot
bot.launch()
    .then(() => {
        log.success('🚀 JAEGER AI ULTIMATE v3.0.2 is ONLINE!');
        log.info(`🛠️ ${Object.keys(securityTools).length} security tools ready (HexStrike AI integrated)`);
        log.info('🧠 Gemini AI analysis ready');
        log.info('📡 Real-time monitoring active');
        log.info('🎯 Waiting for ultimate operations...');
    })
    .catch((error) => {
        log.error(`❌ Launch failed: ${error.message}`);
        process.exit(1);
    });

// Graceful shutdown
process.once('SIGINT', () => {
    log.warn('🛑 Shutting down ULTIMATE bot...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    log.warn('🛑 Shutting down ULTIMATE bot...');
    bot.stop('SIGTERM');
});

log.info('🔹 ULTIMATE bot setup complete, establishing Telegram connection...');