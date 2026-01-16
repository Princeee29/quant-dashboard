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
    id: { type: String, required: true, unique: true },
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
    // CORS Headers (Agar bisa diakses dari mana saja)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    await connectToDB();
    
    if (req.method === 'GET') {
        const trades = await Trade.find().sort({ _id: -1 });
        return res.status(200).json(trades);
    }
    
    return res.status(200).json([]); 
}