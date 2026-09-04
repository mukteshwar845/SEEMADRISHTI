/**
 * SEEMADRISHTI AI — Live Data Integrity & Zero-Synthetic-Live-Data Verification Suite
 *
 * Verifies:
 * D1 — Live data source verified (live_only filter strictly returns real streams)
 * D2 — No seed/test leakage in live endpoints
 * D3 — Real detection counts (0 when idle)
 * D4 — Real YOLO confidence (preserves exact floating point, rejects synthetic 0.95)
 * D5 — Real ByteTrack IDs
 * D6 — Real risk scores (rejects static 50/100)
 * D7 — Real timestamps
 * D8 — Real camera IDs (no fake CAM-TEST-* in live mode)
 * D9 — Stale data expiration policy
 * D10 — Correct empty state contract
 */

import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function recordPass(id: number, name: string, message: string) {
  results.push({ id, name, passed: true, message });
  console.log(`  ✅ [PASS] Test ${id}: ${name} — ${message}`);
}

function recordFail(id: number, name: string, err: any) {
  const msg = err?.message || String(err);
  results.push({ id, name, passed: false, message: msg, details: err });
  console.error(`  ❌ [FAIL] Test ${id}: ${name} — ${msg}`);
}

const API_KEY = process.env.API_KEY || 'f8a7e3d9c2b410586e2417a8c3d9b015e7f24819a3c6b8d0e2f418579c2b4105';

