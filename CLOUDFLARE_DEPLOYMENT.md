# JAEGER AI - Cloudflare Deployment Guide

## Overview
This guide explains how to deploy JAEGER AI components to Cloudflare's infrastructure for global CDN distribution, HTTP/3 support, and enhanced performance monitoring.

## Architecture Components

### 1. Web Interface (Cloudflare Pages)
The PHP web interface can be adapted to run as a static site with Cloudflare Workers for API handling.

**Current Stack:**
- PHP 8.4.11 (needs conversion to static + Workers)
- JavaScript (app.js)
- CSS (style.css)

**Cloudflare Migration:**
```bash
# Convert to static HTML (remove PHP session handling)
# Move API calls to Cloudflare Workers
# Deploy to Cloudflare Pages
```

### 2. API Backend (Cloudflare Workers)
- **Purpose**: Handle API requests between frontend and Jaeger MCP server
- **Technology**: JavaScript/TypeScript Workers
- **Features**:
  - Rate limiting
  - Caching
  - Request routing
  - CORS handling

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
