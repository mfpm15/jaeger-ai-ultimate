#!/bin/bash

# JAEGER AI - Unified Startup Script
# Starts ALL services: Jaeger MCP + Telegram Bot + Web Interface

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        JAEGER AI - ALL SERVICES STARTUP               ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║  🎯 Jaeger MCP Server                                 ║${NC}"
echo -e "${CYAN}║  🤖 Telegram Bot                                      ║${NC}"
echo -e "${CYAN}║  🌐 Web Interface (Next.js)                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found!${NC}"
    echo -e "${YELLOW}   Telegram bot requires .env with BOT_TOKEN and OPENROUTER_API_KEY${NC}"
    echo -e "${YELLOW}   Web interface will work without it (no LLM analysis)${NC}"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if jaeger-ai-core directory exists
if [ ! -d "jaeger-ai-core" ]; then
    echo -e "${RED}❌ Error: jaeger-ai-core directory not found!${NC}"
    exit 1
fi

# Check if web-next directory exists
if [ ! -d "web-next" ]; then
    echo -e "${RED}❌ Error: web-next directory not found!${NC}"
    exit 1
fi

# Check if web-next dependencies are installed (node_modules exists)
if [ ! -d "web-next/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Web interface dependencies not installed.${NC}"
    echo -e "${YELLOW}   Run: npm install --prefix web-next${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Python virtual environment exists
if [ ! -d "jaeger-ai-core/jaeger-env" ]; then
    echo -e "${YELLOW}⚠️  Python virtual environment not found. Creating...${NC}"
    cd jaeger-ai-core
    python3 -m venv jaeger-env
    ./jaeger-env/bin/pip install -r requirements.txt
    cd ..
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}⛔ Shutting down all services...${NC}"
    kill $JAEGER_PID 2>/dev/null || true
    kill $TELEGRAM_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 1. Start Jaeger MCP Server
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 [1/3] Starting Jaeger MCP Server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

API_PORT=${JAEGER_PORT:-8888}
if lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}   ⚠️  Port $API_PORT is currently in use. Attempting graceful shutdown...${NC}"
    pkill -f "jaeger_server.py" 2>/dev/null || true
    pkill -f "python3 .*jaeger_server.py" 2>/dev/null || true
    sleep 2
    if lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}   ❌ Port $API_PORT is still occupied. Please stop the running process and try again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}   ✅ Port $API_PORT cleared.${NC}"
fi

cd jaeger-ai-core
./jaeger-env/bin/python3 jaeger_server.py > ../jaeger-mcp.log 2>&1 &
JAEGER_PID=$!
cd ..
echo -e "${YELLOW}   PID: $JAEGER_PID${NC}"
echo -e "${YELLOW}   Log: jaeger-mcp.log${NC}"

# Wait for Jaeger to be ready
echo -e "${YELLOW}   ⏳ Waiting for server to start...${NC}"
sleep 8

# Check if Jaeger is healthy
HEALTH_CHECK=$(curl -s http://127.0.0.1:${API_PORT}/health 2>/dev/null || echo "failed")
if [[ $HEALTH_CHECK == *"healthy"* ]] || [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}   ✅ Jaeger MCP Server is running!${NC}"
    echo -e "${GREEN}   📡 API: http://127.0.0.1:${API_PORT}${NC}"
else
    echo -e "${RED}   ❌ Jaeger server failed to start!${NC}"
    echo -e "${YELLOW}   Check jaeger-mcp.log for details${NC}"
    kill $JAEGER_PID 2>/dev/null || true
    exit 1
fi
echo ""

# 2. Start Telegram Bot (if .env exists)
if [ -f .env ] && grep -q "BOT_TOKEN" .env; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🤖 [2/3] Starting Telegram Bot...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    node jaeger-telegram-bot.js > telegram-bot.log 2>&1 &
    TELEGRAM_PID=$!
    echo -e "${YELLOW}   PID: $TELEGRAM_PID${NC}"
    echo -e "${YELLOW}   Log: telegram-bot.log${NC}"
    sleep 2
    if ps -p $TELEGRAM_PID > /dev/null; then
        echo -e "${GREEN}   ✅ Telegram Bot is running!${NC}"
        echo -e "${GREEN}   💬 Send /start to your bot in Telegram${NC}"
    else
        echo -e "${RED}   ❌ Telegram Bot failed to start!${NC}"
        echo -e "${YELLOW}   Check telegram-bot.log for details${NC}"
    fi
else
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  [2/3] Telegram Bot SKIPPED (no .env or BOT_TOKEN)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    TELEGRAM_PID=0
fi
echo ""

# 3. Start Next.js Web Server
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌐 [3/3] Starting Web Interface (Next.js)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}   ⚠️  Port 3000 is already in use. Stopping existing process...${NC}"
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*web-next" 2>/dev/null || true
    sleep 1
