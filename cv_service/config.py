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

    # Phase 5 Loitering Configuration
    loitering_enabled: bool = os.getenv("LOITERING_ENABLED", "true").lower() in ("true", "1", "yes")
    loitering_threshold_seconds: float = float(os.getenv("LOITERING_THRESHOLD_SECONDS", "30.0"))
    loitering_grace_period_seconds: float = float(os.getenv("LOITERING_GRACE_PERIOD_SECONDS", "2.0"))
    loitering_target_classes: List[str] = field(default_factory=lambda: ["person"])
    loitering_history_limit: int = int(os.getenv("LOITERING_HISTORY_LIMIT", "50"))

    # Phase 6 Risk Assessment Configuration
    risk_engine_enabled: bool = os.getenv("RISK_ENGINE_ENABLED", "true").lower() in ("true", "1", "yes")
    risk_intrusion_points: int = int(os.getenv("RISK_INTRUSION_POINTS", "40"))
    risk_loitering_points: int = int(os.getenv("RISK_LOITERING_POINTS", "25"))
    risk_reentry_points: int = int(os.getenv("RISK_REENTRY_POINTS", "15"))
    risk_persistence_points: int = int(os.getenv("RISK_PERSISTENCE_POINTS", "7"))
    risk_persistence_min_seconds: float = float(os.getenv("RISK_PERSISTENCE_MIN_SECONDS", "10.0"))
    risk_max_score: int = int(os.getenv("RISK_MAX_SCORE", "100"))
    risk_alert_threshold: str = os.getenv("RISK_ALERT_THRESHOLD", "HIGH")

    # Phase 7 Incident Evidence Capture & Reconstruction Configuration
    evidence_enabled: bool = os.getenv("EVIDENCE_ENABLED", "true").lower() in ("true", "1", "yes")
    evidence_pre_event_seconds: float = float(os.getenv("PRE_EVENT_SECONDS", "10.0"))
    evidence_post_event_seconds: float = float(os.getenv("POST_EVENT_SECONDS", "10.0"))
    evidence_dir: str = os.getenv("EVIDENCE_DIR", "evidence")
    evidence_min_risk_level: str = os.getenv("MIN_EVIDENCE_RISK_LEVEL", "HIGH")
    evidence_fps: float = float(os.getenv("EVIDENCE_FPS", "15.0"))
    evidence_cooldown_seconds: float = float(os.getenv("EVIDENCE_COOLDOWN_SECONDS", "15.0"))

