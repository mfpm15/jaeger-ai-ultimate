# JAEGER AI – Deployment Guide (Cloudflare Pages & Vercel)

Gunakan panduan ini setelah MCP server Anda siap dan sudah lulus uji lokal.

---

## 1. Checklist Pra-Deploy
- ✅ VPS menjalankan MCP (`curl https://YOUR-VPS:8888/health` mengembalikan `healthy`)
- ✅ `.env` di VPS berisi key OpenRouter terbaru + `LLM_VERBOSE=false`
- ✅ `NEXT_PUBLIC_MCP_URL` siap diisi dengan URL publik/tunnel MCP Anda
- ✅ `npm install --prefix web-next` sudah dijalankan minimal sekali
- ✅ `./PREPARE_DEPLOYMENT.sh` menghasilkan `jaeger-next-vercel.zip` & `jaeger-next-cloudflare.zip`

> Jika memakai tunnel (Cloudflare Tunnel/Ngrok), pastikan URL tersebut meneruskan koneksi ke `127.0.0.1:8888` di VPS.

---

## 2. Deploy ke Cloudflare Pages

### 2.1 Siapkan Build
```bash
cd web-next
npx @cloudflare/next-on-pages build --output-dir ../.cf-pages
```

### 2.2 Deploy via Wrangler
```bash
cd ..
wrangler login                                 # sekali saja
wrangler pages deploy .cf-pages --project-name=<nama-proyek>
```

Jika proyek belum ada, Wrangler akan menawarkan untuk membuatnya.

### 2.3 Set Environment / Secret
```bash
wrangler pages secret put NEXT_PUBLIC_MCP_URL --project-name=<nama-proyek>
# Masukkan: https://YOUR-VPS-ATAU-TUNNEL:8888

wrangler pages secret put OPENROUTER_API_KEY --project-name=<nama-proyek>
# Opsional, hanya jika ingin override key di edge
```

Anda juga bisa mengatur melalui dashboard Pages → Settings → Environment Variables.

### 2.4 Tes Setelah Deploy
```bash
curl https://<pages-subdomain>/api/jaeger \
  -H 'Content-Type: application/json' \
  -d '{"action":"health"}'
```

Buka UI, jalankan Quick Scan, pastikan laporan LLM muncul tanpa error.

### 2.5 Update Berikutnya
```bash
npx @cloudflare/next-on-pages build --output-dir ../.cf-pages
wrangler pages deploy .cf-pages --project-name=<nama-proyek>
```

Log runtime: `wrangler pages deployment tail --project-name=<nama-proyek>`.

---

## 3. Deploy ke Vercel

### 3.1 Opsi Git (Direkomendasikan)
1. Push repo ke GitHub/GitLab/Bitbucket.
2. Vercel → New Project → pilih repo → gunakan pengaturan default (`next build`).
3. Tambahkan environment variable:
   - `NEXT_PUBLIC_MCP_URL = https://YOUR-VPS-ATAU-TUNNEL:8888`
   - `OPENROUTER_API_KEY`, `OPENROUTER_API_KEY_PRIMARY`, dst. (opsional)
4. Deploy → Vercel otomatis install & build.

### 3.2 Opsi Upload ZIP
1. Jalankan `./PREPARE_DEPLOYMENT.sh` (root repo).
2. Buka https://vercel.com/new, upload `jaeger-next-vercel.zip`.
3. Isi `NEXT_PUBLIC_MCP_URL` (dan key lain bila perlu).
4. Deploy.

### 3.3 Opsi CLI
```bash
npm install -g vercel
vercel login
vercel --cwd web-next --prod
```
Ikuti prompt untuk memasukkan env dan nama proyek.

### 3.4 Tes Setelah Deploy
```bash
curl https://<project>.vercel.app/api/jaeger \
  -H 'Content-Type: application/json' \
  -d '{"action":"health"}'
```
UI harus bisa menjalankan scan dengan sukses.

---

## 4. Troubleshooting
| Masalah | Solusi |
| --- | --- |
| `Failed to connect to Jaeger server` | Pastikan `NEXT_PUBLIC_MCP_URL` mengarah ke URL publik/tunnel yang valid dan port 8888 terbuka. |
| Build Cloudflare gagal | Jalankan `npm install --prefix web-next`, coba ulang `npx @cloudflare/next-on-pages build`. |
| Vercel 500 | Cek Logs Vercel; biasanya MCP tidak reachable atau env belum diset. |
| LLM error 401 | Key OpenRouter salah/expired → update `.env` di VPS dan/atau secret di platform. |

---

Selamat deploy! Gunakan guide ini bersama `GUIDE_MCP_SERVER.md` untuk menjaga backend tetap sehat.
