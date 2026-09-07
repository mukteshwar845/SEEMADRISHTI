export type AlertSeverity = 'High' | 'Medium' | 'Low';

export interface WebSocketMessage {
  type: 'ALERT_TRIGGER' | 'CAMERA_METRICS' | 'SYSTEM_TELEMETRY' | 'CONNECTION_ACK' | 'PING_PONG';
  payload: any;
  timestamp: number;
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
