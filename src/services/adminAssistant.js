const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const axios = require('axios');
const config = require('../config');
const { cleanPhoneNumber } = require('../utils/phone');

/**
 * Mem-parse teks caption atau chat untuk /tambah-produk
 */
function parseProductText(text) {
  const result = {
    name: '',
    price: 0,
    stock: 15,
    category: 'Biji Kopi',
    description: '',
    roast: 'Medium',
    bean: 'Arabika',
  };

  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('/tambah')) continue;

    const lower = line.toLowerCase();
    if (lower.startsWith('nama:') || lower.startsWith('nama produk:')) {
      result.name = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('harga:')) {
      const priceStr = line.split(':')[1]?.replace(/\D/g, '') || '0';
      result.price = parseFloat(priceStr) || 0;
    } else if (lower.startsWith('stok:')) {
      const stockStr = line.split(':')[1]?.replace(/\D/g, '') || '10';
      result.stock = parseInt(stockStr, 10) || 10;
    } else if (lower.startsWith('kategori:')) {
      result.category = line.split(':')[1]?.trim() || 'Biji Kopi';
    } else if (lower.startsWith('deskripsi:') || lower.startsWith('keterangan:')) {
      result.description = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('roast:') || lower.startsWith('roasting:')) {
      result.roast = line.split(':')[1]?.trim() || 'Medium';
    } else if (lower.startsWith('bean:') || lower.startsWith('jenis:')) {
      result.bean = line.split(':')[1]?.trim() || 'Arabika';
    }
  }

  return result;
}

/**
 * Handler utama untuk memproses pesan masuk dari Owner
 */
