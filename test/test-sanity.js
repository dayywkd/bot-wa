const assert = require('assert');
const { cleanPhoneNumber, toWhatsAppJid } = require('../src/utils/phone');
const templates = require('../src/utils/templates');
const config = require('../src/config');
const authMiddleware = require('../src/middleware/auth');

console.log('=== MENJALANKAN SANITY & UNIT TESTS ===\n');

// 1. Test Normalisasi Nomor Telepon
console.log('1. Pengujian Normalisasi Nomor Telepon:');
assert.strictEqual(cleanPhoneNumber('081234567890'), '6281234567890');
assert.strictEqual(cleanPhoneNumber('+6281234567890'), '6281234567890');
assert.strictEqual(cleanPhoneNumber('6281234567890'), '6281234567890');
assert.strictEqual(cleanPhoneNumber('0819-5253-8106'), '6281952538106');
assert.strictEqual(cleanPhoneNumber('8132869806'), '628132869806');
assert.strictEqual(toWhatsAppJid('081952538106'), '6281952538106@s.whatsapp.net');
assert.strictEqual(toWhatsAppJid('+628132869806'), '628132869806@s.whatsapp.net');
console.log('  [PASS] Normalisasi nomor telepon berfungsi dengan sempurna.');

// 2. Test Format Pesan / Template
console.log('\n2. Pengujian Template Pesan Transaksional:');

// Test Tahap 1
const stage1 = templates.reminderStage1({
  customer_name: 'Budi Santoso',
  transaction_id: 'TRX-1001',
  total_paid: 150000,
  payment_url: 'https://tokokopisembilan.com/pay/TRX-1001',
});
assert.ok(stage1.includes('Budi Santoso'));
assert.ok(stage1.includes('#TRX-1001'));
assert.ok(stage1.includes('Rp 150.000'));
assert.ok(stage1.includes('tersisa sekitar 15 menit lagi'));
console.log('  [PASS] Template Pengingat Tahap 1 sesuai.');

// Test Tahap 2 (Order Recovery QRIS)
const stage2 = templates.reminderStage2Caption({
  customer_name: 'Budi Santoso',
  transaction_id: 'TRX-1001',
  total_paid: 150000,
});
assert.ok(stage2.includes('telah berakhir'));
assert.ok(stage2.includes('Pindai (scan) kode QRIS'));
assert.ok(stage2.includes('TANGKAPAN LAYAR (SCREENSHOT) BUKTI TRANSFER'));
console.log('  [PASS] Template Pengingat Tahap 2 (Caption QRIS) sesuai.');

// Test Notifikasi Owner
const ownerMsg = templates.newOrderToOwner({
  transaction_id: 'TRX-1001',
  customer_name: 'Budi Santoso',
  customer_phone: '081234567890',
  total_paid: 150000,
  payment_method: 'QRIS',
  courier_display: 'JNE REG (1-2 hari)',
  items_list: '- 2x Kopi Arabika Gayo 250g\n- 1x Kopi Robusta Temanggung 250g',
  shipping_address: 'Jl. Merdeka No. 45, Jakarta Selatan',
});
assert.ok(ownerMsg.includes('[PESANAN BARU MASUK - TOKO KOPI SEMBILAN]'));
assert.ok(ownerMsg.includes('Budi Santoso'));
assert.ok(ownerMsg.includes('https://tokokopisembilan.com/admin/orders'));
console.log('  [PASS] Template Notifikasi Pesanan Baru ke Owner sesuai.');

// 3. Test Auth Middleware
console.log('\n3. Pengujian Auth Middleware:');
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

// Request tanpa header
const reqNoAuth = { headers: {} };
const resNoAuth = createMockRes();
authMiddleware(reqNoAuth, resNoAuth, () => {});
assert.strictEqual(resNoAuth.statusCode, 401);
assert.strictEqual(resNoAuth.body.error, 'Unauthorized');

// Request dengan token salah
const reqWrongToken = { headers: { authorization: 'Bearer salah_token' } };
const resWrongToken = createMockRes();
authMiddleware(reqWrongToken, resWrongToken, () => {});
assert.strictEqual(resWrongToken.statusCode, 401);

// Request dengan token benar
const reqValid = { headers: { authorization: `Bearer ${config.secretKey}` } };
let nextCalled = false;
authMiddleware(reqValid, {}, () => {
  nextCalled = true;
});
assert.strictEqual(nextCalled, true);
console.log('  [PASS] Auth Middleware memvalidasi Bearer Token dengan tepat.');

// 4. Test Konfigurasi
console.log('\n4. Pengujian Konfigurasi:');
assert.strictEqual(config.botPhone, '6281952538106');
assert.strictEqual(config.ownerPhone, '6285855180131');
console.log('  [PASS] Nomor Bot (6281952538106) & Owner (6285855180131) terkonfigurasi dengan benar.');

// 5. Test Parser Asisten Admin (/tambah-produk)
console.log('\n5. Pengujian Parser Perintah Tambah Produk:');
const { parseProductText } = require('../src/services/adminAssistant');
const sampleCmd = `/tambah-produk
Nama: Arabika Kerinci 250g
Harga: 85.000
Stok: 25
Kategori: Biji Kopi
Roast: Medium
Bean: Arabika
Deskripsi: Single origin aroma floral`;

const parsed = parseProductText(sampleCmd);
assert.strictEqual(parsed.name, 'Arabika Kerinci 250g');
assert.strictEqual(parsed.price, 85000);
assert.strictEqual(parsed.stock, 25);
assert.strictEqual(parsed.category, 'Biji Kopi');
assert.strictEqual(parsed.roast, 'Medium');
assert.strictEqual(parsed.bean, 'Arabika');
assert.strictEqual(parsed.description, 'Single origin aroma floral');
console.log('  [PASS] Parser teks perintah produk berjalan akurat.');

console.log('\n🎉 SEMUA TEST BERHASIL DILALUI DENGAN SUKSES! 🎉');

