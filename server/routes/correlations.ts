import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from '../services/websocket';
import {
  CorrelatedIncidentEntity,
  CreateCorrelationDTO,
  UpdateCorrelationDTO,
  CorrelationStatus,
  RiskLevel,
  CorrelationObservation,
  CorrelationReason,
} from '../types/api';

export const correlationsRouter = Router();

const VALID_LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VALID_STATUSES: CorrelationStatus[] = ['ACTIVE', 'CLOSED', 'ARCHIVED'];

function parseJsonField<T>(field: any, fallback: T): T {
  if (!field) return fallback;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return fallback;
    }
  }
  return field;
}

function formatCorrelation(row: any): CorrelatedIncidentEntity {
  return {
    id: row.id,
    status: (row.status || 'ACTIVE') as CorrelationStatus,
    correlation_score: Number(row.correlation_score),
    correlation_level: row.correlation_level as RiskLevel,
    started_at: row.started_at,
    last_seen_at: row.last_seen_at,
    camera_sequence: parseJsonField<string[]>(row.camera_sequence, []),
    linked_incidents: parseJsonField<string[]>(row.linked_incidents, []),
    observations: parseJsonField<CorrelationObservation[]>(row.observations, []),
    reasons: parseJsonField<CorrelationReason[]>(row.reasons, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ----------------------------------------------------------------------------
// GET /api/correlations - List correlated incidents with filters
// ----------------------------------------------------------------------------
correlationsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { status, correlation_level, camera_id, limit = '50' } = req.query;

    let query = 'SELECT * FROM correlated_incidents WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(String(status));
    }

    if (correlation_level) {
      query += ' AND correlation_level = ?';
      params.push(String(correlation_level));
    }

    if (camera_id) {
      query += ' AND camera_sequence LIKE ?';
      params.push(`%"${String(camera_id)}"%`);
    }

    query += ' ORDER BY started_at DESC LIMIT ?';
    params.push(Math.min(Math.max(1, parseInt(String(limit), 10) || 50), 200));

    const rows = db.prepare(query).all(...params);
    const data = rows.map(formatCorrelation);

    res.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /api/correlations/:id - Get single correlated incident
// ----------------------------------------------------------------------------
correlationsRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const row = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
    if (!row) {
      throw new AppError(`Correlated incident '${id}' not found`, 404);
    }

    res.json({
      success: true,
      data: formatCorrelation(row),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /api/correlations/:id/timeline - Chronological progression timeline
// ----------------------------------------------------------------------------
correlationsRouter.get('/:id/timeline', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const row = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
    if (!row) {
      throw new AppError(`Correlated incident '${id}' not found`, 404);
    }

    const corr = formatCorrelation(row);
    const observations = corr.observations.slice().sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const timeline = observations.map((obs, idx) => {
      let deltaSeconds = 0;
      if (idx > 0) {
        const prevTime = new Date(observations[idx - 1].timestamp).getTime();
        const currTime = new Date(obs.timestamp).getTime();
        deltaSeconds = Math.max(0, Math.round((currTime - prevTime) / 1000));
      }

      return {
        step: idx + 1,
        camera_id: obs.camera_id,
        track_id: obs.track_id,
        class_name: obs.class_name || 'person',
        event_type: obs.event_type || 'RISK_ASSESSMENT',
        risk_score: obs.risk_score || 0,
        risk_level: obs.risk_level || 'LOW',
        zone_name: obs.zone_name || 'Restricted Perimeter',
        timestamp: obs.timestamp,
        elapsed_seconds_since_previous: deltaSeconds,
        incident_id: obs.incident_id || null,
      };
    });

    res.json({
      success: true,
      data: {
        correlation_id: corr.id,
        status: corr.status,
        correlation_score: corr.correlation_score,
        correlation_level: corr.correlation_level,
        started_at: corr.started_at,
        last_seen_at: corr.last_seen_at,
        total_hops: Math.max(0, corr.camera_sequence.length - 1),
        camera_sequence: corr.camera_sequence,
        timeline,
        reasons: corr.reasons,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /api/correlations/:id/incidents - Fetch linked incident entities
// ----------------------------------------------------------------------------
correlationsRouter.get('/:id/incidents', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const row = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
    if (!row) {
      throw new AppError(`Correlated incident '${id}' not found`, 404);
    }

    const corr = formatCorrelation(row);
    let linkedIncidents: any[] = [];

    if (corr.linked_incidents && corr.linked_incidents.length > 0) {
      const placeholders = corr.linked_incidents.map(() => '?').join(',');
      const incRows = db.prepare(`SELECT * FROM incidents WHERE id IN (${placeholders})`).all(...corr.linked_incidents);
      linkedIncidents = incRows;
    }

    res.json({
      success: true,
      data: linkedIncidents,
      count: linkedIncidents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/correlations - Create or extend correlated incident
// ----------------------------------------------------------------------------
correlationsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const body: CreateCorrelationDTO = req.body;

    if (!body.started_at || !body.last_seen_at) {
      throw new AppError('started_at and last_seen_at are required ISO timestamps', 400);
    }

    const score = Math.max(0, Math.min(100, Number(body.correlation_score ?? 0)));
    const level: RiskLevel = VALID_LEVELS.includes(body.correlation_level) ? body.correlation_level : 'LOW';
    const status: CorrelationStatus = VALID_STATUSES.includes(body.status as any) ? (body.status as CorrelationStatus) : 'ACTIVE';

    const id = body.id || `CORR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const cameraSequenceJson = JSON.stringify(body.camera_sequence || []);
    const linkedIncidentsJson = JSON.stringify(body.linked_incidents || []);
    const observationsJson = JSON.stringify(body.observations || []);
    const reasonsJson = JSON.stringify(body.reasons || []);

    // Check if correlation already exists (upsert behavior)
    const existing = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);

    if (existing) {
      const prevLevel = (existing as any).correlation_level;
      db.prepare(`
        UPDATE correlated_incidents
        SET status = ?,
            correlation_score = ?,
            correlation_level = ?,
            last_seen_at = ?,
            camera_sequence = ?,
            linked_incidents = ?,
            observations = ?,
            reasons = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        status,
        score,
        level,
        body.last_seen_at,
        cameraSequenceJson,
        linkedIncidentsJson,
        observationsJson,
        reasonsJson,
        now,
        id
      );

      const updatedRow = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
      const updatedEntity = formatCorrelation(updatedRow);

      // Check if escalated
      if (prevLevel !== 'CRITICAL' && level === 'CRITICAL') {
        broadcastWebSocketMessage('correlation_escalated', {
          correlation_id: id,
          previous_level: prevLevel,
          new_level: level,
          score,
          camera_sequence: updatedEntity.camera_sequence,
          entity: updatedEntity,
        });
      } else {
        broadcastWebSocketMessage('correlation_updated', updatedEntity);
      }

      res.status(200).json({
        success: true,
        data: updatedEntity,
        timestamp: now,
      });
      return;
    }

    db.prepare(`
      INSERT INTO correlated_incidents (
        id, status, correlation_score, correlation_level, started_at, last_seen_at,
        camera_sequence, linked_incidents, observations, reasons, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      status,
      score,
      level,
      body.started_at,
      body.last_seen_at,
      cameraSequenceJson,
      linkedIncidentsJson,
      observationsJson,
      reasonsJson,
      now,
      now
    );

    const insertedRow = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
    const entity = formatCorrelation(insertedRow);

    broadcastWebSocketMessage('correlation_created', entity);

    res.status(201).json({
      success: true,
      data: entity,
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// PATCH /api/correlations/:id - Update status / escalation
// ----------------------------------------------------------------------------
correlationsRouter.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates: UpdateCorrelationDTO = req.body;

    const existing = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(`Correlated incident '${id}' not found`, 404);
    }

    const prevLevel = (existing as any).correlation_level;
    const now = new Date().toISOString();

    const newStatus = updates.status && VALID_STATUSES.includes(updates.status) ? updates.status : (existing as any).status;
    const newScore = updates.correlation_score !== undefined ? Math.max(0, Math.min(100, Number(updates.correlation_score))) : (existing as any).correlation_score;
    const newLevel = updates.correlation_level && VALID_LEVELS.includes(updates.correlation_level) ? updates.correlation_level : (existing as any).correlation_level;
    const newLastSeen = updates.last_seen_at || (existing as any).last_seen_at;
    const newCameraSeq = updates.camera_sequence ? JSON.stringify(updates.camera_sequence) : (existing as any).camera_sequence;
    const newLinkedInc = updates.linked_incidents ? JSON.stringify(updates.linked_incidents) : (existing as any).linked_incidents;
    const newObservations = updates.observations ? JSON.stringify(updates.observations) : (existing as any).observations;
    const newReasons = updates.reasons ? JSON.stringify(updates.reasons) : (existing as any).reasons;

    db.prepare(`
      UPDATE correlated_incidents
      SET status = ?,
          correlation_score = ?,
          correlation_level = ?,
          last_seen_at = ?,
          camera_sequence = ?,
          linked_incidents = ?,
          observations = ?,
          reasons = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      newStatus,
      newScore,
      newLevel,
      newLastSeen,
      newCameraSeq,
      newLinkedInc,
      newObservations,
      newReasons,
      now,
      id
    );

    const updatedRow = db.prepare('SELECT * FROM correlated_incidents WHERE id = ?').get(id);
    const updatedEntity = formatCorrelation(updatedRow);

    if (prevLevel !== 'CRITICAL' && newLevel === 'CRITICAL') {
      broadcastWebSocketMessage('correlation_escalated', {
        correlation_id: id,
        previous_level: prevLevel,
        new_level: newLevel,
        score: newScore,
        camera_sequence: updatedEntity.camera_sequence,
        entity: updatedEntity,
      });
    } else {
      broadcastWebSocketMessage('correlation_updated', updatedEntity);
    }

    res.json({
      success: true,
      data: updatedEntity,
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});
