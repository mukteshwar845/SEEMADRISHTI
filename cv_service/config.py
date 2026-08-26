import os
from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class CVConfig:
    """Configuration settings for the SEEMADRISHTI Computer Vision Service."""

    # YOLO Model Configuration
    model_name: str = os.getenv("YOLO_MODEL", "yolov8n.pt")
    confidence_threshold: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    input_size: int = int(os.getenv("INPUT_SIZE", "640"))
    frame_skip: int = int(os.getenv("FRAME_SKIP", "2"))  # Process every Nth frame

    # Target Detection Classes (COCO Dataset Mapping)
    # 0: person, 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck
    target_classes: Dict[int, str] = field(
        default_factory=lambda: {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck",
        }
    )

    # Maximum detections per frame (prevents payload bloat)
    max_detections: int = int(os.getenv("MAX_DETECTIONS", "30"))

    # Backend Connection
    ws_url: str = os.getenv("BACKEND_WS_URL", "ws://127.0.0.1:8000/ws")
    http_backend_url: str = os.getenv("BACKEND_HTTP_URL", "http://127.0.0.1:8000")
    camera_id: str = os.getenv("CAMERA_ID", "cam-01")

    # ByteTrack Tracking Configuration
    tracker_type: str = os.getenv("TRACKER_TYPE", "bytetrack")
    track_buffer: int = int(os.getenv("TRACK_BUFFER", "30"))  # Frames to preserve lost tracks
    match_threshold: float = float(os.getenv("MATCH_THRESHOLD", "0.8"))  # IoU association threshold
    track_high_conf: float = float(os.getenv("TRACK_HIGH_CONF", "0.5"))
    track_low_conf: float = float(os.getenv("TRACK_LOW_CONF", "0.1"))

    # Performance / Profiling
    benchmark_frames: int = int(os.getenv("BENCHMARK_FRAMES", "0"))
