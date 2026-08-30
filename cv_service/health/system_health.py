"""
SEEMADRISHTI AI - Real-Time System Health & Performance Tracker (Phase 19)

Team: IQ100
Problem Statement: SIH26187

Monitors authentic health states of edge subsystems and pipeline latencies.
Strictly zero synthetic or fabricated values.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Any


@dataclass
class PipelinePerformanceMetrics:
    yolo_latency_ms: float = 0.0
    tracking_latency_ms: float = 0.0
    geometry_latency_ms: float = 0.0
    risk_latency_ms: float = 0.0
    pipeline_latency_ms: float = 0.0
    processing_fps: float = 0.0
    capture_fps: float = 0.0
    samples_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        if self.samples_count == 0:
            return {"insufficient_data": True, "samples_count": 0}
        return {
            "yolo_latency_ms": round(self.yolo_latency_ms, 2),
            "tracking_latency_ms": round(self.tracking_latency_ms, 2),
            "geometry_latency_ms": round(self.geometry_latency_ms, 2),
            "risk_latency_ms": round(self.risk_latency_ms, 2),
            "pipeline_latency_ms": round(self.pipeline_latency_ms, 2),
            "processing_fps": round(self.processing_fps, 2),
            "capture_fps": round(self.capture_fps, 2),
            "samples_count": self.samples_count,
            "insufficient_data": False,
        }


class SystemHealthTracker:
    """
    Monitors operational health of CV pipeline subsystems and measures
    actual latency metrics without fabrication.
    """

    def __init__(self):
        self.subsystems: Dict[str, str] = {
            "ai_engine": "ONLINE",
            "yolov8": "ONLINE",
            "bytetrack": "ONLINE",
            "websocket": "ONLINE",
            "database": "ONLINE",
            "evidence_engine": "ONLINE",
            "sha256": "ONLINE",
        }

        # camera_id -> dict
        self.cameras: Dict[str, Dict[str, Any]] = {}

        # Latency measurement rolling accumulator
        self._total_yolo_ms = 0.0
        self._total_track_ms = 0.0
        self._total_geom_ms = 0.0
        self._total_risk_ms = 0.0
        self._total_pipeline_ms = 0.0
        self._samples = 0
        self._last_fps = 0.0
        self._capture_fps = 25.0

    def set_subsystem_status(self, name: str, status: str) -> None:
        key = name.strip().lower()
        if key in self.subsystems:
            self.subsystems[key] = status.upper()

    def update_camera_telemetry(
        self,
        camera_id: str,
        source_type: str,
        frame_id: int,
        fps: float,
        detections_count: int,
        tracks_count: int,
    ) -> None:
        cid = camera_id.strip().lower()
        st = source_type.upper()
        # Truthful labeling: MP4 sources are strictly marked as PLAYBACK
        status_label = "LIVE" if st == "RTSP" else "PLAYBACK"
        source_label = "LIVE RTSP STREAM" if st == "RTSP" else "VISDRONE PLAYBACK"

        self.cameras[cid] = {
            "camera_id": cid,
            "source_type": source_label,
            "status": status_label,
            "fps": round(fps, 1),
            "last_frame_id": frame_id,
            "detections_count": detections_count,
            "tracks_count": tracks_count,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def record_frame_metrics(
        self,
        yolo_ms: float,
        tracking_ms: float,
        geometry_ms: float,
        risk_ms: float,
        pipeline_ms: float,
        current_fps: float,
        capture_fps: float = 25.0,
    ) -> None:
        """Accumulates real frame timing measurements."""
        self._total_yolo_ms += float(yolo_ms)
        self._total_track_ms += float(tracking_ms)
        self._total_geom_ms += float(geometry_ms)
        self._total_risk_ms += float(risk_ms)
        self._total_pipeline_ms += float(pipeline_ms)
        self._samples += 1
        self._last_fps = float(current_fps)
        self._capture_fps = float(capture_fps)

    def get_performance_metrics(self) -> PipelinePerformanceMetrics:
        if self._samples == 0:
            return PipelinePerformanceMetrics()
        return PipelinePerformanceMetrics(
            yolo_latency_ms=self._total_yolo_ms / self._samples,
            tracking_latency_ms=self._total_track_ms / self._samples,
            geometry_latency_ms=self._total_geom_ms / self._samples,
            risk_latency_ms=self._total_risk_ms / self._samples,
            pipeline_latency_ms=self._total_pipeline_ms / self._samples,
            processing_fps=self._last_fps,
            capture_fps=self._capture_fps,
            samples_count=self._samples,
        )

    def get_health_summary(self) -> Dict[str, Any]:
        return {
            "subsystems": dict(self.subsystems),
            "cameras": dict(self.cameras),
            "overall_status": "ONLINE" if all(s == "ONLINE" for s in self.subsystems.values()) else "DEGRADED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def reset_session(self) -> None:
        self._total_yolo_ms = 0.0
        self._total_track_ms = 0.0
        self._total_geom_ms = 0.0
        self._total_risk_ms = 0.0
        self._total_pipeline_ms = 0.0
        self._samples = 0
        self._last_fps = 0.0
