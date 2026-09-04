/**
 * SEEMADRISHTI AI — Master Backend Automated Test Suite Runner
 *
 * Runs all backend verification and security test suites in isolated child processes:
 * 1. tests/security_integrity_regression_test.ts (Priority 0 & 1 Security & Integrity Regressions)
 * 2. tests/security_auth_test.ts (Authentication, Role-Based Access, Machine-to-Machine)
 * 3. tests/p0_hardening_test.ts (Tamper Detection, Forensics, Dev Route Blocking)
 * 4. tests/phase1_test.ts (All Phase 1 Core Backend Endpoints, CRUD & WebSocket)
 * 5. tests/webcam_e2e_test.ts (Webcam Ingestion Pipeline & Telemetry Dispatch)
 */

import { spawnSync } from 'child_process';
import path from 'path';

const testSuites = [
  { name: 'Security & Integrity Regression Suite', path: 'tests/security_integrity_regression_test.ts' },
  { name: 'Security & Auth Verification Suite', path: 'tests/security_auth_test.ts' },
  { name: 'P0 Hardening & Forensic Verification Suite', path: 'tests/p0_hardening_test.ts' },
  { name: 'Phase 1 Backend Verification Suite', path: 'tests/phase1_test.ts' },
  { name: 'Webcam Ingestion E2E Test Suite', path: 'tests/webcam_e2e_test.ts' },
];

console.log('=============================================================================');
console.log(' SEEMADRISHTI AI — EXECUTING COMPLETE BACKEND TEST RUNNER');
console.log('=============================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  console.log(`\n>>> Running: ${suite.name} (${suite.path}) ...`);
  const startTime = Date.now();

  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npx.cmd' : 'npx';
  const result = spawnSync(cmd, ['tsx', suite.path], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  if (result.status === 0) {
    console.log(`>>> [PASSED] ${suite.name} in ${durationSec}s`);
    totalPassed++;
  } else {
    console.error(`>>> [FAILED] ${suite.name} exited with code ${result.status} in ${durationSec}s`);
    totalFailed++;
    process.exit(1);
  }
}

console.log('\n=============================================================================');
console.log(` ALL BACKEND TEST SUITES COMPLETED: ${totalPassed}/${testSuites.length} SUITES PASSED`);
console.log('=============================================================================\n');
process.exit(0);
