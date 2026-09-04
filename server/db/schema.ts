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
      source_type TEXT NOT NULL DEFAULT 'fixture' CHECK(source_type IN ('live_camera', 'browser_webcam', 'rtsp', 'fixture', 'test', 'seed')),
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

    -- Operator Actions Audit Table (Phase 15 - Part I)
    CREATE TABLE IF NOT EXISTS operator_actions (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      operator TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      previous_state TEXT,
      new_state TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_op_actions_timestamp ON operator_actions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_op_actions_action ON operator_actions(action);
    CREATE INDEX IF NOT EXISTS idx_op_actions_target ON operator_actions(target_type, target_id);

    -- System Operational Lifecycle Events (Phase 15 - Part U)
    CREATE TABLE IF NOT EXISTS system_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sys_events_timestamp ON system_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sys_events_type ON system_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_sys_events_severity ON system_events(severity);

    -- Service Heartbeats (Phase 15 - Part E)
    CREATE TABLE IF NOT EXISTS system_heartbeats (
      service TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      process_id INTEGER,
      version TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'OFFLINE')),
      latency_ms REAL NOT NULL DEFAULT 0.0,
      metadata TEXT,
      updated_at TEXT NOT NULL
    );

    -- Personnel & Operators table (Priority 2 reality wiring & per-operator auth)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      shift TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'on_duty', 'off_duty')),
      assigned_sector TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- Threat Behavior Chains table (Phase 19 Signature Feature)
    CREATE TABLE IF NOT EXISTS behavior_chains (
      id TEXT PRIMARY KEY,
      chain_id TEXT NOT NULL UNIQUE,
      track_id INTEGER NOT NULL,
      correlation_id TEXT,
      camera_id TEXT NOT NULL,
      camera_ids TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ESCALATING', 'CRITICAL', 'INCIDENT_CREATED', 'RESOLVED', 'EXPIRED')),
      started_at REAL NOT NULL,
      updated_at REAL NOT NULL,
      events TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'LOW',
      behavior_pattern TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.0,
      confidence_label TEXT NOT NULL DEFAULT 'INSUFFICIENT DATA',
      evidence TEXT NOT NULL,
      explanation TEXT,
      risk_contributions TEXT,
      incident_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_behavior_chains_track ON behavior_chains(camera_id, track_id);
    CREATE INDEX IF NOT EXISTS idx_behavior_chains_pattern ON behavior_chains(behavior_pattern);
    CREATE INDEX IF NOT EXISTS idx_behavior_chains_incident ON behavior_chains(incident_id);

    -- Sensor Pairings table (Tactical Edge Sensor Ingestion)
    CREATE TABLE IF NOT EXISTS sensor_pairings (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      camera_id TEXT NOT NULL,
      operator_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAIRED', 'EXPIRED', 'CANCELLED')),
      sensor_id TEXT,
      transport TEXT NOT NULL DEFAULT 'WS',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      paired_at TEXT,
      last_seen TEXT,
      metadata TEXT,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_pairings_status ON sensor_pairings(status);
    CREATE INDEX IF NOT EXISTS idx_sensor_pairings_camera ON sensor_pairings(camera_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_pairings_hash ON sensor_pairings(token_hash);
  `);

  // Migrations for existing database instances
  try {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
  } catch {}
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  } catch {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN source_type TEXT NOT NULL DEFAULT 'fixture';`);
  } catch {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_source_type ON events(source_type);`);
  } catch {}
}
