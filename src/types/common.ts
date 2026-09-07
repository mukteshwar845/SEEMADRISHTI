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
  | 'terminal'
  | 'radar-map'
  | 'sandbox'
  | 'settings' 
  | 'users';

export type DefconLevel = 1 | 2 | 3 | 4 | 5;

export interface SystemTelemetry {
  cpuUsage: number;
  cpuLoad: string;
  memoryUsedGb: number;
  memoryTotalGb: number;
  storageUsedPercent: number;
  storageUsedTb: number;
  storageTotalTb: number;
  networkMbps: number;
  networkStatus: string;
}
