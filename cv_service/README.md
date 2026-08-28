# SEEMADRISHTI AI — Computer Vision, Tracking, Intrusion, Risk, Evidence & Multi-Camera Correlation Pipeline (Phase 8)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection, multi-object tracking (MOT), geometric virtual perimeter intrusion detection, abnormal dwell-time loitering detection, an **Explainable Threat Assessment & Risk Engine**, an automated **Incident Evidence Capture Engine**, and a **Multi-Camera Intelligent Threat Correlation Engine** for border surveillance.

### Pipeline Flow:
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ VIDEO CAMERAS│ ──▶ │ OPENCV &YOLO │ ──▶ │  BYTETRACK   │ ──▶ │ RAY-CASTING  │
│(MP4 / RTSP)  │     │(yolov8n.pt)  │     │(PersistentID)│     │ (Intrusion)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                                                              │
       ▼                                                              ▼
┌──────────────┐                                               ┌──────────────┐
│CIRCULAR BUFF │                                               │  LOITERING   │
│(Pre-10s Frame│                                               │ (Dwell Time) │
└──────────────┘                                               └──────────────┘
       │                                                              │
       ▼                                                              ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│EVIDENCE WRITE│ ◀── │INCIDENT TRIG │ ◀── │SQLITE PERSIST│ ◀── │ RISK ENGINE  │
│ (MP4 Clip)   │     │(HIGH/CRITIC) │     │ & WS (/ws)   │     │(0-100 Score) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
               ┌──────────────────────────┐
               │  MULTI-CAMERA CORRELATOR │
               │ (Spatial-Temporal Graph) │
               └────────────┬─────────────┘
                            ▼
               ┌──────────────────────────┐
               │ CORRELATED INCIDENT (DB) │
               │   (CAM-01 -> 02 -> 03)   │
               └──────────────────────────┘
```

1. **YOLOv8n Neural Network**: Real-time edge object detection classifying `person`, `car`, `truck`, `bus`, and `motorcycle`.
2. **ByteTrack Engine**: Frame-to-frame association assigning persistent, unique `track_id` values per camera.
3. **Ray-Casting Intrusion Geometry**: Evaluates physical target centroids against virtual `PolygonZones` to detect `OUTSIDE ➔ INSIDE` crossings.
4. **Loitering Engine**: Monitors continuous dwell time within restricted perimeters with anti-duplicate alert gating.
5. **Explainable Risk Engine**: Deterministically synthesizes contextual surveillance signals into a 0–100 risk score and maps to tactical threat levels (**LOW**, **MEDIUM**, **HIGH**, **CRITICAL**).
6. **Incident Evidence Engine**: Continuously buffers pre-event frames, triggers on HIGH/CRITICAL events, collects post-event frames, burns a tactical HUD overlay, and saves MP4 evidence clips.
7. **Multi-Camera Correlation Engine**: Correlates events across camera networks based on spatial topology, temporal windows, class compatibility, and sequence progression.

### Directory Structure
```
cv_service/
├── main.py                     # Unified CLI entry point & processing loop
├── config.py                   # Centralized configuration dataclass
├── requirements.txt            # Python dependencies
├── README.md                   # Service documentation
├── video/                      # VideoSource abstraction (MP4, Webcam, RTSP-ready)
├── detection/                  # Ultralytics YOLOv8 inference wrapper
├── tracking/                   # ByteTrack Multi-Object Tracking engine
├── geometry/                   # PolygonZone, ray-casting point-in-polygon, centroid
├── intrusion/                  # IntrusionDetector, stateful transition & alert gating
├── loitering/                  # LoiteringDetector, monotonic dwell timing & alert gating
├── risk/                       # Explainable Threat Assessment & Risk Engine
├── evidence/                   # Incident Evidence Capture & Reconstruction Engine
│   ├── circular_buffer.py      # Bounded in-memory circular frame buffer per camera
│   ├── evidence_writer.py      # Forensic MP4 video writer with HUD overlay
│   └── incident_manager.py     # Incident lifecycle coordinator
├── correlation/                # Multi-Camera Intelligent Threat Correlation (Phase 8)
│   ├── camera_topology.py      # Camera relationship graph, sector boundaries, travel time
│   ├── correlation_models.py   # Observation, CorrelationReason, CorrelatedIncident
│   └── correlation_engine.py   # Multi-camera evaluation engine, explainable scoring
├── output/                     # WebSocket publisher with HTTP fallback
└── tests/
    ├── phase2_test.py          # Phase 2 Detection verification (12 tests)
    ├── phase3_test.py          # Phase 3 Tracking verification (12 tests)
    ├── phase4_test.py          # Phase 4 Intrusion verification (22 tests)
    ├── phase5_test.py          # Phase 5 Loitering verification (31 tests)
    ├── phase6_test.py          # Phase 6 Risk Engine verification (36 tests)
    ├── phase7_test.py          # Phase 7 Evidence Engine verification (28 tests)
    └── phase8_test.py          # Phase 8 Threat Correlation verification (37 tests)
```

---

## 2. Multi-Camera Threat Correlation

### Scoring & Rules
- **Class Match (+30)**: Validates target classes (`person`, `car`, etc.) match between cameras.
- **Camera Topology (+30)**: Enforces physical proximity and connectivity between camera sectors.
- **Temporal Match (+25)**: Evaluates whether transit time elapsed falls within `[min_travel, max_travel]` seconds.
- **Sequence Compatibility (+15)**: Checks plausible breach progression.
- **Multi-Hop Escalation (+10)**: Escalates cross-corridor threats across 3+ cameras to CRITICAL.

### REST Endpoints
- `GET /api/correlations`: List cross-camera correlated incidents.
- `GET /api/correlations/:id`: Fetch correlated incident details.
- `GET /api/correlations/:id/timeline`: Chronological sequence of multi-camera hops with transit time elapsed.
- `GET /api/correlations/:id/incidents`: Fetch linked incident video evidence packages.

---

## 3. How to Run

### Run Integrated Pipeline with Phase 8 Correlation:
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id cam-01 --loitering-threshold 1.0
```

### Run Phase 8 Automated Test Suite (37 Tests):
```bash
py -3.12 cv_service/tests/phase8_test.py
```

### Run All Regressions:
```bash
py -3.12 cv_service/tests/phase7_test.py
py -3.12 cv_service/tests/phase6_test.py
py -3.12 cv_service/tests/phase5_test.py
py -3.12 cv_service/tests/phase4_test.py
py -3.12 cv_service/tests/phase3_test.py
py -3.12 cv_service/tests/phase2_test.py
npm.cmd run test:phase1
npm.cmd run lint
npm.cmd run build
```
