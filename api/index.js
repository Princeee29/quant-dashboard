// File: api/index.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// Kita letakkan di luar handler agar koneksi awet (Cached)
let isConnected = false;
const connectToDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log("✅ (Vercel) Connected to MongoDB");
    } catch (error) {
        console.error("❌ DB Error:", error);
    }
};

// --- SCHEMA ---
const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    openDate: String,
    symbol: String,
    side: String,
    entry: Number,
    exit: Number,
    qty: Number,
    pnl: Number,
    status: String
});

// Cek agar model tidak di-compile ulang saat hot-reload
const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

// --- ROUTES ---
// PENTING: Di Vercel, file "api/index.js" otomatis menjadi base URL "/api"
// Jadi kita TIDAK PERLU menulis "/api" lagi di dalam route.

app.get('/trades', async (req, res) => {
    await connectToDB();
    try {
        const trades = await Trade.find().sort({ _id: -1 });
        res.json(trades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/report-trade', async (req, res) => {
    await connectToDB();
    const newData = req.body;
    try {
        await Trade.findOneAndUpdate(
            { id: String(newData.id) },
            newData,
            { upsert: true, new: true }
        );
        res.status(200).send({ message: "Saved to Cloud" });
    } catch (error) {
        res.status(500).send({ error: "Database Error" });
    }
});

// Route default untuk cek status server
app.get('/', (req, res) => {
    res.send("Quant Server is Running...");
});

// Export app agar Vercel bisa menjalankannya
export default app;