import { getDatabase } from './database';

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
}
