#!/bin/bash

###############################################################################
# JAEGER AI - Cloudflare Deployment Conversion Script
#
# Converts PHP web interface to Cloudflare-compatible format:
# - Static HTML (from PHP)
# - Cloudflare Workers (JavaScript API proxy)
# - Ready for Cloudflare Pages deployment
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   JAEGER AI - Cloudflare Deployment Converter        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -d "web-interface" ]; then
    echo -e "${RED}❌ Error: web-interface directory not found!${NC}"
    echo -e "${YELLOW}   Please run this script from the jaeger-ai root directory${NC}"
    exit 1
fi

# Create cloudflare-build directory
echo -e "${CYAN}📁 Creating cloudflare-build directory...${NC}"
rm -rf cloudflare-build
mkdir -p cloudflare-build/assets/{css,js,images}
mkdir -p cloudflare-build/src

# Step 1: Convert index.php to index.html
echo -e "${CYAN}🔄 Converting index.php to static HTML...${NC}"

# Read index.php and remove PHP tags, keeping only HTML
cat web-interface/index.php | \
    sed '1,/^<\!DOCTYPE/d' | \
    sed 's/<?php.*?>//g' | \
    sed 's/<?= .*CSRF.*?>//g' \
    > cloudflare-build/index.html

# Add Cloudflare Browser Insights to head
sed -i 's|</head>|    <!-- Cloudflare Browser Insights (RUM) -->\n    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='"'"'{"token": "YOUR_TOKEN_HERE"}'"'"'></script>\n</head>|' cloudflare-build/index.html

echo -e "${GREEN}   ✅ index.html created${NC}"

# Step 2: Copy static assets
echo -e "${CYAN}📋 Copying static assets...${NC}"

cp -r web-interface/assets/css/* cloudflare-build/assets/css/ 2>/dev/null || echo "No CSS files"
cp -r web-interface/assets/js/* cloudflare-build/assets/js/ 2>/dev/null || echo "No JS files"
cp -r web-interface/assets/images/* cloudflare-build/assets/images/ 2>/dev/null || echo "No image files"

# Copy main JavaScript app
cp web-interface/assets/js/app.js cloudflare-build/assets/js/app.js

echo -e "${GREEN}   ✅ Assets copied${NC}"

# Step 3: Create Cloudflare Worker (_worker.js)
echo -e "${CYAN}🔧 Creating Cloudflare Worker...${NC}"

cat > cloudflare-build/_worker.js << 'EOF'
/**
 * JAEGER AI - Cloudflare Workers API Handler
 * Replaces PHP handler.php with JavaScript
 */

