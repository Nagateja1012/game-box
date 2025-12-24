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

const app = express();
app.use(cors());

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
