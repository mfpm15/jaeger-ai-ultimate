# JAEGER AI v4.0 - Intelligent Penetration Testing Platform

**AI-Powered Security Testing via Telegram Bot**

Jaeger AI adalah platform penetration testing berbasis AI yang mengintegrasikan HexStrike MCP (150+ security tools) dengan LLM intelligence (DeepSeek, Chimera, Z AI) melalui interface Telegram Bot.

---

## 🎯 Grand Design Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Telegram)                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JAEGER TELEGRAM BOT                           │
│                  (jaeger-telegram-bot.js)                        │
│  • Natural Language Processing                                   │
│  • Command Handling                                              │
│  • User Interface                                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                              ▼
┌───────────────────────────┐   ┌─────────────────────────────────┐
│    LLM ANALYZER           │   │  HEXSTRIKE INTELLIGENCE BRIDGE  │
│   (llm-analyzer.js)       │◄──┤  (hexstrike-intelligence.js)    │
│                           │   │                                 │
│  • Request Analysis       │   │  • API Communication            │
│  • Result Processing      │   │  • Workflow Management          │
│  • Report Generation      │   │  • Tool Selection               │
└───────────────────────────┘   └──────────┬──────────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────────┐
                         │   HEXSTRIKE MCP SERVER (Python)         │
                         │   (hexstrike_server.py + hexstrike_mcp) │
                         │                                         │
                         │  • 150+ Security Tools Database         │
                         │  • Intelligent Tool Selection           │
                         │  • Multi-Agent AI System                │
                         │  • Autonomous Execution                 │
                         └──────────┬──────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        ┌──────────┐         ┌──────────┐         ┌──────────┐
        │  Network │         │   Web    │         │   OSINT  │
        │  Tools   │         │  Tools   │         │  Tools   │
        │  (25+)   │         │  (40+)   │         │  (16+)   │
        └──────────┘         └──────────┘         └──────────┘
              ▼                     ▼                     ▼
        ┌──────────┐         ┌──────────┐         ┌──────────┐
        │  Cloud   │         │  Binary  │         │  Exploit │
        │  Tools   │         │  Tools   │         │  Tools   │
        │  (20+)   │         │  (25+)   │         │  (16+)   │
        └──────────┘         └──────────┘         └──────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  RESULTS → LLM ANALYSIS →     │
                    │  FORMATTED REPORT → TELEGRAM  │
                    └───────────────────────────────┘
```

---

## 🚀 Core Components

### 1. **Telegram Bot Interface** (`jaeger-telegram-bot.js`)
- User interaction via Telegram
- Natural language command processing
- Real-time status updates
- Result delivery

### 2. **LLM Analyzer** (`llm-analyzer.js`)
- Multi-LLM support (DeepSeek, Chimera, Z AI)
- User intent extraction
- Scan result analysis
- Intelligent report generation

### 3. **HexStrike Intelligence Bridge** (`hexstrike-intelligence.js`)
- RESTful API communication to HexStrike MCP
- Workflow orchestration (Recon, Vuln Hunting, OSINT)
- Smart scan execution
- Result aggregation

### 4. **HexStrike MCP Server** (`hexstrike-ai-new/`)
- 150+ security tools integration
- Multi-agent AI decision engine
- Autonomous tool selection
- Parameter optimization
- Real-time execution monitoring

---

## 📋 Features

### ✨ AI-Powered Intelligence
- **Automatic Tool Selection**: AI memilih tools terbaik berdasarkan target type
- **Smart Parameter Optimization**: Parameter otomatis disesuaikan dengan target
- **Intelligent Analysis**: LLM menganalisis hasil dan memberikan rekomendasi
- **Natural Language Interface**: Gunakan perintah natural language

### 🔧 Comprehensive Tool Arsenal (150+)
- **Network Scanning**: nmap, masscan, rustscan, zmap, etc.
- **Web Security**: nuclei, nikto, gobuster, ffuf, sqlmap, wpscan, etc.
- **OSINT**: subfinder, amass, theharvester, shodan, spiderfoot, etc.
- **Cloud Security**: prowler, trivy, checkov, etc.
- **Binary Analysis**: binwalk, strings, objdump, etc.
- **Exploitation**: metasploit, hydra, hashcat, john, etc.

### 🎯 Pre-built Workflows
- **Reconnaissance Workflow**: Subdomain enum, port scanning, tech detection
- **Vulnerability Hunting**: Web vuln scanning, SQL injection, XSS, etc.
- **OSINT Workflow**: Information gathering, email harvesting, social media intel
- **Comprehensive Scan**: Full security assessment

---

## 📦 Installation

### Prerequisites
- **Node.js** >= 18.0.0
- **Python 3** >= 3.8
- **Security Tools**: nmap, nuclei, gobuster, subfinder, etc. (akan dideteksi otomatis)
- **Telegram Bot Token**: Dari @BotFather
- **OpenRouter API Key**: Untuk LLM (DeepSeek)

### Setup Steps

1. **Clone Repository**
```bash
git clone https://github.com/jaeger-ai/jaeger-ai
cd jaeger-ai
```

2. **Install Dependencies**
```bash
npm run setup
```
Ini akan:
- Membuat Python virtual environment untuk HexStrike
- Install Python dependencies
- Install Node.js dependencies

3. **Configure Environment**
```bash
cp .env.example .env
nano .env
```

Required environment variables:
```env
# Telegram Bot Token (dari @BotFather)
BOT_TOKEN=your_telegram_bot_token_here

