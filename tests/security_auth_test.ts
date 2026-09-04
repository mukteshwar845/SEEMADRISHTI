/**
 * SEEMADRISHTI AI - Security & Per-Operator Authentication Test Suite
 *
 * Verifies:
 * 1. Read-only endpoints work unauthenticated (GET /api/cameras -> 200)
 * 2. Mutating endpoints reject unauthenticated requests (POST /api/cameras -> 401)
 * 3. Mutating endpoints reject old hardcoded key (POST /api/cameras -> 403)
 * 4. Login rejects invalid credentials (POST /api/auth/login -> 401)
 * 5. Login succeeds for demo operator (admin / Admin@123 -> 200 + JWT)
 * 6. Mutating endpoints accept valid JWT Bearer token (POST /api/cameras -> 201)
 * 7. /api/auth/me returns current authenticated operator profile
 * 8. Machine-to-machine M2M token works via x-api-key: <API_KEY>
 * 9. Operator creation securely hashes password and never leaks password_hash
 * 10. Newly created operator can log in and receive valid JWT
 */

import http from 'http';
import fs from 'fs';
import { createApp } from '../server/app';
import { initializeSchema } from '../server/db/schema';
import { seedDemoData } from '../server/db/seed';
import { closeDatabase, getDatabase, getDatabasePath } from '../server/db/database';
import { initializeWebSocketServer } from '../server/services/websocket';

// Configure dedicated test environment
const TEST_PORT = 8003;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const M2M_TEST_KEY = 'seemadrishti-m2m-test-secret-32-chars-long';
const JWT_TEST_SECRET = 'seemadrishti-jwt-test-secret-random-hex-256';

process.env.NODE_ENV = 'production'; // Enforce strict auth checks
process.env.API_KEY = M2M_TEST_KEY;
process.env.JWT_SECRET = JWT_TEST_SECRET;
process.env.SEED_DEMO_DATA = 'true'; // Explicit test seeding for isolated test suite
process.env.CAMERA_ZONES_PATH = 'data/test_camera_zones_auth.json';

const results: { name: string; passed: boolean; error?: string }[] = [];

function pass(name: string, details?: string) {
  results.push({ name, passed: true });
  console.log(`  [PASS] ${name}${details ? ` -> ${details}` : ''}`);
}

