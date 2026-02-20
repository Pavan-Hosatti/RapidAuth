const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 🚀 Production CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://rapid-auth-two.vercel.app',
    'https://rapid-auth-ac8wmtkq8-pavan-hosattis-projects.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// RAPIDAUTH BACKEND (SIMULATED)
// In a full production deployment, this layer would:
// 1. Generate and verify OTPs via Twilio/AWS SES.
// 2. Fetch on-chain claim data from the Algorand Indexer for the Registry.
// 3. Store non-sensitive metadata (e.g. university logs, student profiles).
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        network: 'Algorand Testnet',
        timestamp: new Date().toISOString()
    });
});

// Endpoint for the Identity Hub to fetch verified claims
app.get('/api/claims/:studentId', (req, res) => {
    // Simulated lookup logic
    res.json({ message: "Lookup redirected to Algorand Testnet AVM" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(`🚀 RapidAuth Backend running on port ${PORT}`);
});
