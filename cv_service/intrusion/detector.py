"""
SEEMADRISHTI AI - Intrusion Detector Module (Phase 4)

Stateful virtual perimeter crossing detection engine.
Maintains state per (camera_id, track_id, zone_id) and fires alerts
ONLY upon genuine OUTSIDE -> INSIDE state transitions.
Includes duplicate alert gating while targets linger within zones,
and handles EXIT and subsequent re-entry events.
"""

import time
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict

import requests

from cv_service.geometry.polygon import PolygonZone, calculate_centroid

logger = logging.getLogger("IntrusionDetector")


@dataclass
class IntrusionEvent:
    event_id: str
    alert_id: str
    camera_id: str
    zone_id: str
    zone_name: str
    track_id: int
    class_name: str
    confidence: float
    direction: str  # 'ENTERING' or 'EXITING'
    position: Tuple[float, float]  # (cx, cy)
    timestamp: str
    severity: str = "High"  # Stored as 'High' in SQLite (CRITICAL display level)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["position"] = {"x": round(self.position[0], 1), "y": round(self.position[1], 1)}
        return d


class TrackZoneState:
    """Maintains state for an individual track against a specific zone."""

    def __init__(self, camera_id: str, track_id: int, zone_id: str, initial_inside: bool, initial_pos: Tuple[float, float]):
        self.camera_id = camera_id
        self.track_id = track_id
        self.zone_id = zone_id
        self.previous_inside = initial_inside
        self.current_inside = initial_inside
        self.previous_position: Tuple[float, float] = initial_pos
        self.current_position: Tuple[float, float] = initial_pos
        # If object is initialized already inside zone without an observed crossing, mark alerted=True to prevent false positives
        self.alerted = initial_inside
        self.first_entered_time = time.time() if initial_inside else 0.0
        self.entry_count = 1 if initial_inside else 0
        self.last_update_time = time.time()

    def update(self, is_inside: bool, position: Tuple[float, float]):
        self.previous_inside = self.current_inside
        self.previous_position = self.current_position
        self.current_inside = is_inside
        self.current_position = position
        self.last_update_time = time.time()


