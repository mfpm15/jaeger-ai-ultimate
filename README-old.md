# Jaeger AI Ultimate v3.0 - Cybersecurity Telegram Bot

🚀 **The Ultimate AI-Powered Cybersecurity Platform** - A comprehensive Telegram bot with 141+ security tools, HexStrike AI integration, and advanced threat analysis.

## 🌟 Key Features

### 🛠️ 141+ Security Tools
- **Network Reconnaissance**: nmap, masscan, rustscan, zmap, ping, traceroute, dig, whois
- **Web Security**: nuclei, gobuster, feroxbuster, nikto, sqlmap, httpx, wafw00f, dalfox
- **Vulnerability Scanning**: trivy, grype, prowler, checkov, bandit, semgrep
- **OSINT Tools**: theharvester, subfinder, amass, sherlock, shodan-cli, spiderfoot
- **Password Tools**: hashcat, john, hydra, medusa, ncrack, patator
- **Exploitation**: metasploit, searchsploit, msfvenom, empire, covenant
- **Forensics**: volatility, autopsy, sleuthkit, foremost, binwalk
- **Cloud Security**: aws-cli, azure-cli, kubectl, docker, terraform
- **Wireless**: aircrack-ng, kismet, wireshark, bettercap
- **Binary Analysis**: radare2, ghidra, ida, gdb, strings

### 🧠 Advanced AI Analysis
- **Google Gemini Integration**: Deep threat analysis and risk assessment
- **Natural Language Processing**: Smart command understanding
- **Automated Recommendations**: AI-powered security insights
- **Risk Severity Scoring**: Intelligent vulnerability prioritization

### ⚡ Real-Time Operations
- **Tool Validation**: Real vs simulated execution detection
- **Progress Monitoring**: Live status updates with progress bars
- **Timeout Handling**: Robust error recovery and queue continuation
- **Resource Optimization**: Lightweight scanning with comprehensive coverage

### 🎯 Operation Modes
- **Smart Scan**: AI-powered tool selection based on target
- **Red Team**: Offensive security testing operations
- **Blue Team**: Defensive analysis and monitoring
- **OSINT**: Open-source intelligence gathering
- **Web Security**: Comprehensive web application testing
- **Subdomain Enumeration**: Complete subdomain discovery

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm
- Telegram Bot Token
- Google Gemini API Key (optional: OpenRouter API Key)

### Installation

1. **Clone and Setup**
```bash
git clone <repository-url>
cd jaeger-ai
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

Edit `.env` with your tokens:
```env
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_key (optional)
```

3. **Start the Bot**
```bash
# Production
npm start

# Development
npm run dev

# Or use the start script
chmod +x start.sh
./start.sh
```

## 🎮 Bot Usage

### Smart Commands
The bot understands natural language commands:

```
// Basic Scanning
"scan google.com"
"vulnerability test facebook.com"
"security audit example.org"

// Specialized Operations
"red team operation target.com"
"blue team monitoring example.com"
"osint research tesla.com"
"subdomain enumeration apple.com"

