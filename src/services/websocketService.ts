import { AlertItem, CameraDiagnosticMetric, SystemTelemetry, WebSocketMessage } from '../types';

export type SocketConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING' | 'EMULATED';

export interface WebSocketServiceState {
  status: SocketConnectionStatus;
  url: string;
  latencyMs: number;
  packetsReceived: number;
  packetsSent: number;
  lastHeartbeat: number | null;
  reconnectAttempts: number;
  isEmulationEnabled: boolean;
}

export interface RealYoloDetection {
  class_name: string;
  class_id: number;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface CameraDetectionsPayload {
  camera_id: string;
  timestamp: string;
  frame_width: number;
  frame_height: number;
  inference_ms?: number;
  detection_count?: number;
  detections: RealYoloDetection[];
}

export interface TrackItem {
  track_id: number;
  class_name: string;
  class_id: number;
  confidence: number;
  state?: string;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface CameraTrackingPayload {
  camera_id: string;
  timestamp: string;
  frame_width: number;
  frame_height: number;
  inference_ms?: number;
  tracking_ms?: number;
  total_ms?: number;
  track_count?: number;
  tracks: TrackItem[];
}

type AlertListener = (alert: AlertItem) => void;
type MetricsListener = (metrics: CameraDiagnosticMetric[]) => void;
type TelemetryListener = (telemetry: Partial<SystemTelemetry>) => void;
type StateListener = (state: WebSocketServiceState) => void;
export type DetectionListener = (data: CameraDetectionsPayload) => void;
export type TrackingListener = (data: CameraTrackingPayload) => void;

export interface RiskAssessmentPayload {
  camera_id: string;
  track_id: number;
  class_name: string;
  score: number;
  level: string;
  reasons: Array<{
    code: string;
    points: number;
    description: string;
  }>;
  timestamp: string;
}
export type RiskAssessmentListener = (data: RiskAssessmentPayload) => void;

export interface IncidentPayload {
  id: string;
  camera_id: string;
  track_id?: string | null;
  event_id?: string | null;
  event_type: string;
  risk_score: number;
  risk_level: string;
  zone_name?: string | null;
  started_at: string;
  ended_at?: string | null;
  evidence_path?: string | null;
  pre_event_seconds: number;
  post_event_seconds: number;
  evidence_status: string;
  metadata?: any;
  acknowledged?: boolean;
  created_at: string;
}
export type IncidentListener = (data: IncidentPayload) => void;

export interface CorrelationPayload {
  id: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  correlation_score: number;
  correlation_level: string;
  started_at: string;
  last_seen_at: string;
  camera_sequence: string[];
  linked_incidents: string[];
  observations: Array<{
    camera_id: string;
    track_id: string;
    class_name?: string;
    event_type?: string;
    risk_score?: number;
    risk_level?: string;
    zone_name?: string | null;
    timestamp: string;
    incident_id?: string | null;
  }>;
  reasons: Array<{
    code: string;
    points: number;
    message: string;
  }>;
  created_at: string;
  updated_at: string;
}
export type CorrelationListener = (data: CorrelationPayload) => void;

export interface EnvironmentUpdatePayload {
  camera_id: string;
  mode: 'DAY' | 'DAWN' | 'DUSK' | 'NIGHT' | 'LOW_LIGHT';
  brightness: number;
  contrast: number;
  visibility_score: number;
  low_light: boolean;
  confidence?: number;
  adaptive_skip?: number;
  enhancement_enabled?: boolean;
  updated_at?: string;
}
export type EnvironmentListener = (data: EnvironmentUpdatePayload) => void;

export interface MovementUpdatePayload {
  id?: string;
  camera_id: string;
  zone_id: string;
  zone_name?: string;
  track_id: number;
  class_name: string;
  event_type: 'ENTRY' | 'EXIT';
  direction: string;
  speed: number;
  timestamp: number;
}
export type MovementListener = (data: MovementUpdatePayload) => void;

export interface OccupancyUpdatePayload {
  zone_id: string;
  camera_id: string;
  zone_name: string;
  current_occupants: number;
  peak_occupants: number;
  average_occupants: number;
  class_breakdown: Record<string, number>;
  is_occupied?: boolean;
}
export type OccupancyListener = (data: OccupancyUpdatePayload) => void;

export interface AnalyticsAnomalyPayload {
  id: string;
  camera_id: string;
  zone_id?: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  reason: string;
  timestamp: number;
}
export type AnomalyListener = (data: AnalyticsAnomalyPayload) => void;

export interface GroupMovementPayload {
  group_id: string;
  camera_id: string;
  track_ids: number[];
  size: number;
  direction: string;
  average_separation_px: number;
  average_speed: number;
  duration_seconds: number;
}
export type GroupMovementListener = (data: GroupMovementPayload) => void;

const WS_URL_STORAGE_KEY = 'seemadrishti_ws_url_v2';
const DEFAULT_WS_URL = 'ws://127.0.0.1:8000/ws/alerts';

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private status: SocketConnectionStatus = 'DISCONNECTED';
  private latencyMs: number = 14;
  private packetsReceived: number = 0;
  private packetsSent: number = 0;
  private lastHeartbeat: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private emulationTimer: any = null;
  private isEmulationEnabled: boolean = true;

