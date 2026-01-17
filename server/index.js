const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const logger = require('./utils/logger');

// Global Exception Handlers
process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION! Server continuing...', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION! Server continuing...', reason);
});

const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Basic rate limiting for feedback
const feedbackRateLimit = new Map();
const RATE_LIMIT_MS = 60000; // 1 minute

app.post('/api/feedback', async (req, res) => {
    const { title, description, name } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Rate limit check
    const now = Date.now();
    if (feedbackRateLimit.has(ip) && now - feedbackRateLimit.get(ip) < RATE_LIMIT_MS) {
        return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    try {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            logger.error('GITHUB_TOKEN not configured on server');
            return res.status(500).json({ error: 'Feedback system not configured' });
        }

        const response = await axios.post(
            'https://api.github.com/repos/Nagateja1012/game-box/issues',
            {
                title: `[FEEDBACK] ${title}`,
                body: `**From:** ${name || 'Anonymous'}\n\n**Description:**\n${description}`
            },
            {
                headers: {
                    Authorization: `token ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );

        feedbackRateLimit.set(ip, now);
        res.status(201).json({ success: true, url: response.data.html_url });
    } catch (error) {
        logger.error('Failed to create GitHub issue', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, refine later
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

const socketHandlers = require('./socketHandlers');

// Initialize socket handlers (for async events)
socketHandlers.init(io);

io.on('connection', (socket) => {
    logger.info(`User Connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
        logger.info(`User Disconnected: ${socket.id}`, { reason });
    });

    socket.on('error', (err) => {
        logger.error(`Socket Error for ${socket.id}`, err);
    });

    socketHandlers.setupSocketHandlers(io, socket);
});

server.listen(PORT, () => {
    logger.info(`SERVER RUNNING ON PORT ${PORT}`);
});
