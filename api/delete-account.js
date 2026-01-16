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
    // 1. Tambahkan Header agar tidak diblokir browser
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { secret, targetAccount } = req.query;

    // 2. Gunakan Password Sederhana dulu untuk Tes
    // Nanti bisa diganti lagi ke KUNCI_RAHASIA... jika sudah sukses
    if (secret !== "123") { 
        return res.status(401).json({ error: "Password Salah! Coba gunakan '123'" });
    }

    if (!targetAccount) {
        return res.status(400).json({ error: "Akun target tidak terbaca." });
    }

    await connectToDB();

    if (req.method === 'GET') {
        try {
            const result = await Trade.deleteMany({ accountId: targetAccount });
            
            return res.status(200).json({ 
                status: "BERHASIL", 
                message: `Data akun ${targetAccount} telah dihapus.`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    return res.status(405).json({ error: "Method not allowed" });
}