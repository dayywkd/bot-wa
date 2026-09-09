const express = require('express');
const cors = require('cors');
const config = require('./config');
const authMiddleware = require('./middleware/auth');
const whatsapp = require('./services/whatsapp');
const templates = require('./utils/templates');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Endpoint 3.1: GET / (Health Check)
 */
app.get('/', (req, res) => {
  const status = whatsapp.getStatus();
  res.json({
    status: status.status,
    service: status.service,
    bot_number: status.bot_number,
    connected: status.connected,
  });
});

/**
 * Endpoint status QR JSON (digunakan untuk auto-refresh halaman /qr)
 */
app.get('/api/qr-status', (req, res) => {
  const qrData = whatsapp.getQrCode();
  res.json(qrData);
});

/**
 * Endpoint reset sesi (dipanggil via UI /qr)
 */
app.post('/api/reset-session', async (req, res) => {
  try {
    const result = await whatsapp.resetSession();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * Endpoint 3.2: GET /qr (Scan Login WhatsApp)
 */
app.get('/qr', (req, res) => {
  const qrData = whatsapp.getQrCode();

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan WhatsApp Bot - Toko Kopi Sembilan</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #f8f6f0;
      color: #2c2523;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(60, 40, 20, 0.08);
      max-width: 440px;
      width: 100%;
      padding: 32px 24px;
      text-align: center;
      border: 1px solid #eae2d6;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      color: #4a2e18;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-size: 13px;
      color: #7b6e65;
      margin-bottom: 24px;
    }
    .qr-wrapper {
      position: relative;
      margin: 0 auto 20px;
      width: 280px;
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #faf8f5;
      border-radius: 12px;
      border: 2px dashed #d8cbba;
      overflow: hidden;
    }
    .qr-image {
      width: 260px;
      height: 260px;
      object-fit: contain;
      border-radius: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .status-online {
      background: #e6f7ec;
      color: #0f8a3c;
      border: 1px solid #b8ebca;
    }
    .status-connecting {
      background: #fff8e6;
      color: #b7791f;
      border: 1px solid #fde68a;
    }
    .status-disconnected {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    .instructions {
      text-align: left;
      background: #fdfbf7;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 12px;
      color: #5d4a3b;
      line-height: 1.6;
      margin-top: 16px;
      border: 1px solid #ebdccb;
    }
    .instructions ol {
      margin-left: 18px;
    }
    .instructions li {
      margin-bottom: 4px;
    }
    .phone-tag {
      font-weight: 700;
      color: #4a2e18;
      background: #ede3d5;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #8b5a2b;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    .btn-reset {
      margin-top: 14px;
      padding: 8px 16px;
      background: #fdf2f2;
      color: #991b1b;
      border: 1px solid #f87171;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-reset:hover {
      background: #fee2e2;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="brand-title">☕ TOKO KOPI SEMBILAN</h1>
    <p class="subtitle">WhatsApp Gateway & Order Recovery Service</p>

    <div id="status-container">
      ${
        qrData.connected
          ? `<div class="status-badge status-online">● WhatsApp Bot Terhubung</div>`
          : `<div class="status-badge status-connecting">● Menunggu Scan WhatsApp</div>`
      }
    </div>

    <div class="qr-wrapper" id="qr-container">
      ${
        qrData.connected
          ? `<div style="padding: 20px; font-size: 14px; color: #0f8a3c;">
               <svg style="width:56px;height:56px;margin-bottom:10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
               </svg><br>
               <strong>Perangkat WhatsApp Aktif</strong><br>
               Nomor: <span class="phone-tag">${qrData.bot_number}</span>
             </div>`
          : qrData.qrDataUrl
          ? `<img src="${qrData.qrDataUrl}" alt="QR Code WhatsApp" class="qr-image" id="qr-img">`
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;color:#7b6e65;font-size:13px;">
               <div class="spinner"></div>
               <span>Memuat QR Code...</span>
             </div>`
      }
    </div>

    <div id="action-container" style="margin-bottom: 12px;">
      ${
        qrData.connected
          ? `<button class="btn-reset" onclick="resetBotSession()">🔄 Ganti Nomor / Scan Ulang</button>`
          : ''
      }
    </div>

    <div class="instructions">
      <strong style="display:block;margin-bottom:6px;">Instruksi Pemindaian:</strong>
      <ol>
        <li>Gunakan nomor WhatsApp Bot: <span class="phone-tag">${config.botPhone}</span></li>
        <li>Buka WhatsApp di ponsel &gt; Ketuk <strong>Perangkat Tertaut</strong> (Linked Devices).</li>
        <li>Pindai (scan) QR Code di atas.</li>
        <li>Halaman ini akan otomatis memperbarui status saat bot terhubung.</li>
      </ol>
    </div>
  </div>

  <script>
    let isConnected = ${qrData.connected ? 'true' : 'false'};

    async function resetBotSession() {
      if (!confirm('Apakah Anda yakin ingin memutuskan koneksi bot saat ini untuk scan ulang dengan nomor baru?')) {
        return;
      }
      try {
        const res = await fetch('/api/reset-session', { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Sesi di-reset. Menyiapkan QR Code baru...');
        location.reload();
      } catch (err) {
        alert('Gagal me-reset sesi: ' + err.message);
      }
    }

    async function checkStatus() {
      try {
        const res = await fetch('/api/qr-status');
        const data = await res.json();
        
        const statusContainer = document.getElementById('status-container');
        const qrContainer = document.getElementById('qr-container');
        const actionContainer = document.getElementById('action-container');

        if (data.connected) {
          if (!isConnected) {
            isConnected = true;
            statusContainer.innerHTML = '<div class="status-badge status-online">● WhatsApp Bot Terhubung</div>';
            qrContainer.innerHTML = \`
              <div style="padding: 20px; font-size: 14px; color: #0f8a3c;">
                <svg style="width:56px;height:56px;margin-bottom:10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg><br>
                <strong>Perangkat WhatsApp Aktif</strong><br>
                Nomor: <span class="phone-tag">\${data.bot_number}</span>
              </div>\`;
            actionContainer.innerHTML = '<button class="btn-reset" onclick="resetBotSession()">🔄 Ganti Nomor / Scan Ulang</button>';
          }
        } else {
          isConnected = false;
          statusContainer.innerHTML = '<div class="status-badge status-connecting">● Menunggu Scan WhatsApp</div>';
          actionContainer.innerHTML = '';
          if (data.qrDataUrl) {
            qrContainer.innerHTML = \`<img src="\${data.qrDataUrl}" alt="QR Code WhatsApp" class="qr-image">\`;
          } else {
            qrContainer.innerHTML = \`
              <div style="display:flex;flex-direction:column;align-items:center;gap:12px;color:#7b6e65;font-size:13px;">
                <div class="spinner"></div>
                <span>Menghubungkan ke WhatsApp server...</span>
              </div>\`;
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }

    // Polling setiap 3 detik

    setInterval(checkStatus, 3000);
  </script>
</body>
</html>`;

  res.send(html);
});

/**
 * Endpoint 3.3: POST /send-message (Kirim Pesan Teks)
 */
app.post('/send-message', authMiddleware, async (req, res) => {
  const { phone, message } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Nomor telepon tujuan (phone) wajib diisi',
    });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Isi pesan (message) wajib diisi',
    });
  }

  try {
    const result = await whatsapp.sendTextMessage(phone, message);
    return res.json(result);
  } catch (err) {
    console.error('[API] Gagal mengirim pesan teks:', err.message);
    const statusCode = err.message.includes('belum terhubung') ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Endpoint 3.4: POST /send-media (Kirim Media / QRIS dengan Caption)
 */
app.post('/send-media', authMiddleware, async (req, res) => {
  const { phone, media_url, caption } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Nomor telepon tujuan (phone) wajib diisi',
    });
  }

  if (!media_url) {
    return res.status(400).json({
      success: false,
      error: 'URL media (media_url) wajib diisi',
    });
  }

  try {
    const result = await whatsapp.sendMediaMessage(phone, media_url, caption || '');
    return res.json(result);
  } catch (err) {
    console.error('[API] Gagal mengirim media:', err.message);
    const statusCode = err.message.includes('belum terhubung') ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Endpoint Bantuan: POST /send-template
 * Memudahkan aplikasi Laravel mengirim template pesan langsung tanpa repot merangkai teks.
 */
app.post('/send-template', authMiddleware, async (req, res) => {
  const { type, phone, data } = req.body;

  if (!type || !phone || !data) {
    return res.status(400).json({
      success: false,
      error: 'Field type, phone, dan data wajib disertakan',
    });
  }

  try {
    let result;
    if (type === 'stage1_reminder') {
      const text = templates.reminderStage1(data);
      result = await whatsapp.sendTextMessage(phone, text);
    } else if (type === 'stage2_qris_recovery') {
      const caption = templates.reminderStage2Caption(data);
      if (!data.qris_url) {
        return res.status(400).json({
          success: false,
          error: 'Field data.qris_url diperlukan untuk stage2_qris_recovery',
        });
      }
      result = await whatsapp.sendMediaMessage(phone, data.qris_url, caption);
    } else if (type === 'new_order_owner') {
      const text = templates.newOrderToOwner(data);
      const targetOwner = phone || config.ownerPhone;
      result = await whatsapp.sendTextMessage(targetOwner, text);
    } else if (type === 'shipping') {
      const text = templates.shippingNotification(data);
      result = await whatsapp.sendTextMessage(phone, text);
    } else {
      return res.status(400).json({
        success: false,
        error: `Tipe template '${type}' tidak dikenali. Pilihan: stage1_reminder, stage2_qris_recovery, new_order_owner, shipping`,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[API] Gagal mengirim template:', err.message);
    const statusCode = err.message.includes('belum terhubung') ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
});

// Start Express Server & WhatsApp Engine jika dijalankan langsung
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Toko Kopi Sembilan WA Gateway berjalan di port ${config.port}`);
    console.log(`📱 Nomor Bot: ${config.botPhone}`);
    console.log(`👤 Nomor Owner: ${config.ownerPhone}`);
    console.log(`🔗 Scan QR: http://localhost:${config.port}/qr`);
    console.log(`====================================================`);
    
    // Inisialisasi socket WhatsApp Baileys
    whatsapp.initWhatsApp();
  });
}

module.exports = { app };

