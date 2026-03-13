const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('./db');
require('./report'); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log("👆 SCAN QR CODE INI PAKAI NOMOR WA BOT PUSAT KAMU 👆");
});

client.on('ready', () => {
    console.log("✅ Server Kasir AI Multi-Tenant Aktif!");
});

client.on('message', async msg => {
    try {
        // 1. GATEKEEPER: Cek DB, apakah ini klien yang bayar langganan?
        const dataKlien = await db.cekKlienAktif(msg.from);
        if (!dataKlien) return; // Abaikan pesan dari orang iseng/belum bayar

        // 2. Proses AI
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
            Kamu adalah asisten kasir otomatis untuk "${dataKlien.nama_toko}".
            Ekstrak pesanan dari pesan ini: "${msg.body}".
            Keluarkan HANYA dalam format JSON persis seperti ini: {"status": "sukses", "barang": "nama", "qty": angka, "total": angka}.
            Jika pesan bukan transaksi, keluarkan: {"status": "gagal"}.
            Dilarang menggunakan format markdown.
        `;

        const result = await model.generateContent(prompt);
        let dataAI = result.response.text().trim();
        if (dataAI.startsWith('```json')) dataAI = dataAI.replace(/^```json/, '').replace(/```$/, '').trim();
        const data = JSON.parse(dataAI);

        // 3. Simpan & Balas
        if (data.status === "sukses") {
            await db.simpanTransaksi(msg.from, data.barang, data.qty, data.total);
            msg.reply(`✅ *Tercatat Boss ${dataKlien.nama_toko}!*\n🛒 ${data.barang} (x${data.qty})\n💰 Rp ${data.total.toLocaleString('id-ID')}`);
        }
        
    } catch (error) {
        console.error("Gagal memproses chat:", error.message);
    }
});

client.initialize();
