/**
 * SEEMADRISHTI AI - Phase 1 Automated Backend Test Suite
 *
 * Verifies all 13 required capabilities:
 * 1. Server startup
 * 2. /api/health
 * 3. Create camera (POST /api/cameras)
 * 4. Read cameras (GET /api/cameras, GET /api/cameras/:id)
 * 5. Update camera (PUT /api/cameras/:id)
 * 6. Delete camera (DELETE /api/cameras/:id)
 * 7. Create zone (POST /api/zones)
 * 8. Read zones (GET /api/zones, GET /api/zones/:id)
 * 9. Create and read events (POST /api/events, GET /api/events)
 * 10. Create and read alerts (POST /api/alerts, GET /api/alerts)
 * 11. Acknowledge alert (POST /api/alerts/:id/acknowledge)
 * 12. Database persistence verification
 * 13. WebSocket connection and message dispatch (/ws)
 */

import http from 'http';
import fs from 'fs';
import WebSocket from 'ws';
import { createApp } from '../server/app';
import { initializeSchema } from '../server/db/schema';
import { seedDemoData } from '../server/db/seed';
import { closeDatabase, getDatabase, getDatabasePath } from '../server/db/database';
import { initializeWebSocketServer } from '../server/services/websocket';

process.env.NODE_ENV = 'test';
process.env.API_KEY = process.env.API_KEY || 'seemadrishti-test-key-suite';

const TEST_PORT = 8001;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function recordPass(num: number, name: string, details?: string) {
  results.push({ num, name, passed: true, details });
  console.log(`  [PASS] Test ${num}: ${name}${details ? ` -> ${details}` : ''}`);
}

