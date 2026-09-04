/**
 * SEEMADRISHTI AI - Frontend API Integration Service (Phase 1)
 *
 * NOTE: For Phase 1, the frontend continues to use its existing local mockData
 * to prevent any visual or behavioural regressions. This API client provides the
 * prepared communication layer to be wired into UI components in Phase 2+.
 */

const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Dynamic per-operator session token stored in memory/localStorage (never hardcoded)
let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('seemadrishti_auth_token') : null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('seemadrishti_auth_token', token);
    } else {
      localStorage.removeItem('seemadrishti_auth_token');
    }
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    if (
      response.status === 401 ||
      (response.status === 403 &&
        (data.error?.includes('token') ||
          data.error?.includes('expired') ||
          data.error?.includes('invalid') ||
          data.error?.includes('denied')))
    ) {
      if (authToken) {
        setAuthToken(null);
      }
    }
    throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
  }

  return data;
}

// ----------------------------------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  shift: string;
  status: string;
  assigned_sector: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: UserProfile;
  message?: string;
}

export interface RoleInfo {
  id: string;
  title: string;
  code: string;
  description: string;
  clearanceColor: string;
}

export async function loginOperator(username: string, password: string): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

export interface RegisterPayload {
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
  shift?: string;
  assigned_sector?: string;
}

export async function registerOperator(payload: RegisterPayload): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

export async function fetchAuthRoles(): Promise<{ success: boolean; data: RoleInfo[] }> {
  return request<{ success: boolean; data: RoleInfo[] }>('/auth/roles');
}

export async function getCurrentOperator(): Promise<{ success: boolean; user: UserProfile }> {
  return request<{ success: boolean; user: UserProfile }>('/auth/me');
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  shift?: string;
  assigned_sector?: string;
  password?: string;
}

