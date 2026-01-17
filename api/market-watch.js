import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Koneksi Database (Sama seperti file api lainnya)
let isConnected = false;
const connectToDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
    } catch (error) {
        console.error("DB Error", error);
    }
};

// Schema Database untuk Market Watch
const marketWatchSchema = new mongoose.Schema({
    accountId: { type: String, required: true, unique: true },
    symbols: [{
        symbol: String,
        change: Number,
        price: Number
    }],
    lastUpdated: { type: Date, default: Date.now }
});

// Model
const MarketWatch = mongoose.models.MarketWatch || mongoose.model('MarketWatch', marketWatchSchema);

export default async function handler(req, res) {
    // --- CORS HEADERS (Wajib agar bisa diakses dari mana saja) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key');

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    await connectToDB();

    try {
        // 1. GET: Frontend meminta data untuk Ticker
        if (req.method === 'GET') {
            const { accountId } = req.query;
            if (!accountId) return res.status(400).json({ error: "Missing accountId" });
            
            const data = await MarketWatch.findOne({ accountId });
            // Return array kosong jika data belum ada agar frontend tidak error
            return res.status(200).json(data ? data.symbols : []);
        }

        // 2. POST: EA mengirim data Market Watch (Setiap 5 detik)
        if (req.method === 'POST') {
            const apiKey = req.headers['x-api-key'];
            // Validasi API Key
            if (apiKey !== process.env.API_KEY_SECRET && apiKey !== "KUNCI_RAHASIA_TRADING_SAYA_2026") { 
                 return res.status(401).json({ error: "Unauthorized" });
            }

            const { accountId, symbols } = req.body; 

            // Simpan atau Update data
            await MarketWatch.findOneAndUpdate(
                { accountId: String(accountId) },
                { symbols, lastUpdated: new Date() },
                { upsert: true, new: true }
            );

            return res.status(200).json({ message: "Market Watch Updated" });
        }

        // Jika method bukan GET atau POST
        return res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}