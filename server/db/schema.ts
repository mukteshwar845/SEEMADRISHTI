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

    -- Correlated Incidents table (Multi-camera intelligent threat correlation - Phase 8)
    CREATE TABLE IF NOT EXISTS correlated_incidents (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
      correlation_score INTEGER NOT NULL,
      correlation_level TEXT NOT NULL CHECK(correlation_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
      started_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      camera_sequence TEXT NOT NULL,
      linked_incidents TEXT NOT NULL DEFAULT '[]',
      observations TEXT NOT NULL,
      reasons TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_corr_status ON correlated_incidents(status);
    CREATE INDEX IF NOT EXISTS idx_corr_level ON correlated_incidents(correlation_level);
    CREATE INDEX IF NOT EXISTS idx_corr_started_at ON correlated_incidents(started_at);
    CREATE INDEX IF NOT EXISTS idx_corr_last_seen_at ON correlated_incidents(last_seen_at);

    -- Environment States table (Night intelligence & low-light surveillance - Phase 9)
    CREATE TABLE IF NOT EXISTS environment_states (
      camera_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK(mode IN ('DAY', 'DAWN', 'DUSK', 'NIGHT', 'LOW_LIGHT')),
      brightness REAL NOT NULL,
      contrast REAL NOT NULL,
      visibility_score REAL NOT NULL,
      low_light INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 1.0,
      adaptive_skip INTEGER NOT NULL DEFAULT 2,
      enhancement_enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_env_mode ON environment_states(mode);
    CREATE INDEX IF NOT EXISTS idx_env_low_light ON environment_states(low_light);
    CREATE INDEX IF NOT EXISTS idx_env_updated_at ON environment_states(updated_at);

    -- Movement Analytics Aggregates (Phase 10)
    CREATE TABLE IF NOT EXISTS movement_analytics (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      zone_id TEXT,
      interval TEXT NOT NULL CHECK(interval IN ('1m', '5m', '15m', '1h')),
      bucket_start REAL NOT NULL,
      bucket_end REAL NOT NULL,
      entries INTEGER NOT NULL DEFAULT 0,
      exits INTEGER NOT NULL DEFAULT 0,
      person_count INTEGER NOT NULL DEFAULT 0,
      vehicle_count INTEGER NOT NULL DEFAULT 0,
      average_speed REAL NOT NULL DEFAULT 0.0,
      peak_occupancy INTEGER NOT NULL DEFAULT 0,
      intrusion_count INTEGER NOT NULL DEFAULT 0,
      loitering_count INTEGER NOT NULL DEFAULT 0,
      night_movement_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mva_cam_interval ON movement_analytics(camera_id, interval);
    CREATE INDEX IF NOT EXISTS idx_mva_bucket_start ON movement_analytics(bucket_start);

    -- Movement Events (Phase 10 Transitions)
    CREATE TABLE IF NOT EXISTS movement_events (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      zone_name TEXT,
      track_id INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('ENTRY', 'EXIT')),
      direction TEXT NOT NULL DEFAULT 'UNKNOWN',
      speed REAL NOT NULL DEFAULT 0.0,
      timestamp REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mve_cam_zone ON movement_events(camera_id, zone_id);
    CREATE INDEX IF NOT EXISTS idx_mve_event_type ON movement_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_mve_timestamp ON movement_events(timestamp);

    -- Zone Occupancy Current State (Phase 10)
    CREATE TABLE IF NOT EXISTS zone_occupancy (
      zone_id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      zone_name TEXT NOT NULL,
      current_occupants INTEGER NOT NULL DEFAULT 0,
      peak_occupants INTEGER NOT NULL DEFAULT 0,
      average_occupants REAL NOT NULL DEFAULT 0.0,
      class_breakdown TEXT NOT NULL DEFAULT '{}',
      is_occupied INTEGER NOT NULL DEFAULT 0,
      total_occupied_seconds REAL NOT NULL DEFAULT 0.0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_zocc_cam ON zone_occupancy(camera_id);

    -- Movement Baselines (Phase 10)
    CREATE TABLE IF NOT EXISTS movement_baselines (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      hour_bucket INTEGER NOT NULL,
      metric_name TEXT NOT NULL,
      sample_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'INSUFFICIENT_DATA',
      mean_val REAL NOT NULL DEFAULT 0.0,
      std_dev REAL NOT NULL DEFAULT 0.0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mbase_cam_zone ON movement_baselines(camera_id, zone_id, hour_bucket);

    -- Movement Anomalies (Phase 10)
    CREATE TABLE IF NOT EXISTS movement_anomalies (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      zone_id TEXT,
      anomaly_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      score INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      observed_value REAL NOT NULL,
      baseline_value REAL NOT NULL,
      deviation_ratio REAL NOT NULL,
      timestamp REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_manom_cam ON movement_anomalies(camera_id);
    CREATE INDEX IF NOT EXISTS idx_manom_severity ON movement_anomalies(severity);
    CREATE INDEX IF NOT EXISTS idx_manom_timestamp ON movement_anomalies(timestamp);

    -- Corridor Statistics (Phase 10)
    CREATE TABLE IF NOT EXISTS corridor_statistics (
      corridor_id TEXT PRIMARY KEY,
      from_camera TEXT NOT NULL,
      to_camera TEXT NOT NULL,
      traversal_count INTEGER NOT NULL DEFAULT 0,
      average_transit_time REAL NOT NULL DEFAULT 0.0,
      dominant_direction TEXT NOT NULL DEFAULT 'UNKNOWN',
      classes_observed TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0.5,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_corr_stat_from ON corridor_statistics(from_camera);
  `);
}
