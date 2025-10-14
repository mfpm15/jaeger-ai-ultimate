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
