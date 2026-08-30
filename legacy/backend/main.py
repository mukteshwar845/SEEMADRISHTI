"""
=============================================================================
LEGACY / ARCHIVED MODULE: SEEMADRISHTI FastAPI Prototype
STATUS: DEPRECATED & INACTIVE
=============================================================================
This file was an early standalone FastAPI prototype from initial development.
It has been completely superseded by the production Node.js/Express + SQLite
backend located in `server/` (`server/index.ts`, `server/app.ts`).

This file is preserved solely for historical reference and is NOT used by
the runtime application, test runner, or production server.
=============================================================================
"""

import asyncio
import json
import math
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================================
# DATA MODELS
# ============================================================================

class ZoneModel(BaseModel):
    id: str
    name: str
    type: str = "RESTRICTED_ZONE"
    polygon: List[List[float]] = []
    loiter_threshold_seconds: Optional[int] = 15

class CameraModel(BaseModel):
    id: int
    tag: str
    name: str
    location: str
    rtsp_url: str
    status: str = "Online"
    fps: float = 60.0
    resolution: str = "4K UHD (3840x2160)"
    bitrate: str = "9.4 Mbps"
    aiModels: List[str] = []
    activeDetections: int = 0
    batteryLevel: int = 90
    zones: List[ZoneModel] = []

class AlertItemModel(BaseModel):
    id: str
    title: str
    camera: str
    severity: str
    time: str
    type: str
    timestamp: int
    status: str = "active"
    description: Optional[str] = None
    location: Optional[str] = None
    confidence: Optional[float] = None
    assignedUnit: Optional[str] = None
    audioTriggered: Optional[bool] = True
    reasons: Optional[List[str]] = []

class AcknowledgePayload(BaseModel):
    operator_id: Optional[str] = "HQ-Operator"
    action: Optional[str] = "DISPATCH_QRT"

# ============================================================================
# SEED DATA
# ============================================================================

CAMERAS_DB: List[Dict[str, Any]] = [
    {
        "id": 1,
        "tag": "CAM-01",
        "name": "Sector A - Urban Night Corridor",
        "location": "North Arterial Roadway - Night CCTV Overhead",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-01",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K UHD (3840x2160)",
        "bitrate": "9.4 Mbps",
        "aiModels": ["YOLOv11-NightVision", "ANPR-SpeedAudit", "Lane-Tracker"],
        "activeDetections": 4,
        "batteryLevel": 94,
        "zones": [
            {
                "id": "zone-01",
                "name": "Restricted Perimeter Line",
                "type": "RESTRICTED_ZONE",
                "polygon": [[0.1, 0.8], [0.9, 0.8], [0.9, 0.95], [0.1, 0.95]],
                "loiter_threshold_seconds": 15,
            }
        ],
    },
    {
        "id": 2,
        "tag": "CAM-02",
        "name": "Sector B - Aerial Crosshatch Box Junction",
        "location": "Monochrome Aerial UAV - Junction Grid C-2",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-02",
        "status": "Online",
        "fps": 30.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "7.8 Mbps",
        "aiModels": ["Aerial-VehicleTracker", "YellowBox-Audit", "Trajectory-v4"],
        "activeDetections": 3,
        "batteryLevel": 82,
        "zones": [
            {
                "id": "zone-02",
                "name": "Box Clearance Grid",
                "type": "BUFFER_ZONE",
                "polygon": [[0.2, 0.3], [0.8, 0.3], [0.8, 0.7], [0.2, 0.7]],
                "loiter_threshold_seconds": 15,
            }
        ],
    },
    {
        "id": 3,
        "tag": "CAM-03",
        "name": "Sector C - Thai-Japanese Flyover Multi-Level Junction",
        "location": "Bangkok Flyover Arterial - Thai-Japanese Bridge CCTV",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-03",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "11.2 Mbps",
        "aiModels": ["Dense-TrafficFlow", "Motorbike-Classifier", "Flyover-Monitor"],
        "activeDetections": 6,
        "batteryLevel": 98,
        "zones": [],
    },
    {
        "id": 4,
        "tag": "CAM-04",
        "name": "Sector D - City Center Tram Corridor & Pedestrian Plaza",
        "location": "Transit Arterial East - Light Rail Tram Line & Square",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-04",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "8.1 Mbps",
        "aiModels": ["Tram-Clearance", "PedestrianDwell-Net", "CrowdDensity-v2"],
        "activeDetections": 5,
        "batteryLevel": 91,
        "zones": [],
    },
    {
        "id": 5,
        "tag": "CAM-05",
        "name": "Sector E - Citadel Corner Tactical Transit Checkpoint",
        "location": "West Bastion Gate - Vehicle Ingress & Barrier Guard",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-05",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "9.6 Mbps",
        "aiModels": ["ANPR-Engine-EU", "Cargo-Profiler", "Underbody-Scan"],
        "activeDetections": 2,
        "batteryLevel": 88,
        "zones": [],
    },
    {
        "id": 6,
        "tag": "CAM-06",
        "name": "Sector F - Armory Logistics Depot & Perimeter Gate",
        "location": "Logistics Facility Bravo - East Perimeter High Security",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-06",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "10.5 Mbps",
        "aiModels": ["Biometric-AccessAudit", "PerimeterLaser-Tripwire", "IntruderNet"],
        "activeDetections": 3,
        "batteryLevel": 95,
        "zones": [],
    },
    {
        "id": 7,
        "tag": "CAM-07",
        "name": "Sector G - Highway Patrol Radar Speed Trap Post",
        "location": "South Arterial Highway Milepost 14 - Radar Mast",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-07",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K UHD (3840x2160)",
        "bitrate": "8.9 Mbps",
        "aiModels": ["SpeedRadar-G", "NightVision-IR", "Tailgating-Audit"],
        "activeDetections": 2,
        "batteryLevel": 79,
        "zones": [],
    },
    {
        "id": 8,
        "tag": "CAM-08",
        "name": "Sector H - Watchtower 360 Apex Surveillance Mast",
        "location": "High Watchtower Alpha - 360 Long-Range Mast Sensor",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-08",
        "status": "Online",
        "fps": 30.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "6.4 Mbps",
        "aiModels": ["LongRange-HorizonOptic", "Drone-Countermeasure", "PTZ-AutoTrack"],
        "activeDetections": 1,
        "batteryLevel": 100,
        "zones": [],
    },
    {
        "id": 9,
        "tag": "CAM-09",
        "name": "Sector I - Forward Recon Forward Perimeter Observation",
        "location": "Sector 9 Outpost - Forward Perimeter Low-Angle Camera",
        "rtsp_url": "rtsp://127.0.0.1:8554/live/cam-09",
        "status": "Online",
        "fps": 60.0,
        "resolution": "4K (3840x2160)",
        "bitrate": "12.0 Mbps",
        "aiModels": ["Laser-Tripwire-Breach", "Thermal-FLIR-IR", "QRT-AutoAlert"],
        "activeDetections": 4,
        "batteryLevel": 87,
        "zones": [],
    },
]

