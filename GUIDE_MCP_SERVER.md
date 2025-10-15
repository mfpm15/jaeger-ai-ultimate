# MCP Server Setup Guide

JAEGER AI dibagi menjadi dua komponen besar: **frontend** (Cloudflare Pages / Vercel / Web UI) dan **backend** yang menjalankan seluruh security tools. Backend inilah yang disebut *MCP Server*—sebuah kombinasi Python + Node.js yang harus Anda host di VPS sendiri.

---

## 1. Arsitektur Singkat

| Komponen | Lokasi | Fungsi |
| --- | --- | --- |
| Frontend (Cloudflare/Vercel/Web UI) | CDN atau VPS | Antarmuka pengguna, kirim perintah ke MCP |
| Cloudflare Worker / Vercel Serverless | CDN Edge | Proxy aman ke MCP + pemanggilan LLM OpenRouter |
| MCP Server (Python) | VPS publik | Endpoint REST `/api/*`, eksekusi 150+ tools, penyimpanan hasil |
| Jaeger Intelligence Bridge (Node.js) | VPS yang sama | Client helper untuk workflow & automasi (dipanggil bot/UI) |

Frontend **tidak** boleh mencoba menjalankan tool scanning; semua perintah diarahkan ke MCP Server di VPS Anda.

---

## 2. Prasyarat VPS

- Ubuntu 20.04/22.04 atau Debian 11/12 (64-bit)
- Minimal 2 CPU core & 4 GB RAM (2 GB cukup untuk testing ringan)
- Storage kosong ≥ 10 GB
- Akses root / sudo + IP publik
- Port 8888 terbuka (atau port lain yang Anda konfigurasi sendiri)

---

## 3. Persiapan Sistem

```bash
# Update OS
sudo apt update && sudo apt upgrade -y

# Paket dasar
sudo apt install -y git curl unzip build-essential python3 python3-pip python3-venv

# Node.js 20 (untuk bot & analyzer)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Opsional: pm2 untuk manajemen proses Node
sudo npm install -g pm2
```

---

## 4. Clone Repository & Instal Dependensi

```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/mfpm15/jaeger-ai-ultimate.git jaeger-ai
sudo chown -R $USER:$USER jaeger-ai
cd jaeger-ai

# Dependency Node (Telegram bot, LLM analyzer, scripts)
npm install
cp .env.example .env
```

Konfigurasi `.env` minimal:

```ini
PORT=8888                # Port MCP Server (harus sama dengan Python server)
NODE_ENV=production
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENROUTER_API_KEY_PRIMARY=sk-or-v1-xxx
OPENROUTER_API_KEY_SECONDARY=sk-or-v1-xxx  # opsional
TELEGRAM_BOT_TOKEN=xxxxx  # opsional jika pakai bot
LLM_VERBOSE=false         # set true hanya saat debugging verbose
LLM_PROVIDER_PRIORITY=openrouter,deepseek,chimera,zai
LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,tngtech/deepseek-r1t2-chimera:free,z-ai/glm-4.5-air:free
```

Sekarang buat virtualenv untuk komponen Python (`jaeger-ai-core`):

```bash
cd jaeger-ai-core
python3 -m venv jaeger-env
source jaeger-env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
_deactivate() { deactivate 2>/dev/null || true; }
_deactivate
cd ..
```

---

## 5. Instal Security Tools

```bash
chmod +x install_jaeger_tools.sh
./install_jaeger_tools.sh

# Verifikasi alat penting
which nmap subfinder httpx nuclei || echo "Beberapa tool belum ditemukan di PATH"
```

Tambahkan tool tambahan sesuai kebutuhan (masscan, ffuf, gobuster, sqlmap, dsb.).

---

## 6. Menjalankan MCP Server

### 6.1 Jalankan manual (debug/testing)

```bash
cd /opt/jaeger-ai/jaeger-ai-core
source jaeger-env/bin/activate
python jaeger_server.py
```

Server akan berjalan pada `http://0.0.0.0:8888` (sesuai `PORT`). Buka terminal lain dan cek:

```bash
curl http://localhost:8888/health
```

