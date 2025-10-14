# 🚀 JAEGER AI - Panduan Deployment ke Cloudflare (LENGKAP)

## 📋 **Daftar Isi**
1. [Persiapan Sebelum Deploy](#persiapan)
2. [Langkah-Langkah Deployment](#deployment)
3. [Konfigurasi MCP Server](#mcp-server)
4. [Testing & Troubleshooting](#testing)
5. [Catatan Penting](#catatan)

---

## 🎯 **Persiapan Sebelum Deploy** {#persiapan}

### **✅ Checklist Persiapan:**

```
[ ] Akun Cloudflare (gratis/berbayar)
[ ] Domain sudah terdaftar di Cloudflare
[ ] Node.js & npm terinstal (cek: node --version)
[ ] Jaeger MCP Server berjalan di VPS/Cloud
[ ] VPS memiliki IP public atau domain
[ ] Port 8888 terbuka di firewall VPS
```

### **1. Setup Akun Cloudflare**

**Jika belum punya akun:**
1. Buka https://dash.cloudflare.com/sign-up
2. Daftar dengan email
3. Verifikasi email
4. Login ke dashboard

**Jika sudah punya akun:**
1. Login ke https://dash.cloudflare.com
2. Pastikan domain sudah ditambahkan
3. DNS sudah pointing ke Cloudflare nameservers

### **2. Install Wrangler CLI**

Wrangler adalah tool untuk deploy ke Cloudflare:

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version
```

**Output yang diharapkan:**
```
⛅️ wrangler 3.x.x
```

### **3. Login ke Cloudflare via Wrangler**

```bash
wrangler login
```

**Akan terbuka browser** untuk authorize:
1. Klik "Allow"
2. Kembali ke terminal
3. Seharusnya muncul "Successfully logged in"

---

## 🚀 **Langkah-Langkah Deployment** {#deployment}

### **Step 1: Siapkan VPS/Cloud Server**

**PENTING:** Jaeger MCP Server **HARUS** bisa diakses dari internet!

#### **Option A: Expose Port Langsung (Simple)**

```bash
# Di VPS, buka port 8888
sudo ufw allow 8888/tcp

# Check Jaeger server running
curl http://localhost:8888/health
```

#### **Option B: Gunakan Cloudflare Tunnel (Recommended)**

```bash
# Install cloudflared di VPS
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create jaeger-mcp

# Run tunnel
cloudflared tunnel run --url http://localhost:8888 jaeger-mcp
```

#### **Option C: Reverse Proxy dengan Nginx (Professional)**

```nginx
# /etc/nginx/sites-available/jaeger-mcp
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Pilih salah satu option di atas**, kemudian lanjut step berikutnya.

---

### **Step 2: Edit Konfigurasi Worker**

**Buka file:** `cloudflare-build/_worker.js`

```bash
cd /home/terrestrial/Desktop/jaeger-ai/cloudflare-build
nano _worker.js
```

**Edit baris 5**, ganti dengan URL VPS Anda:

```javascript
// SEBELUM (default):
const JAEGER_MCP_URL = 'http://YOUR-VPS-IP-OR-DOMAIN:8888';

// SESUDAH (contoh):
const JAEGER_MCP_URL = 'http://123.45.67.89:8888';  // Jika pakai IP public
// atau
const JAEGER_MCP_URL = 'https://api.yourdomain.com';  // Jika pakai domain
// atau
const JAEGER_MCP_URL = 'https://jaeger-mcp.yourdomain.com';  // Jika pakai Cloudflare Tunnel
```

**Save file:** `Ctrl+O` → Enter → `Ctrl+X`

---

### **Step 3: Deploy ke Cloudflare Pages**

```bash
# Pastikan di direktori cloudflare-build
cd /home/terrestrial/Desktop/jaeger-ai/cloudflare-build

# Deploy!
wrangler pages deploy . --project-name=jaeger-ai

# Atau dengan custom domain:
wrangler pages deploy . --project-name=jaeger-ai --branch=main
```

**Output yang akan muncul:**
```
✨ Compiled Worker successfully
✨ Uploading...
✨ Deployment complete!
✨ Deployed to: https://jaeger-ai.pages.dev
```

**✅ WEBSITE SUDAH LIVE!** 🎉

URL Anda: `https://jaeger-ai.pages.dev` (atau custom domain)

---

### **Step 4: Konfigurasi Custom Domain (Opsional)**

Jika ingin pakai domain sendiri (contoh: `scan.yourdomain.com`):

1. **Buka Cloudflare Dashboard**
   - Workers & Pages → jaeger-ai → Settings

2. **Custom Domains**
   - Add custom domain
   - Masukkan: `scan.yourdomain.com`
   - Klik "Activate domain"

3. **DNS akan otomatis dikonfigurasi**
   - Tunggu 1-5 menit
   - Access via: `https://scan.yourdomain.com`

---

## ⚙️ **Konfigurasi MCP Server** {#mcp-server}

### **Cara Jalankan MCP Server di VPS**

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Masuk ke direktori jaeger-ai
cd /path/to/jaeger-ai

# Jalankan server
./START_ALL.sh
```

**Server akan running di background:**
- MCP Server: `http://localhost:8888`
- Telegram Bot: Active
- Web Interface: `http://localhost:8080` (tidak perlu untuk Cloudflare)

### **Auto-Start on Boot (Systemd)**

Buat service agar MCP server otomatis start saat VPS reboot:

```bash
# Buat systemd service
sudo nano /etc/systemd/system/jaeger-mcp.service
```

**Isi file:**
```ini
[Unit]
Description=Jaeger AI MCP Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/jaeger-ai/jaeger-ai-core
ExecStart=/path/to/jaeger-ai/jaeger-ai-core/jaeger-env/bin/python3 jaeger_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable & start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable jaeger-mcp
sudo systemctl start jaeger-mcp
sudo systemctl status jaeger-mcp
```

---

## 🧪 **Testing & Troubleshooting** {#testing}

### **Test 1: Health Check**

```bash
# Test MCP server langsung
curl http://YOUR-VPS-IP:8888/health

# Test via Cloudflare
curl https://jaeger-ai.pages.dev/api/handler.php \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

**Expected output:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "tools_available": 61,
    "total_tools_count": 127
  }
}
```

### **Test 2: Quick Scan**

Buka browser, akses: `https://jaeger-ai.pages.dev`

1. Pilih scan mode: "Quick Scan"
2. Input target: `example.com`
3. Klik "Scan"
4. Tunggu hasil

**Jika berhasil:** Akan muncul hasil scan dengan emoji 🎉

### **Test 3: Telegram Bot**

```
Send ke Telegram bot:
/start
scan example.com
```

**Jika berhasil:** Bot akan reply dengan hasil scan

---

## ⚠️ **Troubleshooting**

### **Problem: "Failed to connect to Jaeger server"**

**Solusi:**
1. Check MCP server running:
   ```bash
   curl http://localhost:8888/health
   ```

2. Check firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 8888/tcp
   ```

3. Check Worker URL di `_worker.js`:
   - Pastikan IP/domain benar
   - Pastikan port 8888

4. Check dari luar VPS:
   ```bash
   curl http://YOUR-VPS-IP:8888/health
   ```

### **Problem: "Scan timeout"**

**Solusi:**
1. Pilih scan mode "Quick" (bukan Comprehensive)
2. Target yang lebih simple
3. Check MCP server logs:
   ```bash
   tail -f /path/to/jaeger-ai/jaeger-mcp.log
   ```

### **Problem: "Tools not found"**

**Solusi:**
1. Install tools:
   ```bash
   cd /path/to/jaeger-ai
   ./install_jaeger_tools.sh
   ```

2. Check tools available:
   ```bash
   curl http://localhost:8888/health | grep tools_available
   ```

---

## 📝 **Catatan Penting** {#catatan}

### **🔒 Keamanan**

1. **Jangan expose MCP server tanpa autentikasi** di production
2. **Gunakan HTTPS** untuk MCP server (via reverse proxy)
3. **Whitelist Cloudflare IPs** di firewall VPS:
   ```bash
   # Allow Cloudflare IPs only
   sudo ufw deny 8888/tcp
   sudo ufw allow from 173.245.48.0/20 to any port 8888
   sudo ufw allow from 103.21.244.0/22 to any port 8888
   # ... tambahkan semua Cloudflare IP ranges
   ```

4. **Add API token** di Worker untuk autentikasi

### **💰 Biaya**

**Cloudflare Free Plan:**
- ✅ Unlimited bandwidth
- ✅ DDoS protection
- ✅ 100,000 requests/day
- ✅ Free SSL
- ❌ Limited analytics

**Cloudflare Pro ($20/month):**
- ✅ Everything in Free
- ✅ Full analytics
- ✅ 10M requests/month
- ✅ Image optimization

**VPS Costs:**
- Minimal: $5-10/month (DigitalOcean, Vultr, Linode)
- Recommended: $10-20/month (better performance)

### **📊 Monitoring**

**Cloudflare Dashboard:**
- Analytics → Web Traffic
- Workers & Pages → Metrics
- Speed → Browser Insights (jika enable)

**VPS Monitoring:**
```bash
# Check MCP server status
systemctl status jaeger-mcp

# Check logs
tail -f /path/to/jaeger-ai/jaeger-mcp.log

# Check resource usage
htop
```

### **🔄 Update Deployment**

Jika ada perubahan code:

```bash
cd /path/to/jaeger-ai/cloudflare-build

# Re-deploy
wrangler pages deploy . --project-name=jaeger-ai
```

**Deploy akan update otomatis** dalam 1-2 menit.

---

## 📚 **Resources**

- Cloudflare Docs: https://developers.cloudflare.com
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler
- JAEGER AI Repo: (your repo link)

---

## ✅ **Checklist Final**

Pastikan semua sudah OK sebelum production:

```
[ ] MCP Server running di VPS
[ ] Port 8888 accessible dari internet
[ ] Worker deployed ke Cloudflare
[ ] Health check berhasil
[ ] Test scan berhasil
[ ] Telegram bot berjalan
[ ] Custom domain configured (opsional)
[ ] SSL/HTTPS enabled
[ ] Firewall configured
[ ] Monitoring setup
[ ] Backup configuration tersimpan
```

---

## 🎉 **Selesai!**

Website Anda sekarang **LIVE** di Cloudflare dengan:
- ✅ Global CDN
- ✅ DDoS protection
- ✅ Auto SSL
- ✅ HTTP/3 support
- ✅ 150+ security tools

**URL Anda:** `https://jaeger-ai.pages.dev`

Selamat! 🚀

---

**🤖 JAEGER AI, Your Cyber Security Partner**
*Powered by Advanced AI Security Intelligence*
