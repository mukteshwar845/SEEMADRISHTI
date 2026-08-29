import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app';
import { initializeSchema } from './server/db/schema';
import { seedDemoData } from './server/db/seed';
import { closeDatabase, getDatabasePath, getDatabase } from './server/db/database';
import { initializeWebSocketServer, broadcastWebSocketMessage, getConnectedClientCount } from './server/services/websocket';
import os from 'os';

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  console.log('[DB] Initializing SQLite database at:', getDatabasePath());
  try {
    initializeSchema();
    seedDemoData();
    console.log('[DB] SQLite database initialized and seeded successfully.');
  } catch (err) {
    console.error('[DB] Error initializing database:', err);
  }

  const app = createApp();
  const server = http.createServer(app);

  // Initialize WebSocket gateway on /ws
  initializeWebSocketServer(server);
  console.log('[WS] WebSocket Server attached to HTTP server on /ws');

  // Periodic Telemetry & Anomaly Heartbeat
  setInterval(() => {
    if (getConnectedClientCount() === 0) return;
    try {
      const db = getDatabase();
      const cameraCount = (db.prepare('SELECT COUNT(*) as count FROM cameras').get() as any)?.count || 0;
      const zoneCount = (db.prepare('SELECT COUNT(*) as count FROM zones').get() as any)?.count || 0;
      const eventCount = (db.prepare('SELECT COUNT(*) as count FROM events').get() as any)?.count || 0;
      const alertCount = (db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any)?.count || 0;
      const activeAlerts = (db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0').get() as any)?.count || 0;

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      const telemetryPayload = {
        node: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
        },
        hardware: {
          cpuCores: cpus.length,
          cpuModel: cpus[0]?.model || 'Generic Edge CPU',
          loadAverage: loadAvg,
          memoryUsedGb: Math.round((usedMem / (1024 * 1024 * 1024)) * 100) / 100,
          memoryTotalGb: Math.round((totalMem / (1024 * 1024 * 1024)) * 100) / 100,
          memoryUsagePercent: Math.round((usedMem / totalMem) * 10000) / 100,
        },
        database: {
          totalCameras: cameraCount,
          totalZones: zoneCount,
          totalEvents: eventCount,
          totalAlerts: alertCount,
          activeAlerts,
        },
        websocket: {
          connectedClients: getConnectedClientCount(),
        },
      };

      broadcastWebSocketMessage('telemetry' as any, telemetryPayload);
    } catch {
      // ignore transient telemetry errors
    }
  }, 3000);

  // Vite middleware for development or static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👁️  SEEMADRISHTI AI - TACTICAL COMMAND EDGE GATEWAY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Server Running on: http://${HOST}:${PORT}                                  │
│ ● REST API Health:   http://${HOST}:${PORT}/api/health                       │
│ ● WebSocket Gateway: ws://${HOST}:${PORT}/ws                                 │
│ ● Mode:              ${process.env.NODE_ENV || 'development'}                │
└─────────────────────────────────────────────────────────────────────────────┘
    `);
  });

  function handleShutdown(signal: string) {
    console.log(`\n[SERVER] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[SERVER] HTTP & WebSocket server closed.');
      closeDatabase();
      console.log('[DB] SQLite database connection closed.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[SERVER] Forced shutdown after timeout.');
      process.exit(1);
    }, 5000);
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start SEEMADRISHTI server:', err);
  process.exit(1);
});
