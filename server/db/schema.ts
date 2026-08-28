import { getDatabase } from './database';

export function initializeSchema(): void {
  const db = getDatabase();

  db.exec(`
    -- Cameras table
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('mp4', 'webcam', 'rtsp')),
      source_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Online' CHECK(status IN ('Online', 'Degraded', 'Offline', 'Standby')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Zones table (virtual geofences / tripwires belonging to a camera)
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      name TEXT NOT NULL,
      polygon TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );

    -- Events table (structured detection/system events from CV pipeline)
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('High', 'Medium', 'Low', 'Info')),
      object_id TEXT,
      timestamp TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );

    -- Alerts table (tactical alerts triggered by anomalous events)
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      camera_id TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('High', 'Medium', 'Low', 'Info')),
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0 CHECK(acknowledged IN (0, 1)),
      timestamp TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );

    -- Incidents table (forensic video evidence packages for HIGH & CRITICAL events)
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      track_id TEXT,
      event_id TEXT,
      event_type TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
      zone_name TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      evidence_path TEXT,
      pre_event_seconds REAL NOT NULL DEFAULT 10.0,
      post_event_seconds REAL NOT NULL DEFAULT 10.0,
      evidence_status TEXT NOT NULL DEFAULT 'capturing' CHECK(evidence_status IN ('capturing', 'ready', 'failed')),
      metadata TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0 CHECK(acknowledged IN (0, 1)),
      created_at TEXT NOT NULL,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    );

    -- Indexes for high-frequency queries and joins
    CREATE INDEX IF NOT EXISTS idx_zones_camera_id ON zones(camera_id);
    CREATE INDEX IF NOT EXISTS idx_events_camera_id ON events(camera_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_camera_id ON alerts(camera_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_incidents_camera_id ON incidents(camera_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_risk_level ON incidents(risk_level);
    CREATE INDEX IF NOT EXISTS idx_incidents_evidence_status ON incidents(evidence_status);
    CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
  `);
}