class IntrusionDetector:
    """
    Intrusion detection engine for multi-camera CCTV perimeter surveillance.
    """

    def __init__(self, api_base_url: str = "http://127.0.0.1:8000/api"):
        self.api_base_url = api_base_url
        self.zones: Dict[str, PolygonZone] = {}  # zone_id -> PolygonZone
        # State key: (camera_id, track_id, zone_id)
        self.track_states: Dict[Tuple[str, int, str], TrackZoneState] = {}

    def add_zone(self, zone: PolygonZone):
        self.zones[zone.zone_id] = zone

    def clear_zones(self, camera_id: Optional[str] = None):
        if camera_id:
            to_remove = [zid for zid, z in self.zones.items() if z.camera_id == camera_id]
            for zid in to_remove:
                del self.zones[zid]
        else:
            self.zones.clear()

    def load_zones_from_backend(self, camera_id: str) -> int:
        """
        Fetches active zones for camera_id from the backend REST API.
        """
        try:
            url = f"{self.api_base_url}/zones?camera_id={camera_id}"
            resp = requests.get(url, timeout=3.0)
            if resp.status_code == 200:
                body = resp.json()
                if body.get("success") and "data" in body:
                    self.clear_zones(camera_id)
                    for item in body["data"]:
                        if item.get("enabled", True):
                            zone = PolygonZone(
                                zone_id=item["id"],
                                camera_id=item["camera_id"],
                                name=item["name"],
                                polygon=item["polygon"],
                                enabled=item.get("enabled", True),
                            )
                            self.add_zone(zone)
                    return len([z for z in self.zones.values() if z.camera_id == camera_id])
        except Exception as e:
            logger.warning(f"Could not load zones from backend: {e}")
        return 0

    def reset(self):
        """Clears all tracking states across all cameras."""
        self.track_states.clear()

    def process_tracks(
        self,
        tracks: List[Dict[str, Any]],
        camera_id: str,
        frame_width: int,
        frame_height: int,
        timestamp: Optional[str] = None,
        publisher: Optional[Any] = None,
    ) -> Tuple[List[IntrusionEvent], float]:
        """
        Evaluates active tracks against all configured zones for camera_id.
        Returns:
            (events_created, geometry_latency_ms)
        """
        start_time = time.perf_counter()
        events_generated: List[IntrusionEvent] = []
        now_ts = timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        active_camera_zones = [
            z for z in self.zones.values()
            if z.camera_id == camera_id and z.enabled
        ]

        if not active_camera_zones:
            geom_ms = (time.perf_counter() - start_time) * 1000.0
            return events_generated, geom_ms

        active_track_ids = set()

        for trk in tracks:
            tid = trk["track_id"]
            active_track_ids.add(tid)
            bbox = trk["bbox"]
            cx, cy = calculate_centroid(bbox)
            class_name = trk.get("class_name", "target")
            confidence = trk.get("confidence", 0.9)

            for zone in active_camera_zones:
                state_key = (camera_id, tid, zone.zone_id)
                is_inside = zone.is_inside((cx, cy), frame_width, frame_height)

                if state_key not in self.track_states:
                    # Target newly observed
                    state = TrackZoneState(
                        camera_id=camera_id,
                        track_id=tid,
                        zone_id=zone.zone_id,
                        initial_inside=is_inside,
                        initial_pos=(cx, cy),
                    )
                    self.track_states[state_key] = state

                    # If starting outside, nothing more to do this frame
                    # If starting already inside, alerted was set to True to prevent a false-positive on appearance
                    continue

                state = self.track_states[state_key]
                state.update(is_inside, (cx, cy))

                # CHECK FOR CROSSING TRANSITION
                # -------------------------------------------------------------
                # 1. OUTSIDE -> INSIDE (Intrusion Crossing!)
                # -------------------------------------------------------------
                if not state.previous_inside and state.current_inside:
                    state.entry_count += 1
                    event_id = f"evt-{int(time.time() * 1000)}"
                    alert_id = f"alt-{int(time.time() * 1000)}"

                    event = IntrusionEvent(
                        event_id=event_id,
                        alert_id=alert_id,
                        camera_id=camera_id,
                        zone_id=zone.zone_id,
                        zone_name=zone.name,
                        track_id=tid,
                        class_name=class_name,
                        confidence=confidence,
                        direction="ENTERING",
                        position=(cx, cy),
                        timestamp=now_ts,
                        severity="High",
                    )

                    if not state.alerted:
                        state.alerted = True
                        events_generated.append(event)

                        # Structured CLI output
                        print(f"\n[INTRUSION]")
                        print(f"Camera:    {camera_id}")
                        print(f"Track:     #{tid} ({class_name})")
                        print(f"Zone:      {zone.name}")
                        print(f"Direction: ENTERING")
                        print(f"Position:  ({cx:.1f}, {cy:.1f})")
                        print(f"Timestamp: {now_ts}\n")

                        # Dispatch to SQLite and WebSocket
                        self._persist_and_publish(event, publisher)

                # -------------------------------------------------------------
                # 2. INSIDE -> INSIDE (Linger / Dwell)
                # -------------------------------------------------------------
                elif state.previous_inside and state.current_inside:
                    # Object is already inside. Do NOT generate duplicate alerts.
                    pass

                # -------------------------------------------------------------
                # 3. INSIDE -> OUTSIDE (Exit Zone)
                # -------------------------------------------------------------
                elif state.previous_inside and not state.current_inside:
                    # Object has exited the zone. Record EXIT event and reset alerted flag for re-entry
                    exit_event = IntrusionEvent(
                        event_id=f"evt-{int(time.time() * 1000)}",
                        alert_id="",
                        camera_id=camera_id,
                        zone_id=zone.zone_id,
                        zone_name=zone.name,
                        track_id=tid,
                        class_name=class_name,
                        confidence=confidence,
                        direction="EXITING",
                        position=(cx, cy),
                        timestamp=now_ts,
                        severity="Low",
                    )
                    state.alerted = False  # Reset so subsequent re-entry will alert!
                    events_generated.append(exit_event)

                # -------------------------------------------------------------
                # 4. OUTSIDE -> OUTSIDE
                # -------------------------------------------------------------
                else:
                    # Normal motion outside zone
                    pass

        # Cleanup tracks no longer active
        expired_keys = [
            k for k in self.track_states.keys()
            if k[0] == camera_id and k[1] not in active_track_ids and (time.time() - self.track_states[k].last_update_time > 5.0)
        ]
        for k in expired_keys:
            del self.track_states[k]

        geom_ms = (time.perf_counter() - start_time) * 1000.0
        return events_generated, geom_ms

    def _persist_and_publish(self, event: IntrusionEvent, publisher: Optional[Any] = None):
        """
        Persists intrusion event and tactical alert into SQLite via REST API,
        and broadcasts over WebSocket gateway.
        """
        event_payload = {
            "id": event.event_id,
            "camera_id": event.camera_id,
            "event_type": "INTRUSION",
            "severity": event.severity,
            "object_id": str(event.track_id),
            "timestamp": event.timestamp,
            "metadata": {
                "zone_id": event.zone_id,
                "zone_name": event.zone_name,
                "direction": event.direction,
                "class_name": event.class_name,
                "confidence": event.confidence,
                "position": {"x": round(event.position[0], 1), "y": round(event.position[1], 1)},
            },
        }

        alert_payload = {
            "id": event.alert_id,
            "event_id": event.event_id,
            "camera_id": event.camera_id,
            "severity": event.severity,
            "title": "Unauthorized Zone Entry",
            "reason": f"Track #{event.track_id} ({event.class_name}) crossed into {event.zone_name}",
            "timestamp": event.timestamp,
        }

        # 1. Post to REST API (persists in SQLite)
        try:
            requests.post(f"{self.api_base_url}/events", json=event_payload, timeout=2.0)
            requests.post(f"{self.api_base_url}/alerts", json=alert_payload, timeout=2.0)
        except Exception as e:
            logger.debug(f"REST persistence error (server may be offline): {e}")

        # 2. Publish directly via WebSocket publisher if available
        if publisher and publisher.is_connected:
            try:
                publisher.publish(event_payload, message_type="event_created")
                publisher.publish(alert_payload, message_type="alert_created")
            except Exception as e:
                logger.debug(f"WS publisher error: {e}")
