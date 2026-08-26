import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';

// ============================================================================
// TYPES & DATA STRUCTURES (Matching Frontend Schema in src/types.ts)
// ============================================================================

export type AlertSeverity = 'High' | 'Medium' | 'Low';

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
  reasons?: string[];
}

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

export interface CameraEntity {
  id: string | number;
  tag: string;
  name: string;
  location: string;
  rtsp_url: string;
  status: 'Online' | 'Degraded' | 'Offline';
  fps: number;
  resolution: string;
  bitrate: string;
  aiModels: string[];
  activeDetections: number;
  batteryLevel?: number;
  zones: {
    id: string;
    name: string;
    type: 'RESTRICTED_ZONE' | 'BUFFER_ZONE' | 'MONITORED_ZONE';
    polygon: number[][];
    loiter_threshold_seconds?: number;
  }[];
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

const cameras: CameraEntity[] = [
  {
    id: 1,
    tag: 'CAM-01',
    name: 'Sector A - Urban Night Corridor',
    location: 'North Arterial Roadway - Night CCTV Overhead',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-01',
    status: 'Online',
    fps: 60,
    resolution: '4K UHD (3840x2160)',
    bitrate: '9.4 Mbps',
    aiModels: ['YOLOv11-NightVision', 'ANPR-SpeedAudit', 'Lane-Tracker'],
    activeDetections: 4,
    batteryLevel: 94,
    zones: [
      {
        id: 'zone-01',
        name: 'Restricted Perimeter Line',
        type: 'RESTRICTED_ZONE',
        polygon: [[0.1, 0.8], [0.9, 0.8], [0.9, 0.95], [0.1, 0.95]],
      },
    ],
  },
  {
    id: 2,
    tag: 'CAM-02',
    name: 'Sector B - Aerial Crosshatch Box Junction',
    location: 'Monochrome Aerial UAV - Junction Grid C-2',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-02',
    status: 'Online',
    fps: 30,
    resolution: '4K (3840x2160)',
    bitrate: '7.8 Mbps',
    aiModels: ['Aerial-VehicleTracker', 'YellowBox-Audit', 'Trajectory-v4'],
    activeDetections: 3,
    batteryLevel: 82,
    zones: [
      {
        id: 'zone-02',
        name: 'Box Clearance Grid',
        type: 'BUFFER_ZONE',
        polygon: [[0.2, 0.3], [0.8, 0.3], [0.8, 0.7], [0.2, 0.7]],
        loiter_threshold_seconds: 15,
      },
    ],
  },
  {
    id: 3,
    tag: 'CAM-03',
    name: 'Sector C - Thai-Japanese Flyover Multi-Level Junction',
    location: 'Bangkok Flyover Arterial - Thai-Japanese Bridge CCTV',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-03',
    status: 'Online',
    fps: 60,
    resolution: '4K (3840x2160)',
    bitrate: '11.2 Mbps',
    aiModels: ['Dense-TrafficFlow', 'Motorbike-Classifier', 'Flyover-Monitor'],
    activeDetections: 6,
    batteryLevel: 98,
    zones: [],
  },
  {
    id: 4,
    tag: 'CAM-04',
    name: 'Sector D - City Center Tram Corridor & Pedestrian Plaza',
    location: 'Transit Arterial East - Light Rail Tram Line & Square',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-04',
    status: 'Online',
    fps: 60,
    resolution: '4K (3840x2160)',
    bitrate: '8.1 Mbps',
    aiModels: ['Tram-Clearance', 'PedestrianDwell-Net', 'CrowdDensity-v2'],
    activeDetections: 5,
    batteryLevel: 91,
    zones: [],
  },
  {
    id: 5,
    tag: 'CAM-05',
    name: 'Sector E - Citadel Corner Tactical Transit Checkpoint',
    location: 'West Bastion Gate - Vehicle Ingress & Barrier Guard',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-05',
    status: 'Online',
    fps: 60,
    resolution: '4K (3840x2160)',
    bitrate: '9.6 Mbps',
    aiModels: ['ANPR-Engine-EU', 'Cargo-Profiler', 'Underbody-Scan'],
    activeDetections: 2,
    batteryLevel: 88,
    zones: [],
  },
  {
    id: 6,
    tag: 'CAM-06',
    name: 'Sector F - Armory Logistics Depot & Perimeter Gate',
    location: 'Logistics Facility Bravo - East Perimeter High Security',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-06',
    status: 'Online',
    fps: 60,
    resolution: '4K (3840x2160)',
    bitrate: '10.5 Mbps',
    aiModels: ['Biometric-AccessAudit', 'PerimeterLaser-Tripwire', 'IntruderNet'],
    activeDetections: 3,
    batteryLevel: 95,
    zones: [],
  },
  {
    id: 7,
    tag: 'CAM-07',
    name: 'Sector G - Highway Patrol Radar Speed Trap Post',
    location: 'South Arterial Highway Milepost 14 - Radar Mast',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-07',
    status: 'Online',
    fps: 60,
    resolution: '4K UHD (3840x2160)',
    bitrate: '8.9 Mbps',
    aiModels: ['SpeedRadar-G', 'NightVision-IR', 'Tailgating-Audit'],
    activeDetections: 2,
    batteryLevel: 79,
    zones: [],
  },
  {
    id: 8,
    tag: 'CAM-08',
    name: 'Sector H - Watchtower 360 Apex Surveillance Mast',
    location: 'High Watchtower Alpha - 360 Long-Range Mast Sensor',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-08',
    status: 'Online',
    fps: 30,
    resolution: '4K (3840x2160)',
    bitrate: '6.4 Mbps',
    aiModels: ['LongRange-HorizonOptic', 'Drone-Countermeasure', 'PTZ-AutoTrack'],
    activeDetections: 1,
    batteryLevel: 100,
    zones: [],
  },
  {
    id: 9,
    tag: 'CAM-09',
    name: 'Sector I - Forward Recon Forward Perimeter Observation',
    location: 'Sector 9 Outpost - Forward Perimeter Low-Angle Camera',
    rtsp_url: 'rtsp://127.0.0.1:8554/live/cam-09',
    status: 'Online',
    fps: 60,
    resolution: '4K (3840x2160)',
    bitrate: '12.0 Mbps',
    aiModels: ['Laser-Tripwire-Breach', 'Thermal-FLIR-IR', 'QRT-AutoAlert'],
    activeDetections: 4,
    batteryLevel: 87,
    zones: [],
  },
];

let alertsLog: AlertItem[] = [
  {
    id: 'ALT-9042',
    title: 'Perimeter Laser Tripwire Breach',
    camera: 'CAM-09',
    severity: 'High',
    time: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'LASER_TRIPWIRE_BREACH',
    timestamp: Date.now() - 1000 * 60 * 3,
    status: 'active',
    description: 'Target breached virtual laser tripwire corridor at Forward Recon outpost.',
    location: 'Sector 9 Outpost - Forward Perimeter Low-Angle Camera',
    confidence: 94.6,
    assignedUnit: 'QRT Unit Alpha (En Route)',
    audioTriggered: true,
    reasons: ['[TARGET: HUMAN]', '[ZONE: RESTRICTED]', '[SPEED: 4.2 M/S]'],
  },
  {
    id: 'ALT-9041',
    title: 'Yellow Box Clearance Violation',
    camera: 'CAM-02',
    severity: 'Medium',
    time: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'BOX_JUNCTION_OBSTRUCTION',
    timestamp: Date.now() - 1000 * 60 * 12,
    status: 'acknowledged',
    description: 'Vehicle stationary in yellow box junction exceeding 15 second clearance window.',
    location: 'Monochrome Aerial UAV - Junction Grid C-2',
    confidence: 88.2,
    assignedUnit: 'Traffic Desk 4',
    reasons: ['[DWELL TIME: 19.4S]', '[YELLOW_BOX_OCCUPANCY: 100%]'],
  },
  {
    id: 'ALT-9040',
    title: 'Speed Violation (48 KM/H in 20 MPH Zone)',
    camera: 'CAM-01',
    severity: 'Medium',
    time: new Date(Date.now() - 1000 * 60 * 25).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'SPEED_VIOLATION',
    timestamp: Date.now() - 1000 * 60 * 25,
    status: 'resolved',
    description: 'Plate LD19 XKV flagged at 48 km/h on urban night corridor.',
    location: 'North Arterial Roadway - Night CCTV Overhead',
    confidence: 97.1,
    assignedUnit: 'Auto-Citation Engine',
    reasons: ['[ANPR: LD19 XKV]', '[RADAR_DELTA: +16 KM/H]'],
  },
];

let systemTelemetry: SystemTelemetry = {
  cpuUsage: 42,
  cpuLoad: '42% (8-Core Jetson Orin)',
  memoryUsedGb: 6.4,
  memoryTotalGb: 16.0,
  storageUsedPercent: 78,
  storageUsedTb: 2.34,
  storageTotalTb: 3.0,
  networkMbps: 248,
  networkStatus: '(Stable 250Mbps)',
};

// Generates live camera diagnostics matching frontend CameraDiagnosticMetric interface
function generateCameraMetrics(): CameraDiagnosticMetric[] {
  return cameras.map((cam, idx) => {
    const isDegraded = cam.status === 'Degraded' || (idx === 7 && Math.sin(Date.now() / 15000) > 0.85);
    const latency = Math.round(9 + Math.sin(Date.now() / 2000 + idx) * 3 + (isDegraded ? 22 : 0));
    const jitter = Math.round((0.8 + Math.random() * 0.9) * 10) / 10;
    const frameDrop = isDegraded ? 0.35 : Math.round(Math.random() * 0.08 * 100) / 100;
    const packetLoss = isDegraded ? 0.12 : Math.round(Math.random() * 0.03 * 100) / 100;
    const actualFps = isDegraded ? Math.round(cam.fps * 0.82) : cam.fps;
    const healthScore = isDegraded ? 74 : Math.round(96 + Math.random() * 3.8);

    return {
      cameraId: cam.id,
      tag: cam.tag,
      name: cam.name,
      location: cam.location,
      status: isDegraded ? 'Degraded' : 'Online',
      latencyMs: latency,
      jitterMs: jitter,
      frameDropRate: frameDrop,
      packetLossPercent: packetLoss,
      bitrateMbps: Math.round((7.5 + idx * 0.3 + Math.random() * 0.8) * 10) / 10,
      targetFps: cam.fps,
      actualFps: actualFps,
      uptimePercent: 99.94,
      protocol: idx % 3 === 0 ? 'WebRTC' : 'RTSP/TCP',
      resolution: cam.resolution,
      codec: idx % 2 === 0 ? 'H.265 (HEVC)' : 'H.264 High',
      edgeTemperatureC: Math.round(39 + idx * 0.7 + Math.random() * 2),
      healthScore,
      lastPingTimestamp: Date.now(),
      historyLatency: [
        Math.max(6, latency - 4),
        Math.max(6, latency - 2),
        latency,
        Math.max(6, latency + 1),
        latency,
      ],
    };
  });
}

function updateTelemetryTick() {
  const cpuVariation = Math.round(Math.sin(Date.now() / 5000) * 8);
  const memVariation = Math.round(Math.cos(Date.now() / 7000) * 0.4 * 10) / 10;
  const netVariation = Math.round(Math.sin(Date.now() / 4000) * 18);

  systemTelemetry = {
    cpuUsage: Math.min(95, Math.max(25, 42 + cpuVariation)),
    cpuLoad: `${Math.min(95, Math.max(25, 42 + cpuVariation))}% (8-Core Jetson Orin)`,
    memoryUsedGb: Math.round((6.4 + memVariation) * 10) / 10,
    memoryTotalGb: 16.0,
    storageUsedPercent: 78,
    storageUsedTb: 2.34,
    storageTotalTb: 3.0,
    networkMbps: Math.max(180, 248 + netVariation),
    networkStatus: `(Stable ${Math.max(180, 248 + netVariation)}Mbps)`,
  };
}

// ============================================================================
// EXPRESS APP CONFIGURATION & REST APIS
// ============================================================================

const app = express();

app.use(express.json());

// Enable full CORS for any origin (development / command center UI)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Root & Health
app.get('/', (req: Request, res: Response) => {
  res.json({
    project: 'SEEMADRISHTI AI',
    description: 'Tactical Multi-Camera CCTV Surveillance & Threat Intelligence Command Gateway',
    version: '4.2.0',
    status: 'ONLINE',
    time: new Date().toISOString(),
    apiDocs: '/api/v1',
    wsAlerts: '/ws/alerts',
    wsTelemetry: '/ws/telemetry',
  });
});

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    version: '4.2.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
    edgeNode: 'Jetson-Orin-SDR-01',
    connectedWsClients: wsClients.size,
  });
});

