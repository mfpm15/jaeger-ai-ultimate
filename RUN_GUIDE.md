# Jaeger AI Local Run Guide

Gunakan panduan ini sebagai langkah langkah siap jalan. Semua perintah diasumsikan dijalankan dari direktori repo `jaeger-ai`.

## 1. Persiapan Lingkungan

### 1.1. Prasyarat Sistem
- **Node.js**: versi 18 atau lebih tinggi (`node -v`).
- **Python**: minimal 3.8 (`python3 --version`).
- **Tools keamanan**: instal utilitas yang sering dipakai HexStrike (`nmap`, `nuclei`, `subfinder`, `amass`, `ffuf`, `gobuster`, `sqlmap`, dsb.) sesuai kebutuhan.

### 1.2. Salin dan Isi Variabel Lingkungan
```bash
cp .env.example .env
chmod 600 .env
```
Edit `.env` dan pastikan:
- `BOT_TOKEN=` diisi token bot Telegram dari BotFather.
- Tiga kunci OpenRouter (`OPENROUTER_API_KEY_PRIMARY`, `SECONDARY`, `TERTIARY`) sudah terisi (pakai yang diberikan atau rotasi dengan key baru). Jangan commit file ini.
- `HEXSTRIKE_BASE_URL` tetap `http://127.0.0.1:8888` (default server lokal).
- Guardrail (`SAFE_MODE`, `ALLOWED_TARGETS`, `MAX_CONCURRENCY`, `DEFAULT_TIMEOUT_MIN`) disesuaikan kebutuhan.

## 2. Menjalankan HexStrike MCP
```bash
cd hexstrike-ai
python3 -m venv hexstrike-env
source hexstrike-env/bin/activate
pip install -r requirements.txt
python hexstrike_server.py --port 8888
```
Biarkan server berjalan di terminal ini. Uji kesehatan di terminal lain:
```bash
curl http://127.0.0.1:8888/health
```
Harus mengembalikan JSON status `ok`.

> 💡 **Persiapan tool HexStrike (sekali saja per host):** beberapa workflow membutuhkan aset tambahan.
> Jalankan perintah berikut di lingkungan server HexStrike agar `nuclei`, `httpx`, `ffuf`, dan kawan-kawan tidak gagal waktu eksekusi.

```bash
# Perbarui template nuclei dan siapkan direktori ignore default
nuclei -update-templates --update-directory ~/.local/nuclei-templates
mkdir -p ~/.config/nuclei && touch ~/.config/nuclei/.nuclei-ignore

# (Opsional) segarkan wordlist umum yang dipakai ffuf/gobuster
sudo apt install -y seclists || true
```

Jika `nikto` bermasalah di lingkungan Anda, biarkan saja—HexStrike otomatis mengandalkan kombinasi `httpx`, `nuclei`, dan `ffuf` untuk cakupan web.

## 3. Menjalankan Jaeger Bot
Kembali ke root repo lalu instal dependensi Node dan jalankan bot:
```bash
cd /home/terrestrial/Desktop/jaeger-ai
npm install
npm start
```
(`npm run dev` opsional untuk mode pengembangan dengan log tambahan). Saat start, log akan menampilkan status tiga key OpenRouter dan pipeline “DeepSeek/GLM analysis ready”.

## 4. Akses via Telegram
1. Buka Telegram, cari bot sesuai token yang digunakan.
2. Kirim `/status` untuk cek:
   - Provider AI: `OpenRouter (DeepSeek Chat → GLM 4.5 → DeepSeek Chimera)`.
   - HexStrike OK.
3. Contoh operasi:
   - `/recon example.com`
   - `/vulnhunt example.com`
   - `/osint example.com`
   - Natural language: `tolong recon cepat example.com`
   - `cancel` untuk menghentikan operasi berjalan.

Hasil lengkap HexStrike disimpan di `logs/hexstrike/` dengan nama file `hexstrike-<timestamp>.log`. Bot juga mengirim ringkasan tool dan potongan output secara bertahap untuk menghindari limit karakter Telegram.

## 5. Testing Otomatis
Untuk memastikan integrasi tetap sehat sebelum deploy atau commit:
```bash
npm test
```
Suite Jest mencakup pemeriksaan struktur, failover API, sanitasi input, dan jalur fallback HexStrike.

## 6. Catatan Operasional
- Jalankan HexStrike dan Jaeger di shell berbeda saat produksi/development.
- SAFE_MODE disarankan tetap `true`. Mengaktifkan tool agresif harus melalui alur persetujuan terpisah.
- Limitasi target: `ALLOWED_TARGETS` bisa diisi domain legal; jika bot menerima target di luar daftar, tambahkan konfirmasi manual sebelum mengeksekusi.
- Putar (rotasi) key OpenRouter secara berkala dan jangan menaruhnya di repo publik.
- Untuk mematikan layanan: hentikan Jaeger (`Ctrl+C` di terminal bot), lalu stop HexStrike (`Ctrl+C` di terminal server).

## 7. Ringkasan Perintah
```bash
# setup env
cp .env.example .env && chmod 600 .env

# jalankan hexstrike (terminal A)
cd hexstrike-ai
python3 -m venv hexstrike-env
source hexstrike-env/bin/activate
pip install -r requirements.txt
python hexstrike_server.py --port 8888

# jalankan jaeger (terminal B)
cd /home/terrestrial/Desktop/jaeger-ai
npm install
npm start

# test kesehatan hexstrike (opsional)
curl http://127.0.0.1:8888/health

# test otomatis
npm test
```

Ikuti urutan di atas setiap kali ingin menjalankan sistem secara lokal.
