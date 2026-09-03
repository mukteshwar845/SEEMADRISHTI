<div align="center">

# 👁️ SEEMADRISHTI AI (सीमा दृष्टि)
### Next-Gen Tactical Video Analytics & Autonomous Threat Intelligence Platform for Defense Surveillance
#### *Smart India Hackathon (SIH26187) — Ministry of Home Affairs*

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/YOLOv8-Border_Detection-00FFFF?style=for-the-badge&logo=yolo&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![ByteTrack](https://img.shields.io/badge/ByteTrack-MOT_Tracker-FF6B6B?style=for-the-badge)](https://github.com/ifzhang/ByteTrack)
[![WebSocket](https://img.shields.io/badge/WebSocket-Realtime_Gateway-4EBA6F?style=for-the-badge&logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>A zero-cost, open-source, edge-deployable AI surveillance platform transforming existing CCTV camera networks into an intelligent, real-time threat-detection matrix with 60 FPS neural HUDs, multi-vehicle tracking, weapons detection, crawling/sprinting infiltration alerts, and tactical audio sirens.</b>
</p>

[Key Capabilities](#-key-capabilities) • [System Architecture](#-system-architecture) • [Live Camera Ingestion](#-live-camera-ingestion) • [Threat & Violation Engine](#-behavioral-threat--violation-engine) • [Quick Start](#-quick-start) • [API & Gateway](#-api--telemetry-gateway)

---

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 👁️ SEEMADRISHTI DEFENSE COMMAND MATRIX v4.2                                    ● LIVE SECURE GATEWAY [ONLINE] │
├──────────────────────────────────────┬──────────────────────────────────────┬───────────────────────────────┤
│ [CAM-01] SECTOR ALPHA MAIN GATE      │ [CAM-02] SECTOR ALPHA EAST (MOBILE)  │ [CAM-03] ACCESS ROAD FLYOVER  │
│ 💻 LAPTOP / DESKTOP LIVE WEBCAM      │ 📱 SMARTPHONE QR STREAM INGESTION    │ 🚌 BMTA BUS [46.5 KM/H ← W]   │
│ 🚗 SUV #04 [42.5 KM/H → IN]          │ 🏃 PATROL #12 [4.8 KM/H → S-SE]      │ 🏍️ MOTORCYCLE #11 [61.8 KM/H] │
│ 🚨 WEAPON DETECTED: KNIFE // 91%     │ 🚨 OVERSPEED // 58.4 KM/H (LIMIT 50) │ 🚨 WRONG WAY // ID:18 (FLOW)  │
├──────────────────────────────────────┼──────────────────────────────────────┼───────────────────────────────┤
│ [CAM-04] PROMENADE & TRAMWAY         │ [CAM-05] CITADEL RAMPART JUNCTION    │ [CAM-06] WATCHTOWER APEX      │
│ 🚊 ELECTRIC TRAM #02 [28.4 KM/H]     │ 🚗 SEDAN #07 [44.2 KM/H ↗ NE]        │ 🛡️ SENTRY #02 [ACTIVE WATCH]  │
│ ⏳ LOITERING 24S // [UNATTENDED BAG] │ 🚨 PRONE CRAWLING // RISK 92 CRIT    │ 🚨 WEAPON DETECTED: RIFLE #06 │
├──────────────────────────────────────┼──────────────────────────────────────┼───────────────────────────────┤
│ [CAM-07] RIVERINE BORDER CROSSING    │ [CAM-08] HIGH-ALTITUDE OUTPOST       │ [CAM-09] FORWARD RECON HQ     │
│ 🚤 PATROL BOAT #01 [24.8 KM/H → SE]  │ 🛡️ ARMORED CARRIER #03 [32.5 KM/H]   │ 🚛 HEAVY TRUCK #19 [36.4 KM/H]│
│ 🚨 RESTRICTED WATERWAY BREACH #14    │ 🔭 SNIPER OUTPOST SENTRY #05         │ 🚨 LASER TRIPWIRE BREACH #28  │
└──────────────────────────────────────┴──────────────────────────────────────┴───────────────────────────────┘
```

</div>

---

## ⚡ Key Capabilities

### 1. 🎯 60 FPS Autonomous Defense Vision HUD
* **Real-Time Bounding Reticles**: High-contrast, color-coded tactical reticles (Crimson for weapons/critical, Sky Blue for vehicles, Emerald for friendly/guards, Warm Amber for wildlife, Purple for luggage).
* **Speed & Flow Gauges**: Calibrated pixel-to-metric velocity calculation ($km/h$) with directional orientation arrows (`→ IN`, `← OUT`, `↗ NE`, `← W`).
* **Velocity Vector & Trajectory Trails**: Polyline path history with smooth fading alpha trails illustrating target movement vectors.
* **Virtual Geofences & Tripwires**: Point-in-Polygon restricted zones and ray-casting laser tripwires with instantaneous breach animations.

### 2. 🚨 Behavioral Threat & Violation Engine
* **🔫 Weapon Threat Identification**: Real-time detection of blades, knives, firearms, rifles, pistols, and scissors with instant critical alerts.
* **🚗 Multi-Vehicle Rule Violations**:
  * `WRONG_WAY_VEHICLE`: Vector dot product against designated lane flow.
  * `VEHICLE_OVERSPEED`: Real-time velocity computation against sector limits ($> 50\text{ km/h}$).
  * `ILLEGAL_VEHICLE_STOP`: Dwell accumulation for stopped vehicles ($< 5\text{ px/s}$) in Keep-Clear zones.
* **🏃 Suspicious Human Activity**:
  * `PRONE_CRAWLING_INFILTRATION`: Aspect ratio evaluation ($w/h > 1.6$) and low ground plane elevation.
  * `RAPID_SPRINT_EVASION`: Sprinting speed detection ($> 18\text{ km/h}$) towards boundaries.
  * `PERSISTENT_LOITERING`: Dwell accumulator ($> 20\text{s}$) triggering automated escalation.
  * `UNATTENDED_PACKAGE`: Stationary backpacks and luggage in security zones ($> 15\text{s}$).

### 3. 🔊 Tactical Audio Siren Alarm System
* Real-time Web Audio API frequency synthesis (Warble Siren, High-Defcon Klaxon Pulse, Tactical Sonar Radar Ping, Electronic Radar Chirp).
* Automatically activates with screen flashes upon detecting high/critical threats, armed intruders, or perimeter breaches.

### 4. 📲 Dual Live Hardware Ingestion
* **CAM-01 (Laptop / Desktop Live Webcam)**: Defaults safely to **OFF**; powers on on-demand via the `💻 DESKTOP CAM` button and streams live computer vision tracking.
* **CAM-02 (Mobile Phone Ingestion)**: Dynamic QR Code link allows any iPhone or Android phone to broadcast its camera feed directly into Camera 2 over WebSocket at 25 FPS.

---

## 📐 System Architecture

```mermaid
flowchart TD
    subgraph Edge Sensor Ingestion
        C1[CAM-01: Desktop/Laptop Webcam]
        C2[CAM-02: Mobile Smartphone Stream]
        C3to9[CAM-03 to CAM-09: CCTV RTSP / Video Feeds]
    end

    subgraph Zero-Cost AI Core (Python cv_service)
        YOLO[YOLOv8 Object Detector]
        BYTE[ByteTrack Multi-Object MOT]
        SUSP[SuspiciousActivityDetector]
        INTRUS[Intrusion & Geofence Engine]
        RISK[Explainable Threat Risk Engine 0-100]
        FLOW[Movement & Traffic Analytics Engine]
    end

    subgraph Tactical Edge Gateway (Node.js / Express / SQLite)
        WS[WebSocket Gateway ws://0.0.0.0:3000/ws]
        REST[REST API /api/health /api/cameras /api/alerts]
        DB[(SQLite Persistent Storage)]
    end

    subgraph Command & Control HUD (React / TypeScript / Canvas)
        Canvas[60 FPS Canvas AI Overlay Engine]
        Matrix[3x3 Matrix / 2x2 Quad / Spotlight View]
        Audio[Web Audio Siren & Sonar Engine]
        Heatmap[Live Threat Heatmap & Re-ID Handover]
    end

    C1 & C2 & C3to9 --> YOLO
    YOLO --> BYTE
    BYTE --> SUSP & INTRUS & FLOW
    SUSP & INTRUS & FLOW --> RISK
    RISK --> WS
    WS --> Canvas & Audio & Heatmap
    WS --> DB
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher (optional, for native Python CV service)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/mukteshwar845/SEEMADRISHTI.git

# Navigate to the project root
cd SEEMADRISHTI

# Install frontend and server dependencies
npm install
```

### 2. Launch the Platform
```bash
# Start the SEEMADRISHTI server and Vite frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. (Optional) Run Python AI CV Engine
```bash
# Install Python dependencies
pip install -r cv_service/requirements.txt

# Run full self-diagnostic test
python cv_service/tools/verify_all_ai.py

# Launch live webcam detection service on CAM-01
python cv_service/main.py --source 0 --camera-id cam-01
```

---

## 📁 Repository Structure

```text
SEEMADRISHTI/
├── cv_service/                     # Zero-cost Python Computer Vision Engine
│   ├── behavior/
│   │   └── suspicious_detector.py # Real-time Wrong-Way, Overspeed, Crawling & Weapon rules
│   ├── detection/
│   │   └── yolo_detector.py       # Ultralytics YOLO inference wrapper
│   ├── tracking/
│   │   └── byte_tracker.py        # ByteTrack persistent multi-object tracking
│   ├── intrusion/                 # Polygon Point-in-Polygon & Tripwires
│   ├── risk/                      # Multi-factor 0-100 explainable threat scoring
│   ├── analytics/                 # Speed calculation, trajectory & directional flow
│   ├── tools/
│   │   └── verify_all_ai.py       # Comprehensive 8-engine AI self-diagnostic suite
│   └── main.py                    # Pipeline execution & MJPEG stream server
├── server/                         # Backend Edge Gateway
│   ├── routes/                    # REST APIs (cameras, alerts, incidents, health)
│   ├── services/
│   │   └── websocket.ts           # Real-time WebSocket broadcast & phone frame router
│   └── db/                        # SQLite schema & persistence
├── src/                            # Tactical Command Frontend (React + TypeScript)
│   ├── components/
│   │   ├── MatrixCameraCell.tsx   # 60 FPS Canvas HUD, trajectories, speed & reticles
│   │   ├── TacticalMatrixView.tsx # 3x3, 2x2, and Spotlight grid orchestrator
│   │   ├── ThreatHeatmapView.tsx  # Sector-wise risk intensity visualizer
│   │   ├── MultiCamStitchingView.tsx # Panoramic composite view
│   │   ├── IncidentInspectorView.tsx # Forensic video evidence triaging
│   │   └── matrix/
│   │       ├── CameraControlsBar.tsx # On-demand Desktop/Phone camera controls
│   │       └── PhoneCameraModal.tsx  # Dynamic QR Code mobile connector
│   ├── utils/
│   │   └── audioAlert.ts          # Web Audio API tactical alarm synthesizer
│   └── App.tsx                    # Root state & real-time alert dispatcher
├── public/
│   └── mobile-cam.html            # Mobile Patrol WebRTC / WebSocket streaming node
├── server.ts                      # Unified Express + Vite development server
└── README.md                      # Project documentation
```

---

## 🛡️ License & Acknowledgements

Developed for **Smart India Hackathon (SIH26187)** under the **Ministry of Home Affairs**.
Licensed under the **MIT License**.
