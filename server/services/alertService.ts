import { getDatabase } from '../db/database';
import { AlertEntity, CreateAlertDTO } from '../types';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from './websocket';

export class AlertService {
  public static getAll(filters: { limit?: number; offset?: number; camera_id?: string; severity?: string; acknowledged?: boolean }) {
    const db = getDatabase();
    const limit = Math.min(filters.limit || 50, 200);
    const offset = filters.offset || 0;

    let query = 'SELECT * FROM alerts WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM alerts WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (filters.camera_id) {
      query += ' AND camera_id = ?';
      countQuery += ' AND camera_id = ?';
      params.push(filters.camera_id);
      countParams.push(filters.camera_id);
    }

    if (filters.severity) {
      query += ' AND severity = ?';
      countQuery += ' AND severity = ?';
      params.push(filters.severity);
      countParams.push(filters.severity);
    }

    if (filters.acknowledged !== undefined) {
      const ackVal = filters.acknowledged ? 1 : 0;
      query += ' AND acknowledged = ?';
      countQuery += ' AND acknowledged = ?';
      params.push(ackVal);
      countParams.push(ackVal);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const totalRow = db.prepare(countQuery).get(...countParams) as { total: number };
    const rows = db.prepare(query).all(...params) as unknown as AlertEntity[];

    return {
      alerts: rows.map((a) => ({ ...a, acknowledged: Boolean(a.acknowledged) })),
      total: totalRow.total,
      limit,
      offset,
    };
  }

  public static getById(id: string) {
    const db = getDatabase();
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as unknown as AlertEntity | undefined;
    if (!alert) {
      throw new AppError(`Alert not found: ${id}`, 404);
    }
    return { ...alert, acknowledged: Boolean(alert.acknowledged) };
  }

  public static create(dto: CreateAlertDTO) {
    const db = getDatabase();
    const id = dto.id || `alt-${Date.now()}`;
    const timestamp = dto.timestamp || new Date().toISOString();

    db.prepare(`
      INSERT INTO alerts (id, event_id, camera_id, severity, title, reason, acknowledged, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, dto.event_id || null, dto.camera_id, dto.severity, dto.title, dto.reason, timestamp);

    const created = this.getById(id);
    broadcastWebSocketMessage('alert_created', created);

    return created;
  }

  public static acknowledge(id: string) {
    this.getById(id);
    const db = getDatabase();
    db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);

    const updated = this.getById(id);
    broadcastWebSocketMessage('alert_updated', updated);

    return updated;
  }
}

export default AlertService;
