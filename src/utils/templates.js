/**
 * Template pesan transaksional Toko Kopi Sembilan sesuai PRD Bagian 4.
 */

function formatCurrency(amount) {
  if (typeof amount === 'number') {
    return amount.toLocaleString('id-ID');
  }
  return amount;
}

/**
 * Pengingat Pembayaran Tahap 1 (Menit ke 40-45)
 */
function reminderStage1({ customer_name, transaction_id, total_paid, payment_url }) {
  return `Halo ${customer_name},

Kami menginformasikan bahwa batas waktu pembayaran untuk pesanan Anda di Toko Kopi Sembilan tersisa sekitar 15 menit lagi.

No. Transaksi: #${transaction_id}
Total Pembayaran: Rp ${formatCurrency(total_paid)}

Agar pesanan biji kopi Anda tidak otomatis dibatalkan oleh sistem, silakan selesaikan pembayaran sebelum waktu berakhir melalui tautan berikut:
${payment_url}

Jika Anda sudah melakukan pembayaran, silakan abaikan pesan ini. Terima kasih.`;
}

/**
 * Pengingat Pembayaran Tahap 2 (Order Recovery via QRIS - Menit ke-60/Kedaluwarsa)
 */
function reminderStage2Caption({ customer_name, transaction_id, total_paid }) {
  return `Halo ${customer_name},

Waktu pembayaran pesanan Anda #${transaction_id} di website telah berakhir sehingga halaman pembayaran otomatis ditutup.

Namun jangan khawatir, jika Anda masih berminat dengan biji kopi pilihan Anda, Anda tetap dapat melakukan pembayaran langsung di sini:

Total Bayar: Rp ${formatCurrency(total_paid)}

Cara Pembayaran:
1. Pindai (scan) kode QRIS pada gambar di atas menggunakan aplikasi m-Banking atau e-Wallet (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay, dll).
2. Masukkan nominal tepat: Rp ${formatCurrency(total_paid)}
3. Setelah berhasil, silakan balas pesan ini dengan mengirimkan TANGKAPAN LAYAR (SCREENSHOT) BUKTI TRANSFER Anda.

Tim admin kami akan langsung memverifikasi dan memproses pengiriman kopi Anda. Terima kasih.`;
}

/**
 * Notifikasi Pesanan Baru Masuk ke Owner
 */
function newOrderToOwner({
  transaction_id,
  customer_name,
  customer_phone,
  total_paid,
  payment_method,
  courier_display,
  items_list,
  shipping_address,
}) {
  return `[PESANAN BARU MASUK - TOKO KOPI SEMBILAN]

No. Transaksi: #${transaction_id}
Nama Pembeli: ${customer_name}
No. WA Pembeli: ${customer_phone}
Total Bayar: Rp ${formatCurrency(total_paid)}
Metode Bayar: ${payment_method}
Kurir: ${courier_display}

Daftar Produk:
${items_list}

Alamat Tujuan:
${shipping_address}

Detail Order Admin:
https://tokokopisembilan.com/admin/orders`;
}

/**
 * Notifikasi Pengiriman & Nomor Resi
 */
function shippingNotification({
  customer_name,
  transaction_id,
  courier,
  tracking_number,
}) {
  return `Halo ${customer_name},

Pesanan kopi Anda #${transaction_id} sedang dalam proses pengiriman!

Kurir: ${courier}
No. Resi: ${tracking_number}

Silakan lacak status paket Anda melalui tautan resmi ekspedisi terkait. Terima kasih telah berbelanja di Toko Kopi Sembilan!`;
}

module.exports = {
  formatCurrency,
  reminderStage1,
  reminderStage2Caption,
  newOrderToOwner,
  shippingNotification,
};
