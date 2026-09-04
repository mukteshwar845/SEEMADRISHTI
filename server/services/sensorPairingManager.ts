import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database';
import { getJwtSecret } from '../middleware/auth';
import { broadcastWebSocketMessage } from './websocket';

export interface PairingSession {
  id: string;
  camera_id: string;
  operator_id?: string;
  status: 'PENDING' | 'PAIRED' | 'EXPIRED' | 'CANCELLED';
  sensor_id?: string;
  transport: 'WS' | 'WSS';
  created_at: string;
  expires_at: string;
  paired_at?: string;
  last_seen?: string;
  metadata?: string;
}

export interface PairingSessionResponse {
  pairing_id: string;
  token: string;
  camera_id: string;
  expires_at: string;
  created_at: string;
  transport: 'WS' | 'WSS';
}

// In-memory rate limiting map for pairing redemption attempts
const redemptionAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Active connected sensors tracking for real-time heartbeat and disconnect detection
interface ActiveSensor {
  sensor_id: string;
  camera_id: string;
  pairing_id: string;
  last_heartbeat: number;
  connected: boolean;
  transport: 'WS' | 'WSS';
}

const activeSensors = new Map<string, ActiveSensor>();

export class SensorPairingManager {
  private static instance: SensorPairingManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Background monitor for sensor heartbeat timeouts (every 3 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeatTimeouts();
      this.expirePendingSessions();
    }, 3000);
  }

  public static getInstance(): SensorPairingManager {
    if (!SensorPairingManager.instance) {
      SensorPairingManager.instance = new SensorPairingManager();
    }
    return SensorPairingManager.instance;
  }

  /**
   * Create a cryptographically secure random pairing session
   */
  public createPairingSession(
    cameraId: string,
    operatorId?: string,
    transport: 'WS' | 'WSS' = 'WS',
    ttlSeconds: number = 300
  ): PairingSessionResponse {
    const db = getDatabase();
    const normalizedCamId = cameraId.trim().toLowerCase();

    // Verify camera exists in DB
    const cameraExists = db.prepare('SELECT id FROM cameras WHERE LOWER(id) = ?').get(normalizedCamId);
    if (!cameraExists) {
      throw new Error(`Camera '${cameraId}' not found in tactical registry`);
    }

    const pairingId = crypto.randomUUID();
    // 256-bit cryptographically secure random secret
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO sensor_pairings (
        id, token_hash, camera_id, operator_id, status, transport, created_at, expires_at
      ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `);

    insertStmt.run(pairingId, tokenHash, normalizedCamId, operatorId || null, transport, createdAt, expiresAt);

    return {
      pairing_id: pairingId,
      token: rawToken,
      camera_id: normalizedCamId,
      expires_at: expiresAt,
      created_at: createdAt,
      transport,
    };
  }

  /**
   * Get public details of a pairing session by pairing ID
   */
  public getPairingSession(pairingId: string): PairingSession | null {
    const db = getDatabase();
    const session = db.prepare(`
      SELECT id, camera_id, operator_id, status, sensor_id, transport, created_at, expires_at, paired_at, last_seen, metadata
      FROM sensor_pairings WHERE id = ?
    `).get(pairingId) as unknown as PairingSession | undefined;

    if (!session) {
      return null;
    }

    // Check expiration if still pending
    if (session.status === 'PENDING' && new Date(session.expires_at).getTime() <= Date.now()) {
      db.prepare("UPDATE sensor_pairings SET status = 'EXPIRED' WHERE id = ?").run(pairingId);
      session.status = 'EXPIRED';
    }

    return session;
  }

  /**
   * Cancel an unconsumed pairing session when modal closes
   */
  public cancelPairingSession(pairingId: string): boolean {
    const db = getDatabase();
    const session = db.prepare('SELECT status FROM sensor_pairings WHERE id = ?').get(pairingId) as { status: string } | undefined;
    if (session && session.status === 'PENDING') {
      db.prepare("UPDATE sensor_pairings SET status = 'CANCELLED' WHERE id = ?").run(pairingId);
      return true;
    }
    return false;
  }

  /**
   * Validate pairing token and consume it (single use)
   */
  public validateAndConsumePairing(
    pairingId: string,
    rawToken: string,
    clientIp: string,
    sensorInfo?: { device_name?: string; platform?: string; user_agent?: string }
  ): {
    success: boolean;
    session_token?: string;
    camera_id?: string;
    sensor_id?: string;
    transport?: string;
    error?: string;
    statusCode: number;
  } {
    // 1. Rate limiting protection against brute-force attacks
    const now = Date.now();
    const ipKey = `${clientIp}:${pairingId}`;
    const attempt = redemptionAttempts.get(ipKey);

    if (attempt) {
      if (now - attempt.firstAttempt < RATE_LIMIT_WINDOW_MS) {
        if (attempt.count >= MAX_ATTEMPTS) {
          return {
            success: false,
            error: 'Rate limit exceeded: too many pairing attempts. Please generate a new pairing request.',
            statusCode: 429,
          };
        }
        attempt.count++;
      } else {
        redemptionAttempts.set(ipKey, { count: 1, firstAttempt: now });
      }
    } else {
      redemptionAttempts.set(ipKey, { count: 1, firstAttempt: now });
    }

    // 2. Fetch session from database
    const db = getDatabase();
    const session = db.prepare(`
      SELECT * FROM sensor_pairings WHERE id = ?
    `).get(pairingId) as any;

    if (!session) {
      return {
        success: false,
        error: 'Pairing session not found or invalid pairing ID',
        statusCode: 404,
      };
    }

    // 3. Check status & single-use guarantee
    if (session.status === 'PAIRED') {
      return {
        success: false,
        error: 'Pairing token has already been consumed (single-use token protection)',
        statusCode: 409,
      };
    }

    if (session.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Pairing session was cancelled by the operator',
        statusCode: 410,
      };
    }

    // 4. Check expiry
    if (session.status === 'EXPIRED' || new Date(session.expires_at).getTime() <= now) {
      if (session.status !== 'EXPIRED') {
        db.prepare("UPDATE sensor_pairings SET status = 'EXPIRED' WHERE id = ?").run(pairingId);
      }
      return {
        success: false,
        error: 'Pairing token has expired',
        statusCode: 410,
      };
    }

    // 5. Cryptographically compare token hashes using timingSafeEqual
    if (!rawToken || typeof rawToken !== 'string') {
      return {
        success: false,
        error: 'Invalid pairing token payload',
        statusCode: 400,
      };
    }

    const providedHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const storedHash = session.token_hash;

    const bufProvided = Buffer.from(providedHash, 'utf8');
    const bufStored = Buffer.from(storedHash, 'utf8');

    if (bufProvided.length !== bufStored.length || !crypto.timingSafeEqual(bufProvided, bufStored)) {
      return {
        success: false,
        error: 'Invalid pairing secret key',
        statusCode: 403,
      };
    }

    // 6. Generate sensor identity and consume token
    const sensorId = `SENSOR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const pairedAt = new Date().toISOString();
    const metadataStr = JSON.stringify(sensorInfo || {});

    db.prepare(`
      UPDATE sensor_pairings
      SET status = 'PAIRED',
          sensor_id = ?,
          paired_at = ?,
          last_seen = ?,
          metadata = ?
      WHERE id = ?
    `).run(sensorId, pairedAt, pairedAt, metadataStr, pairingId);

    // 7. Register in activeSensors
    activeSensors.set(sensorId, {
      sensor_id: sensorId,
      camera_id: session.camera_id,
      pairing_id: pairingId,
      last_heartbeat: Date.now(),
      connected: true,
      transport: session.transport || 'WS',
    });

    // 8. Issue scoped JWT for SensorPublisher
    const jwtSecret = getJwtSecret();
    const sessionToken = jwt.sign(
      {
        id: sensorId,
        username: sensorId,
        name: `Tactical Edge Sensor [${sensorId}]`,
        role: 'SensorPublisher',
        camera_id: session.camera_id,
        sensor_id: sensorId,
      },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // 9. Notify WebSocket subscribers: sensor is now paired and connected
    broadcastWebSocketMessage('phone_stream_status', {
      camera_id: session.camera_id,
      sensor_id: sensorId,
      connected: true,
      status: 'CONNECTED',
      transport: session.transport || 'WS',
      device: sensorInfo?.device_name || 'Mobile Tactical Sensor',
      paired_at: pairedAt,
    });

    broadcastWebSocketMessage('camera_status', {
      camera_id: session.camera_id,
      status: 'Online',
      sensor_id: sensorId,
      transport: session.transport || 'WS',
      last_seen: pairedAt,
    });

    // Clear rate-limiting on success
    redemptionAttempts.delete(ipKey);

    return {
      success: true,
      session_token: sessionToken,
      camera_id: session.camera_id,
      sensor_id: sensorId,
      transport: session.transport,
      statusCode: 200,
    };
  }

  /**
   * Record real-time sensor heartbeat
   */
  public recordHeartbeat(sensorId: string, cameraId?: string): boolean {
    const sensor = activeSensors.get(sensorId);
    const now = Date.now();

    if (sensor) {
      sensor.last_heartbeat = now;
      sensor.connected = true;
      if (cameraId) sensor.camera_id = cameraId.toLowerCase();

      // Update DB
      try {
        const db = getDatabase();
        db.prepare(`
          UPDATE sensor_pairings
          SET last_seen = ?
          WHERE sensor_id = ? AND status = 'PAIRED'
        `).run(new Date(now).toISOString(), sensorId);
      } catch {}

      return true;
    }

    // If not in memory, check if valid paired sensor in DB
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM sensor_pairings WHERE sensor_id = ? AND status = 'PAIRED'
    `).get(sensorId) as any;

    if (row) {
      activeSensors.set(sensorId, {
        sensor_id: sensorId,
        camera_id: row.camera_id,
        pairing_id: row.id,
        last_heartbeat: now,
        connected: true,
        transport: row.transport || 'WS',
      });

      db.prepare(`
        UPDATE sensor_pairings SET last_seen = ? WHERE id = ?
      `).run(new Date(now).toISOString(), row.id);

      return true;
    }

    return false;
  }

  /**
   * Mark sensor as explicitly disconnected
   */
  public disconnectSensor(sensorId: string): void {
    const sensor = activeSensors.get(sensorId);
    if (sensor) {
      sensor.connected = false;
      broadcastWebSocketMessage('phone_stream_status', {
        camera_id: sensor.camera_id,
        sensor_id: sensorId,
        connected: false,
        status: 'DISCONNECTED',
        last_seen: new Date().toISOString(),
      });
    }
  }

  /**
   * Get runtime connection status of a camera's paired sensor
   */
  public getCameraSensorStatus(cameraId: string): {
    connected: boolean;
    sensor_id?: string;
    last_seen?: string;
    last_heartbeat_ago_sec?: number;
    transport?: string;
  } {
    const normalizedCamId = cameraId.trim().toLowerCase();
    for (const sensor of activeSensors.values()) {
      if (sensor.camera_id === normalizedCamId) {
        const ageSec = Math.round((Date.now() - sensor.last_heartbeat) / 1000);
        return {
          connected: sensor.connected && ageSec <= 10,
          sensor_id: sensor.sensor_id,
          last_seen: new Date(sensor.last_heartbeat).toISOString(),
          last_heartbeat_ago_sec: ageSec,
          transport: sensor.transport,
        };
      }
    }

    // Check DB for last paired record (if not currently active in memory, it is disconnected)
    const db = getDatabase();
    const row = db.prepare(`
      SELECT sensor_id, last_seen, transport
      FROM sensor_pairings
      WHERE camera_id = ? AND status = 'PAIRED'
      ORDER BY paired_at DESC LIMIT 1
    `).get(normalizedCamId) as any;

    if (row && row.last_seen) {
      const ageSec = Math.round((Date.now() - new Date(row.last_seen).getTime()) / 1000);
      return {
        connected: false,
        sensor_id: row.sensor_id,
        last_seen: row.last_seen,
        last_heartbeat_ago_sec: ageSec,
        transport: row.transport,
      };
    }

    return { connected: false };
  }

  /**
   * Check for missing heartbeats (> 10s) and transition state
   */
  private checkHeartbeatTimeouts(): void {
    const now = Date.now();
    for (const [sensorId, sensor] of activeSensors.entries()) {
      if (sensor.connected && now - sensor.last_heartbeat > 10000) {
        sensor.connected = false;
        broadcastWebSocketMessage('phone_stream_status', {
          camera_id: sensor.camera_id,
          sensor_id: sensorId,
          connected: false,
          status: 'HEARTBEAT_TIMEOUT',
          last_seen: new Date(sensor.last_heartbeat).toISOString(),
        });
        activeSensors.delete(sensorId);
      }
    }
  }

  /**
   * Expire stale pending sessions
   */
  private expirePendingSessions(): void {
    try {
      const db = getDatabase();
      const nowIso = new Date().toISOString();
      db.prepare(`
        UPDATE sensor_pairings
        SET status = 'EXPIRED'
        WHERE status = 'PENDING' AND expires_at <= ?
      `).run(nowIso);
    } catch {}
  }

  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const sensorPairingManager = SensorPairingManager.getInstance();
