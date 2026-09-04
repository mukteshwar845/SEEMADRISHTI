// ============================================================================
// SEEMADRISHTI AI - Phase 1 Backend Types & Data Contracts
// ============================================================================

export type CameraSourceType = 'mp4' | 'webcam' | 'rtsp';
export type CameraStatus = 'Online' | 'Degraded' | 'Offline' | 'Standby';
export type SeverityLevel = 'High' | 'Medium' | 'Low' | 'Info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

// ----------------------------------------------------------------------------
// Database Entities
// ----------------------------------------------------------------------------

export interface CameraEntity {
  id: string;
  name: string;
  location: string;
  source_type: CameraSourceType;
  source_url: string;
  status: CameraStatus;
  created_at: string;
  updated_at: string;
}

export interface ZoneEntity {
  id: string;
  camera_id: string;
  name: string;
  polygon: string; // JSON string of [[x, y], ...]
  enabled: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface EventEntity {
  id: string;
  camera_id: string;
  event_type: string;
  severity: SeverityLevel;
  object_id: string | null;
  timestamp: string;
  metadata: string | null; // JSON string
}

export interface AlertEntity {
  id: string;
  event_id: string | null;
  camera_id: string;
  severity: SeverityLevel;
  title: string;
  reason: string;
  acknowledged: number; // 0 or 1
  timestamp: string;
}

// ----------------------------------------------------------------------------
// API DTOs (Request / Response)
// ----------------------------------------------------------------------------

export interface CreateCameraDTO {
  id?: string;
  name: string;
  location: string;
  source_type: CameraSourceType;
  source_url: string;
  status?: CameraStatus;
}

export interface UpdateCameraDTO {
  name?: string;
  location?: string;
  source_type?: CameraSourceType;
  source_url?: string;
  status?: CameraStatus;
}

export interface CreateZoneDTO {
  id?: string;
  camera_id: string;
  name: string;
  polygon: [number, number][];
  enabled?: boolean;
}

export interface UpdateZoneDTO {
  name?: string;
  polygon?: [number, number][];
  enabled?: boolean;
}

export interface CreateEventDTO {
  id?: string;
  camera_id: string;
  event_type: string;
  severity: SeverityLevel;
  object_id?: string | null;
  timestamp?: string;
  metadata?: Record<string, any> | null;
}

export interface CreateAlertDTO {
  id?: string;
  event_id?: string | null;
  camera_id: string;
  severity: SeverityLevel;
  title: string;
  reason: string;
  timestamp?: string;
}

export interface AcknowledgeAlertDTO {
  operator_id?: string;
  action?: string;
}

// ----------------------------------------------------------------------------
// Incidents (Phase 7: Forensic Evidence Capture & Reconstruction)
// ----------------------------------------------------------------------------

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type EvidenceStatus = 'capturing' | 'ready' | 'failed';

export interface IncidentEntity {
  id: string;
  camera_id: string;
  track_id?: string | null;
  event_id?: string | null;
  event_type: string;
  risk_score: number;
  risk_level: RiskLevel;
  zone_name?: string | null;
  started_at: string;
  ended_at?: string | null;
  evidence_path?: string | null;
  pre_event_seconds: number;
  post_event_seconds: number;
  evidence_status: EvidenceStatus;
  metadata?: Record<string, any> | string | null;
  acknowledged: boolean | number;
  created_at: string;
  sha256?: string;
  file_size?: number;
  duration?: number;
  verification_status?: string;
}

export interface CreateIncidentDTO {
  id?: string;
  camera_id: string;
  track_id?: string | null;
  event_id?: string | null;
  event_type: string;
  risk_score: number;
  risk_level: RiskLevel;
  zone_name?: string | null;
  started_at: string;
  ended_at?: string | null;
  evidence_path?: string | null;
  pre_event_seconds?: number;
  post_event_seconds?: number;
  evidence_status?: EvidenceStatus;
  metadata?: Record<string, any> | string | null;
}

export interface UpdateIncidentDTO {
  ended_at?: string | null;
  evidence_path?: string | null;
  evidence_status?: EvidenceStatus;
  metadata?: Record<string, any> | string | null;
  acknowledged?: boolean;
}

// ----------------------------------------------------------------------------
// Multi-Camera Threat Correlation (Phase 8)
// ----------------------------------------------------------------------------

export type CorrelationStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface CorrelationObservation {
  camera_id: string;
  track_id: string;
  class_name?: string;
  event_type?: string;
  risk_score?: number;
  risk_level?: RiskLevel;
  zone_name?: string | null;
  timestamp: string;
  incident_id?: string | null;
}

export interface CorrelationReason {
  code: string;
  points: number;
  message: string;
}

export interface CorrelatedIncidentEntity {
  id: string;
  status: CorrelationStatus;
  correlation_score: number;
  correlation_level: RiskLevel;
  started_at: string;
  last_seen_at: string;
  camera_sequence: string[];
  linked_incidents: string[];
  observations: CorrelationObservation[];
  reasons: CorrelationReason[];
  created_at: string;
  updated_at: string;
}

export interface CreateCorrelationDTO {
  id?: string;
  status?: CorrelationStatus;
  correlation_score: number;
  correlation_level: RiskLevel;
  started_at: string;
  last_seen_at: string;
  camera_sequence: string[];
  linked_incidents?: string[];
  observations: CorrelationObservation[];
  reasons: CorrelationReason[];
}

export interface UpdateCorrelationDTO {
  status?: CorrelationStatus;
  correlation_score?: number;
  correlation_level?: RiskLevel;
  last_seen_at?: string;
  camera_sequence?: string[];
  linked_incidents?: string[];
  observations?: CorrelationObservation[];
  reasons?: CorrelationReason[];
}

// ----------------------------------------------------------------------------
// WebSocket Messages
// ----------------------------------------------------------------------------

export type EnvironmentMode = 'DAY' | 'DAWN' | 'DUSK' | 'NIGHT' | 'LOW_LIGHT';

export interface EnvironmentStateEntity {
  camera_id: string;
  mode: EnvironmentMode;
  brightness: number;
  contrast: number;
  visibility_score: number;
  low_light: number; // 0 or 1
  confidence: number;
  adaptive_skip: number;
  enhancement_enabled: number; // 0 or 1
  updated_at: string;
}

export interface UpdateEnvironmentDTO {
  camera_id: string;
  mode: EnvironmentMode;
  brightness: number;
  contrast: number;
  visibility_score: number;
  low_light: boolean | number;
  confidence?: number;
  adaptive_skip?: number;
  enhancement_enabled?: boolean | number;
}

// ----------------------------------------------------------------------------
// Phase 10 Movement & Flow Analytics Types
// ----------------------------------------------------------------------------

export interface MovementEventEntity {
  id: string;
  camera_id: string;
  zone_id: string;
  zone_name?: string;
  track_id: number;
  class_name: string;
  event_type: 'ENTRY' | 'EXIT';
  direction: string;
  speed: number;
  timestamp: number;
  created_at: string;
}

export interface ZoneOccupancyEntity {
  zone_id: string;
  camera_id: string;
  zone_name: string;
  current_occupants: number;
  peak_occupants: number;
  average_occupants: number;
  class_breakdown: Record<string, number> | string;
  is_occupied: number;
  total_occupied_seconds: number;
  updated_at: string;
}

export interface MovementAnomalyEntity {
  id: string;
  camera_id: string;
  zone_id?: string;
  anomaly_type: string;
  severity: RiskLevel;
  score: number;
  reason: string;
  observed_value: number;
  baseline_value: number;
  deviation_ratio: number;
  timestamp: number;
  created_at: string;
}

export interface CorridorStatisticsEntity {
  corridor_id: string;
  from_camera: string;
  to_camera: string;
  traversal_count: number;
  average_transit_time: number;
  dominant_direction: string;
  classes_observed: string[] | string;
  confidence: number;
  updated_at: string;
}

export type WebSocketMessageType =
  | 'camera_status'
  | 'detection'
  | 'tracking'
  | 'event_created'
  | 'alert_created'
  | 'alert_updated'
  | 'risk_assessment'
  | 'incident_created'
  | 'incident_acknowledged'
  | 'incident_dispatched'
  | 'incident_investigating'
  | 'incident_resolved'
  | 'evidence_ready'
  | 'correlation_created'
  | 'correlation_updated'
  | 'correlation_escalated'
  | 'environment_update'
  | 'night_movement'
  | 'movement_update'
  | 'occupancy_update'
  | 'direction_update'
  | 'analytics_anomaly'
  | 'group_movement'
  | 'ping'
  | 'pong'
  | 'connection_ack'
  | 'frame_state'
  | 'browser_webcam_frame'
  | 'webcam_frame'
  | 'phone_stream_frame'
  | 'phone_stream_status'
  | 'demo_reset'
  | 'broadcast_test';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: number;
}

// ----------------------------------------------------------------------------
// Standard API Envelope
// ----------------------------------------------------------------------------

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
