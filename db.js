const { Pool } = require('pg');
const axios = require('axios');

// Koneksi ke PostgreSQL (Aman menggunakan Environment Variable)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Fungsi simpan transaksi (Anti SQL Injection dengan Parameterized Query)
async function simpanTransaksi(nomorKlien, barang, qty, total) {
    const query = 'INSERT INTO transaksi_harian (nomor_klien, nama_barang, qty, total_harga) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [nomorKlien, barang, qty, total]);
}

// Sistem Alert Darurat
async function laporErrorSistem(pesanError) {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) return;

    // Inject payload menggunakan format Saweria 
    const payload = {
        version: "v1.1",
        data: {
            donator_name: "Bot System",
            donator_email: "monetsoleh@gmail.com",
            message: `CRITICAL ERROR: ${pesanError}`,
            amount_raw: 0
        }
    };

    try {
        await axios.post(webhookUrl, payload);
        console.log("[SECURE] Alert sistem terkirim.");
    } catch (err) {
        console.error("Gagal kirim alert ke webhook admin.");
        // Error tidak di-throw agar bot tidak berhenti total
    }
}

module.exports = { pool, simpanTransaksi, laporErrorSistem };
