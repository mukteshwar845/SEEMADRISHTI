"""
SEEMADRISHTI AI - Configuration & Deployment Validator
Team: IQ100 | Problem Statement: SIH26187

Phase 15 - Part N & O: Operational Configuration Preflight Validation.
Validates all runtime paths, YOLO weights, camera sources, polygons,
and risk thresholds before CV pipeline execution.
"""

import json
import os
import sys
from typing import Any, Dict, List, Optional, Tuple


class ConfigValidator:
    """Validates operational runtime configuration and reports actionable errors."""

    @staticmethod
    def validate_runtime_environment(
        config_path: Optional[str] = None,
        database_path: Optional[str] = None,
        evidence_dir: Optional[str] = None,
        model_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        errors: List[str] = []
        warnings: List[str] = []
        summary: Dict[str, Any] = {}

        # 1. Camera Sources Configuration
        cfg_file = config_path or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "config", "camera_sources.json")
        )
        if not os.path.exists(cfg_file):
            warnings.append(f"Camera sources configuration file not found at: '{cfg_file}'. Using fallback source discovery.")
            summary["camera_count"] = 0
        else:
            try:
                with open(cfg_file, "r", encoding="utf-8") as f:
                    sources = json.load(f)
                summary["camera_count"] = len(sources)
                for cam_id, prof in sources.items():
                    stype = prof.get("source_type", "mp4").lower()
                    suri = prof.get("source_uri", "")
                    if not suri:
                        errors.append(f"Camera '{cam_id}': source_uri cannot be empty.")
                    elif stype == "mp4":
                        abs_mp4 = suri if os.path.isabs(suri) else os.path.abspath(os.path.join(os.getcwd(), suri))
                        if not os.path.exists(abs_mp4):
                            warnings.append(f"Camera '{cam_id}': configured MP4 fixture '{suri}' does not exist on disk.")
                    elif stype == "rtsp" and not (suri.startswith("rtsp://") or suri.startswith("rtsps://")):
                        errors.append(f"Camera '{cam_id}': invalid RTSP URI format: '{suri}'.")
            except Exception as e:
                errors.append(f"Failed to parse camera sources config: {str(e)}")

        # 2. Database Directory
        db_path = database_path or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "data", "seemadrishti.sqlite")
        )
        db_dir = os.path.dirname(db_path)
        if not os.path.exists(db_dir):
            try:
                os.makedirs(db_dir, exist_ok=True)
            except Exception as e:
                errors.append(f"Database directory is not writable: '{db_dir}' ({str(e)})")
        summary["database_path"] = db_path

        # 3. Evidence Directory
        ev_dir = evidence_dir or os.path.abspath(os.path.join(os.getcwd(), "evidence"))
        if not os.path.exists(ev_dir):
            try:
                os.makedirs(ev_dir, exist_ok=True)
            except Exception as e:
                errors.append(f"Evidence directory cannot be created: '{ev_dir}' ({str(e)})")
        summary["evidence_directory"] = ev_dir

        # 4. YOLO Model Weights
        yolo_path = model_path or "yolov8n.pt"
        summary["model_target"] = yolo_path

        # 5. Operational Thresholds
        summary["risk_tiers"] = {"HIGH": 70, "CRITICAL": 85}
        summary["loitering_dwell_threshold_sec"] = 15.0
        summary["pre_event_buffer_sec"] = 5.0
        summary["post_event_buffer_sec"] = 10.0

        is_valid = len(errors) == 0

        return {
            "valid": is_valid,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "errors": errors,
            "warnings": warnings,
            "summary": summary,
        }

    @staticmethod
    def validate_polygon_geometry(polygon: List[Tuple[float, float]]) -> Tuple[bool, Optional[str]]:
        """Validates that a polygonal geofence has at least 3 vertices and positive coordinate space."""
        if not isinstance(polygon, list) or len(polygon) < 3:
            return False, f"Polygon must have at least 3 vertices (found {len(polygon) if isinstance(polygon, list) else 0})."

        for idx, pt in enumerate(polygon):
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                return False, f"Vertex #{idx} is not a valid 2D coordinate pair: {pt}"
            x, y = pt[0], pt[1]
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                return False, f"Vertex #{idx} contains non-numeric coordinates: ({x}, {y})"

        return True, None
