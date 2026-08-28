/**
 * SEEMADRISHTI AI - Frontend API Integration Service (Phase 1)
 *
 * NOTE: For Phase 1, the frontend continues to use its existing local mockData
 * to prevent any visual or behavioural regressions. This API client provides the
 * prepared communication layer to be wired into UI components in Phase 2+.
 */

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
  }

  return data;
}

// ----------------------------------------------------------------------------
// Health Check
// ----------------------------------------------------------------------------

export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  return request<{ status: string; service: string }>('/health');
}

// ----------------------------------------------------------------------------
// Camera Endpoints
// ----------------------------------------------------------------------------

export interface CameraRecord {
  id: string;
  name: string;
  location: string;
  source_type: 'mp4' | 'webcam' | 'rtsp';
  source_url: string;
  status: 'Online' | 'Degraded' | 'Offline' | 'Standby';
  created_at: string;
  updated_at: string;
}

export async function fetchCameras(status?: string): Promise<{ success: boolean; data: CameraRecord[] }> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/cameras${query}`);
}

export async function fetchCameraById(id: string): Promise<{ success: boolean; data: CameraRecord }> {
  return request(`/cameras/${encodeURIComponent(id)}`);
}

export async function createCamera(camera: Partial<CameraRecord>): Promise<{ success: boolean; data: CameraRecord }> {
  return request('/cameras', {
    method: 'POST',
    body: JSON.stringify(camera),
  });
}

export async function updateCamera(id: string, camera: Partial<CameraRecord>): Promise<{ success: boolean; data: CameraRecord }> {
  return request(`/cameras/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(camera),
  });
}

export async function deleteCamera(id: string): Promise<{ success: boolean; message: string }> {
  return request(`/cameras/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ----------------------------------------------------------------------------
// Zone Endpoints
// ----------------------------------------------------------------------------

export interface ZoneRecord {
  id: string;
  camera_id: string;
  name: string;
  polygon: [number, number][];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchZones(cameraId?: string): Promise<{ success: boolean; data: ZoneRecord[] }> {
  const query = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
  return request(`/zones${query}`);
}

export async function createZone(zone: Partial<ZoneRecord>): Promise<{ success: boolean; data: ZoneRecord }> {
  return request('/zones', {
    method: 'POST',
    body: JSON.stringify(zone),
  });
}

export async function updateZone(id: string, zone: Partial<ZoneRecord>): Promise<{ success: boolean; data: ZoneRecord }> {
  return request(`/zones/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(zone),
  });
}

export async function deleteZone(id: string): Promise<{ success: boolean; message: string }> {
  return request(`/zones/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ----------------------------------------------------------------------------
// Event Endpoints
// ----------------------------------------------------------------------------

export interface EventRecord {
  id: string;
  camera_id: string;
  event_type: string;
  severity: 'High' | 'Medium' | 'Low' | 'Info';
  object_id: string | null;
  timestamp: string;
  metadata: any;
}

export async function fetchEvents(filters: {
  camera_id?: string;
  severity?: string;
  event_type?: string;
  limit?: number;
} = {}): Promise<{ success: boolean; data: EventRecord[] }> {
  const params = new URLSearchParams();
  if (filters.camera_id) params.set('camera_id', filters.camera_id);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.event_type) params.set('event_type', filters.event_type);
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/events${qs}`);
}

// ----------------------------------------------------------------------------
// Alert Endpoints
// ----------------------------------------------------------------------------

export interface AlertRecord {
  id: string;
  event_id: string | null;
  camera_id: string;
  severity: 'High' | 'Medium' | 'Low' | 'Info';
  title: string;
  reason: string;
  acknowledged: boolean;
  timestamp: string;
}

export async function fetchAlerts(filters: {
  camera_id?: string;
  severity?: string;
  acknowledged?: boolean;
  limit?: number;
} = {}): Promise<{ success: boolean; data: AlertRecord[] }> {
  const params = new URLSearchParams();
  if (filters.camera_id) params.set('camera_id', filters.camera_id);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.acknowledged !== undefined) params.set('acknowledged', String(filters.acknowledged));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/alerts${qs}`);
}

export async function acknowledgeAlert(
  id: string,
  payload: { operator_id?: string; action?: string } = {}
): Promise<{ success: boolean; data: AlertRecord }> {
  return request(`/alerts/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------------------------------
// Telemetry
// ----------------------------------------------------------------------------

export async function fetchSystemTelemetry(): Promise<{ success: boolean; data: any }> {
  return request('/telemetry');
}

// ----------------------------------------------------------------------------
// Phase 10 Movement, Traffic Flow & Behavior Analytics
// ----------------------------------------------------------------------------

export interface MovementAnalytics {
  camera_id: string;
  total_entries: number;
  total_exits: number;
  current_occupants: number;
  zones_monitored: number;
  active_zones: OccupancyStats[];
  top_corridors: CorridorStats[];
  recent_anomalies: MovementAnomaly[];
}

