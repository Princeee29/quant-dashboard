import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE ---
let isConnected = false;
const connectToDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log("✅ DB Connected");
    } catch (error) {
        console.error("❌ DB Error:", error);
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

// --- ROUTES (PERBAIKAN DISINI) ---
// Kita tambahkan prefix '/api' agar cocok dengan URL yang masuk

app.get('/api/trades', async (req, res) => {
    await connectToDB();
    try {
        const trades = await Trade.find().sort({ _id: -1 });
        res.json(trades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/report-trade', async (req, res) => {
    await connectToDB();
    const newData = req.body;
    try {
        await Trade.findOneAndUpdate(
            { id: String(newData.id) },
            newData,
            { upsert: true, new: true }
        );
        res.status(200).send({ message: "Saved" });
    } catch (error) {
        res.status(500).send({ error: "DB Error" });
    }
});

app.get('/api', (req, res) => {
    res.send("Quant Server Running...");
});

export default app;