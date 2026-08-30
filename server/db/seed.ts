import { getDatabase } from './database';
import bcrypt from 'bcryptjs';

export function seedDemoData(): void {
  const db = getDatabase();

  // Check if already seeded
  const countRow: any = db.prepare('SELECT COUNT(*) as count FROM cameras').get();
  if (countRow && countRow.count > 0) {
    return; // Already populated
  }

  const now = new Date().toISOString();

  // 1. Seed Demo Cameras (cam-01 through cam-09)
  const canonicalCameras = [
    { id: 'cam-01', name: 'Sector Alpha Main Gate', location: 'North Arterial Roadway', source_url: 'cv_service/tests/fixtures/intrusion_test.mp4' },
    { id: 'cam-02', name: 'Sector Bravo Perimeter', location: 'Inner Exclusion Fence', source_url: 'cv_service/tests/fixtures/loitering_test.mp4' },
    { id: 'cam-03', name: 'Sector Charlie Vehicle Checkpoint', location: 'Approach Corridor', source_url: 'cv_service/tests/fixtures/moving_objects.mp4' },
    { id: 'cam-04', name: 'Sector Delta Checkpost', location: 'Tactical Post 4', source_url: 'cv_service/tests/fixtures/sample_test.mp4' },
    { id: 'cam-05', name: 'Sector Echo Forest Canopy', location: 'Dense Foliage Segment', source_url: 'cv_service/tests/fixtures/sample_test.mp4' },
    { id: 'cam-06', name: 'Sector Foxtrot Mountain Pass', location: 'High Altitude Transit', source_url: 'cv_service/tests/fixtures/intrusion_test.mp4' },
    { id: 'cam-07', name: 'Sector Golf Desert Outpost', location: 'Southern Ridge Desert', source_url: 'cv_service/tests/fixtures/loitering_test.mp4' },
    { id: 'cam-08', name: 'Sector Hotel Logistics Gate', location: 'Heavy Transport Barrier', source_url: 'cv_service/tests/fixtures/moving_objects.mp4' },
    { id: 'cam-09', name: 'Sector India Coastal Guard', location: 'Waterway Shoreline', source_url: 'cv_service/tests/fixtures/sample_test.mp4' },
  ];

  const insertCamera = db.prepare(`
    INSERT INTO cameras (id, name, location, source_type, source_url, status, created_at, updated_at)
    VALUES (?, ?, ?, 'mp4', ?, 'Online', ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  for (const cam of canonicalCameras) {
    insertCamera.run(cam.id, cam.name, cam.location, cam.source_url, now, now);
  }

  // 2. Seed Demo Zones
  const insertZone = db.prepare(`
    INSERT INTO zones (id, camera_id, name, polygon, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertZone.run(
    'zone-01',
    'cam-01',
    'Sector A Restricted Line [DEMO_SEED]',
    JSON.stringify([[0.1, 0.8], [0.9, 0.8], [0.9, 0.95], [0.1, 0.95]]),
    1,
    now,
    now
  );

  insertZone.run(
    'zone-02',
    'cam-02',
    'Yellow Box Ingress Zone [DEMO_SEED]',
    JSON.stringify([[0.2, 0.3], [0.8, 0.3], [0.8, 0.7], [0.2, 0.7]]),
    1,
    now,
    now
  );

  // 3. Seed Demo Event
  const insertEvent = db.prepare(`
    INSERT INTO events (id, camera_id, event_type, severity, object_id, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run(
    'evt-seed-01',
    'cam-01',
    'BASELINE_CALIBRATION',
    'Info',
    'obj-seed-01',
    now,
    JSON.stringify({ note: 'System gateway initialized with seed configuration', source: 'DEMO_SEED' })
  );

  // 4. Seed Demo Alert
  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, event_id, camera_id, severity, title, reason, acknowledged, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  insertAlert.run(
    'alt-seed-01',
    'evt-seed-01',
    'cam-01',
    'Low',
    'System Calibration Baseline Verification [DEMO_SEED]',
    'Edge node baseline calibration recorded upon Phase 1 initialization.',
    0,
    now
  );

  // 5. Seed Forensic Incidents (INC-000001 through INC-000005)
  const insertIncident = db.prepare(`
    INSERT INTO incidents (
      id, camera_id, track_id, event_id, event_type, risk_score, risk_level, zone_name,
      started_at, ended_at, evidence_path, pre_event_seconds, post_event_seconds,
      evidence_status, metadata, acknowledged, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      camera_id=excluded.camera_id,
      risk_score=excluded.risk_score,
      risk_level=excluded.risk_level,
      event_type=excluded.event_type,
      zone_name=excluded.zone_name,
      evidence_path=excluded.evidence_path,
      metadata=excluded.metadata,
      evidence_status=excluded.evidence_status
  `);

    const demoIncidents = [
      {
        id: 'INC-000001',
        camera_id: 'cam-02',
        track_id: 'TRK-992',
        event_id: 'evt-seed-01',
        event_type: 'PERIMETER_SCALING',
        risk_score: 98,
        risk_level: 'CRITICAL',
        zone_name: 'Sector Bravo Restricted Line',
        started_at: '2026-08-24T02:14:03Z',
        ended_at: '2026-08-24T02:15:18Z',
        evidence_path: 'evidence/INC-000001.mp4',
        pre_event_seconds: 10,
        post_event_seconds: 10,
        evidence_status: 'ready',
        metadata: JSON.stringify({
          class_name: 'person',
          confidence: 0.96,
          sha256: 'b634706cc8b10b7ab87988e50c20e78ce4589258df9a5621415174577884d8a2',
          verification_status: 'VERIFIED',
          reasons: [
            { code: 'RESTRICTED_FENCE_SCALING', description: 'Restricted Fence Scaling', points: 35 },
            { code: 'ZONE_VIOLATION', description: 'Restricted Fence Line Incursion', points: 30 },
            { code: 'DWELL_VIOLATION', description: 'Dwell Time 42s (Threshold 15s)', points: 25 },
            { code: 'NIGHT_INCIDENT', description: 'Night Operation (02:14 AM)', points: 10 },
          ],
        }),
        acknowledged: 0,
        created_at: '2026-08-24T02:14:03Z',
      },
      {
        id: 'INC-000002',
        camera_id: 'cam-03',
        track_id: 'TRK-408',
        event_id: null,
        event_type: 'UNATTENDED_CARGO',
        risk_score: 89,
        risk_level: 'CRITICAL',
        zone_name: 'Ammunition Airlock Level 2',
        started_at: '2026-08-24T03:41:18Z',
        ended_at: '2026-08-24T03:42:48Z',
        evidence_path: 'evidence/INC-000002.mp4',
        pre_event_seconds: 10,
        post_event_seconds: 10,
        evidence_status: 'ready',
        metadata: JSON.stringify({
          class_name: 'backpack',
          confidence: 0.92,
          sha256: '7c89f1d0b3456a89cde9123456789abcdef0123456789abcdef0123456789abc',
          verification_status: 'VERIFIED',
          reasons: [
            { code: 'UNATTENDED_PAYLOAD', description: 'Abandoned Heavy Payload Deposit', points: 35 },
            { code: 'ZONE_RESTRICTED', description: 'Armory Ingress Zone Violation', points: 30 },
            { code: 'DWELL_VIOLATION', description: 'Dwell Time 58s (Threshold 30s)', points: 25 },
            { code: 'ZERO_SHIFT', description: 'Zero Shift (03:41 AM)', points: 10 },
          ],
        }),
        acknowledged: 0,
        created_at: '2026-08-24T03:41:18Z',
      },
      {
        id: 'INC-000003',
        camera_id: 'cam-01',
        track_id: 'TRK-7819',
        event_id: null,
        event_type: 'ANOMALOUS_VEHICLE',
        risk_score: 78,
        risk_level: 'HIGH',
        zone_name: 'Main Barrier Buffer',
        started_at: '2026-08-24T04:12:55Z',
        ended_at: '2026-08-24T04:13:55Z',
        evidence_path: 'evidence/INC-000003.mp4',
        pre_event_seconds: 10,
        post_event_seconds: 10,
        evidence_status: 'ready',
        metadata: JSON.stringify({
          class_name: 'car',
          confidence: 0.94,
          sha256: '9f8e7d6c5b4a39281701f2e3d4c5b6a7890123456789abcdef0123456789abcd',
          verification_status: 'VERIFIED',
          reasons: [
            { code: 'REVERSE_TRAJECTORY', description: 'Abrupt Reverse Acceleration at Gate', points: 35 },
            { code: 'UNREGISTERED_ANPR', description: 'Unmatched ANPR License Plate', points: 25 },
            { code: 'BUFFER_ZONE', description: 'Barrier Gate Buffer Incursion', points: 20 },
          ],
        }),
        acknowledged: 0,
        created_at: '2026-08-24T04:12:55Z',
      },
      {
        id: 'INC-000004',
        camera_id: 'cam-04',
        track_id: 'TRK-2201',
        event_id: null,
        event_type: 'GROUP_LOITERING',
        risk_score: 82,
        risk_level: 'HIGH',
        zone_name: 'Sector Delta Outer Trench',
        started_at: '2026-08-24T05:03:12Z',
        ended_at: '2026-08-24T05:04:30Z',
        evidence_path: 'evidence/INC-000004.mp4',
        pre_event_seconds: 10,
        post_event_seconds: 10,
        evidence_status: 'ready',
        metadata: JSON.stringify({
          class_name: 'person',
          confidence: 0.91,
          sha256: '4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123',
          verification_status: 'VERIFIED',
          reasons: [
            { code: 'GROUP_FORMATION', description: 'Coordinated Multi-Target Gathering', points: 40 },
            { code: 'PROLONGED_LOITER', description: 'Dwell Threshold Exceeded (64s)', points: 30 },
            { code: 'BLIND_SPOT_CONVERGENCE', description: 'Approach via Ridge Blind Spot', points: 15 },
          ],
        }),
        acknowledged: 0,
        created_at: '2026-08-24T05:03:12Z',
      },
      {
        id: 'INC-000005',
        camera_id: 'cam-05',
        track_id: 'TRK-8834',
        event_id: null,
        event_type: 'CANOPY_CROSSING',
        risk_score: 91,
        risk_level: 'CRITICAL',
        zone_name: 'Sector Echo Ridge Canopy',
        started_at: '2026-08-24T06:19:40Z',
        ended_at: '2026-08-24T06:21:00Z',
        evidence_path: 'evidence/INC-000005.mp4',
        pre_event_seconds: 10,
        post_event_seconds: 10,
        evidence_status: 'ready',
        metadata: JSON.stringify({
          class_name: 'person',
          confidence: 0.95,
          sha256: '1a2b3c4d5e6f7890123456789abcdef0123456789abcdef0123456789abcdef0',
          verification_status: 'VERIFIED',
          reasons: [
            { code: 'FOLIAGE_BREACH', description: 'Camouflaged Infiltration Under Dense Canopy', points: 40 },
            { code: 'THERMAL_HEAT_ANOMALY', description: 'Distinct Bipedal Thermal Signature', points: 35 },
            { code: 'SPEED_BURST', description: 'High Velocity Transit through Neutral Zone', points: 20 },
          ],
        }),
        acknowledged: 0,
        created_at: '2026-08-24T06:19:40Z',
      },
    ];

    for (const inc of demoIncidents) {
      insertIncident.run(
        inc.id,
        inc.camera_id,
        inc.track_id,
        inc.event_id,
        inc.event_type,
        inc.risk_score,
        inc.risk_level,
        inc.zone_name,
        inc.started_at,
        inc.ended_at,
        inc.evidence_path,
        inc.pre_event_seconds,
        inc.post_event_seconds,
        inc.evidence_status,
        inc.metadata,
        inc.acknowledged,
        inc.created_at
      );
    }

  // 6. Seed Personnel & Operators (Users) with bcrypt hashed credentials
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, username, password_hash, name, role, email, shift, status, assigned_sector, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      password_hash = excluded.password_hash
  `);

  const demoUsers = [
    {
      id: 'usr-1',
      username: 'admin',
      password: 'Admin@123',
      name: 'Major Vikram Sen',
      role: 'Commander',
      email: 'v.sen@surveillance.seemadrishti.gov',
      shift: 'Day Shift (0600 - 1800)',
      status: 'on_duty',
      assigned_sector: 'All Border Sectors',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr-2',
      username: 'operator',
      password: 'Operator@123',
      name: 'Officer Rajesh Kumar',
      role: 'Surveillance Operator',
      email: 'r.kumar@surveillance.seemadrishti.gov',
      shift: 'Day Shift (0600 - 1800)',
      status: 'on_duty',
      assigned_sector: 'Gate Alpha & Checkpoint 1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr-3',
      username: 'patrol',
      password: 'Patrol@123',
      name: 'Havaldar Amit Patel',
      role: 'Patrol Officer',
      email: 'a.patel@surveillance.seemadrishti.gov',
      shift: 'Rotational 24/7',
      status: 'active',
      assigned_sector: 'East Perimeter Border Fence',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr-4',
      username: 'analyst',
      password: 'Analyst@123',
      name: 'Dr. Ananya Sharma',
      role: 'AI Analyst',
      email: 'a.sharma@seemadrishti.ai',
      shift: 'Standard (0900 - 1700)',
      status: 'active',
      assigned_sector: 'Neural Net Model Training',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const u of demoUsers) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    insertUser.run(
      u.id,
      u.username,
      passwordHash,
      u.name,
      u.role,
      u.email,
      u.shift,
      u.status,
      u.assigned_sector,
      u.created_at,
      u.updated_at
    );
  }
}
