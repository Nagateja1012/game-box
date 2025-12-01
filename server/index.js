const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);
    socketHandlers(io, socket);
});

server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
