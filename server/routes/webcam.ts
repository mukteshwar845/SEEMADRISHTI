/**
 * SEEMADRISHTI AI — Browser Webcam Ingestion & Live CV Inference Route
 *
 * Exposes endpoints for:
 * 1. POST /api/webcam/frame: Authenticated frame ingestion from browser getUserMedia()
 * 2. GET /api/webcam/status: Health and operational status of the Python CV processor
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { dispatchWebcamFrame, checkCvHealth } from '../services/cvProcessManager';

export const webcamRouter = Router();

// GET /api/webcam/status - Health status of edge Python CV processor
webcamRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isOnline = await checkCvHealth();
    res.json({
      success: true,
      cv_processor_online: isOnline,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      model: 'yolov8n.pt',
      tracker: 'bytetrack',
      message: isOnline
        ? 'Python CV YOLOv8 + ByteTrack processor is active'
        : 'Python CV processor offline. Start via cv_service/tools/webcam_processor.py',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/webcam/frame - Authenticated frame ingestion from browser webcam
webcamRouter.post('/frame', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { camera_id = 'cam-01', frame, frame_base64, timestamp } = req.body;
    const rawFrame = frame || frame_base64;

    if (!rawFrame || typeof rawFrame !== 'string') {
      throw new AppError('Frame data (base64 JPEG/WebP string) is required', 400);
    }

    if (rawFrame.length > 5 * 1024 * 1024) {
      throw new AppError('Oversized frame payload: maximum allowed size is 5MB', 413);
    }

    const cleanCamId = String(camera_id).trim().toLowerCase();
    const result = await dispatchWebcamFrame(cleanCamId, rawFrame, timestamp);

    if (!result) {
      return res.status(503).json({
        success: false,
        status: 'CV_PROCESSOR_OFFLINE',
        camera_id: cleanCamId,
        error: 'Python CV processor offline or overloaded. No detections generated.',
        source_type: 'browser_webcam',
        processing_mode: 'live_cv',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      status: 'PROCESSED',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});
