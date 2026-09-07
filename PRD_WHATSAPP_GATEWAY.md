# Product Requirements Document (PRD)

## Judul Proyek
**WhatsApp Gateway & Order Recovery Service for Toko Kopi Sembilan**

---

## 1. Ringkasan Eksekutif
Microservice mandiri berbasis Node.js untuk menangani gateway WhatsApp toko online Toko Kopi Sembilan (`tokokopisembilan.com`). Layanan ini menghubungkan website Laravel ke nomor WhatsApp Bot (**6281952538106**) untuk mengirimkan pesan transaksional:
1. Notifikasi pesanan baru ke nomor WhatsApp Owner (**628132869806**).
2. Pengingat pembayaran Tahap 1 (sebelum countdown waktu pembayaran di website habis).
3. Pengingat pembayaran Tahap 2 / Penyelamatan Pesanan (setelah waktu website habis/kedaluwarsa, mengirim gambar QRIS langsung ke WhatsApp pembeli dan meminta bukti bayar).
4. Notifikasi pengiriman dan nomor resi kurir.

Layanan di-deploy pada platform **Railway** dengan persistent volume untuk menyimpan sesi WhatsApp secara permanen.

---

## 2. Identitas Nomor & Spesifikasi Sistem

### 2.1. Identitas Nomor Telepon
- **Nomor Bot Pengirim (Device WhatsApp Bot)**: `6281952538106` (nomor yang memindai QR Code di Railway).
- **Nomor Pribadi Owner (Penerima Notifikasi Pesanan Baru)**: `628132869806`.
- **Nomor Pelanggan**: Diambil dinamis dari form checkout website.

### 2.2. Tech Stack
- **Runtime**: Node.js (LTS v18 atau v20).
- **Engine WhatsApp**: `@whiskeysockets/baileys` (ringan, stabil, hemat RAM, tanpa Puppeteer).
- **HTTP Server**: Express.js.
- **Library Pendukung**: `qrcode` (render QR), `pino` (logger), `axios` (download media dari URL).
- **Hosting Target**: Railway (dengan Railway Persistent Volume).

---

## 3. Spesifikasi API Endpoints

### 3.1. `GET /` (Health Check)
Memeriksa status server dan koneksi WhatsApp.
- **Response**:
  ```json
  {
    "status": "online",
    "service": "Toko Kopi Sembilan WA Gateway",
    "bot_number": "6281952538106"
  }
  ```

### 3.2. `GET /qr` (Scan Login)
Menampilkan halaman HTML bersih yang memuat gambar QR Code pemindaian untuk nomor bot `6281952538106`.

### 3.3. `POST /send-message` (Kirim Pesan Teks)
- **Header**:
  - `Authorization`: `Bearer <SECRET_KEY>`
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "phone": "628123456789",
    "message": "Isi pesan teks..."
  }
  ```
- **Normalisasi Nomor Telepon**:
  - Menghapus karakter selain angka.
  - Mengubah awalan `08...` menjadi `628...`.
  - Format JID Baileys: `<nomor>@s.whatsapp.net`.

### 3.4. `POST /send-media` (Kirim Gambar QRIS / Dokumen)
- **Header**:
  - `Authorization`: `Bearer <SECRET_KEY>`
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "phone": "628123456789",
    "media_url": "https://tokokopisembilan.com/images/qris-pembayaran.jpg",
    "caption": "Silakan scan QRIS di atas sebesar Rp 150.000..."
  }
  ```

---

## 4. Logika & Template Pengingat Pembayaran (2 Tahap)

Batas waktu pembayaran di website: **1 Jam (60 Menit)**.

---

