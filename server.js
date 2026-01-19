import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import Handler API Anda (sesuaikan path impor)
import tradeHandler from './api/trades.js'; 
import deleteHandler from './api/delete-account.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Setup Socket.io
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error(err));

// Routes
app.get('/api/trades', (req, res) => tradeHandler(req, res));
app.delete('/api/delete-account', (req, res) => deleteHandler(req, res));

// Endpoint Khusus EA untuk Broadcast
app.post('/api/report-trade', async (req, res) => {
    // (Tambahkan logika simpan ke DB di sini jika belum ada di handler terpisah)
    
    const tradeData = req.body;
    
    // BROADCAST KE REACT
    io.emit('new-trade', tradeData);
    console.log(`📡 Broadcast Trade: ${tradeData.symbol} (${tradeData.status})`);

    res.status(200).json({ status: 'Broadcasted' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} with WebSocket`);
});