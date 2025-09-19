#!/bin/bash

# JAEGER AI ENHANCED STARTUP SCRIPT
# Full featured version with monitoring

set -e

echo "🚀 JAEGER AI ENHANCED - FULL FEATURED VERSION"
echo "============================================="
echo ""

# Stop any existing bots
echo "🛑 Stopping any existing bots..."
killall -9 node 2>/dev/null || true
sleep 2

echo "✅ Starting Enhanced Jaeger AI Bot..."
echo "🔹 Features: Full NLP, Red/Blue Team, AI Analysis, Real Scripts"
echo "🔹 Monitoring: Real-time terminal output"
echo "🔹 Tools: nmap, nuclei, gobuster, ping + simulations"
echo ""

# Check dependencies
echo "📦 Checking dependencies..."
node --version
echo "✅ Node.js ready"

if [ -f ".env" ]; then
    echo "✅ Environment file found"
else
    echo "⚠️ No .env file found"
fi

echo ""
echo "🎯 Starting bot with full monitoring..."
echo "📡 All user activities will be shown below:"
echo "============================================="

# Start the enhanced bot
node jaeger-ai.js