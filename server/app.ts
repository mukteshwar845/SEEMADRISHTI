import express, { Request, Response, NextFunction } from 'express';
import { camerasRouter } from './routes/cameras';
import { zonesRouter } from './routes/zones';
import { eventsRouter } from './routes/events';
import { alertsRouter } from './routes/alerts';
import { telemetryRouter } from './routes/telemetry';
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

  // Root welcome route
  app.get('/', (req: Request, res: Response) => {
    res.json({
      project: 'SEEMADRISHTI AI',
      team: 'IQ100',
      problemStatement: 'SIH26187',
      service: 'seemadrishti-backend',
      version: '1.0.0-phase1',
      status: 'ok',
      docs: '/api/health',
    });
  });

  // Mount API Sub-Routers
  app.use('/api/cameras', camerasRouter);
  app.use('/api/zones', zonesRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/telemetry', telemetryRouter);
  app.use('/api/dev', devRouter);

  // 404 & Centralized Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