// 1. Camera Management Endpoints
app.get('/api/v1/cameras', (req: Request, res: Response) => {
  res.json(cameras);
});

app.get('/api/v1/cameras/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const camera = cameras.find((c) => String(c.id) === id || c.tag.toLowerCase() === id.toLowerCase());
  if (!camera) {
    res.status(404).json({ error: `Camera ${id} not found` });
    return;
  }
  res.json(camera);
});

app.post('/api/v1/cameras/:id/zones', (req: Request, res: Response) => {
  const id = req.params.id;
  const camera = cameras.find((c) => String(c.id) === id || c.tag.toLowerCase() === id.toLowerCase());
  if (!camera) {
    res.status(404).json({ error: `Camera ${id} not found` });
    return;
  }

  const { name, type, polygon, loiter_threshold_seconds } = req.body;
  const newZone = {
    id: `zone-${Date.now()}`,
    name: name || 'Custom Geofence',
    type: type || 'RESTRICTED_ZONE',
    polygon: polygon || [],
    loiter_threshold_seconds: loiter_threshold_seconds || 15,
  };

  camera.zones.push(newZone);
  res.status(201).json({ message: 'Zone saved successfully', zone: newZone });
});

// 2. Alerts & Events Endpoints
app.get('/api/v1/alerts', (req: Request, res: Response) => {
  const { severity, status, limit } = req.query;
  let filtered = [...alertsLog];

  if (severity) {
    filtered = filtered.filter((a) => a.severity.toLowerCase() === String(severity).toLowerCase());
  }
  if (status) {
    filtered = filtered.filter((a) => a.status.toLowerCase() === String(status).toLowerCase());
  }

  const maxLimit = limit ? parseInt(String(limit), 10) : 50;
  res.json(filtered.slice(0, maxLimit));
});

