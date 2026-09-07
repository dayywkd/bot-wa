# WhatsApp Gateway & Order Recovery Service - Toko Kopi Sembilan

Microservice mandiri berbasis Node.js dan `@whiskeysockets/baileys` yang menghubungkan toko online Toko Kopi Sembilan (`tokokopisembilan.com`) ke WhatsApp Bot (**6281952538106**).

Layanan ini menangani pesan transaksional otomatis:
1. **Notifikasi Pesanan Baru** ke WhatsApp Owner (**628132869806**).
2. **Pengingat Pembayaran Tahap 1** (15-20 menit sebelum waktu checkout di website kedaluwarsa).
3. **Pengingat Pembayaran Tahap 2 / Order Recovery** (setelah countdown habis di website, langsung mengirim gambar QRIS dinamis dan meminta bukti transfer).
4. **Notifikasi Pengiriman & Resi Kurir**.

---

## 🚀 Fitur Utama

- **Hemat Memori & Ringan**: Menggunakan `@whiskeysockets/baileys` berbasis WebSocket resmi tanpa Chromium/Puppeteer.
- **Halaman QR Interaktif**: Endpoint `/qr` responsif dengan auto-refresh status saat berhasil di-scan.
- **Persistent Volume Ready**: Siap di-deploy di Railway dengan penyimpanan sesi permanen di `/app/session`.
- **Keamanan Terjamin**: Dilindungi otentikasi `Bearer <SECRET_KEY>`.
- **Normalisasi Nomor Otomatis**: Mendukung format `08...`, `+62...`, atau `62...`.

---

## 📁 Struktur Direktori

```text
├── src/
│   ├── config/
│   │   └── index.js          # Konfigurasi env (PORT, SECRET_KEY, dll.)
│   ├── middleware/
│   │   └── auth.js           # Validasi Bearer Token
│   ├── services/
│   │   └── whatsapp.js       # Engine Baileys WhatsApp (koneksi, QR, kirim teks & media)
│   ├── utils/
│   │   ├── phone.js          # Normalisasi nomor HP Indonesia
│   │   └── templates.js      # Template pesan siap pakai sesuai PRD
│   └── server.js             # Express REST API Server
├── test/
│   ├── test-sanity.js        # Unit test normalisasi, template, dan auth
│   └── test-server.js        # Integrasi test endpoint HTTP
├── Dockerfile                # Dockerfile untuk Railway
├── railway.json              # Konfigurasi deploy Railway
├── Procfile                  # Konfigurasi Procfile
├── .env.example              # Template variabel lingkungan
└── package.json              # Dependensi npm
```

---

## 🛠️ Instalasi & Menjalankan Lokal

### 1. Prasyarat
- Node.js LTS (v18, v20, atau v22+)
- npm

### 2. Setup
```bash
# Clone atau masuk ke direktori proyek
cd "c:\Users\ASUS\Bot Wa Toko"

# Salin konfigurasi environment
copy .env.example .env

# Install dependensi
npm install
```

### 3. Menjalankan Server
```bash
# Mode Produksi
npm start

# Mode Pengembangan (Auto-reload)
npm run dev
```

### 4. Scan WhatsApp Bot
1. Buka browser: `http://localhost:3000/qr`
2. Siapkan ponsel dengan nomor WhatsApp Bot **6281952538106**.
3. Buka **WhatsApp > Menu Titik Tiga / Pengaturan > Perangkat Tertaut > Tautkan Perangkat**.
4. Pindai QR Code di layar. Halaman akan otomatis berganti ke status **"WhatsApp Bot Terhubung"**.

---

## 📡 Dokumentasi API Endpoints

### 1. Health Check
- **Endpoint**: `GET /`
- **Response**:
```json
{
  "status": "online",
  "service": "Toko Kopi Sembilan WA Gateway",
  "bot_number": "6281952538106",
  "connected": true
}
```

---

### 2. Tampilan Scan QR Code
- **Endpoint**: `GET /qr`
- **Deskripsi**: Menampilkan halaman web bersih untuk scan QR code nomor bot.

---

### 3. Kirim Pesan Teks
- **Endpoint**: `POST /send-message`
- **Header**:
  - `Authorization: Bearer <SECRET_KEY>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "phone": "081234567890",
  "message": "Halo Budi, pesanan kopi Anda sedang diproses."
}
```
- **Response**:
```json
{
  "success": true,
  "message_id": "3EB0ABC123456789",
  "to": "6281234567890@s.whatsapp.net"
}
```

