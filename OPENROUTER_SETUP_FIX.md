# OpenRouter Setup & Troubleshooting

## Problem: LLM Analysis Not Working

If you see errors like:
```
❌ LLM report generation failed
❌ ETELEGRAM: 400 Bad Request: message text is empty
```

This guide will help you fix it.

---

## Root Causes & Solutions

### Error 1: "No endpoints found matching your data policy"

**Full Error:**
```json
{
  "error": {
    "message": "No endpoints found matching your data policy (Free model publication)",
    "code": 404
  }
}
```

**Cause:** Privacy settings tidak mengizinkan free models

**Solution:**
1. Visit: https://openrouter.ai/settings/privacy
2. Login to your OpenRouter account
3. Find section: **"Free Model Access"**
4. Enable: ☑️ **"Allow data sharing for free models"**
5. Click **Save**

**Why?** Free models (`:free` suffix) require data sharing agreement dengan OpenRouter.

---

### Error 2: "Insufficient credits"

**Full Error:**
```json
{
  "error": {
    "message": "Insufficient credits. This account never purchased credits.",
    "code": 402
  }
}
```

**Cause:** Account tidak punya credits (untuk paid models)

**Solution A: Use Free Models**
1. Follow steps in Error 1 above (enable privacy setting)
2. Update `.env`:
   ```bash
   LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,tngtech/deepseek-r1t2-chimera:free
   ```
3. Restart: `./START_ALL.sh`

**Solution B: Purchase Credits**
1. Visit: https://openrouter.ai/settings/credits
2. Click **"Add Credits"**
3. Minimum: $5 (cukup untuk ribuan scans!)
4. Payment via credit card
5. Keep current `.env` (already configured for paid models)

---

### Error 3: "ECONNREFUSED" atau Connection Timeout

**Full Error:**
```
connect ECONNREFUSED 104.18.3.115:443
```

**Possible Causes:**
1. Network/firewall blocking OpenRouter
2. VPS behind restrictive firewall
3. DNS resolution issue

**Solutions:**

**Test Connection:**
```bash
curl -I https://openrouter.ai/api/v1/models
# Expected: HTTP/2 200
```

**If fails, try:**
```bash
# Test DNS
dig openrouter.ai

# Test with different DNS
echo "nameserver 8.8.8.8" > /etc/resolv.conf
curl -I https://openrouter.ai/api/v1/models

# Check firewall
sudo ufw status
sudo ufw allow out 443/tcp
```

---

## Recommended Setup

### For Maximum Reliability (Free + Paid Fallback)

**Update `.env`:**
```bash
# Multiple API keys for failover
OPENROUTER_API_KEY_PRIMARY=sk-or-v1-your-primary-key
OPENROUTER_API_KEY_SECONDARY=sk-or-v1-your-backup-key

# Model priority: free first, then paid fallback
LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,deepseek/deepseek-chat,google/gemini-flash-1.5

# Provider priority
LLM_PROVIDER_PRIORITY=openrouter,deepseek
```

**How it works:**
1. Try `deepseek-chat-v3.1:free` (free, requires privacy setting)
2. If fails, try `deepseek/deepseek-chat` (paid, $0.14/1M tokens)
3. If fails, try `gemini-flash-1.5` (paid, $0.075/1M tokens)

---

## Model Comparison

| Model | Type | Input Cost | Output Cost | Speed | Quality |
|-------|------|------------|-------------|-------|---------|
| `deepseek/deepseek-chat-v3.1:free` | Free | $0 | $0 | Fast | Good |
| `tngtech/deepseek-r1t2-chimera:free` | Free | $0 | $0 | Medium | Good |
| `z-ai/glm-4.5-air:free` | Free | $0 | $0 | Fast | OK |
| `deepseek/deepseek-chat` | Paid | $0.14/1M | $0.28/1M | Fast | Excellent |
| `google/gemini-flash-1.5` | Paid | $0.075/1M | $0.30/1M | Very Fast | Good |
| `anthropic/claude-3-haiku` | Paid | $0.25/1M | $1.25/1M | Fast | Excellent |

**Cost Example (Paid Models):**
- Average scan report: ~3000 tokens
- Cost per scan: ~$0.0005 (less than $0.001)
- $5 credits = ~10,000 scans!

---

## Step-by-Step: Enable Free Models

### 1. Get OpenRouter Account
```
Visit: https://openrouter.ai
Sign up (free)
Verify email
```

### 2. Get API Key
```
Go to: https://openrouter.ai/settings/keys
Click: "Create Key"
Copy: sk-or-v1-...
```

### 3. Configure Privacy (IMPORTANT!)
```
Go to: https://openrouter.ai/settings/privacy
Find: "Free Model Access" section
Enable: ☑️ "Allow data sharing for free models"
Click: Save Settings
```

