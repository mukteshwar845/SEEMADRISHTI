import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { ApiResponse } from '../types/api';
import { broadcastWebSocketMessage } from '../services/websocket';

export const analyticsRouter = Router();

// ============================================================================
// GET /api/analytics/summary - High-level movement analytics summary
// ============================================================================
analyticsRouter.get('/summary', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const cameraId = req.query.camera_id as string | undefined;

    let entriesQuery = 'SELECT COUNT(*) as count FROM movement_events WHERE event_type = ?';
    let exitsQuery = 'SELECT COUNT(*) as count FROM movement_events WHERE event_type = ?';
    const params: any[] = [];

    if (cameraId) {
      entriesQuery += ' AND camera_id = ?';
      exitsQuery += ' AND camera_id = ?';
      params.push(cameraId);
    }

    const entriesRow = (db.prepare(entriesQuery).get('ENTRY', ...params) as any) || { count: 0 };
    const exitsRow = (db.prepare(exitsQuery).get('EXIT', ...params) as any) || { count: 0 };

    const occupancyRows = db.prepare(`
      SELECT zone_id, camera_id, zone_name, current_occupants, peak_occupants, average_occupants, class_breakdown
      FROM zone_occupancy
      ${cameraId ? 'WHERE camera_id = ?' : ''}
    `).all(...(cameraId ? [cameraId] : [])) as any[];

    const corridors = db.prepare(`
      SELECT corridor_id, from_camera, to_camera, traversal_count, average_transit_time, dominant_direction, confidence
      FROM corridor_statistics
      ORDER BY traversal_count DESC
      LIMIT 10
    `).all() as any[];

    const anomalies = db.prepare(`
      SELECT id, camera_id, anomaly_type, severity, score, reason, timestamp
      FROM movement_anomalies
      ${cameraId ? 'WHERE camera_id = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(...(cameraId ? [cameraId] : [])) as any[];

    const totalOccupants = occupancyRows.reduce((sum, r) => sum + (r.current_occupants || 0), 0);

    const summary = {
      camera_id: cameraId || 'ALL',
      total_entries: entriesRow.count,
      total_exits: exitsRow.count,
      current_occupants: totalOccupants,
      zones_monitored: occupancyRows.length,
      active_zones: occupancyRows.map((r) => ({
        ...r,
        class_breakdown: typeof r.class_breakdown === 'string' ? JSON.parse(r.class_breakdown || '{}') : r.class_breakdown,
      })),
      top_corridors: corridors,
      recent_anomalies: anomalies,
    };

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/movement - Query recent movement events
// ============================================================================
analyticsRouter.get('/movement', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera_id, zone_id, class_name, event_type, limit = '50' } = req.query;

    let query = 'SELECT * FROM movement_events WHERE 1=1';
    const params: any[] = [];

    if (camera_id) {
      query += ' AND camera_id = ?';
      params.push(camera_id);
    }
    if (zone_id) {
      query += ' AND zone_id = ?';
      params.push(zone_id);
    }
    if (class_name) {
      query += ' AND class_name = ?';
      params.push(class_name);
    }
    if (event_type) {
      query += ' AND event_type = ?';
      params.push(event_type);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Math.min(parseInt(limit as string, 10) || 50, 200));

    const rows = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/occupancy - Current zone occupancy across cameras
// ============================================================================
analyticsRouter.get('/occupancy', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera_id } = req.query;

    let query = 'SELECT * FROM zone_occupancy';
    const params: any[] = [];

    if (camera_id) {
      query += ' WHERE camera_id = ?';
      params.push(camera_id);
    }

    query += ' ORDER BY current_occupants DESC';
    const rows = db.prepare(query).all(...params) as any[];

    const formatted = rows.map((r) => ({
      ...r,
      is_occupied: Boolean(r.is_occupied),
      class_breakdown: typeof r.class_breakdown === 'string' ? JSON.parse(r.class_breakdown || '{}') : r.class_breakdown,
    }));

    res.json({
      success: true,
      data: formatted,
      count: formatted.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/directions - Directional distribution
// ============================================================================
analyticsRouter.get('/directions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera_id } = req.query;

    let query = `
      SELECT direction, COUNT(*) as count
      FROM movement_events
      WHERE direction != 'UNKNOWN' AND direction != 'STATIONARY'
    `;
    const params: any[] = [];

    if (camera_id) {
      query += ' AND camera_id = ?';
      params.push(camera_id);
    }

    query += ' GROUP BY direction ORDER BY count DESC';
    const rows = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/anomalies - List detected movement anomalies
// ============================================================================
analyticsRouter.get('/anomalies', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera_id, severity, limit = '50' } = req.query;

    let query = 'SELECT * FROM movement_anomalies WHERE 1=1';
    const params: any[] = [];

    if (camera_id) {
      query += ' AND camera_id = ?';
      params.push(camera_id);
    }
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Math.min(parseInt(limit as string, 10) || 50, 200));

    const rows = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/corridors - List multi-camera corridor flows
// ============================================================================
analyticsRouter.get('/corridors', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM corridor_statistics
      ORDER BY traversal_count DESC
    `).all() as any[];

    const formatted = rows.map((r) => ({
      ...r,
      classes_observed: typeof r.classes_observed === 'string' ? JSON.parse(r.classes_observed || '[]') : r.classes_observed,
    }));

    res.json({
      success: true,
      data: formatted,
      count: formatted.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/cameras/:camera_id - Camera specific analytics
// ============================================================================
analyticsRouter.get('/cameras/:camera_id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera_id } = req.params;

    const entries = db.prepare('SELECT COUNT(*) as count FROM movement_events WHERE camera_id = ? AND event_type = ?').get(camera_id, 'ENTRY') as any;
    const exits = db.prepare('SELECT COUNT(*) as count FROM movement_events WHERE camera_id = ? AND event_type = ?').get(camera_id, 'EXIT') as any;
    const occupancy = db.prepare('SELECT * FROM zone_occupancy WHERE camera_id = ?').all(camera_id);
    const anomalies = db.prepare('SELECT * FROM movement_anomalies WHERE camera_id = ? ORDER BY timestamp DESC LIMIT 5').all(camera_id);

    res.json({
      success: true,
      data: {
        camera_id,
        total_entries: entries?.count || 0,
        total_exits: exits?.count || 0,
        zones: occupancy,
        recent_anomalies: anomalies,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/analytics/zones/:zone_id - Zone specific analytics
// ============================================================================
analyticsRouter.get('/zones/:zone_id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { zone_id } = req.params;

    const zone = db.prepare('SELECT * FROM zone_occupancy WHERE zone_id = ?').get(zone_id) as any;
    const entries = db.prepare('SELECT COUNT(*) as count FROM movement_events WHERE zone_id = ? AND event_type = ?').get(zone_id, 'ENTRY') as any;
    const exits = db.prepare('SELECT COUNT(*) as count FROM movement_events WHERE zone_id = ? AND event_type = ?').get(zone_id, 'EXIT') as any;

    res.json({
      success: true,
      data: {
        zone_id,
        occupancy: zone || null,
        total_entries: entries?.count || 0,
        total_exits: exits?.count || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /api/analytics/events - Ingest movement event from CV service
// ============================================================================
analyticsRouter.post('/events', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const {
      id,
      camera_id,
      zone_id,
      zone_name,
      track_id,
      class_name,
      event_type,
      direction = 'UNKNOWN',
      speed = 0.0,
      timestamp = Date.now() / 1000.0,
    } = req.body;

    if (!camera_id || !zone_id || track_id === undefined || !event_type) {
      res.status(400).json({ success: false, error: 'Missing required event fields' });
      return;
    }

    const eventId = id || `mve-${Date.now()}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO movement_events (
        id, camera_id, zone_id, zone_name, track_id, class_name, event_type, direction, speed, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      camera_id,
      zone_id,
      zone_name || zone_id,
      track_id,
      class_name || 'person',
      event_type,
      direction,
      speed,
      timestamp,
      nowIso
    );

    const eventData = {
      id: eventId,
      camera_id,
      zone_id,
      zone_name,
      track_id,
      class_name,
      event_type,
      direction,
      speed,
      timestamp,
    };

    // Broadcast over WebSocket
    broadcastWebSocketMessage('movement_update', eventData);

    res.status(201).json({
      success: true,
      data: eventData,
      timestamp: nowIso,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /api/analytics/occupancy - Update zone occupancy state
// ============================================================================
analyticsRouter.post('/occupancy', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const {
      zone_id,
      camera_id,
      zone_name,
      current_occupants = 0,
      peak_occupants = 0,
      average_occupants = 0.0,
      class_breakdown = {},
      total_occupied_seconds = 0.0,
    } = req.body;

    if (!zone_id || !camera_id) {
      res.status(400).json({ success: false, error: 'Missing zone_id or camera_id' });
      return;
    }

    const nowIso = new Date().toISOString();
    const breakdownJson = typeof class_breakdown === 'string' ? class_breakdown : JSON.stringify(class_breakdown);
    const isOccupied = current_occupants > 0 ? 1 : 0;

    db.prepare(`
      INSERT OR REPLACE INTO zone_occupancy (
        zone_id, camera_id, zone_name, current_occupants, peak_occupants,
        average_occupants, class_breakdown, is_occupied, total_occupied_seconds, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      zone_id,
      camera_id,
      zone_name || zone_id,
      current_occupants,
      peak_occupants,
      average_occupants,
      breakdownJson,
      isOccupied,
      total_occupied_seconds,
      nowIso
    );

    const payload = {
      zone_id,
      camera_id,
      zone_name: zone_name || zone_id,
      current_occupants,
      peak_occupants,
      average_occupants,
      class_breakdown,
      is_occupied: Boolean(isOccupied),
      total_occupied_seconds,
      updated_at: nowIso,
    };

    broadcastWebSocketMessage('occupancy_update', payload);

    res.json({
      success: true,
      data: payload,
      timestamp: nowIso,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /api/analytics/anomalies - Ingest movement anomaly
// ============================================================================
analyticsRouter.post('/anomalies', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const {
      id,
      camera_id,
      zone_id,
      anomaly_type,
      severity = 'HIGH',
      score = 75,
      reason,
      observed_value = 0.0,
      baseline_value = 0.0,
      deviation_ratio = 1.0,
      timestamp = Date.now() / 1000.0,
    } = req.body;

    if (!camera_id || !anomaly_type || !reason) {
      res.status(400).json({ success: false, error: 'Missing required anomaly parameters' });
      return;
    }

    const anomalyId = id || `anom-${Date.now()}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO movement_anomalies (
        id, camera_id, zone_id, anomaly_type, severity, score, reason,
        observed_value, baseline_value, deviation_ratio, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      anomalyId,
      camera_id,
      zone_id || null,
      anomaly_type,
      severity,
      score,
      reason,
      observed_value,
      baseline_value,
      deviation_ratio,
      timestamp,
      nowIso
    );

    const payload = {
      id: anomalyId,
      camera_id,
      zone_id,
      anomaly_type,
      severity,
      score,
      reason,
      observed_value,
      baseline_value,
      deviation_ratio,
      timestamp,
    };

    broadcastWebSocketMessage('analytics_anomaly', payload);

    res.status(201).json({
      success: true,
      data: payload,
      timestamp: nowIso,
    });
  } catch (err) {
    next(err);
  }
});
