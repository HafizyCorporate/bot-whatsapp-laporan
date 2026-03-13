const cron = require('node-cron');
const axios = require('axios');
const db = require('./db');

cron.schedule('0 21 * * *', async () => {
    console.log("Memulai pengiriman laporan massal...");
    try {
        // Ambil semua klien yang aktif
        const resKlien = await db.pool.query('SELECT * FROM klien_aktif');
        const semuaKlien = resKlien.rows;

        for (const klien of semuaKlien) {
            // Ambil transaksi hari ini khusus untuk klien tersebut
            const query = `
                SELECT nama_barang, qty, total_harga 
                FROM transaksi_harian 
                WHERE nomor_wa_klien = $1 AND DATE(waktu_transaksi) = CURRENT_DATE
            `;
            const resTransaksi = await db.pool.query(query, [klien.nomor_wa]);
            const transaksi = resTransaksi.rows;

            if (transaksi.length === 0) continue; // Skip jika toko sedang tidak ada transaksi

            let totalOmzet = 0;
            let htmlTabel = '<table border="1" cellpadding="5" cellspacing="0"><tr><th>Barang</th><th>Qty</th><th>Total</th></tr>';
            
            transaksi.forEach(t => {
                totalOmzet += parseFloat(t.total_harga);
                htmlTabel += `<tr><td>${t.nama_barang}</td><td>${t.qty}</td><td>Rp ${t.total_harga}</td></tr>`;
            });
            htmlTabel += `</table><br><h2>Total Omzet: Rp ${totalOmzet.toLocaleString('id-ID')}</h2>`;

            // Tembak email pakai Brevo
            await axios.post('[https://api.brevo.com/v3/smtp/email](https://api.brevo.com/v3/smtp/email)', {
                sender: { name: "Sistem Kasir Pusat", email: "admin@sistemkasir.com" },
                to: [{ email: klien.email_laporan }],
                subject: `Rekap Penjualan Harian - ${klien.nama_toko}`,
                htmlContent: `<h3>Halo Boss ${klien.nama_toko}, ini rekap hari ini:</h3>${htmlTabel}`
            }, {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ Laporan terkirim ke ${klien.email_laporan}`);
        }
    } catch (error) {
        db.laporErrorSistem(`Gagal proses Cron Job: ${error.message}`);
    }
});
