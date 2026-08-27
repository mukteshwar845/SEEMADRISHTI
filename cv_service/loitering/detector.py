"""
SEEMADRISHTI AI - Real-Time Loitering & Abnormal Dwell-Time Detection (Phase 5)

Team: IQ100
SIH Problem: SIH26187

Detects whether a tracked person remains within a monitored zone for longer than a configurable dwell-time threshold.
Uses:
- YOLO detections
- ByteTrack persistent track_ids
- Actual bounding boxes & centroids
- Existing PolygonZone membership
- Monotonic timing with grace period track-loss handling
- Strict anti-duplicate alert gating (exactly ONE alert at threshold)
"""

import time
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict

import requests

from cv_service.geometry.polygon import PolygonZone, calculate_centroid

logger = logging.getLogger("LoiteringDetector")


@dataclass
class LoiteringEvent:
    event_id: str
    alert_id: str
    camera_id: str
    zone_id: str
    zone_name: str
    track_id: int
    class_name: str
    dwell_seconds: float
    threshold_seconds: float
    position: Tuple[float, float]
    timestamp: str
    severity: str = "High"

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["position"] = {"x": round(self.position[0], 1), "y": round(self.position[1], 1)}
        d["dwell_seconds"] = round(self.dwell_seconds, 1)
        return d


class LoiteringTrackState:
    """Maintains dwell timing and membership state for an individual track against a zone."""

    def __init__(
        self,
        camera_id: str,
        track_id: int,
        zone_id: str,
        class_name: str,
        initial_inside: bool,
        initial_pos: Tuple[float, float],
        start_time: float,
    ):
        self.camera_id = camera_id
        self.track_id = track_id
        self.zone_id = zone_id
        self.class_name = class_name

        self.inside = initial_inside
        self.current_position = initial_pos
        self.centroid_history: List[Tuple[float, float]] = [initial_pos]

        # Timing
        self.entered_at: Optional[float] = start_time if initial_inside else None
        self.last_seen_at: float = start_time
        self.dwell_seconds: float = 0.0

        # Alert gating: true once threshold alert is emitted
        self.loitering_alerted: bool = False

    def update_position(self, pos: Tuple[float, float], now: float, max_history: int = 50) -> None:
        self.current_position = pos
        self.last_seen_at = now
        self.centroid_history.append(pos)
        if len(self.centroid_history) > max_history:
            self.centroid_history.pop(0)


