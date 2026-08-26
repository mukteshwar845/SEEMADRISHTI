# SEEMADRISHTI AI — Computer Vision Pipeline (Phase 2)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection for border surveillance. It ingests video feeds using OpenCV, performs real object detection via an Ultralytics YOLOv8 neural network, and streams structured detection metadata to the SEEMADRISHTI tactical dashboard over WebSocket.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  VIDEO SOURCE   │ ───▶  │ OPENCV & YOLO   │ ───▶  │ WS PUBLISHER    │ ───▶  │ DASHBOARD HUD   │
│  (MP4 / Webcam) │       │ (yolov8n.pt)    │       │ (ws://.../ws)   │       │ (Real Bboxes)   │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Directory Structure
```
cv_service/
├── main.py                     # CLI entry point and ingestion loop
├── config.py                   # Centralized configuration dataclass
├── requirements.txt            # Python dependencies
├── README.md                   # Service documentation
├── video/
│   ├── __init__.py
│   └── capture.py              # VideoSource abstraction (MP4, Webcam, RTSP-ready)
├── detection/
│   ├── __init__.py
│   └── yolo_detector.py        # Ultralytics YOLO inference wrapper
├── output/
│   ├── __init__.py
│   └── detection_publisher.py  # WebSocket publisher with HTTP fallback
└── tests/
    ├── phase2_test.py          # 12-point automated verification suite
    └── fixtures/               # Test videos and assets
```

---

## 2. Requirements & Installation

- **Python:** 3.10+ (tested on Python 3.12 64-bit)
- **Host Dependencies:**
  ```bash
  pip install -r cv_service/requirements.txt
  ```
  *(Packages installed: `ultralytics`, `opencv-python-headless`, `websockets`, `requests`, `torch`, `torchvision`)*

---

## 3. How to Run

### Run Inference on an MP4 File
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/sample_test.mp4 --camera-id cam-01
```

### Run Inference on a Webcam
```bash
py -3.12 cv_service/main.py --source 0 --camera-id cam-01
```

### Benchmark Run (Fixed Frame Count)
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/sample_test.mp4 --camera-id cam-01 --max-frames 30
```

### Local Offline Benchmark (Disable WebSocket)
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/sample_test.mp4 --no-ws --max-frames 50
```

---

## 4. CLI Arguments & Environment Variables

| Argument | Environment Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `--source` | `VIDEO_SOURCE` | `sample.mp4` | Video file path or webcam index (`0`) |
| `--camera-id` | `CAMERA_ID` | `cam-01` | Target camera ID (matches matrix cell) |
| `--model` | `YOLO_MODEL` | `yolov8n.pt` | Ultralytics model weights |
| `--conf` | `CONFIDENCE_THRESHOLD` | `0.45` | Detection confidence threshold (0.0–1.0) |
| `--frame-skip`| `FRAME_SKIP` | `2` | Process every Nth frame (1 = all frames) |
| `--max-frames`| `BENCHMARK_FRAMES` | `0` | Frames to process before exit (0 = loop) |
| `--no-ws` | `DISABLE_WS` | `False` | Run offline without connecting to `/ws` |

---

## 5. Detection Payload Schema

Published to `/ws` as `{ "type": "detection", "data": <PAYLOAD> }`:

```json
{
  "camera_id": "cam-01",
  "timestamp": "2026-08-27T02:00:00.000Z",
  "frame_width": 1920,
  "frame_height": 1080,
  "inference_ms": 108.85,
  "detection_count": 4,
  "detections": [
    {
      "class_name": "person",
      "class_id": 0,
      "confidence": 0.8671,
      "bbox": {
        "x1": 48,
        "y1": 398,
        "x2": 245,
        "y2": 902
      }
    },
    {
      "class_name": "bus",
      "class_id": 5,
      "confidence": 0.8853,
      "bbox": {
        "x1": 22,
        "y1": 232,
        "x2": 807,
        "y2": 760
      }
    }
  ]
}
```

---

## 6. Automated Verification

To run the complete 12-point automated verification suite:
```bash
py -3.12 cv_service/tests/phase2_test.py
```
Expected result: `12 passed, 0 failed`.
