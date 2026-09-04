/**
 * SEEMADRISHTI AI — P0 Hardening & Zero-Credibility-Loophole Automated Test Suite
 *
 * Verifies:
 * 1. Production dev routes (/api/dev/*) blocked with 403 Forbidden
 * 2. Alert ingestion (POST /api/alerts) requires authentication (rejects unauthenticated with 401)
 * 3. Alert ingestion rejects invalid/malicious credentials with 403
 * 4. Alert ingestion with valid service token succeeds with 201
 * 5. Target journey without real tracking data returns honest status 'NO_LIVE_DATA' and data: null (no fake fallback, no fake 88%)
 * 6. Evidence path traversal attempts are detected and rejected with 403
 * 7. Cryptographic evidence verification: genuine MP4 verified with SHA-256
 * 8. Live tamper demonstration: 1-byte modification changes SHA-256 and triggers TAMPER_DETECTED
 * 9. Evidence restoration restores genuine digest and verified status
 * 10. HTTP security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) are present
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createApp } from '../server/app';
import { initializeSchema } from '../server/db/schema';
import { seedDemoData } from '../server/db/seed';
import { closeDatabase, getDatabase } from '../server/db/database';
import { initializeWebSocketServer } from '../server/services/websocket';

const TEST_PORT = 8004;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_API_KEY = 'seemadrishti-p0-test-key-f8a7e3d9c2b41058';
const TEST_JWT_SECRET = 'seemadrishti-p0-jwt-secret-a3b7c9e1f5d24806';

process.env.NODE_ENV = 'production';
process.env.API_KEY = TEST_API_KEY;
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.SEED_DEMO_DATA = 'true';

const results: { name: string; passed: boolean; details?: string }[] = [];

function pass(name: string, details?: string) {
  results.push({ name, passed: true, details });
  console.log(`  [PASS] ${name}${details ? ` -> ${details}` : ''}`);
}

function fail(name: string, error: any) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ name, passed: false, details: msg });
  console.error(`  [FAIL] ${name} -> ${msg}`);
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

async function runP0Tests() {
  console.log('\n===============================================================');
  console.log(' SEEMADRISHTI AI — P0 Technical Integrity & Hardening Test Suite');
  console.log('===============================================================\n');

  const testDbPath = 'data/test_p0_hardening.sqlite';
  process.env.DATABASE_PATH = testDbPath;
  process.env.CAMERA_ZONES_PATH = 'data/test_camera_zones_p0.json';
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync('data/test_camera_zones_p0.json')) fs.unlinkSync('data/test_camera_zones_p0.json');
  } catch {}

  // Ensure test evidence file exists
  const testEvidenceDir = path.resolve(process.cwd(), 'evidence');
  if (!fs.existsSync(testEvidenceDir)) fs.mkdirSync(testEvidenceDir, { recursive: true });
  const testEvidenceFile = path.resolve(testEvidenceDir, 'INC-TEST-001.mp4');
  const initialBytes = Buffer.from('SEEMADRISHTI-FORENSIC-EVIDENCE-PAYLOAD-SIMULATION-BYTES-2026');
  fs.writeFileSync(testEvidenceFile, initialBytes);
  const expectedInitialSha256 = crypto.createHash('sha256').update(initialBytes).digest('hex');

  const db = getDatabase();
  initializeSchema();
  seedDemoData();

  // Insert test incident with attached evidence
  db.prepare(`
    INSERT INTO incidents (
      id, camera_id, track_id, event_type, risk_score, risk_level,
      started_at, evidence_path, evidence_status, metadata, acknowledged, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'INC-TEST-001',
    'cam-01',
    101,
    'PERIMETER_INTRUSION',
    88,
    'CRITICAL',
    new Date().toISOString(),
    'evidence/INC-TEST-001.mp4',
    'ready',
    JSON.stringify({ sha256: expectedInitialSha256, duration: 12.5 }),
    0,
    new Date().toISOString()
  );

  const app = createApp();
  const server = http.createServer(app);
  initializeWebSocketServer(server);

  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`[TEST-SERVER] Listening on ${BASE_URL}\n`);

  try {
    // 1. Development endpoints disabled in production (GET /api/dev/status -> 401 or 403)
    const r1 = await request('/api/dev/status');
    if (r1.status === 403 || r1.status === 401) {
      pass('1. Development endpoints disabled in production', `GET /api/dev/status rejected with status ${r1.status}`);
    } else {
      fail('1. Development endpoints disabled in production', `got status ${r1.status}`);
    }

    // 2. Alert ingestion unauthenticated rejected with 401
    const r2 = await request('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        camera_id: 'cam-01',
        type: 'UNAUTH_INTRUSION_ATTEMPT',
        severity: 'CRITICAL',
        risk_score: 95,
      }),
    });
    if (r2.status === 401) {
      pass('2. Unauthenticated alert ingestion rejected with 401', r2.body?.error);
    } else {
      fail('2. Unauthenticated alert ingestion rejected with 401', `got status ${r2.status}`);
    }

    // 3. Alert ingestion with invalid token rejected with 403
    const r3 = await request('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'malicious-attacker-invalid-key',
      },
      body: JSON.stringify({
        camera_id: 'cam-01',
        type: 'SPOOFED_INTRUSION',
        severity: 'CRITICAL',
        risk_score: 99,
      }),
    });
    if (r3.status === 403) {
      pass('3. Alert ingestion with invalid credentials rejected with 403 Forbidden', r3.body?.error);
    } else {
      fail('3. Alert ingestion with invalid credentials rejected with 403 Forbidden', `got status ${r3.status}`);
    }

    // 4. Alert ingestion with valid service token succeeds with 201
    const r4 = await request('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_API_KEY,
      },
      body: JSON.stringify({
        camera_id: 'cam-01',
        title: 'Tactical Perimeter Intrusion',
        reason: 'Target verified crossing boundary tripwire',
        severity: 'High',
      }),
    });
    if (r4.status === 201 && r4.body?.data?.id) {
      pass('4. Alert ingestion authorized via M2M service token', `Alert ID: ${r4.body.data.id}`);
    } else {
      fail('4. Alert ingestion authorized via M2M service token', `got status ${r4.status} ${JSON.stringify(r4.body)}`);
    }

    // 5. Target journey without real tracking data returns honest status NO_LIVE_DATA and data: null
    const r5 = await request('/api/intelligence/journey/999', {
      headers: { 'x-api-key': TEST_API_KEY },
    });
    if (r5.status === 200 && r5.body?.status === 'NO_LIVE_DATA' && r5.body?.data === null) {
      pass('5. Empty target journey returns honest NO_LIVE_DATA (no fake preset fallback, no fake 88%)', `status: ${r5.body.status}`);
    } else {
      fail('5. Empty target journey returns honest NO_LIVE_DATA', `got status ${r5.status} body: ${JSON.stringify(r5.body)}`);
    }

    // 6. Evidence path traversal rejection
    // Try accessing path outside authorized directory through incident verification
    db.prepare("UPDATE incidents SET evidence_path = '../../windows/win.ini' WHERE id = 'INC-TEST-001'").run();
    const r6 = await request('/api/incidents/INC-TEST-001/evidence/verify', {
      headers: { 'x-api-key': TEST_API_KEY },
    });
    if (r6.status === 403) {
      pass('6. Evidence path traversal attempt (../../) blocked with 403', r6.body?.error);
    } else {
      fail('6. Evidence path traversal attempt blocked with 403', `got status ${r6.status}`);
    }

    // Reset valid evidence path
    db.prepare("UPDATE incidents SET evidence_path = 'evidence/INC-TEST-001.mp4' WHERE id = 'INC-TEST-001'").run();

    // 7. Cryptographic SHA-256 verification of genuine evidence
    const r7 = await request('/api/incidents/INC-TEST-001/evidence/verify', {
      headers: { 'x-api-key': TEST_API_KEY },
    });
    if (r7.status === 200 && r7.body?.verified === true && r7.body?.status === 'VERIFIED') {
      pass('7. Cryptographic SHA-256 evidence verification verified genuine file', `SHA-256: ${r7.body.computed_sha256}`);
    } else {
      fail('7. Cryptographic SHA-256 evidence verification verified genuine file', `got status ${r7.status} ${JSON.stringify(r7.body)}`);
    }

    // 8. 1-byte tamper demonstration
    const r8 = await request('/api/incidents/INC-TEST-001/evidence/tamper-demo', {
      method: 'POST',
      headers: { 'x-api-key': TEST_API_KEY },
    });
    if (r8.status === 200 && r8.body?.action === '1_BYTE_TAMPER_INJECTED') {
      pass('8a. 1-byte tamper injected into evidence file', `Original: ${r8.body.original_sha256.slice(0, 12)}... Tampered: ${r8.body.tampered_sha256.slice(0, 12)}...`);
    } else {
      fail('8a. 1-byte tamper injected into evidence file', `got status ${r8.status}`);
    }

    // Verify tampered evidence now fails with TAMPER_DETECTED
    const r8b = await request('/api/incidents/INC-TEST-001/evidence/verify', {
      headers: { 'x-api-key': TEST_API_KEY },
    });
    if (r8b.status === 200 && r8b.body?.tampered === true && r8b.body?.status === 'TAMPER_DETECTED') {
      pass('8b. Tampered evidence immediately caught: TAMPER_DETECTED', `Mismatch detected: computed ${r8b.body.computed_sha256.slice(0, 12)}... != expected ${r8b.body.expected_sha256.slice(0, 12)}...`);
    } else {
      fail('8b. Tampered evidence caught as TAMPER_DETECTED', `got status ${r8b.status} ${JSON.stringify(r8b.body)}`);
    }

    // 9. Restore genuine evidence after tamper demo
    const r9 = await request('/api/incidents/INC-TEST-001/evidence/restore-demo', {
      method: 'POST',
      headers: { 'x-api-key': TEST_API_KEY },
    });
    const r9b = await request('/api/incidents/INC-TEST-001/evidence/verify', {
      headers: { 'x-api-key': TEST_API_KEY },
    });
    if (r9.status === 200 && r9b.body?.verified === true && r9b.body?.status === 'VERIFIED') {
      pass('9. Evidence restoration restores original SHA-256 digest and VERIFIED status', `Status: ${r9b.body.status}`);
    } else {
      fail('9. Evidence restoration restores original SHA-256 digest', `got status ${r9.status}`);
    }

    // 10. HTTP security headers
    const r10 = await request('/api/health');
    const nosniff = r10.headers.get('x-content-type-options');
    const frameOptions = r10.headers.get('x-frame-options');
    const referrer = r10.headers.get('referrer-policy');
    if (nosniff === 'nosniff' && frameOptions === 'SAMEORIGIN' && referrer) {
      pass('10. HTTP Security Headers enforced on responses', `nosniff=${nosniff}, frameOptions=${frameOptions}`);
    } else {
      fail('10. HTTP Security Headers enforced on responses', `headers: nosniff=${nosniff}, frameOptions=${frameOptions}`);
    }

  } finally {
    server.close();
    closeDatabase();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(testEvidenceFile)) fs.unlinkSync(testEvidenceFile);
    } catch {}
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nResults: ${passedCount}/${results.length} tests passed.`);
  if (passedCount < results.length) {
    process.exit(1);
  }
  process.exit(0);
}

runP0Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