app.post('/api/v1/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const alertId = req.params.id;
  const alert = alertsLog.find((a) => a.id.toLowerCase() === alertId.toLowerCase());
  if (!alert) {
    res.status(404).json({ error: `Alert ${alertId} not found` });
    return;
  }

  const { operator_id, action } = req.body;
  alert.status = 'acknowledged';
  alert.assignedUnit = action ? `Unit Dispatched (${action})` : 'Acknowledged by ' + (operator_id || 'HQ Operator');

  // Broadcast state update to all WebSocket listeners
  broadcastWebSocketMessage({
    type: 'ALERT_TRIGGER',
    payload: alert,
    timestamp: Date.now(),
  });

  res.json({ message: 'Alert acknowledged', alert });
});

app.get('/api/v1/alerts/:id/evidence', (req: Request, res: Response) => {
  const alertId = req.params.id;
  const alert = alertsLog.find((a) => a.id.toLowerCase() === alertId.toLowerCase());
  if (!alert) {
    res.status(404).json({ error: `Alert ${alertId} not found` });
    return;
  }

  res.json({
    alertId: alert.id,
    camera: alert.camera,
    timestamp: alert.timestamp,
    snapshot_url: alert.snapshotUrl || `/evidence/snapshots/${alert.id}.jpg`,
    clip_url: `/evidence/clips/${alert.id}.mp4`,
    trajectory_points: [
      { x: 0.22, y: 0.78, timestamp: alert.timestamp - 3000 },
      { x: 0.31, y: 0.81, timestamp: alert.timestamp - 2000 },
      { x: 0.44, y: 0.85, timestamp: alert.timestamp - 1000 },
      { x: 0.52, y: 0.88, timestamp: alert.timestamp },
    ],
    risk_score: alert.severity === 'High' ? 95 : alert.severity === 'Medium' ? 72 : 45,
    unit_assigned: alert.assignedUnit || 'Standby Command',
    reasons: alert.reasons || ['[PERIMETER_BREACH]', '[AI_CONFIDENCE: >90%]'],
  });
});

