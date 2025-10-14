# JAEGER AI - Cloudflare Deployment Guide

## ⚠️ IMPORTANT: PHP Cannot Run Directly on Cloudflare

**Cloudflare does NOT support PHP!**
- ❌ Cloudflare Pages: Static files only (HTML, CSS, JS)
- ❌ Cloudflare Workers: JavaScript/TypeScript only
- ✅ Solution: Convert PHP backend to Cloudflare Workers (JavaScript)

## Overview
This guide explains how to convert and deploy JAEGER AI from PHP to Cloudflare infrastructure for:
- 🌐 Global CDN distribution
- 🚀 HTTP/3 automatic support
- 📊 Real User Monitoring (RUM)
- 🔒 Enterprise DDoS protection

## Current Architecture vs Cloudflare Architecture

### Current (Local):
```
┌─────────────────────────────────────┐
│  PHP 8.4.11 (localhost:8080)        │
│  - index.php                        │
│  - api/handler.php (PHP backend)    │
│  - JavaScript (app.js)              │
│  - CSS (style.css)                  │
└─────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Python MCP Server (port 8888)      │
│  - jaeger_server.py                 │
│  - 127 security tools               │
└─────────────────────────────────────┘
```

### Cloudflare (Production):
```
┌─────────────────────────────────────┐
│  Cloudflare Pages (Static)          │
│  - index.html (converted from PHP)  │
│  - app.js (pure JavaScript)         │
│  - style.css                        │
│  + HTTP/3, CDN, RUM                 │
└─────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Cloudflare Workers (JavaScript)    │
│  - API proxy (replaces handler.php) │
│  - Rate limiting                    │
│  - Caching                          │
└─────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Your VPS/Cloud (External)          │
│  - Python MCP Server (public IP)    │
│  - Telegram Bot                     │
│  - 127 security tools               │
└─────────────────────────────────────┘
```

## Migration Steps

### Step 1: Convert PHP to Static HTML

**File to Convert:** `/web-interface/index.php`

**PHP Code to Remove:**
```php
<?php
require_once __DIR__ . '/includes/config.php';
$csrf_token = generate_csrf_token();
?>
```

**Create:** `/cloudflare-build/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JAEGER AI - Intelligent Penetration Testing Platform</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="icon" type="image/png" href="assets/images/jaeger-logo.png">

    <!-- Cloudflare Browser Insights (RUM) -->
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
</head>
<body>
    <!-- Copy entire body from index.php, remove PHP tags -->
    <div class="app-container">
        <!-- ... same structure as index.php ... -->
    </div>

    <script src="assets/js/app.js"></script>
    <script>
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            checkStatus();
            autoCheckStatus();
        });
    </script>
</body>
</html>
```

**Create:** `/cloudflare-build/assets/` folder
```bash
# Copy static assets
cp -r web-interface/assets/css cloudflare-build/assets/
cp -r web-interface/assets/js cloudflare-build/assets/
cp -r web-interface/assets/images cloudflare-build/assets/
```

### Step 2: Convert PHP API Handler to Cloudflare Workers

**File to Convert:** `/web-interface/api/handler.php` → `_worker.js`

The PHP backend needs to be rewritten in JavaScript. Here's the complete conversion:

**Create:** `/cloudflare-build/_worker.js`
```javascript
/**
 * JAEGER AI - Cloudflare Workers API Handler
 * Replaces PHP handler.php with JavaScript
 */

// Configuration
const JAEGER_MCP_URL = 'https://your-vps-ip-or-domain.com:8888';
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

                    result = await proxyToJaeger('/api/orchestrator/smart-scan', scanData);
                    break;

                case 'analyze_target':
                    result = await proxyToJaeger('/api/analyzer/analyze-target', {
                        target: body.target,
                        analysis_type: body.analysis_type || 'quick'
                    });
                    break;

                case 'select_tools':
                    result = await proxyToJaeger('/api/selector/select-tools', {
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
                    result = await proxyToJaeger('/api/analyzer/tech-detection', {
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
```

**Key Differences from PHP:**
- ❌ No PHP sessions (use Cloudflare KV for state if needed)
- ❌ No file_get_contents() (use fetch() API)
- ✅ Native async/await support
- ✅ Better error handling with try/catch
- ✅ Built-in timeout with AbortSignal

### 3. Jaeger MCP Server (External VPS/Cloud)
The Python MCP server should remain on your VPS/cloud instance since it requires:
- Python 3.13 with 562 packages
- 127 security tools (nmap, nuclei, sqlmap, etc.)
- System-level tool access
- Heavy compute resources

## Cloudflare Features Integration

### 1. HTTP/3 Support
- **Status**: ✅ Automatic when deployed to Cloudflare
- **Configuration**: Enable in Cloudflare Dashboard → Network → HTTP/3
- No code changes required

### 2. Cloudflare CDN
- **Benefits**:
  - Global edge caching
  - 300+ data centers
  - DDoS protection
  - Auto SSL/TLS
- **Setup**: Automatic when using Cloudflare DNS + Pages

### 3. Browser Insights (RUM - Real User Monitoring)
Enable in Cloudflare Dashboard → Speed → Browser Insights

**Add to your HTML `<head>`:**
```html
<!-- Cloudflare Browser Insights -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
        data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
```

### 4. Emotion (CSS-in-JS Framework)
If you want to use Emotion for styling:

```bash
npm install @emotion/react @emotion/styled
```

**Update web interface:**
```jsx
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'

const style = css`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`
```

## Deployment Steps

### Step 1: Prepare Web Interface for Cloudflare Pages

