// api/fix-legacy.js
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
    accountId: String, // Tidak required agar tidak error saat load data lama
    // ... field lain tidak perlu didefinisikan untuk update ini
}, { strict: false }); // Strict false agar field lain tidak hilang

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    await connectToDB();

    // GANTI "12014650" DENGAN NOMOR AKUN UTAMA ANDA!
    const TARGET_ACCOUNT_ID = "731765";

    if (req.method === 'GET') {
        try {
            // Update semua data yang tidak punya field accountId ATAU accountId-nya null
            const result = await Trade.updateMany(
                { 
                    $or: [
                        { accountId: { $exists: false } },
                        { accountId: null },
                        { accountId: "" }
                    ]
                },
                { $set: { accountId: TARGET_ACCOUNT_ID } }
            );

            return res.status(200).json({ 
                message: "Database Fixed!", 
                updatedCount: result.modifiedCount,
                assignedTo: TARGET_ACCOUNT_ID
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    return res.status(405).json({ error: "Method not allowed" });
}