// Configuration - CHANGE THIS TO YOUR VPS IP/DOMAIN
const JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888';
const API_TIMEOUT = 180000; // 3 minutes

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders,
                status: 204
            });
        }

        // Only handle POST requests to /api/handler.php
        if (request.method !== 'POST' || !url.pathname.includes('/api/handler')) {
            return new Response('Not Found', { status: 404 });
        }

        try {
            // Parse request body
            const body = await request.json();
            const action = body.action;

            if (!action) {
                return jsonResponse({ success: false, error: 'Missing action parameter' }, 400);
            }

            // Route actions
            let result;
            switch (action) {
                case 'health':
                    result = await proxyToJaeger('/health', {}, 'GET');
                    break;

                case 'smart_scan':
                    const scanData = {
                        target: body.target,
                        objective: body.objective || 'quick',
                        max_tools: body.max_tools || 5,
                        context: body.context || {
                            request_timeout: 180,
                            retry_on_timeout: true
                        }
                    };

                    if (body.specific_tools && Array.isArray(body.specific_tools)) {
                        scanData.specific_tools = body.specific_tools;
                    }

                    result = await proxyToJaeger('/api/intelligence/smart-scan', scanData);
                    break;

                case 'analyze_target':
                    result = await proxyToJaeger('/api/intelligence/analyze-target', {
                        target: body.target,
                        analysis_type: body.analysis_type || 'quick'
                    });
                    break;

                case 'select_tools':
                    result = await proxyToJaeger('/api/intelligence/select-tools', {
                        target: body.target,
                        objective: body.objective || 'quick'
                    });
                    break;

                case 'recon_workflow':
                    result = await proxyToJaeger('/api/bugbounty/reconnaissance-workflow', {
                        domain: body.target,
                        depth: body.depth || 'standard'
                    });
                    break;

                case 'vuln_workflow':
                    result = await proxyToJaeger('/api/bugbounty/vulnerability-hunting-workflow', {
                        domain: body.target,
                        focus: body.focus || 'all'
                    });
                    break;

                case 'osint_workflow':
                    result = await proxyToJaeger('/api/bugbounty/osint-workflow', {
                        domain: body.target
                    });
                    break;

                case 'tech_detection':
                    result = await proxyToJaeger('/api/intelligence/technology-detection', {
                        target: body.target
                    });
                    break;

                default:
                    return jsonResponse({
                        success: false,
                        error: 'Invalid action',
                        available_actions: ['health', 'smart_scan', 'analyze_target', 'select_tools', 'recon_workflow', 'vuln_workflow', 'osint_workflow', 'tech_detection']
                    }, 400);
            }

            return jsonResponse(result);

        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({
                success: false,
                error: 'Internal server error',
                details: error.message
            }, 500);
        }
    }
};

/**
 * Proxy request to Jaeger MCP Server
 */
async function proxyToJaeger(endpoint, data = {}, method = 'POST') {
    const url = `${JAEGER_MCP_URL}${endpoint}`;

    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Jaeger-Cloudflare-Worker/1.0'
            },
            signal: AbortSignal.timeout(API_TIMEOUT)
        };

        if (method === 'POST') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}`,
                http_code: response.status
            };
        }

        return { success: true, data: result };

    } catch (error) {
        console.error(`Jaeger request failed: ${error.message}`);

        if (error.name === 'TimeoutError') {
            return {
                success: false,
                error: 'Request timeout - scan is taking too long',
                details: 'Consider using a shorter scan or check MCP server'
            };
        }

        return {
            success: false,
            error: 'Failed to connect to Jaeger server',
            details: error.message
        };
    }
}

/**
 * Create JSON response with CORS
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: corsHeaders
    });
}
EOF

echo -e "${GREEN}   ✅ Cloudflare Worker created${NC}"

# Step 4: Create wrangler.toml configuration
echo -e "${CYAN}⚙️  Creating wrangler.toml...${NC}"

cat > cloudflare-build/wrangler.toml << 'EOF'
#:schema node_modules/wrangler/config-schema.json
name = "jaeger-ai"
main = "_worker.js"
compatibility_date = "2025-10-14"

# Assets configuration for Cloudflare Pages
[site]
bucket = "."

# Production environment
[env.production]
name = "jaeger-ai-production"

# Environment variables (set via wrangler CLI or dashboard)
# wrangler secret put JAEGER_API_URL
# wrangler secret put API_TOKEN
EOF

echo -e "${GREEN}   ✅ wrangler.toml created${NC}"

# Step 5: Create _redirects file for routing
echo -e "${CYAN}🔀 Creating _redirects...${NC}"

cat > cloudflare-build/_redirects << 'EOF'
# API requests to Cloudflare Worker
/api/* /:splat 200

# SPA routing - all other requests to index.html
/* /index.html 200
EOF

echo -e "${GREEN}   ✅ _redirects created${NC}"

# Step 6: Create deployment guide
echo -e "${CYAN}📝 Creating deployment guide...${NC}"

cat > cloudflare-build/DEPLOY.md << 'EOF'
# JAEGER AI - Cloudflare Deployment Guide

## Prerequisites

1. Cloudflare account (free or paid)
2. Domain configured with Cloudflare DNS
3. Node.js and npm installed
4. VPS/Cloud server running Jaeger MCP Server (publicly accessible)

## Deployment Steps

### 1. Configure Your MCP Server URL

Edit `_worker.js` and change:
```javascript
const JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888';
```

**IMPORTANT**: Your MCP server must be publicly accessible!

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler login
```

