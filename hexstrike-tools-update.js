// ACCURATE HEXSTRIKE AI TOOLS DATABASE - Based on Real HexStrike AI Repository
const securityTools = {
    // === NETWORK RECON & SCANNING ===
    nmap: {
        name: 'Nmap', category: 'Network Recon',
        description: 'Network discovery and security auditing',
        commands: {
            basic: 'nmap -sS --top-ports 100 -T4 {target}',
            service_scan: 'nmap -sV --top-ports 100 -T4 {target}',
            vuln_scan: 'nmap --script vuln --top-ports 50 -T4 {target}'
        }
    },
    masscan: {
        name: 'Masscan', category: 'Network Recon',
        description: 'High-speed port scanner',
        commands: {
            basic: 'masscan {target} -p80,443,8080,8443 --rate=1000'
        }
    },
    rustscan: {
        name: 'RustScan', category: 'Network Recon',
        description: 'Ultra-fast port scanner',
        commands: {
            basic: 'rustscan -a {target} --top 1000 -t 2000'
        }
    },
    amass: {
        name: 'Amass', category: 'Network Recon',
        description: 'OWASP subdomain enumeration',
        commands: {
            enum: 'amass enum -d {target}',
            intel: 'amass intel -d {target}'
        }
    },
    subfinder: {
        name: 'Subfinder', category: 'Network Recon',
        description: 'Subdomain discovery tool',
        commands: {
            scan: 'subfinder -d {target}'
        }
    },
    nuclei: {
        name: 'Nuclei', category: 'Network Recon',
        description: 'Vulnerability scanner with templates',
        commands: {
            basic: 'nuclei -u {target} -c 10 -rl 100'
        }
    },
    fierce: {
        name: 'Fierce', category: 'Network Recon',
        description: 'DNS reconnaissance tool',
        commands: {
            scan: 'fierce --domain {target}'
        }
    },
    dnsenum: {
        name: 'DNSEnum', category: 'Network Recon',
        description: 'DNS enumeration tool',
        commands: {
            scan: 'dnsenum {target}'
        }
    },
    autorecon: {
        name: 'AutoRecon', category: 'Network Recon',
        description: 'Automated reconnaissance tool',
        commands: {
            scan: 'autorecon {target}'
        }
    },
    theharvester: {
        name: 'theHarvester', category: 'Network Recon',
        description: 'OSINT information gathering',
        commands: {
            scan: 'theHarvester -d {target} -b google'
        }
    },
    responder: {
        name: 'Responder', category: 'Network Recon',
        description: 'LLMNR, NBT-NS and MDNS poisoner',
        commands: {
            analyze: 'responder -A -I eth0'
        }
    },
    netexec: {
        name: 'NetExec', category: 'Network Recon',
        description: 'Network service exploitation tool',
        commands: {
            scan: 'netexec smb {target}'
        }
    },
    enum4linuxng: {
        name: 'Enum4linux-ng', category: 'Network Recon',
        description: 'Linux enumeration tool',
        commands: {
            scan: 'enum4linux-ng {target}'
        }
    },

    // === WEB APPLICATION SECURITY ===
    gobuster: {
        name: 'Gobuster', category: 'Web Security',
        description: 'Directory and file brute-forcer',
        commands: {
            dir: 'gobuster dir -u {target} -w /usr/share/wordlists/dirb/common.txt',
            dns: 'gobuster dns -d {target} -w /usr/share/wordlists/subdomains.txt'
        }
    },
    feroxbuster: {
        name: 'Feroxbuster', category: 'Web Security',
        description: 'Fast directory brute forcer',
        commands: {
            scan: 'feroxbuster -u {target} -w /usr/share/wordlists/dirb/common.txt'
        }
    },
    dirsearch: {
        name: 'DirSearch', category: 'Web Security',
        description: 'Web path scanner',
        commands: {
            scan: 'dirsearch -u {target} -e php,html,js'
        }
    },
    ffuf: {
        name: 'FFuf', category: 'Web Security',
        description: 'Fast web fuzzer',
        commands: {
            dir: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u {target}/FUZZ'
        }
    },
    dirb: {
        name: 'Dirb', category: 'Web Security',
        description: 'Web content scanner',
        commands: {
            scan: 'dirb {target} /usr/share/wordlists/dirb/common.txt'
        }
    },
    httpx: {
        name: 'HTTPx', category: 'Web Security',
        description: 'Fast HTTP toolkit',
        commands: {
            probe: 'httpx -u {target} -status-code -tech-detect'
        }
    },
    katana: {
        name: 'Katana', category: 'Web Security',
        description: 'Web crawling framework',
        commands: {
            crawl: 'katana -u {target} -depth 3'
        }
    },
    nikto: {
        name: 'Nikto', category: 'Web Security',
        description: 'Web server scanner',
        commands: {
            scan: 'nikto -h {target}'
        }
    },
    sqlmap: {
        name: 'SQLMap', category: 'Web Security',
        description: 'SQL injection detection tool',
        commands: {
            scan: 'sqlmap -u {target} --batch --level=1 --risk=1'
        }
    },
    wpscan: {
        name: 'WPScan', category: 'Web Security',
        description: 'WordPress vulnerability scanner',
        commands: {
            scan: 'wpscan --url {target}'
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
        description: 'Parameter mining tool',
        commands: {
            scan: 'paramspider -d {target}'
        }
    },
    dalfox: {
        name: 'DalFox', category: 'Web Security',
        description: 'XSS scanner and parameter analysis',
        commands: {
            scan: 'dalfox url {target}'
        }
    },
    wafw00f: {
        name: 'WafW00f', category: 'Web Security',
        description: 'Web Application Firewall detection',
        commands: {
            scan: 'wafw00f {target}'
        }
    },

    // === PASSWORD & AUTHENTICATION ===
    hydra: {
        name: 'Hydra', category: 'Password Attack',
        description: 'Network login cracker',
        commands: {
            ssh: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt {target} ssh',
            http: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt {target} http-get'
        }
    },
    john: {
        name: 'John the Ripper', category: 'Password Attack',
        description: 'Password cracking tool',
        commands: {
            crack: 'john --wordlist=/usr/share/wordlists/rockyou.txt {target}'
        }
    },
    hashcat: {
        name: 'Hashcat', category: 'Password Attack',
        description: 'Advanced password recovery',
        commands: {
            md5: 'hashcat -m 0 -a 0 {target} /usr/share/wordlists/rockyou.txt'
        }
    },
    medusa: {
        name: 'Medusa', category: 'Password Attack',
        description: 'Parallel brute-force tool',
        commands: {
            ssh: 'medusa -h {target} -u admin -P /usr/share/wordlists/rockyou.txt -M ssh'
        }
    },
    patator: {
        name: 'Patator', category: 'Password Attack',
        description: 'Multi-purpose brute-forcer',
        commands: {
            ssh: 'patator ssh_login host={target} user=admin password=FILE0 0=/usr/share/wordlists/rockyou.txt'
        }
    },
    crackmapexec: {
        name: 'CrackMapExec', category: 'Password Attack',
        description: 'Network service exploitation',
        commands: {
            smb: 'crackmapexec smb {target} -u admin -p admin'
        }
    },
    evilwinrm: {
        name: 'Evil-WinRM', category: 'Password Attack',
        description: 'Windows Remote Management tool',
        commands: {
            connect: 'evil-winrm -i {target} -u admin -p password'
        }
    },
    hashidentifier: {
        name: 'Hash-Identifier', category: 'Password Attack',
        description: 'Hash type identifier',
        commands: {
            identify: 'hash-identifier'
        }
    },
    ophcrack: {
        name: 'Ophcrack', category: 'Password Attack',
        description: 'Windows password cracker',
        commands: {
            crack: 'ophcrack -t /usr/share/ophcrack/tables/vista_free -f {target}'
        }
    },

    // === BINARY/REVERSE ENGINEERING ===
    gdb: {
        name: 'GDB', category: 'Binary Analysis',
        description: 'GNU Debugger',
        commands: {
            debug: 'gdb {target}'
        }
    },
    radare2: {
        name: 'Radare2', category: 'Binary Analysis',
        description: 'Reverse engineering framework',
        commands: {
            analyze: 'r2 -A {target}'
        }
    },
    binwalk: {
        name: 'Binwalk', category: 'Binary Analysis',
        description: 'Firmware analysis tool',
        commands: {
            extract: 'binwalk -e {target}'
        }
    },
    ghidra: {
        name: 'Ghidra', category: 'Binary Analysis',
        description: 'NSA reverse engineering suite',
        commands: {
            analyze: 'ghidra {target}'
        }
    },
    checksec: {
        name: 'Checksec', category: 'Binary Analysis',
        description: 'Binary security checker',
        commands: {
            check: 'checksec --file={target}'
        }
    },
    strings: {
        name: 'Strings', category: 'Binary Analysis',
        description: 'Extract printable strings',
        commands: {
            extract: 'strings {target}'
        }
    },
    objdump: {
        name: 'Objdump', category: 'Binary Analysis',
        description: 'Object file disassembler',
        commands: {
            disasm: 'objdump -d {target}'
        }
    },
    volatility3: {
        name: 'Volatility3', category: 'Binary Analysis',
        description: 'Memory forensics framework',
        commands: {
            info: 'vol3 -f {target} windows.info'
        }
    },
    foremost: {
        name: 'Foremost', category: 'Binary Analysis',
        description: 'File carving tool',
        commands: {
            recover: 'foremost -i {target} -o output'
        }
    },
    steghide: {
        name: 'Steghide', category: 'Binary Analysis',
        description: 'Steganography tool',
        commands: {
            extract: 'steghide extract -sf {target}'
        }
    },
    exiftool: {
        name: 'ExifTool', category: 'Binary Analysis',
        description: 'Metadata extraction tool',
        commands: {
            extract: 'exiftool {target}'
        }
    },

    // === CLOUD SECURITY ===
    prowler: {
        name: 'Prowler', category: 'Cloud Security',
        description: 'AWS security assessment',
        commands: {
            scan: 'prowler aws'
        }
    },
    scoutsuite: {
        name: 'Scout Suite', category: 'Cloud Security',
        description: 'Multi-cloud security auditing',
        commands: {
            aws: 'scout aws'
        }
    },
    trivy: {
        name: 'Trivy', category: 'Cloud Security',
        description: 'Container vulnerability scanner',
        commands: {
            image: 'trivy image {target}',
            fs: 'trivy fs {target}'
        }
    },
    kubehunter: {
        name: 'Kube-Hunter', category: 'Cloud Security',
        description: 'Kubernetes penetration testing',
        commands: {
            scan: 'kube-hunter --remote {target}'
        }
    },
    kubebench: {
        name: 'Kube-Bench', category: 'Cloud Security',
        description: 'Kubernetes security benchmark',
        commands: {
            check: 'kube-bench'
        }
    },
    dockerbenchsecurity: {
        name: 'Docker Bench Security', category: 'Cloud Security',
        description: 'Docker security benchmark',
        commands: {
            check: 'docker-bench-security'
        }
    },

    // === ADDITIONAL HEXSTRIKE TOOLS ===
    hakrawler: {
        name: 'Hakrawler', category: 'Web Security',
        description: 'Web crawler for URLs',
        commands: {
            crawl: 'hakrawler -url {target} -depth 3'
        }
    },
    gau: {
        name: 'GAU', category: 'Web Security',
        description: 'Get All URLs from sources',
        commands: {
            fetch: 'gau {target}'
        }
    },
    waybackurls: {
        name: 'Waybackurls', category: 'Web Security',
        description: 'Fetch URLs from Wayback Machine',
        commands: {
            fetch: 'waybackurls {target}'
        }
    },
    x8: {
        name: 'X8', category: 'Web Security',
        description: 'Hidden parameter discovery',
        commands: {
            scan: 'x8 -u {target}'
        }
    },
    jaeles: {
        name: 'Jaeles', category: 'Web Security',
        description: 'Web application security scanner',
        commands: {
            scan: 'jaeles scan -u {target}'
        }
    },
    testssl: {
        name: 'testssl.sh', category: 'Web Security',
        description: 'SSL/TLS security checker',
        commands: {
            check: 'testssl {target}'
        }
    },
    sslscan: {
        name: 'SSLScan', category: 'Web Security',
        description: 'SSL configuration scanner',
        commands: {
            scan: 'sslscan {target}'
        }
    },
    sslyze: {
        name: 'SSLyze', category: 'Web Security',
        description: 'SSL configuration analyzer',
        commands: {
            analyze: 'sslyze {target}'
        }
    },
    whatweb: {
        name: 'WhatWeb', category: 'Web Security',
        description: 'Web technology identifier',
        commands: {
            scan: 'whatweb {target}'
        }
    },
    jwttool: {
        name: 'JWT-Tool', category: 'Web Security',
        description: 'JWT security testing',
        commands: {
            test: 'jwt_tool {target}'
        }
    },
    wfuzz: {
        name: 'Wfuzz', category: 'Web Security',
        description: 'Web application fuzzer',
        commands: {
            fuzz: 'wfuzz -w /usr/share/wordlists/dirb/common.txt {target}/FUZZ'
        }
    },
    commix: {
        name: 'Commix', category: 'Web Security',
        description: 'Command injection exploiter',
        commands: {
            test: 'commix -u {target}'
        }
    },
    nosqlmap: {
        name: 'NoSQLMap', category: 'Web Security',
        description: 'NoSQL injection testing',
        commands: {
            test: 'nosqlmap -u {target}'
        }
    },
    tplmap: {
        name: 'Tplmap', category: 'Web Security',
        description: 'Template injection testing',
        commands: {
            test: 'tplmap -u {target}'
        }
    },

    // === CTF & FORENSICS ===
    photorec: {
        name: 'PhotoRec', category: 'Forensics',
        description: 'File recovery tool',
        commands: {
            recover: 'photorec {target}'
        }
    },
    testdisk: {
        name: 'TestDisk', category: 'Forensics',
        description: 'Disk recovery tool',
        commands: {
            recover: 'testdisk {target}'
        }
    },
    stegsolve: {
        name: 'Stegsolve', category: 'Forensics',
        description: 'Steganography solver',
        commands: {
            analyze: 'stegsolve {target}'
        }
    },
    zsteg: {
        name: 'Zsteg', category: 'Forensics',
        description: 'PNG/BMP steganography',
        commands: {
            analyze: 'zsteg {target}'
        }
    },
    outguess: {
        name: 'Outguess', category: 'Forensics',
        description: 'Steganographic detection',
        commands: {
            extract: 'outguess -r {target} output.txt'
        }
    },
    scalpel: {
        name: 'Scalpel', category: 'Forensics',
        description: 'File carving tool',
        commands: {
            carve: 'scalpel -o output {target}'
        }
    },
    bulkextractor: {
        name: 'Bulk Extractor', category: 'Forensics',
        description: 'Digital forensics tool',
        commands: {
            extract: 'bulk_extractor -o output {target}'
        }
    },
    autopsy: {
        name: 'Autopsy', category: 'Forensics',
        description: 'Digital forensics platform',
        commands: {
            analyze: 'autopsy'
        }
    },
    sleuthkit: {
        name: 'Sleuth Kit', category: 'Forensics',
        description: 'Digital investigation tools',
        commands: {
            analyze: 'fls {target}'
        }
    },

    // === OSINT & INTELLIGENCE ===
    sherlock: {
        name: 'Sherlock', category: 'OSINT',
        description: 'Social media username search',
        commands: {
            search: 'sherlock {target}'
        }
    },
    socialanalyzer: {
        name: 'Social-Analyzer', category: 'OSINT',
        description: 'Social media analysis',
        commands: {
            analyze: 'social-analyzer --username {target}'
        }
    },
    reconng: {
        name: 'Recon-ng', category: 'OSINT',
        description: 'Reconnaissance framework',
        commands: {
            recon: 'recon-ng'
        }
    },
    maltego: {
        name: 'Maltego', category: 'OSINT',
        description: 'Link analysis platform',
        commands: {
            analyze: 'maltego'
        }
    },
    spiderfoot: {
        name: 'SpiderFoot', category: 'OSINT',
        description: 'OSINT automation',
        commands: {
            scan: 'spiderfoot -s {target}'
        }
    },
    trufflehog: {
        name: 'TruffleHog', category: 'OSINT',
        description: 'Secret scanner',
        commands: {
            scan: 'trufflehog {target}'
        }
    },

    // === CRYPTOGRAPHY ===
    cyberchef: {
        name: 'CyberChef', category: 'Cryptography',
        description: 'Cyber Swiss Army Knife',
        commands: {
            decode: 'cyberchef'
        }
    },
    cipheridentifier: {
        name: 'Cipher-Identifier', category: 'Cryptography',
        description: 'Cipher type identification',
        commands: {
            identify: 'cipher-identifier {target}'
        }
    },
    rsatool: {
        name: 'RSATool', category: 'Cryptography',
        description: 'RSA cryptanalysis',
        commands: {
            crack: 'rsatool -n {target}'
        }
    },
    factordb: {
        name: 'FactorDB', category: 'Cryptography',
        description: 'Integer factorization database',
        commands: {
            query: 'factordb {target}'
        }
    },

    // === SPECIAL TOOLS ===
    xsser: {
        name: 'XSSer', category: 'Web Security',
        description: 'XSS detection tool',
        commands: {
            scan: 'xsser -u {target}'
        }
    },
    searchsploit: {
        name: 'SearchSploit', category: 'Exploit',
        description: 'Exploit database search',
        commands: {
            search: 'searchsploit {target}'
        }
    },
    metasploit: {
        name: 'Metasploit', category: 'Exploit',
        description: 'Penetration testing framework',
        commands: {
            search: 'msfconsole -q -x "search {target}; exit"'
        }
    }
};

module.exports = securityTools;