export interface DirectionStats {
  direction: string;
  count: number;
}

export interface OccupancyStats {
  zone_id: string;
  camera_id: string;
  zone_name: string;
  current_occupants: number;
  peak_occupants: number;
  average_occupants: number;
  class_breakdown: Record<string, number>;
  is_occupied?: boolean;
}

export interface DensityStats {
  row: number;
  col: number;
  bounds: { x1: number; y1: number; x2: number; y2: number };
  visits: number;
  dwell_frames: number;
  movement_count: number;
}

export interface MovementAnomaly {
  id: string;
  camera_id: string;
  zone_id?: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  reason: string;
  observed_value?: number;
  baseline_value?: number;
  deviation_ratio?: number;
  timestamp: number;
}

export interface CorridorStats {
  corridor_id: string;
  from_camera: string;
  to_camera: string;
  traversal_count: number;
  average_transit_time: number;
  dominant_direction: string;
  confidence: number;
}

export async function fetchAnalyticsSummary(cameraId?: string): Promise<{ success: boolean; data: MovementAnalytics }> {
  const query = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
  return request(`/analytics/summary${query}`);
}

export async function fetchMovementEvents(filters: {
  camera_id?: string;
  zone_id?: string;
  event_type?: 'ENTRY' | 'EXIT';
  limit?: number;
} = {}): Promise<{ success: boolean; data: any[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.camera_id) params.set('camera_id', filters.camera_id);
  if (filters.zone_id) params.set('zone_id', filters.zone_id);
  if (filters.event_type) params.set('event_type', filters.event_type);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/analytics/movement${qs}`);
}

export async function fetchOccupancy(cameraId?: string): Promise<{ success: boolean; data: OccupancyStats[] }> {
  const query = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
  return request(`/analytics/occupancy${query}`);
}

export async function fetchMovementAnomalies(cameraId?: string): Promise<{ success: boolean; data: MovementAnomaly[] }> {
  const query = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
  return request(`/analytics/anomalies${query}`);
}

export async function fetchCorridors(): Promise<{ success: boolean; data: CorridorStats[] }> {
  return request('/analytics/corridors');
}

// ----------------------------------------------------------------------------
// Phase 7 Incident Evidence & Forensics Endpoints
// ----------------------------------------------------------------------------

export interface IncidentRecord {
  id: string;
  camera_id: string;
  track_id: string | null;
  event_id: string | null;
  event_type: string;
  risk_score: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  zone_name: string | null;
  started_at: string;
  ended_at: string | null;
  evidence_path: string | null;
  pre_event_seconds: number;
  post_event_seconds: number;
  evidence_status: 'capturing' | 'ready' | 'failed';
  metadata: any;
  acknowledged: boolean;
  created_at: string;
}

export async function fetchIncidents(filters: {
  camera_id?: string;
  risk_level?: string;
  evidence_status?: string;
  acknowledged?: boolean;
  limit?: number;
} = {}): Promise<{ success: boolean; data: IncidentRecord[]; count: number; total: number }> {
  const params = new URLSearchParams();
  if (filters.camera_id) params.set('camera_id', filters.camera_id);
  if (filters.risk_level) params.set('risk_level', filters.risk_level);
  if (filters.evidence_status) params.set('evidence_status', filters.evidence_status);
  if (filters.acknowledged !== undefined) params.set('acknowledged', String(filters.acknowledged));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/incidents${qs}`);
}

export async function fetchIncidentById(id: string): Promise<{ success: boolean; data: IncidentRecord }> {
  return request(`/incidents/${encodeURIComponent(id)}`);
}

export function getIncidentEvidenceUrl(id: string): string {
  return `/api/incidents/${encodeURIComponent(id)}/evidence`;
}

export function getIncidentDownloadUrl(id: string): string {
  return `/api/incidents/${encodeURIComponent(id)}/download`;
}

export async function acknowledgeIncident(id: string, operatorId: string = 'OPERATOR-01'): Promise<{ success: boolean; data: IncidentRecord }> {
  return request(`/incidents/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ operator_id: operatorId }),
  });
}

// ----------------------------------------------------------------------------
// Phase 8 Multi-Camera Correlation Endpoints
// ----------------------------------------------------------------------------

export interface CorrelatedIncidentRecord {
  id: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  correlation_score: number;
  correlation_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  started_at: string;
  last_seen_at: string;
  camera_sequence: string[];
  linked_incidents: string[];
  observations: Array<{
    camera_id: string;
    timestamp: string;
    track_id?: number | string;
    class_name?: string;
    direction?: string;
    speed?: number;
    risk_score?: number;
  }>;
  reasons: Array<{
    code: string;
    points: number;
    message: string;
  }>;
  created_at: string;
  updated_at: string;
}

export async function fetchCorrelations(filters: {
  status?: string;
  correlation_level?: string;
  camera_id?: string;
  limit?: number;
} = {}): Promise<{ success: boolean; data: CorrelatedIncidentRecord[]; count: number; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.correlation_level) params.set('correlation_level', filters.correlation_level);
  if (filters.camera_id) params.set('camera_id', filters.camera_id);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/correlations${qs}`);
}

