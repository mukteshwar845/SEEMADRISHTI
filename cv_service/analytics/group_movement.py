"""
SEEMADRISHTI AI - Group Movement Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Identifies coordinated groups of targets moving in spatial proximity with aligned
direction and velocity. Generates analytics signals without false alarms.
"""

import math
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple


class CoordinatedGroup:
    """
    Tracks a persistent cluster of co-moving targets.
    """

    def __init__(
        self,
        group_id: str,
        camera_id: str,
        initial_track_ids: Set[int],
        direction: str,
        timestamp: float,
    ):
        self.group_id: str = group_id
        self.camera_id: str = camera_id
        self.track_ids: Set[int] = set(initial_track_ids)
        self.direction: str = direction

        self.first_seen: float = float(timestamp)
        self.last_seen: float = float(timestamp)
        self.frame_count: int = 1

        self.average_separation: float = 0.0
        self.average_speed: float = 0.0

    def update(
        self,
        matching_track_ids: Set[int],
        avg_separation: float,
        avg_speed: float,
        direction: str,
        timestamp: float,
    ):
        self.track_ids = set(matching_track_ids)
        self.average_separation = round(avg_separation, 1)
        self.average_speed = round(avg_speed, 1)
        self.direction = direction
        self.last_seen = float(timestamp)
        self.frame_count += 1

    @property
    def duration_seconds(self) -> float:
        return round(max(0.0, self.last_seen - self.first_seen), 1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "group_id": self.group_id,
            "camera_id": self.camera_id,
            "track_ids": sorted(list(self.track_ids)),
            "size": len(self.track_ids),
            "direction": self.direction,
            "average_separation_px": self.average_separation,
            "average_speed": self.average_speed,
            "duration_seconds": self.duration_seconds,
            "frame_count": self.frame_count,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }


class GroupMovementDetector:
    """
    Clusters active tracks by Euclidean proximity, direction alignment, and speed similarity.
    """

    def __init__(
        self,
        max_separation_px: float = 120.0,
        max_speed_diff_px_s: float = 35.0,
        min_group_size: int = 2,
        min_frames: int = 3,
    ):
        self.max_separation_px: float = float(max_separation_px)
        self.max_speed_diff_px_s: float = float(max_speed_diff_px_s)
        self.min_group_size: int = int(min_group_size)
        self.min_frames: int = int(min_frames)

        # Active groups: group_id -> CoordinatedGroup
        self.active_groups: Dict[str, CoordinatedGroup] = {}

    def process_tracks(
        self,
        camera_id: str,
        tracks: List[Dict[str, Any]],
        timestamp: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Evaluates active tracks on camera, clusters targets moving in tandem.
        Returns list of persistent group movement dictionaries.
        """
        now = float(timestamp) if timestamp is not None else time.time()
        # Filter for moving targets
        moving = [
            t for t in tracks
            if t.get("direction", "STATIONARY") not in ("STATIONARY", "UNKNOWN")
        ]

        if len(moving) < self.min_group_size:
            # Cleanup expired groups
            self._cleanup_missing_groups(camera_id, set(), now)
            return []

        # Find connected components of mutually close and co-directional targets
        n = len(moving)
        adj: Dict[int, List[int]] = {i: [] for i in range(n)}

        for i in range(n):
            for j in range(i + 1, n):
                t1, t2 = moving[i], moving[j]
                # Check direction match
                if t1.get("direction") != t2.get("direction"):
                    continue

                # Check speed similarity
                s1 = float(t1.get("speed", 0.0))
                s2 = float(t2.get("speed", 0.0))
                if abs(s1 - s2) > self.max_speed_diff_px_s:
                    continue

                # Check spatial distance
                c1 = t1.get("centroid", (0.0, 0.0))
                c2 = t2.get("centroid", (0.0, 0.0))
                dist = math.hypot(c1[0] - c2[0], c1[1] - c2[1])
                if dist <= self.max_separation_px:
                    adj[i].append(j)
                    adj[j].append(i)

        # Connected component search (BFS)
        visited = set()
        detected_clusters = []

        for i in range(n):
            if i in visited:
                continue
            component = []
            queue = [i]
            visited.add(i)
            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            if len(component) >= self.min_group_size:
                cluster_tracks = [moving[idx] for idx in component]
                detected_clusters.append(cluster_tracks)

        # Match detected clusters against active groups
        active_tids_in_groups = set()
        persistent_groups = []

        for cluster in detected_clusters:
            tids = {int(t["track_id"]) for t in cluster}
            direction = cluster[0].get("direction", "UNKNOWN")
            speeds = [float(t.get("speed", 0.0)) for t in cluster]
            avg_speed = sum(speeds) / len(speeds)

            # Compute average pairwise separation
            centroids = [t.get("centroid", (0.0, 0.0)) for t in cluster]
            distances = []
            for a in range(len(centroids)):
                for b in range(a + 1, len(centroids)):
                    distances.append(math.hypot(centroids[a][0] - centroids[b][0], centroids[a][1] - centroids[b][1]))
            avg_sep = (sum(distances) / len(distances)) if distances else 0.0

            # Check if matches an existing active group
            matched_group = None
            for grp in self.active_groups.values():
                if grp.camera_id == camera_id and len(grp.track_ids & tids) >= 1:
                    matched_group = grp
                    break

            if matched_group:
                matched_group.update(tids, avg_sep, avg_speed, direction, now)
                active_tids_in_groups.update(tids)
                if matched_group.frame_count >= self.min_frames:
                    persistent_groups.append(matched_group.to_dict())
            else:
                gid = f"grp-{uuid.uuid4().hex[:10]}"
                new_grp = CoordinatedGroup(gid, camera_id, tids, direction, now)
                new_grp.average_separation = round(avg_sep, 1)
                new_grp.average_speed = round(avg_speed, 1)
                self.active_groups[gid] = new_grp
                active_tids_in_groups.update(tids)
                if new_grp.frame_count >= self.min_frames:
                    persistent_groups.append(new_grp.to_dict())

        self._cleanup_missing_groups(camera_id, active_tids_in_groups, now)
        return persistent_groups

    def _cleanup_missing_groups(self, camera_id: str, active_tids: Set[int], current_time: float):
        to_del = []
        for gid, grp in self.active_groups.items():
            if grp.camera_id == camera_id:
                if not (grp.track_ids & active_tids) and (current_time - grp.last_seen) > 2.0:
                    to_del.append(gid)
        for gid in to_del:
            del self.active_groups[gid]
