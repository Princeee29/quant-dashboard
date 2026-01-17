import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

// UPDATE: Tambahkan 'currency' di sini juga
const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    accountId: { type: String, required: true },
    currency: String, // <--- INI WAJIB ADA
    openDate: String,
    symbol: String,
    side: String,
    entry: Number,
    exit: Number,
    qty: Number,
    pnl: Number,
    status: String
});

tradeSchema.index({ id: 1, accountId: 1 }, { unique: true });

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectToDB();

    if (req.method === 'POST') {
        const apiKey = req.headers['x-api-key'];
        // Pastikan key ini sesuai env variable Anda
        if (apiKey !== process.env.API_KEY_SECRET && apiKey !== "KUNCI_RAHASIA_TRADING_SAYA_2026") { 
             // Saya tambahkan hardcode key Anda sebagai backup jika env belum diset
             return res.status(401).json({ error: "Unauthorized" });
        }

        const payload = req.body;

        if (Array.isArray(payload)) {
            if (payload.length === 0) return res.status(200).json({ msg: "Empty batch" });

            const operations = payload.map(trade => ({
                updateOne: {
                    filter: { id: String(trade.id), accountId: String(trade.accountId) },
                    update: { $set: trade },
                    upsert: true
                }
            }));

            try {
                await Trade.bulkWrite(operations);
                return res.status(200).json({ message: "Batch Processed Successfully" });
            } catch (err) {
                console.error("Bulk Write Error:", err);
                return res.status(500).json({ error: "Batch Failed" });
            }
        }

        const newData = payload;
        if (!newData.accountId) return res.status(400).json({ error: "Missing Account ID" });

        await Trade.findOneAndUpdate(
            { id: String(newData.id), accountId: String(newData.accountId) },
            newData,
            { upsert: true, new: true }
        );
        return res.status(200).json({ message: "Single Trade Saved" });
    }
    
    return res.status(405).json({ error: "Method not allowed" });
}