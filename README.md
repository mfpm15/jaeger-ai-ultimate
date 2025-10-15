# JAEGER AI v5.0 — Production Ready Intelligence Platform

**AI-assisted penetration testing dengan 150+ security tools, LLM reporting, dan opsi deployment fleksibel (Cloudflare, Vercel, atau all-in-one).**

---

## 🎯 Kenapa v5.0 Berbeda

- ✅ **LLM Analyzer terbaru** (DeepSeek/OpenRouter) dengan smart tool filtering dan format laporan profesional.
- ✅ **Frontend ringan** siap upload ke Cloudflare Pages & Vercel (ZIP disediakan).
- ✅ **Backend MCP server** mandiri yang menjalankan seluruh workflow keamanan.
- ✅ **Dokumentasi lengkap** untuk instalasi, deployment, dan operasi harian.
- ✅ **Repo bersih** (–435 MB) tanpa artifact lama; fokus pada runtime nyata.

---

## 🏗️ Arsitektur Tingkat Tinggi

```
┌────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                        │
│  • Web UI (Cloudflare Pages / Vercel)                      │
│  • Telegram Bot (jaeger-telegram-bot.js)                   │
└───────────────┬────────────────────────────────────────────┘
                │ HTTP/HTTPS
                ▼
┌────────────────────────────────────────────────────────────┐
│       API EDGE / PROXY (Cloudflare Worker / Vercel)        │
│  • endpoint /api/* → VPS                                   │
│  • endpoint /llm_analyze → OpenRouter                      │
└───────────────┬────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────┐
│                 MCP SERVER (VPS Anda)                      │
│  jaeger-intelligence.js                                   │
│  ├─ Orkestrasi workflow (Recon, Vulnhunt, OSINT, Smart Scan)│
│  ├─ Eksekusi 150+ tools (nmap, nuclei, httpx, dll)         │
│  └─ Endpoint REST: /api/intelligence/* & /health           │
└────────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────┐
│                   LLM ANALYZER (Node.js)                   │
│  llm-analyzer.js / llm-analyzer-cli.js                     │
│  • DeepSeek → Chimera → Z AI failover                      │
│  • Smart filtering tools yang benar-benar dijalankan       │
│  • Format laporan premium (emoji, tree layout, dsb.)       │
└────────────────────────────────────────────────────────────┘
```

Frontend hanya menangani UI + proxy. Semua aksi penetration testing terjadi di MCP server Anda sehingga tidak melanggar ToS penyedia hosting.

---

## 🚀 Quick Start

### Option A — Split Deployment (Direkomendasikan)
1. **Siapkan VPS** (Ubuntu/Debian) dan ikuti `GUIDE_MCP_SERVER.md`.
2. **Deploy Frontend** → ikuti `GUIDE_DEPLOY.md` (Cloudflare Pages & Vercel).
3. Set `NEXT_PUBLIC_MCP_URL` pada environment platform (arahkan ke `https://YOUR-VPS:8888` atau URL tunnel).
4. (Opsional) Set `OPENROUTER_API_KEY` sebagai secret jika ingin override di edge.
5. Jalankan health check: `curl http://YOUR-VPS-IP:8888/health` lalu lakukan Quick Scan via UI.

### Option B — All-in-One (Frontend + Backend di satu VPS)
1. Ikuti langkah 1–6 pada `GUIDE_MCP_SERVER.md`.
2. Jalankan web interface lokal: `npm run web:dev --prefix web-next` (port 3000).
3. Optional: pasang Nginx/Caddy untuk reverse proxy & HTTPS.

---

## 🔧 Komponen Inti

| Berkas | Fungsi |
| --- | --- |
| `jaeger-intelligence.js` | REST bridge ke MCP server Python, workflow automation, health endpoint |
| `llm-analyzer.js` | LLM formatter, smart filtering, prompt template v5.0 |
| `llm-analyzer-cli.js` | Wrapper CLI agar PHP / shell dapat memanggil analyzer |
| `web-next/` | Next.js web interface (Vercel & Cloudflare ready) |
| `jaeger-telegram-bot.js` | Bot Telegram dengan format laporan baru |
| `install_jaeger_tools.sh` | Skrip instalasi tool keamanan utama |
| `START_ALL.sh` | Menjalankan MCP, Telegram bot, dan Next.js web dev server |
| `GUIDE_LOCAL_SETUP.md` | Setup & pengujian lokal end-to-end |
| `GUIDE_MCP_SERVER.md` | Instalasi MCP server di VPS |
| `GUIDE_DEPLOY.md` | Cloudflare Pages & Vercel deployment |

