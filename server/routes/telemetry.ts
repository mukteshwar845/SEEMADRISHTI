import { Router, Request, Response, NextFunction } from 'express';
import os from 'os';
import { getDatabase } from '../db/database';
import { getConnectedClientCount } from '../services/websocket';

export const telemetryRouter = Router();

// GET /api/telemetry - Live edge node telemetry and database statistics
telemetryRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
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

    res.json({
      success: true,
      data: {
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
          activeAlerts: activeAlerts,
        },
        websocket: {
          connectedClients: getConnectedClientCount(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
