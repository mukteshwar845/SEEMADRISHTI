import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { WebSocketMessage, WebSocketMessageType } from '../types/api';
import { getJwtSecret, getApiKey, getCvServiceToken, AuthenticatedUser } from '../middleware/auth';

let wss: WebSocketServer | null = null;
const allClients = new Set<WebSocket>();
const authenticatedSubscribers = new Set<WebSocket>();
const authenticatedPublishers = new Set<WebSocket>();

const PUBLISHER_ROLES = new Set(['service', 'cv_service', 'admin', 'commander', 'operator', 'surveillance operator']);

function verifyToken(token?: string | null): { valid: boolean; role?: string; user?: any } {
  if (!token) return { valid: false };
  const clean = token.trim();
  const apiKey = getApiKey();
  const cvToken = getCvServiceToken();
  const jwtSecret = getJwtSecret();

  // 1. M2M Service Tokens
  if (apiKey && clean === apiKey) {
    return { valid: true, role: 'service' };
  }
  if (cvToken && clean === cvToken) {
    return { valid: true, role: 'cv_service' };
  }

  // 2. Operator JWT
  try {
    const decoded = jwt.verify(clean, jwtSecret) as AuthenticatedUser;
    return { valid: true, role: decoded.role || 'Operator', user: decoded };
  } catch {
    return { valid: false };
  }
}

