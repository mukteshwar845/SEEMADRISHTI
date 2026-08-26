# SEEMADRISHTI AI — Computer Vision & Multi-Object Tracking Pipeline (Phase 3)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection and multi-object tracking (MOT) for border surveillance. It ingests video feeds using OpenCV, performs real object detection via an Ultralytics YOLOv8 neural network, tracks targets across consecutive frames using ByteTrack, and streams structured tracking metadata to the SEEMADRISHTI tactical dashboard over WebSocket.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  VIDEO SOURCE   │ ───▶  │  OPENCV & YOLO  │ ───▶  │    BYTETRACK    │ ───▶  │  WS PUBLISHER   │ ───▶  │  DASHBOARD HUD  │
│  (MP4 / Webcam) │       │  (yolov8n.pt)   │       │ (Persistent IDs)│       │  (ws://.../ws)  │       │ (Track Overlays)│
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Directory Structure
```
cv_service/
├── main.py                     # CLI entry point and tracking loop
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
├── output/
│   ├── __init__.py
│   └── detection_publisher.py  # WebSocket publisher with HTTP fallback
└── tests/
    ├── phase2_test.py          # Phase 2 12-point detection verification
    ├── phase3_test.py          # Phase 3 12-point tracking verification
    └── fixtures/               # Test videos (moving_objects.mp4, sample_test.mp4)
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

### Run Multi-Object Tracking on an MP4 File
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/moving_objects.mp4 --camera-id cam-01
```

### Run Tracking on Live Webcam
```bash
py -3.12 cv_service/main.py --source 0 --camera-id cam-01
```

### Run Benchmark Run (Fixed Frame Count)
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/sample_test.mp4 --camera-id cam-01 --max-frames 30
```

### Run in Raw Detection Mode (Without ByteTrack)
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/sample_test.mp4 --no-tracking --max-frames 30
```

---

## 4. Configuration Options

| Argument | Environment Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `--source` | `VIDEO_SOURCE` | `moving_objects.mp4` | Video file path or webcam index (`0`) |
| `--camera-id` | `CAMERA_ID` | `cam-01` | Target camera ID (matches matrix cell) |
| `--model` | `YOLO_MODEL` | `yolov8n.pt` | Ultralytics model weights |
| `--conf` | `CONFIDENCE_THRESHOLD` | `0.45` | Detection confidence threshold (0.0–1.0) |
| `--frame-skip`| `FRAME_SKIP` | `2` | Process every Nth frame (1 = all frames) |
| `--max-frames`| `BENCHMARK_FRAMES` | `0` | Frames to process before exit (0 = loop) |
| `--no-ws` | `DISABLE_WS` | `False` | Run offline without connecting to `/ws` |
| `--no-tracking`| `DISABLE_TRACKING` | `False` | Disable ByteTrack and emit raw detections |

---

## 5. Tracking Payload Schema

Published to `/ws` as `{ "type": "tracking", "data": <PAYLOAD> }`:

```json
{
  "camera_id": "cam-01",
  "timestamp": "2026-08-27T02:00:00.000Z",
  "frame_width": 1920,
  "frame_height": 1080,
  "inference_ms": 105.2,
  "tracking_ms": 0.47,
  "total_ms": 105.67,
  "track_count": 2,
  "tracks": [
    {
      "track_id": 1,
      "class_name": "bus",
      "class_id": 5,
      "confidence": 0.8853,
      "state": "ACTIVE",
      "bbox": { "x1": 22, "y1": 232, "x2": 807, "y2": 760 }
    },
    {
      "track_id": 2,
      "class_name": "person",
      "class_id": 0,
      "confidence": 0.8671,
      "state": "ACTIVE",
      "bbox": { "x1": 48, "y1": 398, "x2": 245, "y2": 902 }
    }
  ]
}
```

---

## 6. Automated Verification Suites

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