// Tool-Specific Scans
"nmap scan 192.168.1.1"
"nuclei test website.com"
"gobuster directory bruteforce target.com"
```

### Interactive Menus
- **🔍 Smart Scan**: AI-powered tool selection
- **🔴 Red Team**: Offensive security operations
- **🔵 Blue Team**: Defensive security analysis
- **🛠️ All Tools**: Browse 141+ security tools by category
- **🧠 AI Analysis**: Advanced threat intelligence
- **📊 Status**: System monitoring and statistics

### Tool Categories

#### 🌐 Network Reconnaissance
`nmap, masscan, rustscan, zmap, ping, traceroute, netstat, dig, whois, curl`

#### 🔒 Web Security
`nuclei, gobuster, feroxbuster, nikto, sqlmap, httpx, wafw00f, dalfox, arjun`

#### 🔍 OSINT & Intelligence
`theharvester, subfinder, amass, sherlock, shodan-cli, spiderfoot, recon-ng`

#### 🛡️ Vulnerability Assessment
`trivy, grype, prowler, checkov, bandit, semgrep, codeql, snyk`

#### 🔓 Password & Authentication
`hashcat, john, hydra, medusa, ncrack, patator, crowbar, brutespray`

## 🏗️ Architecture

### Core Components
```
┌─────────────────────────────────────────────────────────┐
│                 Jaeger AI Ultimate v3.0                │
├─────────────────────────────────────────────────────────┤
│  🤖 Telegram Bot Interface                             │
│  ├── Natural Language Processing                       │
│  ├── Interactive Menu System                           │
│  └── Real-time Progress Monitoring                     │
├─────────────────────────────────────────────────────────┤
│  🧠 AI Analysis Engine                                 │
│  ├── Google Gemini Integration                         │
│  ├── OpenRouter.ai Support                            │
│  └── Intelligent Risk Assessment                       │
├─────────────────────────────────────────────────────────┤
│  🛠️ HexStrike Tool Database (141+ Tools)               │
│  ├── Real Tool Execution                              │
│  ├── Advanced Simulation Engine                        │
│  └── Timeout & Error Handling                         │
├─────────────────────────────────────────────────────────┤
│  📊 Operation Management                               │
│  ├── User Session Handling                            │
│  ├── Queue Management                                  │
│  └── Resource Optimization                             │
└─────────────────────────────────────────────────────────┘
```

### Tool Execution Flow
1. **Command Parsing**: Natural language understanding
2. **Tool Selection**: AI-powered tool recommendation
3. **Validation**: Check tool availability
4. **Execution**: Real tools or advanced simulation
5. **Monitoring**: Progress tracking with timeouts
6. **Analysis**: AI-powered result interpretation
7. **Reporting**: Comprehensive security assessment

## 🔧 Technical Details

### Timeout Management
- **nikto**: 3 minutes (180s)
- **nmap**: 2 minutes (120s)
- **nuclei**: 2.5 minutes (150s)
- **gobuster**: 2 minutes (120s)
- **sqlmap**: 3 minutes (180s)
- **default**: 1 minute (60s)

### Error Handling
- **Timeout Recovery**: Continue with remaining tools
- **Tool Failures**: Graceful error messages and continuation
- **Queue Management**: Process all tasks even if some fail
- **Resource Monitoring**: Optimized commands for performance

### Logging System
- **Consolidated Logging**: Single `jaeger-main.log` file
- **Color-coded Console**: Real-time status monitoring
- **Detailed Tracking**: Tool execution, errors, and results

## 📈 Recent Updates (v3.0)

### ✅ Fixed Issues
1. **Tool Selection**: Now shows 120+ tools instead of reduced count
2. **Nikto Timeout**: Extended timeout and improved error handling
3. **Queue Continuation**: Bot continues processing after tool timeouts
4. **Formatting**: Removed markdown parsing issues
5. **Resource Optimization**: Lightweight scanning configurations

### 🚀 Improvements
- **Dynamic Tool Selection**: Utilizes full 141+ tool database
- **Enhanced Timeout Handling**: Tool-specific timeouts
- **Better Error Recovery**: Graceful handling of tool failures
- **Improved Logging**: Consolidated and detailed logging
- **AI Integration**: Switched to Gemini for better reliability

## 🔐 Security Considerations

### ⚠️ Important Guidelines
1. **Authorized Testing Only**: Only scan systems you own or have permission to test
2. **Responsible Usage**: Follow ethical hacking principles
3. **Rate Limiting**: Respect target system resources
4. **Data Protection**: Handle scan results securely

### 🛡️ Bot Security
- **Token Protection**: Secure environment variable storage
- **Input Validation**: Comprehensive target and command validation
- **Error Handling**: No sensitive data exposure in logs
- **Access Control**: User session management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add appropriate logging
- Test with various targets
- Update documentation
- Ensure security compliance

## 📝 Version History

### v3.0 (Current)
- 141+ security tools integration
- Google Gemini AI analysis
- Advanced timeout handling
- Dynamic tool selection
- Improved error recovery

### v2.x
- OpenRouter.ai integration
- Basic tool execution
- Menu system implementation

### v1.x
- Initial Telegram bot
- Basic scanning capabilities

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

- **Issues**: Create GitHub issue for bugs
- **Features**: Submit feature requests
- **Questions**: Discussion section

## ⚖️ Disclaimer

**FOR EDUCATIONAL AND AUTHORIZED TESTING ONLY**

This tool is designed for cybersecurity professionals, researchers, and authorized security testing. Users must ensure they have proper authorization before scanning any systems. The developers are not responsible for misuse of this software.

**USE RESPONSIBLY - RESPECT OTHERS' SYSTEMS AND DATA**