`./PREPARE_DEPLOYMENT.sh` menghasilkan arsip berikut:

```
jaeger-next-vercel.zip      # Upload langsung ke Vercel atau gunakan via Git
jaeger-next-cloudflare.zip  # Sumber Next.js untuk build Pages (next-on-pages)
```

---

## 🧠 LLM Analyzer Highlights

- **Provider utama**: DeepSeek via OpenRouter dengan fallback otomatis.
- **Smart Tool Filtering**: laporan hanya memuat tool yang benar-benar dieksekusi.
- **Clean Output**: prefix "Berikut adalah..." otomatis dihapus.
- **Format Profesional**: border, emoji indikator risiko, tree layout, dan rekomendasi prioritas.
- **CLI Support**: dapat dipanggil dari PHP (`llm-analyzer-cli.js`) dan Worker.

---

## 📂 Struktur Direktori (ringkas)

```
.
├── data/                     # Database SQLite & cache
├── jaeger-ai-core/           # MCP server Python (150+ tools)
├── jaeger-intelligence.js    # Bridge Node.js → MCP
├── jaeger-telegram-bot.js    # Bot Telegram
├── llm-analyzer*.js          # LLM analyzer + CLI wrapper
├── web-next/                 # Next.js web interface project
├── *.md                      # Dokumentasi rilis & panduan
└── START_ALL.sh              # Skrip bantu menjalankan layanan
```

---

## 📚 Dokumentasi Pendukung

| Panduan | Deskripsi |
| --- | --- |
| `GUIDE_MCP_SERVER.md` | Setup backend (VPS) langkah demi langkah |
| `GUIDE_DEPLOY.md` | Panduan lengkap Cloudflare Pages & Vercel |
| `GUIDE_LOCAL_SETUP.md` | Checklist install & pengujian end-to-end |

---

## 🧪 Testing & Validasi

```bash
# Cek kesehatan MCP (di VPS)
curl http://127.0.0.1:8888/health

# Jalankan smart scan langsung ke MCP (contoh target)
curl -X POST http://127.0.0.1:8888/api/intelligence/smart-scan \
  -H 'Content-Type: application/json' \
  -d '{"target":"example.com","objective":"quick"}'

# Jalankan pengujian Node (opsional)
npm test
```

Pastikan hasil scan memicu laporan LLM dan hanya mencantumkan tools yang benar-benar dipakai.

---

## 🛠️ Operational Tips

- Gunakan `systemd` atau `pm2` untuk menjaga `jaeger-intelligence.js` tetap berjalan.
- Rotasi `OPENROUTER_API_KEY` secara berkala dan simpan di secret manager.
- Monitor log: `tail -f jaeger-mcp.log`, `tail -f telegram-bot.log`, `tail -f web-next.log`.
- Perbarui template nuclei & wordlists secara berkala (`nuclei -update-templates`).
- Aktifkan firewall dan batasi port 8888 hanya ke alamat tepercaya bila memungkinkan.
- Set `LLM_VERBOSE=true` hanya saat debugging; default `false` agar output ke user tetap bersih.
- Model prioritas OpenRouter dapat diatur via `.env` (`LLM_PROVIDER_PRIORITY=openrouter,deepseek,chimera,zai` dan `LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,tngtech/deepseek-r1t2-chimera:free,z-ai/glm-4.5-air:free`).
- Jika ingin analisis LLM lebih cepat, turunkan `LLM_MAX_TOKENS` (mis. 5000) atau batasi panjang input sebelum mengirim ke analyzer.

---

## 🤝 Kontribusi & Dukungan

- Temukan bug? Buka issue atau kirim PR dengan deskripsi jelas.
- Butuh bantuan cepat? Lihat bagian troubleshooting pada masing-masing panduan atau cek log layanan.
- Jaga kerahasiaan target saat berbagi log (redaksi data sensitif sebelum mengunggah).

Selamat menggunakan JAEGER AI v5.0! 🚀
