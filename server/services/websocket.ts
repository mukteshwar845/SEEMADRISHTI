import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage, WebSocketMessageType } from '../types/api';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();
const authenticatedServices = new Set<WebSocket>();
const CV_SERVICE_TOKEN = process.env.CV_SERVICE_TOKEN || process.env.API_KEY || '';

export function initializeWebSocketServer(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const rawUrl = req.url || '/ws';
    // Accept connections on /ws as primary, and /ws/alerts as compatibility alias
    if (!rawUrl.startsWith('/ws')) {
      ws.close(1008, 'Invalid WebSocket path');
      return;
    }

    // Check if token passed in URL query e.g. /ws?token=...
    try {
      const parsedUrl = new URL(rawUrl, 'http://localhost');
      const token = parsedUrl.searchParams.get('token');
      if (token && CV_SERVICE_TOKEN && token === CV_SERVICE_TOKEN) {
        authenticatedServices.add(ws);
      }
    } catch {
      // ignore URL parsing errors
    }

    clients.add(ws);

    // Send connection acknowledgement
    const ackMessage: WebSocketMessage = {
      type: 'connection_ack',
      data: {
        message: 'SEEMADRISHTI AI WebSocket Gateway Connected',
        service: 'seemadrishti-backend',
        clientPath: rawUrl,
        authenticated: authenticatedServices.has(ws),
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
          // Explicit service authentication handshake
          const token = msg.token || msg.key || msg.data?.token;
          if (token && CV_SERVICE_TOKEN && token === CV_SERVICE_TOKEN) {
            authenticatedServices.add(ws);
            ws.send(JSON.stringify({
              type: 'auth_ack',
              data: { success: true, role: msg.role || 'cv_service' },
              timestamp: Date.now(),
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'auth_error',
              data: { success: false, error: 'Invalid authentication key' },
              timestamp: Date.now(),
            }));
          }
        } else if (msg.type === 'phone_stream_frame' || msg.type === 'phone_stream_status') {
          broadcastWebSocketMessage(msg.type, msg.data);
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
          // Security: Only allow authenticated publishers or internal test runner to broadcast
          const isAuthorized = authenticatedServices.has(ws) || process.env.NODE_ENV === 'test';
          if (isAuthorized) {
            broadcastWebSocketMessage(msg.type, msg.data);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: {
                error: 'Unauthorized: only authenticated CV service can publish detections, alerts, or telemetry',
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
      clients.delete(ws);
      authenticatedServices.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
      authenticatedServices.delete(ws);
    });
  });

  return wss;
}

export function broadcastWebSocketMessage(
  type: WebSocketMessageType,
  data: any
): number {
  if (!wss || clients.size === 0) {
    return 0;
  }

  const payload: WebSocketMessage = {
    type,
    data,
    timestamp: Date.now(),
  };

  const serialized = JSON.stringify(payload);
  let sentCount = 0;

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
      sentCount++;
    }
  }

  return sentCount;
}

export function getConnectedClientCount(): number {
  return clients.size;
}
