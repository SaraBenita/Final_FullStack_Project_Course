import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { PORT, MONGO_URI } from './config.js';
import path from 'path';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import convoRoutes from './routes/conversations.js';
import msgRoutes from './routes/messages.js';
import { authSocketMiddleware, registerSocketHandlers } from './socket.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

const httpServer = createServer(app);
const io = new IOServer(httpServer, { cors: { origin: true, credentials: true } });
io.use(authSocketMiddleware);
io.on('connection', (socket) => registerSocketHandlers(io, socket));

// attach io to req so routes can emit
app.use((req, res, next) => { req.io = io; next(); });

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', convoRoutes);
app.use('/api/messages', msgRoutes);

// serve uploaded files (allow cross-origin embedding from the frontend origin)
const uploadsPath = path.join(process.cwd(), 'server', 'uploads');
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use('/uploads', (req, res, next) => {
  // Allow the frontend dev origin to embed and fetch uploaded resources
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Permit embedding the resource cross-origin (otherwise CORP may block it)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

mongoose.connect(MONGO_URI).then(() => {
  console.log('[MongoDB] connected:', MONGO_URI);
  httpServer.listen(PORT, () => console.log(`[Server] listening on ${PORT}`));
}).catch(err => {
  console.error('Mongo connection error:', err.message);
  process.exit(1);
});