async function handleIncomingMessage(sock, msg) {
  try {
    if (!msg || !msg.message) return;

    // Jangan proses pesan yang dikirim oleh bot itu sendiri ke nomor lain
    if (msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.includes('@broadcast') || remoteJid.includes('@g.us')) {
      return; // Abaikan pesan grup atau status/story
    }

    const senderPhone = cleanPhoneNumber(remoteJid);

    // Buka wrapper pesan jika menggunakan fitur pesan sementara (ephemeral) atau viewOnce
    let rawMsg = msg.message;
    if (rawMsg?.ephemeralMessage) rawMsg = rawMsg.ephemeralMessage.message;
    if (rawMsg?.viewOnceMessage) rawMsg = rawMsg.viewOnceMessage.message;
    if (rawMsg?.viewOnceMessageV2) rawMsg = rawMsg.viewOnceMessageV2.message;
    if (rawMsg?.documentWithCaptionMessage) rawMsg = rawMsg.documentWithCaptionMessage.message;

    // Ambil isi teks pesan (dari teks biasa, caption gambar/dokumen)
    let bodyText =
      rawMsg?.conversation ||
      rawMsg?.extendedTextMessage?.text ||
      rawMsg?.imageMessage?.caption ||
      rawMsg?.documentMessage?.caption ||
      rawMsg?.videoMessage?.caption ||
      '';
    bodyText = bodyText.trim();

    if (!bodyText) return;

    // Daftar nomor dan WhatsApp LID yang berhak sebagai Admin/Owner
    const allowedOwners = [
      cleanPhoneNumber(config.ownerPhone),
      '6285855180131',
      '085855180131',
      '628132869806',
      '137683867316472', // WhatsApp LID untuk nomor Owner (085855180131)
    ];
    const isOwner = allowedOwners.includes(senderPhone);


    console.log(`[WhatsApp] Pesan masuk dari: ${senderPhone} (isOwner: ${isOwner}) | Teks: "${bodyText}"`);

    const lowerText = bodyText.toLowerCase();
    const cleanCmd = lowerText.replace(/^\//, ''); // Bisa pakai slash '/' ataupun tidak

    // 1. Perintah: /bantuan, /help, /menu, bantuan, menu
    if (cleanCmd === 'bantuan' || cleanCmd === 'help' || cleanCmd === 'menu') {
      const helpText = `☕ *ASISTEN ADMIN TOKO KOPI SEMBILAN* ☕
Halo Boss! Bot siap membantu mengelola website langsung dari chat:

📦 *1. TAMBAH PRODUK BARU*
Kirim *Foto Produk* dengan caption:
/tambah-produk
Nama: Arabika Kerinci 250g
Harga: 85000
Stok: 20
Kategori: Biji Kopi
Deskripsi: Single origin aroma floral dan citrus.

📊 *2. CEK PESANAN TERBARU*
Ketik: */pesanan* atau */order*

📋 *3. CEK STOK PRODUK*
Ketik: */stok*

✏️ *4. UBAH STOK PRODUK*
Ketik: */ubah-stok [Nama Produk] [JumlahBaru]*
Contoh: \`/ubah-stok Gayo 35\`

💰 *5. UBAH HARGA PRODUK*
Ketik: */ubah-harga [Nama Produk] [HargaBaru]*
Contoh: \`/ubah-harga Gayo 90000\`

_Nomor Anda terdeteksi sebagai:_ *${senderPhone}*`;

      await sock.sendMessage(remoteJid, { text: helpText });
      return;
    }

    // Jika BUKAN nomor Owner, tolak perintah khusus admin secara sopan
    if (!isOwner) {
      if (lowerText.startsWith('/tambah') || lowerText.startsWith('/ubah') || lowerText.startsWith('/pesanan')) {
        await sock.sendMessage(remoteJid, {
          text: `⚠️ *Akses Ditolak*\nPerintah ini khusus untuk nomor Owner Toko Kopi Sembilan.\nNomor Anda terdeteksi: *${senderPhone}*`,
        });
        return;
      }

      // Balas pesan umum untuk pelanggan
      if (lowerText.match(/^(halo|hai|p|assalamualaikum|info|order|kopi)/)) {
        await sock.sendMessage(remoteJid, {
          text: `Halo! Terima kasih telah menghubungi *Toko Kopi Sembilan* ☕\n\nUntuk melihat katalog dan melakukan pemesanan online, silakan kunjungi website resmi kami:\n👉 https://tokokopisembilan.com\n\nUntuk berbicara langsung dengan admin toko kami, silakan hubungi: wa.me/${config.ownerPhone}`,
        });
      }
      return;
    }

    console.log(`[Admin Assistant] Mengeksekusi perintah Owner (${senderPhone}): ${bodyText.slice(0, 50)}...`);


    // 2. Perintah: /tambah-produk atau /tambah
    if (lowerCmd.startsWith('/tambah-produk') || lowerCmd.startsWith('/tambah')) {
      const parsed = parseProductText(bodyText);

      if (!parsed.name || parsed.price <= 0) {
        await sock.sendMessage(remoteJid, {
          text: `⚠️ *Format Belum Lengkap!*\n\nMinimal sertakan Nama dan Harga.\nContoh:\n\`/tambah-produk\nNama: Robusta Temanggung\nHarga: 65000\nStok: 25\nKategori: Biji Kopi\``,
        });
        return;
      }

      await sock.sendMessage(remoteJid, {
        text: `⏳ Sedang mengunggah dan mendaftarkan produk *${parsed.name}* ke website...`,
      });

      const form = new FormData();
      form.append('name', parsed.name);
      form.append('price', parsed.price);
      form.append('stock', parsed.stock);
      form.append('category', parsed.category);
      form.append('description', parsed.description);
      form.append('roast_level', parsed.roast);
      form.append('bean_type', parsed.bean);

      // Jika ada gambar terlampir, unduh dan masukkan ke form-data
      if (msg.message.imageMessage) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          form.append('image', buffer, {
            filename: `${parsed.name.replace(/\s+/g, '_').toLowerCase()}.jpg`,
            contentType: 'image/jpeg',
          });
        } catch (imgErr) {
          console.error('[Admin Assistant] Gagal download media gambar:', imgErr.message);
        }
      }

      try {
        const response = await axios.post(`${config.storeApiUrl}/api/bot/products`, form, {
          headers: {
            ...form.getHeaders(),
            'X-BOT-SECRET': config.storeApiKey,
          },
          timeout: 25000,
        });

        const p = response.data.product;
        const successMsg = `✅ *PRODUK BERHASIL DITAMBAHKAN KE WEBSITE!* 🎉

📦 *Nama*: ${p.name}
💰 *Harga*: Rp ${Number(p.price).toLocaleString('id-ID')}
📊 *Stok*: ${p.stock}
🏷️ *Kategori*: ${p.category}
🔗 *Link Web*: ${p.url}

Produk sudah langsung aktif dan dapat dibeli oleh pelanggan di website!`;

        await sock.sendMessage(remoteJid, { text: successMsg });
      } catch (apiErr) {
        console.error('[Admin Assistant] Error API Laravel:', apiErr.response?.data || apiErr.message);
        const errMsg = apiErr.response?.data?.message || apiErr.message;
        await sock.sendMessage(remoteJid, {
          text: `❌ *Gagal menambahkan produk ke website.*\nError: ${errMsg}\n\nPastikan server website toko sedang berjalan di ${config.storeApiUrl}.`,
        });
      }
      return;
    }

    // 3. Perintah: /pesanan atau /order
    if (lowerCmd === '/pesanan' || lowerCmd === '/order') {
      await sock.sendMessage(remoteJid, { text: '⏳ Mengambil data pesanan terbaru dari website...' });

      try {
        const response = await axios.get(`${config.storeApiUrl}/api/bot/orders`, {
          headers: { 'X-BOT-SECRET': config.storeApiKey },
          timeout: 15000,
        });

        const { today_summary, recent_orders } = response.data;
        let reply = `📊 *RINGKASAN PESANAN TOKO KOPI SEMBILAN*\n`;
        reply += `📅 Hari Ini: *${today_summary.count} Pesanan* (Total: Rp ${Number(today_summary.revenue).toLocaleString('id-ID')})\n\n`;
        reply += `*5 Transaksi Terbaru:*\n`;

        if (!recent_orders || recent_orders.length === 0) {
          reply += `_Belum ada pesanan masuk baru-baru ini._`;
        } else {
          recent_orders.forEach((o, idx) => {
            reply += `\n${idx + 1}. *#${o.transaction_id}* (${o.date})\n`;
            reply += `   👤 ${o.customer} (${o.phone})\n`;
            reply += `   💰 Rp ${Number(o.total_paid).toLocaleString('id-ID')} [${o.status}]\n`;
          });
        }

        await sock.sendMessage(remoteJid, { text: reply });
      } catch (err) {
        await sock.sendMessage(remoteJid, {
          text: `❌ Gagal mengambil pesanan dari website: ${err.message}`,
        });
      }
      return;
    }

    // 4. Perintah: /stok atau /produk
    if (lowerCmd === '/stok' || lowerCmd === '/produk') {
      await sock.sendMessage(remoteJid, { text: '⏳ Mengambil daftar stok produk...' });

      try {
        const response = await axios.get(`${config.storeApiUrl}/api/bot/products`, {
          headers: { 'X-BOT-SECRET': config.storeApiKey },
          timeout: 15000,
        });

        const products = response.data.products;
        let reply = `📋 *DAFTAR STOK PRODUK TOKO KOPI SEMBILAN*\n\n`;

        if (!products || products.length === 0) {
          reply += `_Belum ada produk terdaftar._`;
        } else {
          products.forEach((p, idx) => {
            const statusIcon = p.stock <= 0 ? '🔴' : p.stock < 5 ? '🟡' : '🟢';
            reply += `${statusIcon} *${p.name}*\n   Stok: *${p.stock}* | Rp ${Number(p.price).toLocaleString('id-ID')}\n`;
          });
        }

        await sock.sendMessage(remoteJid, { text: reply });
      } catch (err) {
        await sock.sendMessage(remoteJid, {
          text: `❌ Gagal mengambil data stok dari website: ${err.message}`,
        });
      }
      return;
    }

    // 5. Perintah: /ubah-stok [nama] [jumlah]
    if (lowerCmd.startsWith('/ubah-stok')) {
      const parts = bodyText.split(' ').filter(Boolean);
      if (parts.length < 3) {
        await sock.sendMessage(remoteJid, {
          text: `Format salah! Gunakan:\n\`/ubah-stok [Nama/ID Produk] [JumlahBaru]\`\nContoh: \`/ubah-stok Gayo 40\``,
        });
        return;
      }

      const newStock = parseInt(parts[parts.length - 1], 10);
      const identifier = parts.slice(1, parts.length - 1).join(' ');

      try {
        const response = await axios.post(
          `${config.storeApiUrl}/api/bot/products/update`,
          { identifier, stock: newStock },
          { headers: { 'X-BOT-SECRET': config.storeApiKey }, timeout: 15000 }
        );

        await sock.sendMessage(remoteJid, {
          text: `✅ ${response.data.message}`,
        });
      } catch (err) {
        const msgErr = err.response?.data?.message || err.message;
        await sock.sendMessage(remoteJid, { text: `❌ ${msgErr}` });
      }
      return;
    }

    // 6. Perintah: /ubah-harga [nama] [harga]
    if (lowerCmd.startsWith('/ubah-harga')) {
      const parts = bodyText.split(' ').filter(Boolean);
      if (parts.length < 3) {
        await sock.sendMessage(remoteJid, {
          text: `Format salah! Gunakan:\n\`/ubah-harga [Nama/ID Produk] [HargaBaru]\`\nContoh: \`/ubah-harga Gayo 95000\``,
        });
        return;
      }

      const newPrice = parseFloat(parts[parts.length - 1].replace(/\D/g, ''));
      const identifier = parts.slice(1, parts.length - 1).join(' ');

      try {
        const response = await axios.post(
          `${config.storeApiUrl}/api/bot/products/update`,
          { identifier, price: newPrice },
          { headers: { 'X-BOT-SECRET': config.storeApiKey }, timeout: 15000 }
        );

        await sock.sendMessage(remoteJid, {
          text: `✅ ${response.data.message}`,
        });
      } catch (err) {
        const msgErr = err.response?.data?.message || err.message;
        await sock.sendMessage(remoteJid, { text: `❌ ${msgErr}` });
      }
      return;
    }
  } catch (error) {
    console.error('[Admin Assistant] Error umum:', error);
  }
}

module.exports = {
  handleIncomingMessage,
  parseProductText,
};
