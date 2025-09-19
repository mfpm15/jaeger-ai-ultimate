# 🚀 Jaeger AI Ultimate - Public Deployment Guide

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: v18.0.0 or higher
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 10GB free space
- **Network**: Stable internet connection

### Required API Keys
1. **Telegram Bot Token** (REQUIRED)
   - Go to [@BotFather](https://t.me/BotFather) on Telegram
   - Create new bot: `/newbot`
   - Copy the bot token

2. **Google Gemini API Key** (REQUIRED)
   - Visit: [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create API key
   - Copy the key

3. **OpenRouter API Keys** (REQUIRED for AI Analysis)
   - Visit: [OpenRouter.ai](https://openrouter.ai/keys)
   - Create account and get API keys
   - Get 2 keys for failover system

---

## 🛠️ Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/jaeger-ai/jaeger-ai.git
cd jaeger-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env
```

### 4. Essential Environment Variables
```env
# TELEGRAM BOT (REQUIRED)
BOT_TOKEN=your_telegram_bot_token_here

# AI PROVIDERS (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_primary_openrouter_key_here
OPENROUTER_API_KEY_BACKUP=your_backup_openrouter_key_here

# PRODUCTION SETTINGS
NODE_ENV=production
LOG_LEVEL=info

# RATE LIMITING
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=10

# ADMIN USER IDS (comma separated)
ADMIN_USER_IDS=your_telegram_user_id,another_admin_id
```

---

## 🔧 Security Configuration

### 1. File Permissions
```bash
chmod 600 .env
chmod +x start.sh
mkdir -p data logs
chmod 755 data logs
```

### 2. Firewall Setup (Optional)
```bash
# Allow SSH and HTTP/HTTPS only
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

### 3. Process Management with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jaeger-ai',
    script: 'jaeger-ai.js',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF
```

---

## 🚀 Deployment Options

### Option 1: Direct Deployment
```bash
# Start the bot
NODE_ENV=production node jaeger-ai.js
```

### Option 2: PM2 Deployment (Recommended)
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Enable startup script
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs jaeger-ai
```

### Option 3: Docker Deployment
```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p data logs
RUN chmod 600 .env

EXPOSE 3000
USER node

CMD ["node", "jaeger-ai.js"]
EOF

# Build and run
docker build -t jaeger-ai .
docker run -d --name jaeger-ai --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  jaeger-ai
```

---

## 📊 Monitoring & Maintenance

### 1. Log Monitoring
```bash
# PM2 logs
pm2 logs jaeger-ai --lines 100

# Direct file monitoring
tail -f logs/jaeger.log

# Error logs
tail -f logs/err.log
```

### 2. Health Checks
```bash
# Check bot status
pm2 status

# Memory usage
pm2 monit

# System resources
htop
df -h
```

### 3. User Management
```bash
# Check user database
cat data/users.json | jq '.stats'

# Monitor active users
grep "User accessing" logs/jaeger.log | tail -20
```

---

## 🔐 Security Best Practices

### 1. API Key Security
- ✅ Never commit .env file to git
- ✅ Use strong, unique API keys
- ✅ Rotate keys regularly
- ✅ Monitor API usage limits

### 2. Access Control
- ✅ Set admin user IDs properly
- ✅ Monitor user registration
- ✅ Review suspicious activities
- ✅ Implement rate limiting

### 3. System Security
- ✅ Keep system updated: `sudo apt update && sudo apt upgrade`
- ✅ Use firewall (ufw or iptables)
- ✅ Regular backups of user data
- ✅ Monitor system logs

---

## 🔄 Automatic Updates

### 1. Create Update Script
```bash
cat > update.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating Jaeger AI..."

# Stop the bot
pm2 stop jaeger-ai

# Backup current version
cp -r . ../jaeger-ai-backup-$(date +%Y%m%d)

# Pull updates
git pull origin main

# Install dependencies
npm install

# Restart bot
pm2 start jaeger-ai

echo "✅ Update completed!"
EOF

chmod +x update.sh
```

### 2. Scheduled Updates (Optional)
```bash
# Add to crontab for weekly updates
crontab -e

# Add this line for Sunday 2 AM updates
0 2 * * 0 cd /path/to/jaeger-ai && ./update.sh >> logs/update.log 2>&1
```

---

## 🎯 Testing Deployment

### 1. Bot Functionality Test
1. Start your bot
2. Send `/start` command in Telegram
3. Try: `scan google.com`
4. Check if AI analysis works
5. Verify tool execution

### 2. Load Testing
```bash
# Monitor during peak usage
watch -n 1 'pm2 status && echo "Memory:" && free -h'
```

### 3. API Key Failover Test
1. Use invalid primary API key
2. Check if backup key activates
3. Monitor logs for failover messages

---

## 📱 Public Bot Setup

### 1. Bot Configuration
- Set bot username with @BotFather
- Add bot description and about text
- Upload profile picture
- Set bot commands menu

### 2. BotFather Commands
```
/setcommands

start - Start the bot and register
help - Show help and commands
menu - Open interactive menu
status - Check your account status
```

### 3. Bot Description
```
Jaeger AI Ultimate - Advanced Cybersecurity Platform

🔹 141+ Security Tools
🔹 AI-Powered Analysis
🔹 Real Tool Execution
🔹 10 Free Scans/Day

⚠️ For authorized testing only!
```

---

## ⚠️ Legal Compliance

### 1. Terms of Service
Create clear terms prohibiting:
- Unauthorized scanning
- Illegal activities
- Abuse of service
- Commercial misuse

### 2. User Agreement
Users must acknowledge:
- Responsibility for their actions
- Compliance with local laws
- Authorized testing only
- No liability for misuse

### 3. Monitoring
- Log all activities
- Monitor for abuse
- Suspend violators
- Report illegal activities

---

## 🆘 Troubleshooting

### Common Issues

**Bot not responding:**
```bash
pm2 restart jaeger-ai
pm2 logs jaeger-ai
```

**API key errors:**
```bash
# Check environment variables
grep API .env

# Test API connectivity
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/models
```

**High memory usage:**
```bash
# Restart bot
pm2 restart jaeger-ai

# Check for memory leaks
pm2 monit
```

**Database issues:**
```bash
# Check user database
cat data/users.json | jq '.'

# Backup and reset if corrupted
cp data/users.json data/users.json.backup
echo '{"users":{},"stats":{"totalUsers":0,"totalScans":0}}' > data/users.json
```

---

## 📧 Support

### Getting Help
- 📖 Documentation: Check TUTORIAL.md
- 🐛 Bug Reports: GitHub Issues
- 💬 Community: Telegram Group
- 📧 Email: support@jaeger-ai.com

### Emergency Contacts
- **Security Issues**: security@jaeger-ai.com
- **Abuse Reports**: abuse@jaeger-ai.com
- **Technical Support**: tech@jaeger-ai.com

---

**🎉 Ready to Deploy! Your Jaeger AI Ultimate bot is now ready for public use!**

Remember: Always ensure users have proper authorization before scanning any systems.