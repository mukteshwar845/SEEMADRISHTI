import { getDatabase } from './database';

export function seedDemoData(): void {
  const db = getDatabase();

  // Check if already seeded
  const countRow: any = db.prepare('SELECT COUNT(*) as count FROM cameras').get();
  if (countRow && countRow.count > 0) {
    return; // Already populated
  }

  const now = new Date().toISOString();

  // 1. Seed Demo Cameras
  const insertCamera = db.prepare(`
    INSERT INTO cameras (id, name, location, source_type, source_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCamera.run(
    'cam-01',
    'Sector A - Urban Night Corridor [DEMO_SEED]',
    'North Arterial Roadway',
    'mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'Online',
    now,
    now
  );

  insertCamera.run(
    'cam-02',
    'Sector B - Aerial Box Junction [DEMO_SEED]',
    'Monochrome Aerial UAV Grid C-2',
    'mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'Online',
    now,
    now
  );

  insertCamera.run(
    'cam-03',
    'Sector C - Flyover Junction [DEMO_SEED]',
    'Bangkok Flyover Arterial Bridge',
    'mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'Online',
    now,
    now
  );

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