now_ms = int(time.time() * 1000)
ALERTS_DB: List[Dict[str, Any]] = [
    {
        "id": "ALT-9042",
        "title": "Perimeter Laser Tripwire Breach",
        "camera": "CAM-09",
        "severity": "High",
        "time": time.strftime("%I:%M:%S %p", time.localtime(time.time() - 180)),
        "type": "LASER_TRIPWIRE_BREACH",
        "timestamp": now_ms - 180000,
        "status": "active",
        "description": "Target breached virtual laser tripwire corridor at Forward Recon outpost.",
        "location": "Sector 9 Outpost - Forward Perimeter Low-Angle Camera",
        "confidence": 94.6,
        "assignedUnit": "QRT Unit Alpha (En Route)",
        "audioTriggered": True,
        "reasons": ["[TARGET: HUMAN]", "[ZONE: RESTRICTED]", "[SPEED: 4.2 M/S]"],
    },
    {
        "id": "ALT-9041",
        "title": "Yellow Box Clearance Violation",
        "camera": "CAM-02",
        "severity": "Medium",
        "time": time.strftime("%I:%M:%S %p", time.localtime(time.time() - 720)),
        "type": "BOX_JUNCTION_OBSTRUCTION",
        "timestamp": now_ms - 720000,
        "status": "acknowledged",
        "description": "Vehicle stationary in yellow box junction exceeding 15 second clearance window.",
        "location": "Monochrome Aerial UAV - Junction Grid C-2",
        "confidence": 88.2,
        "assignedUnit": "Traffic Desk 4",
        "reasons": ["[DWELL TIME: 19.4S]", "[YELLOW_BOX_OCCUPANCY: 100%]"],
    },
    {
        "id": "ALT-9040",
        "title": "Speed Violation (48 KM/H in 20 MPH Zone)",
        "camera": "CAM-01",
        "severity": "Medium",
        "time": time.strftime("%I:%M:%S %p", time.localtime(time.time() - 1500)),
        "type": "SPEED_VIOLATION",
        "timestamp": now_ms - 1500000,
        "status": "resolved",
        "description": "Plate LD19 XKV flagged at 48 km/h on urban night corridor.",
        "location": "North Arterial Roadway - Night CCTV Overhead",
        "confidence": 97.1,
        "assignedUnit": "Auto-Citation Engine",
        "reasons": ["[ANPR: LD19 XKV]", "[RADAR_DELTA: +16 KM/H]"],
    },
]

