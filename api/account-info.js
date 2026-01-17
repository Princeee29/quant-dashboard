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

const accountSchema = new mongoose.Schema({
    accountId: { type: String, required: true, unique: true },
    balance: Number,
    equity: Number,
    currency: String,
    server: String,
    lastUpdated: { type: Date, default: Date.now }
});

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectToDB();

    // 1. GET: App.jsx mengambil data saldo terbaru
    if (req.method === 'GET') {
        const { accountId } = req.query;
        if (!accountId) return res.status(400).json({ error: "Missing accountId" });
        const account = await Account.findOne({ accountId });
        return res.status(200).json(account || {});
    }

    // 2. POST: EA Melapor Saldo Terbaru
    if (req.method === 'POST') {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.API_KEY_SECRET && apiKey !== "KUNCI_RAHASIA_TRADING_SAYA_2026") { 
             return res.status(401).json({ error: "Unauthorized" });
        }

        const data = req.body; // { accountId, balance, equity, ... }
        
        await Account.findOneAndUpdate(
            { accountId: String(data.accountId) },
            { ...data, lastUpdated: new Date() },
            { upsert: true, new: true }
        );

        return res.status(200).json({ message: "Account Updated" });
    }
    
    return res.status(405).json({ error: "Method not allowed" });
}