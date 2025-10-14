# 🚀 JAEGER AI - Panduan Deployment ke Vercel (LENGKAP)

## 📋 **Mengapa Vercel?**

Vercel adalah alternatif excellent untuk Cloudflare dengan keunggulan:
- ✅ **Super mudah deploy** (drag & drop)
- ✅ **Automatic HTTPS** dan custom domain
- ✅ **Global CDN** dengan edge functions
- ✅ **Zero config** deployment
- ✅ **Preview deployments** untuk setiap push
- ✅ **Free plan generous** (100 GB bandwidth)

---

## 🎯 **Persiapan**

### **✅ Checklist:**
```
[ ] Akun Vercel (gratis)
[ ] Jaeger MCP Server berjalan di VPS
[ ] VPS memiliki IP public atau domain
[ ] Port 8888 terbuka
```

---

## 🚀 **Method 1: Deploy via Vercel Dashboard (TERMUDAH)**

### **Step 1: Login ke Vercel**

1. Buka https://vercel.com
2. Klik "Sign Up" atau "Login"
3. Login dengan GitHub/GitLab/Email

### **Step 2: Buat Project Baru**

1. Klik tombol **"Add New..."** → **"Project"**
2. Atau buka: https://vercel.com/new

### **Step 3: Import Git Repository (Opsional)**

Jika code sudah di Git:
1. Select repository
2. Klik "Import"
3. Skip jika deploy manual

### **Step 4: Manual Upload**

Jika tidak pakai Git:

**A. Buat ZIP file:**
```bash
cd /home/terrestrial/Desktop/jaeger-ai
zip -r jaeger-web-vercel.zip cloudflare-build/
```

**B. Upload di Vercel Dashboard:**
1. Drag & drop `jaeger-web-vercel.zip`
2. Atau klik "Browse" dan pilih file

### **Step 5: Configure Project**

**Framework Preset:** Pilih **"Other"** atau **"Static Site"**

**Build Settings:**
- Build Command: (kosongkan)
- Output Directory: `.` (current directory)

**Environment Variables:**
```
JAEGER_MCP_URL = http://YOUR-VPS-IP:8888
```

Klik **"Add"** untuk setiap variable.

### **Step 6: Deploy**

1. Klik **"Deploy"**
2. Tunggu 30-60 detik
3. **✅ DONE!** Website live di: `https://your-project.vercel.app`

---

## 🚀 **Method 2: Deploy via Vercel CLI (ADVANCED)**

### **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

### **Step 2: Login**

```bash
vercel login
```

Akan terbuka browser untuk login.

### **Step 3: Deploy**

```bash
cd /home/terrestrial/Desktop/jaeger-ai/cloudflare-build

# First deployment (setup)
vercel

# Follow prompts:
# ? Set up and deploy? Y
# ? Which scope? (your account)
# ? Link to existing project? N
# ? What's your project's name? jaeger-ai
# ? In which directory is your code located? ./

# Production deployment
vercel --prod
```

**Output:**
```
✅ Deployed to production
🔗 https://jaeger-ai.vercel.app
```

---

## ⚙️ **Konfigurasi untuk Vercel**

### **Edit Worker untuk Vercel**

Vercel menggunakan **Edge Functions** bukan Workers. Kita perlu adjust:

**Buat file:** `cloudflare-build/api/health.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';

const JAEGER_MCP_URL = process.env.JAEGER_MCP_URL || 'http://127.0.0.1:8888';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(`${JAEGER_MCP_URL}/health`);
    const data = await response.json();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

**Buat file:** `cloudflare-build/api/scan.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';

const JAEGER_MCP_URL = process.env.JAEGER_MCP_URL || 'http://127.0.0.1:8888';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, target, objective, max_tools, specific_tools } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        error: 'Target is required',
      });
    }

    const requestBody = {
      target,
      objective: objective || 'quick',
      max_tools: max_tools || 5,
      context: {
        request_timeout: 180,
        retry_on_timeout: true,
      },
    };

    if (specific_tools && Array.isArray(specific_tools)) {
      requestBody.specific_tools = specific_tools;
    }

    const response = await fetch(`${JAEGER_MCP_URL}/api/intelligence/smart-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

**Struktur folder untuk Vercel:**
```
cloudflare-build/
├── api/
│   ├── health.ts
│   ├── scan.ts
│   └── analyze.ts
├── index.html
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── vercel.json
```

**Buat:** `cloudflare-build/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    },
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "JAEGER_MCP_URL": "http://YOUR-VPS-IP:8888"
  }
}
```

---

## 🔧 **Configure Environment Variables di Vercel**

### **Via Dashboard:**

1. Buka project di Vercel Dashboard
2. Settings → Environment Variables
3. Add variable:
   - **Name:** `JAEGER_MCP_URL`
   - **Value:** `http://YOUR-VPS-IP:8888`
   - **Environment:** Production, Preview, Development
