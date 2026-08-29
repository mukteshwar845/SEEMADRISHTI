"""
SEEMADRISHTI AI - Geometric Polygon & Ray-Casting Module (Phase 4 & Phase 16)

Handles virtual restricted zones, virtual tripwires, point-in-polygon tests using
the ray-casting algorithm, line-segment crossing tests, target centroid calculations,
and coordinate transformations.
"""

from typing import List, Tuple, Union, Dict, Any, Optional


def calculate_centroid(
    bbox: Union[Dict[str, Union[int, float]], List[Union[int, float]], Tuple[Union[int, float], ...]]
) -> Tuple[float, float]:
    """
    Calculate the centroid (center of mass) of an object's bounding box.
    Supports both dict {"x1": ..., "y1": ..., "x2": ..., "y2": ...} and list/tuple [x1, y1, x2, y2].
    """
    if isinstance(bbox, (list, tuple)):
        if len(bbox) >= 4:
            return ((float(bbox[0]) + float(bbox[2])) / 2.0, (float(bbox[1]) + float(bbox[3])) / 2.0)
        return (0.0, 0.0)
    elif isinstance(bbox, dict):
        x1 = float(bbox.get("x1", bbox.get("left", 0)))
        x2 = float(bbox.get("x2", bbox.get("right", 0)))
        y1 = float(bbox.get("y1", bbox.get("top", 0)))
        y2 = float(bbox.get("y2", bbox.get("bottom", 0)))
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)
    return (0.0, 0.0)


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


def _orientation(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float]) -> int:
    val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
    if abs(val) < 1e-7:
        return 0  # collinear
    return 1 if val > 0 else 2  # 1: clockwise, 2: counterclockwise


def _on_segment_box(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float]) -> bool:
    return (
        q[0] <= max(p[0], r[0]) + 1e-7
        and q[0] >= min(p[0], r[0]) - 1e-7
        and q[1] <= max(p[1], r[1]) + 1e-7
        and q[1] >= min(p[1], r[1]) - 1e-7
    )


def segments_intersect(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    q1: Tuple[float, float],
    q2: Tuple[float, float],
) -> bool:
    """
    Determines if line segment p1->p2 intersects segment q1->q2, including boundary touch.
    Used for virtual tripwire line crossing detection.
    """
    o1 = _orientation(p1, p2, q1)
    o2 = _orientation(p1, p2, q2)
    o3 = _orientation(q1, q2, p1)
    o4 = _orientation(q1, q2, p2)

    # General case: different orientations
    if o1 != o2 and o3 != o4:
        return True

    # Special Cases: collinearity and containment
    if o1 == 0 and _on_segment_box(p1, q1, p2):
        return True
    if o2 == 0 and _on_segment_box(p1, q2, p2):
        return True
    if o3 == 0 and _on_segment_box(q1, p1, q2):
        return True
    if o4 == 0 and _on_segment_box(q1, p2, q2):
        return True

    return False


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
        if (y1 > py) != (y2 > py):
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
        polygon: Optional[List] = None,
        enabled: bool = True,
        zone_type: Optional[str] = None,
        is_tripwire: Optional[bool] = None,
        is_normalized: Optional[bool] = None,
        **kwargs,
    ):
        # Handle flexible positional argument calling: PolygonZone(zone_id, name, polygon)
        if isinstance(camera_id, list) and polygon is None:
            polygon = camera_id
            camera_id = kwargs.get("camera_id", "cam-01")
            name = kwargs.get("name", "Zone")
        elif isinstance(name, list) and polygon is None:
            polygon = name
            name = str(camera_id)
            camera_id = kwargs.get("camera_id", "cam-01")

        self.zone_id = str(zone_id)
        self.camera_id = str(camera_id)
        self.name = str(name)
        self.enabled = bool(enabled)
        self.zone_type = str(zone_type or kwargs.get("type", "RESTRICTED_ZONE")).upper()

        pts = polygon if polygon is not None else kwargs.get("raw_polygon", [])
        self.raw_polygon: List[Tuple[float, float]] = [
            (float(p[0]), float(p[1])) for p in pts
        ]

        if len(self.raw_polygon) < 2:
            raise ValueError(f"Zone '{self.zone_id}' must have at least 2 points (tripwire) or 3 points (polygon)")

        if is_tripwire is not None:
            self.is_tripwire = bool(is_tripwire)
        else:
            self.is_tripwire = len(self.raw_polygon) == 2 or self.zone_type == "TRIPWIRE"

        if is_normalized is not None:
            self.is_normalized = bool(is_normalized)
        else:
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

    intersects_trajectory = test_crossing

    def get_crossing_direction(
        self,
        prev_pos: Tuple[float, float],
        curr_pos: Tuple[float, float],
        frame_width: int = 1920,
        frame_height: int = 1080,
    ) -> str:
        """
        Determines the crossing direction across the tripwire line segment:
        'IN' (forward normal crossing) vs 'OUT' (reverse crossing).
        Calculated via 2D vector dot-product between displacement vector and segment normal.
        """
        poly = self.get_pixel_polygon(frame_width, frame_height)
        if len(poly) < 2:
            return "IN"

        x1, y1 = poly[0]
        x2, y2 = poly[1]

        # Segment vector
        dx = x2 - x1
        dy = y2 - y1

        # Perpendicular normal vector pointing to the "inward" side
        nx = -dy
        ny = dx

        # Motion displacement vector
        mx = curr_pos[0] - prev_pos[0]
        my = curr_pos[1] - prev_pos[1]

        dot = mx * nx + my * ny
        return "IN" if dot >= 0 else "OUT"

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


def get_crossing_direction(
    prev_pos: Tuple[float, float],
    curr_pos: Tuple[float, float],
    line_start: Tuple[float, float],
    line_end: Tuple[float, float],
) -> str:
    """
    Determines crossing direction across a line segment:
    'IN' (forward normal crossing) vs 'OUT' (reverse crossing).
    """
    x1, y1 = line_start
    x2, y2 = line_end

    dx = x2 - x1
    dy = y2 - y1

    nx = -dy
    ny = dx

    mx = curr_pos[0] - prev_pos[0]
    my = curr_pos[1] - prev_pos[1]

    dot = mx * nx + my * ny
    return "IN" if dot >= 0 else "OUT"

