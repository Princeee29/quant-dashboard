// api/delete-account.js
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
    // SECURITY: Mencegah eksekusi sembarangan (Opsional: Hardcode PIN rahasia)
    const { secret, targetAccount } = req.query;
    
    // Ganti "RAHASIA123" dengan password sementara pilihan Anda
    if (secret !== "RAHASIA123") {
        return res.status(401).json({ error: "Unauthorized: Salah Secret Key" });
    }

    if (!targetAccount) {
        return res.status(400).json({ error: "Mohon masukkan targetAccount di URL (contoh: ?targetAccount=123456)" });
    }

    await connectToDB();

    if (req.method === 'GET') {
        try {
            let filter = {};
            
            if (targetAccount === 'NULL') {
                // Hapus data yang tidak punya Account ID (seperti JSON yang Anda kirim)
                filter = { 
                    $or: [
                        { accountId: { $exists: false } },
                        { accountId: null },
                        { accountId: "" },
                        { accountId: "undefined" }
                    ]
                };
            } else {
                // Hapus akun spesifik
                filter = { accountId: targetAccount };
            }

            // EKSEKUSI PENGHAPUSAN
            const result = await Trade.deleteMany(filter);

            return res.status(200).json({ 
                status: "SUCCESS", 
                message: `Berhasil menghapus data akun: ${targetAccount}`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    return res.status(405).json({ error: "Method not allowed" });
}