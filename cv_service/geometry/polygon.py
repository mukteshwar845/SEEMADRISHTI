"""
SEEMADRISHTI AI - Geometric Polygon & Ray-Casting Module (Phase 4 & Phase 16)

Handles virtual restricted zones, virtual tripwires, point-in-polygon tests using
the ray-casting algorithm, line-segment crossing tests, target centroid calculations,
and coordinate transformations.
"""

from typing import List, Tuple, Union, Dict, Any, Optional


def calculate_centroid(bbox: Dict[str, Union[int, float]]) -> Tuple[float, float]:
    """
    Calculate the centroid (center of mass) of an object's bounding box.
    
    Why Centroid:
    - Invariant to bounding box aspect ratio fluctuations and scale changes.
    - Represents the physical ground projection center of mass of pedestrians and vehicles.
    - Much more stable than top-left corner which swings wildly as limbs swing.
    
    Returns:
        (cx, cy) in pixels.
    """
    cx = (float(bbox["x1"]) + float(bbox["x2"])) / 2.0
    cy = (float(bbox["y1"]) + float(bbox["y2"])) / 2.0
    return (cx, cy)


def is_point_on_segment(
    px: float, py: float, x1: float, y1: float, x2: float, y2: float, eps: float = 1e-5
) -> bool:
    """Check if point (px, py) lies on line segment (x1, y1) -> (x2, y2)."""
    cross_product = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1)
    if abs(cross_product) > eps:
        return False

    dot_product = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)
    if dot_product < -eps:
        return False

    squared_len = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
    if dot_product > squared_len + eps:
        return False

    return True


def _ccw(A: Tuple[float, float], B: Tuple[float, float], C: Tuple[float, float]) -> bool:
    """Determine counter-clockwise orientation for 3 points."""
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])


def segments_intersect(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    q1: Tuple[float, float],
    q2: Tuple[float, float],
) -> bool:
    """
    Determines if line segment p1->p2 intersects segment q1->q2.
    Used for virtual tripwire line crossing detection.
    """
    return (_ccw(p1, q1, q2) != _ccw(p2, q1, q2)) and (_ccw(p1, p2, q1) != _ccw(p1, p2, q2))


def is_point_in_polygon(
    point: Tuple[float, float],
    polygon: List[Tuple[float, float]],
    include_boundary: bool = True,
) -> bool:
    """
    Determines if a 2D point (px, py) lies strictly inside or on the boundary of a polygon
    using the standard Ray-Casting algorithm (Jordan Curve Theorem).
    """
    if len(polygon) < 3:
        return False

    px, py = point
    n = len(polygon)
    inside = False

    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]

        # Check if point lies directly on edge/boundary
        if include_boundary and is_point_on_segment(px, py, x1, y1, x2, y2):
            return True

        # Ray-casting along horizontal ray towards +X
        if ((y1 > py) != (y2 > py)):
            # Compute x-coordinate of intersection with horizontal line at py
            intersect_x = x1 + (py - y1) * (x2 - x1) / (y2 - y1)
            if px < intersect_x:
                inside = not inside

    return inside


class PolygonZone:
    """
    Virtual Restricted Perimeter / Geofence Zone & Tripwire Line representation.
    Supports both closed polygons (>=3 vertices) and tripwires (2 vertices).
    """

    def __init__(
        self,
        zone_id: str,
        camera_id: str = "cam-01",
        name: str = "Zone",
        polygon: Optional[List[Union[List[float], Tuple[float, float]]]] = None,
        enabled: bool = True,
        zone_type: str = "RESTRICTED_ZONE",
        **kwargs,
    ):
        self.zone_id = str(zone_id)
        self.camera_id = str(camera_id)
        self.name = str(name)
        self.enabled = bool(enabled)
        self.zone_type = str(zone_type or kwargs.get("type", "RESTRICTED_ZONE")).upper()
        
        pts = polygon if polygon is not None else kwargs.get("raw_polygon", [])
        # Parse polygon points as floats
        self.raw_polygon: List[Tuple[float, float]] = [
            (float(p[0]), float(p[1])) for p in pts
        ]
        
        if len(self.raw_polygon) < 2:
            raise ValueError(f"Zone '{self.zone_id}' must have at least 2 points (tripwire) or 3 points (polygon)")

        self.is_tripwire = len(self.raw_polygon) == 2 or self.zone_type == "TRIPWIRE"

        # Determine if coordinates are normalized [0.0 - 1.0] or absolute pixels
        self.is_normalized = all(
            0.0 <= pt[0] <= 1.0 and 0.0 <= pt[1] <= 1.0 for pt in self.raw_polygon
        )

    def get_pixel_polygon(
        self, frame_width: int, frame_height: int
    ) -> List[Tuple[float, float]]:
        """
        Returns polygon scaled to frame pixel dimensions.
        If coordinates were normalized, multiplies by frame dimensions.
        If coordinates were already pixels, returns as-is.
        """
        if self.is_normalized:
            return [
                (x * frame_width, y * frame_height) for x, y in self.raw_polygon
            ]
        return self.raw_polygon

    def is_inside(
        self,
        point: Tuple[float, float],
        frame_width: int = 1920,
        frame_height: int = 1080,
    ) -> bool:
        """
        Tests if point (cx, cy in frame pixel coordinates) is inside this zone.
        For tripwires, tests proximity to line segment (within 15px threshold).
        """
        if not self.enabled:
            return False

        poly = self.get_pixel_polygon(frame_width, frame_height)
        if self.is_tripwire or len(poly) < 3:
            # Proximity check for tripwire
            x1, y1 = poly[0]
            x2, y2 = poly[1]
            return is_point_on_segment(point[0], point[1], x1, y1, x2, y2, eps=15.0)

        return is_point_in_polygon(point, poly, include_boundary=True)

    def test_crossing(
        self,
        prev_pos: Tuple[float, float],
        curr_pos: Tuple[float, float],
        frame_width: int = 1920,
        frame_height: int = 1080,
    ) -> bool:
        """
        Tests if movement from prev_pos -> curr_pos crosses a tripwire line segment.
        """
        if not self.enabled:
            return False

        poly = self.get_pixel_polygon(frame_width, frame_height)
        if len(poly) >= 2:
            return segments_intersect(prev_pos, curr_pos, poly[0], poly[1])
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.zone_id,
            "camera_id": self.camera_id,
            "name": self.name,
            "polygon": self.raw_polygon,
            "enabled": self.enabled,
            "zone_type": self.zone_type,
            "is_tripwire": self.is_tripwire,
            "is_normalized": self.is_normalized,
        }
