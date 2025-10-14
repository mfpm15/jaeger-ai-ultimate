#!/bin/bash

###############################################################################
# JAEGER AI - Deployment Preparation Script
#
# Script ini akan:
# 1. Check semua requirements
# 2. Prepare cloudflare-build untuk deployment
# 3. Buat .zip file yang clean untuk upload
# 4. Verify semua file ready
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   JAEGER AI - Deployment Preparation Tool            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function: Print with icon
print_step() {
    echo -e "${CYAN}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if in correct directory
if [ ! -d "cloudflare-build" ]; then
    print_error "cloudflare-build directory not found!"
    echo "Please run this script from jaeger-ai root directory"
    exit 1
fi

print_success "Found cloudflare-build directory"
echo ""

# Step 1: Check Requirements
print_step "Step 1: Checking requirements..."
echo ""

# Check node
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_warning "Node.js not installed (required for Wrangler/Vercel CLI)"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_warning "npm not installed"
fi

# Check wrangler
if command -v wrangler &> /dev/null; then
    WRANGLER_VERSION=$(wrangler --version)
    print_success "Wrangler CLI installed: $WRANGLER_VERSION"
else
    print_warning "Wrangler CLI not installed (install: npm install -g wrangler)"
fi

# Check vercel
if command -v vercel &> /dev/null; then
    print_success "Vercel CLI installed"
else
    print_warning "Vercel CLI not installed (install: npm install -g vercel)"
fi

# Check MCP Server
print_step "Checking Jaeger MCP Server..."
if curl -s http://127.0.0.1:8888/health > /dev/null 2>&1; then
    print_success "MCP Server is running ✅"
else
    print_warning "MCP Server not running (start with: ./START_ALL.sh)"
fi

echo ""

# Step 2: Verify cloudflare-build contents
print_step "Step 2: Verifying cloudflare-build contents..."
echo ""

REQUIRED_FILES=(
    "cloudflare-build/index.html"
    "cloudflare-build/_worker.js"
    "cloudflare-build/wrangler.toml"
    "cloudflare-build/_redirects"
    "cloudflare-build/DEPLOY.md"
)

ALL_GOOD=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
    else
        print_error "Missing: $file"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = false ]; then
    print_error "Some required files are missing!"
    print_warning "Run: ./CONVERT_TO_CLOUDFLARE.sh to regenerate"
    exit 1
fi

echo ""

# Step 3: Check _worker.js configuration
print_step "Step 3: Checking Worker configuration..."
echo ""

if grep -q "YOUR-VPS-IP-OR-DOMAIN" cloudflare-build/_worker.js; then
    print_warning "⚠️  Worker needs configuration!"
    echo ""
    echo -e "${YELLOW}   You need to edit cloudflare-build/_worker.js${NC}"
    echo -e "${YELLOW}   Change: JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888'${NC}"
    echo -e "${YELLOW}   To: JAEGER_MCP_URL = 'http://YOUR-ACTUAL-IP:8888'${NC}"
    echo ""
    WORKER_CONFIGURED=false
else
    print_success "Worker configuration looks good"
    WORKER_CONFIGURED=true
fi

# Step 4: Create clean deployment package
print_step "Step 4: Creating clean deployment package..."
echo ""

# Remove old zip if exists
rm -f jaeger-cloudflare-deploy.zip
rm -f jaeger-vercel-deploy.zip

# Create Cloudflare deployment package
print_step "Creating: jaeger-cloudflare-deploy.zip"
cd cloudflare-build
zip -r ../jaeger-cloudflare-deploy.zip \
    index.html \
    _worker.js \
    wrangler.toml \
    _redirects \
    DEPLOY.md \
    assets/ \
    -x "*.DS_Store" "*.git*" "*node_modules*" > /dev/null 2>&1
cd ..
print_success "Created: jaeger-cloudflare-deploy.zip ($(du -h jaeger-cloudflare-deploy.zip | cut -f1))"

# Create Vercel deployment package (same content, different name for clarity)
cp jaeger-cloudflare-deploy.zip jaeger-vercel-deploy.zip
print_success "Created: jaeger-vercel-deploy.zip ($(du -h jaeger-vercel-deploy.zip | cut -f1))"

echo ""

# Step 5: Summary
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              PREPARATION COMPLETE ✅                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

print_success "Deployment packages created:"
echo "   📦 jaeger-cloudflare-deploy.zip - Ready for Cloudflare"
echo "   📦 jaeger-vercel-deploy.zip - Ready for Vercel"
echo ""

if [ "$WORKER_CONFIGURED" = false ]; then
    print_warning "IMPORTANT: Configure _worker.js before deploying!"
    echo ""
fi

echo -e "${CYAN}📚 Next Steps:${NC}"
echo ""
echo -e "${GREEN}For Cloudflare Deployment:${NC}"
echo "   1. Read: CLOUDFLARE_DEPLOY_COMPLETE_GUIDE.md"
echo "   2. Configure: cloudflare-build/_worker.js (if not done)"
echo "   3. Run: cd cloudflare-build && wrangler pages deploy ."
echo ""

echo -e "${GREEN}For Vercel Deployment:${NC}"
echo "   1. Read: VERCEL_DEPLOY_GUIDE.md"
echo "   2. Go to: https://vercel.com/new"
echo "   3. Upload: jaeger-vercel-deploy.zip"
echo "   4. Configure environment: JAEGER_MCP_URL"
echo ""

echo -e "${CYAN}📋 Documentation:${NC}"
echo "   • CLOUDFLARE_DEPLOY_COMPLETE_GUIDE.md - Cloudflare guide (detail)"
echo "   • VERCEL_DEPLOY_GUIDE.md - Vercel guide (detail)"
echo "   • DEPLOYMENT_SUMMARY.md - Overall summary"
echo "   • cloudflare-build/DEPLOY.md - Quick reference"
echo ""

echo -e "${GREEN}✨ Ready to deploy!${NC}"
echo ""