1. **Convert PHP to Static HTML**
```bash
cd /home/terrestrial/Desktop/jaeger-ai/web-interface

# Create static version
mkdir cloudflare-build
cp -r assets cloudflare-build/
cp index.php cloudflare-build/index.html
# Remove PHP tags, convert to pure HTML/JS
```

2. **Create `_redirects` file** (for SPA routing)
```
/api/* https://your-mcp-server.com/api/:splat 200
/* /index.html 200
```

3. **Create `wrangler.toml`** (Cloudflare Workers configuration)
```toml
name = "jaeger-ai"
main = "src/worker.js"
compatibility_date = "2025-10-14"

[site]
bucket = "./cloudflare-build"

[env.production]
name = "jaeger-ai-production"
vars = { JAEGER_API_URL = "https://your-mcp-server.com" }
```

### Step 2: Create Cloudflare Worker for API Proxy

**File: `src/worker.js`**
```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Proxy API requests to your MCP server
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = `${env.JAEGER_API_URL}${url.pathname}`;

      const response = await fetch(apiUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');

      return newResponse;
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};
```

### Step 3: Deploy to Cloudflare

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler deploy
```

### Step 4: Configure Cloudflare Dashboard

1. **Enable HTTP/3**
   - Go to Network settings
   - Toggle HTTP/3 (with QUIC) to ON

2. **Enable Browser Insights**
   - Go to Speed → Browser Insights
   - Enable RUM
   - Add script to your HTML

3. **Configure Caching**
   - Page Rules → Create Page Rule
   - Pattern: `yourdomain.com/assets/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month

4. **Enable DDoS Protection**
   - Security → DDoS
   - Enable all protection layers

5. **Configure SSL/TLS**
   - SSL/TLS → Overview
   - Set to "Full (strict)" for production

## Performance Optimizations

### 1. Cloudflare Workers Caching
```javascript
// Add to worker.js
const cache = caches.default;
const cacheKey = new Request(url.toString(), request);
let response = await cache.match(cacheKey);

if (!response) {
  response = await fetch(apiUrl);
  // Cache for 5 minutes
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'max-age=300');
  response = new Response(response.body, { ...response, headers });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
}
```

### 2. Image Optimization
Use Cloudflare Images:
```html
<img src="/cdn-cgi/image/width=400,quality=85/assets/images/jaeger-logo.png">
```

### 3. Minification
Enable in Cloudflare Dashboard:
- Speed → Optimization
- Enable Auto Minify (HTML, CSS, JS)
- Enable Rocket Loader
- Enable Brotli compression

## Security Considerations

### 1. Protect Your MCP Server
- Use API tokens for authentication
- Whitelist Cloudflare IP ranges only
- Enable rate limiting on your VPS

### 2. Environment Variables
Never expose in frontend:
```javascript
// ❌ Wrong (exposed to client)
const API_KEY = 'your-secret-key';

// ✅ Correct (server-side only)
// Store in Cloudflare Workers environment variables
```

### 3. CSRF Protection
Implement in Workers:
```javascript
// Verify CSRF token
const csrfToken = request.headers.get('X-CSRF-Token');
if (!validateToken(csrfToken)) {
  return new Response('Invalid CSRF token', { status: 403 });
}
```

## Monitoring & Analytics

### 1. Cloudflare Analytics
- Dashboard → Analytics → Web Traffic
- View: Requests, Bandwidth, Threats blocked

### 2. Browser Insights (RUM)
- Dashboard → Speed → Browser Insights
- Metrics: Page load time, Core Web Vitals, Errors

### 3. Workers Analytics
- Dashboard → Workers → Your Worker → Metrics
- View: Invocations, Errors, Duration

## Cost Estimation

### Cloudflare Free Plan
- ✅ Unlimited bandwidth
- ✅ DDoS protection
- ✅ Free SSL certificates
- ✅ 100,000 Worker requests/day
- ✅ Global CDN
- ❌ Limited Browser Insights

### Cloudflare Pro Plan ($20/month)
- ✅ Everything in Free
- ✅ Full Browser Insights
- ✅ Advanced DDoS protection
- ✅ Image optimization
- ✅ 10M Worker requests/month

## Testing Checklist

After deployment:

- [ ] Test HTTP/3 connectivity: `curl --http3 https://your-domain.com`
- [ ] Verify CDN caching: Check `CF-Cache-Status` header
- [ ] Check Browser Insights: View RUM data in dashboard
- [ ] Test API proxy: Ensure MCP server communication works
- [ ] Verify SSL/TLS: Check certificate validity
- [ ] Test from multiple global locations
- [ ] Monitor error rates in Workers analytics

## Troubleshooting

### Issue: API requests failing
```javascript
// Check CORS headers in Worker
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
}
```

### Issue: Slow response times
- Check Workers execution time in analytics
- Verify MCP server is healthy: `curl http://your-server:8888/health`
- Check Cloudflare caching is enabled

### Issue: Browser Insights not showing data
- Verify script is loaded: Check browser DevTools → Network tab
- Token must be valid: Check Cloudflare dashboard
- Wait 5-10 minutes for data to appear

## Next Steps

1. **Migrate web interface** to static HTML + Cloudflare Workers
2. **Deploy to Cloudflare Pages** with custom domain
3. **Enable all performance features** (HTTP/3, caching, minification)
4. **Add Browser Insights** for RUM monitoring
5. **Configure security** (rate limiting, DDoS protection)
6. **Monitor performance** through Cloudflare Analytics

## Support

For issues or questions:
- 📧 Contact: Your support email
- 📚 Docs: https://developers.cloudflare.com
- 🤖 JAEGER AI, Your Cyber Security Partner

---

**Note**: The Python MCP server and Telegram bot should remain on your VPS/cloud instance. Only the web interface should be deployed to Cloudflare for CDN and HTTP/3 benefits.
