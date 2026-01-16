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

// Update Schema: Menambahkan field accountId
// Menghapus 'unique: true' pada id agar tiket yang sama bisa ada di akun berbeda
const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    accountId: { type: String, required: true }, // Field baru wajib diisi
    openDate: String,
    symbol: String,
    side: String,
    entry: Number,
    exit: Number,
    qty: Number,
    pnl: Number,
    status: String
});

// Optional: Compound index agar satu akun tidak bisa punya tiket duplikat
// tradeSchema.index({ id: 1, accountId: 1 }, { unique: true });

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectToDB();

    if (req.method === 'POST') {
        const newData = req.body;

        // Validasi: Pastikan accountId dikirim oleh Bot/EA
        if (!newData.accountId) {
            return res.status(400).json({ error: "accountId is required" });
        }

        // Simpan atau Update berdasarkan ID dan AccountID
        await Trade.findOneAndUpdate(
            { id: String(newData.id), accountId: String(newData.accountId) },
            newData,
            { upsert: true, new: true }
        );
        return res.status(200).json({ message: "Saved" });
    }
    
    return res.status(405).json({ error: "Method not allowed" });
}