const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Middleware
app.use(cors({
    origin: ['chrome-extension://*'],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/session_buddy', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Session Schema
const sessionSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    sessionData: {
        name: String,
        sharedAt: Number,
        expiresAt: Number,
        oneTimeUse: Boolean
    },
    cookieData: [{
        url: String,
        cookies: [{
            name: String,
            value: String,
            domain: String,
            path: String,
            secure: Boolean,
            httpOnly: Boolean,
            sameSite: String,
            expirationDate: Number
        }]
    }],
    metadata: {
        version: String,
        sharedBy: String,
        tabCount: Number,
        cookieCount: Number,
        encryptedAt: Number
    },
    encrypted: {
        data: Buffer,
        iv: Buffer
    }
});

const Session = mongoose.model('Session', sessionSchema);

// Rate limiting middleware
const rateLimit = {};
const RATE_LIMIT = 50; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    
    if (!rateLimit[ip]) {
        rateLimit[ip] = {
            count: 1,
            firstRequest: now
        };
        return next();
    }

    if (now - rateLimit[ip].firstRequest > RATE_WINDOW) {
        rateLimit[ip] = {
            count: 1,
            firstRequest: now
        };
        return next();
    }

    if (rateLimit[ip].count >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    rateLimit[ip].count++;
    next();
}

// Routes
app.post('/api/sessions', rateLimiter, async (req, res) => {
    try {
        const { token, package: sessionPackage } = req.body;
        
        const session = new Session({
            token,
            ...sessionPackage
        });

        await session.save();
        res.json({ success: true, token });
    } catch (error) {
        console.error('Error storing session:', error);
        res.status(500).json({ error: 'Failed to store session' });
    }
});

app.get('/api/sessions/:token', rateLimiter, async (req, res) => {
    try {
        const { token } = req.params;
        const session = await Session.findOne({ token });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.sessionData.expiresAt < Date.now()) {
            await Session.deleteOne({ token });
            return res.status(404).json({ error: 'Session expired' });
        }

        if (session.sessionData.oneTimeUse) {
            await Session.deleteOne({ token });
        }

        res.json(session);
    } catch (error) {
        console.error('Error retrieving session:', error);
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

app.get('/api/validate/:token', rateLimiter, async (req, res) => {
    try {
        const { token } = req.params;
        const session = await Session.findOne({ token });

        if (!session) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        if (session.sessionData.expiresAt < Date.now()) {
            await Session.deleteOne({ token });
            return res.status(404).json({ error: 'Token expired' });
        }

        res.json({ valid: true });
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({ error: 'Failed to validate token' });
    }
});

app.post('/api/revoke/:token', rateLimiter, async (req, res) => {
    try {
        const { token } = req.params;
        await Session.deleteOne({ token });
        res.json({ success: true });
    } catch (error) {
        console.error('Error revoking token:', error);
        res.status(500).json({ error: 'Failed to revoke token' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`Session sharing server running on port ${port}`);
});