// 3. System Telemetry Endpoint
app.get('/api/v1/system/telemetry', (req: Request, res: Response) => {
  res.json(systemTelemetry);
});

// 4. Alert Simulation Endpoint (Can be triggered via curl or frontend)
app.post('/api/v1/alerts/simulate', (req: Request, res: Response) => {
  const body = req.body || {};
  const camTag = body.camera || `CAM-0${Math.floor(Math.random() * 9) + 1}`;
  const matchedCam = cameras.find((c) => c.tag === camTag) || cameras[0];

  const now = new Date();
  const alertId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
  const newAlert: AlertItem = {
    id: alertId,
    title: body.title || 'Tactical Perimeter Intrusion Detected',
    camera: camTag,
    severity: (body.severity as AlertSeverity) || 'High',
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: body.type || 'PERIMETER_INTRUSION',
    timestamp: now.getTime(),
    status: 'active',
    description: body.description || `Tactical boundary breach registered on ${matchedCam.name}.`,
    location: matchedCam.location,
    confidence: Math.round((91 + Math.random() * 7.5) * 10) / 10,
    assignedUnit: 'Rapid Response Team (Auto-Dispatched)',
    audioTriggered: true,
    reasons: body.reasons || ['[TARGET: SUSPICIOUS_MOVEMENT]', `[ZONE: ${matchedCam.tag}]`, '[TIME: ACTIVE]'],
  };

  alertsLog.unshift(newAlert);
  if (alertsLog.length > 50) alertsLog.pop();

  broadcastWebSocketMessage({
    type: 'ALERT_TRIGGER',
    payload: newAlert,
    timestamp: Date.now(),
  });

  res.status(201).json({ message: 'Simulated alert broadcasted', alert: newAlert });
});

