# Local Setup & Testing Checklist (JAEGER AI v5.0)

Ikuti langkah berikut untuk menjalankan JAEGER AI sepenuhnya di mesin lokal sebelum membuat paket Cloudflare/Vercel.

---

## 1. Prasyarat Sistem
- Ubuntu/Debian/macOS dengan akses `sudo`
- Node.js ≥ 18 (`node -v`)
- npm ≥ 9 (`npm -v`)
- Python ≥ 3.9 (`python3 --version`)
- `python3-venv`, `pip`, dan git terpasang
- Koneksi internet (untuk instalasi tool & panggilan LLM)

> Galat umum: *ModuleNotFoundError* → belum membuat virtualenv.

---

## 2. Clone & Persiapan Diretori
```bash
cd /path/kerja
git clone https://github.com/mfpm15/jaeger-ai-ultimate.git jaeger-ai
cd jaeger-ai
npm install
```

---

## 3. Konfigurasi `.env`
```bash
cp .env.example .env
chmod 600 .env
nano .env
```
Isi:
- `OPENROUTER_API_KEY` + `OPENROUTER_API_KEY_PRIMARY/SECONDARY/TERTIARY` (isi dengan key baru).
- `TELEGRAM_BOT_TOKEN` (opsional jika menguji bot).
- `PORT=8888`
- `LLM_MAX_TOKENS=8000`
- `LLM_VERBOSE=false` (ganti `true` bila perlu debug log).
- `LLM_PROVIDER_PRIORITY=openrouter,deepseek,chimera,zai` (tanpa Gemini agar sesuai permintaan).
- `LLM_OPENROUTER_MODELS=deepseek/deepseek-chat-v3.1:free,tngtech/deepseek-r1t2-chimera:free,z-ai/glm-4.5-air:free`

Simpan, lalu pastikan variabel terset dengan `grep OPENROUTER .env` (hindari salah ketik).

---

## 4. Virtualenv Python (MCP Server)
```bash
cd jaeger-ai-core
python3 -m venv jaeger-env
source jaeger-env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> Jalankan `deactivate` jika sudah selesai.

---

## 5. Instal Security Tools
```bash
cd /path/ke/jaeger-ai
chmod +x install_jaeger_tools.sh
./install_jaeger_tools.sh
which nmap subfinder httpx nuclei || echo "Periksa kembali PATH tools"
```

---

## 6. Menjalankan Service Lokal
### Opsi A — Jalankan semua sekaligus
```bash
./START_ALL.sh
```
Script ini:
1. Mengaktifkan virtualenv & menjalankan `jaeger_server.py` (port 8888).
2. Menjalankan `jaeger-telegram-bot.js` jika `BOT_TOKEN` tersedia.
3. Menyalakan web interface Next.js di `http://localhost:3000`.

> Pastikan sudah menjalankan `npm install --prefix web-next` minimal satu kali sebelum memanggil skrip ini.

### Opsi B — Manual
Terminal 1:
```bash
cd jaeger-ai-core
source jaeger-env/bin/activate
python jaeger_server.py
```
Terminal 2:
```bash
cd /path/ke/jaeger-ai/web-next
npm install          # sekali saja untuk mengunduh dependency Next.js
npm run dev          # server dev, default port 3000
```
Terminal 3 (opsional Telegram Bot):
```bash
cd /path/ke/jaeger-ai
npm run bot
```

---

## 7. Health Check
Sebelum memakai UI, pastikan MCP server hidup:
```bash
curl http://127.0.0.1:8888/health
```
Harus menghasilkan JSON dengan `"status":"healthy"`.

Jika gagal → periksa log `jaeger-mcp.log` atau console tempat server berjalan.

---

## 8. Uji Smart Scan via API
```bash
curl -X POST http://127.0.0.1:8888/api/intelligence/smart-scan \
  -H 'Content-Type: application/json' \
  -d '{"target":"scanme.nmap.org","objective":"quick","max_tools":3}'
```

Perhatikan respons JSON: harus memuat daftar tool yang dijalankan.

---

## 9. Uji LLM Analyzer (CLI)
```bash
node llm-analyzer-cli.js analyze scanme.nmap.org '{"target":"scanme.nmap.org","total_vulnerabilities":0,"tools":[{"tool":"nmap","success":true,"highlights":"80/tcp open http"}]}'
```

Output:
- Tidak boleh menampilkan “Trying OpenRouter API key …” (karena logging off).
- Harus menghasilkan laporan panjang (target ~8k token).

Jika terjadi error LLM:
1. Pastikan koneksi internet.
2. Cek status OpenRouter key di https://openrouter.ai/keys.
3. Set `LLM_VERBOSE=true` sementara untuk melihat log internal.

---

## 10. Uji Web Interface
1. Buka `http://localhost:3000`.
2. Masukkan target (mis. `scanme.nmap.org`).
3. Pilih mode `Reconnaissance` → klik **Scan**.
4. Perhatikan status di sisi kanan; laporan LLM harus muncul tanpa spam log.

Jika muncul “Failed to connect to Jaeger server” → ulangi langkah 7.

---

## 11. Berhenti & Bersihkan
- Tekan `Ctrl+C` di tiap terminal.
- Jika memakai `START_ALL.sh`, cukup satu kali untuk memadamkan semua layanan.

---

## 12. Troubleshooting Ringkas
| Masalah | Pemeriksaan |
| --- | --- |
| `curl` /health gagal | Pastikan server Python berjalan & port 8888 tidak bentrok. |
| Tools “not found” | Jalankan `install_jaeger_tools.sh` ulang, cek PATH (`echo $PATH`). |
| LLM error 401 | Key salah → ubah di `.env`, restart `START_ALL.sh`. |
| LLM timeout | Jaringan lambat → coba ulang, kecilkan workload (`max_tools`). |
| Web UI blank | Pastikan server Next.js berjalan (`npm run dev --prefix web-next`) dan lihat `web-next.log`. |

---

## 13. Siap untuk Packaging Deployment
Setelah semua tes lokal lulus:
```bash
./PREPARE_DEPLOYMENT.sh
```
Script ini akan memverifikasi build Next.js (`web-next`) dan menghasilkan arsip terbaru untuk Cloudflare/Vercel.

---

Setiap kali melakukan perubahan kode, ulangi langkah 6–10 untuk memastikan integrasi tetap sehat sebelum membuat paket Cloudflare/Vercel.