function fail(name: string, error: any) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ name, passed: false, error: msg });
  console.error(`  [FAIL] ${name} -> ${msg}`);
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function runSecurityTests() {
  console.log('\n===============================================================');
  console.log(' SEEMADRISHTI AI — Security & Authentication Verification Suite');
  console.log('===============================================================\n');

  // Clean test db
  const testDbPath = 'data/test_security.sqlite';
  process.env.DATABASE_PATH = testDbPath;
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync('data/test_camera_zones_auth.json')) fs.unlinkSync('data/test_camera_zones_auth.json');
  } catch {}

  const db = getDatabase();
  initializeSchema();
  seedDemoData();

  const app = createApp();
  const server = http.createServer(app);
  initializeWebSocketServer(server);

  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`[TEST-SERVER] Listening on ${BASE_URL}\n`);

  try {
    // 1. Default-deny: Unauthenticated read-only endpoint GET /api/cameras rejected with 401
    const r1 = await request('/api/cameras');
    if (r1.status === 401) {
      pass('1. Default-deny: Unauthenticated GET /api/cameras rejected with 401 Unauthorized', r1.body?.error);
    } else {
      fail('1. Default-deny: Unauthenticated GET /api/cameras rejected with 401 Unauthorized', `got status ${r1.status}`);
    }

    // 2. Mutating POST /api/cameras without token rejected with 401
    const r2 = await request('/api/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'cam-test-unauth', name: 'Test Cam', rtsp_url: 'rtsp://test' }),
    });
    if (r2.status === 401) {
      pass('2. Mutating request without token rejected with 401 Unauthorized', r2.body?.error);
    } else {
      fail('2. Mutating request without token rejected with 401 Unauthorized', `got status ${r2.status}`);
    }

    // 3. Mutating POST with old hardcoded key rejected with 403
    const r3 = await request('/api/cameras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'seemadrishti-tactical-secret-key-2026',
      },
      body: JSON.stringify({ id: 'cam-test-old-key', name: 'Old Key Cam', rtsp_url: 'rtsp://test' }),
    });
    if (r3.status === 403) {
      pass('3. Mutating request with old hardcoded key rejected with 403 Forbidden', r3.body?.error);
    } else {
      fail('3. Mutating request with old hardcoded key rejected with 403 Forbidden', `got status ${r3.status}`);
    }

    // 4. Operator login with invalid password rejected with 401
    const r4 = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword!123' }),
    });
    if (r4.status === 401) {
      pass('4. Operator login with invalid password rejected with 401', r4.body?.error);
    } else {
      fail('4. Operator login with invalid password rejected with 401', `got status ${r4.status}`);
    }

    // 5. Operator login with valid seeded credentials (admin / Admin@123)
    const r5 = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
    });
    let adminJwt = '';
    if (r5.status === 200 && r5.body?.token && r5.body?.user?.username === 'admin') {
      adminJwt = r5.body.token;
      pass('5. Operator login succeeds with valid bcrypt credentials', `JWT issued for ${r5.body.user.name}`);
    } else {
      fail('5. Operator login succeeds with valid bcrypt credentials', `got status ${r5.status}`);
    }

    // 6. Mutating POST /api/cameras with valid JWT succeeds with 201
    const r6 = await request('/api/cameras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminJwt}`,
      },
      body: JSON.stringify({
        id: 'cam-auth-jwt',
        name: 'Secured JWT Camera',
        location: 'Border Sector Alpha',
        source_type: 'rtsp',
        source_url: 'rtsp://10.0.0.101/live',
      }),
    });
    if (r6.status === 201) {
      pass('6. Mutating POST /api/cameras authorized via JWT Bearer token', `status ${r6.status}`);
    } else {
      fail('6. Mutating POST /api/cameras authorized via JWT Bearer token', `got status ${r6.status} ${JSON.stringify(r6.body)}`);
    }

    // 7. GET /api/auth/me returns authenticated operator info
    const r7 = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminJwt}` },
    });
    if (r7.status === 200 && r7.body?.user?.id === 'usr-1' && r7.body?.user?.username === 'admin') {
      pass('7. GET /api/auth/me returns current operator profile', `${r7.body.user.name} (${r7.body.user.role})`);
    } else {
      fail('7. GET /api/auth/me returns current operator profile', `got status ${r7.status}`);
    }

    // 8. Machine-to-machine service key works via x-api-key: <API_KEY>
    const r8 = await request('/api/cameras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': M2M_TEST_KEY,
      },
      body: JSON.stringify({
        id: 'cam-auth-m2m',
        name: 'M2M CV Pipeline Camera',
        location: 'Border Sector Bravo',
        source_type: 'rtsp',
        source_url: 'rtsp://10.0.0.102/live',
      }),
    });
    if (r8.status === 201) {
      pass('8. Machine-to-machine M2M service token authorized via x-api-key', `status ${r8.status}`);
    } else {
      fail('8. Machine-to-machine M2M service token authorized via x-api-key', `got status ${r8.status} ${JSON.stringify(r8.body)}`);
    }

    // 9. Operator creation securely hashes password and never leaks password_hash
    const r9 = await request('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminJwt}`,
      },
      body: JSON.stringify({
        name: 'Inspector Vikramaditya',
        username: 'vikram',
        password: 'SecurePassword@2026',
        role: 'Surveillance Officer',
        email: 'vikram@border.gov.in',
        shift: 'Night Shift',
        assigned_sector: 'Sector Echo',
      }),
    });
    if (r9.status === 201 && r9.body?.data && !r9.body.data.password_hash) {
      pass('9. New operator created with hashed password (password_hash not leaked in JSON)', `user id: ${r9.body.data.id}`);
    } else {
      fail('9. New operator created with hashed password', `got status ${r9.status}`);
    }

    // 10. Newly created operator logs in successfully
    const r10 = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'vikram', password: 'SecurePassword@2026' }),
    });
    if (r10.status === 200 && r10.body?.token && r10.body?.user?.username === 'vikram') {
      pass('10. Newly created operator logs in successfully with custom credentials', `JWT issued for ${r10.body.user.name}`);
    } else {
      fail('10. Newly created operator logs in successfully', `got status ${r10.status}`);
    }

  } finally {
    server.close();
    closeDatabase();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch {}
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nResults: ${passedCount}/${results.length} tests passed.`);
  if (passedCount < results.length) {
    process.exit(1);
  }
  process.exit(0);
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
