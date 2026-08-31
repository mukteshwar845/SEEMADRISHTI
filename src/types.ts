export type ViewMode = 
  | 'dashboard' 
  | 'mission-control'
  | 'agents'
  | 'camera-fleet'
  | 'evidence-queue'
  | 'system-timeline'
  | 'inspector'
  | 'cameras' 
  | 'analytics'
  | 'detections' 
  | 'alerts'
  | 'diagnostics'
  | 'historical-logs' 
  | 'notification-history'
  | 'livestream' 
  | 'stitching' 
  | 'calibration'
  | 'target-journey'
  | 'threat-map'
  | 'settings' 
  | 'users';

export interface TacticalAgentInfo {
  id: string;
  name: string;
  codename: string;
  role: string;
  specialization: string;
  status: 'IDLE' | 'ANALYZING' | 'DELIBERATING' | 'DISPATCHING' | 'ALERT';
  confidence: number;
  neuralLoad: number; // 0 - 100%
  latencyMs: number;
  color: string;
  avatarIcon: string;
  lastAction: string;
  actionCount: number;
}

export interface AgentDeliberationMessage {
  id: string;
  agentId: string;
  agentName: string;
  role: string;
  color: string;
  timestamp: string;
  thoughtTrace: string;
  evidencePoints: string[];
  recommendedAction: string;
  confidence: number;
  dissentingNote?: string;
}

export interface MultiAgentPlan {
  incidentId: string;
  scenarioTitle: string;
  consensusScore: number;
  threatLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | 'DEFCON-1';
  targetTrackId: string;
  sector: string;
  summary: string;
  deliberationLog: AgentDeliberationMessage[];
  countermeasures: {
    id: string;
    label: string;
    status: 'READY' | 'EXECUTED' | 'STANDBY';
    assignedTo: string;
    priority: 'HIGH' | 'CRITICAL' | 'URGENT';
    actionPayload: string;
  }[];
}

export type AlertSeverity = 'High' | 'Medium' | 'Low';

export interface CameraDiagnosticMetric {
  cameraId: number | string;
  tag: string;
  name: string;
  location: string;
  status: 'Online' | 'Degraded' | 'Offline';
  latencyMs: number;
  jitterMs: number;
  frameDropRate: number; // percentage e.g. 0.12%
  packetLossPercent: number; // e.g. 0.05%
  bitrateMbps: number; // e.g. 8.4
  targetFps: number;
  actualFps: number;
  uptimePercent: number; // e.g. 99.94
  protocol: 'RTSP/TCP' | 'RTSP/UDP' | 'WebRTC' | 'HLS/TLS';
  resolution: string;
  codec: string;
  edgeTemperatureC: number;
  healthScore: number; // 0 - 100
  lastPingTimestamp: number;
  historyLatency: number[]; // last 10-20 measurements
}

export interface WebSocketMessage {
  type: 'ALERT_TRIGGER' | 'CAMERA_METRICS' | 'SYSTEM_TELEMETRY' | 'CONNECTION_ACK' | 'PING_PONG';
  payload: any;
  timestamp: number;
}

export interface RecordedClip {
  id: string;
  cameraId: string;
  cameraCode: string;
  cameraName: string;
  location: string;
  rtspUrl?: string;
  startTime: string;
  endTime: string;
  startTimestamp: number;
  endTimestamp: number;
  durationSeconds: number;
  fileSizeMb: number;
  resolution: string;
  fps: number;
  thumbnailUrl: string;
  videoUrl?: string;
  tags: string[];
  triggerType: 'manual' | 'anomaly_auto';
  videoBlobUrl?: string;
  eventsDetectedCount: number;
  dangerZoneBreach?: boolean;
}

export interface AlertItem {
  id: string;
  title: string;
  camera: string;
  severity: AlertSeverity;
  time: string;
  type: string;
  timestamp: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'response_initiated';
  description?: string;
  location?: string;
  confidence?: number;
  snapshotUrl?: string;
  assignedUnit?: string;
  audioTriggered?: boolean;
  thresholdAtTime?: number;
  trackId?: number | string;
  className?: string;
  riskScore?: number;
  riskLevel?: string;
  reasons?: Array<{ code?: string; description?: string; points?: number }>;
  hasEvidence?: boolean;
  incidentId?: string;
  correlationId?: string;
  cameraSequence?: string[];
  anomalyType?: string;
  dwellSeconds?: number;
  zoneName?: string;
  isNight?: boolean;
}

export interface DetectionItem {
  id: string;
  label: 'PERSON' | 'VEHICLE' | 'NO_HELMET' | 'INTRUSION' | 'LOITERING' | 'ABANDONED_BAG';
  confidence: number;
  camera: string;
  location: string;
  time: string;
  bbox: { x: number; y: number; width: number; height: number };
  color: string;
  riskScore: number;
  trajectory?: { x: number; y: number }[];
}

export interface MatrixCameraFeed {
  id: number;
  tag: string;
  name: string;
  src: string;
  status: 'Online' | 'Offline' | 'Standby' | string;
  alertType: string;
  risk: 'High' | 'Medium' | 'Low' | 'Normal' | string;
  location?: string;
  resolution?: string;
  fps?: number;
  bitrate?: string;
  aiModels?: string[];
  activeDetections?: number;
  batteryLevel?: number;
}

export interface CameraFeed {
  id: string;
  name: string;
  code: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  rtspUrl: string;
  resolution: string;
  fps: number;
  bitrate: string;
  aiModels: string[];
  activeDetections: number;
  dangerZones: {
    name: string;
    points: { x: number; y: number }[];
    type: 'restricted' | 'warning' | 'monitored';
  }[];
}

export interface SystemTelemetry {
  cpuUsage: number; // percentage e.g. 45
  cpuLoad: string; // e.g. "load 2.3"
  memoryUsedGb: number; // e.g. 6.2
  memoryTotalGb: number; // e.g. 16
  storageUsedPercent: number; // e.g. 78
  storageUsedTb: number; // e.g. 2.1
  storageTotalTb: number; // e.g. 3
  networkMbps: number; // e.g. 250
  networkStatus: string; // "(Stable)"
}