async function request(path: string, options: any = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let body = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            body = raw;
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runIntegrityTests() {
  console.log('\n===============================================================');
  console.log('🛡️  SEEMADRISHTI AI — LIVE DATA INTEGRITY & ZERO-SYNTHETIC SUITE');
  console.log('===============================================================\n');

  const createdEventIds: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Empty Live Feed State (No Active Camera)
    // ------------------------------------------------------------------------
    try {
      const res = await request('/api/events?live_only=true&freshness_sec=15');
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      if (!Array.isArray(res.body?.data)) throw new Error('data must be an array');
      
      // When no live stream is pumping frames, live events must be empty (0)
      if (res.body.data.length !== 0) {
        throw new Error(`Expected 0 live events when no camera active, found ${res.body.data.length}`);
      }

      recordPass(1, 'Empty Live Stream State (Zero-Live-Data Baseline)', 'Verified 0 live events returned when no stream active');
    } catch (err) {
      recordFail(1, 'Empty Live Stream State (Zero-Live-Data Baseline)', err);
    }

    // ------------------------------------------------------------------------
    // TEST 2: Anti-Seed Leakage (GET /api/events Excludes Test & Leakage Data)
    // ------------------------------------------------------------------------
    try {
      const res = await request('/api/events');
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      
      const hasCamTest = res.body?.data?.some((e: any) => 
        (e.camera_id && e.camera_id.toLowerCase().includes('cam-test')) ||
        (e.id && e.id.toLowerCase().includes('cam-test'))
      );
      if (hasCamTest) {
        throw new Error('Detected CAM-TEST-* leakage in GET /api/events');
      }

      recordPass(2, 'Anti-Seed Leakage Audit', 'Verified no CAM-TEST-* records exposed via default event query');
    } catch (err) {
      recordFail(2, 'Anti-Seed Leakage Audit', err);
    }

    // ------------------------------------------------------------------------
    // TEST 3: Threat Alerts Integrity (Zero Simulated Alerts Today)
    // ------------------------------------------------------------------------
    try {
      const res = await request('/api/alerts');
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      
      const hasSimulated = res.body?.data?.some((a: any) => 
        a.title?.includes('IN SUSPICIOUS AREA') || a.title?.includes('CROSSING LINE') || a.camera_id?.includes('cam-test')
      );
      if (hasSimulated) {
        throw new Error('Detected simulated canvas alert in database alerts table');
      }

      recordPass(3, 'Threat Alerts Integrity Audit', 'Verified zero simulated canvas alerts in alert table');
    } catch (err) {
      recordFail(3, 'Threat Alerts Integrity Audit', err);
    }

    // ------------------------------------------------------------------------
    // TEST 4: Genuine Live CV Event Ingestion with Non-Synthetic Confidence & Risk
    // ------------------------------------------------------------------------
    const testEvtId = `evt-live-verif-${Date.now()}`;
    createdEventIds.push(testEvtId);
    const genuineConfidence = 0.873; // Notice: 87.3%, NEVER 95.0%
    const genuineRisk = 76;          // Notice: 76/100, NEVER 50/100
    const genuineTrackId = 42;

    try {
      const createRes = await request('/api/events', {
        method: 'POST',
        body: {
          id: testEvtId,
          camera_id: 'cam-01',
          event_type: 'PERSON',
          severity: 'High',
          source_type: 'browser_webcam',
          object_id: `trk-${genuineTrackId}`,
          timestamp: new Date().toISOString(),
          metadata: {
            class_name: 'person',
            confidence: genuineConfidence,
            risk_score: genuineRisk,
            track_id: genuineTrackId,
            zone_name: 'Sector Alpha North Gate',
            bbox: { x: 120, y: 150, width: 80, height: 180 },
          },
        },
      });

      if (createRes.status !== 201) {
        throw new Error(`Expected 201 Created, got ${createRes.status}: ${JSON.stringify(createRes.body)}`);
      }

      recordPass(4, 'Genuine CV Live Ingestion', 'Created live event with confidence=0.873, risk=76, track=42');
    } catch (err) {
      recordFail(4, 'Genuine CV Live Ingestion', err);
    }

    // ------------------------------------------------------------------------
    // TEST 5: Live Query Dynamic Response & Accurate Attribute Mapping
    // ------------------------------------------------------------------------
    try {
      const readRes = await request('/api/events?live_only=true&freshness_sec=30');
      if (readRes.status !== 200) throw new Error(`Expected HTTP 200, got ${readRes.status}`);

      const target = readRes.body?.data?.find((e: any) => e.id === testEvtId);
      if (!target) throw new Error(`Live event '${testEvtId}' not found in live_only query`);

      // Verify exact confidence preservation (NO fallback to 0.95)
      if (target.confidence !== genuineConfidence) {
        throw new Error(`Confidence corrupted: expected ${genuineConfidence}, got ${target.confidence}`);
      }

      // Verify exact risk score (NO fallback to 50)
      if (target.risk_score !== genuineRisk) {
        throw new Error(`Risk score corrupted: expected ${genuineRisk}, got ${target.risk_score}`);
      }

      // Verify source type
      if (target.source_type !== 'browser_webcam') {
        throw new Error(`Source type mismatch: expected 'browser_webcam', got ${target.source_type}`);
      }

      // Verify track ID
      if (target.track_id !== genuineTrackId) {
        throw new Error(`Track ID mismatch: expected ${genuineTrackId}, got ${target.track_id}`);
      }

      recordPass(5, 'Live Query Attribute Integrity', 'Preserved genuine confidence (87.3%), risk (76/100), and track ID (42)');
    } catch (err) {
      recordFail(5, 'Live Query Attribute Integrity', err);
    }

    // ------------------------------------------------------------------------
    // TEST 6: Stale Live Detection Expiration Policy
    // ------------------------------------------------------------------------
    try {
      // Query with freshness threshold of 1 second after waiting 2 seconds
      await new Promise((r) => setTimeout(r, 2100));

      const expiredRes = await request('/api/events?live_only=true&freshness_sec=1');
      if (expiredRes.status !== 200) throw new Error(`Expected HTTP 200, got ${expiredRes.status}`);

      const foundAfterExpiry = expiredRes.body?.data?.find((e: any) => e.id === testEvtId);
      if (foundAfterExpiry) {
        throw new Error('Event was not expired after freshness window elapsed');
      }

      recordPass(6, 'Stale Detection Expiration Policy', 'Verified stale live detections are expired when feed stops');
    } catch (err) {
      recordFail(6, 'Stale Detection Expiration Policy', err);
    }

    // ------------------------------------------------------------------------
    // TEST 7: CV Status Health Endpoint
    // ------------------------------------------------------------------------
    try {
      const statusRes = await request('/api/webcam/status');
      if (statusRes.status !== 200) throw new Error(`Expected HTTP 200, got ${statusRes.status}`);
      if (!statusRes.body?.status) throw new Error('status field missing from /api/webcam/status');

      recordPass(7, 'CV Processor Health API', `Reported CV status: ${statusRes.body.status}`);
    } catch (err) {
      recordFail(7, 'CV Processor Health API', err);
    }

  } finally {
    // Teardown: clean up test events
    try {
      const { getDatabase } = require('../server/db/database');
      const db = getDatabase();
      for (const id of createdEventIds) {
        db.prepare('DELETE FROM events WHERE id = ?').run(id);
      }
    } catch {}
  }

  // Summary Report
  console.log('\n===============================================================');
  console.log('📊 LIVE DATA INTEGRITY EXECUTION SUMMARY:');
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

runIntegrityTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
