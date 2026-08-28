# SEEMADRISHTI AI — Computer Vision, Tracking, Intrusion, Risk & Evidence Pipeline (Phase 7)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection, multi-object tracking (MOT), geometric virtual perimeter intrusion detection, abnormal dwell-time loitering detection, an **Explainable Threat Assessment & Risk Engine**, and an automated **Incident Evidence Capture & Reconstruction Engine** for border surveillance.

### Pipeline Flow:
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ VIDEO SOURCE │ ──▶ │ OPENCV &YOLO │ ──▶ │  BYTETRACK   │ ──▶ │ RAY-CASTING  │
│(MP4 / Webcam)│     │(yolov8n.pt)  │     │(PersistentID)│     │ (Intrusion)  │
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
```

1. **YOLOv8n Neural Network**: Real-time edge object detection classifying `person`, `car`, `truck`, `bus`, and `motorcycle`.
2. **ByteTrack Engine**: Frame-to-frame association assigning persistent, unique `track_id` values.
3. **Ray-Casting Intrusion Geometry**: Evaluates physical target centroids against virtual `PolygonZones` to detect `OUTSIDE ➔ INSIDE` crossings.
4. **Loitering Engine**: Monitors continuous dwell time within restricted perimeters with anti-duplicate alert gating and grace-period track retention.
5. **Explainable Risk Engine**: Deterministically synthesizes contextual surveillance signals into a 0–100 risk score and maps to tactical threat levels (**LOW**, **MEDIUM**, **HIGH**, **CRITICAL**) with itemized reason codes.
6. **Incident Evidence Engine**: Continuously buffers pre-event frames in an in-memory circular buffer, triggers on HIGH/CRITICAL events, collects post-event frames, burns a tactical forensic HUD overlay, and writes a standalone MP4 evidence clip.

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
│   ├── __init__.py
│   ├── circular_buffer.py      # Bounded in-memory circular frame buffer per camera
│   ├── evidence_writer.py      # Forensic MP4 video writer with HUD overlay
│   └── incident_manager.py     # Incident lifecycle, triggering & post-capture
├── output/                     # WebSocket publisher with HTTP fallback
└── tests/
    ├── phase2_test.py          # Phase 2 Detection verification (12 tests)
    ├── phase3_test.py          # Phase 3 Tracking verification (12 tests)
    ├── phase4_test.py          # Phase 4 Intrusion verification (22 tests)
    ├── phase5_test.py          # Phase 5 Loitering verification (31 tests)
    ├── phase6_test.py          # Phase 6 Risk Engine verification (36 tests)
    ├── phase7_test.py          # Phase 7 Evidence Engine verification (28 tests)
    └── fixtures/               # Test videos (intrusion_test.mp4, loitering_test.mp4, etc.)
```

---

## 2. Forensic Evidence Capture & Reconstruction

### Core Capabilities:
- **Configurable Pre-Event Buffer**: Retains past $N$ seconds of real frames (default: `10.0s`) per camera without unbounded memory growth.
- **Configurable Post-Event Capture**: Accumulates $N$ seconds of real frames after incident trigger (default: `10.0s`).
- **Forensic HUD Overlay**: Automatically burns forensic metadata into every video frame:
  - Tactical header with UTC timestamp & frame counter
  - Camera ID, Track ID, Class Name, Event Type, and Zone Name
  - Threat Level & Score badge (Crimson Red for CRITICAL, Deep Amber for HIGH)
  - Itemized reason indicators (`[INTRUSION: +40] [LOITERING: +25]`)
- **Multi-Camera Isolation**: Buffers and evidence files are strictly separated by camera identifier.
- **REST Streaming & Downloads**:
  - `GET /api/incidents`: List all incidents with filters.
  - `GET /api/incidents/:id`: Fetch incident metadata.
  - `GET /api/incidents/:id/evidence`: Stream or download forensic MP4 video.
  - `POST /api/incidents/:id/acknowledge`: Operator acknowledgment.

---

## 3. How to Run

### Run Phase 7 Pipeline on Video Fixture:
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id cam-01 --loitering-threshold 1.0
```

### Run on Live Webcam:
```bash
py -3.12 cv_service/main.py --source 0 --camera-id cam-01
```

### Run Benchmark with Pre/Post Custom Windows:
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id cam-01 --pre-event-seconds 5.0 --post-event-seconds 5.0 --max-frames 35
```

---

## 4. Configuration Options

| Argument | Environment Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `--source` | `VIDEO_SOURCE` | `intrusion_test.mp4` | Video file path or webcam index (`0`) |
| `--camera-id` | `CAMERA_ID` | `cam-01` | Target camera ID (matches matrix cell) |
| `--model` | `YOLO_MODEL` | `yolov8n.pt` | Ultralytics model weights |
| `--conf` | `CONFIDENCE_THRESHOLD` | `0.40` | Detection confidence threshold (0.0–1.0) |
| `--frame-skip`| `FRAME_SKIP` | `1` | Process every Nth frame (1 = smooth trajectory) |
| `--max-frames`| `BENCHMARK_FRAMES` | `0` | Frames to process before exit (0 = loop) |
| `--loitering-threshold` | `LOITERING_THRESHOLD_SECONDS` | `30.0` | Dwell duration in seconds to trigger loitering |
| `--pre-event-seconds` | `PRE_EVENT_SECONDS` | `10.0` | Duration of pre-event buffer in seconds |
| `--post-event-seconds` | `POST_EVENT_SECONDS` | `10.0` | Duration of post-event capture in seconds |
| `--evidence-dir` | `EVIDENCE_DIR` | `evidence` | Directory to store MP4 evidence clips |
| `--no-evidence`| `EVIDENCE_ENABLED` | `False` | Disable Phase 7 forensic incident evidence capture |
| `--no-risk` | `RISK_ENGINE_ENABLED` | `False` | Disable threat assessment & risk engine |
| `--no-loitering`| `LOITERING_ENABLED` | `False` | Disable dwell-time loitering engine |
| `--no-tracking`| `DISABLE_TRACKING` | `False` | Disable ByteTrack and emit raw detections |
| `--no-ws` | `DISABLE_WS` | `False` | Run offline without connecting to `/ws` |

---

## 5. Automated Verification Suites

### Run Phase 7 Evidence Engine Test Suite (28 Tests)
```bash
py -3.12 cv_service/tests/phase7_test.py
```

### Run Phase 6 Risk Engine Test Suite (36 Tests)
```bash
py -3.12 cv_service/tests/phase6_test.py
```

### Run Phase 5 Loitering Test Suite (31 Tests)
```bash
py -3.12 cv_service/tests/phase5_test.py
```

### Run Phase 4 Intrusion Test Suite (22 Tests)
```bash
py -3.12 cv_service/tests/phase4_test.py
```

### Run Phase 3 Tracking Test Suite (12 Tests)
```bash
py -3.12 cv_service/tests/phase3_test.py
```

### Run Phase 2 Detection Test Suite (12 Tests)
```bash
py -3.12 cv_service/tests/phase2_test.py
```

### Run Phase 1 Backend Test Suite (13 Tests)
```bash
npm.cmd run test:phase1
```
