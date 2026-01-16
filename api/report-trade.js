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

const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    accountId: { type: String, required: true },
    openDate: String,
    symbol: String,
    side: String,
    entry: Number,
    exit: Number,
    qty: Number,
    pnl: Number,
    status: String
});

// Index agar pencarian dan update data super cepat
tradeSchema.index({ id: 1, accountId: 1 }, { unique: true });

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    // Header agar Dashboard (React) bisa akses data
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectToDB();

    // --- LOGIKA MENYIMPAN DATA (DARI MT5) ---
    if (req.method === 'POST') {
        // 1. Cek Kunci Rahasia (API KEY)
        // Jika kunci yang dikirim EA tidak sama dengan yang di server, tolak!
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.API_KEY_SECRET) {
            return res.status(401).json({ error: "DILARANG: Kunci Rahasia Salah!" });
        }

        const newData = req.body;
        if (!newData.accountId) {
            return res.status(400).json({ error: "Wajib ada Account ID" });
        }

        // 2. Simpan atau Update (Upsert)
        await Trade.findOneAndUpdate(
            { id: String(newData.id), accountId: String(newData.accountId) },
            newData,
            { upsert: true, new: true }
        );
        return res.status(200).json({ message: "Data Tersimpan" });
    }
    
    // --- LOGIKA MENGAMBIL DATA (UNTUK DASHBOARD) ---
    if (req.method === 'GET') {
         const { accountId } = req.query;
         let query = {};
         if (accountId) query = { accountId: String(accountId) };
         
         // Ambil 1000 trade terakhir (biar ringan)
         const trades = await Trade.find(query).sort({ openDate: -1 }).limit(1000); 
         return res.status(200).json(trades);
    }

    return res.status(405).json({ error: "Method not allowed" });
}