### Tahap 1: Sebelum Waktu Pembayaran di Website Habis (Menit ke-40 s/d ke-45)
- **Kondisi**: Pesanan berumur 40 menit sejak checkout, status masih *Awaiting Payment*. Sisa waktu pembayaran di website tersisa sekitar 15–20 menit.
- **Media**: Teks via `POST /send-message`.
- **Template Pesan**:
```text
Halo {{customer_name}},

Kami menginformasikan bahwa batas waktu pembayaran untuk pesanan Anda di Toko Kopi Sembilan tersisa sekitar 15 menit lagi.

No. Transaksi: #{{transaction_id}}
Total Pembayaran: Rp {{total_paid}}

Agar pesanan biji kopi Anda tidak otomatis dibatalkan oleh sistem, silakan selesaikan pembayaran sebelum waktu berakhir melalui tautan berikut:
{{payment_url}}

Jika Anda sudah melakukan pembayaran, silakan abaikan pesan ini. Terima kasih.
```

---

### Tahap 2: Setelah Waktu Pembayaran di Website Habis (Menit ke-60 / Kedaluwarsa)
- **Kondisi**: Waktu 1 jam di website telah habis dan pesanan berstatus kedaluwarsa di website. Halaman pembayaran website otomatis ditutup.
- **Tujuan**: Menyelamatkan transaksi agar pelanggan tetap bisa membayar secara manual langsung ke toko.
- **Media**: Kirim Gambar QRIS + Teks via `POST /send-media`.
- **Template Pesan (Caption Gambar QRIS)**:
```text
Halo {{customer_name}},

Waktu pembayaran pesanan Anda #{{transaction_id}} di website telah berakhir sehingga halaman pembayaran otomatis ditutup.

Namun jangan khawatir, jika Anda masih berminat dengan biji kopi pilihan Anda, Anda tetap dapat melakukan pembayaran langsung di sini:

Total Bayar: Rp {{total_paid}}

Cara Pembayaran:
1. Pindai (scan) kode QRIS pada gambar di atas menggunakan aplikasi m-Banking atau e-Wallet (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay, dll).
2. Masukkan nominal tepat: Rp {{total_paid}}
3. Setelah berhasil, silakan balas pesan ini dengan mengirimkan TANGKAPAN LAYAR (SCREENSHOT) BUKTI TRANSFER Anda.

Tim admin kami akan langsung memverifikasi dan memproses pengiriman kopi Anda. Terima kasih.
```

---

### 4.1. Notifikasi Pesanan Baru ke Owner (Tujuan: 628132869806)
- **Media**: `POST /send-message`
- **Template Pesan**:
```text
[PESANAN BARU MASUK - TOKO KOPI SEMBILAN]

No. Transaksi: #{{transaction_id}}
Nama Pembeli: {{customer_name}}
No. WA Pembeli: {{customer_phone}}
Total Bayar: Rp {{total_paid}}
Metode Bayar: {{payment_method}}
Kurir: {{courier_display}}

Daftar Produk:
{{items_list}}

Alamat Tujuan:
{{shipping_address}}

Detail Order Admin:
https://tokokopisembilan.com/admin/orders
```

---

## 5. Konfigurasi Deployment di Railway

1. **Persistent Volume (Wajib)**:
   - Volume terpasang pada path: `/app/session`.
   - Menjaga kredensial login nomor `6281952538106` tetap utuh saat redeploy atau restart.
2. **Environment Variables**:
   - `PORT`: `3000`
   - `SECRET_KEY`: String rahasia API (contoh: `kopi9_wa_secret_2026`).
   - `SESSION_DIR`: `/app/session`
   - `OWNER_PHONE`: `628132869806`
   - `BOT_PHONE`: `6281952538106`
3. **Public Networking**:
   - Settings > Networking > *Generate Domain*.

---

## 6. Kriteria Keberhasilan (Definition of Done)
1. Microservice berjalan stabil di Railway tanpa crash loop.
2. Endpoint `GET /qr` berhasil menampilkan QR Code.
3. Nomor bot **6281952538106** berhasil login via scan di `/qr` dan sesi tersimpan permanen di Railway Volume.
4. Endpoint `POST /send-message` berhasil mengirim pesan teks notifikasi ke nomor Owner (**628132869806**) dan pengingat Tahap 1 ke pelanggan.
5. Endpoint `POST /send-media` berhasil mengirim gambar QRIS langsung ke chat WhatsApp pelanggan untuk pengingat Tahap 2.
6. Permintaan tanpa Bearer Token yang valid ditolak dengan kode status `401 Unauthorized`.
