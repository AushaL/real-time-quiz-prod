import { io, type Socket } from "socket.io-client";

// Vercel serves api/socket-io.js at /api/socket-io and forwards the Socket.IO
// handshake path, so the client uses /api/socket-io/socket.io. Locally the
// NestJS server uses the default /socket.io path.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:5000";
const SOCKET_PATH =
  import.meta.env.VITE_SOCKET_PATH ??
  (import.meta.env.PROD ? "/api/socket-io/socket.io" : "/socket.io");

export interface SocketAuth {
  token: string;
  /**
   * Called on every (re)connection attempt so a token that expired during a
   * long game is refreshed before the handshake.
   */
  getToken?: () => Promise<string | null>;
  name?: string;
  avatarUrl?: string;
}

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function connectSocket(auth: SocketAuth): Socket {
  if (socket?.connected) return socket;
  socket?.disconnect();

  const profile = { name: auth.name, avatarUrl: auth.avatarUrl };

  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    // Vercel supports WebSocket connections only; polling would hit a
    // separate serverless invocation instead of the socket function.
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
    auth: (callback) => {
      const tokenPromise = auth.getToken
        ? auth.getToken()
        : Promise.resolve(auth.token);

      tokenPromise
        .then((token) => callback({ ...profile, token: token ?? auth.token }))
        .catch(() => callback({ ...profile, token: auth.token }));
    },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