  private alertListeners: Set<AlertListener> = new Set();
  private metricsListeners: Set<MetricsListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private detectionListeners: Set<DetectionListener> = new Set();
  private trackingListeners: Set<TrackingListener> = new Set();
  private riskListeners: Set<RiskAssessmentListener> = new Set();
  private incidentListeners: Set<IncidentListener> = new Set();
  private evidenceListeners: Set<IncidentListener> = new Set();
  private correlationCreatedListeners: Set<CorrelationListener> = new Set();
  private correlationUpdatedListeners: Set<CorrelationListener> = new Set();
  private correlationEscalatedListeners: Set<CorrelationListener> = new Set();
  private environmentListeners: Set<EnvironmentListener> = new Set();
  private movementListeners: Set<MovementListener> = new Set();
  private occupancyListeners: Set<OccupancyListener> = new Set();
  private anomalyListeners: Set<AnomalyListener> = new Set();
  private groupMovementListeners: Set<GroupMovementListener> = new Set();
  private latestEnvironmentStates: Map<string, EnvironmentUpdatePayload> = new Map();

  constructor() {
    try {
      this.url = localStorage.getItem(WS_URL_STORAGE_KEY) || DEFAULT_WS_URL;
    } catch {
      this.url = DEFAULT_WS_URL;
    }
  }

  public init() {
    this.connect();
    this.startEmulationFallback();
  }

  public getUrl(): string {
    return this.url;
  }

  public setUrl(newUrl: string) {
    this.url = newUrl;
    try {
      localStorage.setItem(WS_URL_STORAGE_KEY, newUrl);
    } catch {
      // ignore
    }
    this.reconnect();
  }

  public getState(): WebSocketServiceState {
    return {
      status: this.status,
      url: this.url,
      latencyMs: this.latencyMs,
      packetsReceived: this.packetsReceived,
      packetsSent: this.packetsSent,
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts,
      isEmulationEnabled: this.isEmulationEnabled,
    };
  }

  public toggleEmulation(enabled: boolean) {
    this.isEmulationEnabled = enabled;
    this.notifyState();
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('CONNECTING');

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.lastHeartbeat = Date.now();
        this.startPingPong();
        this.notifyState();
      };

      this.socket.onmessage = (event) => {
        this.packetsReceived++;
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.warn('[WS] Error parsing websocket packet:', e);
        }
        this.notifyState();
      };

      this.socket.onerror = (err) => {
        // Expected when no local python backend is running
        if (this.status !== 'EMULATED') {
          this.setStatus('DISCONNECTED');
        }
      };

      this.socket.onclose = () => {
        this.stopPingPong();
        if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopPingPong();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  public send(type: string, payload: any) {
    this.packetsSent++;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
    this.notifyState();
  }

  private setStatus(newStatus: SocketConnectionStatus) {
    this.status = newStatus;
    this.notifyState();
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus(this.isEmulationEnabled ? 'EMULATED' : 'DISCONNECTED');
      return;
    }

    this.setStatus('RECONNECTING');
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPingPong() {
    this.stopPingPong();
    this.pingInterval = setInterval(() => {
      const startTime = performance.now();
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        this.latencyMs = Math.max(4, Math.round(performance.now() - startTime + Math.random() * 8));
        this.lastHeartbeat = Date.now();
        this.notifyState();
      }
    }, 4000);
  }

