import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from '../services/websocket';
import { EventEntity, SeverityLevel } from '../types/api';

export const eventsRouter = Router();

const VALID_SEVERITIES: SeverityLevel[] = ['High', 'Medium', 'Low', 'Info'];

function formatEvent(e: any) {
  let parsedMetadata = null;
  if (e.metadata) {
    try {
      parsedMetadata = JSON.parse(e.metadata);
    } catch {
      parsedMetadata = e.metadata;
    }
  }
  return {
    ...e,
    metadata: parsedMetadata,
  };
}

// GET /api/events - List events with query filters
eventsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera, camera_id, severity, event_type, from, to, limit } = req.query;

    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    const targetCamera = camera_id || camera;
    if (targetCamera && typeof targetCamera === 'string') {
      query += ' AND camera_id = ?';
      params.push(targetCamera);
    }

    if (severity && typeof severity === 'string') {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (event_type && typeof event_type === 'string') {
      query += ' AND event_type = ?';
      params.push(event_type);
    }

    if (from && typeof from === 'string') {
      query += ' AND timestamp >= ?';
      params.push(from);
    }

    if (to && typeof to === 'string') {
      query += ' AND timestamp <= ?';
      params.push(to);
    }

    query += ' ORDER BY timestamp DESC';

    const maxLimit = limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 200) : 50;
    query += ' LIMIT ?';
    params.push(maxLimit);

    const raw = db.prepare(query).all(...params);
    const events = raw.map(formatEvent);

    res.json({
      success: true,
      data: events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id - Get event by ID
eventsRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const raw = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!raw) {
      throw new AppError(`Event with id '${id}' not found`, 404);
    }

    res.json({
      success: true,
      data: formatEvent(raw),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/events - Create new event (for CV service & test ingestion)
eventsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id, camera_id, event_type, severity, object_id, timestamp, metadata } = req.body;

    if (!camera_id || typeof camera_id !== 'string') {
      throw new AppError('camera_id is required', 400);
    }

    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(camera_id);
    if (!cam) {
      throw new AppError(`Camera '${camera_id}' does not exist`, 400);
    }

    if (!event_type || typeof event_type !== 'string' || event_type.trim() === '') {
      throw new AppError('event_type is required', 400);
    }

    let targetSeverity = severity;
    if (typeof targetSeverity === 'string' && targetSeverity.toUpperCase() === 'CRITICAL') {
      targetSeverity = 'High';
    }

    if (!targetSeverity || !VALID_SEVERITIES.includes(targetSeverity)) {
      throw new AppError(
        `Invalid severity '${severity}'. Allowed: ${VALID_SEVERITIES.join(', ')} (or CRITICAL)`,
        400
      );
    }

    const eventId = id && typeof id === 'string' && id.trim() !== '' ? id.trim() : `evt-${Date.now()}`;
    const eventTime = timestamp && typeof timestamp === 'string' ? timestamp : new Date().toISOString();
    const metaString = metadata !== undefined ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

    const insert = db.prepare(`
      INSERT INTO events (id, camera_id, event_type, severity, object_id, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(eventId, camera_id, event_type.trim(), targetSeverity, object_id || null, eventTime, metaString);

    const created = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    const formatted = formatEvent(created);

    // Broadcast event creation over WebSocket
    broadcastWebSocketMessage('event_created', formatted);

    res.status(201).json({
      success: true,
      data: formatted,
      message: 'Event created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
