import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional

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

    # Phase 8 Multi-Camera Intelligent Threat Correlation Configuration
    correlation_enabled: bool = os.getenv("CORRELATION_ENABLED", "true").lower() in ("true", "1", "yes")
    correlation_min_score: int = int(os.getenv("CORRELATION_MIN_SCORE", "50"))
    correlation_topology_path: Optional[str] = os.getenv("CORRELATION_TOPOLOGY_PATH", None)
    correlation_max_dormant_seconds: float = float(os.getenv("CORRELATION_MAX_DORMANT_SECONDS", "300.0"))

    # Phase 9 Night Intelligence + Low-Light Robustness + Adaptive Surveillance
    environment_enabled: bool = os.getenv("ENVIRONMENT_ENABLED", "true").lower() in ("true", "1", "yes")
    night_brightness_threshold: float = float(os.getenv("NIGHT_BRIGHTNESS_THRESHOLD", "40.0"))
    low_light_brightness_threshold: float = float(os.getenv("LOW_LIGHT_BRIGHTNESS_THRESHOLD", "75.0"))
    low_light_contrast_threshold: float = float(os.getenv("LOW_LIGHT_CONTRAST_THRESHOLD", "25.0"))
    dawn_threshold: float = float(os.getenv("DAWN_THRESHOLD", "90.0"))
    dusk_threshold: float = float(os.getenv("DUSK_THRESHOLD", "60.0"))
    day_confidence_threshold: float = float(os.getenv("DAY_CONFIDENCE_THRESHOLD", "0.40"))
    night_confidence_threshold: float = float(os.getenv("NIGHT_CONFIDENCE_THRESHOLD", "0.30"))
    low_light_confidence_threshold: float = float(os.getenv("LOW_LIGHT_CONFIDENCE_THRESHOLD", "0.35"))
    enable_low_light_enhancement: bool = os.getenv("ENABLE_LOW_LIGHT_ENHANCEMENT", "true").lower() in ("true", "1", "yes")
    enhancement_method: str = os.getenv("ENHANCEMENT_METHOD", "clahe")
    enhancement_clahe_clip: float = float(os.getenv("ENHANCEMENT_CLAHE_CLIP", "3.0"))
    enhancement_gamma: float = float(os.getenv("ENHANCEMENT_GAMMA", "1.5"))
    enable_adaptive_sampling: bool = os.getenv("ENABLE_ADAPTIVE_SAMPLING", "true").lower() in ("true", "1", "yes")
    adaptive_normal_skip: int = int(os.getenv("ADAPTIVE_NORMAL_SKIP", "3"))
    adaptive_night_skip: int = int(os.getenv("ADAPTIVE_NIGHT_SKIP", "2"))
    adaptive_threat_skip: int = int(os.getenv("ADAPTIVE_THREAT_SKIP", "1"))
    night_movement_points: int = int(os.getenv("NIGHT_MOVEMENT_POINTS", "10"))
    min_night_movement_frames: int = int(os.getenv("MIN_NIGHT_MOVEMENT_FRAMES", "2"))
    min_night_displacement_px: float = float(os.getenv("MIN_NIGHT_DISPLACEMENT_PX", "5.0"))

    # Phase 10 Advanced Movement, Traffic Flow & Behavior Analytics Configuration
    analytics_enabled: bool = os.getenv("ANALYTICS_ENABLED", "true").lower() in ("true", "1", "yes")
    trajectory_max_points: int = int(os.getenv("TRAJECTORY_MAX_POINTS", "100"))
    direction_min_displacement_px: float = float(os.getenv("DIRECTION_MIN_DISPLACEMENT_PX", "3.0"))
    density_grid_size: int = int(os.getenv("DENSITY_GRID_SIZE", "8"))
    group_movement_min_size: int = int(os.getenv("GROUP_MOVEMENT_MIN_SIZE", "2"))
    group_max_separation_px: float = float(os.getenv("GROUP_MAX_SEPARATION_PX", "120.0"))
    movement_anomaly_points: int = int(os.getenv("MOVEMENT_ANOMALY_POINTS", "8"))
    group_movement_points: int = int(os.getenv("GROUP_MOVEMENT_POINTS", "5"))
    abnormal_activity_points: int = int(os.getenv("ABNORMAL_ACTIVITY_POINTS", "7"))
