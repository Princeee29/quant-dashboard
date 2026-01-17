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

// UPDATE: Tambahkan 'currency' di sini
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

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    await connectToDB();
    
    if (req.method === 'GET') {
        const { accountId } = req.query;
        let filter = {};
        
        if (accountId && accountId !== 'ALL') {
            filter = { accountId: accountId };
        }

        const trades = await Trade.find(filter).sort({ _id: -1 });
        return res.status(200).json(trades);
    }
    
    return res.status(200).json([]); 
}