// ============================================================================
// WEBSOCKET SERVER SETUP & SUBSCRIPTIONS
// ============================================================================

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const wsClients = new Set<WebSocket>();

function broadcastWebSocketMessage(msg: { type: string; payload: any; timestamp: number }) {
  const json = JSON.stringify(msg);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  wsClients.add(ws);
  const clientPath = req.url || '/';
  console.log(`[WS] Client connected. URL: ${clientPath} | Total active: ${wsClients.size}`);

  // Send Initial Connection Acknowledgement
  ws.send(
    JSON.stringify({
      type: 'CONNECTION_ACK',
      payload: {
        message: 'SEEMADRISHTI AI Tactical Edge Gateway Connected',
        version: '4.2.0',
        node: 'Edge-Jetson-Orin-Command',
        connectedAt: Date.now(),
      },
      timestamp: Date.now(),
    })
  );

  // Immediately push fresh camera metrics and system telemetry
  ws.send(
    JSON.stringify({
      type: 'CAMERA_METRICS',
      payload: generateCameraMetrics(),
      timestamp: Date.now(),
    })
  );

  ws.send(
    JSON.stringify({
      type: 'SYSTEM_TELEMETRY',
      payload: systemTelemetry,
      timestamp: Date.now(),
    })
  );

  // Message Handler (Handling PING/PONG and client commands)
  ws.on('message', (rawData: string) => {
    try {
      const data = JSON.parse(rawData.toString());
      if (data.type === 'PING') {
        // Immediate low-latency response
        ws.send(
          JSON.stringify({
            type: 'PING_PONG',
            payload: { pong: true },
            timestamp: data.timestamp || Date.now(),
          })
        );
      } else if (data.type === 'ACK_ALERT' && data.payload?.id) {
        const target = alertsLog.find((a) => a.id === data.payload.id);
        if (target) {
          target.status = 'acknowledged';
          broadcastWebSocketMessage({
            type: 'ALERT_TRIGGER',
            payload: target,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      console.warn('[WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WS] Client disconnected. Total active: ${wsClients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err);
    wsClients.delete(ws);
  });
});

// Periodic Telemetry & Camera Diagnostics Heartbeat Broadcaster
setInterval(() => {
  if (wsClients.size === 0) return;
  updateTelemetryTick();

  broadcastWebSocketMessage({
    type: 'CAMERA_METRICS',
    payload: generateCameraMetrics(),
    timestamp: Date.now(),
  });

  broadcastWebSocketMessage({
    type: 'SYSTEM_TELEMETRY',
    payload: systemTelemetry,
    timestamp: Date.now(),
  });
}, 2500);

// Occasional tactical alerts simulator (every 45 seconds if no alerts have occurred)
setInterval(() => {
  if (wsClients.size === 0) return;
  // Trigger a low-priority automated radar or compliance update
  const randomCam = cameras[Math.floor(Math.random() * cameras.length)];
  const now = new Date();
  const automatedAlert: AlertItem = {
    id: `ALT-${Math.floor(2000 + Math.random() * 7000)}`,
    title: 'Automated Perimeter Optical Scan Log',
    camera: randomCam.tag,
    severity: 'Low',
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'ROUTINE_OPTICAL_SCAN',
    timestamp: now.getTime(),
    status: 'active',
    description: `Optical flow radar scan nominal across ${randomCam.name}.`,
    location: randomCam.location,
    confidence: 96.8,
    assignedUnit: 'Automated Log Engine',
    audioTriggered: false,
    reasons: ['[SCAN: ROUTINE_PASS]', '[AI_CONF: 96.8%]'],
  };

  alertsLog.unshift(automatedAlert);
  if (alertsLog.length > 50) alertsLog.pop();

  broadcastWebSocketMessage({
    type: 'ALERT_TRIGGER',
    payload: automatedAlert,
    timestamp: Date.now(),
  });
}, 45000);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👁️  SEEMADRISHTI AI - TACTICAL COMMAND EDGE GATEWAY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Backend REST API:  http://127.0.0.1:${PORT}/api/v1                           │
│ ● WebSocket Alerts:  ws://127.0.0.1:${PORT}/ws/alerts                         │
│ ● Telemetry Stream:  ws://127.0.0.1:${PORT}/ws/telemetry                      │
│ ● System Health:     http://127.0.0.1:${PORT}/api/v1/health                    │
│ ● Bound Interface:   ${HOST}:${PORT} (Ready for Tactical Command HUD)         │
└─────────────────────────────────────────────────────────────────────────────┘
  `);
});
