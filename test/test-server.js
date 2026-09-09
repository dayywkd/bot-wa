const http = require('http');
const assert = require('assert');
const { app } = require('../src/server');

const TEST_PORT = 3123;
let server;

async function runTests() {
  console.log('=== MENJALANKAN TEST INTEGRASI API SERVER ===\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server aktif di port ${TEST_PORT}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    // 1. Test GET / (Health check)
    console.log('1. Menguji GET / (Health Check)...');
    const resRoot = await fetch(`${baseUrl}/`);
    assert.strictEqual(resRoot.status, 200);
    const dataRoot = await resRoot.json();
    assert.strictEqual(dataRoot.service, 'Toko Kopi Sembilan WA Gateway');
    assert.strictEqual(dataRoot.bot_number, config.botPhone);
    console.log('   [PASS] GET / merespon dengan benar:', dataRoot);

    // 2. Test GET /qr
    console.log('\n2. Menguji GET /qr (Halaman QR)...');
    const resQr = await fetch(`${baseUrl}/qr`);
    assert.strictEqual(resQr.status, 200);
    const htmlQr = await resQr.text();
    assert.ok(htmlQr.includes('TOKO KOPI SEMBILAN'));
    assert.ok(htmlQr.includes('Perangkat Tertaut'));
    assert.ok(htmlQr.includes(config.botPhone));
    console.log('   [PASS] GET /qr menghasilkan HTML yang valid.');

    // 3. Test GET /api/qr-status
    console.log('\n3. Menguji GET /api/qr-status (Polling endpoint)...');
    const resQrStatus = await fetch(`${baseUrl}/api/qr-status`);
    assert.strictEqual(resQrStatus.status, 200);
    const dataQrStatus = await resQrStatus.json();
    assert.ok('connected' in dataQrStatus);
    assert.strictEqual(dataQrStatus.bot_number, config.botPhone);
    console.log('   [PASS] GET /api/qr-status berfungsi normal.');


    // 4. Test POST /send-message tanpa token (Harus 401)
    console.log('\n4. Menguji proteksi 401 Unauthorized pada POST /send-message...');
    const resNoToken = await fetch(`${baseUrl}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '08123456789', message: 'Test halo' }),
    });
    assert.strictEqual(resNoToken.status, 401);
    const dataNoToken = await resNoToken.json();
    assert.strictEqual(dataNoToken.error, 'Unauthorized');
    console.log('   [PASS] Request tanpa token ditolak dengan status 401.');

    // 5. Test POST /send-message dengan token salah (Harus 401)
    console.log('\n5. Menguji proteksi token salah...');
    const resWrongToken = await fetch(`${baseUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_ngawur',
      },
      body: JSON.stringify({ phone: '08123456789', message: 'Test halo' }),
    });
    assert.strictEqual(resWrongToken.status, 401);
    console.log('   [PASS] Token invalid ditolak dengan status 401.');

    // 6. Test POST /send-message dengan token benar tapi body kosong (Harus 400)
    console.log('\n6. Menguji validasi body pada POST /send-message...');
    const resMissingBody = await fetch(`${baseUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer kopi9_wa_secret_2026',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resMissingBody.status, 400);
    const dataMissingBody = await resMissingBody.json();
    assert.ok(dataMissingBody.error.includes('wajib diisi'));
    console.log('   [PASS] Validasi parameter body berfungsi dengan baik.');

    // 7. Test POST /send-media proteksi 401
    console.log('\n7. Menguji proteksi 401 pada POST /send-media...');
    const resMediaNoAuth = await fetch(`${baseUrl}/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '08123456789', media_url: 'https://example.com/qris.jpg' }),
    });
    assert.strictEqual(resMediaNoAuth.status, 401);
    console.log('   [PASS] POST /send-media dilindungi autentikasi Bearer.');

    // 8. Test POST /send-template proteksi 401 & validasi
    console.log('\n8. Menguji proteksi pada POST /send-template...');
    const resTplNoAuth = await fetch(`${baseUrl}/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stage1_reminder', phone: '08123456789', data: {} }),
    });
    assert.strictEqual(resTplNoAuth.status, 401);
    console.log('   [PASS] POST /send-template dilindungi autentikasi Bearer.');

    console.log('\n🎉 SEMUA PENGUJIAN API SERVER LOLOS 100%! 🎉\n');
  } finally {
    if (server) {
      server.close();
    }
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test gagal dengan error:', err);
  if (server) server.close();
  process.exit(1);
});
