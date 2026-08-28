"""
SEEMADRISHTI AI - Movement Speed Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Calculates image-plane movement speed in pixel_speed_px_per_sec.
Tracks instantaneous, average, and maximum speeds with spike filtering.
"""

import math
from typing import Deque, List, Optional, Tuple


class SpeedCalculator:
    """
    Computes real-time 2D pixel speed on the image plane.
    Filters out teleportation artifacts caused by detection bounding box jumps.
    """

    def __init__(self, max_valid_speed_px_s: float = 600.0, recent_window_size: int = 5):
        self.max_valid_speed_px_s: float = float(max_valid_speed_px_s)
        self.recent_window_size: int = int(recent_window_size)

    def calculate_current_speed(
        self,
        centroids: List[Tuple[float, float]] | Deque[Tuple[float, float]],
        timestamps: List[float] | Deque[float],
    ) -> float:
        """
        Calculates recent instantaneous speed over the last recent_window_size frames.
        """
        if not centroids or not timestamps or len(centroids) < 2:
            return 0.0

        pts = list(centroids)
        ts = list(timestamps)

        start_idx = max(0, len(pts) - self.recent_window_size)
        total_dist = 0.0
        for i in range(start_idx, len(pts) - 1):
            dx = pts[i + 1][0] - pts[i][0]
            dy = pts[i + 1][1] - pts[i][1]
            dist = math.hypot(dx, dy)
            total_dist += dist

        dt = ts[-1] - ts[start_idx]
        if dt <= 0.0:
            return 0.0

        speed = total_dist / dt
        # Filter unrealistic spike jumps
        if speed > self.max_valid_speed_px_s:
            return 0.0

        return round(speed, 2)

    def calculate_average_speed(self, total_distance: float, total_duration: float) -> float:
        """
        Calculates cumulative average speed across the lifetime of the track.
        """
        if total_duration <= 0.0:
            return 0.0
        return round(total_distance / total_duration, 2)
