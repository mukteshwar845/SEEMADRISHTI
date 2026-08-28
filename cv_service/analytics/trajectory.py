"""
SEEMADRISHTI AI - Trajectory Tracking & Management Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Maintains bounded temporal trajectory history for each active ByteTrack track.
Computes centroids, path distance, average speed, and tracks spatial evolution.
"""

from collections import deque
import math
from typing import Any, Deque, Dict, List, Optional, Tuple


class TrackTrajectory:
    """
    Encapsulates the spatio-temporal trajectory of a single tracked object.
    Bounded to max_history_points to prevent memory leaks on edge devices.
    """

    def __init__(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        initial_bbox: List[float],
        timestamp: float,
        max_history_points: int = 100,
    ):
        self.camera_id: str = camera_id
        self.track_id: int = int(track_id)
        self.class_name: str = class_name
        self.max_history_points: int = max_history_points

        self.first_seen: float = float(timestamp)
        self.last_seen: float = float(timestamp)

        self.centroid_history: Deque[Tuple[float, float]] = deque(maxlen=max_history_points)
        self.bbox_history: Deque[List[float]] = deque(maxlen=max_history_points)
        self.timestamps: Deque[float] = deque(maxlen=max_history_points)

        self.total_distance: float = 0.0
        self.average_speed: float = 0.0
        self.current_direction: str = "STATIONARY"

        # Record initial frame
        x1, y1, x2, y2 = initial_bbox
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        self.centroid_history.append((cx, cy))
        self.bbox_history.append([float(x1), float(y1), float(x2), float(y2)])
        self.timestamps.append(self.first_seen)

    def update(self, bbox: List[float], timestamp: float, direction: Optional[str] = None):
        """
        Updates the trajectory with a new observation.
        Computes incremental Euclidean displacement and updates average speed.
        """
        now = float(timestamp)
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        if self.centroid_history:
            prev_cx, prev_cy = self.centroid_history[-1]
            dist = math.hypot(cx - prev_cx, cy - prev_cy)
            self.total_distance += dist

        self.centroid_history.append((cx, cy))
        self.bbox_history.append([float(x1), float(y1), float(x2), float(y2)])
        self.timestamps.append(now)
        self.last_seen = now

        duration = max(0.001, self.last_seen - self.first_seen)
        self.average_speed = round(self.total_distance / duration, 2)

        if direction is not None:
            self.current_direction = direction

    @property
    def latest_centroid(self) -> Tuple[float, float]:
        return self.centroid_history[-1] if self.centroid_history else (0.0, 0.0)

    @property
    def latest_bbox(self) -> List[float]:
        return self.bbox_history[-1] if self.bbox_history else [0.0, 0.0, 0.0, 0.0]

    @property
    def point_count(self) -> int:
        return len(self.centroid_history)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "track_id": self.track_id,
            "class_name": self.class_name,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "point_count": len(self.centroid_history),
            "latest_centroid": self.latest_centroid,
            "latest_bbox": self.latest_bbox,
            "total_distance": round(self.total_distance, 2),
            "average_speed": self.average_speed,
            "current_direction": self.current_direction,
        }


class TrajectoryEngine:
    """
    Manages active trajectories for multiple cameras and tracks.
    """

    def __init__(self, max_history_points: int = 100, max_idle_seconds: float = 10.0):
        self.max_history_points: int = max_history_points
        self.max_idle_seconds: float = max_idle_seconds
        # Key: (camera_id, track_id) -> TrackTrajectory
        self.trajectories: Dict[Tuple[str, int], TrackTrajectory] = {}

    def update_track(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        bbox: List[float],
        timestamp: float,
        direction: Optional[str] = None,
    ) -> TrackTrajectory:
        key = (camera_id, int(track_id))
        if key not in self.trajectories:
            self.trajectories[key] = TrackTrajectory(
                camera_id=camera_id,
                track_id=track_id,
                class_name=class_name,
                initial_bbox=bbox,
                timestamp=timestamp,
                max_history_points=self.max_history_points,
            )
        else:
            self.trajectories[key].update(bbox, timestamp, direction=direction)

        return self.trajectories[key]

    def get_trajectory(self, camera_id: str, track_id: int) -> Optional[TrackTrajectory]:
        return self.trajectories.get((camera_id, int(track_id)))

    def cleanup_stale_tracks(self, current_time: float) -> int:
        """
        Removes trajectories that haven't received updates within max_idle_seconds.
        """
        stale_keys = [
            k for k, traj in self.trajectories.items()
            if (current_time - traj.last_seen) > self.max_idle_seconds
        ]
        for k in stale_keys:
            del self.trajectories[k]
        return len(stale_keys)

    def get_active_trajectories(self, camera_id: Optional[str] = None) -> List[TrackTrajectory]:
        if camera_id:
            return [t for (cid, _), t in self.trajectories.items() if cid == camera_id]
        return list(self.trajectories.values())
