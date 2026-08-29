"""
SEEMADRISHTI AI - Stateful Intrusion, Restricted Zone & Tripwire Crossing Engine (Phase 4, 16 & 17)

Provides real-time spatial zone intrusion detection and tripwire crossing verification:
1. RESTRICTED_ZONE_ENTRY: Fires when tracked object transitions OUTSIDE -> INSIDE a polygonal zone.
   - Gated by state transition to prevent repeated alerts while lingering.
   - Re-entry after zone exit fires a new event.
2. TRIPWIRE_CROSSING: Fires when tracked object centroid trajectory intersects a tripwire segment.
   - Calculates deterministic 'IN' vs 'OUT' crossing direction based on segment normal.
   - Gated by track crossing cooldown to prevent multi-triggering.
3. Full metadata preservation: camera ID, track ID, class, confidence, coordinates, direction,
   frame sequence ID, and risk score integration.
"""

import os
import time
import json
import logging
from typing import Dict, List, Tuple, Optional, Any, Set
from dataclasses import dataclass, asdict

import requests

from cv_service.geometry.polygon import PolygonZone, calculate_centroid

logger = logging.getLogger("IntrusionDetector")


@dataclass
class IntrusionEvent:
    camera_id: str
    zone_id: str
    zone_name: str
    track_id: int
    class_name: str
    position: Tuple[float, float]  # (cx, cy)
    direction: str = "ENTERING"  # 'ENTERING', 'EXITING', 'IN', 'OUT', 'CROSSING'
    confidence: float = 0.9
    event_id: str = ""
    alert_id: str = ""
    timestamp: str = ""
    severity: str = "High"  # Stored as 'High' in SQLite (CRITICAL display level)
    event_type: str = "RESTRICTED_ZONE_ENTRY"  # 'RESTRICTED_ZONE_ENTRY', 'TRIPWIRE_CROSSING', 'RESTRICTED_ZONE_EXIT'
    prev_position: Optional[Tuple[float, float]] = None
    frame_id: Optional[int] = None
    risk_score: Optional[float] = None

    def __post_init__(self):
        if not self.event_id:
            self.event_id = f"EV-{int(time.time() * 1000)}"
        if not self.alert_id:
            self.alert_id = f"ALT-{int(time.time() * 1000)}"
        if not self.timestamp:
            self.timestamp = str(time.time())

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["position"] = {"x": round(self.position[0], 1), "y": round(self.position[1], 1)}
        d["centroid"] = d["position"]
        if self.prev_position:
            d["prev_position"] = {"x": round(self.prev_position[0], 1), "y": round(self.prev_position[1], 1)}
        else:
            d["prev_position"] = None
        return d


class TrackZoneState:
    """Maintains state for an individual track against a specific zone."""

    def __init__(self, camera_id: str, track_id: int, zone_id: str, initial_inside: bool, initial_pos: Tuple[float, float]):
        self.camera_id = str(camera_id).lower().strip()
        self.track_id = int(track_id)
        self.zone_id = str(zone_id)
        self.previous_inside = initial_inside
        self.current_inside = initial_inside
        self.previous_position: Tuple[float, float] = initial_pos
        self.current_position: Tuple[float, float] = initial_pos
        # If object is initialized already inside zone without an observed crossing, mark alerted=True to prevent false positives
        self.alerted = initial_inside
        self.first_entered_time = time.time() if initial_inside else 0.0
        self.entry_count = 1 if initial_inside else 0
        self.last_crossing_time: float = 0.0
        self.last_crossing_direction: str = ""
        self.last_update_time = time.time()

    def update(self, is_inside: bool, position: Tuple[float, float]):
        self.previous_inside = self.current_inside
        self.previous_position = self.current_position
        self.current_inside = is_inside
        self.current_position = position
        self.last_update_time = time.time()


