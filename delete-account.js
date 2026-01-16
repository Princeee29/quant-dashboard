import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
const connectToDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
    } catch (error) { console.error("DB Error", error); }
};

const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    accountId: String, 
}, { strict: false });

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    const { secret, targetAccount } = req.query;

    // UPDATE: Sekarang menggunakan API Key asli Anda sebagai pengaman
    if (secret !== "KUNCI_RAHASIA_TRADING_SAYA_2026") {
        return res.status(401).json({ error: "Dilarang masuk! Salah kunci." });
    }

    if (!targetAccount) {
        return res.status(400).json({ error: "Target akun belum dimasukkan." });
    }

    await connectToDB();

    if (req.method === 'GET') {
        try {
            const result = await Trade.deleteMany({ accountId: targetAccount });

            return res.status(200).json({ 
                status: "BERHASIL DIHAPUS", 
                akun: targetAccount,
                jumlah_data_terhapus: result.deletedCount
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    return res.status(405).json({ error: "Method not allowed" });
}