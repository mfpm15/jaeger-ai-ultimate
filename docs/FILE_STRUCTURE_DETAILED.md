# 📁 Jaeger AI - Detailed File Structure Documentation

> **Jaeger AI Ultimate v3.0.2** - Complete Cybersecurity Platform
>
> **Last Updated**: September 24, 2025 | **Version**: 3.0.2

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Root Directory Structure](#-root-directory-structure)
3. [Core Application Files](#-core-application-files)
4. [Configuration Files](#️-configuration-files)
5. [Source Code Structure](#-source-code-structure)
6. [Testing Infrastructure](#-testing-infrastructure)
7. [Documentation System](#-documentation-system)
8. [Integration Modules](#-integration-modules)
9. [Data & Logs](#-data--logs)
10. [Deployment & Scripts](#-deployment--scripts)

---

## 🎯 Project Overview

**Jaeger AI Ultimate** adalah platform cybersecurity komprehensif yang mengintegrasikan:
- **150+ Security Tools** dengan HexStrike AI
- **Dual AI Support** (Grok 4 Fast + Gemini)
- **Advanced Testing Frameworks** (Jest + Integration Tests)
- **Complete Documentation System**
- **Production-Ready Deployment**

---

## 📂 Root Directory Structure

```
jaeger-ai/
├── 📄 jaeger-ai.js              # 🔴 MAIN APPLICATION FILE
├── 📄 package.json              # 🟢 Node.js dependencies & scripts
├── 📄 package-lock.json         # 🔒 Dependency lock file
├── 📄 README.md                 # 📝 Project documentation
├── 📄 .env                      # ⚠️ Environment variables (SENSITIVE)
├── 📄 .env.example              # 📝 Environment template
├── 📄 .gitignore                # 🚫 Git ignore rules
├── 📄 jest.config.js            # ⚙️ Jest testing configuration
├── 📄 start.sh                  # 🚀 Startup script
├── 📄 user-registration.js      # 👤 User management system
├── 📄 bot-test.js               # 🧪 Bot testing utilities
├── 📄 test-execution.js         # 🔧 Test execution framework
├── 📁 src/                      # 💾 Source code modules
├── 📁 tests/                    # 🧪 Test suites
├── 📁 docs/                     # 📚 Documentation
├── 📁 data/                     # 💾 Application data
├── 📁 logs/                     # 📜 Log files
├── 📁 backup/                   # 💾 Backup files
├── 📁 hexstrike-ai/             # 🔴 HexStrike integration
├── 📁 node_modules/             # 📦 Dependencies (auto-generated)
├── 📄 jaeger.db                 # 🗄️ SQLite database
└── 📁 .git/                     # 🔧 Git repository data
```

---

## 🔴 Core Application Files

### 📄 `jaeger-ai.js` (Main Application)
**Size**: ~122KB | **Lines**: ~3,500+ | **Critical**: YES

```javascript
// Core sections of jaeger-ai.js
├── Environment Configuration (Lines 1-50)
├── Dependencies & Imports (Lines 51-100)
├── Logging System (Lines 101-150)
├── Security Tools Database (Lines 151-1250)
├── API Key Management (Lines 1251-1350)
├── AI Integration Functions (Lines 1351-1800)
├── Tool Execution Engine (Lines 1801-2500)
├── Telegram Bot Handlers (Lines 2501-3200)
├── Database Operations (Lines 3201-3400)
└── Process Management (Lines 3401-3500)
```

**Key Functions**:
- `getPrimaryApiKey()` - AI provider failover management
- `analyzeWithAI()` - Grok 4 Fast & Gemini integration
- `executeTool()` - Security tools execution
- `executeHexStrike()` - HexStrike AI automation
- `chunkMessage()` - Telegram message handling
- `isValidUrl()`, `isValidDomain()`, `isValidPort()` - Security validation

**Security Features**:
- Input sanitization & validation
- API key rotation & failover
- Rate limiting & user sessions
- Secure file upload handling
- SQL injection prevention

---

### 📄 `user-registration.js` (User Management)
**Purpose**: Complete user registration & authentication system

```javascript
class UserManager {
    constructor()              // Initialize SQLite database
    initDatabase()            // Create user tables
    registerUser()            // New user registration
    authenticateUser()        // User login validation
    getUserProfile()          // Fetch user data
    updateUserProfile()       // Update user information
    checkPermissions()        // Role-based access control
}
```

**Database Schema**:
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME,
    scan_count INTEGER DEFAULT 0,
    permissions TEXT
);
```

---

## ⚙️ Configuration Files

### 📄 `.env` (Environment Variables)
**⚠️ SENSITIVE FILE - NEVER COMMIT TO GIT**

```bash
# 🤖 Telegram Bot Configuration
BOT_TOKEN=7678112963:AAFJhiZ_0JgITISDX-dkSq75XIifQRRpRtE

# 🧠 AI Providers Configuration
GEMINI_API_KEY=AIzaSyD9UByGCTYv7vyqKo1ZbfPmGWvh0Pn1Dug
OPENROUTER_API_KEY=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
OPENROUTER_API_KEY_BACKUP=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

# 🔧 HexStrike Configuration
HEXSTRIKE_PATH=/home/terrestrial/Desktop/jaeger-ai/hexstrike-ai
HEXSTRIKE_TIMEOUT=300000
HEXSTRIKE_MAX_CONCURRENT=3

# 🗄️ Database Configuration
DATABASE_PATH=./jaeger.db

# 🔒 Security Settings
SESSION_SECRET=your_very_secure_session_secret_here
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=10
```

### 📄 `package.json` (Dependencies & Scripts)

```json
{
  "name": "jaeger-ai",
  "version": "3.0.2",
  "description": "Ultimate Cybersecurity Platform with 150+ Tools & AI",
  "main": "jaeger-ai.js",
  "scripts": {
    "start": "node jaeger-ai.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "dev": "nodemon jaeger-ai.js"
  },
  "dependencies": {
    "telegraf": "^4.16.3",
    "@google/generative-ai": "^0.19.0",
    "node-fetch": "^2.7.0",
    "sqlite3": "^5.1.7",
    "dotenv": "^16.4.5",
    "validator": "^13.12.0",
    "xss": "^1.0.15"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "nodemon": "^3.1.4"
  }
}
```

### 📄 `jest.config.js` (Testing Configuration)

```javascript
module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        '**/*.{js,jsx}',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!jest.config.js'
    ],
    testMatch: [
        '**/tests/**/*.test.js',
        '**/?(*.)+(spec|test).js'
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000
};
```

---

## 💾 Source Code Structure

```
src/
├── 📁 controllers/              # 🎮 Application controllers
│   ├── bot-controller.js        # 🤖 Telegram bot logic
│   ├── tool-controller.js       # 🛠️ Security tools management
│   ├── user-controller.js       # 👤 User management
│   └── ai-controller.js         # 🧠 AI integration logic
├── 📁 models/                   # 🏗️ Data models
│   ├── user.js                  # 👤 User data model
│   ├── scan.js                  # 🔍 Scan results model
│   ├── tool.js                  # 🛠️ Security tool model
│   └── session.js               # 🔐 Session management model
├── 📁 services/                 # 🔧 Business logic services
│   ├── security-service.js      # 🛡️ Security validation
│   ├── ai-service.js            # 🧠 AI analysis service
│   ├── tool-service.js          # 🛠️ Tool execution service
│   └── notification-service.js  # 📢 Telegram notifications
├── 📁 integrations/             # 🔌 External integrations
│   ├── hexstrike-integration.js # 🔴 HexStrike AI integration
│   └── pentestgpt-integration.js # 🧠 PentestGPT integration
├── 📁 utils/                    # 🛠️ Utility functions
│   ├── validators.js            # ✅ Input validation
│   ├── formatters.js            # 📝 Message formatting
│   ├── logger.js                # 📜 Logging utilities
│   └── helpers.js               # 🔧 General helpers
└── 📁 database/                 # 🗄️ Database management
    ├── connection.js            # 🔗 Database connection
    ├── migrations/              # 📋 Database migrations
    └── seeds/                   # 🌱 Initial data
```

### 🔴 `src/integrations/hexstrike-integration.js`

```javascript
class HexStrikeIntegration {
    constructor(options) {
        this.config = {
            hexstrikePath: '/home/terrestrial/Desktop/jaeger-ai/hexstrike-ai',
            toolsPath: '/usr/bin',
            timeout: 300000,
            maxConcurrent: 3
        };
        this.toolsDatabase = this.initializeToolsDatabase();
    }

    initializeToolsDatabase() {
        return {
            network: { /* 30+ network tools */ },
            web: { /* 40+ web security tools */ },
            crypto: { /* 25+ cryptography tools */ },
            forensics: { /* 35+ digital forensics tools */ },
            wireless: { /* 20+ wireless security tools */ }
        };
    }

    async executeTool(toolName, params, options) {
        // Tool execution logic with monitoring
    }

    async analyzeResults(scanOutput) {
        // AI-powered result analysis
    }
}
```

---

## 🧪 Testing Infrastructure

```
tests/
├── 📄 setup.js                 # 🔧 Test environment setup
├── 📄 simple.test.js           # 🧪 Basic functionality tests
├── 📄 jaeger-ai.test.js        # 🔴 Main application tests
├── 📄 integration.test.js      # 🔗 Integration tests
└── 📄 comprehensive.test.js    # 📊 Comprehensive test suite
```

### 📄 `tests/comprehensive.test.js` (New Test Suite)

**Coverage Areas**:
- ✅ Core System Initialization
- ✅ API Configuration & Grok 4 Fast Integration
- ✅ Security Tools Integration (150+ tools)
- ✅ Input Validation & Security
- ✅ AI Analysis Integration
- ✅ User Management & Database
- ✅ Message Processing & Chunking
- ✅ File Operations & Security
- ✅ Tool Execution & Process Management
- ✅ Error Handling & Recovery

**Test Scenarios**:
```javascript
describe('Complete Penetration Testing Workflow', () => {
    test('should handle full security assessment scenario', async () => {
        // 1. Discovery phase - nmap network scan
        // 2. Port scanning - service detection
        // 3. Web directory enumeration - gobuster
        // 4. Vulnerability scanning - nikto
        // Complete workflow simulation
    });
});
```

---

## 📚 Documentation System

```
docs/
├── 📄 FILE_STRUCTURE.md         # 📁 Project structure (basic)
├── 📄 FILE_STRUCTURE_DETAILED.md # 📁 This detailed document
├── 📄 TECH_STACK_DETAILED.md   # 🔧 Complete tech stack
├── 📄 PROCESS_FLOW.md           # 🔄 System workflow
├── 📄 API_REFERENCE.md          # 📋 API documentation
├── 📄 DEPLOYMENT_GUIDE.md       # 🚀 Deployment instructions
├── 📄 SECURITY_GUIDELINES.md    # 🛡️ Security best practices
└── 📁 assets/                   # 🎨 Documentation assets
    ├── diagrams/                # 📊 System diagrams
    ├── screenshots/             # 📸 Interface screenshots
    └── flowcharts/              # 🔄 Process flowcharts
```

---

## 🔌 Integration Modules

### 🔴 HexStrike AI Integration

```
hexstrike-ai/
├── 📄 main.py                   # 🔴 Main HexStrike execution
├── 📄 hexstrike_server.py       # 🌐 HexStrike API server
├── 📄 hexstrike_mcp.py          # 🔌 MCP protocol handler
├── 📁 tools/                    # 🛠️ Security tools database
├── 📁 configs/                  # ⚙️ Tool configurations
├── 📁 results/                  # 📊 Scan results
└── 📁 logs/                     # 📜 HexStrike logs
```

**HexStrike Features**:
- 150+ integrated security tools
- Automated reconnaissance & scanning
- AI-powered vulnerability analysis
- MCP protocol support
- Real-time execution monitoring

---

## 💾 Data & Logs

```
data/
├── 📁 scans/                    # 🔍 Scan results storage
├── 📁 reports/                  # 📋 Generated reports
├── 📁 exports/                  # 📤 Data exports
└── 📁 cache/                    # ⚡ Temporary cache

logs/
├── 📄 jaeger.log               # 📜 Main application logs
├── 📄 error.log                # ❌ Error logs
├── 📄 security.log             # 🛡️ Security events
├── 📄 ai.log                   # 🧠 AI operations
└── 📁 tools/                   # 🛠️ Individual tool logs
    ├── nmap.log
    ├── nikto.log
    └── hexstrike.log

backup/
├── 📄 jaeger-ai-v3.0.1-stable.js  # 🔄 Previous version
├── 📁 configs/                     # ⚙️ Configuration backups
└── 📁 database/                    # 🗄️ Database backups
```

---

## 🚀 Deployment & Scripts

### 📄 `start.sh` (Startup Script)

```bash
#!/bin/bash
# Jaeger AI Ultimate Startup Script

echo "🚀 Starting Jaeger AI Ultimate v3.0.2..."

# Environment check
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Dependencies check
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Database initialization
if [ ! -f "jaeger.db" ]; then
    echo "🗄️ Initializing database..."
    node -e "const UserManager = require('./user-registration'); new UserManager();"
fi

# HexStrike check
if [ ! -d "hexstrike-ai" ]; then
    echo "🔴 HexStrike directory created"
    mkdir -p hexstrike-ai
fi

# Start application
echo "✅ Starting Jaeger AI..."
node jaeger-ai.js
```

---

## 📊 File Statistics & Metrics

| Category | Files | Lines | Size | Critical |
|----------|-------|-------|------|----------|
| Core Application | 1 | 3,500+ | 122KB | 🔴 HIGH |
| Source Code | 15+ | 2,000+ | 80KB | 🟡 MEDIUM |
| Tests | 4 | 800+ | 35KB | 🟢 LOW |
| Documentation | 8+ | 1,500+ | 60KB | 🟢 LOW |
| Configuration | 6 | 200+ | 15KB | 🟡 MEDIUM |
| **TOTAL** | **34+** | **8,000+** | **312KB** | - |

---

## 🔒 Security Considerations

### Environment Variables Protection
- ✅ `.env` file in `.gitignore`
- ✅ `.env.example` template provided
- ✅ Environment validation on startup
- ✅ API key rotation support

### Input Validation
- ✅ URL validation (`isValidUrl()`)
- ✅ Domain validation (`isValidDomain()`)
- ✅ Port validation (`isValidPort()`)
- ✅ File type validation (`isAllowedFileType()`)
- ✅ XSS protection with `xss` package

### Database Security
- ✅ SQLite with parameterized queries
- ✅ User session management
- ✅ Role-based access control
- ✅ SQL injection prevention

---

## 📈 Performance Metrics

### Resource Usage
- **Memory**: ~150MB baseline, ~500MB during heavy scans
- **CPU**: 10-30% during normal operation, 80%+ during scans
- **Disk**: ~312KB codebase, variable data growth
- **Network**: Depends on AI API usage & tool operations

### Scalability
- **Concurrent Users**: 100+ supported
- **Concurrent Scans**: 5 max (configurable)
- **Tool Timeout**: 5 minutes default
- **Message Chunking**: 3,800 chars per message

---

## 🔄 Update History

| Version | Date | Changes |
|---------|------|---------|
| v3.0.2 | Sep 24, 2025 | Grok 4 Fast integration, comprehensive tests |
| v3.0.1 | Sep 19, 2025 | HexStrike integration, dual AI support |
| v3.0.0 | Sep 15, 2025 | Major rewrite, 150+ tools integration |

---

## 💡 Development Guidelines

### Code Style
- Use camelCase for variables and functions
- Use PascalCase for classes and constructors
- Add JSDoc comments for all functions
- Follow async/await pattern for promises
- Implement proper error handling

### Testing Requirements
- Unit tests for all core functions
- Integration tests for external APIs
- Security tests for validation functions
- Performance tests for heavy operations
- Coverage target: 80%+

### Documentation Standards
- Update this file when adding new modules
- Document all API endpoints and functions
- Include examples for complex operations
- Maintain version history
- Use clear, descriptive naming

---

**📋 This document serves as the definitive guide to the Jaeger AI Ultimate file structure and architecture. Keep it updated as the project evolves.**