  private stopPingPong() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = null;
  }

  private handleIncomingMessage(msg: WebSocketMessage) {
    switch (msg.type) {
      case 'ALERT_TRIGGER':
        if (msg.payload) {
          this.alertListeners.forEach((listener) => listener(msg.payload));
        }
        break;
      case 'CAMERA_METRICS':
        if (Array.isArray(msg.payload)) {
          this.metricsListeners.forEach((listener) => listener(msg.payload));
        }
        break;
      case 'SYSTEM_TELEMETRY':
        if (msg.payload) {
          this.telemetryListeners.forEach((listener) => listener(msg.payload));
        }
        break;
      case 'PING_PONG':
        this.latencyMs = Math.max(5, Math.round(Date.now() - msg.timestamp));
        this.lastHeartbeat = Date.now();
        break;
      case 'detection' as any:
      case 'DETECTION' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.detectionListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'tracking' as any:
      case 'TRACKING' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.trackingListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'alert_created' as any:
      case 'ALERT_CREATED' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          const alertSeverity =
            payload.severity?.toLowerCase() === 'high' || payload.severity?.toLowerCase() === 'critical'
              ? 'High'
              : 'Medium';
          const uiAlert: AlertItem = {
            id: payload.id || `alt-${Date.now()}`,
            title: payload.title || 'UNAUTHORIZED ZONE ENTRY',
            camera: payload.camera_id ? payload.camera_id.toUpperCase() : 'CAM-01',
            severity: alertSeverity,
            time: payload.timestamp
              ? new Date(payload.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            type: payload.title || 'UNAUTHORIZED ZONE ENTRY',
            timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
            status: payload.acknowledged ? 'acknowledged' : 'active',
            description: payload.reason || 'Intrusion alert detected',
            location: payload.camera_id ? `Sector ${payload.camera_id.toUpperCase()}` : 'Sector Alpha',
            confidence: payload.confidence || 0.95,
            audioTriggered: true,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        }
        break;
      }
      case 'event_created' as any:
      case 'EVENT_CREATED' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload && payload.event_type === 'INTRUSION') {
          const uiAlert: AlertItem = {
            id: payload.id ? `alt-from-${payload.id}` : `alt-${Date.now()}`,
            title: 'UNAUTHORIZED ZONE ENTRY',
            camera: payload.camera_id ? payload.camera_id.toUpperCase() : 'CAM-01',
            severity: 'High',
            time: payload.timestamp
              ? new Date(payload.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            type: 'UNAUTHORIZED ZONE ENTRY',
            timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
            status: 'active',
            description: `Track #${payload.object_id || '?'} breached ${payload.metadata?.zone_name || 'Restricted Zone'}`,
            location: payload.camera_id ? `Sector ${payload.camera_id.toUpperCase()}` : 'Sector Alpha',
            confidence: payload.metadata?.confidence || 0.95,
            audioTriggered: true,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        } else if (payload && payload.event_type === 'LOITERING') {
          const uiAlert: AlertItem = {
            id: payload.id ? `alt-from-${payload.id}` : `alt-${Date.now()}`,
            title: 'LOITERING DETECTED',
            camera: payload.camera_id ? payload.camera_id.toUpperCase() : 'CAM-01',
            severity: 'High',
            time: payload.timestamp
              ? new Date(payload.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            type: 'LOITERING DETECTED',
            timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
            status: 'active',
            description: `Track #${payload.object_id || '?'} (${payload.metadata?.class_name || 'person'}) loitering in ${payload.metadata?.zone_name || 'Restricted Zone'} for ${payload.metadata?.dwell_seconds || 30}s`,
            location: payload.camera_id ? `Sector ${payload.camera_id.toUpperCase()}` : 'Sector Alpha',
            confidence: 0.98,
            audioTriggered: true,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        } else if (payload && payload.event_type === 'RISK_ASSESSMENT') {
          const reasonsList = Array.isArray(payload.metadata?.reasons)
            ? payload.metadata.reasons.map((r: any) => `${r.description} (+${r.points})`).join(', ')
            : 'Multiple threat indicators detected';
          const level = (payload.metadata?.risk_level || 'HIGH').toUpperCase();
          const score = payload.metadata?.risk_score ?? 0;
          const uiAlert: AlertItem = {
            id: payload.id ? `alt-from-${payload.id}` : `alt-${Date.now()}`,
            title: `${level} THREAT ASSESSMENT`,
            camera: payload.camera_id ? payload.camera_id.toUpperCase() : 'CAM-01',
            severity: 'High',
            time: payload.timestamp
              ? new Date(payload.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            type: `${level} THREAT ASSESSMENT`,
            timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
            status: 'active',
            description: `Track #${payload.object_id || '?'} (${payload.metadata?.class_name || 'person'}) risk ${score}/100 [${level}]: ${reasonsList}`,
            location: payload.camera_id ? `Sector ${payload.camera_id.toUpperCase()}` : 'Sector Alpha',
            confidence: 0.99,
            audioTriggered: true,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        }
        break;
      }
      case 'risk_assessment' as any:
      case 'RISK_ASSESSMENT' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.riskListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'incident_created' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.incidentListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'evidence_ready' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.evidenceListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'correlation_created' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.correlationCreatedListeners.forEach((listener) => listener(payload));
          // Synthesize a tactical cross-camera alert for the alert feed
          const seq = payload.camera_sequence ? payload.camera_sequence.join(' → ') : 'MULTI-CAM';
          const uiAlert: AlertItem = {
            id: `corr-${payload.id || Date.now()}`,
            title: `CORRELATED INCIDENT [${payload.correlation_level || 'HIGH'}]`,
            camera: payload.camera_sequence?.[0]?.toUpperCase() || 'CAM-01',
            severity: 'High',
            time: payload.started_at ? new Date(payload.started_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
            type: 'CROSS-CAMERA THREAT',
            timestamp: payload.started_at ? new Date(payload.started_at).getTime() : Date.now(),
            status: 'active',
            description: `Cross-camera movement across ${seq} (${payload.correlation_score}/100 [${payload.correlation_level}]): ${(payload.reasons || []).map((r: any) => r.code).join(', ')}`,
            location: seq,
            confidence: (payload.correlation_score || 75) / 100,
            audioTriggered: true,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        }
        break;
      }
      case 'correlation_updated' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.correlationUpdatedListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'correlation_escalated' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.correlationEscalatedListeners.forEach((listener) => listener(payload));
          const entity = payload.entity || payload;
          const seq = payload.camera_sequence ? payload.camera_sequence.join(' → ') : (entity.camera_sequence?.join(' → ') || 'MULTI-CAM');
          const uiAlert: AlertItem = {
            id: `corr-esc-${payload.correlation_id || entity.id || Date.now()}`,
            title: `THREAT ESCALATION // CRITICAL`,
            camera: payload.camera_sequence?.[payload.camera_sequence.length - 1]?.toUpperCase() || 'CAM-03',
            severity: 'High',
            time: new Date().toLocaleTimeString(),
            type: 'CROSS-CAMERA ESCALATION',
            timestamp: Date.now(),
            status: 'active',
            description: `Cross-camera corridor ${seq} escalated to CRITICAL (${payload.score || 85}/100)`,
            location: seq,
            confidence: 0.99,
            audioTriggered: true,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        }
        break;
      }
      case 'environment_update' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload && payload.camera_id) {
          this.latestEnvironmentStates.set(payload.camera_id.toLowerCase(), payload);
          this.environmentListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'night_movement' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          const uiAlert: AlertItem = {
            id: `night-${payload.track_id}-${Date.now()}`,
            title: `NIGHT MOVEMENT [${payload.environment_mode || 'NIGHT'}]`,
            camera: (payload.camera_id || 'CAM-01').toUpperCase(),
            severity: 'Medium',
            time: new Date().toLocaleTimeString(),
            type: 'NIGHT INTELLIGENCE',
            timestamp: Date.now(),
            status: 'active',
            description: payload.reason || `Human movement detected in ${payload.environment_mode} (Visibility: ${payload.visibility_score}%)`,
            location: `Sector ${payload.camera_id || 'Alpha'}`,
            confidence: payload.confidence || 0.85,
            audioTriggered: false,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
        }
        break;
      }
      case 'movement_update' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.movementListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'occupancy_update' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.occupancyListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'analytics_anomaly' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.anomalyListeners.forEach((listener) => listener(payload));
          if (payload.severity === 'HIGH' || payload.severity === 'CRITICAL') {
            const uiAlert: AlertItem = {
              id: payload.id || `anom-${Date.now()}`,
              title: `ANOMALY // ${payload.anomaly_type || 'MOVEMENT'}`,
              camera: (payload.camera_id || 'CAM-01').toUpperCase(),
              severity: payload.severity === 'CRITICAL' ? 'High' : 'Medium',
              time: new Date().toLocaleTimeString(),
              type: 'BEHAVIOR ANOMALY',
              timestamp: Date.now(),
              status: 'active',
              description: payload.reason || 'Statistical movement anomaly detected',
              location: payload.zone_id ? `Zone ${payload.zone_id}` : 'Surveillance Grid',
              confidence: 0.94,
              audioTriggered: true,
            };
            this.alertListeners.forEach((listener) => listener(uiAlert));
          }
        }
        break;
      }
      case 'group_movement' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.groupMovementListeners.forEach((listener) => listener(payload));
        }
        break;
      }
    }
  }

  // Periodic heartbeat / live metrics stream simulation when offline or testing
  private startEmulationFallback() {
    if (this.emulationTimer) clearInterval(this.emulationTimer);

    this.emulationTimer = setInterval(() => {
      if (!this.isEmulationEnabled) return;

      // Update jitter / latency variations
      this.latencyMs = Math.round(12 + Math.random() * 8 + (Math.sin(Date.now() / 3000) * 4));
      this.lastHeartbeat = Date.now();
      this.packetsReceived++;

      // Generate live camera diagnostic telemetry pulses
      const sampleMetrics = this.generateLiveDiagnostics();
      this.metricsListeners.forEach((fn) => fn(sampleMetrics));

      if (this.status === 'DISCONNECTED' || this.status === 'RECONNECTING') {
        this.status = 'EMULATED';
        this.notifyState();
      }
    }, 2500);
  }

  public triggerManualSimulatedAlert(customAlert?: Partial<AlertItem>): AlertItem {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const timeStr = `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} ${ampm}`;
    const camIdx = Math.floor(Math.random() * 9) + 1;
    const camTag = `CAM-0${camIdx}`;
    const confidence = Math.round((60 + Math.random() * 39.5) * 10) / 10;
    const severity = confidence >= 88 ? 'High' : confidence >= 72 ? 'Medium' : 'Low';

    const alert: AlertItem = {
      id: `ws-alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: 'Neural Intrusion Breach',
      camera: camTag,
      severity,
      time: timeStr,
      type: 'Perimeter Barrier Crossing',
      timestamp: Date.now(),
      status: 'active',
      description: `Target crossing detected on ${camTag}. Neural vector confirmation speed: 1.8 m/s.`,
      location: `Sector ${String.fromCharCode(65 + camIdx % 4)} - North Border Line`,
      confidence,
      assignedUnit: `Quick Reaction Team ${camIdx % 3 + 1}`,
      audioTriggered: severity === 'High',
      thresholdAtTime: 85,
      ...customAlert,
    };

    this.alertListeners.forEach((fn) => fn(alert));
    return alert;
  }

  public generateLiveDiagnostics(): CameraDiagnosticMetric[] {
    const camerasData = [
      { id: 1, tag: 'CAM-01', name: 'Sector A - Urban Night Corridor', loc: 'North Arterial Roadway' },
      { id: 2, tag: 'CAM-02', name: 'Sector B - Aerial Box Junction Drone', loc: 'Monochrome UAV - Grid C-2' },
      { id: 3, tag: 'CAM-03', name: 'Sector C - River Crossing Thermal', loc: 'Riverine Border Outpost West' },
      { id: 4, tag: 'CAM-04', name: 'Sector D - Perimeter Security Fence', loc: 'Perimeter Fence Line 04' },
      { id: 5, tag: 'CAM-05', name: 'Sector E - Forest Canopy Trail', loc: 'Dense Foliage Sensor Node' },
      { id: 6, tag: 'CAM-06', name: 'Sector F - Mountain Pass Checkpoint', loc: 'High Altitude Pass C-7' },
      { id: 7, tag: 'CAM-07', name: 'Sector G - Desert Outpost Watchtower', loc: 'Desert Sector Southern Ridge' },
      { id: 8, tag: 'CAM-08', name: 'Sector H - Tactical Gate Entrypoint', loc: 'Main Checkpost Delta-1' },
      { id: 9, tag: 'CAM-09', name: 'Sector I - Coastal Line Radar Guard', loc: 'Coastal Surveillance Pier 9' },
    ];

    return camerasData.map((c, idx) => {
      const isDegraded = idx === 4 && Math.sin(Date.now() / 15000) > 0.6;
      const baseLat = 12 + (idx * 2);
      const jitter = Math.round((0.8 + Math.random() * 2.2) * 10) / 10;
      const latency = Math.round(baseLat + (Math.sin(Date.now() / 2000 + idx) * 4) + (isDegraded ? 48 : 0));
      const frameDrop = isDegraded ? 2.4 : Math.round(Math.random() * 0.25 * 100) / 100;
      const packetLoss = isDegraded ? 1.2 : Math.round(Math.random() * 0.08 * 100) / 100;
      const actualFps = isDegraded ? 42 : idx % 2 === 0 ? 60 : 30;
      const healthScore = isDegraded ? 76 : Math.round(96 + Math.random() * 3.8);

      return {
        cameraId: c.id,
        tag: c.tag,
        name: c.name,
        location: c.loc,
        status: isDegraded ? 'Degraded' : 'Online',
        latencyMs: latency,
        jitterMs: jitter,
        frameDropRate: frameDrop,
        packetLossPercent: packetLoss,
        bitrateMbps: Math.round((7.5 + (idx * 0.3) + Math.random() * 0.8) * 10) / 10,
        targetFps: idx % 2 === 0 ? 60 : 30,
        actualFps: actualFps,
        uptimePercent: 99.92,
        protocol: idx % 3 === 0 ? 'WebRTC' : 'RTSP/TCP',
        resolution: '4K UHD (3840x2160)',
        codec: idx % 2 === 0 ? 'H.265 (HEVC)' : 'H.264 High',
        edgeTemperatureC: Math.round(39 + (idx * 0.7) + Math.random() * 2),
        healthScore,
        lastPingTimestamp: Date.now(),
        historyLatency: [
          Math.max(8, latency - 4),
          Math.max(8, latency - 2),
          latency,
          Math.max(8, latency + 1),
          latency,
        ],
      };
    });
  }

  // Subscriptions
  public onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public onCameraMetrics(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    return () => this.metricsListeners.delete(listener);
  }

  public onTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  public onDetection(listener: DetectionListener): () => void {
    this.detectionListeners.add(listener);
    return () => this.detectionListeners.delete(listener);
  }

  public onTracking(listener: TrackingListener): () => void {
    this.trackingListeners.add(listener);
    return () => this.trackingListeners.delete(listener);
  }

  public onRiskAssessment(listener: RiskAssessmentListener): () => void {
    this.riskListeners.add(listener);
    return () => this.riskListeners.delete(listener);
  }

  public onIncidentCreated(listener: IncidentListener): () => void {
    this.incidentListeners.add(listener);
    return () => this.incidentListeners.delete(listener);
  }

  public onEvidenceReady(listener: IncidentListener): () => void {
    this.evidenceListeners.add(listener);
    return () => this.evidenceListeners.delete(listener);
  }

  public onCorrelationCreated(listener: CorrelationListener): () => void {
    this.correlationCreatedListeners.add(listener);
    return () => this.correlationCreatedListeners.delete(listener);
  }

  public onCorrelationUpdated(listener: CorrelationListener): () => void {
    this.correlationUpdatedListeners.add(listener);
    return () => this.correlationUpdatedListeners.delete(listener);
  }

  public onCorrelationEscalated(listener: CorrelationListener) {
    this.correlationEscalatedListeners.add(listener);
    return () => this.correlationEscalatedListeners.delete(listener);
  }

  public onEnvironmentUpdate(listener: EnvironmentListener) {
    this.environmentListeners.add(listener);
    return () => this.environmentListeners.delete(listener);
  }

  public onMovementUpdate(listener: MovementListener): () => void {
    this.movementListeners.add(listener);
    return () => this.movementListeners.delete(listener);
  }

  public onOccupancyUpdate(listener: OccupancyListener): () => void {
    this.occupancyListeners.add(listener);
    return () => this.occupancyListeners.delete(listener);
  }

  public onAnalyticsAnomaly(listener: AnomalyListener): () => void {
    this.anomalyListeners.add(listener);
    return () => this.anomalyListeners.delete(listener);
  }

  public onGroupMovement(listener: GroupMovementListener): () => void {
    this.groupMovementListeners.add(listener);
    return () => this.groupMovementListeners.delete(listener);
  }

  public getLatestEnvironment(cameraId: string): EnvironmentUpdatePayload | undefined {
    return this.latestEnvironmentStates.get(cameraId.toLowerCase());
  }

  public getAllEnvironmentStates(): Map<string, EnvironmentUpdatePayload> {
    return new Map(this.latestEnvironmentStates);
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => this.stateListeners.delete(listener);
  }

  private notifyState() {
    const state = this.getState();
    this.stateListeners.forEach((fn) => fn(state));
  }
}

export const webSocketService = new WebSocketService();
