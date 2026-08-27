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