def generate_live_camera_metrics() -> List[Dict[str, Any]]:
    curr_time = time.time()
    res = []
    for idx, cam in enumerate(CAMERAS_DB):
        is_degraded = cam.get("status") == "Degraded"
        lat = int(9 + math.sin(curr_time * 0.5 + idx) * 3 + (22 if is_degraded else 0))
        fps = int(cam["fps"] * 0.82) if is_degraded else int(cam["fps"])
        res.append({
            "cameraId": cam["id"],
            "tag": cam["tag"],
            "name": cam["name"],
            "location": cam["location"],
            "status": "Degraded" if is_degraded else "Online",
            "latencyMs": lat,
            "jitterMs": round(0.8 + (math.sin(curr_time) * 0.3), 1),
            "frameDropRate": 0.35 if is_degraded else 0.02,
            "packetLossPercent": 0.12 if is_degraded else 0.01,
            "bitrateMbps": round(7.5 + (idx * 0.3), 1),
            "targetFps": int(cam["fps"]),
            "actualFps": fps,
            "uptimePercent": 99.94,
            "protocol": "WebRTC" if idx % 3 == 0 else "RTSP/TCP",
            "resolution": cam["resolution"],
            "codec": "H.265 (HEVC)" if idx % 2 == 0 else "H.264 High",
            "edgeTemperatureC": int(39 + (idx * 0.7)),
            "healthScore": 74 if is_degraded else 98,
            "lastPingTimestamp": int(curr_time * 1000),
            "historyLatency": [max(6, lat - 4), max(6, lat - 2), lat, max(6, lat + 1), lat],
        })
    return res

def get_system_telemetry() -> Dict[str, Any]:
    curr = time.time()
    cpu = int(42 + math.sin(curr * 0.2) * 8)
    net = int(248 + math.sin(curr * 0.3) * 16)
    return {
        "cpuUsage": cpu,
        "cpuLoad": f"{cpu}% (8-Core Jetson Orin)",
        "memoryUsedGb": 6.4,
        "memoryTotalGb": 16.0,
        "storageUsedPercent": 78,
        "storageUsedTb": 2.34,
        "storageTotalTb": 3.0,
        "networkMbps": net,
        "networkStatus": f"(Stable {net}Mbps)",
    }

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="SEEMADRISHTI AI - FastAPI Tactical Edge Gateway",
    version="4.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connected_ws_clients: List[WebSocket] = []

async def broadcast_ws(msg: Dict[str, Any]):
    disconnected = []
    text = json.dumps(msg)
    for ws in connected_ws_clients:
        try:
            await ws.send_text(text)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in connected_ws_clients:
            connected_ws_clients.remove(ws)

# Background heartbeat task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_telemetry_loop())

async def background_telemetry_loop():
    while True:
        await asyncio.sleep(2.5)
        if connected_ws_clients:
            t = int(time.time() * 1000)
            await broadcast_ws({
                "type": "CAMERA_METRICS",
                "payload": generate_live_camera_metrics(),
                "timestamp": t,
            })
            await broadcast_ws({
                "type": "SYSTEM_TELEMETRY",
                "payload": get_system_telemetry(),
                "timestamp": t,
            })

# ----------------------------------------------------------------------------
# REST ENDPOINTS
# ----------------------------------------------------------------------------

@app.get("/")
def get_root():
    return {
        "project": "SEEMADRISHTI AI",
        "description": "Tactical Multi-Camera CCTV Surveillance Gateway (FastAPI)",
        "version": "4.2.0",
        "status": "ONLINE",
        "api_docs": "/docs",
        "ws_alerts": "/ws/alerts",
        "ws_telemetry": "/ws/telemetry",
    }

@app.get("/api/v1/health")
def get_health():
    return {
        "status": "HEALTHY",
        "version": "4.2.0",
        "node": "Jetson-Orin-SDR-01",
        "timestamp": int(time.time() * 1000),
        "connected_ws": len(connected_ws_clients),
    }

@app.get("/api/v1/cameras")
def list_cameras():
    return CAMERAS_DB

@app.get("/api/v1/cameras/{camera_id}")
def get_camera(camera_id: str):
    for c in CAMERAS_DB:
        if str(c["id"]) == camera_id or c["tag"].lower() == camera_id.lower():
            return c
    raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

@app.post("/api/v1/cameras/{camera_id}/zones")
def add_zone(camera_id: str, zone: ZoneModel):
    for c in CAMERAS_DB:
        if str(c["id"]) == camera_id or c["tag"].lower() == camera_id.lower():
            z_dict = zone.dict()
            if not z_dict.get("id"):
                z_dict["id"] = f"zone-{int(time.time() * 1000)}"
            c["zones"].append(z_dict)
            return {"message": "Zone added successfully", "zone": z_dict}
    raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

