import { io } from 'socket.io-client';

let socket = null;

function currentToken() {
    return localStorage.getItem('token') || '';
}

export function getSocket() {
    const token = currentToken();

    if (!socket || socket.auth?.token !== token) {
        try {
            if (socket && socket.connected) socket.disconnect();
        } catch (e) {
        }

        socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
            autoConnect: false,
            auth: { token },
        });
    }

    return socket;
}

export function connectSocket() {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
}

export function disconnectSocket() {
    const s = socket;
    if (!s) return;
    try {
        if (s.connected) s.disconnect();
    } catch (e) { }
    socket = null;
}
