export interface CameraDiagnosticMetric {
  cameraId: number | string;
  tag: string;
  name: string;
  location: string;
  status: 'Online' | 'Degraded' | 'Offline';
  latencyMs: number;
  jitterMs: number;
  frameDropRate: number;
  packetLossPercent: number;
  bitrateMbps: number;
  targetFps: number;
  actualFps: number;
  uptimePercent: number;
  protocol: 'RTSP/TCP' | 'RTSP/UDP' | 'WebRTC' | 'HLS/TLS';
  resolution: string;
  codec: string;
  edgeTemperatureC: number;
  healthScore: number;
  lastPingTimestamp: number;
  historyLatency: number[];
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
