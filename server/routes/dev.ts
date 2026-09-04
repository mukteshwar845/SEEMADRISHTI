import { Router, Request, Response, NextFunction } from 'express';
import { broadcastWebSocketMessage } from '../services/websocket';
import { WebSocketMessageType } from '../types/api';

export const devRouter = Router();

// Security: Disable development routes completely in production
devRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Development endpoints are strictly disabled in production mode',
      timestamp: new Date().toISOString(),
    });
  }
  next();
});

// POST /api/dev/broadcast - Manually trigger a WebSocket broadcast message for testing
devRouter.post('/broadcast', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, data } = req.body || {};
    const messageType: WebSocketMessageType = type || 'broadcast_test';
    const payload = data !== undefined ? data : { message: 'Manual test message dispatched from dev endpoint' };

    const sentCount = broadcastWebSocketMessage(messageType, payload);

    res.json({
      success: true,
      message: `Dispatched '${messageType}' event to ${sentCount} connected client(s)`,
      sentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