@app.get("/api/v1/alerts")
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
):
    filtered = ALERTS_DB
    if severity:
        filtered = [a for a in filtered if a.get("severity", "").lower() == severity.lower()]
    if status:
        filtered = [a for a in filtered if a.get("status", "").lower() == status.lower()]
    return filtered[:limit]

@app.post("/api/v1/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, payload: AcknowledgePayload):
    for a in ALERTS_DB:
        if a["id"].lower() == alert_id.lower():
            a["status"] = "acknowledged"
            a["assignedUnit"] = f"Unit Dispatched ({payload.action})" if payload.action else f"Acknowledged by {payload.operator_id}"
            await broadcast_ws({
                "type": "ALERT_TRIGGER",
                "payload": a,
                "timestamp": int(time.time() * 1000),
            })
            return {"message": "Alert acknowledged", "alert": a}
    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

@app.get("/api/v1/alerts/{alert_id}/evidence")
def get_alert_evidence(alert_id: str):
    for a in ALERTS_DB:
        if a["id"].lower() == alert_id.lower():
            return {
                "alertId": a["id"],
                "camera": a["camera"],
                "timestamp": a["timestamp"],
                "snapshot_url": f"/evidence/snapshots/{a['id']}.jpg",
                "clip_url": f"/evidence/clips/{a['id']}.mp4",
                "trajectory_points": [
                    {"x": 0.22, "y": 0.78, "timestamp": a["timestamp"] - 3000},
                    {"x": 0.31, "y": 0.81, "timestamp": a["timestamp"] - 2000},
                    {"x": 0.44, "y": 0.85, "timestamp": a["timestamp"] - 1000},
                    {"x": 0.52, "y": 0.88, "timestamp": a["timestamp"]},
                ],
                "risk_score": 95 if a["severity"] == "High" else 70,
                "unit_assigned": a.get("assignedUnit", "Standby Command"),
                "reasons": a.get("reasons", ["[PERIMETER_BREACH]", "[AI_CONFIDENCE: >90%]"]),
            }
    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

@app.get("/api/v1/system/telemetry")
def read_system_telemetry():
    return get_system_telemetry()

@app.post("/api/v1/alerts/simulate")
async def simulate_alert(alert_in: Dict[str, Any]):
    cam_tag = alert_in.get("camera", "CAM-01")
    t_now = int(time.time() * 1000)
    new_alert = {
        "id": f"ALT-{int(time.time()) % 10000:04d}",
        "title": alert_in.get("title", "Tactical Perimeter Intrusion Detected"),
        "camera": cam_tag,
        "severity": alert_in.get("severity", "High"),
        "time": time.strftime("%I:%M:%S %p"),
        "type": alert_in.get("type", "PERIMETER_INTRUSION"),
        "timestamp": t_now,
        "status": "active",
        "description": alert_in.get("description", f"Boundary breach registered on {cam_tag}."),
        "location": alert_in.get("location", "Sector Alpha"),
        "confidence": alert_in.get("confidence", 94.2),
        "assignedUnit": "Rapid Response Team (Auto-Dispatched)",
        "audioTriggered": True,
        "reasons": alert_in.get("reasons", ["[TARGET: SUSPICIOUS_MOVEMENT]", "[TIME: NIGHT]"]),
    }
    ALERTS_DB.insert(0, new_alert)
    await broadcast_ws({
        "type": "ALERT_TRIGGER",
        "payload": new_alert,
        "timestamp": t_now,
    })
    return {"message": "Alert triggered and broadcasted", "alert": new_alert}

# ----------------------------------------------------------------------------
# WEBSOCKET ENDPOINTS
# ----------------------------------------------------------------------------

@app.websocket("/ws/alerts")
@app.websocket("/ws/telemetry")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_ws_clients.append(websocket)
    t = int(time.time() * 1000)
    # Send Connection ACK
    await websocket.send_text(json.dumps({
        "type": "CONNECTION_ACK",
        "payload": {
            "message": "SEEMADRISHTI AI Tactical Edge Gateway Connected (FastAPI)",
            "version": "4.2.0",
            "node": "Jetson-Orin-SDR-01",
        },
        "timestamp": t,
    }))
    # Immediately send camera metrics and telemetry
    await websocket.send_text(json.dumps({
        "type": "CAMERA_METRICS",
        "payload": generate_live_camera_metrics(),
        "timestamp": t,
    }))
    await websocket.send_text(json.dumps({
        "type": "SYSTEM_TELEMETRY",
        "payload": get_system_telemetry(),
        "timestamp": t,
    }))

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PING_PONG",
                        "payload": {"pong": True},
                        "timestamp": msg.get("timestamp", int(time.time() * 1000)),
                    }))
            except Exception:
                pass
    except WebSocketDisconnect:
        if websocket in connected_ws_clients:
            connected_ws_clients.remove(websocket)
    except Exception:
        if websocket in connected_ws_clients:
            connected_ws_clients.remove(websocket)
