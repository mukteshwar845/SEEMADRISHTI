import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastWebSocketMessage } from '../services/websocket';
import { CameraEntity, CameraSourceType, CameraStatus } from '../types/api';

export const camerasRouter = Router();

const VALID_SOURCE_TYPES: CameraSourceType[] = ['mp4', 'webcam', 'rtsp'];
const VALID_STATUSES: CameraStatus[] = ['Online', 'Degraded', 'Offline', 'Standby'];

// GET /api/cameras - List cameras (optional ?status= filter)
camerasRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { status } = req.query;

    let query = 'SELECT * FROM cameras';
    const params: any[] = [];

    if (status && typeof status === 'string') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at ASC';

    const cameras = db.prepare(query).all(...params) as unknown as CameraEntity[];
    res.json({
      success: true,
      data: cameras,
      count: cameras.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cameras/:id - Get single camera by ID
camerasRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as unknown as CameraEntity | undefined;

    if (!camera) {
      throw new AppError(`Camera with id '${id}' not found`, 404);
    }

    res.json({
      success: true,
      data: camera,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cameras - Create new camera
camerasRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id, name, location, source_type, source_url, status } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new AppError('Camera name is required and must be non-empty', 400);
    }

    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new AppError('Camera location is required and must be non-empty', 400);
    }

    if (!source_type || !VALID_SOURCE_TYPES.includes(source_type)) {
      throw new AppError(
        `Invalid source_type '${source_type}'. Allowed types: ${VALID_SOURCE_TYPES.join(', ')}`,
        400
      );
    }

    if (!source_url || typeof source_url !== 'string' || source_url.trim() === '') {
      throw new AppError('Camera source_url is required', 400);
    }

    const cameraStatus: CameraStatus = status && VALID_STATUSES.includes(status) ? status : 'Online';
    const cameraId = id && typeof id === 'string' && id.trim() !== '' ? id.trim() : `cam-${Date.now()}`;
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO cameras (id, name, location, source_type, source_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(cameraId, name.trim(), location.trim(), source_type, source_url.trim(), cameraStatus, now, now);

    const createdCamera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId) as unknown as CameraEntity;

    // Broadcast status over WebSocket
    broadcastWebSocketMessage('camera_status', {
      cameraId,
      status: cameraStatus,
      action: 'created',
      camera: createdCamera,
    });

    res.status(201).json({
      success: true,
      data: createdCamera,
      message: 'Camera created successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cameras/:id - Update existing camera
camerasRouter.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as unknown as CameraEntity | undefined;
    if (!existing) {
      throw new AppError(`Camera with id '${id}' not found`, 404);
    }

    const { name, location, source_type, source_url, status } = req.body;

    if (source_type && !VALID_SOURCE_TYPES.includes(source_type)) {
      throw new AppError(
        `Invalid source_type '${source_type}'. Allowed types: ${VALID_SOURCE_TYPES.join(', ')}`,
        400
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      throw new AppError(
        `Invalid status '${status}'. Allowed statuses: ${VALID_STATUSES.join(', ')}`,
        400
      );
    }

    const updatedName = name !== undefined ? String(name).trim() : existing.name;
    const updatedLocation = location !== undefined ? String(location).trim() : existing.location;
    const updatedSourceType = source_type || existing.source_type;
    const updatedSourceUrl = source_url !== undefined ? String(source_url).trim() : existing.source_url;
    const updatedStatus = status || existing.status;
    const now = new Date().toISOString();

    const update = db.prepare(`
      UPDATE cameras
      SET name = ?, location = ?, source_type = ?, source_url = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);

    update.run(updatedName, updatedLocation, updatedSourceType, updatedSourceUrl, updatedStatus, now, id);

    const updatedCamera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as unknown as CameraEntity;

    broadcastWebSocketMessage('camera_status', {
      cameraId: id,
      status: updatedStatus,
      action: 'updated',
      camera: updatedCamera,
    });

    res.json({
      success: true,
      data: updatedCamera,
      message: 'Camera updated successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cameras/:id - Delete camera (cascades to zones and events)
camerasRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as unknown as CameraEntity | undefined;
    if (!existing) {
      throw new AppError(`Camera with id '${id}' not found`, 404);
    }

    db.prepare('DELETE FROM cameras WHERE id = ?').run(id);

    broadcastWebSocketMessage('camera_status', {
      cameraId: id,
      status: 'Offline',
      action: 'deleted',
    });

    res.json({
      success: true,
      message: `Camera '${id}' and associated zones/events deleted successfully`,
      deletedId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
