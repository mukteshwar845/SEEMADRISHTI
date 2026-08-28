import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from '../services/websocket';
import { IncidentEntity, RiskLevel, EvidenceStatus } from '../types/api';

export const incidentsRouter = Router();

const VALID_RISK_LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VALID_EVIDENCE_STATUSES: EvidenceStatus[] = ['capturing', 'ready', 'failed'];

function formatIncident(row: any): IncidentEntity {
  let parsedMetadata = row.metadata;
  if (typeof row.metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(row.metadata);
    } catch {
      parsedMetadata = row.metadata;
    }
  }

  return {
    id: row.id,
    camera_id: row.camera_id,
    track_id: row.track_id !== null && row.track_id !== undefined ? String(row.track_id) : null,
    event_id: row.event_id || null,
    event_type: row.event_type,
    risk_score: Number(row.risk_score),
    risk_level: row.risk_level as RiskLevel,
    zone_name: row.zone_name || null,
    started_at: row.started_at,
    ended_at: row.ended_at || null,
    evidence_path: row.evidence_path || null,
    pre_event_seconds: Number(row.pre_event_seconds || 10.0),
    post_event_seconds: Number(row.post_event_seconds || 10.0),
    evidence_status: (row.evidence_status || 'capturing') as EvidenceStatus,
    metadata: parsedMetadata,
    acknowledged: Boolean(row.acknowledged),
    created_at: row.created_at,
  };
}

