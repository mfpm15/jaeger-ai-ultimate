# 🚀 JAEGER AI - Quick Deployment Guide

## ✨ **READY TO DEPLOY!**

Semua file sudah **siap** untuk deployment ke **Cloudflare** atau **Vercel**!

---

## 📦 **File yang Tersedia**

```
✅ jaeger-cloudflare-deploy.zip (144K) - Ready untuk Cloudflare
✅ jaeger-vercel-deploy.zip (144K) - Ready untuk Vercel
✅ cloudflare-build/ - Source files
```

---

## 🎯 **Pilih Platform Deployment**

### **Option 1: Cloudflare Pages (Recommended)**

**Keunggulan:**
- ✅ Unlimited bandwidth
- ✅ DDoS protection terbaik
- ✅ HTTP/3 support
- ✅ Free SSL
- ✅ 100,000 requests/day (free)

**Cara Deploy:**

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login
wrangler login

# 3. Configure MCP URL (PENTING!)
nano cloudflare-build/_worker.js
# Ganti: JAEGER_MCP_URL = 'http://YOUR-VPS-IP:8888'

# 4. Deploy
cd cloudflare-build
wrangler pages deploy . --project-name=jaeger-ai
```

**📚 Detail Guide:** `CLOUDFLARE_DEPLOY_COMPLETE_GUIDE.md`

---

### **Option 2: Vercel (Easiest)**

**Keunggulan:**
- ✅ Super mudah (drag & drop)
- ✅ 100 GB bandwidth (free)
- ✅ Auto HTTPS
- ✅ Git integration
- ✅ Preview deployments

**Cara Deploy:**

```bash
# Option A: Via Dashboard (TERMUDAH)
1. Buka: https://vercel.com/new
2. Upload: jaeger-vercel-deploy.zip
3. Configure env: JAEGER_MCP_URL = http://YOUR-VPS-IP:8888
4. Deploy!

# Option B: Via CLI
npm install -g vercel
vercel login
cd cloudflare-build
vercel --prod
```

**📚 Detail Guide:** `VERCEL_DEPLOY_GUIDE.md`

---

## ⚠️ **PENTING: Konfigurasi MCP Server**

Sebelum deploy, **WAJIB** configure MCP Server URL!

### **Edit Worker Configuration:**

```bash
nano cloudflare-build/_worker.js
```

**Ganti baris 5:**
```javascript
// SEBELUM:
const JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888';

// SESUDAH (contoh):
const JAEGER_MCP_URL = 'http://123.45.67.89:8888';  // Ganti dengan IP VPS Anda
```

### **Pastikan MCP Server Running:**

```bash
# Test dari VPS
curl http://localhost:8888/health

# Test dari luar (public access)
curl http://YOUR-VPS-IP:8888/health
```

**Jika tidak bisa diakses dari luar:**
```bash
# Buka port di firewall
sudo ufw allow 8888/tcp

# Restart MCP server
./START_ALL.sh
```

---

## 🧪 **Testing Setelah Deploy**

### **Test Health:**
```bash
curl https://your-site.pages.dev/api/handler.php \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

### **Test Scan:**
```bash
curl https://your-site.pages.dev/api/handler.php \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"smart_scan","target":"example.com","objective":"quick","max_tools":3}'
```

### **Test di Browser:**
1. Buka: `https://your-site.pages.dev`
2. Input: `example.com`
3. Pilih mode: Quick Scan
4. Klik **Scan**
5. Tunggu hasil ✅

---

## 📚 **Dokumentasi Lengkap**

| File | Deskripsi |
|------|-----------|
| `CLOUDFLARE_DEPLOY_COMPLETE_GUIDE.md` | 📖 Panduan Cloudflare (detail) |
| `VERCEL_DEPLOY_GUIDE.md` | 📖 Panduan Vercel (detail) |
| `DEPLOYMENT_SUMMARY.md` | 📊 Summary semua yang sudah dibuat |
| `cloudflare-build/DEPLOY.md` | 📝 Quick reference |

---

## ⚡ **Quick Start (5 Menit)**

### **Cloudflare (Fastest):**
```bash
# 1. Install
npm install -g wrangler

# 2. Login
wrangler login

# 3. Edit config
nano cloudflare-build/_worker.js  # Ganti IP VPS

# 4. Deploy
cd cloudflare-build && wrangler pages deploy .
```

### **Vercel (Easiest):**
```bash
1. Go to: https://vercel.com/new
2. Drag & drop: jaeger-vercel-deploy.zip
3. Add env: JAEGER_MCP_URL = http://YOUR-IP:8888
4. Click Deploy
```

---

## 🎯 **Checklist Deployment**

```
[ ] MCP Server running di VPS
[ ] Port 8888 accessible dari internet
[ ] _worker.js sudah di-configure (IP VPS)
[ ] Wrangler/Vercel CLI terinstall
[ ] Login ke Cloudflare/Vercel
[ ] Deploy berhasil
[ ] Health check passed
[ ] Test scan berhasil
[ ] Custom domain configured (optional)
```

---

## 🆘 **Troubleshooting**

### **Problem: "Failed to connect to Jaeger server"**

**Solusi:**
1. Check MCP server: `curl http://localhost:8888/health`
2. Check firewall: `sudo ufw allow 8888/tcp`
3. Check Worker config: `nano cloudflare-build/_worker.js`
4. Test from outside: `curl http://YOUR-VPS-IP:8888/health`

### **Problem: "Worker not configured"**

**Solusi:**
```bash
nano cloudflare-build/_worker.js
# Ganti: JAEGER_MCP_URL = 'http://YOUR-VPS-IP:8888'
```

### **Problem: "Port 8888 not accessible"**

**Solusi:**
```bash
# Option 1: Open firewall
sudo ufw allow 8888/tcp

# Option 2: Use Cloudflare Tunnel (recommended)
# Follow: CLOUDFLARE_DEPLOY_COMPLETE_GUIDE.md

# Option 3: Use reverse proxy (nginx)
# Follow: CLOUDFLARE_DEPLOY_COMPLETE_GUIDE.md
```

---

## 🎉 **Setelah Deploy Berhasil**

Website Anda akan **LIVE** dengan features:
- ✅ Global CDN
- ✅ Auto HTTPS/SSL
- ✅ 150+ security tools
- ✅ AI-powered analysis
- ✅ Real-time scanning
- ✅ Beautiful UI dengan emoji

**URL Anda:**
- Cloudflare: `https://jaeger-ai.pages.dev`
- Vercel: `https://jaeger-ai.vercel.app`

---

## 📞 **Support**

**Jika ada masalah:**
1. Baca dokumentasi lengkap
2. Check logs: `tail -f jaeger-mcp.log`
3. Test MCP server: `curl http://localhost:8888/health`

**Services yang Running:**
```bash
# Check services
ps aux | grep jaeger

# Restart if needed
./START_ALL.sh
```

---

## ✨ **Summary**

✅ **Semua ready untuk deployment!**
- ZIP files: Created ✅
- Documentation: Complete ✅
- Scripts: Ready ✅
- MCP Server: Running ✅

**Tinggal:**
1. Configure MCP URL
2. Run deployment command
3. **DONE!** 🎉

---

**🤖 JAEGER AI, Your Cyber Security Partner**
*Ready to deploy to the cloud!*
