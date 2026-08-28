"""
SEEMADRISHTI AI - Zone Occupancy Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Tracks real-time zone occupancy, peak occupancy, duration, and class breakdown.
"""

import time
from typing import Any, Dict, List, Optional, Tuple

from cv_service.geometry.polygon import is_point_in_polygon


class ZoneOccupancyTracker:
    """
    Monitors occupancy dynamics for a single restricted polygon zone.
    """

    def __init__(self, camera_id: str, zone_id: str, zone_name: str, polygon: List[Tuple[float, float]]):
        self.camera_id: str = camera_id
        self.zone_id: str = zone_id
        self.zone_name: str = zone_name
        self.polygon: List[Tuple[float, float]] = polygon

        self.current_occupants: int = 0
        self.peak_occupants: int = 0
        self.class_breakdown: Dict[str, int] = {}

        # Statistical tracking
        self.total_observations: int = 0
        self.sum_occupants: int = 0
        self.occupied_since: Optional[float] = None
        self.total_occupied_seconds: float = 0.0
        self.last_update: float = time.time()

    def update_occupancy(
        self,
        tracks: List[Dict[str, Any]],
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Updates zone occupancy by evaluating target centroids against zone polygon.
        """
        now = float(timestamp) if timestamp is not None else time.time()
        dt = max(0.0, now - self.last_update)
        self.last_update = now

        inside_tracks = []
        breakdown: Dict[str, int] = {}

        for trk in tracks:
            centroid = trk.get("centroid", (0.0, 0.0))
            if is_point_in_polygon(centroid, self.polygon):
                inside_tracks.append(trk)
                cname = trk.get("class_name", "person").lower()
                breakdown[cname] = breakdown.get(cname, 0) + 1

        count = len(inside_tracks)
        self.current_occupants = count
        self.class_breakdown = breakdown

        if count > self.peak_occupants:
            self.peak_occupants = count

        # Cumulative statistics
        self.total_observations += 1
        self.sum_occupants += count

        # Occupied duration
        if count > 0:
            if self.occupied_since is None:
                self.occupied_since = now
            self.total_occupied_seconds += dt
        else:
            self.occupied_since = None

        return self.get_stats()

    @property
    def average_occupants(self) -> float:
        if self.total_observations == 0:
            return 0.0
        return round(self.sum_occupants / self.total_observations, 2)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "zone_id": self.zone_id,
            "zone_name": self.zone_name,
            "current_occupants": self.current_occupants,
            "peak_occupants": self.peak_occupants,
            "average_occupants": self.average_occupants,
            "class_breakdown": dict(self.class_breakdown),
            "is_occupied": self.current_occupants > 0,
            "total_occupied_seconds": round(self.total_occupied_seconds, 2),
        }


class OccupancyEngine:
    """
    Manages zone occupancy calculations across all cameras and zones.
    """

    def __init__(self):
        # Key: (camera_id, zone_id) -> ZoneOccupancyTracker
        self.zones: Dict[Tuple[str, str], ZoneOccupancyTracker] = {}

    def register_zone(self, camera_id: str, zone_id: str, zone_name: str, polygon: List[Tuple[float, float]]):
        self.zones[(camera_id, zone_id)] = ZoneOccupancyTracker(camera_id, zone_id, zone_name, polygon)

    def update_camera(
        self,
        camera_id: str,
        tracks: List[Dict[str, Any]],
        timestamp: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        results = []
        for (cid, _), tracker in self.zones.items():
            if cid == camera_id:
                stats = tracker.update_occupancy(tracks, timestamp)
                results.append(stats)
        return results

    def get_zone_stats(self, camera_id: str, zone_id: str) -> Optional[Dict[str, Any]]:
        tracker = self.zones.get((camera_id, zone_id))
        return tracker.get_stats() if tracker else None

    def get_all_stats(self) -> List[Dict[str, Any]]:
        return [tracker.get_stats() for tracker in self.zones.values()]
