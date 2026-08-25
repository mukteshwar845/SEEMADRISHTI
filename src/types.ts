export type ViewMode = 
  | 'dashboard' 
  | 'inspector'
  | 'cameras' 
  | 'analytics'
  | 'detections' 
  | 'alerts'
  | 'historical-logs' 
  | 'livestream' 
  | 'stitching' 
  | 'settings' 
  | 'users';

export type AlertSeverity = 'High' | 'Medium' | 'Low';

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