class IntrusionDetector:
    """
    Intrusion & Line Crossing detection engine for multi-camera CCTV perimeter surveillance.
    Supports virtual polygons and virtual tripwires with real tracking coordinates.
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
            cam_norm = str(camera_id).lower().strip()
            to_remove = [zid for zid, z in self.zones.items() if z.camera_id.lower().strip() == cam_norm]
            for zid in to_remove:
                del self.zones[zid]
        else:
            self.zones.clear()

    def load_zones_from_backend(self, camera_id: str) -> int:
        """
        Fetches active zones for camera_id from the backend REST API.
        Falls back to config/camera_zones.json if backend is offline or empty.
        """
        cam_norm = str(camera_id).lower().strip()
        # 1. Try Backend REST API
        try:
            url = f"{self.api_base_url}/zones?camera_id={cam_norm}"
            resp = requests.get(url, timeout=2.0)
            if resp.status_code == 200:
                body = resp.json()
                if body.get("success") and "data" in body and len(body["data"]) > 0:
                    self.clear_zones(cam_norm)
                    for item in body["data"]:
                        if item.get("enabled", True):
                            zone = PolygonZone(
                                zone_id=item["id"],
                                camera_id=item.get("camera_id", cam_norm),
                                name=item["name"],
                                polygon=item["polygon"],
                                enabled=item.get("enabled", True),
                                zone_type=item.get("zone_type", "RESTRICTED_ZONE"),
                            )
                            self.add_zone(zone)
                    count = len([z for z in self.zones.values() if z.camera_id.lower().strip() == cam_norm])
                    if count > 0:
                        return count
        except Exception as e:
            logger.debug(f"Could not load zones from backend: {e}")

        # 2. Fallback to config/camera_zones.json
        try:
            cfg_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "config", "camera_zones.json")
            )
            if os.path.isfile(cfg_path):
                with open(cfg_path, "r", encoding="utf-8") as f:
                    cfg_data = json.load(f)
                cam_zones = cfg_data.get(cam_norm) or cfg_data.get(camera_id)
                if cam_zones:
                    self.clear_zones(cam_norm)
                    for item in cam_zones:
                        if item.get("enabled", True):
                            zone = PolygonZone(
                                zone_id=item["id"],
                                camera_id=cam_norm,
                                name=item["name"],
                                polygon=item["polygon"],
                                enabled=item.get("enabled", True),
                                zone_type=item.get("zone_type", "RESTRICTED_ZONE"),
                            )
                            self.add_zone(zone)
                    return len([z for z in self.zones.values() if z.camera_id.lower().strip() == cam_norm])
        except Exception as e:
            logger.debug(f"Could not load zones from camera_zones.json: {e}")

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
        frame_id: Optional[int] = None,
        risk_score: Optional[int] = None,
    ) -> Tuple[List[IntrusionEvent], float]:
        """
        Evaluates active tracks against all configured zones for camera_id.
        Detects both polygonal RESTRICTED_ZONE_ENTRY (with dwell deduplication)
        and virtual line TRIPWIRE_CROSSING (with direction calculation).
        
        Returns:
            (events_created, geometry_latency_ms)
        """
        start_time = time.perf_counter()
        events_generated: List[IntrusionEvent] = []
        now_ts = timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        cam_norm = str(camera_id).lower().strip()

        active_camera_zones = [
            z for z in self.zones.values()
            if (not z.camera_id or z.camera_id.lower().strip() in (cam_norm, "*", "all", "cam-01" if not cam_norm else "")) and z.enabled
        ]

        if not active_camera_zones:
            geom_ms = (time.perf_counter() - start_time) * 1000.0
            return events_generated, geom_ms

        active_track_ids: Set[int] = set()
        now_epoch = time.time()

        for trk in tracks:
            tid = int(trk["track_id"])
            active_track_ids.add(tid)
            bbox = trk["bbox"]
            cx, cy = calculate_centroid(bbox)
            class_name = trk.get("class_name", "target")
            confidence = trk.get("confidence", 0.9)
            trk_frame_id = trk.get("frame_id", frame_id)
            trk_risk = trk.get("risk_score", risk_score)

            for zone in active_camera_zones:
                state_key = (cam_norm, tid, zone.zone_id)
                is_inside = zone.is_inside((cx, cy), frame_width, frame_height)

                if state_key not in self.track_states:
                    # Target newly observed
                    state = TrackZoneState(
                        camera_id=cam_norm,
                        track_id=tid,
                        zone_id=zone.zone_id,
                        initial_inside=is_inside,
                        initial_pos=(cx, cy),
                    )
                    self.track_states[state_key] = state
                    continue

                state = self.track_states[state_key]
                prev_pos = state.current_position
                curr_pos = (cx, cy)
                state.update(is_inside, curr_pos)

                is_tripwire = getattr(zone, "is_tripwire", False) or len(zone.raw_polygon) == 2 or zone.zone_type == "TRIPWIRE"

                # -------------------------------------------------------------
                # CASE A: VIRTUAL TRIPWIRE LINE CROSSING
                # -------------------------------------------------------------
                if is_tripwire:
                    crossed = zone.test_crossing(prev_pos, curr_pos, frame_width, frame_height)
                    if crossed:
                        direction = zone.get_crossing_direction(prev_pos, curr_pos, frame_width, frame_height)
                        time_since_last_cross = now_epoch - state.last_crossing_time

                        # Cooldown deduplication (2.5s window)
                        if time_since_last_cross > 2.5:
                            state.last_crossing_time = now_epoch
                            state.last_crossing_direction = direction
                            state.entry_count += 1
                            
                            event_id = f"evt-{int(now_epoch * 1000)}"
                            alert_id = f"alt-{int(now_epoch * 1000)}"

                            event = IntrusionEvent(
                                event_id=event_id,
                                alert_id=alert_id,
                                camera_id=cam_norm,
                                zone_id=zone.zone_id,
                                zone_name=zone.name,
                                track_id=tid,
                                class_name=class_name,
                                confidence=confidence,
                                direction=direction,
                                position=curr_pos,
                                prev_position=prev_pos,
                                timestamp=now_ts,
                                severity="High",
                                event_type="TRIPWIRE_CROSSING",
                                frame_id=trk_frame_id,
                                risk_score=trk_risk,
                            )
                            events_generated.append(event)

                            # Structured CLI logging
                            print(f"\n[TRIPWIRE CROSSING / BREACH]")
                            print(f"Camera:    {cam_norm}")
                            print(f"Track:     #{tid} ({class_name})")
                            print(f"Tripwire:  {zone.name}")
                            print(f"Direction: {direction}")
                            print(f"From:      ({prev_pos[0]:.1f}, {prev_pos[1]:.1f}) -> To: ({curr_pos[0]:.1f}, {curr_pos[1]:.1f})")
                            print(f"Timestamp: {now_ts}\n")

                            self._persist_and_publish(event, publisher)

                # -------------------------------------------------------------
                # CASE B: POLYGONAL RESTRICTED ZONE INTRUSION
                # -------------------------------------------------------------
                else:
                    # 1. OUTSIDE -> INSIDE (Restricted Zone Entry!)
                    if not state.previous_inside and state.current_inside:
                        state.entry_count += 1
                        event_id = f"evt-{int(now_epoch * 1000)}"
                        alert_id = f"alt-{int(now_epoch * 1000)}"

                        event = IntrusionEvent(
                            event_id=event_id,
                            alert_id=alert_id,
                            camera_id=cam_norm,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            track_id=tid,
                            class_name=class_name,
                            confidence=confidence,
                            direction="ENTERING",
                            position=curr_pos,
                            prev_position=prev_pos,
                            timestamp=now_ts,
                            severity="High",
                            event_type="RESTRICTED_ZONE_ENTRY",
                            frame_id=trk_frame_id,
                            risk_score=trk_risk,
                        )

                        if not state.alerted:
                            state.alerted = True
                            events_generated.append(event)

                            print(f"\n[RESTRICTED ZONE ENTRY / PERIMETER BREACH]")
                            print(f"Camera:    {cam_norm}")
                            print(f"Track:     #{tid} ({class_name})")
                            print(f"Zone:      {zone.name}")
                            print(f"Direction: ENTERING")
                            print(f"Position:  ({cx:.1f}, {cy:.1f})")
                            print(f"Timestamp: {now_ts}\n")

                            self._persist_and_publish(event, publisher)

                    # 2. INSIDE -> INSIDE (Linger / Dwell - Suppressed)
                    elif state.previous_inside and state.current_inside:
                        # Target remains inside zone. Zero repeated alerts.
                        pass

                    # 3. INSIDE -> OUTSIDE (Exit Zone)
                    elif state.previous_inside and not state.current_inside:
                        exit_event = IntrusionEvent(
                            event_id=f"evt-{int(now_epoch * 1000)}",
                            alert_id="",
                            camera_id=cam_norm,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            track_id=tid,
                            class_name=class_name,
                            confidence=confidence,
                            direction="EXITING",
                            position=curr_pos,
                            prev_position=prev_pos,
                            timestamp=now_ts,
                            severity="Low",
                            event_type="RESTRICTED_ZONE_EXIT",
                            frame_id=trk_frame_id,
                            risk_score=trk_risk,
                        )
                        state.alerted = False  # Reset so subsequent re-entry will alert!
                        events_generated.append(exit_event)

                    # 4. OUTSIDE -> OUTSIDE (Normal Movement)
                    else:
                        pass

        # Cleanup tracks no longer active
        expired_keys = [
            k for k in self.track_states.keys()
            if k[0] == cam_norm and k[1] not in active_track_ids and (now_epoch - self.track_states[k].last_update_time > 5.0)
        ]
        for k in expired_keys:
            del self.track_states[k]

        geom_ms = (time.perf_counter() - start_time) * 1000.0
        return events_generated, geom_ms

    def _persist_and_publish(self, event: IntrusionEvent, publisher: Optional[Any] = None):
        """
        Persists intrusion / tripwire event and tactical alert into SQLite via REST API,
        and broadcasts over WebSocket gateway.
        """
        event_payload = {
            "id": event.event_id,
            "camera_id": event.camera_id,
            "event_type": event.event_type,
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
                "frame_id": event.frame_id,
                "risk_score": event.risk_score,
            },
        }
        if event.prev_position:
            event_payload["metadata"]["prev_position"] = {
                "x": round(event.prev_position[0], 1),
                "y": round(event.prev_position[1], 1),
            }

        title = "Virtual Tripwire Breach" if event.event_type == "TRIPWIRE_CROSSING" else "Unauthorized Zone Entry"
        reason_desc = (
            f"Track #{event.track_id} ({event.class_name}) crossed tripwire {event.zone_name} [{event.direction}]"
            if event.event_type == "TRIPWIRE_CROSSING"
            else f"Track #{event.track_id} ({event.class_name}) crossed into restricted zone {event.zone_name}"
        )

        alert_payload = {
            "id": event.alert_id,
            "event_id": event.event_id,
            "camera_id": event.camera_id,
            "severity": event.severity,
            "title": title,
            "reason": reason_desc,
            "timestamp": event.timestamp,
            "metadata": {
                "zone_id": event.zone_id,
                "zone_name": event.zone_name,
                "track_id": event.track_id,
                "class_name": event.class_name,
                "direction": event.direction,
                "event_type": event.event_type,
            }
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
