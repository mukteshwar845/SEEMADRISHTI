"""
SEEMADRISHTI AI - Direction Analysis Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Calculates movement direction from trajectory displacement in image coordinates.
Image coordinate convention:
- X increases to the right (EAST)
- X decreases to the left (WEST)
- Y increases downwards (SOUTH)
- Y decreases upwards (NORTH)
"""

import math
from typing import Deque, List, Optional, Tuple


class DirectionAnalyzer:
    """
    Computes 8-cardinal compass directions plus STATIONARY and UNKNOWN.
    Uses multi-point trajectory smoothing to filter frame jitter.
    """

    DIRECTIONS = [
        "EAST",
        "SOUTHEAST",
        "SOUTH",
        "SOUTHWEST",
        "WEST",
        "NORTHWEST",
        "NORTH",
        "NORTHEAST",
    ]

    def __init__(self, min_displacement_px: float = 3.0, window_size: int = 5):
        self.min_displacement_px: float = float(min_displacement_px)
        self.window_size: int = int(window_size)

    def calculate_direction(
        self, centroids: List[Tuple[float, float]] | Deque[Tuple[float, float]]
    ) -> str:
        """
        Calculates movement direction from the last window_size centroids.
        """
        if not centroids or len(centroids) < 2:
            return "UNKNOWN"

        pts = list(centroids)
        # Select evaluation window
        start_idx = max(0, len(pts) - self.window_size)
        start_x, start_y = pts[start_idx]
        end_x, end_y = pts[-1]

        dx = end_x - start_x
        dy = end_y - start_y
        dist = math.hypot(dx, dy)

        # Suppress stationary noise / sub-pixel jitter
        if dist < self.min_displacement_px:
            return "STATIONARY"

        # math.atan2(dy, dx) gives angle in [-pi, pi]
        # In image coordinates:
        # dx > 0, dy = 0 -> angle = 0 rad (0 deg) -> EAST
        # dx = 0, dy > 0 -> angle = +pi/2 rad (+90 deg) -> SOUTH
        # dx < 0, dy = 0 -> angle = +/-pi rad (180 deg) -> WEST
        # dx = 0, dy < 0 -> angle = -pi/2 rad (-90 deg) -> NORTH
        angle_rad = math.atan2(dy, dx)
        angle_deg = math.degrees(angle_rad)  # in range [-180, 180]

        # Normalize angle to [0, 360)
        # 0: East, 90: South, 180: West, 270: North
        normalized = (angle_deg + 360.0) % 360.0

        # Each 45-degree sector is centered around:
        # East: 0 (337.5 to 22.5)
        # Southeast: 45 (22.5 to 67.5)
        # South: 90 (67.5 to 112.5)
        # Southwest: 135 (112.5 to 157.5)
        # West: 180 (157.5 to 202.5)
        # Northwest: 225 (202.5 to 247.5)
        # North: 270 (247.5 to 292.5)
        # Northeast: 315 (292.5 to 337.5)
        sector_idx = int(((normalized + 22.5) % 360.0) // 45.0)
        return self.DIRECTIONS[sector_idx]
