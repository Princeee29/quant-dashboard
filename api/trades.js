import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// --- KONEKSI DB (Cached) ---
let isConnected = false;
const connectToDB = async () => {
    if (isConnected) return;
    if (mongoose.connection.readyState >= 1) {
        isConnected = true;
        return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
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
// Gunakan model yang sudah ada atau buat baru
const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

// --- HANDLER UTAMA ---
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'GET') {
        try {
            await connectToDB();
            // Ambil data, urutkan dari yang terbaru
            const trades = await Trade.find().sort({ _id: -1 });
            return res.status(200).json(trades);
        } catch (error) {
            return res.status(500).json({ error: "Gagal ambil data DB" });
        }
    }
    
    return res.status(405).json({ error: "Method not allowed" });
}