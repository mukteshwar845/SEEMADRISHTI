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
import { sensorsRouter } from './routes/sensors';
import { evidenceRouter } from './routes/evidence';
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

  // Authenticated Evidence Endpoints (Strictly Protected; HTTP 206 Partial Content Range Support)
  app.use('/evidence', evidenceRouter);
  app.use('/api/evidence', evidenceRouter);
  app.use('/api/v1/evidence', evidenceRouter);

  // Static surveillance camera video fixtures for browser player
  app.use('/fixtures', express.static(path.resolve(process.cwd(), 'cv_service/tests/fixtures')));

  // Favicon handler
  app.get('/favicon.ico', (req: Request, res: Response) => {
    const icoPath = path.resolve(process.cwd(), 'public/favicon.svg');
    if (fs.existsSync(icoPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(icoPath);
    }
    return res.status(204).end();
  });

  // Priority 0 Security: Default-Deny on all API routes except explicitly whitelisted public endpoints
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Normalize path by stripping optional /v1 prefix
    const normPath = req.path.replace(/^\/v1/, '');

    // Whitelist strictly public endpoints:
    // - Health probes: /health
    // - Authentication: /auth/login, /auth/register, /auth/roles
    // - Local webcam daemon status probe: /webcam/status
    // - CCTV preview stream feeds for HTML5 <video> elements: /cameras/:id/video
    const isPublic =
      normPath === '/health' ||
      normPath === '/auth/login' ||
      normPath === '/auth/register' ||
      normPath === '/auth/roles' ||
      normPath === '/webcam/status' ||
      normPath === '/sensors/pair' ||
      normPath === '/sensors/heartbeat' ||
      /^\/cameras\/[^\/]+\/video/.test(normPath);

    if (isPublic) {
      return next();
    }

    // All sensitive reads (cameras, zones, events, alerts, incidents, correlations, telemetry,
    // analytics, system state, search, agents, chat) and all mutations require authentication
    return requireAuth(req, res, next);
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
  app.use('/api/sensors', sensorsRouter);

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
  app.use('/api/v1/sensors', sensorsRouter);

  // 404 for unhandled API routes only
  app.use('/api', notFoundHandler);
  app.use('/api/v1', notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
