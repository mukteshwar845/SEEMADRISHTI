/**
 * SEEMADRISHTI AI — Python Computer Vision Process Manager & Edge Frame Dispatcher
 *
 * Connects the Node.js Edge Gateway to the Python YOLOv8 + ByteTrack CV Processor.
 * Dispatches live browser webcam frames to Python, receives genuine detection and
 * tracking results, and broadcasts them over the WebSocket gateway to all tactical UI clients.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { broadcastWebSocketMessage } from './websocket';

const PYTHON_CV_PORT = 8088;
const PYTHON_CV_URL = `http://127.0.0.1:${PYTHON_CV_PORT}`;

let cvProcess: ChildProcess | null = null;
let isStarting = false;
let lastHealthCheckTime = 0;
let isHealthy = false;

export interface FrameProcessingResult {
  success: boolean;
  camera_id: string;
  source_type: string;
  processing_mode: string;
  frame_sequence: number;
  frame_width: number;
  frame_height: number;
  detections: any[];
  tracks: any[];
  counts: { total: number; persons: number; vehicles: number };
  events: any[];
  risk: { score: number; level: string; reasons: any[] };
  telemetry: {
    inference_time_ms: number;
    tracking_time_ms: number;
    geometry_time_ms: number;
    total_latency_ms: number;
    measured_fps: number;
  };
  timestamp: number;
}

/**
 * Check if the Python CV processor is running and responsive.
 */
export async function checkCvHealth(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheckTime < 2000 && isHealthy) {
    return true;
  }
  lastHealthCheckTime = now;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${PYTHON_CV_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      isHealthy = Boolean(data.is_ready || data.status === 'ok');
      return isHealthy;
    }
  } catch {
    isHealthy = false;
  }
  return false;
}

/**
 * Ensure the Python CV processor is running, spawning it if necessary.
 */
export async function ensureCvProcessor(): Promise<boolean> {
  if (await checkCvHealth()) {
    return true;
  }

  if (isStarting) {
    // Wait up to 3 seconds if already starting
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkCvHealth()) return true;
    }
    return false;
  }

  isStarting = true;
  try {
    const scriptPath = path.resolve(process.cwd(), 'cv_service/tools/webcam_processor.py');
    console.log(`[CV-ProcessManager] Spawning Python CV processor: ${scriptPath}...`);

    cvProcess = spawn('python', [scriptPath, '--port', String(PYTHON_CV_PORT)], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    cvProcess.stdout?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[Python-CV] ${msg}`);
    });

    cvProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('KMP_DUPLICATE_LIB_OK')) {
        console.warn(`[Python-CV:stderr] ${msg}`);
      }
    });

    cvProcess.on('exit', (code, signal) => {
      console.warn(`[CV-ProcessManager] Python CV process exited with code ${code}, signal ${signal}`);
      cvProcess = null;
      isHealthy = false;
    });

    // Wait for the server to bind and load YOLO
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 800));
      if (await checkCvHealth()) {
        console.log('[CV-ProcessManager] Python CV processor is online and healthy.');
        isStarting = false;
        return true;
      }
    }
  } catch (err) {
    console.error('[CV-ProcessManager] Failed to start Python CV processor:', err);
  } finally {
    isStarting = false;
  }

  return isHealthy;
}

/**
 * Dispatches an ingested webcam frame to the Python CV processor.
 */
export async function dispatchWebcamFrame(
  cameraId: string,
  frameBase64: string,
  timestamp?: number
): Promise<FrameProcessingResult | null> {
  const healthy = await ensureCvProcessor();
  if (!healthy) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${PYTHON_CV_URL}/process_frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        camera_id: cameraId,
        frame_base64: frameBase64,
        timestamp: timestamp || Date.now(),
        source_type: 'browser_webcam',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[CV-ProcessManager] Python CV returned status ${res.status}`);
      return null;
    }

    const result = (await res.json()) as FrameProcessingResult;

    // Broadcast live telemetry packets over WebSocket to all connected tactical dashboards
    if (result && result.success) {
      // 1. Detections
      if (result.detections) {
        broadcastWebSocketMessage('detection', {
          camera_id: result.camera_id,
          detections: result.detections,
          frame_width: result.frame_width,
          frame_height: result.frame_height,
          timestamp: result.timestamp,
          source_type: 'browser_webcam',
          processing_mode: 'live_cv',
        });
      }

      // 2. Tracking
      if (result.tracks) {
        broadcastWebSocketMessage('tracking', {
          camera_id: result.camera_id,
          tracks: result.tracks,
          counts: result.counts,
          frame_width: result.frame_width,
          frame_height: result.frame_height,
          timestamp: result.timestamp,
          source_type: 'browser_webcam',
          processing_mode: 'live_cv',
        });
      }

      // 3. Unified frame state
      broadcastWebSocketMessage('frame_state', {
        camera_id: result.camera_id,
        frame_id: result.frame_sequence,
        frame_sequence: result.frame_sequence,
        source_type: 'browser_webcam',
        processing_mode: 'live_cv',
        processing_latency_ms: result.telemetry?.total_latency_ms || 25,
        measured_fps: result.telemetry?.measured_fps || 15,
        timestamp: result.timestamp,
        tracks: result.tracks,
        counts: result.counts,
      });

      // 4. Risk Assessment
      if (result.risk) {
        broadcastWebSocketMessage('risk_assessment', {
          camera_id: result.camera_id,
          score: result.risk.score,
          level: result.risk.level,
          reasons: result.risk.reasons,
          timestamp: result.timestamp,
        });
      }

      // 5. Events / Alerts if geofence was crossed
      if (result.events && result.events.length > 0) {
        for (const ev of result.events) {
          broadcastWebSocketMessage('event_created', {
            id: ev.event_id,
            camera_id: result.camera_id,
            type: ev.event_type || 'RESTRICTED_ZONE_ENTRY',
            severity: result.risk?.level === 'CRITICAL' ? 'Critical' : 'High',
            timestamp: new Date(result.timestamp).toISOString(),
            metadata: ev,
          });
        }
      }
    }

    return result;
  } catch (err) {
    console.warn('[CV-ProcessManager] Error dispatching frame to Python CV:', err);
    return null;
  }
}

/**
 * Clean shutdown of child process if spawned.
 */
export function shutdownCvProcessor(): void {
  if (cvProcess) {
    try {
      cvProcess.kill();
    } catch {}
    cvProcess = null;
  }
}
