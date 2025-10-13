#!/bin/bash

# JAEGER AI - Web Interface Quick Start Script
# Starts Jaeger MCP Server and Web Interface

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   JAEGER AI - Web Interface Startup      ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Note: Web interface works without LLM, but Telegram bot needs it.${NC}"
    echo ""
fi

# Check if jaeger-ai-core directory exists
if [ ! -d "jaeger-ai-core" ]; then
    echo -e "${RED}❌ Error: jaeger-ai-core directory not found!${NC}"
    exit 1
fi

# Check if web-interface directory exists
if [ ! -d "web-interface" ]; then
    echo -e "${RED}❌ Error: web-interface directory not found!${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}⛔ Shutting down...${NC}"
    kill $JAEGER_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Jaeger MCP Server
echo -e "${CYAN}🚀 Starting Jaeger MCP Server...${NC}"
cd jaeger-ai-core
./jaeger-env/bin/python3 jaeger_server.py &
JAEGER_PID=$!
cd ..

# Wait for Jaeger to be ready
echo -e "${YELLOW}⏳ Waiting for Jaeger server to start...${NC}"
sleep 5

# Check if Jaeger is healthy
HEALTH_CHECK=$(curl -s http://127.0.0.1:8888/health || echo "failed")
if [[ $HEALTH_CHECK == *"healthy"* ]] || [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✅ Jaeger MCP Server is running!${NC}"
else
    echo -e "${RED}❌ Jaeger server failed to start!${NC}"
    kill $JAEGER_PID 2>/dev/null || true
    exit 1
fi

# Start PHP Web Server
echo -e "${CYAN}🌐 Starting PHP Web Server...${NC}"
cd web-interface
php -S localhost:8080 > ../web-server.log 2>&1 &
WEB_PID=$!
cd ..

# Wait for web server
sleep 2

echo -e "${GREEN}✅ Web Interface started successfully!${NC}"
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   System Status:                          ║${NC}"
echo -e "${CYAN}║   • Jaeger MCP: Running (PID $JAEGER_PID)    ║${NC}"
echo -e "${CYAN}║   • Web Server: Running (PID $WEB_PID)     ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 Web Interface: ${CYAN}http://localhost:8080${NC}"
echo -e "${GREEN}📊 API Health: ${CYAN}http://127.0.0.1:8888/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
wait
