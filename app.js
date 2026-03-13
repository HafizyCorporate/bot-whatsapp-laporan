const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('./db');
require('./report'); // Menjalankan penjadwal laporan

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Konfigurasi Puppeteer khusus agar berjalan mulus di Railway
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ] 
    }
});

client.on('qr', qr => {
    // Menampilkan QR di log terminal Railway untuk discan
    qrcode.generate(qr, { small: true });
    console.log("👆 SCAN QR CODE DI ATAS MENGGUNAKAN WA TOKO KLIEN 👆");
});

client.on('ready', () => {
    console.log(`✅ Asisten AI ${process.env.NAMA_TOKO} Siap Bekerja!`);
});

client.on('message', async msg => {
    // SECURITY WHITELIST: Abaikan pesan dari orang lain, hanya layani Klien
    if (msg.from !== process.env.NOMOR_WA_KLIEN) return;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
            Kamu adalah asisten kasir otomatis.
            Ekstrak pesanan dari pesan berikut: "${msg.body}".
            Keluarkan HANYA dalam format JSON persis seperti ini: {"status": "sukses", "barang": "nama barang", "qty": angka, "total": angka total harga}.
            Jika pesan bukan tentang transaksi penjualan, keluarkan: {"status": "gagal"}.
            Dilarang menggunakan format markdown atau penjelasan teks tambahan.
        `;

        const result = await model.generateContent(prompt);
        let dataAI = result.response.text().trim();
        
        // Pembersihan string jika Gemini membandel mengirim markdown
        if (dataAI.startsWith('```json')) {
            dataAI = dataAI.replace(/^```json/, '').replace(/```$/, '').trim();
        }

        const data = JSON.parse(dataAI);

        if (data.status === "sukses") {
            await db.simpanTransaksi(msg.from, data.barang, data.qty, data.total);
            msg.reply(`✅ *Tercatat Boss!*\n🛒 ${data.barang} (x${data.qty})\n💰 Rp ${data.total.toLocaleString('id-ID')}\n_Laporan dikirim jam 9 malam._`);
        }
        
    } catch (error) {
        console.error("Gagal memproses chat:", error.message);
        // db.laporErrorSistem(`Gagal proses chat AI: ${error.message}`);
    }
});

client.initialize();
