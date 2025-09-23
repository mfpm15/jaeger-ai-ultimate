# 📁 Jaeger AI - File & Folder Structure Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Root Directory Structure](#root-directory-structure)
3. [Core Files Documentation](#core-files-documentation)
4. [Source Code Structure](#source-code-structure)
5. [Configuration Files](#configuration-files)
6. [Documentation Files](#documentation-files)
7. [Testing Infrastructure](#testing-infrastructure)
8. [Data & Logs](#data--logs)
9. [Development Guidelines](#development-guidelines)

## 🎯 Project Overview

Jaeger AI is structured as a modular cybersecurity platform with clear separation of concerns. Each directory and file serves a specific purpose in the overall architecture.

```
jaeger-ai/
├── 📁 Core Application Files
├── 📁 Source Code Modules
├── 📁 Configuration Files
├── 📁 Documentation
├── 📁 Testing Suite
├── 📁 Data Storage
└── 📁 Backup & Archive
```

## 🏗️ Root Directory Structure

```
jaeger-ai/
├── jaeger-ai.js                 # 🚀 Main application entry point
├── user-registration.js         # 👤 User management system
├── package.json                 # 📦 Project dependencies & metadata
├── package-lock.json           # 🔒 Exact dependency versions
├── jest.config.js              # 🧪 Test configuration
├── .env                        # 🔐 Environment variables (sensitive)
├── .env.example                # 📋 Environment template
├── .gitignore                  # 🚫 Git ignore rules
├── README.md                   # 📖 Project documentation
├── start.sh                    # 🚀 Application startup script
├── 📁 backup/                  # 🗄️ Backup files & old versions
├── 📁 data/                    # 💾 Application data storage
├── 📁 docs/                    # 📚 Documentation files
├── 📁 hexstrike-ai/           # 🔴 HexStrike integration
├── 📁 logs/                    # 📋 Application logs
├── 📁 node_modules/           # 📦 NPM dependencies
├── 📁 PentestGPT/             # 🤖 PentestGPT integration
├── 📁 src/                     # 💻 Source code modules
└── 📁 tests/                   # 🧪 Test suite
```

## 📋 Core Files Documentation

### 🚀 jaeger-ai.js (Main Application)
**Purpose**: Primary application entry point and core bot logic
**Size**: ~123KB (3000+ lines)
**Key Responsibilities**:
- Telegram bot initialization and configuration
- API key management and failover logic
- Security tools integration (141+ tools)
- AI analysis pipeline (Grok 4 Fast, DeepSeek, Gemini)
- User interaction handling
- Command processing and routing
- Error handling and recovery
- Process management for tool execution

**Critical Components**:
```javascript
// API Key Management
const apiKeyStatus = {
    grok: { /* Grok 4 Fast configuration */ },
    deepseek: { /* DeepSeek backup configuration */ }
};

// Security Tools Database
const securityTools = {
    // 141+ tools organized by category
    nmap: { category: 'Network', command: 'nmap' },
    // ... other tools
};

// AI Analysis Functions
async function analyzeWithAI(data) { /* ... */ }
```

**Dependencies**:
- Telegraf (Telegram Bot Framework)
- Google Generative AI (Gemini)
- Node-fetch (HTTP requests)
- SQLite3 (Database operations)
- XSS & Validator (Security)

### 👤 user-registration.js (User Management)
**Purpose**: User registration, authentication, and session management
**Size**: ~4KB (151 lines)
**Key Features**:
- User registration and validation
- Session management
- Permission handling
- Activity tracking
- User statistics
- Suspension/reactivation system

**Database Schema**:
```json
{
  "users": {
    "userId": {
      "telegramId": "number",
      "username": "string",
      "registrationDate": "ISO string",
      "permissions": { "maxScansPerDay": 10 },
      "scansPerformed": "number"
    }
  },
  "stats": {
    "totalUsers": "number",
    "totalScans": "number"
  }
}
```

### 📦 package.json (Project Configuration)
**Purpose**: NPM package configuration and metadata
**Key Sections**:
```json
{
  "name": "jaeger-ai",
  "version": "3.0.1",
  "main": "jaeger-ai.js",
  "scripts": {
    "start": "node jaeger-ai.js",
    "test": "jest --detectOpenHandles --forceExit"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "telegraf": "^4.16.3"
  },
  "devDependencies": {
    "jest": "^30.1.3",
    "supertest": "^7.1.4"
  }
}
```

## 💻 Source Code Structure

### 📁 src/ Directory
**Purpose**: Modular source code organization
**Structure**:
```
src/
├── core/                       # Core system modules
│   ├── red-blue-ops.js        # Red/Blue team operations
│   └── tool-manager.js        # Tool execution management
├── integrations/               # External tool integrations
│   ├── hexstrike-integration.js # HexStrike AI integration
│   └── pentestgpt-integration.js # PentestGPT integration
├── nlp/                        # Natural Language Processing
│   └── intent-classifier.js   # Command intent classification
└── security/                   # Security modules
    └── input-validator.js      # Input validation & sanitization
```

### 🔧 Module Details

#### 🎯 core/tool-manager.js
**Purpose**: Centralized tool execution and management
**Features**:
- Tool process spawning
- Timeout management
- Output capture and processing
- Resource monitoring
- Cleanup operations

#### 🔴 integrations/hexstrike-integration.js
**Purpose**: Advanced AI-powered security testing integration
**Capabilities**:
- AI-enhanced vulnerability detection
- Automated exploitation
- Advanced payload generation
- Real-time threat analysis

#### 🤖 integrations/pentestgpt-integration.js
**Purpose**: GPT-4 powered penetration testing
**Features**:
- Interactive testing sessions
- Intelligent attack planning
- Automated reasoning
- Comprehensive reporting

#### 🧠 nlp/intent-classifier.js
**Purpose**: Natural language command understanding
**Functions**:
- Command intent recognition
- Parameter extraction
- Target validation
- Tool suggestion

#### 🛡️ security/input-validator.js
**Purpose**: Security validation and sanitization
**Protection Against**:
- XSS attacks
- Command injection
- SQL injection
- Path traversal
- Malicious input patterns

## ⚙️ Configuration Files

### 🔐 .env (Environment Variables)
**Purpose**: Sensitive configuration data
**Critical Variables**:
```bash
# Telegram Bot
BOT_TOKEN=7678112963:AAFJhiZ_...

# AI Providers
GEMINI_API_KEY=AIzaSyD9UByGCTYv7vyqKo1ZbfPmGWvh0Pn1Dug
OPENROUTER_API_KEY=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

# Database
DATABASE_PATH=./jaeger.db

# Security Settings
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=10
```

**Security Notes**:
- ⚠️ Never commit this file to version control
- 🔒 Contains sensitive API keys and tokens
- 🛡️ Should have restricted file permissions (600)

### 📋 .env.example (Environment Template)
**Purpose**: Template for environment configuration
**Usage**: Copy to `.env` and fill in actual values

### 🧪 jest.config.js (Test Configuration)
**Purpose**: Jest testing framework configuration
**Settings**:
```javascript
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: ['jaeger-ai.js', 'src/**/*.js'],
    testTimeout: 30000
};
```

## 📚 Documentation Files

### 📁 docs/ Directory
```
docs/
├── PROCESS_FLOW.md            # Complete process flow documentation
├── FILE_STRUCTURE.md          # This file - structure documentation
├── API_REFERENCE.md           # API endpoints and usage (if applicable)
├── DEPLOYMENT.md              # Deployment instructions
└── TROUBLESHOOTING.md         # Common issues and solutions
```

### 📖 README.md (Project Documentation)
**Purpose**: Primary project documentation
**Sections**:
- Project overview
- Installation instructions
- Usage examples
- Configuration guide
- Contributing guidelines

## 🧪 Testing Infrastructure

### 📁 tests/ Directory
```
tests/
├── setup.js                   # Test environment configuration
├── simple.test.js             # Basic functionality tests
├── integration.test.js        # Integration tests
└── jaeger-ai.test.js          # Comprehensive test suite
```

### 🔬 Test File Details

#### ⚙️ setup.js
**Purpose**: Test environment initialization
**Functions**:
- Mock dependencies
- Set test environment variables
- Configure test utilities
- Suppress console output during tests

#### 🧪 integration.test.js
**Purpose**: End-to-end integration testing
**Test Categories**:
- File structure validation
- Configuration verification
- Dependency loading
- Security checks

#### 🎯 jaeger-ai.test.js
**Purpose**: Comprehensive unit testing
**Coverage Areas**:
- API key management
- Security validation
- Database operations
- Tool integration
- Error handling

## 💾 Data & Logs

### 📁 data/ Directory
**Purpose**: Application data storage
**Contents**:
```
data/
├── users.json                 # User registration database
├── scan_history.json          # Historical scan results
├── sessions.json              # Active user sessions
└── statistics.json            # Usage statistics
```

### 📋 logs/ Directory
**Purpose**: Application logging
**Log Types**:
```
logs/
├── jaeger.log                 # Main application log
├── error.log                  # Error-specific logging
├── security.log               # Security events
├── pentestgpt/               # PentestGPT specific logs
└── archive/                   # Archived log files
```

### 📊 Log Categories
- **INFO**: General operations and status
- **SUCCESS**: Completed operations
- **ERROR**: Error conditions and failures
- **WARN**: Warning conditions
- **USER**: User activities and interactions
- **TOOL**: Tool execution logs
- **AI**: AI provider interactions
- **SECURITY**: Security-related events

## 🗄️ Backup & Archive

### 📁 backup/ Directory
**Purpose**: Backup storage for old versions and test files
**Contents**:
```
backup/
├── jaeger-ai-v3.0.1-stable.js # Previous stable version
├── test-scenarios.js          # Legacy test scenarios
├── test-v3.0.2.js            # Version-specific tests
└── user-registration.js       # Backup of user management
```

**Maintenance**:
- 🔄 Automatically populated during updates
- 🗓️ Periodic cleanup of old backups
- 📦 Compressed storage for space efficiency

## 🔧 External Integrations

### 📁 hexstrike-ai/ Directory
**Purpose**: HexStrike AI integration
**Structure**:
```
hexstrike-ai/
├── main.py                    # HexStrike main execution
├── config/                    # Configuration files
├── models/                    # AI models
└── outputs/                   # Generated reports
```

### 📁 PentestGPT/ Directory
**Purpose**: PentestGPT integration
**Structure**:
```
PentestGPT/
├── pentestgpt.py             # Main PentestGPT script
├── configs/                   # Configuration files
├── utils/                     # Utility functions
└── logs/                      # PentestGPT logs
```

## 👨‍💻 Development Guidelines

### 📝 File Naming Conventions
- **JavaScript Files**: kebab-case (e.g., `user-registration.js`)
- **Configuration Files**: dot notation (e.g., `.env`, `.gitignore`)
- **Documentation**: UPPERCASE.md (e.g., `README.md`, `PROCESS_FLOW.md`)
- **Test Files**: *.test.js (e.g., `integration.test.js`)

### 📊 Code Organization
- **Modular Structure**: Separate concerns into different modules
- **Clear Dependencies**: Explicit require statements at the top
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Consistent logging throughout the application
- **Comments**: JSDoc-style comments for functions

### 🔒 Security Considerations
- **Input Validation**: All user inputs must be validated
- **Environment Variables**: Sensitive data in .env files only
- **Process Isolation**: External tools run in isolated processes
- **Rate Limiting**: Prevent abuse with rate limiting
- **Audit Trails**: Log all significant operations

### 🧪 Testing Standards
- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test component interactions
- **Mocking**: Mock external dependencies
- **Coverage**: Aim for >80% code coverage
- **CI/CD**: Automated testing on commits

### 📦 Deployment Structure
```
Production Deployment/
├── jaeger-ai.js              # Main application
├── user-registration.js      # User management
├── .env                      # Production environment
├── package.json              # Dependencies
├── src/                      # Source modules
├── data/                     # Production data
├── logs/                     # Production logs
└── start.sh                  # Startup script
```

### 🔄 Version Control
- **Git Workflow**: Feature branches → main
- **Commit Messages**: Conventional commits format
- **Releases**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Backups**: Automatic backup before major updates

---

## 🎯 Quick Reference

### 📁 Most Important Files
1. **jaeger-ai.js** - Main application logic
2. **.env** - Configuration (sensitive)
3. **package.json** - Dependencies
4. **user-registration.js** - User management
5. **tests/** - Test suite

### 🚀 Getting Started
1. Copy `.env.example` to `.env`
2. Configure API keys and tokens
3. Run `npm install`
4. Execute `npm start`
5. Run `npm test` for validation

### 🔧 Maintenance Tasks
- **Daily**: Monitor logs for errors
- **Weekly**: Review user activity
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Major version update

---

*This documentation serves as a comprehensive guide for developers working on the Jaeger AI project. Keep it updated as the codebase evolves.*