---

### 4. Kirim Gambar QRIS / Media (Order Recovery Tahap 2)
- **Endpoint**: `POST /send-media`
- **Header**:
  - `Authorization: Bearer <SECRET_KEY>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "phone": "081234567890",
  "media_url": "https://tokokopisembilan.com/images/qris-order-1001.jpg",
  "caption": "Halo Budi,\n\nWaktu pembayaran pesanan #TRX-1001 telah berakhir di website...\nSilakan scan QRIS di atas untuk menyelesaikan pesanan."
}
```
- **Response**:
```json
{
  "success": true,
  "message_id": "3EB0DEF987654321",
  "to": "6281234567890@s.whatsapp.net"
}
```

---

### 5. Kirim Template Cepat (Helper untuk Laravel)
- **Endpoint**: `POST /send-template`
- **Header**:
  - `Authorization: Bearer <SECRET_KEY>`
  - `Content-Type: application/json`

#### Contoh A: Notifikasi Pesanan Baru ke Owner
```json
{
  "type": "new_order_owner",
  "phone": "628132869806",
  "data": {
    "transaction_id": "TRX-1001",
    "customer_name": "Budi Santoso",
    "customer_phone": "081234567890",
    "total_paid": 150000,
    "payment_method": "QRIS",
    "courier_display": "JNE REG (1-2 hari)",
    "items_list": "- 2x Kopi Arabika Gayo 250g\n- 1x Kopi Robusta Temanggung 250g",
    "shipping_address": "Jl. Kopi No. 9, Jakarta Selatan"
  }
}
```

#### Contoh B: Pengingat Tahap 1 (15 Menit Sebelum Habis)
```json
{
  "type": "stage1_reminder",
  "phone": "081234567890",
  "data": {
    "customer_name": "Budi Santoso",
    "transaction_id": "TRX-1001",
    "total_paid": 150000,
    "payment_url": "https://tokokopisembilan.com/payment/TRX-1001"
  }
}
```

#### Contoh C: Penyelamatan Pesanan Tahap 2 (QRIS)
```json
{
  "type": "stage2_qris_recovery",
  "phone": "081234567890",
  "data": {
    "customer_name": "Budi Santoso",
    "transaction_id": "TRX-1001",
    "total_paid": 150000,
    "qris_url": "https://tokokopisembilan.com/images/qris-order-1001.jpg"
  }
}
```

---

## 🚂 Panduan Deployment ke Railway

1. **Push ke GitHub**:
   ```bash
   git add .
   git commit -m "feat: implementasi whatsapp gateway & order recovery toko kopi sembilan"
   git branch -M main
   git remote add origin <URL_REPOSITORY_GITHUB_ANDA>
   git push -u origin main
   ```
2. **Buat Project Baru di Railway**:
   - Buka dashboard [Railway.app](https://railway.app).
   - Klik **New Project** > **Deploy from GitHub repo** > Pilih repo Anda.
3. **Tambahkan Persistent Volume (Sangat Wajib)**:
   - Di kanvas service Railway Anda, klik menu service > tab **Volumes** > klik **Add Volume**.
   - Set Mount Path ke: `/app/session`.
   - *Catatan: Ini menjaga login WhatsApp nomor `6281952538106` tidak logout saat server restart.*
4. **Atur Environment Variables di Railway**:
   - Buka tab **Variables**, tambahkan:
     - `PORT`: `3000`
     - `SECRET_KEY`: `kopi9_wa_secret_2026` (atau sesuaikan rahasia Anda)
     - `SESSION_DIR`: `/app/session`
     - `BOT_PHONE`: `6281952538106`
     - `OWNER_PHONE`: `628132869806`
5. **Generate Domain Publik**:
   - Buka tab **Settings** > **Networking** > Klik **Generate Domain**.
   - Anda akan mendapatkan URL publik, contoh: `https://wa-bot-production.up.railway.app`.
6. **Scan Pertama Kali**:
   - Buka: `https://wa-bot-production.up.railway.app/qr`.
   - Scan QR Code dengan WhatsApp nomor `6281952538106`.
   - Status bot akan aktif secara permanen!