export async function updateOperatorProfile(
  payload: UpdateProfilePayload
): Promise<{ success: boolean; user: UserProfile; message?: string }> {
  return request<{ success: boolean; user: UserProfile; message?: string }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function logoutOperator(): Promise<{ success: boolean }> {
  setAuthToken(null);
  return request<any>('/auth/logout', { method: 'POST' });
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

export interface AnalyticsTimelinePoint {
  hour: string;
  hourIndex: number;
  totalDetections: number;
  person: number;
  vehicle: number;
  intrusion: number;
  noHelmet: number;
  loitering: number;
  abandoned: number;
  totalAnomalies: number;
  anomalyRate: number;
  riskIndex: number;
}

export interface CameraAnalyticsSummaryItem {
  camera: string;
  code: string;
  cameraId: string;
  name: string;
  location: string;
  total: number;
  anomalies: number;
  normal: number;
  rate: string;
  riskLevel: string;
  color: string;
  status: string;
}

export interface ClassDistributionItem {
  name: string;
  count: number;
  color: string;
  percentage: number;
  isAnomaly: boolean;
}

export interface RadarThreatItem {
  subject: string;
  CAM1?: number;
  CAM2?: number;
  CAM3?: number;
  CAM4?: number;
  CAM5?: number;
  CAM6?: number;
  [key: string]: any;
}

export interface AnalyticsHistoryResponse {
  success: boolean;
  range: string;
  camera_id: string;
  summary_stats: {
    totalDetections: number;
    totalAnomalies: number;
    totalIntrusions: number;
    avgConfidence: number;
    avgAnomalyRate: number;
    peakHour: string;
    meanInterceptTime: string;
  };
  timeline: AnalyticsTimelinePoint[];
  full_24h_timeline: AnalyticsTimelinePoint[];
  camera_summary: CameraAnalyticsSummaryItem[];
  detection_types: ClassDistributionItem[];
  radar_threat_distribution: RadarThreatItem[];
  most_active: {
    most_active_camera: string;
    most_active_zone: string;
    most_common_class: string;
    most_frequent_event: string;
  };
  timestamp: string;
}

export async function fetchAnalyticsHistory(range: string = '24h', cameraId?: string): Promise<AnalyticsHistoryResponse> {
  const params = new URLSearchParams();
  params.set('range', range);
  if (cameraId && cameraId !== 'all' && cameraId !== 'ALL') {
    params.set('camera_id', cameraId);
  }
  return request(`/analytics/history?${params.toString()}`);
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
  sha256?: string;
  file_size?: number;
  duration?: number;
  verification_status?: string;
}

export interface EvidenceStorageStats {
  storageUsedBytes: number;
  storageUsedMb: number;
  totalClips: number;
  oldestClip: string | null;
  newestClip: string | null;
  evidenceDirectory: string;
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
  const token = getAuthToken();
  const base = `/api/incidents/${encodeURIComponent(id)}/evidence`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function getIncidentDownloadUrl(id: string): string {
  const token = getAuthToken();
  const base = `/api/incidents/${encodeURIComponent(id)}/download`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export async function fetchEvidenceStorageStats(): Promise<{ success: boolean; data: EvidenceStorageStats }> {
  return request('/incidents/storage/stats');
}

export async function acknowledgeIncident(
  id: string,
  operator: string = 'Officer on Duty',
  notes?: string
): Promise<ApiResponse<IncidentRecord>> {
  return request<ApiResponse<IncidentRecord>>(`/incidents/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ operator, notes }),
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

// ----------------------------------------------------------------------------
// Phase 15 System Health, Fleet, and Operational Controls
// ----------------------------------------------------------------------------

export interface SystemHealthResponse {
  overall: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'CRITICAL';
  services: {
    gateway: { status: string; uptimeSeconds: number; nodeVersion: string; memoryUsagePercent: number; loadAverage: number[] };
    cv: { status: string; lastHeartbeat: string | null; version: string; processId: number | null; latencyMs: number };
    database: { status: string; type: string; totalRecords: number; journalMode: string; foreignKeys: string };
    websocket: { status: string; connectedClients: number; path: string };
    evidence: { status: string; storagePath: string; fileCount: number; totalSizeBytes: number; totalSizeMb: number };
  };
}

export async function fetchSystemHealth(): Promise<ApiResponse<SystemHealthResponse>> {
  return request<ApiResponse<SystemHealthResponse>>('/system/health');
}

export async function fetchSystemVersion(): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/system/version');
}

export async function fetchConfigSnapshot(): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/system/config/snapshot');
}

export interface StorageTelemetry {
  storage_path: string;
  file_count: number;
  used_bytes: number;
  used_mb: number;
  used_gb: number;
  oldest_evidence_timestamp: string | null;
  newest_evidence_timestamp: string | null;
  storage_status: string;
  memory_free_mb: number;
  memory_total_mb: number;
}

export async function fetchStorageTelemetry(): Promise<ApiResponse<StorageTelemetry>> {
  return request<ApiResponse<StorageTelemetry>>('/system/storage');
}

export interface TimelineItem {
  id: string;
  event_category: 'SYSTEM' | 'OPERATOR';
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  created_at: string;
  metadata?: any;
}

export async function fetchSystemTimeline(limit: number = 50): Promise<ApiResponse<TimelineItem[]>> {
  return request<ApiResponse<TimelineItem[]>>(`/system/timeline?limit=${limit}`);
}

export async function fetchOperatorActions(limit: number = 50): Promise<ApiResponse<any[]>> {
  return request<ApiResponse<any[]>>(`/system/operator-actions?limit=${limit}`);
}

export async function logOperatorAction(
  action: string,
  target_type: string,
  target_id: string,
  operator: string = 'Commander IQ100',
  metadata?: any
): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/system/operator-actions', {
    method: 'POST',
    body: JSON.stringify({ action, target_type, target_id, operator, metadata }),
  });
}

export interface FleetCameraItem {
  id: string;
  name: string;
  location: string;
  source_type: string;
  source_url: string;
  status: string;
  resolution: string;
  target_fps: number;
  measured_fps: number;
  active_tracks: number;
  current_occupancy: number;
  environment_mode: string;
  visibility_score: number;
  reconnect_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchCameraFleet(): Promise<ApiResponse<FleetCameraItem[]>> {
  return request<ApiResponse<FleetCameraItem[]>>('/cameras/fleet');
}

export async function controlCamera(
  cameraId: string,
  action: 'start' | 'stop' | 'restart' | 'reconnect' | 'simulate_failure',
  operator: string = 'Commander IQ100'
): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>(`/cameras/${cameraId}/control`, {
    method: 'POST',
    body: JSON.stringify({ action, operator }),
  });
}

export async function resolveIncident(
  incidentId: string,
  operator: string = 'Commander IQ100',
  disposition: string = 'THREAT_NEUTRALIZED',
  notes?: string
): Promise<ApiResponse<IncidentRecord>> {
  return request<ApiResponse<IncidentRecord>>(`/incidents/${incidentId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ operator, disposition, notes }),
  });
}

// ----------------------------------------------------------------------------
// Personnel & User Management Endpoints (Priority 2)
// ----------------------------------------------------------------------------

export interface UserRecord {
  id: string;
  username?: string;
  name: string;
  role: string;
  email: string;
  shift: string;
  status: 'active' | 'on_duty' | 'off_duty';
  assigned_sector: string;
  created_at: string;
  updated_at: string;
}

export async function fetchUsers(): Promise<ApiResponse<UserRecord[]>> {
  return request<ApiResponse<UserRecord[]>>('/users');
}

export async function createUser(user: {
  name: string;
  role: string;
  email: string;
  username?: string;
  password?: string;
  shift?: string;
  status?: 'active' | 'on_duty' | 'off_duty';
  assigned_sector?: string;
}): Promise<ApiResponse<UserRecord>> {
  return request<ApiResponse<UserRecord>>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function updateUser(
  id: string,
  updates: Partial<UserRecord>
): Promise<ApiResponse<UserRecord>> {
  return request<ApiResponse<UserRecord>>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(id: string): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>(`/users/${id}`, {
    method: 'DELETE',
  });
}

// Phase 19: Threat Behavior Chain APIs
export interface ChainEventRecord {
  sequence: number;
  event_type: string;
  timestamp: number;
  camera_id: string;
  track_id: number;
  metadata?: Record<string, any>;
  iso_time?: string;
}

export interface BehaviorChainRecord {
  id: string;
  chain_id: string;
  track_id: number;
  class_name: string;
  correlation_id?: string | null;
  camera_id: string;
  camera_ids: string[];
  status: 'ACTIVE' | 'ESCALATING' | 'CRITICAL' | 'INCIDENT_CREATED' | 'RESOLVED' | 'EXPIRED';
  started_at: number;
  updated_at: number;
  duration_seconds: number;
  events: ChainEventRecord[];
  event_count: number;
  risk_score: number;
  risk_level: string;
  behavior_pattern: string;
  confidence: number;
  confidence_label: string;
  evidence: string[];
  explanation: string;
  risk_contributions: Array<{ factor: string; points: number; description?: string }>;
  incident_id?: string | null;
  created_at: string;
}

export async function fetchBehaviorChains(params?: {
  camera_id?: string;
  status?: string;
  track_id?: number;
  pattern?: string;
}): Promise<ApiResponse<BehaviorChainRecord[]> & { kpis?: { active_chains: number; suspicious_patterns: number; critical_chains: number } }> {
  const query = new URLSearchParams();
  if (params?.camera_id) query.set('camera_id', params.camera_id);
  if (params?.status) query.set('status', params.status);
  if (params?.track_id !== undefined) query.set('track_id', String(params.track_id));
  if (params?.pattern) query.set('pattern', params.pattern);

  const qs = query.toString();
  return request<any>(`/behavior-chains${qs ? `?${qs}` : ''}`);
}

export async function fetchBehaviorChainById(id: string): Promise<ApiResponse<BehaviorChainRecord>> {
  return request<any>(`/behavior-chains/${id}`);
}

export async function fetchIncidentBehaviorChain(incidentId: string): Promise<ApiResponse<BehaviorChainRecord>> {
  return request<any>(`/incidents/${incidentId}/behavior-chain`);
}

// Phase 20: Surveillance Intelligence Search & Incident Intelligence Summary APIs
export interface SearchQueryFilters {
  query: string;
  entity: string;
  event_type?: string | null;
  camera_ids?: string[];
  track_id?: number | null;
  incident_id?: string | null;
  risk_level?: string | null;
  time_range?: { value: number; unit: string } | null;
  status?: string | null;
  class_name?: string | null;
  direction?: string | null;
  behavior_pattern?: string | null;
  chips: string[];
}

export interface SearchResultItem {
  type: 'incident' | 'event' | 'behavior_chain' | 'journey' | 'camera_stat';
  incident_id?: string;
  event_id?: string;
  chain_id?: string;
  camera_id?: string;
  camera_name?: string;
  camera_ids?: string[];
  track_id?: number;
  class_name?: string;
  event_type?: string;
  risk_level?: string;
  risk_score?: number;
  zone_name?: string;
  timestamp?: string;
  timestamp_epoch?: number;
  acknowledged?: boolean;
  evidence_path?: string;
  evidence_status?: string;
  behavior_pattern?: string;
  breach_count?: number;
  has_activity?: boolean;
  description?: string;
}

export interface JourneyStep {
  timestamp: number;
  camera_id: string;
  event_type: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface TrackJourneyResult {
  type: 'journey';
  track_id: number;
  class_name: string;
  camera_path: string[];
  steps: JourneyStep[];
  step_count: number;
  correlation_id?: string | null;
  is_complete: boolean;
  status_note: string;
}

export interface IntelligenceSearchResponse {
  success: boolean;
  query: string;
  filters: SearchQueryFilters;
  chips: string[];
  result_count: number;
  results: SearchResultItem[];
  journey?: TrackJourneyResult | null;
  insufficient_data: boolean;
  message: string;
}

export interface IncidentIntelligenceSummary {
  incident_id: string;
  classification: string;
  target: {
    track_id: number;
    class: string;
    label: string;
  };
  camera_path: string[];
  camera_path_raw: string[];
  observed_behaviors: string[];
  behavior_pattern: string;
  risk_score: number;
  risk_level: string;
  risk_reasons: Array<{ factor: string; points: number }>;
  forensic_evidence: {
    status: string;
    path?: string;
    sha256?: string;
    verified: boolean;
  };
  timestamp?: string;
  zone_name?: string;
}

export async function searchIntelligence(query: string): Promise<IntelligenceSearchResponse> {
  return request<IntelligenceSearchResponse>('/intelligence/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function fetchSearchHistory(): Promise<ApiResponse<Array<{ id: string; query: string; timestamp: string; result_count: number }>>> {
  return request<any>('/intelligence/search/history');
}

export async function clearSearchHistory(): Promise<ApiResponse<any>> {
  return request<any>('/intelligence/search/history', {
    method: 'DELETE',
  });
}

export async function fetchIncidentSummary(incidentId: string): Promise<ApiResponse<IncidentIntelligenceSummary>> {
  return request<any>(`/incidents/${incidentId}/summary`);
}

// ============================================================================
// Phase 21: Cross-Camera Target Journey & Dynamic Threat Heatmap APIs
// ============================================================================

export interface JourneyHandover {
  from_camera: string;
  to_camera: string;
  timestamp: string;
  temporal_gap_seconds: number;
  confidence: number | null;
  confidence_percent: number | null;
  confidence_display: string;
  verified: boolean;
  reason: string;
}

export interface TargetJourneyDetail {
  track_id: number;
  class: string;
  incursion_type?: string;
  first_seen: string | null;
  last_seen: string | null;
  duration_seconds: number;
  risk_score: number;
  risk_level: string;
  camera_path: Array<{
    camera_id: string;
    camera_name: string;
    timestamp: string;
    event: string;
    description: string;
  }>;
  unique_cameras: string[];
  handovers: JourneyHandover[];
  observed_events: Array<{
    camera_id: string;
    camera_name: string;
    timestamp: string;
    event: string;
    description: string;
    metadata?: Record<string, any>;
    incident_id?: string;
  }>;
  correlation_id?: string | null;
  is_complete: boolean;
  insufficient_data: boolean;
  status_note: string;
  kinematics?: {
    distance_meters: number;
    average_speed_mps: number;
    speed_kmh: number;
    velocity_profile: string;
    sectors_traversed: string[];
    perimeter_handover_verified: boolean;
    sha256_verification: string;
  };
}

export interface TrackedTargetItem {
  track_id: number;
  class_name: string;
  latest_camera: string;
  risk_score: number;
  risk_level: string;
  behavior_pattern?: string;
  last_seen: string;
  event_count: number;
  camera_path?: string[];
  hops?: number;
}

export interface HeatmapCameraStat {
  camera_id: string;
  camera_name: string;
  sector: string;
  x?: number;
  y?: number;
  region?: string;
  elevation?: string;
  threat_index: number;
  threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  event_counts: {
    restricted_breaches: number;
    tripwire_crossings: number;
    loitering: number;
    anomalies: number;
    critical_incidents: number;
    high_incidents: number;
    reentry_count: number;
  };
  trend: string;
  has_activity: boolean;
}

export interface HeatmapSectorStat {
  sector_name: string;
  cameras: string[];
  threat_index: number;
  threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  total_events: number;
  event_counts: Record<string, number>;
}

export interface ThreatHotspot {
  camera_id: string;
  camera_name: string;
  sector: string;
  threat_index: number;
  threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  primary_contributors: Record<string, number>;
  trend: string;
  x?: number;
  y?: number;
}

export interface ThreatCorridorItem {
  corridor_id: string;
  from_camera: string;
  to_camera: string;
  from_x?: number;
  from_y?: number;
  to_x?: number;
  to_y?: number;
  path: string[];
  correlated_incidents: number;
  restricted_breaches: number;
  tripwire_crossings: number;
  loitering: number;
  threat_score: number;
  event_density: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SpatialHeatPoint {
  camera_id: string;
  camera_name: string;
  sector: string;
  x: number;
  y: number;
  region?: string;
  intensity: number;
  radius_px: number;
  threat_index: number;
  threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  trend?: string;
}

export interface ThreatHeatmapResponse {
  success: boolean;
  time_window: string;
  window_seconds: number;
  hotspot: ThreatHotspot | null;
  cameras: HeatmapCameraStat[];
  spatial_points?: SpatialHeatPoint[];
  sectors: HeatmapSectorStat[];
  corridors: ThreatCorridorItem[];
  weights: Record<string, number>;
  canvas_bounds?: { width: number; height: number };
  timestamp: string;
}

export interface CameraThreatProfile {
  success: boolean;
  camera_id: string;
  camera_name: string;
  sector: string;
  x?: number;
  y?: number;
  region?: string;
  elevation?: string;
  threat_index: number;
  threat_level: string;
  event_counts: Record<string, number>;
  total_events: number;
  total_incidents: number;
  total_anomalies?: number;
  active_zones?: Array<{
    zone_id: string;
    name: string;
    current_occupants: number;
    is_occupied: boolean;
  }>;
  recent_incidents: any[];
}

export async function fetchTargetJourney(trackId: number): Promise<ApiResponse<TargetJourneyDetail>> {
  return request<any>(`/intelligence/journey/${trackId}`);
}

export async function fetchTrackedTargets(params?: {
  class_name?: string;
  risk_level?: string;
  camera_id?: string;
  time_window?: string;
}): Promise<ApiResponse<TrackedTargetItem[]>> {
  const query = new URLSearchParams();
  if (params?.class_name) query.set('class_name', params.class_name);
  if (params?.risk_level) query.set('risk_level', params.risk_level);
  if (params?.camera_id) query.set('camera_id', params.camera_id);
  if (params?.time_window) query.set('time_window', params.time_window);
  const qs = query.toString();
  return request<any>(`/intelligence/targets${qs ? `?${qs}` : ''}`);
}

export async function fetchThreatHeatmap(windowStr?: string): Promise<ApiResponse<ThreatHeatmapResponse>> {
  const qs = windowStr ? `?window=${windowStr}` : '';
  return request<any>(`/intelligence/threat-heatmap${qs}`);
}

export async function fetchCameraThreatProfile(cameraId: string, windowStr?: string): Promise<ApiResponse<CameraThreatProfile>> {
  const qs = windowStr ? `?window=${windowStr}` : '';
  return request<any>(`/intelligence/cameras/${cameraId}/threat-profile${qs}`);
}

export async function fetchThreatCorridors(): Promise<ApiResponse<ThreatCorridorItem[]>> {
  return request<any>('/intelligence/threat-corridors');
}





