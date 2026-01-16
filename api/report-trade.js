import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
const connectToDB = async () => {
    if (isConnected) return;
    if (mongoose.connection.readyState >= 1) {
        isConnected = true;
        return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
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
    // Enable CORS for MT5
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle Preflight Request (Penting untuk WebRequest)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            await connectToDB();
            const newData = req.body;
            
            // Simpan atau Update data
            await Trade.findOneAndUpdate(
                { id: String(newData.id) },
                newData,
                { upsert: true, new: true }
            );
            
            return res.status(200).json({ message: "Saved to Cloud" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Database Error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}