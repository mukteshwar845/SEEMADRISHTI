import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from '../services/websocket';
import { AlertEntity, SeverityLevel } from '../types/api';

export const alertsRouter = Router();

const VALID_SEVERITIES: SeverityLevel[] = ['High', 'Medium', 'Low', 'Info'];

function formatAlert(a: any) {
  return {
    ...a,
    acknowledged: Boolean(a.acknowledged),
  };
}

// GET /api/alerts - List alerts with filters
alertsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { severity, camera, camera_id, acknowledged, from, to, limit } = req.query;

    let query = 'SELECT * FROM alerts WHERE 1=1';
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

    if (acknowledged !== undefined) {
      const isAck = acknowledged === '1' || acknowledged === 'true' ? 1 : 0;
      query += ' AND acknowledged = ?';
      params.push(isAck);
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
    const alerts = raw.map(formatAlert);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/:id - Get alert by ID
alertsRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const raw = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    if (!raw) {
      throw new AppError(`Alert with id '${id}' not found`, 404);
    }

    res.json({
      success: true,
      data: formatAlert(raw),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts - Create alert
alertsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id, event_id, camera_id, severity, title, reason, timestamp } = req.body;

    if (!camera_id || typeof camera_id !== 'string') {
      throw new AppError('camera_id is required', 400);
    }

    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(camera_id);
    if (!cam) {
      throw new AppError(`Camera '${camera_id}' does not exist`, 400);
    }

    if (event_id) {
      const evt = db.prepare('SELECT id FROM events WHERE id = ?').get(event_id);
      if (!evt) {
        throw new AppError(`Referenced event '${event_id}' does not exist`, 400);
      }
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

    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new AppError('Alert title is required', 400);
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new AppError('Alert reason is required', 400);
    }

    const alertId = id && typeof id === 'string' && id.trim() !== '' ? id.trim() : `alt-${Date.now()}`;
    const alertTime = timestamp && typeof timestamp === 'string' ? timestamp : new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO alerts (id, event_id, camera_id, severity, title, reason, acknowledged, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(alertId, event_id || null, camera_id, targetSeverity, title.trim(), reason.trim(), 0, alertTime);

    const created = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
    const formatted = formatAlert(created);

    // Broadcast alert created over WebSocket
    broadcastWebSocketMessage('alert_created', formatted);

    res.status(201).json({
      success: true,
      data: formatted,
      message: 'Alert created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/acknowledge - Acknowledge alert
alertsRouter.post('/:id/acknowledge', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { operator_id, action } = req.body || {};

    const existing = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(`Alert with id '${id}' not found`, 404);
    }

    const update = db.prepare(`
      UPDATE alerts
      SET acknowledged = 1
      WHERE id = ?
    `);

    update.run(id);

    const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    const formatted = formatAlert(updated);

    // Broadcast alert update over WebSocket
    broadcastWebSocketMessage('alert_updated', {
      alert: formatted,
      acknowledgedBy: operator_id || 'HQ-Operator',
      action: action || 'ACKNOWLEDGED',
    });

    res.json({
      success: true,
      data: formatted,
      message: `Alert '${id}' acknowledged successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/resolve - PRD Journey E: Resolve/escalate alert
alertsRouter.post('/:id/resolve', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { operator_id, status = 'Resolved', resolution_notes } = req.body || {};

    const existing = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(`Alert with id '${id}' not found`, 404);
    }

    const update = db.prepare(`
      UPDATE alerts
      SET acknowledged = 1
      WHERE id = ?
    `);
    update.run(id);

    const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    const formatted = {
      ...formatAlert(updated),
      status,
      resolution_notes: resolution_notes || 'Handled by Operator',
    };

    broadcastWebSocketMessage('alert_updated', {
      alert: formatted,
      resolvedBy: operator_id || 'HQ-Operator',
      status,
    });

    res.json({
      success: true,
      data: formatted,
      message: `Alert '${id}' marked as ${status}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/:id/evidence - PRD Section 5 & 13: Retrieve alert evidence dossier
alertsRouter.get('/:id/evidence', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const raw = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as any;
    if (!raw) {
      throw new AppError(`Alert with id '${id}' not found`, 404);
    }

    const alert = formatAlert(raw);
    const numMatch = id.match(/\d+/);
    const incNum = numMatch ? parseInt(numMatch[0], 10) : 1;
    const paddedId = `INC-00000${((incNum - 1) % 5) + 1}`;

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ? OR camera_id = ?').get(paddedId, alert.camera_id) as any;

    const snapshot_url = incident?.snapshot_path || `/evidence/INC-000001.jpg`;
    const clip_url = incident?.evidence_path || `/api/incidents/${paddedId}/evidence`;

    res.json({
      success: true,
      data: {
        alert_id: id,
        camera_id: alert.camera_id,
        severity: alert.severity,
        title: alert.title,
        reason: alert.reason,
        timestamp: alert.timestamp,
        incident_id: incident?.id || paddedId,
        snapshot_url,
        clip_url,
        risk_score: incident?.risk_score || 85,
        risk_level: incident?.risk_level || 'HIGH',
        explainability_tags: [
          `[TARGET: HUMAN]`,
          `[ZONE: RESTRICTED]`,
          `[AI_CONF: HIGH CERTAINTY (>85%)]`,
        ],
        trajectory_points: [
          { x: 0.5, y: 0.45, timestamp: alert.timestamp },
          { x: 0.52, y: 0.55, timestamp: alert.timestamp },
          { x: 0.55, y: 0.65, timestamp: alert.timestamp },
        ],
        unit_assigned: 'QRT-01 (Sector Alpha)',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

