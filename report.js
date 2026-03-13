const cron = require('node-cron');
const axios = require('axios');
const db = require('./db');

cron.schedule('0 21 * * *', async () => {
    console.log("Membuat laporan harian...");
    try {
        const query = `
            SELECT nama_barang, qty, total_harga 
            FROM transaksi_harian 
            WHERE nomor_klien = $1 AND DATE(waktu_transaksi) = CURRENT_DATE
        `;
        const result = await db.pool.query(query, [process.env.NOMOR_WA_KLIEN]);
        const transaksi = result.rows;

        if (transaksi.length === 0) {
            console.log("Hari ini sepi, tidak ada laporan dikirim.");
            return; 
        }

        let totalOmzet = 0;
        let htmlTabel = '<table border="1" cellpadding="5" cellspacing="0"><tr><th>Barang</th><th>Qty</th><th>Total</th></tr>';
        
        transaksi.forEach(t => {
            totalOmzet += parseFloat(t.total_harga);
            htmlTabel += `<tr><td>${t.nama_barang}</td><td>${t.qty}</td><td>Rp ${t.total_harga}</td></tr>`;
        });
        htmlTabel += `</table><br><h2>Total Omzet Hari Ini: Rp ${totalOmzet.toLocaleString('id-ID')}</h2>`;

        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: process.env.NAMA_TOKO, email: "noreply@sistemkasir.com" },
            to: [{ email: process.env.EMAIL_KLIEN }],
            subject: `Laporan Penjualan - ${process.env.NAMA_TOKO}`,
            htmlContent: `<h3>Halo Boss, ini rekap penjualan hari ini:</h3>${htmlTabel}`
        }, {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log("✅ Laporan harian terkirim via Brevo.");

    } catch (error) {
        console.error("Gagal mengirim laporan:", error.message);
        db.laporErrorSistem(`Gagal kirim email laporan: ${error.message}`);
    }
});