fi

LOG_FILE="web-next.log"
npm run web:dev > "$LOG_FILE" 2>&1 &
WEB_PID=$!
echo -e "${YELLOW}   PID: $WEB_PID${NC}"
echo -e "${YELLOW}   Log: $LOG_FILE${NC}"
sleep 2
if ps -p $WEB_PID > /dev/null; then
    echo -e "${GREEN}   ✅ Web Interface is running!${NC}"
    echo -e "${GREEN}   🌐 URL: ${CYAN}http://localhost:3000${NC}"
else
    echo -e "${RED}   ❌ Web Interface failed to start!${NC}"
    echo -e "${YELLOW}   Check $LOG_FILE for details${NC}"
    tail -5 "$LOG_FILE"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ JAEGER AI - All Services Running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📊 System Status:${NC}"
echo -e "   ${GREEN}•${NC} Jaeger MCP Server: ${GREEN}✅ Running${NC} (PID: $JAEGER_PID)"
if [ $TELEGRAM_PID -ne 0 ]; then
    echo -e "   ${GREEN}•${NC} Telegram Bot:       ${GREEN}✅ Running${NC} (PID: $TELEGRAM_PID)"
else
    echo -e "   ${YELLOW}•${NC} Telegram Bot:       ${YELLOW}⚠️  Skipped${NC}"
fi
echo -e "   ${GREEN}•${NC} Web Interface:      ${GREEN}✅ Running${NC} (PID: $WEB_PID)"
echo ""
echo -e "${CYAN}🔗 Access Points:${NC}"
echo -e "   ${GREEN}•${NC} Web UI:  ${CYAN}http://localhost:3000${NC}"
echo -e "   ${GREEN}•${NC} API:     ${CYAN}http://127.0.0.1:${API_PORT}/health${NC}"
if [ $TELEGRAM_PID -ne 0 ]; then
    echo -e "   ${GREEN}•${NC} Telegram: ${CYAN}Send /start to your bot${NC}"
fi
echo ""
echo -e "${CYAN}📋 Logs (Live Tail):${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services and exit${NC}"
echo ""
echo -e "${GREEN}Starting live log monitoring...${NC}"
sleep 2

# Tail logs in real-time
if [ $TELEGRAM_PID -ne 0 ]; then
    tail -f jaeger-mcp.log telegram-bot.log "$LOG_FILE" 2>/dev/null
else
    tail -f jaeger-mcp.log "$LOG_FILE" 2>/dev/null
fi
echo -e "${CYAN}📝 Logs:${NC}"
echo -e "   ${GREEN}•${NC} MCP:      ${CYAN}tail -f jaeger-mcp.log${NC}"
if [ $TELEGRAM_PID -ne 0 ]; then
    echo -e "   ${GREEN}•${NC} Telegram: ${CYAN}tail -f telegram-bot.log${NC}"
fi
echo -e "   ${GREEN}•${NC} Web:      ${CYAN}tail -f $LOG_FILE${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}💡 Tip: Open ${CYAN}http://localhost:3000${YELLOW} in your browser${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Keep script running
wait
