# SEEMADRISHTI AI — Computer Vision, Tracking & Intrusion Pipeline (Phase 4)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection, multi-object tracking (MOT), and geometric virtual perimeter intrusion detection for border surveillance. It ingests video feeds using OpenCV, performs real object detection via an Ultralytics YOLOv8 neural network, tracks targets across consecutive frames using ByteTrack, calculates physical target centroids, detects `OUTSIDE ➔ INSIDE` crossings using ray-casting point-in-polygon geometry, and automatically persists real events and tactical alerts in SQLite while streaming live telemetry to the SEEMADRISHTI dashboard over WebSocket.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ VIDEO SOURCE │ ──▶ │ OPENCV &YOLO │ ──▶ │  BYTETRACK   │ ──▶ │   CENTROID   │ ──▶ │ RAY-CASTING  │ ──▶ │ SQLITE EVENT │
│(MP4 / Webcam)│     │(yolov8n.pt)  │     │(PersistentID)│     │  (cx, cy)    │     │(Zone Breach) │     │ & ALERT / WS │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Directory Structure
```
cv_service/
├── main.py                     # CLI entry point, tracking & intrusion loop
├── config.py                   # Centralized configuration dataclass
├── requirements.txt            # Python dependencies
├── README.md                   # Service documentation
├── video/
│   ├── __init__.py
│   └── capture.py              # VideoSource abstraction (MP4, Webcam, RTSP-ready)
├── detection/
│   ├── __init__.py
│   └── yolo_detector.py        # Ultralytics YOLO inference wrapper
├── tracking/
│   ├── __init__.py
│   └── byte_tracker.py         # ByteTrack Multi-Object Tracking engine
├── geometry/
│   ├── __init__.py
│   └── polygon.py              # PolygonZone, ray-casting point-in-polygon, centroid
├── intrusion/
│   ├── __init__.py
│   └── detector.py             # IntrusionDetector, stateful transition & alert gating
├── output/
│   ├── __init__.py
│   └── detection_publisher.py  # WebSocket publisher with HTTP fallback
└── tests/
    ├── phase2_test.py          # Phase 2 12-point detection verification
    ├── phase3_test.py          # Phase 3 12-point tracking verification
    ├── phase4_test.py          # Phase 4 22-point intrusion verification
    └── fixtures/               # Test videos (intrusion_test.mp4, moving_objects.mp4)
```

---

## 2. Requirements & Installation

- **Python:** 3.10+ (tested on Python 3.12 64-bit)
- **Host Dependencies:**
  ```bash
  pip install -r cv_service/requirements.txt
  ```
  *(Packages installed: `ultralytics`, `opencv-python-headless`, `websockets`, `requests`, `torch`, `torchvision`, `lap`)*

---

## 3. How to Run

### Run Intrusion Detection on Test Fixture
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id cam-01
```

### Run on Live Webcam
```bash
py -3.12 cv_service/main.py --source 0 --camera-id cam-01
```

### Run Benchmark Run (20 Processed Frames)
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id cam-01 --max-frames 20
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
| `--no-ws` | `DISABLE_WS` | `False` | Run offline without connecting to `/ws` |
| `--no-tracking`| `DISABLE_TRACKING` | `False` | Disable ByteTrack and emit raw detections |

---

## 5. Automated Verification Suites

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
npm run test:phase1
```
