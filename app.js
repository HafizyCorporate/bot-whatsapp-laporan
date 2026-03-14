const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('./db');
require('./report'); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // <-- Baca dari Docker
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ] 
    }
});


client.on('qr', async (qr) => {
    console.log("Sedang meminta kode pairing 8 angka ke WhatsApp...");
    try {
        // GANTI "6281234567890" DI BAWAH INI DENGAN NOMOR WA BOT KAMU 
        // (Wajib pakai awalan 62, tanpa tanda +, tanpa spasi, tanpa strip)
        const nomorBot = "628984287548";
        const pairingCode = await client.requestPairingCode(nomorBot); 
        
        console.log(`\n========================================`);
        console.log(`KODE PAIRING KAMU: ${pairingCode}`);
        console.log(`========================================\n`);
        console.log("CARA MASUKIN KODENYA:");
        console.log("1. Buka WA di HP kamu");
        console.log("2. Pilih 'Tautkan Perangkat' (Linked Devices)");
        console.log("3. Pilih 'Tautkan dengan Nomor Telepon' (di bagian bawah)");
        console.log("4. Masukkan kode 8 angka di atas!");
    } catch (err) {
        console.error("Gagal meminta kode pairing. Pastikan nomor sudah benar.", err);
    }
});


client.on('ready', () => {
    console.log("✅ Server Kasir AI Multi-Tenant Aktif dan Siap Menerima Pesanan!");
});

client.on('message', async msg => {
    try {
        // 1. Cek DB, apakah ini klien yang aktif?
        const dataKlien = await db.cekKlienAktif(msg.from);
        if (!dataKlien) return; 

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

// Baris ini yang menjalankan semuanya
client.initialize();