function recordFail(num: number, name: string, error: any) {
  const errMsg = error instanceof Error ? error.message : String(error);
  results.push({ num, name, passed: false, error: errMsg });
  console.error(`  [FAIL] Test ${num}: ${name} -> ${errMsg}`);
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY!,
    ...(options.headers as any),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING SEEMADRISHTI PHASE 1 BACKEND VERIFICATION SUITE');
  console.log('===============================================================\n');

  let serverInstance: http.Server | null = null;

  try {
    // ------------------------------------------------------------------------
    // 1. Server Startup Test
    // ------------------------------------------------------------------------
    try {
      // Initialize DB & Seed
      initializeSchema();
      seedDemoData();

      const app = createApp();
      serverInstance = http.createServer(app);
      initializeWebSocketServer(serverInstance);

      await new Promise<void>((resolve, reject) => {
        serverInstance!.listen(TEST_PORT, '127.0.0.1', () => resolve());
        serverInstance!.on('error', reject);
      });

      recordPass(1, 'Server Startup', `Bound to 127.0.0.1:${TEST_PORT}`);
    } catch (err) {
      recordFail(1, 'Server Startup', err);
      throw err; // Cannot proceed without server
    }

    // ------------------------------------------------------------------------
    // 2. /api/health Endpoint
    // ------------------------------------------------------------------------
    try {
      const res = await request('/api/health');
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      if (res.body?.status !== 'ok' || res.body?.service !== 'seemadrishti-backend') {
        throw new Error(`Unexpected payload: ${JSON.stringify(res.body)}`);
      }
      recordPass(2, 'Health Check (/api/health)', `status: "ok", service: "${res.body.service}"`);
    } catch (err) {
      recordFail(2, 'Health Check (/api/health)', err);
    }

    // ------------------------------------------------------------------------
    // 3. Create Camera (POST /api/cameras)
    // ------------------------------------------------------------------------
    const testCameraId = `cam-test-${Date.now()}`;
    try {
      const payload = {
        id: testCameraId,
        name: 'Sector J - Forward Watchtower Test Node',
        location: 'Forward Outpost Post-9',
        source_type: 'webcam',
        source_url: 'device://video0',
        status: 'Online',
      };

      const res = await request('/api/cameras', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
      if (res.body?.data?.id !== testCameraId || res.body?.data?.source_type !== 'webcam') {
        throw new Error(`Returned data does not match payload: ${JSON.stringify(res.body)}`);
      }

      recordPass(3, 'Create Camera (POST /api/cameras)', `Created camera ID '${testCameraId}' (type: webcam)`);
    } catch (err) {
      recordFail(3, 'Create Camera (POST /api/cameras)', err);
    }

    // ------------------------------------------------------------------------
    // 4. Read Cameras (GET /api/cameras, GET /api/cameras/:id)
    // ------------------------------------------------------------------------
    try {
      const listRes = await request('/api/cameras');
      if (listRes.status !== 200) throw new Error(`List cameras failed with status ${listRes.status}`);
      if (!Array.isArray(listRes.body?.data) || listRes.body.data.length < 4) {
        throw new Error(`Expected at least 4 cameras (3 seeded + 1 created), got ${listRes.body?.data?.length}`);
      }

      const getRes = await request(`/api/cameras/${testCameraId}`);
      if (getRes.status !== 200) throw new Error(`Get single camera failed with status ${getRes.status}`);
      if (getRes.body?.data?.id !== testCameraId) {
        throw new Error(`Camera id mismatch: expected ${testCameraId}, got ${getRes.body?.data?.id}`);
      }

      recordPass(4, 'Read Cameras (GET /api/cameras & :id)', `Listed ${listRes.body.data.length} cameras successfully`);
    } catch (err) {
      recordFail(4, 'Read Cameras (GET /api/cameras & :id)', err);
    }

    // ------------------------------------------------------------------------
    // 5. Update Camera (PUT /api/cameras/:id)
    // ------------------------------------------------------------------------
    try {
      const updatePayload = {
        name: 'Sector J - Forward Watchtower UPDATED',
        status: 'Degraded',
      };

      const res = await request(`/api/cameras/${testCameraId}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });

      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      if (res.body?.data?.status !== 'Degraded' || res.body?.data?.name !== updatePayload.name) {
        throw new Error(`Updated fields mismatch: ${JSON.stringify(res.body)}`);
      }

      recordPass(5, 'Update Camera (PUT /api/cameras/:id)', 'Updated name and status to Degraded');
    } catch (err) {
      recordFail(5, 'Update Camera (PUT /api/cameras/:id)', err);
    }

    // ------------------------------------------------------------------------
    // 6. Delete Camera (DELETE /api/cameras/:id)
    // ------------------------------------------------------------------------
    try {
      // First create a transient camera to delete so testCameraId remains for zone/event tests
      const transientId = `cam-transient-${Date.now()}`;
      await request('/api/cameras', {
        method: 'POST',
        body: JSON.stringify({
          id: transientId,
          name: 'Transient Camera for Delete Test',
          location: 'Buffer Post',
          source_type: 'mp4',
          source_url: 'http://example.com/test.mp4',
        }),
      });

      const delRes = await request(`/api/cameras/${transientId}`, {
        method: 'DELETE',
      });
      if (delRes.status !== 200) throw new Error(`Delete failed with ${delRes.status}: ${JSON.stringify(delRes.body)}`);

      // Verify it's gone
      const verifyRes = await request(`/api/cameras/${transientId}`);
      if (verifyRes.status !== 404) throw new Error(`Expected 404 after deletion, got ${verifyRes.status}`);

      recordPass(6, 'Delete Camera (DELETE /api/cameras/:id)', `Deleted '${transientId}', verified 404 on subsequent read`);
    } catch (err) {
      recordFail(6, 'Delete Camera (DELETE /api/cameras/:id)', err);
    }

    // ------------------------------------------------------------------------
    // 7. Create Zone (POST /api/zones)
    // ------------------------------------------------------------------------
    const testZoneId = `zone-test-${Date.now()}`;
    try {
      const zonePayload = {
        id: testZoneId,
        camera_id: testCameraId,
        name: 'Watchtower Sector J Geofence Perimeter',
        polygon: [
          [0.2, 0.2],
          [0.8, 0.2],
          [0.8, 0.8],
          [0.2, 0.8],
        ],
        enabled: true,
      };

      const res = await request('/api/zones', {
        method: 'POST',
        body: JSON.stringify(zonePayload),
      });

      if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
      if (res.body?.data?.id !== testZoneId || !Array.isArray(res.body?.data?.polygon)) {
        throw new Error(`Zone creation payload mismatch: ${JSON.stringify(res.body)}`);
      }

      recordPass(7, 'Create Zone (POST /api/zones)', `Created geofence '${testZoneId}' linked to '${testCameraId}'`);
    } catch (err) {
      recordFail(7, 'Create Zone (POST /api/zones)', err);
    }

    // ------------------------------------------------------------------------
    // 8. Read Zones (GET /api/zones, GET /api/zones/:id)
    // ------------------------------------------------------------------------
    try {
      const listRes = await request(`/api/zones?camera_id=${testCameraId}`);
      if (listRes.status !== 200) throw new Error(`List zones failed: ${listRes.status}`);
      if (!Array.isArray(listRes.body?.data) || listRes.body.data.length < 1) {
        throw new Error(`Expected filtered zones for ${testCameraId}, got 0`);
      }

      const getRes = await request(`/api/zones/${testZoneId}`);
      if (getRes.status !== 200) throw new Error(`Get zone by ID failed: ${getRes.status}`);
      if (getRes.body?.data?.id !== testZoneId || getRes.body?.data?.polygon?.length !== 4) {
        throw new Error(`Zone polygon data invalid: ${JSON.stringify(getRes.body)}`);
      }

      recordPass(8, 'Read Zones (GET /api/zones & :id)', `Retrieved zone '${testZoneId}' with 4 polygon points`);
    } catch (err) {
      recordFail(8, 'Read Zones (GET /api/zones & :id)', err);
    }

    // ------------------------------------------------------------------------
    // 9. Create and Read Events (POST /api/events, GET /api/events)
    // ------------------------------------------------------------------------
    const testEventId = `evt-test-${Date.now()}`;
    try {
      const eventPayload = {
        id: testEventId,
        camera_id: testCameraId,
        event_type: 'PERIMETER_PROXIMITY',
        severity: 'High',
        object_id: 'target-99',
        timestamp: new Date().toISOString(),
        metadata: { confidence: 0.94, dwell_time_sec: 14.2 },
      };

      const createRes = await request('/api/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
      });

      if (createRes.status !== 201) throw new Error(`Expected 201, got ${createRes.status}: ${JSON.stringify(createRes.body)}`);

      // Filter events by camera and severity
      const readRes = await request(`/api/events?camera_id=${testCameraId}&severity=High`);
      if (readRes.status !== 200) throw new Error(`Read events failed: ${readRes.status}`);
      const found = readRes.body?.data?.find((e: any) => e.id === testEventId);
      if (!found || found.event_type !== 'PERIMETER_PROXIMITY') {
        throw new Error(`Event '${testEventId}' not found in query results`);
      }

      recordPass(9, 'Create & Read Events (POST & GET /api/events)', `Created '${testEventId}', retrieved with filters`);
    } catch (err) {
      recordFail(9, 'Create & Read Events (POST & GET /api/events)', err);
    }

    // ------------------------------------------------------------------------
    // 10. Create and Read Alerts (POST /api/alerts, GET /api/alerts)
    // ------------------------------------------------------------------------
    const testAlertId = `alt-test-${Date.now()}`;
    try {
      const alertPayload = {
        id: testAlertId,
        event_id: testEventId,
        camera_id: testCameraId,
        severity: 'High',
        title: 'Tactical Perimeter Intrusion Breach',
        reason: 'Target approached restricted buffer boundary within 1.2m',
      };

      const createRes = await request('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(alertPayload),
      });

      if (createRes.status !== 201) throw new Error(`Expected 201, got ${createRes.status}: ${JSON.stringify(createRes.body)}`);

      // Read alerts with filter
      const readRes = await request(`/api/alerts?camera_id=${testCameraId}&acknowledged=0`);
      if (readRes.status !== 200) throw new Error(`Read alerts failed: ${readRes.status}`);
      const found = readRes.body?.data?.find((a: any) => a.id === testAlertId);
      if (!found || found.acknowledged !== false) {
        throw new Error(`Alert '${testAlertId}' not found or acknowledged state mismatch`);
      }

      recordPass(10, 'Create & Read Alerts (POST & GET /api/alerts)', `Created '${testAlertId}', verified unacknowledged`);
    } catch (err) {
      recordFail(10, 'Create & Read Alerts (POST & GET /api/alerts)', err);
    }

    // ------------------------------------------------------------------------
    // 11. Acknowledge Alert (POST /api/alerts/:id/acknowledge)
    // ------------------------------------------------------------------------
    try {
      const ackRes = await request(`/api/alerts/${testAlertId}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({
          operator_id: 'OP-BARRACKS-9',
          action: 'DISPATCH_QRT_TEAM_ALPHA',
        }),
      });

      if (ackRes.status !== 200) throw new Error(`Acknowledge failed: ${ackRes.status}: ${JSON.stringify(ackRes.body)}`);
      if (ackRes.body?.data?.acknowledged !== true) {
        throw new Error(`Expected acknowledged=true, got ${ackRes.body?.data?.acknowledged}`);
      }

      // Verify in DB
      const getRes = await request(`/api/alerts/${testAlertId}`);
      if (getRes.body?.data?.acknowledged !== true) {
        throw new Error('Database state did not persist acknowledged=1');
      }

      recordPass(11, 'Acknowledge Alert (POST /api/alerts/:id/acknowledge)', `Alert '${testAlertId}' marked acknowledged=true`);
    } catch (err) {
      recordFail(11, 'Acknowledge Alert (POST /api/alerts/:id/acknowledge)', err);
    }

    // ------------------------------------------------------------------------
    // 12. Database Persistence Verification
    // ------------------------------------------------------------------------
    try {
      const dbPath = getDatabasePath();
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file '${dbPath}' does not exist on disk`);
      }
      const stat = fs.statSync(dbPath);
      if (stat.size <= 0) {
        throw new Error(`Database file size is 0 bytes`);
      }

      // Direct synchronous SQL query to verify data integrity
      const directDb = getDatabase();
      const cameraRow = directDb.prepare('SELECT id, name FROM cameras WHERE id = ?').get(testCameraId) as any;
      if (!cameraRow || !cameraRow.name.includes('UPDATED')) {
        throw new Error(`Direct SQL read failed for camera '${testCameraId}'`);
      }

      const alertRow = directDb.prepare('SELECT id, acknowledged FROM alerts WHERE id = ?').get(testAlertId) as any;
      if (!alertRow || alertRow.acknowledged !== 1) {
        throw new Error(`Direct SQL read failed for acknowledged alert '${testAlertId}'`);
      }

      recordPass(12, 'Database Persistence', `File verified at ${dbPath} (${stat.size} bytes), direct SQL verified`);
    } catch (err) {
      recordFail(12, 'Database Persistence', err);
    }

    // ------------------------------------------------------------------------
    // 13. WebSocket Connection & Broadcast Test (/ws)
    // ------------------------------------------------------------------------
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timed out after 4000ms'));
        }, 4000);

        const ws = new WebSocket(WS_URL);
        let receivedAck = false;
        let receivedPong = false;
        let receivedBroadcast = false;

        ws.on('open', () => {
          // Send ping message
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

          // Trigger dev broadcast endpoint via HTTP
          setTimeout(async () => {
            await request('/api/dev/broadcast', {
              method: 'POST',
              body: JSON.stringify({
                type: 'broadcast_test',
                data: { testId: 'ws-verify-13', message: 'Hello from Phase 1 Test' },
              }),
            });
          }, 300);
        });

        ws.on('message', (rawData: string) => {
          try {
            const msg = JSON.parse(rawData.toString());
            if (msg.type === 'connection_ack') {
              receivedAck = true;
            }
            if (msg.type === 'pong') {
              receivedPong = true;
            }
            if (msg.type === 'broadcast_test' && msg.data?.testId === 'ws-verify-13') {
              receivedBroadcast = true;
            }

            if (receivedAck && receivedPong && receivedBroadcast) {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (e) {
            // ignore
          }
        });

        ws.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      recordPass(13, 'WebSocket Connection & Messaging (/ws)', 'Handshake, connection_ack, ping/pong, and broadcast verified');
    } catch (err) {
      recordFail(13, 'WebSocket Connection & Messaging (/ws)', err);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Security Authentication Enforcement
    // -------------------------------------------------------------------------
    try {
      // 1. Mutating request with invalid key must be rejected with 403 Forbidden
      const unauthRes = await fetch(`${BASE_URL}/api/cameras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'malicious-attacker-fake-key-999',
        },
        body: JSON.stringify({ name: 'Spoofed Camera', source_type: 'webcam' }),
      });
      if (unauthRes.status !== 403) {
        throw new Error(`Expected HTTP 403 Forbidden for invalid key, got ${unauthRes.status}`);
      }

      // 2. Mutating request with valid key must succeed
      const authRes = await fetch(`${BASE_URL}/api/cameras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.API_KEY!,
        },
        body: JSON.stringify({
          name: 'Authorized Security Gate',
          location: 'Gate Alpha Verification',
          source_type: 'webcam',
          source_url: 'http://localhost/stream',
        }),
      });
      if (!authRes.ok) {
        throw new Error(`Expected HTTP 200/201 for valid key, got ${authRes.status}`);
      }

      recordPass(14, 'API Key Security Middleware', 'Invalid tokens rejected with 403, valid tokens permitted');
    } catch (err) {
      recordFail(14, 'API Key Security Middleware', err);
    }

  } finally {
    // Teardown
    if (serverInstance) {
      serverInstance.close();
    }
  }

  // Summary Report
  console.log('\n===============================================================');
  console.log('📊 TEST EXECUTION SUMMARY:');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
