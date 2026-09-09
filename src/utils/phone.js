/**
 * Utilitas untuk membersihkan dan menormalisasi nomor telepon
 * sesuai standar format nomor WhatsApp internasional (Indonesia).
 */

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  
  // Buang suffix JID @... dan device index :device (misal :0, :1 pada WA multi-device)
  const raw = String(phone).split('@')[0].split(':')[0];
  let cleaned = raw.replace(/\D/g, '');

  // Jika berawalan 0, ubah menjadi 62 (contoh: 08123456789 -> 628123456789)
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  // Jika langsung diawali angka 8 (contoh: 8123456789 -> 628123456789)
  else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}


function toWhatsAppJid(phone) {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) {
    throw new Error('Nomor telepon tidak valid atau kosong');
  }
  return `${cleaned}@s.whatsapp.net`;
}

module.exports = {
  cleanPhoneNumber,
  toWhatsAppJid,
};
