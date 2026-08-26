import dotenv from 'dotenv';
import http from 'http';
import { createApp } from './app';
import { initializeSchema } from './db/schema';
import { seedDemoData } from './db/seed';
import { closeDatabase, getDatabasePath } from './db/database';
import { initializeWebSocketServer } from './services/websocket';

// Load environment variables from .env if present
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const HOST = '0.0.0.0';

// 1. Initialize SQLite Database & Schema
console.log('[DB] Connecting to SQLite database at:', getDatabasePath());
initializeSchema();

// 2. Seed Initial Demo Data (Idempotent)
seedDemoData();

// 3. Create Express Application & HTTP Server
export const app = createApp();
export const server = http.createServer(app);

// 4. Attach WebSocket Server (/ws)
export const wss = initializeWebSocketServer(server);

// 5. Start Listening
if (process.env.NODE_ENV !== 'test' || !module.parent) {
  server.listen(PORT, HOST, () => {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👁️  SEEMADRISHTI AI - TACTICAL BACKEND GATEWAY (PHASE 1)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Service:          seemadrishti-backend                                    │
│ ● REST Base URL:    http://127.0.0.1:${PORT}/api                                │
│ ● Health Check:     http://127.0.0.1:${PORT}/api/health                         │
│ ● WebSocket Gate:   ws://127.0.0.1:${PORT}/ws                                   │
│ ● Database:         SQLite (${getDatabasePath()})              │
│ ● Bound Interface:  ${HOST}:${PORT}                                          │
└─────────────────────────────────────────────────────────────────────────────┘
    `);
  });
}

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`\n[SERVER] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[SERVER] HTTP & WebSocket server closed.');
    closeDatabase();
    console.log('[DB] SQLite database connection closed.');
    process.exit(0);
  });

  // Force close if stuck
  setTimeout(() => {
    console.error('[SERVER] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
