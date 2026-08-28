"""
SEEMADRISHTI AI - Night Movement Intelligence (Phase 9)

Team: IQ100
SIH Problem: SIH26187

Detects suspicious human movements during low-light / night hours with:
- Target class gating (strictly person)
- Temporal displacement validation (eliminates stationary sensor noise & flickering shadows)
- Anti-duplicate alert suppression per track session
"""

import time
import math
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any


@dataclass
class NightMovementEvent:
    event_type: str  # 'NIGHT_MOVEMENT'
    camera_id: str
    track_id: int
    class_name: str
    environment_mode: str
    brightness: float
    visibility_score: float
    bbox: List[int]
    confidence: float
    timestamp: float
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class NightMovementDetector:
    """
    Evaluates tracking trajectories during degraded lighting conditions.
    """

    def __init__(
        self,
        min_consecutive_frames: int = 2,
        min_displacement_px: float = 5.0,
        alert_cooldown_seconds: float = 10.0,
    ):
        self.min_consecutive_frames = min_consecutive_frames
        self.min_displacement_px = min_displacement_px
        self.alert_cooldown_seconds = alert_cooldown_seconds

        # Track history: (camera_id, track_id) -> list of (timestamp, centroid_x, centroid_y)
        self._track_history: Dict[Tuple[str, int], List[Tuple[float, float, float]]] = {}

        # Cooldown record: (camera_id, track_id) -> last_alert_time
        self._last_alert_time: Dict[Tuple[str, int], float] = {}

    def process_track(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        bbox: List[int],
        environment_mode: str,
        brightness: float,
        visibility_score: float,
        confidence: float = 0.85,
        current_time: Optional[float] = None,
        is_inside_restricted_zone: bool = True,
    ) -> Optional[NightMovementEvent]:
        """
        Evaluate if a tracked entity represents a genuine night movement breach.
        """
        now = current_time if current_time is not None else time.time()
        key = (camera_id, track_id)

        # 1. Target Class Gating: Only human targets (person) trigger night movement intelligence
        if class_name.lower() != "person":
            return None

        # 2. Lighting Gating: Only active during NIGHT, LOW_LIGHT, or DUSK
        if environment_mode not in ("NIGHT", "LOW_LIGHT", "DUSK"):
            return None

        # 3. Compute Centroid
        cx = (bbox[0] + bbox[2]) / 2.0
        cy = (bbox[1] + bbox[3]) / 2.0

        if key not in self._track_history:
            self._track_history[key] = []
        self._track_history[key].append((now, cx, cy))

        # Maintain sliding history window
        if len(self._track_history[key]) > 30:
            self._track_history[key].pop(0)

        history = self._track_history[key]
        if len(history) < self.min_consecutive_frames:
            return None

        # 4. Temporal Displacement Validation: compute net movement distance
        first_t, first_x, first_y = history[0]
        dx = cx - first_x
        dy = cy - first_y
        total_displacement = math.sqrt(dx * dx + dy * dy)

        if total_displacement < self.min_displacement_px:
            # Stationary target (e.g. noise, static false positive) -> suppress
            return None

        # 5. Anti-Duplicate Cooldown Gating
        last_alert = self._last_alert_time.get(key, 0.0)
        if (now - last_alert) < self.alert_cooldown_seconds:
            return None

        self._last_alert_time[key] = now

        reason = (
            f"Person movement ({total_displacement:.1f}px) detected during {environment_mode} "
            f"conditions (Visibility: {visibility_score:.1f}%, Brightness: {brightness:.1f})"
        )

        event = NightMovementEvent(
            event_type="NIGHT_MOVEMENT",
            camera_id=camera_id,
            track_id=track_id,
            class_name=class_name,
            environment_mode=environment_mode,
            brightness=brightness,
            visibility_score=visibility_score,
            bbox=bbox,
            confidence=confidence,
            timestamp=now,
            reason=reason,
        )

        return event

    def cleanup_inactive_tracks(self, camera_id: str, active_track_ids: set) -> None:
        """Prune tracks that are no longer active."""
        stale_keys = [
            k for k in self._track_history.keys()
            if k[0] == camera_id and k[1] not in active_track_ids
        ]
        for k in stale_keys:
            self._track_history.pop(k, None)
            self._last_alert_time.pop(k, None)
