import { Router, Request, Response, NextFunction } from 'express';
import os from 'os';
import { sensorPairingManager } from '../services/sensorPairingManager';
import { AppError } from '../middleware/errorHandler';

export const sensorsRouter = Router();

// Helper to determine primary LAN IP for mobile device pairing
function getNetworkInfo(req: Request) {
  const nets = os.networkInterfaces();
  let primaryIp = '127.0.0.1';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        if (primaryIp === '127.0.0.1') {
          primaryIp = net.address;
        }
      }
    }
  }

  // If host header provided from non-localhost, prefer it
  const hostHeader = req.get('host');
  let host = primaryIp;
  let port = process.env.PORT || 3000;

  if (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1')) {
    const parts = hostHeader.split(':');
    host = parts[0];
    if (parts[1]) port = parts[1];
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const protocol = isHttps ? 'https' : 'http';
  const wsProtocol = isHttps ? 'wss' : 'ws';

  return { host, port, protocol, wsProtocol };
}

/**
 * POST /api/sensors/pairing
 * Generate a new cryptographically secure pairing session for a camera
 */
sensorsRouter.post('/pairing', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { camera_id, ttl_seconds } = req.body;
    if (!camera_id || typeof camera_id !== 'string') {
      throw new AppError('camera_id is required', 400);
    }

    const { host, port, protocol, wsProtocol } = getNetworkInfo(req);
    const transport = wsProtocol === 'wss' ? 'WSS' : 'WS';

    const session = sensorPairingManager.createPairingSession(
      camera_id,
      req.user?.id,
      transport,
      ttl_seconds ? Number(ttl_seconds) : 300
    );

    // Honest pairing URL structure
    const portSuffix = (protocol === 'http' && port == 80) || (protocol === 'https' && port == 443) ? '' : `:${port}`;
    const directUrl = `${protocol}://${host}${portSuffix}/mobile-cam.html?pairing_id=${session.pairing_id}&token=${session.token}&cam=${session.camera_id}`;
    
    // Structured QR payload with exact parameters required by mobile client
    const qrPayload = JSON.stringify({
      app: 'seemadrishti',
      type: 'sensor_pairing',
      pairing_id: session.pairing_id,
      token: session.token,
      camera_id: session.camera_id,
      endpoint: `${protocol}://${host}${portSuffix}`,
      ws_endpoint: `${wsProtocol}://${host}${portSuffix}/ws`,
      expires_at: session.expires_at,
    });

    res.status(201).json({
      success: true,
      data: {
        pairing_id: session.pairing_id,
        camera_id: session.camera_id,
        token: session.token,
        expires_at: session.expires_at,
        created_at: session.created_at,
        transport: session.transport,
        direct_url: directUrl,
        qr_payload: qrPayload,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sensors/pairing/:id
 * Query status of an active or pending pairing session
 */
sensorsRouter.get('/pairing/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = sensorPairingManager.getPairingSession(id);

    if (!session) {
      throw new AppError('Pairing session not found', 404);
    }

    res.json({
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sensors/pairing/:id/cancel
 * Cancel an unconsumed pairing session on modal close
 */
sensorsRouter.post('/pairing/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const cancelled = sensorPairingManager.cancelPairingSession(id);

    res.json({
      success: true,
      data: { cancelled },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sensors/pair
 * PUBLIC: Redeem short-lived pairing token and receive publisher session token
 */
sensorsRouter.post('/pair', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pairing_id, token, device_name, platform } = req.body;

    if (!pairing_id || !token) {
      throw new AppError('Both pairing_id and token are strictly required to pair a tactical sensor', 400);
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = sensorPairingManager.validateAndConsumePairing(
      pairing_id,
      token,
      clientIp,
      { device_name, platform, user_agent: userAgent }
    );

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }

    const { host, port, wsProtocol } = getNetworkInfo(req);
    const portSuffix = port ? `:${port}` : '';
    const wsUrl = `${wsProtocol}://${host}${portSuffix}/ws?token=${result.session_token}`;

    res.status(200).json({
      success: true,
      data: {
        session_token: result.session_token,
        camera_id: result.camera_id,
        sensor_id: result.sensor_id,
        transport: result.transport,
        ws_url: wsUrl,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sensors/heartbeat
 * Record sensor heartbeat to maintain active connection status
 */
sensorsRouter.post('/heartbeat', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sensor_id, camera_id } = req.body;
    if (!sensor_id) {
      throw new AppError('sensor_id is required for heartbeat', 400);
    }

    const recorded = sensorPairingManager.recordHeartbeat(sensor_id, camera_id);

    res.json({
      success: recorded,
      data: {
        sensor_id,
        camera_id,
        recorded,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sensors/status/:cameraId
 * Get live runtime sensor connection status for a camera
 */
sensorsRouter.get('/status/:cameraId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cameraId } = req.params;
    const status = sensorPairingManager.getCameraSensorStatus(cameraId);

    res.json({
      success: true,
      data: {
        camera_id: cameraId.toLowerCase(),
        ...status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sensors/test-rtsp
 * Real verification test for RTSP / IP camera feed endpoints
 */
sensorsRouter.post('/test-rtsp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      throw new AppError('RTSP/HTTP stream URL is required', 400);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Malformed stream URL: must include valid protocol (rtsp:// or http://) and host',
        timestamp: new Date().toISOString(),
      });
    }

    if (parsedUrl.protocol !== 'rtsp:' && parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({
        success: false,
        error: `Unsupported stream protocol '${parsedUrl.protocol}'. Supported: rtsp://, http://, https://`,
        timestamp: new Date().toISOString(),
      });
    }

    // For HTTP/HTTPS streams, test reachability
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const probeRes = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);

        return res.json({
          success: true,
          data: {
            url,
            protocol: parsedUrl.protocol,
            reachable: probeRes.ok,
            status_code: probeRes.status,
            status_text: probeRes.statusText,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (probeErr: any) {
        return res.json({
          success: false,
          error: `Stream endpoint unreachable: ${probeErr.message || 'Connection refused or timeout'}`,
          data: { reachable: false },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // For RTSP: validate host and port
    const port = parsedUrl.port || '554';
    return res.json({
      success: true,
      data: {
        url,
        protocol: 'rtsp',
        host: parsedUrl.hostname,
        port: Number(port),
        message: 'RTSP URL syntax verified. Requires native CV worker ingestion pipeline.',
        command: `python cv_service/main.py --source "${url}"`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
