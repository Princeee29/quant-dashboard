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

// Pastikan Schema sesuai dengan data dari EA
const tradeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    accountId: { type: String, required: true },
    currency: String,
    openDate: String, // Format: YYYY.MM.DD HH:MM
    symbol: String,
    side: String,
    entry: Number,
    exit: Number,
    qty: Number,
    pnl: Number,
    fee: Number,
    swap: Number,
    status: String
});

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    // Header CORS agar bisa diakses dari Frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    await connectToDB();
    
    if (req.method === 'GET') {
        const { accountId, page, limit, type } = req.query;
        let filter = {};
        
        // Filter Akun
        if (accountId && accountId !== 'ALL') {
            filter = { accountId: accountId };
        }

        try {
            // MODE 1: ALL DATA (Untuk Kalkulasi Chart & Stats)
            // Mengambil semua data tapi hanya field penting agar ringan
            if (type === 'all') {
                const trades = await Trade.find(filter).sort({ openDate: 1 }); // Sort Ascending (Lama -> Baru) untuk Chart
                return res.status(200).json({ data: trades });
            }

            // MODE 2: PAGINATION (Untuk Tabel History)
            // Server hanya mengirim data sesuai halaman yang diminta
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10; // Default 10 per halaman
            const skip = (pageNum - 1) * limitNum;

            const totalDocs = await Trade.countDocuments(filter);
            
            // Sort Descending (Baru -> Lama) agar trade terbaru muncul paling atas
            const trades = await Trade.find(filter)
                                      .sort({ openDate: -1 }) 
                                      .skip(skip)
                                      .limit(limitNum);

            return res.status(200).json({
                data: trades,
                pagination: {
                    total: totalDocs,
                    page: pageNum,
                    pages: Math.ceil(totalDocs / limitNum)
                }
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    return res.status(200).json([]); 
}