Contoh respon berhasil:

```json
{"status":"healthy","version":"5.0.0","total_tools_available":152}
```

Untuk keluar, tekan `Ctrl+C` dan `deactivate`.

### 6.2 Layanan Systemd (disarankan)

```bash
sudo tee /etc/systemd/system/jaeger-mcp.service > /dev/null <<'SERVICE'
[Unit]
Description=JAEGER AI MCP Server (Python)
After=network.target

[Service]
Type=simple
User=ubuntu        # ganti dengan user Anda
WorkingDirectory=/opt/jaeger-ai/jaeger-ai-core
Environment="PATH=/opt/jaeger-ai/jaeger-ai-core/jaeger-env/bin:/usr/bin"
Environment="PORT=8888"
ExecStart=/opt/jaeger-ai/jaeger-ai-core/jaeger-env/bin/python jaeger_server.py
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/jaeger-ai/jaeger-mcp.log
StandardError=append:/opt/jaeger-ai/jaeger-mcp.log

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable jaeger-mcp
sudo systemctl start jaeger-mcp
sudo systemctl status jaeger-mcp
```

Ganti `User=ubuntu` dengan user yang Anda gunakan sendiri (misal `User=jaeger`).

---

## 7. Menjalankan Komponen Node (opsional)

- **Telegram Bot**: `node jaeger-telegram-bot.js`
- **Web Interface lokal**:
  ```bash
  npm install --prefix web-next   # sekali saja
  npm run web:dev --prefix web-next
  ```
- **LLM Analyzer CLI**: `node llm-analyzer-cli.js --input sample.json`

Komponen Node menggunakan MCP server Python sebagai backend; pastikan server Python aktif terlebih dahulu.

---

## 8. Firewall & Keamanan

```bash
sudo ufw allow 8888/tcp     # Endpoint MCP
sudo ufw allow 3000/tcp     # Jika menjalankan web interface lokal (Next dev)
sudo ufw allow 22/tcp       # SSH (pastikan tidak tertutup)
sudo ufw enable             # Aktifkan jika belum aktif
```

Pertimbangkan membatasi port 8888 hanya untuk alamat IP tertentu atau menambahkan autentikasi token pada `jaeger_server.py` bila dibutuhkan.

---

## 9. Hubungkan Frontend

### Cloudflare Pages
Ikuti langkah pada `GUIDE_DEPLOY.md` (bagian Cloudflare Pages) untuk build dengan `next-on-pages`, deploy via `wrangler pages`, dan set secret `NEXT_PUBLIC_MCP_URL`.

### Vercel
Ikuti `GUIDE_DEPLOY.md` (bagian Vercel) untuk upload ZIP atau hubungkan repo serta mengatur environment variable.

### Mode All-in-One VPS
- Jalankan MCP server (Python).
- Jalankan web interface Next.js (`npm run web:dev --prefix web-next` untuk development atau `npm run web:start --prefix web-next` setelah build).
- Gunakan reverse proxy (Nginx/Caddy) untuk HTTPS dan routing `/api/*` → `:8888`.

---

## 10. Troubleshooting Cepat

| Masalah | Solusi |
| --- | --- |
| `/health` gagal | `sudo systemctl status jaeger-mcp`, cek `jaeger-mcp.log` |
| Cloudflare Worker timeout | Pastikan `JAEGER_MCP_URL` mengarah ke IP publik & firewall sudah membuka port |
| Tool "not found" | Jalankan ulang `install_jaeger_tools.sh` atau tambahkan PATH (`~/.local/bin`, `$HOME/go/bin`) |
| LLM error | Verifikasi `OPENROUTER_API_KEY` di `.env`/Cloudflare secret dan lihat `tail -f jaeger-mcp.log | grep LLM` |
| Konsumsi resource tinggi | Kurangi concurrency di `.env`, gunakan instance VPS lebih besar, atau jalankan workflow spesifik |

---

MCP Server Anda kini siap menerima request dari Cloudflare, Vercel, Web UI lokal, maupun bot Telegram. Selamat ber-operasi dengan JAEGER AI v5.0! 💪
