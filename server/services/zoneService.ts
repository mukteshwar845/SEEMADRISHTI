import { getDatabase } from '../db/database';
import { ZoneEntity, CreateZoneDTO, UpdateZoneDTO } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ZoneService {
  public static getAll(cameraId?: string): (Omit<ZoneEntity, 'polygon' | 'enabled'> & { polygon: [number, number][]; enabled: boolean })[] {
    const db = getDatabase();
    let rows: ZoneEntity[];
    if (cameraId) {
      rows = db.prepare('SELECT * FROM zones WHERE camera_id = ? ORDER BY created_at ASC').all(cameraId) as ZoneEntity[];
    } else {
      rows = db.prepare('SELECT * FROM zones ORDER BY created_at ASC').all() as ZoneEntity[];
    }

    return rows.map((z) => ({
      ...z,
      polygon: typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon,
      enabled: Boolean(z.enabled),
    }));
  }

  public static getById(id: string) {
    const db = getDatabase();
    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(id) as ZoneEntity | undefined;
    if (!zone) {
      throw new AppError(`Zone not found: ${id}`, 404);
    }
    return {
      ...zone,
      polygon: typeof zone.polygon === 'string' ? JSON.parse(zone.polygon) : zone.polygon,
      enabled: Boolean(zone.enabled),
    };
  }

  public static create(dto: CreateZoneDTO) {
    const db = getDatabase();
    const id = dto.id || `zone-${Date.now()}`;
    const now = new Date().toISOString();
    const enabled = dto.enabled !== false ? 1 : 0;
    const polygonJson = JSON.stringify(dto.polygon);

    db.prepare(`
      INSERT INTO zones (id, camera_id, name, polygon, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, dto.camera_id, dto.name, polygonJson, enabled, now, now);

    return this.getById(id);
  }

  public static update(id: string, dto: UpdateZoneDTO) {
    const existing = this.getById(id);
    const db = getDatabase();
    const now = new Date().toISOString();

    const name = dto.name !== undefined ? dto.name : existing.name;
    const polygonJson = dto.polygon !== undefined ? JSON.stringify(dto.polygon) : JSON.stringify(existing.polygon);
    const enabled = dto.enabled !== undefined ? (dto.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);

    db.prepare(`
      UPDATE zones
      SET name = ?, polygon = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `).run(name, polygonJson, enabled, now, id);

    return this.getById(id);
  }

  public static delete(id: string): void {
    this.getById(id);
    const db = getDatabase();
    db.prepare('DELETE FROM zones WHERE id = ?').run(id);
  }
}

export default ZoneService;