**What this means:**
- Your prompts may be used to improve models
- Responses may be stored temporarily
- **Security note:** Don't send sensitive data when using free models

### 4. Update JAEGER AI `.env`
```bash
cd /opt/jaeger-ai
nano .env

# Add:
OPENROUTER_API_KEY=sk-or-v1-your-key-here
LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,tngtech/deepseek-r1t2-chimera:free
```

### 5. Test Configuration
```bash
# Test API key
node -e "
const fetch = require('node-fetch');
(async () => {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR-API-KEY-HERE'
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3.1:free',
      messages: [{role: 'user', content: 'test'}],
      max_tokens: 10
    })
  });
  const data = await res.json();
  console.log(res.ok ? '✅ SUCCESS' : '❌ ERROR:', data);
})();
"
```

Expected output:
```
✅ SUCCESS
```

### 6. Restart Services
```bash
./START_ALL.sh
# Or individually:
pkill -f jaeger-telegram-bot
pkill -f jaeger-intelligence
node jaeger-telegram-bot.js &
node jaeger-intelligence.js &
```

### 7. Test via Telegram
```
Send to bot:
nmap example.com

Expected:
- Scan results ✅
- LLM analysis report ✅ (Indonesian, dengan emoji)
```

---

## Troubleshooting Tests

### Test 1: API Connection
```bash
curl -I https://openrouter.ai/api/v1/models
# Expected: HTTP/2 200
```

### Test 2: API Key Validity
```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR-KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek/deepseek-chat-v3.1:free","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'

# Expected: {"id":"gen-...","choices":[...]}
# Error: {"error":{"code":404}} → Privacy not enabled
# Error: {"error":{"code":402}} → No credits (for paid models)
# Error: {"error":{"code":401}} → Invalid API key
```

### Test 3: LLM Analyzer Direct Test
```bash
cd /opt/jaeger-ai
node llm-analyzer.js

# Should output:
# ✅ LLM Analysis: {...}
# ✅ LLM Report generated
```

### Test 4: Telegram Bot Logs
```bash
tail -f telegram-bot.log

# Watch for:
# ✅ "LLM Report generated"
# ❌ "LLM report generation failed"
```

---

## Common Errors & Fixes

### "model not found"
**Cause:** Model name typo atau model removed

**Fix:**
```bash
# Check available free models:
curl https://openrouter.ai/api/v1/models | jq '.data[] | select(.pricing.prompt == "0")'

# Update .env with valid model name
```

### "Rate limit exceeded"
**Cause:** Too many requests

**Fix:**
```bash
# Free tier: 200 requests/day
# Solution: Wait 24 hours or upgrade to paid
```

### "Invalid authentication"
**Cause:** Wrong API key

**Fix:**
```bash
# Regenerate API key:
# https://openrouter.ai/settings/keys
# Delete old key
# Create new key
# Update .env
```

---

## Best Practices

### 1. Use Multiple API Keys
```bash
OPENROUTER_API_KEY_PRIMARY=sk-or-v1-key1
OPENROUTER_API_KEY_SECONDARY=sk-or-v1-key2
OPENROUTER_API_KEY_TERTIARY=sk-or-v1-key3
```

**Why?** Automatic failover jika satu key limit/error

### 2. Mix Free and Paid Models
```bash
LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,deepseek/deepseek-chat
```

**Why?** Free first for cost saving, paid sebagai backup

### 3. Monitor Usage
```bash
# Check logs for token usage
tail -f jaeger-mcp.log | grep "Tokens used"

# Check OpenRouter dashboard
# https://openrouter.ai/activity
```

### 4. Set Max Tokens
```bash
LLM_MAX_TOKENS=4000  # Reduce for cost saving
```

**Impact:** Shorter reports but cheaper

---

## Migration from Gemini

If you were using Gemini before:

**Old `.env`:**
```bash
GEMINI_API_KEY=AIza...
```

**New `.env`:**
```bash
# Disable Gemini
GEMINI_API_KEY=

# Enable OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...
LLM_PROVIDER_PRIORITY=openrouter,deepseek
LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free
```

**Restart services and test!**

---

## Support

### OpenRouter Issues
- Documentation: https://openrouter.ai/docs
- Discord: https://discord.gg/openrouter
- Email: support@openrouter.ai

### JAEGER AI Issues
- Check logs: `tail -f jaeger-mcp.log telegram-bot.log`
- Read guides: `README.md`, `RUN_GUIDE.md`
- GitHub Issues: https://github.com/mfpm15/jaeger-ai-ultimate/issues

---

**JAEGER AI - LLM Analysis Fixed!** ✅
