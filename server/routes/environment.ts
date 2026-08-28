import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { ApiResponse, EnvironmentStateEntity, UpdateEnvironmentDTO } from '../types/api';
import { broadcastWebSocketMessage } from '../services/websocket';

export const environmentRouter = Router();

// ============================================================================
// GET /api/environment - List latest environmental state across all cameras
// ============================================================================
environmentRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        camera_id,
        mode,
        brightness,
        contrast,
        visibility_score,
        low_light,
        confidence,
        adaptive_skip,
        enhancement_enabled,
        updated_at
      FROM environment_states
      ORDER BY updated_at DESC
    `).all() as any[];

    const formatted = rows.map((r) => ({
      ...r,
      low_light: Boolean(r.low_light),
      enhancement_enabled: Boolean(r.enhancement_enabled),
    }));

    const response: ApiResponse<typeof formatted> = {
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /api/environment/:camera_id - Get environment state for specific camera
// ============================================================================
environmentRouter.get('/:camera_id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { camera_id } = req.params;
    const db = getDatabase();

    const row = db.prepare(`
      SELECT 
        camera_id,
        mode,
        brightness,
        contrast,
        visibility_score,
        low_light,
        confidence,
        adaptive_skip,
        enhancement_enabled,
        updated_at
      FROM environment_states
      WHERE camera_id = ?
    `).get(camera_id) as any;

    if (!row) {
      const response: ApiResponse = {
        success: false,
        error: `No environment state recorded for camera '${camera_id}'`,
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    const formatted = {
      ...row,
      low_light: Boolean(row.low_light),
      enhancement_enabled: Boolean(row.enhancement_enabled),
    };

    const response: ApiResponse<typeof formatted> = {
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /api/environment - Upsert camera environment state & broadcast
// ============================================================================
environmentRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = req.body as UpdateEnvironmentDTO;

    if (!dto.camera_id || !dto.mode || dto.brightness === undefined) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: camera_id, mode, brightness',
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const lowLightInt = dto.low_light ? 1 : 0;
    const enhanceInt = dto.enhancement_enabled ? 1 : 0;
    const conf = dto.confidence !== undefined ? dto.confidence : 1.0;
    const skip = dto.adaptive_skip !== undefined ? dto.adaptive_skip : 2;

    const stmt = db.prepare(`
      INSERT INTO environment_states (
        camera_id,
        mode,
        brightness,
        contrast,
        visibility_score,
        low_light,
        confidence,
        adaptive_skip,
        enhancement_enabled,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(camera_id) DO UPDATE SET
        mode = excluded.mode,
        brightness = excluded.brightness,
        contrast = excluded.contrast,
        visibility_score = excluded.visibility_score,
        low_light = excluded.low_light,
        confidence = excluded.confidence,
        adaptive_skip = excluded.adaptive_skip,
        enhancement_enabled = excluded.enhancement_enabled,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      dto.camera_id,
      dto.mode,
      dto.brightness,
      dto.contrast,
      dto.visibility_score,
      lowLightInt,
      conf,
      skip,
      enhanceInt,
      now
    );

    const resultPayload = {
      camera_id: dto.camera_id,
      mode: dto.mode,
      brightness: dto.brightness,
      contrast: dto.contrast,
      visibility_score: dto.visibility_score,
      low_light: Boolean(lowLightInt),
      confidence: conf,
      adaptive_skip: skip,
      enhancement_enabled: Boolean(enhanceInt),
      updated_at: now,
    };

    // Broadcast over WebSocket
    broadcastWebSocketMessage('environment_update', resultPayload);

    const response: ApiResponse<typeof resultPayload> = {
      success: true,
      data: resultPayload,
      timestamp: now,
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});
