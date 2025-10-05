#!/bin/bash

# JAEGER AI - Startup Script
# Starts HexStrike MCP Server and Jaeger Telegram Bot

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   JAEGER AI - Startup Script             ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create .env file with:${NC}"
    echo "BOT_TOKEN=your_telegram_bot_token"
    echo "OPENROUTER_API_KEY=your_openrouter_api_key"
    exit 1
fi

# Check if HexStrike directory exists
if [ ! -d "hexstrike-ai-new" ]; then
    echo -e "${RED}❌ Error: hexstrike-ai-new directory not found!${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}⛔ Shutting down...${NC}"
    kill $HEXSTRIKE_PID 2>/dev/null || true
    kill $JAEGER_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start HexStrike MCP Server
echo -e "${CYAN}🚀 Starting HexStrike MCP Server...${NC}"
cd hexstrike-ai-new
./hexstrike-env/bin/python3 hexstrike_server.py &
HEXSTRIKE_PID=$!
cd ..

# Wait for HexStrike to be ready
echo -e "${YELLOW}⏳ Waiting for HexStrike server to start...${NC}"
sleep 5

# Check if HexStrike is healthy
HEALTH_CHECK=$(curl -s http://127.0.0.1:8888/health || echo "failed")
if [[ $HEALTH_CHECK == *"healthy"* ]] || [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✅ HexStrike MCP Server is running!${NC}"
else
    echo -e "${RED}❌ HexStrike server failed to start!${NC}"
    kill $HEXSTRIKE_PID 2>/dev/null || true
    exit 1
fi

# Start Jaeger Telegram Bot
echo -e "${CYAN}🤖 Starting Jaeger Telegram Bot...${NC}"
node jaeger-telegram-bot.js &
JAEGER_PID=$!

echo -e "${GREEN}✅ Jaeger AI started successfully!${NC}"
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   System Status:                          ║${NC}"
echo -e "${CYAN}║   • HexStrike MCP: Running (PID $HEXSTRIKE_PID)    ║${NC}"
echo -e "${CYAN}║   • Telegram Bot: Running (PID $JAEGER_PID)     ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
wait