### 4. Deploy to Cloudflare Pages

```bash
cd cloudflare-build
wrangler pages deploy . --project-name=jaeger-ai
```

### 5. Enable HTTP/3 (Optional but Recommended)

1. Go to Cloudflare Dashboard
2. Select your domain
3. Network → HTTP/3 (with QUIC) → Toggle ON

### 6. Enable Browser Insights (RUM)

1. Go to Speed → Browser Insights
2. Enable RUM
3. Copy the token
4. Update `index.html` with your token:
```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "YOUR_ACTUAL_TOKEN"}'></script>
```

### 7. Configure SSL/TLS

1. SSL/TLS → Overview
2. Set encryption mode to "Full (strict)"

## Testing

After deployment, test:

```bash
# Test HTTP/3
curl --http3 https://your-domain.com

# Test health endpoint
curl https://your-domain.com/api/handler.php -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

## Security Notes

### Protect Your MCP Server

If your MCP server is publicly accessible:

1. **Use API authentication** (add tokens to Worker)
2. **Whitelist Cloudflare IPs only** on your VPS firewall
3. **Enable rate limiting** on your MCP server
4. **Use HTTPS** for MCP server (recommended)

### Cloudflare Worker Security

Add IP whitelisting:
```javascript
const CLOUDFLARE_IPS = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    // ... add all Cloudflare IP ranges
];
```

## Cost Estimation

### Free Plan
- ✅ Unlimited bandwidth
- ✅ DDoS protection
- ✅ 100,000 Worker requests/day
- ✅ Global CDN

### Pro Plan ($20/month)
- ✅ Everything in Free
- ✅ Full Browser Insights
- ✅ 10M Worker requests/month
- ✅ Image optimization

## Troubleshooting

### API requests failing
Check CORS headers in Worker and verify MCP server is accessible:
```bash
curl -v http://your-vps-ip:8888/health
```

### Slow response times
- Check Workers analytics in Cloudflare dashboard
- Verify MCP server response time
- Enable caching in Worker

## Support

- 📚 Full documentation: CLOUDFLARE_DEPLOYMENT.md
- 🤖 JAEGER AI, Your Cyber Security Partner
EOF

echo -e "${GREEN}   ✅ Deployment guide created${NC}"

# Summary
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              CONVERSION COMPLETE ✅                    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📁 Output directory: ${CYAN}cloudflare-build/${NC}"
echo ""
echo -e "${YELLOW}📝 Files created:${NC}"
echo -e "   ${GREEN}✅${NC} index.html         - Static web interface"
echo -e "   ${GREEN}✅${NC} _worker.js         - Cloudflare Worker (API proxy)"
echo -e "   ${GREEN}✅${NC} wrangler.toml      - Cloudflare configuration"
echo -e "   ${GREEN}✅${NC} _redirects         - Routing rules"
echo -e "   ${GREEN}✅${NC} DEPLOY.md          - Deployment instructions"
echo -e "   ${GREEN}✅${NC} assets/            - Static assets (CSS, JS, images)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo -e "   ${CYAN}1.${NC} Edit ${CYAN}cloudflare-build/_worker.js${NC}"
echo -e "      Change: ${RED}JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888'${NC}"
echo -e "   ${CYAN}2.${NC} Make sure your MCP server is ${GREEN}publicly accessible${NC}"
echo -e "   ${CYAN}3.${NC} Install Wrangler: ${CYAN}npm install -g wrangler${NC}"
echo -e "   ${CYAN}4.${NC} Deploy: ${CYAN}cd cloudflare-build && wrangler pages deploy .${NC}"
echo ""
echo -e "${CYAN}📚 Read DEPLOY.md for detailed instructions${NC}"
echo ""
