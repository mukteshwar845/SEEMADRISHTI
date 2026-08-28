"""
SEEMADRISHTI AI - Multi-Camera Corridor Analytics Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Analyzes cross-camera movement corridors based on Phase 8 multi-camera transitions.
Calculates traversal volume, transit duration, dominant classes, and corridor reliability.
"""

from typing import Any, Dict, List, Optional, Tuple


class CorridorStats:
    """
    Statistics for a directed camera-to-camera movement corridor (e.g. CAM-01 -> CAM-02).
    """

    def __init__(self, from_camera: str, to_camera: str):
        self.from_camera: str = from_camera
        self.to_camera: str = to_camera
        self.corridor_id: str = f"{from_camera}->{to_camera}"

        self.traversal_count: int = 0
        self.transit_times: List[float] = []
        self.classes: Dict[str, int] = {}
        self.directions: Dict[str, int] = {}

    def record_transition(
        self,
        transit_time_seconds: float,
        class_name: str = "person",
        direction: str = "UNKNOWN",
    ):
        self.traversal_count += 1
        if transit_time_seconds > 0:
            self.transit_times.append(float(transit_time_seconds))

        cname = class_name.lower()
        self.classes[cname] = self.classes.get(cname, 0) + 1

        if direction != "UNKNOWN":
            self.directions[direction] = self.directions.get(direction, 0) + 1

    @property
    def average_transit_time(self) -> float:
        if not self.transit_times:
            return 0.0
        return round(sum(self.transit_times) / len(self.transit_times), 2)

    @property
    def dominant_direction(self) -> str:
        if not self.directions:
            return "UNKNOWN"
        return max(self.directions.items(), key=lambda x: x[1])[0]

    @property
    def confidence(self) -> float:
        """
        Confidence increases with traversal sample count, bounded to [0.5, 1.0].
        """
        return round(min(1.0, 0.5 + (self.traversal_count * 0.1)), 2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "corridor_id": self.corridor_id,
            "from_camera": self.from_camera,
            "to_camera": self.to_camera,
            "traversal_count": self.traversal_count,
            "average_transit_time": self.average_transit_time,
            "dominant_direction": self.dominant_direction,
            "classes_observed": list(self.classes.keys()),
            "confidence": self.confidence,
        }


class CorridorAnalyzer:
    """
    Manages multi-camera corridor tracking across the surveillance grid.
    """

    def __init__(self):
        # Key: (from_camera, to_camera) -> CorridorStats
        self.corridors: Dict[Tuple[str, str], CorridorStats] = {}

    def record_traversal(
        self,
        from_camera: str,
        to_camera: str,
        transit_time_seconds: float,
        class_name: str = "person",
        direction: str = "UNKNOWN",
    ) -> CorridorStats:
        key = (from_camera, to_camera)
        if key not in self.corridors:
            self.corridors[key] = CorridorStats(from_camera, to_camera)

        stats = self.corridors[key]
        stats.record_transition(transit_time_seconds, class_name, direction)
        return stats

    def get_corridor(self, from_camera: str, to_camera: str) -> Optional[Dict[str, Any]]:
        stats = self.corridors.get((from_camera, to_camera))
        return stats.to_dict() if stats else None

    def get_all_corridors(self) -> List[Dict[str, Any]]:
        return [c.to_dict() for c in self.corridors.values()]
