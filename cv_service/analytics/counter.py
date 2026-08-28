"""
SEEMADRISHTI AI - Entry / Exit Counter Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Tracks transitions:
OUTSIDE -> INSIDE = ENTRY
INSIDE -> OUTSIDE = EXIT
Reuses Phase 4 polygon zone ray-casting geometry.
Maintains counts per camera, zone, class, and time window without repeated counting.
"""

import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from cv_service.geometry.polygon import is_point_in_polygon


class ZoneTransitionTracker:
    """
    Tracks state of tracks relative to a polygon zone to detect entry and exit events.
    """

    def __init__(self, camera_id: str, zone_id: str, zone_name: str, polygon: List[Tuple[float, float]]):
        self.camera_id: str = camera_id
        self.zone_id: str = zone_id
        self.zone_name: str = zone_name
        self.polygon: List[Tuple[float, float]] = polygon

        # Set of track_ids currently inside the zone
        self.inside_track_ids: Set[int] = set()

        # Cumulative counters
        self.total_entries: int = 0
        self.total_exits: int = 0
        self.class_entries: Dict[str, int] = {}
        self.class_exits: Dict[str, int] = {}

    def process_track(
        self,
        track_id: int,
        class_name: str,
        centroid: Tuple[float, float],
        direction: str = "UNKNOWN",
        speed: float = 0.0,
        timestamp: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluates track position and detects state transitions:
        - OUTSIDE -> INSIDE: Returns ENTRY event
        - INSIDE -> OUTSIDE: Returns EXIT event
        - Inside -> Inside / Outside -> Outside: Returns None (no repeated event)
        """
        now = float(timestamp) if timestamp is not None else time.time()
        tid = int(track_id)
        cname = class_name.lower()

        is_inside = is_point_in_polygon(centroid, self.polygon)
        was_inside = tid in self.inside_track_ids

        event = None

        if is_inside and not was_inside:
            # OUTSIDE -> INSIDE (ENTRY)
            self.inside_track_ids.add(tid)
            self.total_entries += 1
            self.class_entries[cname] = self.class_entries.get(cname, 0) + 1

            event = {
                "id": f"mve-{uuid.uuid4().hex[:12]}",
                "camera_id": self.camera_id,
                "zone_id": self.zone_id,
                "zone_name": self.zone_name,
                "track_id": tid,
                "class_name": cname,
                "event_type": "ENTRY",
                "direction": direction,
                "speed": speed,
                "timestamp": now,
            }

        elif not is_inside and was_inside:
            # INSIDE -> OUTSIDE (EXIT)
            self.inside_track_ids.remove(tid)
            self.total_exits += 1
            self.class_exits[cname] = self.class_exits.get(cname, 0) + 1

            event = {
                "id": f"mve-{uuid.uuid4().hex[:12]}",
                "camera_id": self.camera_id,
                "zone_id": self.zone_id,
                "zone_name": self.zone_name,
                "track_id": tid,
                "class_name": cname,
                "event_type": "EXIT",
                "direction": direction,
                "speed": speed,
                "timestamp": now,
            }

        return event

    def cleanup_missing_tracks(self, active_track_ids: Set[int], timestamp: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        If a track that was inside the zone is no longer detected, process an EXIT transition.
        """
        now = float(timestamp) if timestamp is not None else time.time()
        exits = []
        vanished = [tid for tid in self.inside_track_ids if tid not in active_track_ids]
        for tid in vanished:
            self.inside_track_ids.remove(tid)
            self.total_exits += 1
            self.class_exits["unknown"] = self.class_exits.get("unknown", 0) + 1
            exits.append({
                "id": f"mve-{uuid.uuid4().hex[:12]}",
                "camera_id": self.camera_id,
                "zone_id": self.zone_id,
                "zone_name": self.zone_name,
                "track_id": tid,
                "class_name": "unknown",
                "event_type": "EXIT",
                "direction": "UNKNOWN",
                "speed": 0.0,
                "timestamp": now,
            })
        return exits

    def get_stats(self) -> Dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "zone_id": self.zone_id,
            "zone_name": self.zone_name,
            "current_occupants": len(self.inside_track_ids),
            "total_entries": self.total_entries,
            "total_exits": self.total_exits,
            "class_entries": dict(self.class_entries),
            "class_exits": dict(self.class_exits),
        }


class EntryExitCounter:
    """
    Orchestrates entry and exit counting across all cameras and zones.
    """

    def __init__(self):
        # Key: (camera_id, zone_id) -> ZoneTransitionTracker
        self.trackers: Dict[Tuple[str, str], ZoneTransitionTracker] = {}

    def register_zone(self, camera_id: str, zone_id: str, zone_name: str, polygon: List[Tuple[float, float]]):
        key = (camera_id, zone_id)
        self.trackers[key] = ZoneTransitionTracker(camera_id, zone_id, zone_name, polygon)

    def process_tracks(
        self,
        camera_id: str,
        tracks: List[Dict[str, Any]],
        timestamp: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        events = []
        cam_trackers = [t for (cid, _), t in self.trackers.items() if cid == camera_id]
        active_tids = {int(t["track_id"]) for t in tracks if "track_id" in t}

        for trk in tracks:
            tid = int(trk["track_id"])
            cname = trk.get("class_name", "person")
            centroid = trk.get("centroid", (0.0, 0.0))
            direction = trk.get("direction", "UNKNOWN")
            speed = float(trk.get("speed", 0.0))

            for tracker in cam_trackers:
                ev = tracker.process_track(tid, cname, centroid, direction, speed, timestamp)
                if ev:
                    events.append(ev)

        for tracker in cam_trackers:
            vanished_exits = tracker.cleanup_missing_tracks(active_tids, timestamp)
            events.extend(vanished_exits)

        return events

    def get_zone_stats(self, camera_id: str, zone_id: str) -> Optional[Dict[str, Any]]:
        tracker = self.trackers.get((camera_id, zone_id))
        return tracker.get_stats() if tracker else None

    def get_all_stats(self) -> List[Dict[str, Any]]:
        return [tracker.get_stats() for tracker in self.trackers.values()]
