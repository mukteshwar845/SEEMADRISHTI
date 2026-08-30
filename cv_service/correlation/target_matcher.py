"""
SEEMADRISHTI AI - Cross-Camera Target Matcher (Phase 19)

Team: IQ100
Problem Statement: SIH26187

Appearance-independent, spatial-temporal target matching across camera boundaries.
Evaluates:
- Class match
- Camera topology connectivity
- Temporal transition boundaries (min/max travel time)
- Trajectory departure and arrival consistency
- Returns confidence (0.0 to 1.0) and explainable reason.
"""

from typing import Dict, Any, Optional, Tuple
from cv_service.correlation.camera_topology import CameraTopology


class TargetMatcher:
    """Matches target tracks transitioning between adjacent camera sectors."""

    def __init__(self, topology: Optional[CameraTopology] = None):
        self.topology = topology or CameraTopology()

    def evaluate_handover(
        self,
        src_camera: str,
        src_track_id: int,
        src_class: str,
        src_exit_time: float,
        dst_camera: str,
        dst_track_id: int,
        dst_class: str,
        dst_entry_time: float,
        src_direction: Optional[str] = None,
        dst_direction: Optional[str] = None,
    ) -> Tuple[bool, float, str, float]:
        """
        Evaluates potential handover between src and dst tracks.
        Returns: (is_valid, confidence, reason, temporal_gap)
        """
        # Rule 1: Cannot cross-camera correlate same camera
        if src_camera.strip().lower() == dst_camera.strip().lower():
            return False, 0.0, "Same camera tracks cannot form a cross-camera handover", 0.0

        # Rule 2: Strict Class Compatibility
        if src_class.strip().lower() != dst_class.strip().lower():
            return False, 0.0, f"Class mismatch: '{src_class}' vs '{dst_class}'", 0.0

        # Rule 3: Temporal Sequence (dst must occur after or concurrently with src exit)
        temporal_gap = dst_entry_time - src_exit_time
        if temporal_gap < 0:
            return False, 0.0, f"Negative time gap: destination entry occurred before source exit ({temporal_gap:.1f}s)", temporal_gap

        # Rule 4: Topology Connectivity Check
        connected = self.topology.are_cameras_connected(src_camera, dst_camera)
        if not connected:
            return False, 0.0, f"No direct surveillance corridor between '{src_camera}' and '{dst_camera}'", temporal_gap

        # Rule 5: Travel Time Window Compliance
        edge = self.topology.get_edge(src_camera, dst_camera)
        min_sec = edge.min_travel_seconds if edge else 1.0
        max_sec = edge.max_travel_seconds if edge else 60.0

        if temporal_gap < min_sec:
            # Transit too fast for physical terrain
            return False, 0.15, f"Transition too rapid ({temporal_gap:.1f}s < min {min_sec:.1f}s)", temporal_gap

        if temporal_gap > max_sec:
            # Transit window expired
            return False, 0.10, f"Transition expired ({temporal_gap:.1f}s > max {max_sec:.1f}s)", temporal_gap

        # If all hard constraints pass, compute calibrated confidence
        confidence = 0.50  # Base passing confidence

        # Optimal temporal window bonus (within 25% to 75% of window)
        mid_time = (min_sec + max_sec) / 2.0
        time_deviation = abs(temporal_gap - mid_time) / (max_sec - min_sec)
        time_score = max(0.0, 1.0 - time_deviation) * 0.25
        confidence += time_score

        # Directional consistency bonus
        if src_direction and dst_direction:
            if src_direction.upper() == "OUT" and dst_direction.upper() == "IN":
                confidence += 0.15
            elif src_direction.upper() == dst_direction.upper():
                confidence += 0.05
        else:
            confidence += 0.10

        confidence = round(min(0.95, max(0.0, confidence)), 2)

        reason = (
            f"Verified corridor traversal {src_camera.upper()} #{src_track_id} -> {dst_camera.upper()} #{dst_track_id} "
            f"across '{edge.sector_name if edge else 'Corridor'}' in {temporal_gap:.1f}s (confidence: {int(confidence*100)}%)"
        )
        return True, confidence, reason, temporal_gap
