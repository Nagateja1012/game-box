import { io } from 'socket.io-client';

// In production, this should be an env var. For now, localhost:3001
export const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: false
});