4. Klik **"Save"**

### **Via CLI:**

```bash
# Add environment variable
vercel env add JAEGER_MCP_URL

# Enter value when prompted:
# > http://YOUR-VPS-IP:8888

# Select environments:
# [✓] Production
# [✓] Preview
# [✓] Development
```

---

## 🌐 **Custom Domain**

### **Add Custom Domain:**

1. **Via Dashboard:**
   - Settings → Domains
   - Add domain: `scan.yourdomain.com`
   - Klik "Add"

2. **Configure DNS** di registrar Anda:
   ```
   Type: CNAME
   Name: scan
   Value: cname.vercel-dns.com
   ```

3. **Wait for DNS propagation** (1-5 menit)

4. **SSL automatically configured** ✅

---

## 🧪 **Testing**

### **Test Health:**

```bash
curl https://your-project.vercel.app/api/health
```

### **Test Scan:**

```bash
curl https://your-project.vercel.app/api/scan \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "action": "smart_scan",
    "target": "example.com",
    "objective": "quick",
    "max_tools": 3
  }'
```

---

## 📊 **Vercel vs Cloudflare**

| Feature | Vercel | Cloudflare |
|---------|--------|------------|
| **Ease of Use** | ⭐⭐⭐⭐⭐ Drag & drop | ⭐⭐⭐⭐ CLI required |
| **Free Bandwidth** | 100 GB/month | Unlimited |
| **Edge Functions** | ✅ Vercel Functions | ✅ Workers |
| **Custom Domains** | ✅ Easy | ✅ Easy |
| **Analytics** | ✅ Built-in | ✅ Built-in |
| **DDoS Protection** | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| **Price (Hobby)** | Free | Free |
| **Price (Pro)** | $20/month | $20/month |
| **Best For** | Quick deploys | Heavy traffic |

### **Rekomendasi:**

- **Gunakan Vercel** jika:
  - Ingin deployment super cepat
  - Tidak perlu traffic unlimited
  - Suka Git-based workflow
  - Pemula dalam deployment

- **Gunakan Cloudflare** jika:
  - Butuh unlimited bandwidth
  - Traffic sangat tinggi
  - Perlu DDoS protection maksimal
  - Sudah familiar dengan Workers

**Keduanya BAGUS!** Pilih sesuai kebutuhan. 🎉

---

## ⚠️ **Troubleshooting**

### **Problem: "Function timeout"**

**Solusi:**

1. Tambahkan timeout config di `vercel.json`:
```json
{
  "functions": {
    "api/scan.ts": {
      "maxDuration": 60
    }
  }
}
```

2. Upgrade ke Pro plan (timeout sampai 300s)

### **Problem: "CORS error"**

**Solusi:**

Tambahkan CORS headers di API functions:

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

---

## 💰 **Pricing**

### **Vercel Hobby (FREE):**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Edge Functions (1M requests/month)
- ❌ Limited to 10 projects

### **Vercel Pro ($20/month):**
- ✅ 1 TB bandwidth/month
- ✅ 100M Edge Function requests/month
- ✅ Unlimited projects
- ✅ Advanced analytics
- ✅ Password protection

---

## 📚 **Resources**

- Vercel Docs: https://vercel.com/docs
- Vercel CLI: https://vercel.com/cli
- Edge Functions: https://vercel.com/docs/functions

---

## ✅ **Checklist**

```
[ ] Vercel account created
[ ] Project deployed
[ ] Environment variables configured
[ ] MCP Server accessible
[ ] Health check passed
[ ] Test scan successful
[ ] Custom domain configured (optional)
[ ] SSL certificate active
```

---

## 🎉 **Selesai!**

Website Anda **LIVE** di Vercel dengan:
- ✅ Global CDN
- ✅ Auto HTTPS
- ✅ Edge Functions
- ✅ Git integration
- ✅ Preview deployments

**URL:** `https://your-project.vercel.app`

Congratulations! 🚀

---

**🤖 JAEGER AI, Your Cyber Security Partner**
