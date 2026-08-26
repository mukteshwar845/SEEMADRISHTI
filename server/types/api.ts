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
// WebSocket Messages
// ----------------------------------------------------------------------------

export type WebSocketMessageType =
  | 'camera_status'
  | 'detection'
  | 'tracking'
  | 'event_created'
  | 'alert_created'
  | 'alert_updated'
  | 'ping'
  | 'pong'
  | 'connection_ack'
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
