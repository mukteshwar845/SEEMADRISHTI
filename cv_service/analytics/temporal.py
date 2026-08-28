"""
SEEMADRISHTI AI - Temporal Analytics Aggregator (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Aggregates surveillance movement statistics into configurable temporal windows
(1-minute, 5-minute, 15-minute, and 1-hour intervals).
"""

import time
from typing import Any, Dict, List, Optional


class TemporalBucket:
    """
    Holds aggregated movement telemetry for a discrete time window.
    """

    def __init__(self, camera_id: str, bucket_start: float, duration_seconds: float):
        self.camera_id: str = camera_id
        self.bucket_start: float = float(bucket_start)
        self.duration_seconds: float = float(duration_seconds)
        self.bucket_end: float = self.bucket_start + self.duration_seconds

        self.entries: int = 0
        self.exits: int = 0
        self.person_tracks: set = set()
        self.vehicle_tracks: set = set()
        self.speeds: List[float] = []
        self.peak_occupancy: int = 0
        self.intrusion_count: int = 0
        self.loitering_count: int = 0
        self.night_movement_count: int = 0

    def ingest_event(self, event_type: str, class_name: str = "person", count: int = 1):
        cname = class_name.lower()
        evt = event_type.upper()
        if evt == "ENTRY":
            self.entries += count
        elif evt == "EXIT":
            self.exits += count
        elif evt == "INTRUSION":
            self.intrusion_count += count
        elif evt == "LOITERING":
            self.loitering_count += count
        elif evt == "NIGHT_MOVEMENT":
            self.night_movement_count += count

    def record_track_observation(self, track_id: int, class_name: str, speed: float = 0.0):
        cname = class_name.lower()
        if cname == "person":
            self.person_tracks.add(track_id)
        elif cname in ("car", "truck", "bus", "motorcycle", "vehicle"):
            self.vehicle_tracks.add(track_id)

        if speed > 0.0:
            self.speeds.append(speed)

    def record_occupancy(self, current_occupants: int):
        if current_occupants > self.peak_occupancy:
            self.peak_occupancy = current_occupants

    @property
    def average_speed(self) -> float:
        if not self.speeds:
            return 0.0
        return round(sum(self.speeds) / len(self.speeds), 2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "bucket_start": self.bucket_start,
            "bucket_end": self.bucket_end,
            "duration_seconds": self.duration_seconds,
            "entries": self.entries,
            "exits": self.exits,
            "person_count": len(self.person_tracks),
            "vehicle_count": len(self.vehicle_tracks),
            "total_unique_tracks": len(self.person_tracks | self.vehicle_tracks),
            "average_speed": self.average_speed,
            "peak_occupancy": self.peak_occupancy,
            "intrusion_count": self.intrusion_count,
            "loitering_count": self.loitering_count,
            "night_movement_count": self.night_movement_count,
        }


class TemporalAggregator:
    """
    Manages temporal aggregations across multiple time scales.
    """

    INTERVALS = {
        "1m": 60.0,
        "5m": 300.0,
        "15m": 900.0,
        "1h": 3600.0,
    }

    def __init__(self, max_buckets_per_interval: int = 120):
        self.max_buckets_per_interval: int = max_buckets_per_interval
        # Key: (camera_id, interval_name) -> List[TemporalBucket]
        self.storage: Dict[Tuple[str, str], List[TemporalBucket]] = {}

    def get_or_create_current_bucket(
        self, camera_id: str, interval: str, timestamp: Optional[float] = None
    ) -> TemporalBucket:
        now = float(timestamp) if timestamp is not None else time.time()
        duration = self.INTERVALS.get(interval, 60.0)
        bucket_start = (now // duration) * duration

        key = (camera_id, interval)
        if key not in self.storage:
            self.storage[key] = []

        buckets = self.storage[key]
        if not buckets or buckets[-1].bucket_start != bucket_start:
            new_bucket = TemporalBucket(camera_id, bucket_start, duration)
            buckets.append(new_bucket)
            if len(buckets) > self.max_buckets_per_interval:
                buckets.pop(0)
            return new_bucket

        return buckets[-1]

    def record_event(
        self,
        camera_id: str,
        event_type: str,
        class_name: str = "person",
        count: int = 1,
        timestamp: Optional[float] = None,
    ):
        for interval in self.INTERVALS:
            bucket = self.get_or_create_current_bucket(camera_id, interval, timestamp)
            bucket.ingest_event(event_type, class_name, count)

    def record_tracks_and_occupancy(
        self,
        camera_id: str,
        tracks: List[Dict[str, Any]],
        occupancy: int,
        timestamp: Optional[float] = None,
    ):
        for interval in self.INTERVALS:
            bucket = self.get_or_create_current_bucket(camera_id, interval, timestamp)
            for trk in tracks:
                bucket.record_track_observation(
                    track_id=int(trk.get("track_id", 0)),
                    class_name=trk.get("class_name", "person"),
                    speed=float(trk.get("speed", 0.0)),
                )
            bucket.record_occupancy(occupancy)

    def get_buckets(
        self,
        camera_id: str,
        interval: str = "1m",
        from_ts: Optional[float] = None,
        to_ts: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        key = (camera_id, interval)
        buckets = self.storage.get(key, [])
        filtered = buckets
        if from_ts is not None:
            filtered = [b for b in filtered if b.bucket_end >= from_ts]
        if to_ts is not None:
            filtered = [b for b in filtered if b.bucket_start <= to_ts]
        return [b.to_dict() for b in filtered]