class LoiteringDetector:
    """
    Real-Time Loitering & Abnormal Dwell-Time Detection Engine.
    Tracks dwell duration of persistent targets within configured PolygonZones.
    """

    def __init__(
        self,
        threshold_seconds: float = 30.0,
        grace_period_seconds: float = 2.0,
        target_classes: Optional[List[str]] = None,
        api_base_url: str = "http://127.0.0.1:8000/api",
        history_limit: int = 50,
    ):
        self.threshold_seconds: float = float(threshold_seconds)
        self.grace_period_seconds: float = float(grace_period_seconds)
        self.target_classes: List[str] = [c.lower() for c in (target_classes or ["person"])]
        self.api_base_url: str = api_base_url
        self.history_limit: int = history_limit

        # Configured zones: zone_id -> PolygonZone
        self.zones: Dict[str, PolygonZone] = {}

        # Active track states: (camera_id, track_id, zone_id) -> LoiteringTrackState
        self.track_states: Dict[Tuple[str, int, str], LoiteringTrackState] = {}

    def register_zone(self, zone: PolygonZone) -> None:
        self.zones[zone.zone_id] = zone
        logger.info(f"Registered zone '{zone.name}' ({zone.zone_id}) with {len(zone.raw_polygon)} points")

    def load_zones_from_backend(self, camera_id: str) -> int:
        """Fetch active zones for this camera from the backend REST API."""
        try:
            url = f"{self.api_base_url}/zones?camera_id={camera_id}"
            resp = requests.get(url, timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                zones_data = data.get("data", [])
                loaded_count = 0
                for z in zones_data:
                    if z.get("enabled", True) and len(z.get("polygon", [])) >= 3:
                        poly_zone = PolygonZone(
                            zone_id=z["id"],
                            name=z.get("name", z["id"]),
                            raw_polygon=z["polygon"],
                            camera_id=z.get("camera_id", camera_id),
                        )
                        self.register_zone(poly_zone)
                        loaded_count += 1
                logger.info(f"Loaded {loaded_count} active zone(s) from backend for {camera_id}")
                return loaded_count
        except Exception as e:
            logger.warning(f"Could not load zones from backend: {e}")
        return 0

    def process_tracks(
        self,
        tracks: List[Dict[str, Any]],
        camera_id: str,
        frame_width: int,
        frame_height: int,
        current_time: Optional[float] = None,
        publisher: Optional[Any] = None,
    ) -> Tuple[List[LoiteringEvent], float]:
        """
        Process tracks for a given frame and update dwell-time accumulation.

        Returns:
            Tuple[List[LoiteringEvent], float]: Generated loitering events and execution time in ms.
        """
        t0 = time.perf_counter()
        now = current_time if current_time is not None else time.monotonic()
        events: List[LoiteringEvent] = []

        seen_keys_this_frame = set()

        for track in tracks:
            tid = track["track_id"]
            cname = track.get("class_name", "person").lower()
            bbox = track["bbox"]
            cx, cy = calculate_centroid(bbox)

            for zone_id, zone in self.zones.items():
                if zone.camera_id and zone.camera_id.lower() != camera_id.lower():
                    continue

                state_key = (camera_id, tid, zone_id)
                seen_keys_this_frame.add(state_key)

                is_inside = zone.is_inside((cx, cy), frame_width, frame_height)

                if state_key not in self.track_states:
                    # Brand new observation for this track and zone
                    state = LoiteringTrackState(
                        camera_id=camera_id,
                        track_id=tid,
                        zone_id=zone_id,
                        class_name=cname,
                        initial_inside=is_inside,
                        initial_pos=(cx, cy),
                        start_time=now,
                    )
                    self.track_states[state_key] = state

                    # If starting inside, entered_at is already set to now
                    if is_inside:
                        state.dwell_seconds = 0.0
                    continue

                state = self.track_states[state_key]
                state.update_position((cx, cy), now, max_history=self.history_limit)

                # State Transitions:
                if not state.inside and is_inside:
                    # OUTSIDE ➔ INSIDE: Start Dwell Session
                    state.inside = True
                    state.entered_at = now
                    state.dwell_seconds = 0.0
                    state.loitering_alerted = False

                elif state.inside and is_inside:
                    # INSIDE ➔ INSIDE: Continue Dwell
                    if state.entered_at is not None:
                        state.dwell_seconds = now - state.entered_at

                    # Check Loitering Threshold Trigger
                    # Trigger ONLY when:
                    # 1. target class matches configured target classes (e.g. 'person')
                    # 2. dwell_seconds >= threshold_seconds
                    # 3. loitering_alerted is False (strictly ONE alert)
                    if (
                        cname in self.target_classes
                        and state.dwell_seconds >= self.threshold_seconds
                        and not state.loitering_alerted
                    ):
                        state.loitering_alerted = True
                        event = self._create_loitering_event(
                            camera_id=camera_id,
                            zone=zone,
                            track_id=tid,
                            class_name=cname,
                            dwell_seconds=state.dwell_seconds,
                            position=(cx, cy),
                            now=now,
                        )
                        events.append(event)
                        self._log_loitering_event(event)
                        self._persist_and_publish(event, publisher)

                elif state.inside and not is_inside:
                    # INSIDE ➔ OUTSIDE: Exit Zone
                    state.inside = False
                    state.entered_at = None
                    state.dwell_seconds = 0.0
                    state.loitering_alerted = False

        # Track Loss / Grace Period Handling
        # Inspect existing states that were NOT seen in this frame
        keys_to_purge = []
        for state_key, state in self.track_states.items():
            cam, tid, zid = state_key
            if cam.lower() != camera_id.lower():
                continue

            if state_key not in seen_keys_this_frame:
                time_unseen = now - state.last_seen_at
                if time_unseen > self.grace_period_seconds:
                    # Track lost beyond grace period: reset/purge dwell session
                    if state.inside:
                        state.inside = False
                        state.entered_at = None
                        state.dwell_seconds = 0.0
                        state.loitering_alerted = False
                    keys_to_purge.append(state_key)

        for k in keys_to_purge:
            del self.track_states[k]

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return events, elapsed_ms

    def _create_loitering_event(
        self,
        camera_id: str,
        zone: PolygonZone,
        track_id: int,
        class_name: str,
        dwell_seconds: float,
        position: Tuple[float, float],
        now: float,
    ) -> LoiteringEvent:
        ts_int = int(time.time() * 1000)
        iso_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return LoiteringEvent(
            event_id=f"evt-loiter-{ts_int}",
            alert_id=f"alt-loiter-{ts_int}",
            camera_id=camera_id,
            zone_id=zone.zone_id,
            zone_name=zone.name,
            track_id=track_id,
            class_name=class_name,
            dwell_seconds=dwell_seconds,
            threshold_seconds=self.threshold_seconds,
            position=position,
            timestamp=iso_time,
            severity="High",
        )

    def _log_loitering_event(self, event: LoiteringEvent) -> None:
        """Structured console logging when loitering threshold is breached."""
        print(f"\n[LOITERING]")
        print(f"Camera:    {event.camera_id}")
        print(f"Track:     #{event.track_id} ({event.class_name})")
        print(f"Zone:      {event.zone_name}")
        print(f"Dwell:     {event.dwell_seconds:.1f}s")
        print(f"Threshold: {event.threshold_seconds:.0f}s")
        print(f"Timestamp: {event.timestamp}\n")

    def _persist_and_publish(self, event: LoiteringEvent, publisher: Optional[Any]) -> None:
        """Persists loitering event and alert to SQLite via REST, and publishes via WebSocket."""
        event_payload = {
            "id": event.event_id,
            "camera_id": event.camera_id,
            "event_type": "LOITERING",
            "severity": event.severity,
            "object_id": str(event.track_id),
            "timestamp": event.timestamp,
            "metadata": {
                "zone_id": event.zone_id,
                "zone_name": event.zone_name,
                "class_name": event.class_name,
                "dwell_seconds": round(event.dwell_seconds, 1),
                "threshold_seconds": event.threshold_seconds,
                "position": {"x": round(event.position[0], 1), "y": round(event.position[1], 1)},
            },
        }

        alert_payload = {
            "id": event.alert_id,
            "event_id": event.event_id,
            "camera_id": event.camera_id,
            "severity": event.severity,
            "title": "Loitering Detected",
            "reason": f"Track #{event.track_id} ({event.class_name}) remained inside {event.zone_name} for {event.dwell_seconds:.1f} seconds",
            "acknowledged": False,
            "timestamp": event.timestamp,
        }

        # 1. Persist to SQLite REST Backend
        try:
            requests.post(f"{self.api_base_url}/events", json=event_payload, timeout=2.0)
            requests.post(f"{self.api_base_url}/alerts", json=alert_payload, timeout=2.0)
        except Exception as e:
            logger.debug(f"REST persistence error (server may be offline): {e}")

        # 2. Publish directly via WebSocket publisher if available
        is_conn = getattr(publisher, "is_connected", False) or getattr(publisher, "_connected", False)
        if publisher and is_conn:
            try:
                publisher.publish(event_payload, message_type="event_created")
                publisher.publish(alert_payload, message_type="alert_created")
            except Exception as e:
                logger.debug(f"WS publisher error: {e}")
