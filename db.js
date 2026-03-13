const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Cek apakah nomor WA terdaftar sebagai klien VIP
async function cekKlienAktif(nomorWa) {
    const result = await pool.query('SELECT * FROM klien_aktif WHERE nomor_wa = $1', [nomorWa]);
    return result.rows.length ? result.rows[0] : null;
}

// Simpan transaksi dan relasikan dengan nomor WA klien
async function simpanTransaksi(nomorWa, barang, qty, total) {
    const query = 'INSERT INTO transaksi_harian (nomor_wa_klien, nama_barang, qty, total_harga) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [nomorWa, barang, qty, total]);
}

// Alert Sistem
async function laporErrorSistem(pesanError) {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) return;

    // Inject payload spesifik Saweria untuk admin monetsoleh@gmail.com
    const payload = {
        version: "v1.1",
        data: {
            donator_name: "SysAdmin KasirBot",
            donator_email: "monetsoleh@gmail.com",
            message: `CRITICAL ERROR: ${pesanError}`,
            amount_raw: 0
        }
    };

    try {
        await axios.post(webhookUrl, payload);
    } catch (err) {
        console.error("Gagal kirim alert sistem.");
    }
}

module.exports = { pool, cekKlienAktif, simpanTransaksi, laporErrorSistem };
