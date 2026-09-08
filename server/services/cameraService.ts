import { getDatabase } from '../db/database';
import { CameraEntity, CreateCameraDTO, UpdateCameraDTO } from '../types';
import { AppError } from '../middleware/errorHandler';

export class CameraService {
  public static getAll(): CameraEntity[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM cameras ORDER BY id ASC').all() as unknown as CameraEntity[];
  }

  public static getById(id: string): CameraEntity {
    const db = getDatabase();
    const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as unknown as CameraEntity | undefined;
    if (!camera) {
      throw new AppError(`Camera not found: ${id}`, 404);
    }
    return camera;
  }

  public static create(dto: CreateCameraDTO): CameraEntity {
    const db = getDatabase();
    const id = dto.id || `cam-${Date.now()}`;
    const now = new Date().toISOString();
    const status = dto.status || 'Online';

    db.prepare(`
      INSERT INTO cameras (id, name, location, source_type, source_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, dto.name, dto.location, dto.source_type, dto.source_url, status, now, now);

    return this.getById(id);
  }

  public static update(id: string, dto: UpdateCameraDTO): CameraEntity {
    const existing = this.getById(id);
    const db = getDatabase();
    const now = new Date().toISOString();

    const name = dto.name !== undefined ? dto.name : existing.name;
    const location = dto.location !== undefined ? dto.location : existing.location;
    const sourceType = dto.source_type !== undefined ? dto.source_type : existing.source_type;
    const sourceUrl = dto.source_url !== undefined ? dto.source_url : existing.source_url;
    const status = dto.status !== undefined ? dto.status : existing.status;

    db.prepare(`
      UPDATE cameras
      SET name = ?, location = ?, source_type = ?, source_url = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(name, location, sourceType, sourceUrl, status, now, id);

    return this.getById(id);
  }

  public static delete(id: string): void {
    this.getById(id);
    const db = getDatabase();
    db.prepare('DELETE FROM cameras WHERE id = ?').run(id);
  }
}

export default CameraService;
