import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose'; // Database Driver
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Untuk keamanan password

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

// --- KONEKSI DATABASE (MONGODB) ---
// Kita akan ambil link dari Environment Variable di Render nanti
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Terkoneksi ke MongoDB Cloud"))
    .catch(err => console.error("❌ Gagal konek DB:", err));

// --- MEMBUAT SKEMA DATA (Struktur Tabel) ---
const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Ticket ID
    openDate: String,
    symbol: String,
    side: String,
    entry: Number,
    exit: Number,
    qty: Number,
    pnl: Number,
    status: String
});

const Trade = mongoose.model('Trade', tradeSchema);

// --- API ROUTES ---

// 1. TERIMA DATA DARI MT5
app.post('/api/report-trade', async (req, res) => {
    const newData = req.body;
    
    try {
        // Cek apakah trade sudah ada? (Upsert: Update jika ada, Insert jika baru)
        await Trade.findOneAndUpdate(
            { id: String(newData.id) }, // Cari berdasarkan ID
            newData,                    // Data baru
            { upsert: true, new: true } // Opsi: Buat baru jika tidak ketemu
        );
        
        console.log(`☁️ Cloud Sync: ${newData.symbol} (${newData.status})`);
        res.status(200).send({ message: "Saved to Cloud" });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).send({ error: "Database Error" });
    }
});

// 2. KIRIM DATA KE DASHBOARD
app.get('/api/trades', async (req, res) => {
    try {
        // Ambil semua data, urutkan dari terbaru (entry date desc)
        // Kita sorting di memory React saja biar konsisten dengan kode lama
        const trades = await Trade.find().sort({ _id: -1 }); 
        res.json(trades);
    } catch (error) {
        res.status(500).json([]);
    }
});

// 3. FRONTEND HANDLING
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server Cloud siap di port ${PORT}`);
});