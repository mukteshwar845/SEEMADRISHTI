import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
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
import { usersRouter } from './routes/users';
import { authRouter } from './routes/auth';
import { behaviorChainsRouter } from './routes/behavior_chains';
import { searchRouter } from './routes/search';
import { intelligenceRouter } from './routes/intelligence';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';

export function createApp(): express.Application {
  const app = express();

  // JSON Body Parser
  app.use(express.json());

  // CORS Middleware
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
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

  // Static Serving for Evidence and Video Fixtures with Range and Cache control
  app.use('/evidence', express.static(path.resolve(process.cwd(), 'evidence'), {
    acceptRanges: true,
    etag: true,
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
    },
  }));
  app.use('/fixtures', express.static(path.resolve(process.cwd(), 'cv_service/tests/fixtures'), {
    acceptRanges: true,
    etag: true,
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
    },
  }));

  // Favicon handler
  app.get('/favicon.ico', (req: Request, res: Response) => {
    const icoPath = path.resolve(process.cwd(), 'public/favicon.svg');
    if (fs.existsSync(icoPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(icoPath);
    }
    return res.status(204).end();
  });

  // Priority 1 Security: Enforce authentication on all mutating API routes (POST, PUT, DELETE, PATCH)
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Whitelist login, register, read-only search, and automated tactical alert ingestion from requiring a pre-existing token
    if (
      req.path === '/auth/login' ||
      req.path === '/v1/auth/login' ||
      req.path === '/auth/register' ||
      req.path === '/v1/auth/register' ||
      req.path === '/auth/roles' ||
      req.path === '/v1/auth/roles' ||
      req.path === '/intelligence/search' ||
      req.path === '/v1/intelligence/search' ||
      req.path.startsWith('/intelligence/search') ||
      req.path.startsWith('/v1/intelligence/search') ||
      (req.method === 'POST' && (req.path === '/alerts' || req.path === '/v1/alerts'))
    ) {
      return next();
    }
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return requireAuth(req, res, next);
    }
    next();
  });

  // Mount API Sub-Routers
  app.use('/api/intelligence/search', searchRouter);
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
  app.use('/api/users', usersRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/behavior-chains', behaviorChainsRouter);
  app.use('/api/intelligence', intelligenceRouter);

  // V1 Alias Sub-Routers
  app.use('/api/v1/intelligence/search', searchRouter);
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
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/behavior-chains', behaviorChainsRouter);
  app.use('/api/v1/intelligence', intelligenceRouter);

  // 404 for unhandled API routes only
  app.use('/api', notFoundHandler);
  app.use('/api/v1', notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
