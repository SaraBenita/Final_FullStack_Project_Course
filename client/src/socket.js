import { io } from 'socket.io-client';

let socket = null;

function currentToken() {
    return localStorage.getItem('token') || '';
}

export function getSocket() {
    const token = currentToken();

    // If we don't have a socket yet, or the token changed, (re)create it
    if (!socket || socket.auth?.token !== token) {
        // If an old socket exists, disconnect and clear it first
        try {
            if (socket && socket.connected) socket.disconnect();
        } catch (e) {
            // ignore
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
    // clear reference so next getSocket() will create a fresh socket (with current token)
    socket = null;
}
