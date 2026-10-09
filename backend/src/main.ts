import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import { connectDB } from './database/db';
import { wsManager } from './websocket/gateway';

import authRouter from './routes/auth.router';
import customersRouter from './routes/customers.router';
import accountsRouter from './routes/accounts.router';
import systemAccountsRouter from './routes/system-accounts.router';
import notesRouter from './routes/notes.router';
import overviewRouter from './routes/overview.router';
import configsRouter from './routes/configs.router';
import dashboardRouter from './routes/dashboard.router';
import historyRouter from './routes/history.router';
import usersRouter from './routes/users.router';
import quanLyHoRouter from './routes/quan-ly-ho.router';

import { authenticateJWT } from './middlewares/auth.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : true;

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check (Public - support /, /health, /api/health for Render & health monitors)
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'OK',
    service: 'ASM Backend Modular Monolith',
    timestamp: new Date().toISOString()
  });
});

// Unprotected Auth Routes
app.use('/api/auth', authRouter);

// Protected API Routes (Requires valid JWT Token)
app.use('/api/customers', authenticateJWT, customersRouter);
app.use('/api/accounts', authenticateJWT, accountsRouter);
app.use('/api/system-accounts', authenticateJWT, systemAccountsRouter);
app.use('/api/notes', authenticateJWT, notesRouter);
app.use('/api/overview', authenticateJWT, overviewRouter);
app.use('/api/configs', authenticateJWT, configsRouter);
app.use('/api/dashboard', authenticateJWT, dashboardRouter);
app.use('/api/history', authenticateJWT, historyRouter);
app.use('/api/users', authenticateJWT, usersRouter);
app.use('/api/quan-ly-ho', authenticateJWT, quanLyHoRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err?.message || err);
  res.status(err?.status || 500).json({
    message: err?.message || 'Lỗi hệ thống nội bộ.'
  });
});

// Create HTTP and WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

wsManager.init(io);

// Start server
async function bootstrap() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 ASM Backend Monolith running at http://localhost:${PORT}`);
    console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

bootstrap();
