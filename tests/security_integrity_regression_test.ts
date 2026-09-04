/**
 * SEEMADRISHTI AI — Security & Technical Integrity Regression Test Suite
 *
 * Formally verifies:
 * 1. Production startup creates no default admin account (NODE_ENV=production skips demo users)
 * 2. admin / Admin@123 cannot authenticate unless explicitly created for an isolated test
 * 3. Public registration cannot obtain Commander or any privileged role (client-provided role ignored)
 * 4. In production, public registration is blocked when ALLOW_PUBLIC_REGISTRATION is not set
 * 5. Default-deny on sensitive reads: unauthenticated cameras, zones, events, alerts, incidents, system, evidence fail with 401
 * 6. Public endpoints (health, login) remain accessible without authentication
 * 7. Evidence downloads and range streaming require authentication and work with valid token
 * 8. Unauthorized WebSocket phone-frame injection is rejected
 * 9. Oversized WebSocket phone-frame payloads (>5MB) are rejected
 * 10. Mismatched evidence hash is reported as TAMPER_DETECTED, never VERIFIED
 * 11. Tests do not modify tracked configuration files (config/camera_zones.json)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../server/app';
import { initializeSchema } from '../server/db/schema';
import { seedDemoUsers, seedDemoData } from '../server/db/seed';
import { closeDatabase, getDatabase } from '../server/db/database';
import { initializeWebSocketServer } from '../server/services/websocket';

const TEST_PORT = 8005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

const TEST_M2M_KEY = 'seemadrishti-reg-m2m-key-32chars-secure';
const TEST_JWT_SECRET = 'seemadrishti-reg-jwt-secret-hex32chars';

// Enforce test configuration before any execution
process.env.API_KEY = TEST_M2M_KEY;
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.CAMERA_ZONES_PATH = 'data/test_regression_camera_zones.json';

const results: { num: number; name: string; passed: boolean; details?: string }[] = [];

function pass(num: number, name: string, details?: string) {
  results.push({ num, name, passed: true, details });
  console.log(`  [PASS] Test ${num}: ${name}${details ? ` -> ${details}` : ''}`);
}

function fail(num: number, name: string, error: any) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ num, name, passed: false, details: msg });
  console.error(`  [FAIL] Test ${num}: ${name} -> ${msg}`);
}

async function request(reqPath: string, options: RequestInit = {}): Promise<{ status: number; headers: Headers; body: any }> {
  const url = `${BASE_URL}${reqPath}`;
  const res = await fetch(url, options);
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, headers: res.headers, body };
}

async function runRegressionSuite() {
  console.log('\n=============================================================================');
  console.log(' SEEMADRISHTI AI — Security & Technical Integrity Regression Test Suite');
  console.log('=============================================================================\n');

  // Track initial state of tracked config file
  const trackedZonesPath = path.resolve(process.cwd(), 'config/camera_zones.json');
  const initialTrackedZonesContent = fs.existsSync(trackedZonesPath) ? fs.readFileSync(trackedZonesPath, 'utf8') : null;

  // 1. Isolated DB for production startup verification
  const prodTestDb = 'data/test_reg_prod_startup.sqlite';
  process.env.DATABASE_PATH = prodTestDb;
  process.env.NODE_ENV = 'production';
  delete process.env.SEED_DEMO_DATA;
  delete process.env.ALLOW_PUBLIC_REGISTRATION;

  try {
    if (fs.existsSync(prodTestDb)) fs.unlinkSync(prodTestDb);
  } catch {}

  const dbProd = getDatabase();
  initializeSchema();
  seedDemoUsers();

  // Test 1: Production startup creates NO default admin account
  const defaultAdmin = dbProd.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  const allUsersProd = dbProd.prepare('SELECT COUNT(*) as count FROM users').get() as any;

  if (!defaultAdmin && allUsersProd.count === 0) {
    pass(1, 'Production startup creates no default admin account', `users count = 0, default admin absent`);
  } else {
    fail(1, 'Production startup creates no default admin account', `Found user: ${JSON.stringify(defaultAdmin)}`);
  }

  // Close prod startup DB
  closeDatabase();
  try {
    if (fs.existsSync(prodTestDb)) fs.unlinkSync(prodTestDb);
  } catch {}

  // 2. Setup Server for HTTP / WS Security Regression Tests
  const serverDbPath = 'data/test_reg_main.sqlite';
  process.env.DATABASE_PATH = serverDbPath;
  try {
    if (fs.existsSync(serverDbPath)) fs.unlinkSync(serverDbPath);
  } catch {}

  const db = getDatabase();
  initializeSchema();

  // Create isolated evidence fixture for tamper & streaming tests
  const evidenceDir = path.resolve(process.cwd(), 'evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  const testEvidenceFile = path.resolve(evidenceDir, 'INC-REG-001.mp4');
  const genuineBytes = Buffer.from('SEEMADRISHTI-GENUINE-EVIDENCE-FORENSIC-PAYLOAD-2026-REGRESSION-SUITE');
  fs.writeFileSync(testEvidenceFile, genuineBytes);
  const genuineSha256 = crypto.createHash('sha256').update(genuineBytes).digest('hex');

  // Insert test camera to satisfy foreign key constraints
  db.prepare(`
    INSERT INTO cameras (id, name, location, source_type, source_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('cam-01', 'Test Border Camera', 'Sector 4', 'mp4', 'evidence/INC-REG-001.mp4', 'Online', new Date().toISOString(), new Date().toISOString());

  // Insert test incident sealed with genuine hash
  db.prepare(`
    INSERT INTO incidents (
      id, camera_id, track_id, event_type, risk_score, risk_level,
      started_at, evidence_path, evidence_status, metadata, acknowledged, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'INC-REG-001',
    'cam-01',
    201,
    'RESTRICTED_BREACH',
    92,
    'CRITICAL',
    new Date().toISOString(),
    'evidence/INC-REG-001.mp4',
    'ready',
    JSON.stringify({ sha256: genuineSha256, duration: 15.0 }),
    0,
    new Date().toISOString()
  );

  // Insert a test operator and commander
  const opPasswordHash = bcrypt.hashSync('ValidOperatorPass@2026', 10);
  db.prepare(`
    INSERT INTO users (id, username, password_hash, name, role, email, shift, status, assigned_sector, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'Sector 1', ?, ?)
  `).run('usr-op-01', 'operator1', opPasswordHash, 'Surveillance Operator One', 'Surveillance Operator', 'op1@seemadrishti.in', 'Morning', new Date().toISOString(), new Date().toISOString());

  const cmdPasswordHash = bcrypt.hashSync('CommanderSecret@2026', 10);
  db.prepare(`
    INSERT INTO users (id, username, password_hash, name, role, email, shift, status, assigned_sector, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'HQ', ?, ?)
  `).run('usr-cmd-01', 'commander1', cmdPasswordHash, 'Chief Commander Rao', 'Commander', 'commander@seemadrishti.in', 'Day', new Date().toISOString(), new Date().toISOString());

  const app = createApp();
  const server = http.createServer(app);
  initializeWebSocketServer(server);

  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`[REGRESSION-SERVER] Listening on ${BASE_URL}\n`);

  try {
    // Test 2: admin / Admin@123 cannot authenticate unless explicitly created
    const r2 = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
    });
    if (r2.status === 401) {
      pass(2, 'admin / Admin@123 cannot authenticate by default', `rejected with status ${r2.status} (user not found / invalid)`);
    } else {
      fail(2, 'admin / Admin@123 cannot authenticate by default', `got status ${r2.status}`);
    }

    // Authenticate legitimate operator and commander
    const rLoginOp = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator1', password: 'ValidOperatorPass@2026' }),
    });
    const operatorToken = rLoginOp.body?.token;

    const rLoginCmd = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'commander1', password: 'CommanderSecret@2026' }),
    });
    const commanderToken = rLoginCmd.body?.token;

    if (!operatorToken || !commanderToken) {
      throw new Error('Failed to obtain test JWT tokens for operator/commander');
    }

    // Test 3: In production, self-registration is disabled by default
    const r3 = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'unauthorized_applicant',
        password: 'Password@123',
        name: 'Unauthorized User',
        email: 'unauth@test.in',
        role: 'Commander',
      }),
    });
    if (r3.status === 403) {
      pass(3, 'Self-registration disabled in production by default', `status ${r3.status}: ${r3.body?.error}`);
    } else {
      fail(3, 'Self-registration disabled in production by default', `got status ${r3.status}`);
    }

    // Test 4: Public registration ignores client-provided role (cannot obtain privileged role)
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
    const r4 = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'sneaky_officer',
        password: 'Password@123',
        name: 'Sneaky Officer',
        email: 'sneaky@test.in',
        role: 'Commander', // Attempting to elevate to Commander
      }),
    });
    delete process.env.ALLOW_PUBLIC_REGISTRATION;

    if (r4.status === 201 && r4.body?.user?.role === 'Surveillance Operator') {
      pass(4, 'Public registration ignores client role; enforces Surveillance Operator', `Assigned: ${r4.body.user.role}`);
    } else {
      fail(4, 'Public registration ignores client role', `got status ${r4.status} role: ${r4.body?.user?.role}`);
    }

    // Test 5: Default-deny on sensitive reads
    const sensitiveRoutes = [
      '/api/cameras',
      '/api/zones',
      '/api/events',
      '/api/alerts',
      '/api/incidents',
      '/api/correlations',
      '/api/telemetry/stats',
      '/api/analytics/realtime',
      '/api/system/health',
      '/api/intelligence/search',
      '/evidence/INC-REG-001.mp4',
      '/api/evidence/INC-REG-001.mp4',
      '/api/incidents/INC-REG-001/evidence',
    ];

    let allSensitiveDenied = true;
    for (const route of sensitiveRoutes) {
      const r = await request(route);
      if (r.status !== 401) {
        allSensitiveDenied = false;
        fail(5, `Sensitive route default-deny: ${route}`, `expected 401, got ${r.status}`);
        break;
      }
    }
    if (allSensitiveDenied) {
      pass(5, 'Default-deny: all 13 sensitive reads and evidence downloads reject unauthenticated requests with 401', 'Verified');
    }

    // Test 6: Public health endpoint remains accessible
    const r6 = await request('/api/health');
    if (r6.status === 200 && r6.body?.status === 'ok') {
      pass(6, 'Public health endpoint /api/health accessible unauthenticated', `status ${r6.status}`);
    } else {
      fail(6, 'Public health endpoint accessible unauthenticated', `got status ${r6.status}`);
    }

    // Test 7: Authenticated evidence streaming with range requests succeeds
    const r7 = await request('/api/incidents/INC-REG-001/evidence', {
      headers: {
        Authorization: `Bearer ${operatorToken}`,
        Range: 'bytes=0-20',
      },
    });
    const acceptRanges = r7.headers.get('accept-ranges');
    if (r7.status === 206 && acceptRanges === 'bytes') {
      pass(7, 'Authenticated evidence streaming with HTTP Range (206 Partial Content) succeeds', `status ${r7.status}`);
    } else {
      fail(7, 'Authenticated evidence streaming with Range request', `got status ${r7.status} accept-ranges=${acceptRanges}`);
    }

    // Test 8: Query token authentication works for native HTML5 video tags
    const r8 = await request(`/api/incidents/INC-REG-001/evidence?token=${encodeURIComponent(operatorToken)}`, {
      headers: { Range: 'bytes=0-10' },
    });
    if (r8.status === 206) {
      pass(8, 'Query string token (?token=...) authenticated native video streaming succeeds', `status ${r8.status}`);
    } else {
      fail(8, 'Query string token authenticated video streaming', `got status ${r8.status}`);
    }

    // Test 9: Unauthorized WebSocket phone-frame injection is rejected
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let rejected = false;

      ws.on('open', () => {
        // Attempt sending phone stream frame without authenticating first
        ws.send(JSON.stringify({
          type: 'phone_stream_frame',
          camera_id: 'cam-phone',
          frame: 'data:image/jpeg;base64,unauthorizedpayload',
        }));
      });

      ws.on('message', (raw: string) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type === 'error' && parsed.data?.error?.includes('Unauthorized')) {
            rejected = true;
            ws.close();
            pass(9, 'Unauthorized WebSocket phone-frame injection rejected with error', parsed.data.error);
            resolve();
          }
        } catch {}
      });

      setTimeout(() => {
        if (!rejected) {
          ws.close();
          fail(9, 'Unauthorized WebSocket phone-frame injection', 'Timed out waiting for rejection');
          resolve();
        }
      }, 2000);
    });

    // Test 10: Oversized WebSocket phone frame (>5MB) rejected even from authenticated publisher
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`${WS_URL}?token=${TEST_M2M_KEY}`);
      let rejectedOversized = false;

      ws.on('open', () => {
        // 5.5MB payload string
        const hugePayload = 'A'.repeat(5.5 * 1024 * 1024);
        ws.send(JSON.stringify({
          type: 'phone_stream_frame',
          camera_id: 'cam-01',
          frame: hugePayload,
        }));
      });

      ws.on('message', (raw: string) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type === 'error' && parsed.data?.error?.includes('exceeds 5MB limit')) {
            rejectedOversized = true;
            ws.close();
            pass(10, 'Oversized WebSocket phone frame payload (>5MB) rejected', parsed.data.error);
            resolve();
          }
        } catch {}
      });

      setTimeout(() => {
        if (!rejectedOversized) {
          ws.close();
          fail(10, 'Oversized WebSocket phone frame payload rejection', 'Did not reject oversized payload');
          resolve();
        }
      }, 2000);
    });

    // Test 11: Mismatched evidence hash is reported as TAMPER_DETECTED, never VERIFIED
    // Inject 1-byte tamper into evidence file
    const tamperedBytes = Buffer.from(genuineBytes);
    tamperedBytes[10] = tamperedBytes[10] ^ 0xFF;
    fs.writeFileSync(testEvidenceFile, tamperedBytes);

    const rVerifyTampered = await request('/api/incidents/INC-REG-001/evidence/verify', {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const rGetIncident = await request('/api/incidents/INC-REG-001', {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    if (
      rVerifyTampered.status === 200 &&
      rVerifyTampered.body?.status === 'TAMPER_DETECTED' &&
      rVerifyTampered.body?.tampered === true &&
      rVerifyTampered.body?.verified === false &&
      rGetIncident.body?.data?.verification_status === 'TAMPER_DETECTED'
    ) {
      pass(11, 'Mismatched evidence hash is reported as TAMPER_DETECTED, never VERIFIED', `verification_status: ${rGetIncident.body.data.verification_status}`);
    } else {
      fail(11, 'Mismatched evidence hash verification', `status=${rVerifyTampered.body?.status}, incident_status=${rGetIncident.body?.data?.verification_status}`);
    }

    // Restore genuine evidence
    fs.writeFileSync(testEvidenceFile, genuineBytes);

    // Test 12: Zone config mutation uses isolated CAMERA_ZONES_PATH and leaves tracked config/camera_zones.json untouched
    const rZoneCreate = await request('/api/zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${commanderToken}`,
      },
      body: JSON.stringify({
        camera_id: 'cam-01',
        name: 'Regression Test Geofence',
        polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
      }),
    });

    const currentTrackedZonesContent = fs.existsSync(trackedZonesPath) ? fs.readFileSync(trackedZonesPath, 'utf8') : null;
    const trackedUnchanged = initialTrackedZonesContent === currentTrackedZonesContent;
    const isolatedConfigWritten = fs.existsSync(path.resolve(process.cwd(), process.env.CAMERA_ZONES_PATH!));

    if (rZoneCreate.status === 201 && trackedUnchanged && isolatedConfigWritten) {
      pass(12, 'Zone calibration mutations persist to isolated path; tracked config/camera_zones.json untouched', 'Verified byte-for-byte identical');
    } else {
      fail(12, 'Zone calibration mutation integrity', `zoneCreate status=${rZoneCreate.status}, trackedUnchanged=${trackedUnchanged}, isolatedConfigWritten=${isolatedConfigWritten}`);
    }

  } finally {
    server.close();
    closeDatabase();
    try {
      if (fs.existsSync(serverDbPath)) fs.unlinkSync(serverDbPath);
      if (fs.existsSync(testEvidenceFile)) fs.unlinkSync(testEvidenceFile);
      if (fs.existsSync(path.resolve(process.cwd(), process.env.CAMERA_ZONES_PATH!))) {
        fs.unlinkSync(path.resolve(process.cwd(), process.env.CAMERA_ZONES_PATH!));
      }
    } catch {}
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nRegression Results: ${passedCount}/${results.length} tests passed.\n`);
  if (passedCount < results.length) {
    process.exit(1);
  }
  process.exit(0);
}

runRegressionSuite().catch((err) => {
  console.error('Fatal error in regression test suite:', err);
  process.exit(1);
});