// GET /api/incidents - List incidents with optional filters
incidentsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const {
      camera,
      camera_id,
      risk_level,
      severity,
      evidence_status,
      status,
      acknowledged,
      from,
      to,
      limit,
    } = req.query;

    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params: any[] = [];

    const targetCamera = camera_id || camera;
    if (targetCamera && typeof targetCamera === 'string') {
      query += ' AND camera_id = ?';
      params.push(targetCamera);
    }

    const targetLevel = (risk_level || severity) as string | undefined;
    if (targetLevel) {
      query += ' AND UPPER(risk_level) = ?';
      params.push(targetLevel.toUpperCase());
    }

    const targetStatus = (evidence_status || status) as string | undefined;
    if (targetStatus) {
      query += ' AND evidence_status = ?';
      params.push(targetStatus.toLowerCase());
    }

    if (acknowledged !== undefined) {
      const isAck = acknowledged === '1' || acknowledged === 'true' ? 1 : 0;
      query += ' AND acknowledged = ?';
      params.push(isAck);
    }

    if (from && typeof from === 'string') {
      query += ' AND started_at >= ?';
      params.push(from);
    }

    if (to && typeof to === 'string') {
      query += ' AND started_at <= ?';
      params.push(to);
    }

    query += ' ORDER BY created_at DESC';

    const maxLimit = limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 200) : 50;
    query += ' LIMIT ?';
    params.push(maxLimit);

    const rows = db.prepare(query).all(...params);
    const incidents = rows.map(formatIncident);

    res.json({
      success: true,
      data: incidents,
      count: incidents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/incidents/:id - Get incident details
incidentsRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!row) {
      throw new AppError(`Incident with id '${id}' not found`, 404);
    }

    res.json({
      success: true,
      data: formatIncident(row),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/incidents/:id/evidence - Stream or serve MP4 forensic video clip
incidentsRouter.get('/:id/evidence', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
    if (!row) {
      throw new AppError(`Incident with id '${id}' not found`, 404);
    }

    if (!row.evidence_path) {
      throw new AppError(`Evidence video for incident '${id}' is not ready or has not been written`, 404);
    }

    // Resolve absolute path from relative evidence path
    const absPath = path.isAbsolute(row.evidence_path)
      ? row.evidence_path
      : path.resolve(process.cwd(), row.evidence_path);

    if (!fs.existsSync(absPath)) {
      throw new AppError(`Evidence file '${row.evidence_path}' does not exist on disk`, 404);
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents - Create a new incident (called by CV service)
incidentsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const {
      id,
      camera_id,
      track_id,
      event_id,
      event_type,
      risk_score,
      risk_level,
      zone_name,
      started_at,
      ended_at,
      evidence_path,
      pre_event_seconds,
      post_event_seconds,
      evidence_status,
      metadata,
    } = req.body;

    if (!camera_id) {
      throw new AppError('camera_id is required', 400);
    }
    if (!event_type) {
      throw new AppError('event_type is required', 400);
    }
    if (risk_score === undefined || risk_score === null) {
      throw new AppError('risk_score is required', 400);
    }
    if (!risk_level || !VALID_RISK_LEVELS.includes(risk_level.toUpperCase())) {
      throw new AppError(`risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}`, 400);
    }

    // Check camera existence (if camera doesn't exist, insert fallback camera so foreign key succeeds)
    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(camera_id);
    if (!cam) {
      const nowStr = new Date().toISOString();
      db.prepare(`
        INSERT INTO cameras (id, name, location, source_type, source_url, status, created_at, updated_at)
        VALUES (?, ?, ?, 'mp4', 'local', 'Online', ?, ?)
      `).run(camera_id, `Camera ${camera_id}`, 'Auto-registered', nowStr, nowStr);
    }

    const incidentId = id || `INC-${String(Date.now()).slice(-6)}`;
    const nowIso = new Date().toISOString();
    const startedAt = started_at || nowIso;
    const preSec = pre_event_seconds !== undefined ? Number(pre_event_seconds) : 10.0;
    const postSec = post_event_seconds !== undefined ? Number(post_event_seconds) : 10.0;
    const evStatus = evidence_status && VALID_EVIDENCE_STATUSES.includes(evidence_status) ? evidence_status : 'capturing';
    const metaStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : (metadata || null);

    const stmt = db.prepare(`
      INSERT INTO incidents (
        id, camera_id, track_id, event_id, event_type, risk_score, risk_level,
        zone_name, started_at, ended_at, evidence_path, pre_event_seconds,
        post_event_seconds, evidence_status, metadata, acknowledged, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(
      incidentId,
      camera_id,
      track_id !== undefined && track_id !== null ? String(track_id) : null,
      event_id || null,
      event_type,
      Number(risk_score),
      risk_level.toUpperCase(),
      zone_name || null,
      startedAt,
      ended_at || null,
      evidence_path || null,
      preSec,
      postSec,
      evStatus,
      metaStr,
      nowIso
    );

    const createdRow = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
    const incidentData = formatIncident(createdRow);

    // Broadcast WebSocket notification
    broadcastWebSocketMessage('incident_created', incidentData);

    res.status(201).json({
      success: true,
      data: incidentData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/incidents/:id - Update incident status or evidence path
incidentsRouter.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { ended_at, evidence_path, evidence_status, metadata, acknowledged } = req.body;

    const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new AppError(`Incident with id '${id}' not found`, 404);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (ended_at !== undefined) {
      updates.push('ended_at = ?');
      params.push(ended_at);
    }
    if (evidence_path !== undefined) {
      updates.push('evidence_path = ?');
      params.push(evidence_path);
    }
    if (evidence_status !== undefined) {
      if (!VALID_EVIDENCE_STATUSES.includes(evidence_status)) {
        throw new AppError(`evidence_status must be one of: ${VALID_EVIDENCE_STATUSES.join(', ')}`, 400);
      }
      updates.push('evidence_status = ?');
      params.push(evidence_status);
    }
    if (metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata);
    }
    if (acknowledged !== undefined) {
      updates.push('acknowledged = ?');
      params.push(acknowledged ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE incidents SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedRow = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    const incidentData = formatIncident(updatedRow);

    // If evidence became ready, broadcast evidence_ready
    if (evidence_status === 'ready') {
      broadcastWebSocketMessage('evidence_ready', incidentData);
    }

    res.json({
      success: true,
      data: incidentData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents/:id/acknowledge - Mark incident as acknowledged
incidentsRouter.post('/:id/acknowledge', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(`Incident with id '${id}' not found`, 404);
    }

    db.prepare('UPDATE incidents SET acknowledged = 1 WHERE id = ?').run(id);

    const updatedRow = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    res.json({
      success: true,
      data: formatIncident(updatedRow),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