export async function fetchActiveCorrelations(): Promise<{ success: boolean; data: CorrelatedIncidentRecord[]; count: number }> {
  return request('/correlations/active');
}

export async function fetchCorrelationById(id: string): Promise<{ success: boolean; data: CorrelatedIncidentRecord }> {
  return request(`/correlations/${encodeURIComponent(id)}`);
}

// ----------------------------------------------------------------------------
// Phase 9 Environment States Endpoints
// ----------------------------------------------------------------------------

export interface EnvironmentRecord {
  camera_id: string;
  mode: 'DAY' | 'DAWN' | 'DUSK' | 'NIGHT' | 'LOW_LIGHT';
  brightness: number;
  contrast: number;
  visibility_score: number;
  low_light: boolean;
  confidence: number;
  adaptive_skip: number;
  enhancement_enabled: boolean;
  updated_at: string;
}

export async function fetchEnvironmentStates(): Promise<{ success: boolean; data: EnvironmentRecord[] }> {
  return request('/environment');
}

export async function fetchCameraEnvironment(cameraId: string): Promise<{ success: boolean; data: EnvironmentRecord }> {
  return request(`/environment/${encodeURIComponent(cameraId)}`);
}

// ----------------------------------------------------------------------------
// Phase 12 Final System Integration, Normalization & Telemetry
// ----------------------------------------------------------------------------

export function normalizeCameraId(id: string | number | undefined | null): string {
  if (!id) return 'cam-1';
  const clean = String(id).trim().toLowerCase();
  const match = clean.match(/^cam[-_]?0*(\d+)$/);
  if (match) return `cam-${parseInt(match[1], 10)}`;
  const digitMatch = clean.match(/^(\d+)$/);
  if (digitMatch) return `cam-${parseInt(digitMatch[1], 10)}`;
  return clean;
}

export function areCameraIdsEqual(idA: string | number | undefined | null, idB: string | number | undefined | null): boolean {
  if (!idA || !idB) return false;
  return normalizeCameraId(idA) === normalizeCameraId(idB);
}

export interface BackendTelemetryPayload {
  node: {
    hostname: string;
    platform: string;
    arch: string;
    uptimeSeconds: number;
    nodeVersion: string;
  };
  hardware: {
    cpuCores: number;
    cpuModel: string;
    loadAverage: number[];
    memoryUsedGb: number;
    memoryTotalGb: number;
    memoryUsagePercent: number;
  };
  database: {
    totalCameras: number;
    totalZones: number;
    totalEvents: number;
    totalAlerts: number;
    activeAlerts: number;
  };
  websocket: {
    connectedClients: number;
  };
}

export async function fetchTelemetry(): Promise<{ success: boolean; data: BackendTelemetryPayload; timestamp: string }> {
  return request('/telemetry');
}

export async function measureNetworkPing(endpoint: string = '/api/health'): Promise<{ rttMs: number; status: number; ok: boolean }> {
  const t0 = performance.now();
  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    const rttMs = Math.max(1, Math.round(performance.now() - t0));
    return { rttMs, status: res.status, ok: res.ok };
  } catch {
    const rttMs = Math.max(1, Math.round(performance.now() - t0));
    return { rttMs, status: 0, ok: false };
  }
}

export function exportDetectionsCSV(detections: any[]): void {
  const headers = ['Detection ID', 'Camera Node', 'Location', 'Class Label', 'Confidence (%)', 'Risk Score', 'Timestamp'];
  const rows = detections.map((d) => [
    `"${d.id || ''}"`,
    `"${d.camera || ''}"`,
    `"${d.location || ''}"`,
    `"${d.label || ''}"`,
    typeof d.confidence === 'number' ? (d.confidence > 1 ? d.confidence : d.confidence * 100).toFixed(1) : 'N/A',
    d.riskScore ?? 'N/A',
    `"${d.time || new Date().toISOString()}"`,
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seemadrishti_neural_detections_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAnalyticsSummaryJSON(summary: any, occupancy: any[], anomalies: any[], corridors: any[]): void {
  const exportPayload = {
    report: 'SEEMADRISHTI AI — Traffic Flow, Movement & Behavior Intelligence Dossier',
    export_timestamp: new Date().toISOString(),
    engine: 'Phase 10 & 12 Advanced Analytics Engine',
    system_mode: 'OPERATIONAL',
    summary,
    monitored_occupancy: occupancy,
    statistical_anomalies: anomalies,
    corridor_transits: corridors,
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seemadrishti_analytics_dossier_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

