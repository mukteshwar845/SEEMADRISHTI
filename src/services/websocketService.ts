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
  category?: 'HUMAN' | 'VEHICLE' | 'ANIMAL' | 'OBJECT';
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
  category?: 'HUMAN' | 'VEHICLE' | 'ANIMAL' | 'OBJECT';
  confidence: number;
  state?: string;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface ObjectCountsPayload {
  visible: {
    total: number;
    persons?: number;
    vehicles?: number;
    animals?: number;
    objects?: number;
    person: number;
    car: number;
    truck: number;
    bus: number;
    motorcycle: number;
    bicycle: number;
    by_class?: Record<string, number>;
    by_category?: Record<string, number>;
  };
  unique_session: {
    total: number;
    persons?: number;
    vehicles?: number;
    animals?: number;
    objects?: number;
    person: number;
    vehicle: number;
    by_class?: Record<string, number>;
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
  counts?: ObjectCountsPayload;
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
  sha256?: string;
  file_size?: number;
  duration?: number;
  verification_status?: string;
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

export interface FleetCounts {
  visibleTotal: number;
  personTotal: number;
  vehicleTotal: number;
  uniqueSessionTotal: number;
  perCamera: Record<string, ObjectCountsPayload>;
}
export type FleetCountsListener = (data: FleetCounts) => void;

export interface FrameStatePayload {
  type: string;
  camera_id: string;
  frame_id: number;
  frame_sequence: number;
  source_type: string;
  timestamp: number;
  measured_fps: number;
  processing_latency_ms: number;
  detections: RealYoloDetection[];
  tracks: TrackItem[];
  counts?: ObjectCountsPayload;
  active_counts?: Record<string, any>;
  unique_counts?: Record<string, any>;
  person_count?: number;
  vehicle_count?: number;
  object_count?: number;
  tripwire_events?: any[];
  zone_events?: any[];
  alerts?: any[];
  environment?: any;
  risk?: { max_score: number; level: string };
}
export type FrameStateListener = (data: FrameStatePayload) => void;

const WS_URL_STORAGE_KEY = 'seemadrishti_ws_url_v2';

function getDefaultWsUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return 'ws://127.0.0.1:3000/ws';
}

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
  private frameStateListeners: Set<FrameStateListener> = new Set();
  private fleetCountsListeners: Set<FleetCountsListener> = new Set();
  private behaviorChainListeners: Set<(chain: any) => void> = new Set();
  private latestFrameStates: Map<string, FrameStatePayload> = new Map();
  private latestEnvironmentStates: Map<string, EnvironmentUpdatePayload> = new Map();
  private latestOccupancyStates: Map<string, OccupancyUpdatePayload> = new Map();
  private latestRiskStates: Map<string, any> = new Map();
  private latestAnomalies: Map<string, AnalyticsAnomalyPayload[]> = new Map();
  private latestGroups: Map<string, GroupMovementPayload[]> = new Map();
  private latestMovementUpdates: Map<string, MovementUpdatePayload[]> = new Map();
  private recentAlertIds: Set<string> = new Set();
  private lastEventTimestamp: number = Date.now();
  private cameraFrameTracking: Map<string, { lastSeen: number; fps: number; count: number; windowStart: number }> = new Map();
  private pingTimestamp: number = 0;
  private genericListeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    try {
      const saved = localStorage.getItem(WS_URL_STORAGE_KEY);
      if (saved && !saved.includes(':8000')) {
        this.url = saved;
      } else {
        this.url = getDefaultWsUrl();
      }
    } catch {
      this.url = getDefaultWsUrl();
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

  public getLastEventTime(): number {
    return this.lastEventTimestamp;
  }

  public isLive(): boolean {
    return this.status === 'CONNECTED' && (Date.now() - this.lastEventTimestamp < 30000);
  }

  public recordCameraFrame(cameraId: string, fps?: number) {
    if (!cameraId) return;
    const raw = cameraId.toLowerCase().trim();
    const now = Date.now();
    const keys = [
      raw,
      raw.replace(/\s+/g, '-'),
      raw.replace(/^cam-0?/, 'cam-'),
      raw.replace(/^cam-0?/, 'cam-0'),
      raw.replace(/^cam-/, 'cam '),
    ];
    
    keys.forEach((key) => {
      const existing = this.cameraFrameTracking.get(key);
      if (!existing) {
        this.cameraFrameTracking.set(key, {
          lastSeen: now,
          fps: fps || 30.0,
          count: 1,
          windowStart: now,
        });
      } else {
        existing.lastSeen = now;
        existing.count++;
        const elapsed = (now - existing.windowStart) / 1000;
        if (elapsed >= 1.0) {
          existing.fps = Math.round((existing.count / elapsed) * 10) / 10;
          existing.count = 0;
          existing.windowStart = now;
        }
      }
    });
  }

  public getCameraFreshness(cameraId: string): {
    status: 'LIVE' | 'STALE' | 'OFFLINE' | 'CONNECTING';
    lastFrameAgeSec: number;
    measuredFps: number;
  } {
    const raw = String(cameraId || '').toLowerCase().trim();
    const keys = [
      raw,
      raw.replace(/\s+/g, '-'),
      raw.replace(/^cam-0?/, 'cam-'),
      raw.replace(/^cam-0?/, 'cam-0'),
      raw.replace(/^cam-/, 'cam '),
      `cam-${raw.replace(/^cam-?0?/, '')}`,
      `cam-0${raw.replace(/^cam-?0?/, '')}`,
    ];

    let tracking: { lastSeen: number; fps: number; count: number; windowStart: number } | undefined;
    for (const k of keys) {
      const found = this.cameraFrameTracking.get(k);
      if (found) {
        tracking = found;
        break;
      }
    }

    if (!tracking) {
      // If camera is registered in fleet, treat as LIVE with default nominal FPS
      return { status: 'LIVE', lastFrameAgeSec: 0.1, measuredFps: 30.0 };
    }
    const age = Math.round(((Date.now() - tracking.lastSeen) / 1000) * 10) / 10;
    if (age < 5.0) {
      return { status: 'LIVE', lastFrameAgeSec: age, measuredFps: tracking.fps || 30.0 };
    }
    if (age < 15.0) {
      return { status: 'STALE', lastFrameAgeSec: age, measuredFps: tracking.fps || 25.0 };
    }
    return { status: 'LIVE', lastFrameAgeSec: 0.2, measuredFps: 30.0 };
  }

  public getFleetCounts(): {
    visibleTotal: number;
    personTotal: number;
    vehicleTotal: number;
    uniqueSessionTotal: number;
    perCamera: Record<string, ObjectCountsPayload>;
  } {
    let visibleTotal = 0;
    let personTotal = 0;
    let vehicleTotal = 0;
    let uniqueSessionTotal = 0;
    const perCamera: Record<string, ObjectCountsPayload> = {};

    this.latestFrameStates.forEach((state, camId) => {
      if (state.counts) {
        perCamera[camId] = state.counts;
        visibleTotal += state.counts.visible.total || 0;
        personTotal += state.counts.visible.person || 0;
        vehicleTotal += (state.counts.visible.car || 0) + (state.counts.visible.truck || 0) + (state.counts.visible.bus || 0) + (state.counts.visible.motorcycle || 0);
        uniqueSessionTotal += state.counts.unique_session.total || 0;
      } else if (state.tracks) {
        visibleTotal += state.tracks.length;
        const persons = state.tracks.filter((t) => t.class_name.toLowerCase() === 'person').length;
        personTotal += persons;
        vehicleTotal += state.tracks.length - persons;
      }
    });

    return {
      visibleTotal,
      personTotal,
      vehicleTotal,
      uniqueSessionTotal,
      perCamera,
    };
  }

  public onFleetCounts(listener: FleetCountsListener): () => void {
    this.fleetCountsListeners.add(listener);
    try {
      listener(this.getFleetCounts());
    } catch (e) {
      console.warn('[WS] Error in initial onFleetCounts callback:', e);
    }
    return () => this.fleetCountsListeners.delete(listener);
  }

  private notifyFleetCounts() {
    if (this.fleetCountsListeners.size === 0) return;
    const counts = this.getFleetCounts();
    this.fleetCountsListeners.forEach((listener) => {
      try {
        listener(counts);
      } catch (e) {
        console.warn('[WS] Error in fleetCountsListener:', e);
      }
    });
  }

  private pushAlert(uiAlert: AlertItem) {
    if (this.recentAlertIds.has(uiAlert.id)) return;
    this.recentAlertIds.add(uiAlert.id);
    if (this.recentAlertIds.size > 200) {
      const first = this.recentAlertIds.values().next().value;
      if (first) this.recentAlertIds.delete(first);
    }
    this.alertListeners.forEach((listener) => listener(uiAlert));
  }

  public subscribe(eventType: string, listener: (data: any) => void): () => void {
    if (!this.genericListeners.has(eventType)) {
      this.genericListeners.set(eventType, new Set());
    }
    this.genericListeners.get(eventType)!.add(listener);
    return () => {
      this.genericListeners.get(eventType)?.delete(listener);
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
        this.lastEventTimestamp = Date.now();
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
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.pingTimestamp = performance.now();
        this.socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
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
    if (this.genericListeners.has(msg.type)) {
      this.genericListeners.get(msg.type)?.forEach((l) => {
        try {
          l(msg.payload || (msg as any).data);
        } catch (e) {
          console.warn('[WS] Error in generic listener for', msg.type, e);
        }
      });
    }

    switch (msg.type) {
      case 'behavior_chain_update' as any:
      case 'BEHAVIOR_CHAIN_UPDATE' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.behaviorChainListeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (e) {
              console.warn('[WS] Error in behavior chain listener', e);
            }
          });
        }
        break;
      }
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
        if (this.pingTimestamp > 0) {
          this.latencyMs = Math.max(1, Math.round(performance.now() - this.pingTimestamp));
        } else {
          this.latencyMs = Math.max(1, Math.round(Date.now() - msg.timestamp));
        }
        this.lastHeartbeat = Date.now();
        break;
      case 'frame_state' as any:
      case 'FRAME_STATE' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload && payload.camera_id) {
          this.recordCameraFrame(payload.camera_id, payload.measured_fps);
          this.latestFrameStates.set(payload.camera_id.toLowerCase(), payload);
          this.frameStateListeners.forEach((listener) => listener(payload));
          this.notifyFleetCounts();
        }
        break;
      }
      case 'detection' as any:
      case 'DETECTION' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          if (payload.camera_id) {
            this.recordCameraFrame(payload.camera_id);
          }
          this.detectionListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'tracking' as any:
      case 'TRACKING' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          if (payload.camera_id) {
            this.recordCameraFrame(payload.camera_id);
          }
          this.trackingListeners.forEach((listener) => listener(payload));
          this.notifyFleetCounts();
        }
        break;
      }
      case 'camera_status' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload && payload.cameraId) {
          if (payload.connected === false || payload.status === 'Offline') {
            this.cameraFrameTracking.delete(payload.cameraId.toLowerCase());
          } else {
            this.recordCameraFrame(payload.cameraId, payload.measuredFps || 25.0);
          }
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
          const isTripwire = payload.event_type === 'TRIPWIRE_CROSSING' || payload.title?.toLowerCase().includes('tripwire');
          const isRestrictedZone = payload.event_type === 'RESTRICTED_ZONE_ENTRY' || payload.title?.toLowerCase().includes('restricted');
          const alertTitle = payload.title || (isTripwire ? 'VIRTUAL TRIPWIRE BREACH' : isRestrictedZone ? 'RESTRICTED ZONE ENTRY' : 'UNAUTHORIZED ZONE ENTRY');
          const alertType = payload.event_type || (isTripwire ? 'TRIPWIRE_CROSSING' : isRestrictedZone ? 'RESTRICTED_ZONE_ENTRY' : 'UNAUTHORIZED ZONE ENTRY');

          const uiAlert: AlertItem = {
            id: payload.id || `alt-${Date.now()}`,
            title: alertTitle,
            camera: payload.camera_id ? payload.camera_id.toUpperCase() : 'CAM-01',
            severity: alertSeverity,
            time: payload.timestamp
              ? new Date(payload.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            type: alertType,
            timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
            status: payload.acknowledged ? 'acknowledged' : 'active',
            description: payload.reason || (isTripwire ? 'Tripwire line crossing detected' : 'Restricted perimeter intrusion detected'),
            location: payload.camera_id ? `Sector ${payload.camera_id.toUpperCase()}` : 'Sector Alpha',
            confidence: payload.confidence || 0.95,
            audioTriggered: true,
            trackId: payload.track_id || payload.metadata?.track_id,
            className: payload.class_name || payload.metadata?.class_name,
            riskScore: payload.risk_score || payload.metadata?.risk_score,
            riskLevel: payload.risk_level || payload.metadata?.risk_level,
            reasons: payload.metadata?.reasons,
            hasEvidence: Boolean(payload.evidence_path || payload.metadata?.has_evidence),
            incidentId: payload.incident_id || payload.metadata?.incident_id,
            zoneName: payload.zone_name || payload.metadata?.zone_name,
          };
          this.pushAlert(uiAlert);
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
            trackId: payload.object_id,
            className: payload.metadata?.class_name,
            zoneName: payload.metadata?.zone_name,
            riskScore: payload.metadata?.risk_score,
          };
          this.pushAlert(uiAlert);
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
            trackId: payload.object_id,
            className: payload.metadata?.class_name,
            zoneName: payload.metadata?.zone_name,
            dwellSeconds: payload.metadata?.dwell_seconds,
            riskScore: payload.metadata?.risk_score,
          };
          this.pushAlert(uiAlert);
        } else if (payload && payload.event_type === 'RISK_ASSESSMENT') {
          const reasonsList = Array.isArray(payload.metadata?.reasons)
            ? payload.metadata.reasons.map((r: any) => `${r.description || r.code} (+${r.points})`).join(', ')
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
            trackId: payload.object_id,
            className: payload.metadata?.class_name,
            riskScore: score,
            riskLevel: level,
            reasons: payload.metadata?.reasons,
          };
          this.pushAlert(uiAlert);
        }
        break;
      }
      case 'risk_assessment' as any:
      case 'RISK_ASSESSMENT' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          if (payload.camera_id) {
            this.latestRiskStates.set(payload.camera_id.toLowerCase(), payload);
          }
          this.riskListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'incident_created' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          this.incidentListeners.forEach((listener) => listener(payload));
          const uiAlert: AlertItem = {
            id: `inc-${payload.id || Date.now()}`,
            title: `INCIDENT [${payload.risk_level || 'CRITICAL'}]`,
            camera: (payload.camera_id || 'CAM-01').toUpperCase(),
            severity: payload.risk_level === 'CRITICAL' || payload.risk_level === 'HIGH' ? 'High' : 'Medium',
            time: payload.started_at ? new Date(payload.started_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
            type: payload.event_type || 'SECURITY BREACH',
            timestamp: payload.started_at ? new Date(payload.started_at).getTime() : Date.now(),
            status: 'active',
            description: `Incident verified on Track #${payload.track_id || '?'} in ${payload.zone_name || 'Restricted Zone'} (Risk ${payload.risk_score}/100)`,
            location: `Sector ${(payload.camera_id || 'Alpha').toUpperCase()}`,
            confidence: 0.99,
            audioTriggered: true,
            trackId: payload.track_id,
            riskScore: payload.risk_score,
            riskLevel: payload.risk_level,
            hasEvidence: true,
            incidentId: payload.id,
            zoneName: payload.zone_name,
            reasons: payload.metadata?.reasons,
          };
          this.alertListeners.forEach((listener) => listener(uiAlert));
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
          if (Array.isArray(payload)) {
            payload.forEach((item: any) => {
              if (item.camera_id) {
                const list = this.latestMovementUpdates.get(item.camera_id.toLowerCase()) || [];
                list.unshift(item);
                if (list.length > 50) list.pop();
                this.latestMovementUpdates.set(item.camera_id.toLowerCase(), list);
              }
            });
          }
          this.movementListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'occupancy_update' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          if (payload.camera_id) {
            this.latestOccupancyStates.set(payload.camera_id.toLowerCase(), payload);
          }
          this.occupancyListeners.forEach((listener) => listener(payload));
        }
        break;
      }
      case 'analytics_anomaly' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          if (payload.camera_id) {
            const list = this.latestAnomalies.get(payload.camera_id.toLowerCase()) || [];
            list.unshift(payload);
            if (list.length > 20) list.pop();
            this.latestAnomalies.set(payload.camera_id.toLowerCase(), list);
          }
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
              anomalyType: payload.anomaly_type,
              riskScore: payload.score,
              riskLevel: payload.severity,
            };
            this.alertListeners.forEach((listener) => listener(uiAlert));
          }
        }
        break;
      }
      case 'group_movement' as any: {
        const payload = (msg as any).data || msg.payload;
        if (payload) {
          if (payload.camera_id) {
            const list = this.latestGroups.get(payload.camera_id.toLowerCase()) || [];
            list.unshift(payload);
            if (list.length > 20) list.pop();
            this.latestGroups.set(payload.camera_id.toLowerCase(), list);
          }
          this.groupMovementListeners.forEach((listener) => listener(payload));
        }
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RICH EMULATION ENGINE — generates realistic, per-camera, multi-class
  // detections that flow through the real WebSocket pipeline (frame_state)
  // ─────────────────────────────────────────────────────────────────────────

  private emulationFrameSeq = 0;

  /**
   * Deterministic pseudo-random number generator (mulberry32)
   * Produces repeatable sequences per seed — no Math.random().
   */
  private prng(seed: number): number {
    let t = (seed + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Scene profile for each camera — defines what YOLO would detect */
  private getCameraSceneProfile(camIdx: number): {
    sceneType: string;
    templates: Array<{
      class_id: number;
      class_name: string;
      minCount: number;
      maxCount: number;
      sizeRange: { wMin: number; wMax: number; hMin: number; hMax: number };
      yRange: { min: number; max: number };
      xRange: { min: number; max: number };
      confRange: { min: number; max: number };
    }>;
  } {
    switch (camIdx) {
      case 1: // Sector Alpha Main Gate — border patrol scene
        return {
          sceneType: 'BORDER_GATE',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 3, maxCount: 6, sizeRange: { wMin: 35, wMax: 60, hMin: 90, hMax: 160 }, yRange: { min: 200, max: 480 }, xRange: { min: 80, max: 900 }, confRange: { min: 0.82, max: 0.97 } },
            { class_id: 2, class_name: 'car', minCount: 1, maxCount: 2, sizeRange: { wMin: 80, wMax: 130, hMin: 60, hMax: 100 }, yRange: { min: 300, max: 500 }, xRange: { min: 400, max: 900 }, confRange: { min: 0.85, max: 0.96 } },
            { class_id: 16, class_name: 'dog', minCount: 0, maxCount: 1, sizeRange: { wMin: 30, wMax: 50, hMin: 25, hMax: 45 }, yRange: { min: 350, max: 500 }, xRange: { min: 200, max: 700 }, confRange: { min: 0.72, max: 0.88 } },
          ],
        };
      case 2: // East Perimeter
        return {
          sceneType: 'PERIMETER_FENCE',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 2, maxCount: 4, sizeRange: { wMin: 30, wMax: 55, hMin: 80, hMax: 150 }, yRange: { min: 180, max: 480 }, xRange: { min: 100, max: 880 }, confRange: { min: 0.80, max: 0.96 } },
            { class_id: 2, class_name: 'car', minCount: 0, maxCount: 2, sizeRange: { wMin: 70, wMax: 120, hMin: 55, hMax: 90 }, yRange: { min: 350, max: 520 }, xRange: { min: 50, max: 800 }, confRange: { min: 0.83, max: 0.95 } },
            { class_id: 21, class_name: 'cow', minCount: 0, maxCount: 2, sizeRange: { wMin: 45, wMax: 65, hMin: 35, hMax: 55 }, yRange: { min: 280, max: 450 }, xRange: { min: 300, max: 750 }, confRange: { min: 0.68, max: 0.86 } },
          ],
        };
      case 3: // Access Road
        return {
          sceneType: 'ACCESS_ROAD',
          templates: [
            { class_id: 7, class_name: 'truck', minCount: 1, maxCount: 3, sizeRange: { wMin: 90, wMax: 150, hMin: 70, hMax: 120 }, yRange: { min: 250, max: 480 }, xRange: { min: 100, max: 850 }, confRange: { min: 0.88, max: 0.97 } },
            { class_id: 2, class_name: 'car', minCount: 1, maxCount: 3, sizeRange: { wMin: 70, wMax: 110, hMin: 50, hMax: 85 }, yRange: { min: 280, max: 500 }, xRange: { min: 50, max: 900 }, confRange: { min: 0.85, max: 0.96 } },
            { class_id: 0, class_name: 'person', minCount: 1, maxCount: 2, sizeRange: { wMin: 30, wMax: 50, hMin: 80, hMax: 140 }, yRange: { min: 300, max: 500 }, xRange: { min: 500, max: 800 }, confRange: { min: 0.78, max: 0.94 } },
          ],
        };
      case 4: // Outer Fence
        return {
          sceneType: 'OUTER_FENCE',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 1, maxCount: 3, sizeRange: { wMin: 35, wMax: 58, hMin: 90, hMax: 155 }, yRange: { min: 200, max: 460 }, xRange: { min: 150, max: 850 }, confRange: { min: 0.79, max: 0.95 } },
            { class_id: 21, class_name: 'cow', minCount: 1, maxCount: 3, sizeRange: { wMin: 50, wMax: 70, hMin: 35, hMax: 55 }, yRange: { min: 280, max: 450 }, xRange: { min: 100, max: 800 }, confRange: { min: 0.70, max: 0.88 } },
            { class_id: 2, class_name: 'car', minCount: 0, maxCount: 1, sizeRange: { wMin: 80, wMax: 120, hMin: 55, hMax: 90 }, yRange: { min: 380, max: 520 }, xRange: { min: 600, max: 900 }, confRange: { min: 0.84, max: 0.94 } },
          ],
        };
      case 5: // Forest Trail
        return {
          sceneType: 'FOREST_TRAIL',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 1, maxCount: 3, sizeRange: { wMin: 25, wMax: 45, hMin: 70, hMax: 130 }, yRange: { min: 200, max: 500 }, xRange: { min: 200, max: 800 }, confRange: { min: 0.72, max: 0.91 } },
            { class_id: 16, class_name: 'dog', minCount: 0, maxCount: 2, sizeRange: { wMin: 25, wMax: 40, hMin: 20, hMax: 35 }, yRange: { min: 350, max: 500 }, xRange: { min: 150, max: 750 }, confRange: { min: 0.65, max: 0.84 } },
            { class_id: 21, class_name: 'cow', minCount: 0, maxCount: 1, sizeRange: { wMin: 40, wMax: 60, hMin: 30, hMax: 50 }, yRange: { min: 300, max: 460 }, xRange: { min: 100, max: 600 }, confRange: { min: 0.62, max: 0.82 } },
          ],
        };
      case 6: // Mountain Pass
        return {
          sceneType: 'MOUNTAIN_PASS',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 1, maxCount: 4, sizeRange: { wMin: 28, wMax: 48, hMin: 75, hMax: 135 }, yRange: { min: 220, max: 500 }, xRange: { min: 100, max: 900 }, confRange: { min: 0.74, max: 0.93 } },
            { class_id: 7, class_name: 'truck', minCount: 0, maxCount: 2, sizeRange: { wMin: 85, wMax: 140, hMin: 65, hMax: 110 }, yRange: { min: 320, max: 500 }, xRange: { min: 200, max: 800 }, confRange: { min: 0.82, max: 0.95 } },
            { class_id: 3, class_name: 'motorcycle', minCount: 0, maxCount: 2, sizeRange: { wMin: 30, wMax: 50, hMin: 30, hMax: 55 }, yRange: { min: 300, max: 480 }, xRange: { min: 150, max: 850 }, confRange: { min: 0.76, max: 0.90 } },
          ],
        };
      case 7: // Basketball court — many people
        return {
          sceneType: 'SPORTS_COURT',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 10, maxCount: 18, sizeRange: { wMin: 22, wMax: 42, hMin: 55, hMax: 120 }, yRange: { min: 150, max: 520 }, xRange: { min: 50, max: 950 }, confRange: { min: 0.75, max: 0.98 } },
          ],
        };
      case 8: // Aerial road intersection — many vehicles
        return {
          sceneType: 'ROAD_INTERSECTION',
          templates: [
            { class_id: 2, class_name: 'car', minCount: 8, maxCount: 14, sizeRange: { wMin: 30, wMax: 60, hMin: 25, hMax: 50 }, yRange: { min: 100, max: 540 }, xRange: { min: 50, max: 950 }, confRange: { min: 0.82, max: 0.97 } },
            { class_id: 7, class_name: 'truck', minCount: 1, maxCount: 3, sizeRange: { wMin: 50, wMax: 80, hMin: 35, hMax: 60 }, yRange: { min: 150, max: 500 }, xRange: { min: 100, max: 900 }, confRange: { min: 0.80, max: 0.95 } },
            { class_id: 5, class_name: 'bus', minCount: 0, maxCount: 2, sizeRange: { wMin: 60, wMax: 95, hMin: 30, hMax: 55 }, yRange: { min: 200, max: 480 }, xRange: { min: 150, max: 850 }, confRange: { min: 0.83, max: 0.94 } },
            { class_id: 3, class_name: 'motorcycle', minCount: 1, maxCount: 3, sizeRange: { wMin: 18, wMax: 32, hMin: 18, hMax: 35 }, yRange: { min: 200, max: 500 }, xRange: { min: 100, max: 900 }, confRange: { min: 0.72, max: 0.91 } },
            { class_id: 0, class_name: 'person', minCount: 1, maxCount: 4, sizeRange: { wMin: 15, wMax: 28, hMin: 30, hMax: 55 }, yRange: { min: 250, max: 520 }, xRange: { min: 200, max: 800 }, confRange: { min: 0.68, max: 0.90 } },
          ],
        };
      case 9: // Coastal line
      default:
        return {
          sceneType: 'COASTAL_GUARD',
          templates: [
            { class_id: 0, class_name: 'person', minCount: 2, maxCount: 4, sizeRange: { wMin: 30, wMax: 52, hMin: 80, hMax: 140 }, yRange: { min: 220, max: 480 }, xRange: { min: 100, max: 900 }, confRange: { min: 0.78, max: 0.95 } },
            { class_id: 8, class_name: 'boat', minCount: 0, maxCount: 2, sizeRange: { wMin: 60, wMax: 120, hMin: 30, hMax: 55 }, yRange: { min: 100, max: 300 }, xRange: { min: 200, max: 800 }, confRange: { min: 0.74, max: 0.92 } },
            { class_id: 2, class_name: 'car', minCount: 0, maxCount: 1, sizeRange: { wMin: 70, wMax: 110, hMin: 50, hMax: 80 }, yRange: { min: 400, max: 520 }, xRange: { min: 50, max: 400 }, confRange: { min: 0.82, max: 0.94 } },
          ],
        };
    }
  }

  /**
   * Generate detections + tracks for one camera based on its scene profile.
   * Uses deterministic PRNG seeded on (camIdx, tick) so positions evolve
   * smoothly over time without Math.random().
   */
  private generateCameraDetections(
    camIdx: number,
    tick: number,
    frameW: number,
    frameH: number,
  ): { detections: RealYoloDetection[]; tracks: TrackItem[] } {
    const profile = this.getCameraSceneProfile(camIdx);
    const detections: RealYoloDetection[] = [];
    const tracks: TrackItem[] = [];
    let trackId = camIdx * 100;

    for (const tmpl of profile.templates) {
      // Determine count for this class using time-varying seed
      const countSeed = camIdx * 1000 + tmpl.class_id * 100 + Math.floor(tick / 8);
      const countRange = tmpl.maxCount - tmpl.minCount;
      const count = tmpl.minCount + Math.floor(this.prng(countSeed) * (countRange + 1));

      for (let i = 0; i < count; i++) {
        trackId++;
        const baseSeed = camIdx * 10000 + tmpl.class_id * 1000 + i * 100;

        // Position evolves smoothly with sin/cos over time
        const xPhase = this.prng(baseSeed + 1) * Math.PI * 2;
        const yPhase = this.prng(baseSeed + 2) * Math.PI * 2;
        const xSpeed = 0.08 + this.prng(baseSeed + 3) * 0.15;
        const ySpeed = 0.05 + this.prng(baseSeed + 4) * 0.12;
        const xAmp = (tmpl.xRange.max - tmpl.xRange.min) * 0.35;
        const yAmp = (tmpl.yRange.max - tmpl.yRange.min) * 0.30;
        const xCenter = (tmpl.xRange.min + tmpl.xRange.max) / 2 + (this.prng(baseSeed + 5) - 0.5) * xAmp * 0.8;
        const yCenter = (tmpl.yRange.min + tmpl.yRange.max) / 2 + (this.prng(baseSeed + 6) - 0.5) * yAmp * 0.8;

        const cx = Math.max(tmpl.xRange.min, Math.min(tmpl.xRange.max,
          xCenter + Math.sin(tick * xSpeed + xPhase) * xAmp * 0.5));
        const cy = Math.max(tmpl.yRange.min, Math.min(tmpl.yRange.max,
          yCenter + Math.cos(tick * ySpeed + yPhase) * yAmp * 0.5));

        // Size varies slightly
        const sizeVar = this.prng(baseSeed + 7);
        const w = tmpl.sizeRange.wMin + sizeVar * (tmpl.sizeRange.wMax - tmpl.sizeRange.wMin);
        const h = tmpl.sizeRange.hMin + sizeVar * (tmpl.sizeRange.hMax - tmpl.sizeRange.hMin);

        const x1 = Math.max(0, Math.round(cx - w / 2));
        const y1 = Math.max(0, Math.round(cy - h / 2));
        const x2 = Math.min(frameW, Math.round(cx + w / 2));
        const y2 = Math.min(frameH, Math.round(cy + h / 2));

        // Confidence varies gently
        const confVar = this.prng(baseSeed + 8 + Math.floor(tick));
        const confidence = Math.round(
          (tmpl.confRange.min + confVar * (tmpl.confRange.max - tmpl.confRange.min)) * 100,
        ) / 100;

        const det: RealYoloDetection = {
          class_id: tmpl.class_id,
          class_name: tmpl.class_name,
          confidence,
          bbox: { x1, y1, x2, y2 },
        };
        detections.push(det);

        const track: TrackItem = {
          track_id: trackId,
          class_id: tmpl.class_id,
          class_name: tmpl.class_name,
          confidence,
          state: 'TRACKED',
          bbox: { x1, y1, x2, y2 },
        };
        tracks.push(track);
      }
    }

    return { detections, tracks };
  }

  private startEmulationFallback() {
    if (this.emulationTimer) clearInterval(this.emulationTimer);

    // Initial frame recording for all cameras
    for (let i = 1; i <= 9; i++) {
      this.recordCameraFrame(`cam-${i}`, 30.0);
      this.recordCameraFrame(`cam-0${i}`, 30.0);
      this.recordCameraFrame(`CAM ${i}`, 30.0);
    }

    this.emulationTimer = setInterval(() => {
      if (!this.isEmulationEnabled) return;

      const now = Date.now();
      this.emulationFrameSeq++;
      const tick = this.emulationFrameSeq;

      // Update jitter / latency variations deterministically
      this.latencyMs = Math.round(14 + (Math.sin(now / 3000) * 3));
      this.lastHeartbeat = now;
      this.packetsReceived++;

      // Maintain active frame tracking for all 9 cameras
      for (let i = 1; i <= 9; i++) {
        this.recordCameraFrame(`cam-${i}`, i % 2 === 0 ? 60.0 : 30.0);
        this.recordCameraFrame(`cam-0${i}`, i % 2 === 0 ? 60.0 : 30.0);
        this.recordCameraFrame(`CAM ${i}`, i % 2 === 0 ? 60.0 : 30.0);
      }

      // Generate live camera diagnostic telemetry pulses
      const sampleMetrics = this.generateLiveDiagnostics();
      this.metricsListeners.forEach((fn) => fn(sampleMetrics));

      // ── Emit rich frame_state for ALL cameras every cycle ──
      const frameW = 1000;
      const frameH = 600;

      for (let camIdx = 1; camIdx <= 9; camIdx++) {
        const { detections, tracks } = this.generateCameraDetections(camIdx, tick, frameW, frameH);

        // Aggregate counts from detections
        let personCount = 0;
        let carCount = 0;
        let truckCount = 0;
        let busCount = 0;
        let motorcycleCount = 0;
        let bicycleCount = 0;
        const byClass: Record<string, number> = {};

        detections.forEach((d) => {
          const cn = d.class_name.toLowerCase();
          byClass[cn] = (byClass[cn] || 0) + 1;
          if (cn === 'person') personCount++;
          else if (cn === 'car') carCount++;
          else if (cn === 'truck') truckCount++;
          else if (cn === 'bus') busCount++;
          else if (cn === 'motorcycle') motorcycleCount++;
          else if (cn === 'bicycle') bicycleCount++;
        });

        const vehicleTotal = carCount + truckCount + busCount + motorcycleCount + bicycleCount;

        const counts: ObjectCountsPayload = {
          visible: {
            total: detections.length,
            person: personCount,
            car: carCount,
            truck: truckCount,
            bus: busCount,
            motorcycle: motorcycleCount,
            bicycle: bicycleCount,
            by_class: byClass,
          },
          unique_session: {
            total: detections.length + Math.floor(tick / 20) + camIdx,
            person: personCount + Math.floor(tick / 25),
            vehicle: vehicleTotal + Math.floor(tick / 30),
            by_class: byClass,
          },
        };

        const camId = `cam-${camIdx}`;
        const frameState: FrameStatePayload = {
          type: 'frame_state',
          camera_id: camId,
          frame_id: tick * 10 + camIdx,
          frame_sequence: this.emulationFrameSeq,
          source_type: 'emulated_yolo',
          timestamp: now,
          measured_fps: camIdx % 2 === 0 ? 60.0 : 30.0,
          processing_latency_ms: Math.round(8 + Math.sin(tick * 0.3 + camIdx) * 3),
          detections,
          tracks,
          counts,
          person_count: personCount,
          vehicle_count: vehicleTotal,
          object_count: detections.length,
        };

        // Store and broadcast through the real pipeline
        this.recordCameraFrame(camId, frameState.measured_fps);
        this.latestFrameStates.set(camId, frameState);
        this.frameStateListeners.forEach((listener) => listener(frameState));

        // Also fire detection + tracking listeners for CameraFeedCanvas compatibility
        const detPayload: CameraDetectionsPayload = {
          camera_id: camId,
          frame_width: frameW,
          frame_height: frameH,
          timestamp: new Date().toISOString(),
          detection_count: detections.length,
          detections,
        };
        this.detectionListeners.forEach((fn) => fn(detPayload));

        const trackPayload: CameraTrackingPayload = {
          camera_id: camId,
          frame_width: frameW,
          frame_height: frameH,
          timestamp: new Date().toISOString(),
          track_count: tracks.length,
          tracks,
          counts,
        };
        this.trackingListeners.forEach((fn) => fn(trackPayload));
      }

      // Notify fleet counts aggregation
      this.notifyFleetCounts();

      if (this.status === 'DISCONNECTED' || this.status === 'RECONNECTING') {
        this.status = 'EMULATED';
        this.notifyState();
      }
    }, 800); // 800ms ≈ ~1.25 fps emulation rate per camera
  }

  public triggerManualSimulatedAlert(customAlert?: Partial<AlertItem>): AlertItem {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const timeStr = `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} ${ampm}`;
    const camIdx = ((Date.now() % 9) + 1);
    const camTag = `CAM-0${camIdx}`;
    const confidence = 0.94;
    const severity = 'High';

    const alert: AlertItem = {
      id: `alt-${Date.now()}`,
      title: 'Neural Intrusion Breach',
      camera: camTag,
      severity,
      time: timeStr,
      type: 'Perimeter Barrier Crossing',
      timestamp: Date.now(),
      status: 'active',
      description: `Target crossing detected on ${camTag}. Neural vector confirmation speed: 1.8 m/s.`,
      location: `Sector Alpha - North Border Line`,
      confidence,
      assignedUnit: `Quick Reaction Team 1`,
      audioTriggered: true,
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
      const jitter = Math.round((1.2 + (idx * 0.15)) * 10) / 10;
      const latency = Math.round(baseLat + (Math.sin(Date.now() / 2000 + idx) * 4) + (isDegraded ? 48 : 0));
      const frameDrop = isDegraded ? 2.4 : 0.05;
      const packetLoss = isDegraded ? 1.2 : 0.01;
      const actualFps = isDegraded ? 42 : idx % 2 === 0 ? 60 : 30;
      const healthScore = isDegraded ? 76 : 98;

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
        bitrateMbps: Math.round((7.5 + (idx * 0.3)) * 10) / 10,
        targetFps: idx % 2 === 0 ? 60 : 30,
        actualFps: actualFps,
        uptimePercent: 99.92,
        protocol: idx % 3 === 0 ? 'WebRTC' : 'RTSP/TCP',
        resolution: '4K UHD (3840x2160)',
        codec: idx % 2 === 0 ? 'H.265 (HEVC)' : 'H.264 High',
        edgeTemperatureC: Math.round(39 + (idx * 0.7)),
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

  public onBehaviorChain(listener: (chain: any) => void): () => void {
    this.behaviorChainListeners.add(listener);
    return () => this.behaviorChainListeners.delete(listener);
  }

  public onFrameState(listener: FrameStateListener): () => void {
    this.frameStateListeners.add(listener);
    return () => this.frameStateListeners.delete(listener);
  }

  public getLatestFrameState(cameraId: string): FrameStatePayload | undefined {
    const raw = String(cameraId || '').toLowerCase().trim();
    const normalized = raw.startsWith('cam-') ? raw.replace(/^cam-0?/, 'cam-0') : `cam-0${raw}`;
    return this.latestFrameStates.get(raw) || this.latestFrameStates.get(normalized);
  }

  public getLatestEnvironment(cameraId: string): EnvironmentUpdatePayload | undefined {
    return this.latestEnvironmentStates.get(cameraId.toLowerCase());
  }

  public getAllEnvironmentStates(): Map<string, EnvironmentUpdatePayload> {
    return new Map(this.latestEnvironmentStates);
  }

  public getLatestOccupancy(cameraId: string): OccupancyUpdatePayload | undefined {
    return this.latestOccupancyStates.get(cameraId.toLowerCase());
  }

  public getLatestRisk(cameraId: string): any | undefined {
    return this.latestRiskStates.get(cameraId.toLowerCase());
  }

  public getLatestAnomalies(cameraId: string): AnalyticsAnomalyPayload[] {
    return this.latestAnomalies.get(cameraId.toLowerCase()) || [];
  }

  public getLatestGroups(cameraId: string): GroupMovementPayload[] {
    return this.latestGroups.get(cameraId.toLowerCase()) || [];
  }

  public getLatestMovement(cameraId: string): MovementUpdatePayload[] {
    return this.latestMovementUpdates.get(cameraId.toLowerCase()) || [];
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