# OpenRouter API Key (untuk LLM DeepSeek)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Direct LLM API Keys
DEEPSEEK_API_KEY=your_deepseek_key
CHIMERA_API_KEY=your_chimera_key
ZAI_API_KEY=your_zai_key
```

4. **Start Services**
```bash
npm start
# atau
./start.sh
```

---

## 🎮 Usage

### Telegram Commands

**Basic Commands:**
- `/start` - Welcome message dan panduan
- `/help` - Help guide lengkap
- `/status` - Cek status HexStrike server
- `/tools` - List available tools
- `/cancel` - Cancel active scan

**Workflow Commands:**
- `/recon <target>` - Full reconnaissance workflow
- `/vulnhunt <target>` - Vulnerability hunting workflow
- `/osint <target>` - OSINT workflow
- `/tech <target>` - Technology detection

**Natural Language Examples:**
```
"scan google.com"
"recon ibnusaad.com"
"vulnerability hunting telkom.co.id"
"quick scan 192.168.1.1"
"osint example.com"
"comprehensive scan with detailed analysis target.com"
```

---

## 🔄 Workflow Examples

### 1. Reconnaissance Workflow
```
User: "recon example.com"

Flow:
1. Telegram Bot receives request
2. LLM analyzes: target=example.com, objective=reconnaissance
3. HexStrike Intelligence calls /api/bugbounty/reconnaissance-workflow
4. HexStrike executes:
   - subfinder (subdomain discovery)
   - nmap (port scanning)
   - httpx (technology detection)
   - nuclei (vulnerability templates)
5. Results → LLM Analysis
6. Formatted Report → User via Telegram
```

### 2. Vulnerability Hunting
```
User: "find vulnerabilities in example.com"

Flow:
1. LLM identifies: objective=vulnerability_hunting
2. HexStrike calls /api/bugbounty/vulnerability-hunting-workflow
3. Tools executed:
   - nuclei (template-based scanning)
   - nikto (web server vulnerabilities)
   - sqlmap (SQL injection)
   - dalfox (XSS detection)
4. LLM analyzes severity and creates prioritized report
5. User receives actionable vulnerability report
```

---

## 🏗️ Project Structure

```
jaeger-ai/
├── hexstrike-ai-new/              # HexStrike MCP Server (Python)
│   ├── hexstrike_server.py        # Main MCP server
│   ├── hexstrike_mcp.py           # MCP implementation
│   ├── hexstrike-ai-mcp.json      # MCP configuration
│   ├── requirements.txt           # Python dependencies
│   └── hexstrike-env/             # Python virtual environment
│
├── jaeger-telegram-bot.js         # Main Telegram Bot
├── llm-analyzer.js                # LLM Intelligence Layer
├── hexstrike-intelligence.js      # HexStrike API Bridge
├── package.json                   # Node.js config
├── start.sh                       # Startup script
├── .env                           # Environment variables
└── README.md                      # This file
```

---

## 🔧 Configuration

### HexStrike MCP Server
Default: `http://127.0.0.1:8888`

API Endpoints:
- `/health` - Health check
- `/api/intelligence/analyze-target` - Target analysis
- `/api/intelligence/select-tools` - Tool selection
- `/api/intelligence/smart-scan` - Smart scan execution
- `/api/bugbounty/reconnaissance-workflow` - Recon workflow
- `/api/bugbounty/vulnerability-hunting-workflow` - Vuln workflow
- `/api/bugbounty/osint-workflow` - OSINT workflow

### LLM Configuration
Primary: OpenRouter (DeepSeek model)
Fallback: Direct DeepSeek API, Chimera, Z AI

---

## 🛡️ Security Notes

⚠️ **PENTING:**
- Tool ini HANYA untuk security testing yang LEGAL dan AUTHORIZED
- Jangan gunakan pada target tanpa izin tertulis
- Patuhi hukum cybersecurity di wilayah Anda
- Gunakan dengan tanggung jawab

---

## 🐛 Troubleshooting

### HexStrike Server tidak start
```bash
cd hexstrike-ai-new
./hexstrike-env/bin/python3 hexstrike_server.py
```

### Telegram Bot tidak respond
1. Cek BOT_TOKEN di .env
2. Pastikan HexStrike server running: `curl http://127.0.0.1:8888/health`
3. Cek logs

### LLM tidak bekerja
1. Cek OPENROUTER_API_KEY di .env
2. Fallback akan menggunakan regex-based analysis

---

## 📊 Performance

- **Concurrent Scans**: Mendukung multiple users
- **Timeout**: 10 menit per scan (configurable)
- **Caching**: Results di-cache untuk performa
- **Async Execution**: Non-blocking tool execution

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

## 📄 License

MIT License - See LICENSE file

---

## 👥 Credits

- **HexStrike AI**: https://github.com/0x4m4/hexstrike-ai
- **LLM Providers**: OpenRouter, DeepSeek, Chimera, Z AI
- **Security Tools**: Community tools (nmap, nuclei, subfinder, etc.)

---

## 📞 Support

- Issues: https://github.com/jaeger-ai/jaeger-ai/issues
- Telegram: @jaeger_ai_support

---

**Jaeger AI v4.0** - *Intelligent Security Testing, Simplified* 🚀
