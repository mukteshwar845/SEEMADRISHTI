import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage, WebSocketMessageType } from '../types/api';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initializeWebSocketServer(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const url = req.url || '/ws';
    // Accept connections on /ws as primary, and /ws/alerts as compatibility alias
    if (!url.startsWith('/ws')) {
      ws.close(1008, 'Invalid WebSocket path');
      return;
    }

    clients.add(ws);

    // Send connection acknowledgement
    const ackMessage: WebSocketMessage = {
      type: 'connection_ack',
      data: {
        message: 'SEEMADRISHTI AI WebSocket Gateway Connected',
        service: 'seemadrishti-backend',
        clientPath: url,
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
        } else if (msg.type === 'detection') {
          // Fan out real YOLO detection payload to all connected clients (React dashboards)
          broadcastWebSocketMessage('detection', msg.data);
        } else if (msg.type === 'camera_status' || msg.type === 'event_created' || msg.type === 'alert_created') {
          broadcastWebSocketMessage(msg.type, msg.data);
        }
      } catch {
        // ignore malformed client packets
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
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
