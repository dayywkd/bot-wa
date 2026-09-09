const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');
const config = require('../config');
const { toWhatsAppJid, cleanPhoneNumber } = require('../utils/phone');
const adminAssistant = require('./adminAssistant');


let sock = null;
let qrDataUrl = null;
let qrRaw = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'open'
let botNumber = config.botPhone;
let botJid = null;
let reconnectTimeout = null;

// Pastikan direktori sesi ada
if (!fs.existsSync(config.sessionDir)) {
  fs.mkdirSync(config.sessionDir, { recursive: true });
}

const logger = pino({ level: 'silent' });

/**
 * Inisialisasi koneksi socket Baileys WhatsApp
 */
async function initWhatsApp() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307],
      isLatest: true,
    }));

    sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: ['Toko Kopi Sembilan', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    // Listener pesan masuk (Asisten Admin Toko)
    sock.ev.on('messages.upsert', async ({ messages }) => {
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          await adminAssistant.handleIncomingMessage(sock, msg);
        }
      }
    });



    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrRaw = qr;
        connectionStatus = 'connecting';
        try {
          qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
          console.log('[WhatsApp] QR Code baru telah di-generate, siap di-scan di /qr');
        } catch (err) {
          console.error('[WhatsApp] Gagal mengonversi QR Code ke DataURL:', err.message);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'open';
        qrDataUrl = null;
        qrRaw = null;

        if (sock.user && sock.user.id) {
          botJid = sock.user.id;
          const extractedNumber = sock.user.id.split(':')[0].split('@')[0];
          botNumber = cleanPhoneNumber(extractedNumber) || config.botPhone;
        }

        console.log(`[WhatsApp] Terhubung secara sukses sebagai bot: ${botNumber}`);
      }

      if (connection === 'close') {
        connectionStatus = 'disconnected';
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[WhatsApp] Koneksi terputus. Status Code: ${statusCode}. Auto reconnect: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          console.log('[WhatsApp] Menghubungkan ulang dalam 3 detik...');
          reconnectTimeout = setTimeout(initWhatsApp, 3000);
        } else {
          console.log('[WhatsApp] Sesi telah dikeluarkan (logged out). Harap scan QR code baru.');
          qrDataUrl = null;
          qrRaw = null;
          // Coba hapus sesi lama dan buat sesi baru
          try {
            fs.rmSync(config.sessionDir, { recursive: true, force: true });
            fs.mkdirSync(config.sessionDir, { recursive: true });
          } catch (e) {
            console.error('[WhatsApp] Gagal membersihkan folder sesi:', e.message);
          }
          reconnectTimeout = setTimeout(initWhatsApp, 2000);
        }
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Error pada saat inisialisasi socket:', error);
    reconnectTimeout = setTimeout(initWhatsApp, 5000);
  }
}

/**
 * Mendapatkan status koneksi saat ini
 */
function getStatus() {
  return {
    status: connectionStatus === 'open' ? 'online' : connectionStatus,
    connected: connectionStatus === 'open',
    service: 'Toko Kopi Sembilan WA Gateway',
    bot_number: botNumber || config.botPhone,
  };
}

/**
 * Mendapatkan data QR Code terkini
 */
function getQrCode() {
  return {
    connected: connectionStatus === 'open',
    status: connectionStatus,
    qrDataUrl,
    qrRaw,
    bot_number: botNumber || config.botPhone,
  };
}

/**
 * Mengirim pesan teks
 */
async function sendTextMessage(phone, message) {
  if (connectionStatus !== 'open' || !sock) {
    throw new Error(
      'WhatsApp Bot belum terhubung. Silakan buka halaman /qr dan scan QR Code terlebih dahulu.'
    );
  }

  const jid = toWhatsAppJid(phone);
  const result = await sock.sendMessage(jid, { text: message });

  return {
    success: true,
    message_id: result?.key?.id || null,
    to: jid,
  };
}

/**
 * Mengirim pesan media (gambar QRIS / dokumen) dari URL
 */
async function sendMediaMessage(phone, mediaUrl, caption = '') {
  if (connectionStatus !== 'open' || !sock) {
    throw new Error(
      'WhatsApp Bot belum terhubung. Silakan buka halaman /qr dan scan QR Code terlebih dahulu.'
    );
  }

  const jid = toWhatsAppJid(phone);

  // Unduh media dari URL
  let response;
  try {
    response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: {
        'User-Agent': 'TokoKopiSembilan-WAGateway/1.0',
      },
    });
  } catch (downloadErr) {
    throw new Error(`Gagal mengunduh media dari URL: ${downloadErr.message}`);
  }

  const buffer = Buffer.from(response.data);
  const contentType = response.headers['content-type'] || 'image/jpeg';

  let messagePayload;
  if (contentType.startsWith('image/')) {
    messagePayload = {
      image: buffer,
      caption: caption || '',
      mimetype: contentType,
    };
  } else if (contentType.startsWith('application/pdf')) {
    messagePayload = {
      document: buffer,
      mimetype: contentType,
      fileName: 'document.pdf',
      caption: caption || '',
    };
  } else {
    // Default fallback sebagai gambar jika bukan PDF
    messagePayload = {
      image: buffer,
      caption: caption || '',
      mimetype: contentType,
    };
  }

  const result = await sock.sendMessage(jid, messagePayload);

  return {
    success: true,
    message_id: result?.key?.id || null,
    to: jid,
  };
}

/**
 * Reset sesi WhatsApp (Logout dan hapus folder session)
 * Memungkinkan pergantian nomor bot secara instan.
 */
async function resetSession() {
  console.log('[WhatsApp] Melakukan reset sesi WhatsApp...');
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  try {
    if (sock) {
      await sock.logout().catch(() => {});
    }
  } catch (err) {
    console.log('[WhatsApp] Catatan saat logout:', err.message);
  }

  connectionStatus = 'disconnected';
  qrDataUrl = null;
  qrRaw = null;
  botJid = null;

  try {
    if (fs.existsSync(config.sessionDir)) {
      fs.rmSync(config.sessionDir, { recursive: true, force: true });
    }
    fs.mkdirSync(config.sessionDir, { recursive: true });
  } catch (fsErr) {
    console.error('[WhatsApp] Gagal membersihkan folder sesi:', fsErr.message);
  }

  // Inisialisasi ulang untuk menghasilkan QR code baru
  setTimeout(initWhatsApp, 1500);

  return {
    success: true,
    message: 'Sesi WhatsApp berhasil di-reset. Silakan scan QR code baru di /qr.',
  };
}

module.exports = {
  initWhatsApp,
  getStatus,
  getQrCode,
  sendTextMessage,
  sendMediaMessage,
  resetSession,
};

