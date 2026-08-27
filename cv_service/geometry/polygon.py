"""
SEEMADRISHTI AI - Geometric Polygon & Ray-Casting Module (Phase 4)

Handles virtual restricted zones, point-in-polygon tests using the ray-casting algorithm,
target centroid calculations, and coordinate transformations.
"""

from typing import List, Tuple, Union, Dict, Any


def calculate_centroid(bbox: Dict[str, Union[int, float]]) -> Tuple[float, float]:
    """
    Calculate the centroid (center of mass) of an object's bounding box.
    
    Why Centroid:
    - Invariant to bounding box aspect ratio fluctuations and scale changes.
    - Represents the physical ground projection center of mass of pedestrians and vehicles.
    - Much more stable than the top-left corner which swings wildly as legs/arms swing.
    
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


def is_point_in_polygon(
    point: Tuple[float, float],
    polygon: List[Tuple[float, float]],
    include_boundary: bool = True,
) -> bool:
    """
    Determines if a 2D point (px, py) lies strictly inside or on the boundary of a polygon
    using the standard Ray-Casting algorithm (Jordan Curve Theorem).
    
    Args:
        point: (px, py) query coordinate.
        polygon: List of (x, y) vertices defining the closed polygon.
        include_boundary: If True, points directly on polygon edges are considered inside.
        
    Returns:
        bool: True if the point is inside (or on boundary if enabled), False otherwise.
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
            # Compute x-coordinate of intersection with the horizontal line at py
            intersect_x = x1 + (py - y1) * (x2 - x1) / (y2 - y1)
            if px < intersect_x:
                inside = not inside

    return inside


class PolygonZone:
    """
    Virtual Restricted Perimeter / Geofence Zone representation.
    """

    def __init__(
        self,
        zone_id: str,
        camera_id: str,
        name: str,
        polygon: List[Union[List[float], Tuple[float, float]]],
        enabled: bool = True,
    ):
        self.zone_id = str(zone_id)
        self.camera_id = str(camera_id)
        self.name = str(name)
        self.enabled = bool(enabled)
        
        # Parse polygon points as floats
        self.raw_polygon: List[Tuple[float, float]] = [
            (float(p[0]), float(p[1])) for p in polygon
        ]
        
        if len(self.raw_polygon) < 3:
            raise ValueError(f"Zone '{self.zone_id}' must have at least 3 polygon points")

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
        """
        if not self.enabled:
            return False

        poly = self.get_pixel_polygon(frame_width, frame_height)
        return is_point_in_polygon(point, poly, include_boundary=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.zone_id,
            "camera_id": self.camera_id,
            "name": self.name,
            "polygon": self.raw_polygon,
            "enabled": self.enabled,
            "is_normalized": self.is_normalized,
        }
