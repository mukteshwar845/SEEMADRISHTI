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
