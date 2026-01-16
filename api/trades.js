// Update agar Vercel mendeteksi folder API
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

// Schema harus sama persis dengan report-trade.js
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

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    await connectToDB();
    
    if (req.method === 'GET') {
        // Ambil parameter accountId dari URL
        const { accountId } = req.query;
        
        let filter = {};
        
        // Filter jika accountId ada dan bukan 'ALL'
        if (accountId && accountId !== 'ALL') {
            filter = { accountId: accountId };
        }

        const trades = await Trade.find(filter).sort({ _id: -1 });
        return res.status(200).json(trades);
    }
    
    return res.status(200).json([]); 
}