export function initializeWebSocketServer(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const rawUrl = req.url || '/ws';
    if (!rawUrl.startsWith('/ws')) {
      ws.close(1008, 'Invalid WebSocket path');
      return;
    }

    allClients.add(ws);

    // Evaluate token from query string (e.g. /ws?token=...)
    let isAuthed = false;
    let authRole = 'anonymous';

    try {
      const parsedUrl = new URL(rawUrl, 'http://localhost');
      const token = parsedUrl.searchParams.get('token');
      const authRes = verifyToken(token);
      if (authRes.valid) {
        isAuthed = true;
        authRole = authRes.role || 'authenticated';
        authenticatedSubscribers.add(ws);
        if (PUBLISHER_ROLES.has((authRes.role || '').toLowerCase())) {
          authenticatedPublishers.add(ws);
        }
      }
    } catch {
      // ignore URL parse error
    }

    // In non-test environment, enforce 5-second authentication handshake deadline
    let authTimeout: NodeJS.Timeout | null = null;
    if (process.env.NODE_ENV === 'production' && !isAuthed) {
      authTimeout = setTimeout(() => {
        if (!authenticatedSubscribers.has(ws)) {
          ws.send(JSON.stringify({
            type: 'auth_error',
            data: { error: 'Authentication timeout: disconnecting unverified client' },
            timestamp: Date.now(),
          }));
          ws.close(1008, 'Authentication required');
        }
      }, 5000);
    }

    // Send connection acknowledgement
    const ackMessage: WebSocketMessage = {
      type: 'connection_ack',
      data: {
        message: 'SEEMADRISHTI AI WebSocket Gateway Connected',
        service: 'seemadrishti-backend',
        clientPath: rawUrl,
        authenticated: isAuthed,
        role: authRole,
      },
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(ackMessage));

    ws.on('message', (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          const pong: WebSocketMessage = {
            type: 'pong',
            data: { receivedAt: msg.timestamp || Date.now() },
            timestamp: Date.now(),
          };
          ws.send(JSON.stringify(pong));
        } else if (msg.type === 'auth') {
          // Explicit authentication handshake
          const token = msg.token || msg.key || msg.data?.token;
          const authRes = verifyToken(token);
          if (authRes.valid) {
            if (authTimeout) clearTimeout(authTimeout);
            authenticatedSubscribers.add(ws);
            if (PUBLISHER_ROLES.has((authRes.role || '').toLowerCase())) {
              authenticatedPublishers.add(ws);
            }
            ws.send(JSON.stringify({
              type: 'auth_ack',
              data: { success: true, role: authRes.role || 'Operator' },
              timestamp: Date.now(),
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'auth_error',
              data: { success: false, error: 'Invalid or expired authentication credentials' },
              timestamp: Date.now(),
            }));
          }
        } else if (msg.type === 'phone_stream_frame' || msg.type === 'phone_stream_status') {
          // Security: Publisher authorization strictly required
          const isPublisher = authenticatedPublishers.has(ws);
          if (!isPublisher) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { error: 'Unauthorized: phone stream publishing requires authenticated publisher credentials' },
              timestamp: Date.now(),
            }));
            return;
          }

          // Validate camera ID
          const camId = msg.camera_id || msg.data?.camera_id || msg.data?.cam;
          if (!camId || typeof camId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(camId)) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { error: 'Invalid or missing camera_id for phone stream' },
              timestamp: Date.now(),
            }));
            return;
          }

          // For frame payloads: reject oversized (> 5MB) or malformed payloads
          if (msg.type === 'phone_stream_frame') {
            const frame = msg.frame || msg.data?.frame || msg.data?.image;
            if (!frame || typeof frame !== 'string') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { error: 'Malformed phone stream frame payload' },
                timestamp: Date.now(),
              }));
              return;
            }
            if (frame.length > 5 * 1024 * 1024) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { error: 'Payload too large: phone frame exceeds 5MB limit' },
                timestamp: Date.now(),
              }));
              return;
            }
          }

          broadcastWebSocketMessage(msg.type, msg.data);
        } else if (msg.type === 'browser_webcam_frame' || msg.type === 'webcam_frame') {
          const isSubscriber = authenticatedSubscribers.has(ws);
          if (isSubscriber) {
            const camId = msg.camera_id || msg.data?.camera_id || 'cam-01';
            const frameData = msg.frame || msg.frame_base64 || msg.data?.frame || msg.data?.frame_base64;
            if (frameData && typeof frameData === 'string') {
              import('./cvProcessManager').then(({ dispatchWebcamFrame }) => {
                dispatchWebcamFrame(camId, frameData, msg.timestamp || Date.now()).catch((err) => {
                  console.warn('[WebSocket] Error in dispatchWebcamFrame:', err);
                });
              }).catch(() => {});
            }
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: { error: 'Authentication required to stream webcam frames' },
              timestamp: Date.now(),
            }));
          }
        } else if (
          msg.type === 'detection' ||
          msg.type === 'tracking' ||
          msg.type === 'camera_status' ||
          msg.type === 'event_created' ||
          msg.type === 'alert_created' ||
          msg.type === 'risk_assessment' ||
          msg.type === 'incident_created' ||
          msg.type === 'evidence_ready' ||
          msg.type === 'correlation_created' ||
          msg.type === 'correlation_updated' ||
          msg.type === 'correlation_escalated' ||
          msg.type === 'environment_update' ||
          msg.type === 'night_movement' ||
          msg.type === 'movement_update' ||
          msg.type === 'occupancy_update' ||
          msg.type === 'direction_update' ||
          msg.type === 'analytics_anomaly' ||
          msg.type === 'group_movement' ||
          msg.type === 'behavior_chain_update' ||
          msg.type === 'frame_state'
        ) {
          // Security: Only allow authenticated publishers to broadcast
          const isAuthorized = authenticatedPublishers.has(ws);
          if (isAuthorized) {
            broadcastWebSocketMessage(msg.type, msg.data);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: {
                error: 'Unauthorized: only authenticated CV service or Admin can publish detections, alerts, or telemetry',
                rejectedType: msg.type,
              },
              timestamp: Date.now(),
            }));
          }
        }
      } catch {
        // ignore malformed client packets
      }
    });

    ws.on('close', () => {
      if (authTimeout) clearTimeout(authTimeout);
      allClients.delete(ws);
      authenticatedSubscribers.delete(ws);
      authenticatedPublishers.delete(ws);
    });

    ws.on('error', () => {
      if (authTimeout) clearTimeout(authTimeout);
      allClients.delete(ws);
      authenticatedSubscribers.delete(ws);
      authenticatedPublishers.delete(ws);
    });
  });

  return wss;
}

export function broadcastWebSocketMessage(
  type: WebSocketMessageType,
  data: any
): number {
  if (!wss) {
    return 0;
  }

  // Strictly broadcast sensitive telemetry to authenticated subscribers only;
  // open system announcements and test broadcasts may reach all clients
  const isOpenBroadcast = type === 'demo_reset' || (type as string) === 'broadcast_test';
  const recipients = isOpenBroadcast ? allClients : authenticatedSubscribers;
  if (recipients.size === 0) {
    return 0;
  }

  const payload: WebSocketMessage = {
    type,
    data,
    timestamp: Date.now(),
  };

  const serialized = JSON.stringify(payload);
  let sentCount = 0;

  for (const client of recipients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
      sentCount++;
    }
  }

  return sentCount;
}

export function getConnectedClientCount(): number {
  return allClients.size;
}

export function getAuthenticatedSubscriberCount(): number {
  return authenticatedSubscribers.size;
}
