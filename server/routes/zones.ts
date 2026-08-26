import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { ZoneEntity } from '../types/api';

export const zonesRouter = Router();

// Helper to format Zone entity (parse polygon JSON string to object)
function formatZone(z: any) {
  let parsedPolygon = [];
  try {
    parsedPolygon = JSON.parse(z.polygon);
  } catch {
    parsedPolygon = [];
  }
  return {
    ...z,
    enabled: Boolean(z.enabled),
    polygon: parsedPolygon,
  };
}

// GET /api/zones - List zones (supports ?camera_id= filter)
zonesRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { camera_id } = req.query;

    let query = 'SELECT * FROM zones';
    const params: any[] = [];

    if (camera_id && typeof camera_id === 'string') {
      query += ' WHERE camera_id = ?';
      params.push(camera_id);
    }

    query += ' ORDER BY created_at ASC';

    const rawZones = db.prepare(query).all(...params);
    const zones = rawZones.map(formatZone);

    res.json({
      success: true,
      data: zones,
      count: zones.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/zones/:id - Get zone by ID
zonesRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const raw = db.prepare('SELECT * FROM zones WHERE id = ?').get(id);
    if (!raw) {
      throw new AppError(`Zone with id '${id}' not found`, 404);
    }

    res.json({
      success: true,
      data: formatZone(raw),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/zones - Create zone
zonesRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id, camera_id, name, polygon, enabled } = req.body;

    if (!camera_id || typeof camera_id !== 'string') {
      throw new AppError('camera_id is required', 400);
    }

    // Verify camera exists
    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(camera_id);
    if (!cam) {
      throw new AppError(`Cannot create zone: camera '${camera_id}' does not exist`, 400);
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new AppError('Zone name is required', 400);
    }

    if (!Array.isArray(polygon) || polygon.length < 2) {
      throw new AppError('Zone polygon must be an array of at least 2 coordinate points [x, y]', 400);
    }

    // Validate that each point is a 2-element array of numbers
    for (let i = 0; i < polygon.length; i++) {
      const pt = polygon[i];
      if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
        throw new AppError(`Invalid coordinate at index ${i}: must be [number, number]`, 400);
      }
    }

    const zoneId = id && typeof id === 'string' && id.trim() !== '' ? id.trim() : `zone-${Date.now()}`;
    const isEnabled = enabled === false ? 0 : 1;
    const now = new Date().toISOString();
    const polygonJson = JSON.stringify(polygon);

    const insert = db.prepare(`
      INSERT INTO zones (id, camera_id, name, polygon, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(zoneId, camera_id, name.trim(), polygonJson, isEnabled, now, now);

    const created = db.prepare('SELECT * FROM zones WHERE id = ?').get(zoneId);

    res.status(201).json({
      success: true,
      data: formatZone(created),
      message: 'Zone created successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/zones/:id - Update zone
zonesRouter.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM zones WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new AppError(`Zone with id '${id}' not found`, 404);
    }

    const { name, polygon, enabled } = req.body;

    let updatedPolygonJson = existing.polygon;
    if (polygon !== undefined) {
      if (!Array.isArray(polygon) || polygon.length < 2) {
        throw new AppError('Zone polygon must be an array of at least 2 coordinate points [x, y]', 400);
      }
      for (let i = 0; i < polygon.length; i++) {
        const pt = polygon[i];
        if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
          throw new AppError(`Invalid coordinate at index ${i}: must be [number, number]`, 400);
        }
      }
      updatedPolygonJson = JSON.stringify(polygon);
    }

    const updatedName = name !== undefined ? String(name).trim() : existing.name;
    const updatedEnabled = enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled;
    const now = new Date().toISOString();

    const update = db.prepare(`
      UPDATE zones
      SET name = ?, polygon = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `);

    update.run(updatedName, updatedPolygonJson, updatedEnabled, now, id);

    const updated = db.prepare('SELECT * FROM zones WHERE id = ?').get(id);

    res.json({
      success: true,
      data: formatZone(updated),
      message: 'Zone updated successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/zones/:id - Delete zone
zonesRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM zones WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(`Zone with id '${id}' not found`, 404);
    }

    db.prepare('DELETE FROM zones WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `Zone '${id}' deleted successfully`,
      deletedId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
