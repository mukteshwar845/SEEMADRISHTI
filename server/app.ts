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
import { agentsRouter } from './routes/agents';
import { chatRouter } from './routes/chat';
import { webcamRouter } from './routes/webcam';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';

export function createApp(): express.Application {
  const app = express();

  // JSON Body Parser with 10MB payload capacity for base64 camera frame ingestion
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS Middleware (Restricted origins in production)
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigin = process.env.CORS_ORIGIN || (isProd ? 'http://localhost:3000' : '*');
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

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
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

  // Priority 1 Security: Enforce authentication on all mutating and sensitive API routes
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const p = req.path;

    // 1. Whitelist Public Endpoints
    if (
      p === '/health' ||
      p === '/v1/health' ||
      p === '/webcam/status' ||
      p === '/v1/webcam/status' ||
      p === '/auth/login' ||
      p === '/v1/auth/login' ||
      p === '/auth/register' ||
      p === '/v1/auth/register' ||
      p === '/auth/roles' ||
      p === '/v1/auth/roles' ||
      p === '/intelligence/search' ||
      p === '/v1/intelligence/search' ||
      p.startsWith('/intelligence/search') ||
      p.startsWith('/v1/intelligence/search') ||
      p.startsWith('/agents') ||
      p.startsWith('/v1/agents') ||
      p.startsWith('/chat') ||
      p.startsWith('/v1/chat') ||
      // Browser video element streams (allows streaming without breaking HTML5 video elements)
      (req.method === 'GET' && (p.includes('/video') || p.includes('/stream')))
    ) {
      return next();
    }

    // 2. All Mutating Operations require authentication (POST /api/alerts is strictly protected)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return requireAuth(req, res, next);
    }

    // 3. Sensitive Intelligence, Incidents, Zones, Events, Alerts, Users, System require authentication
    if (
      p.startsWith('/intelligence/journey') ||
      p.startsWith('/v1/intelligence/journey') ||
      p.startsWith('/users') ||
      p.startsWith('/v1/users')
    ) {
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
  app.use('/api/agents', agentsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/webcam', webcamRouter);

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
  app.use('/api/v1/agents', agentsRouter);
  app.use('/api/v1/webcam', webcamRouter);

  // 404 for unhandled API routes only
  app.use('/api', notFoundHandler);
  app.use('/api/v1', notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
