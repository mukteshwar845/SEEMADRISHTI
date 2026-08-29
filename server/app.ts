import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { camerasRouter } from './routes/cameras';
import { zonesRouter } from './routes/zones';
import { eventsRouter } from './routes/events';
import { alertsRouter } from './routes/alerts';
import { incidentsRouter } from './routes/incidents';
import { correlationsRouter } from './routes/correlations';
import { environmentRouter } from './routes/environment';
import { analyticsRouter } from './routes/analytics';
import { telemetryRouter } from './routes/telemetry';
import { systemRouter } from './routes/system';
import { devRouter } from './routes/dev';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  // JSON Body Parser
  app.use(express.json());

  // CORS Middleware
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health Endpoint as specified:
  // GET /api/health -> { "status": "ok", "service": "seemadrishti-backend" }
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'seemadrishti-backend',
    });
  });

  app.get('/api/v1/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'HEALTHY',
      service: 'seemadrishti-backend',
      version: '4.2.0',
    });
  });

  // Static Serving for Evidence and Video Fixtures
  app.use('/evidence', express.static(path.resolve(process.cwd(), 'evidence')));
  app.use('/fixtures', express.static(path.resolve(process.cwd(), 'cv_service/tests/fixtures')));

  // Mount API Sub-Routers
  app.use('/api/cameras', camerasRouter);
  app.use('/api/zones', zonesRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/incidents', incidentsRouter);
  app.use('/api/correlations', correlationsRouter);
  app.use('/api/environment', environmentRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/telemetry', telemetryRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/dev', devRouter);

  // V1 Alias Sub-Routers
  app.use('/api/v1/cameras', camerasRouter);
  app.use('/api/v1/zones', zonesRouter);
  app.use('/api/v1/events', eventsRouter);
  app.use('/api/v1/alerts', alertsRouter);
  app.use('/api/v1/incidents', incidentsRouter);
  app.use('/api/v1/correlations', correlationsRouter);
  app.use('/api/v1/environment', environmentRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/telemetry', telemetryRouter);
  app.use('/api/v1/system', systemRouter);

  // 404 for unhandled API routes only
  app.use('/api', notFoundHandler);
  app.use('/api/v1', notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
