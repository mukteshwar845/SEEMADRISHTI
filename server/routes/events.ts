import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from '../services/websocket';
import { EventEntity, SeverityLevel } from '../types/api';

export const eventsRouter = Router();

const VALID_SEVERITIES: SeverityLevel[] = ['High', 'Medium', 'Low', 'Info'];

function formatEvent(e: any) {
  let parsedMetadata: any = null;
  if (e.metadata) {
    try {
      parsedMetadata = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
    } catch {
      parsedMetadata = e.metadata;
    }
  }
  const meta = typeof parsedMetadata === 'object' && parsedMetadata !== null ? parsedMetadata : {};
  const parsedTrackId = meta.track_id !== undefined ? meta.track_id : (e.track_id !== undefined ? e.track_id : e.object_id);
  return {
    ...e,
    source_type: e.source_type || meta.source_type || 'fixture',
    confidence: e.confidence !== undefined ? e.confidence : meta.confidence !== undefined ? meta.confidence : null,
    risk_score: e.risk_score !== undefined ? e.risk_score : meta.risk_score !== undefined ? meta.risk_score : null,
    risk_level: e.risk_level || meta.risk_level || null,
    track_id: parsedTrackId ?? null,
    class_name: meta.class_name || meta.label || (e.event_type && e.event_type !== 'INTRUSION' && e.event_type !== 'LOITERING' && e.event_type !== 'BASELINE_CALIBRATION' ? e.event_type : null),
    zone_name: meta.zone_name || e.zone_name || null,
    bbox: meta.bbox || null,
    metadata: parsedMetadata,
  };
}

// GET /api/events - List events with query filters
eventsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera, camera_id, severity, event_type, from, to, limit, source_type, live_only, freshness_sec, include_test } = req.query;

    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    const targetCamera = camera_id || camera;

    // Filter out test cameras by default unless explicitly requested or querying specific camera
    if (include_test !== 'true' && !targetCamera) {
      query += " AND camera_id NOT LIKE 'cam-test%' AND camera_id NOT LIKE 'cam-transient%'";
    }
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

    // LIVE ONLY mode: strictly physical live cameras or browser webcam
    if (live_only === 'true' || live_only === '1') {
      query += " AND source_type IN ('live_camera', 'browser_webcam', 'rtsp')";
      const seconds = Math.max(1, Math.min(300, parseInt(String(freshness_sec || '30'), 10)));
      const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
      query += ' AND timestamp >= ?';
      params.push(cutoff);
    } else if (source_type && typeof source_type === 'string') {
      query += ' AND source_type = ?';
      params.push(source_type);
    } else if (include_test !== 'true' && !targetCamera) {
      // Exclude fixture/test from live views if not specified
      query += " AND source_type != 'test'";
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
    const { id, camera_id, event_type, severity, object_id, timestamp, metadata, source_type } = req.body;

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
    const targetSourceType = source_type && typeof source_type === 'string'
      ? source_type
      : camera_id.startsWith('cam-test')
      ? 'test'
      : 'fixture';

    const insert = db.prepare(`
      INSERT INTO events (id, camera_id, event_type, severity, object_id, timestamp, metadata, source_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(eventId, camera_id, event_type.trim(), targetSeverity, object_id || null, eventTime, metaString, targetSourceType);

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
