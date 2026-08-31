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

def _get_class_category(class_name: str) -> str:
    cn = str(class_name).lower().strip()
    if cn in ("person", "pedestrian", "human"):
        return "HUMAN"
    elif cn in ("car", "truck", "bus", "motorcycle", "motor", "bicycle", "bike", "van", "suv", "vehicle"):
        return "VEHICLE"
    elif cn in ("bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"):
        return "ANIMAL"
    else:
        return "OBJECT"

logger = logging.getLogger("IntrusionDetector")


@dataclass
class IntrusionEvent:
    camera_id: str
    zone_id: str
    zone_name: str
    track_id: int
    class_name: str
    position: Tuple[float, float]  # (cx, cy)
    direction: str = "ENTERING"  # 'ENTERING', 'EXITING', 'IN', 'OUT', 'CROSSING', 'PROXIMITY'
    confidence: float = 0.9
    event_id: str = ""
    alert_id: str = ""
    timestamp: str = ""
    severity: str = "High"  # 'Low', 'Medium', 'High', 'Critical'
    event_type: str = "RESTRICTED_ZONE_ENTRY"
    category: str = "HUMAN"  # 'HUMAN', 'VEHICLE', 'ANIMAL', 'OBJECT'
    boundary_id: str = ""
    boundary_type: str = "BORDER_LINE"  # 'BORDER_LINE', 'TRIPWIRE', 'ZEBRA_CROSSING', 'ENTRY_LINE', 'EXIT_LINE', 'RESTRICTED_ZONE'
    distance_px: Optional[float] = None
    distance_norm: Optional[float] = None
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
        if not self.boundary_id:
            self.boundary_id = self.zone_id

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
    """
    Maintains state for an individual track against a specific security zone or boundary.
    Implements a strict 5-tier state machine to eliminate false duplicate alerts:
    OUTSIDE -> APPROACHING -> NEAR_BOUNDARY -> CROSSING -> INSIDE
    """

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
        self.last_proximity_time: float = 0.0
        self.proximity_state: str = "INSIDE" if initial_inside else "OUTSIDE"
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
        # Camera ingress/egress metrics: camera_id -> {"entries": int, "exits": int, "net_occupancy": int}
        self.ingress_counts: Dict[str, Dict[str, int]] = {}

    def get_ingress_counts(self, camera_id: str) -> Dict[str, int]:
        cam_norm = str(camera_id).lower().strip()
        if cam_norm not in self.ingress_counts:
            self.ingress_counts[cam_norm] = {"entries": 0, "exits": 0, "net_occupancy": 0}
        return dict(self.ingress_counts[cam_norm])

    def reset_session(self, camera_id: Optional[str] = None):
        """Resets active track states, crossing cooldowns, and ingress metrics for clean replay."""
        if camera_id:
            cam_norm = str(camera_id).lower().strip()
            self.track_states = {k: v for k, v in self.track_states.items() if k[0] != cam_norm}
            self.ingress_counts[cam_norm] = {"entries": 0, "exits": 0, "net_occupancy": 0}
        else:
            self.track_states.clear()
            self.ingress_counts.clear()

    def reset(self, camera_id: Optional[str] = None):
        """Alias for reset_session."""
        self.reset_session(camera_id)

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

                is_tripwire = getattr(zone, "is_tripwire", False) or len(zone.raw_polygon) == 2 or getattr(zone, "zone_type", "") in ("TRIPWIRE", "BORDER_LINE", "ZEBRA_CROSSING", "ENTRY_LINE", "EXIT_LINE")
                boundary_type = getattr(zone, "zone_type", "BORDER_LINE" if is_tripwire else "RESTRICTED_ZONE")

                # Get category
                category = _get_class_category(class_name)

                # -------------------------------------------------------------
                # CASE A: VIRTUAL TRIPWIRE / BORDER / ZEBRA LINE CROSSING & PROXIMITY
                # -------------------------------------------------------------
                if is_tripwire:
                    crossed = zone.test_crossing(prev_pos, curr_pos, frame_width, frame_height)
                    if crossed:
                        direction = zone.get_crossing_direction(prev_pos, curr_pos, frame_width, frame_height)
                        time_since_last_cross = now_epoch - state.last_crossing_time

                        # Cooldown deduplication (2.5s window per track-boundary)
                        if time_since_last_cross > 2.5:
                            state.last_crossing_time = now_epoch
                            state.last_crossing_direction = direction
                            state.entry_count += 1
                            state.proximity_state = "CROSSING"
                            
                            event_id = f"evt-{int(now_epoch * 1000)}"
                            alert_id = f"alt-{int(now_epoch * 1000)}"

                            # Universal crossing event classification
                            # Event type is standardized to TRIPWIRE_CROSSING for regression compatibility
                            event_type = "TRIPWIRE_CROSSING"
                            if boundary_type == "ZEBRA_CROSSING":
                                event_type = f"{category}_CROSSING_ZEBRA"

                            event = IntrusionEvent(
                                event_id=event_id,
                                alert_id=alert_id,
                                camera_id=cam_norm,
                                zone_id=zone.zone_id,
                                zone_name=zone.name,
                                track_id=tid,
                                class_name=class_name,
                                category=category,
                                confidence=confidence,
                                direction=direction,
                                position=curr_pos,
                                prev_position=prev_pos,
                                timestamp=now_ts,
                                severity="High",
                                event_type=event_type,
                                boundary_id=zone.zone_id,
                                boundary_type=boundary_type,
                                frame_id=trk_frame_id,
                                risk_score=trk_risk,
                            )
                            events_generated.append(event)

                            # Ingress / Egress Intelligence
                            if cam_norm not in self.ingress_counts:
                                self.ingress_counts[cam_norm] = {"entries": 0, "exits": 0, "net_occupancy": 0}
                            if direction == "IN":
                                self.ingress_counts[cam_norm]["entries"] += 1
                            elif direction == "OUT":
                                self.ingress_counts[cam_norm]["exits"] += 1
                            self.ingress_counts[cam_norm]["net_occupancy"] = max(
                                0, self.ingress_counts[cam_norm]["entries"] - self.ingress_counts[cam_norm]["exits"]
                            )

                            print(f"\n[UNIVERSAL LINE CROSSING]")
                            print(f"Camera:    {cam_norm}")
                            print(f"Track:     #{tid} ({class_name} | {category})")
                            print(f"Boundary:  {zone.name} ({boundary_type})")
                            print(f"Event:     {event_type}")
                            print(f"Direction: {direction}")
                            print(f"From:      ({prev_pos[0]:.1f}, {prev_pos[1]:.1f}) -> To: ({curr_pos[0]:.1f}, {curr_pos[1]:.1f})")
                            print(f"Timestamp: {now_ts}\n")

                            self._persist_and_publish(event, publisher)
                    else:
                        # Check Smart Proximity / Approach Buffer using normalized distance
                        buffer_norm = getattr(zone, "proximity_buffer_norm", 0.035)
                        is_near, dist_px, dist_norm = zone.is_in_proximity(
                            curr_pos, frame_width, frame_height, proximity_buffer_norm=buffer_norm
                        )

                        # Determine if approaching boundary based on displacement
                        prev_dist_px, _ = zone.distance_to_boundary(prev_pos, frame_width, frame_height)
                        is_moving_closer = dist_px < prev_dist_px

                        # State Machine: OUTSIDE -> APPROACHING / NEAR_BOUNDARY
                        if is_near:
                            new_prox_state = "NEAR_BOUNDARY" if dist_norm < (buffer_norm * 0.5) else "APPROACHING"
                            # Only fire alert on transition from OUTSIDE or after substantial cooldown
                            time_since_prox = now_epoch - state.last_proximity_time
                            state_transition_occurred = (state.proximity_state == "OUTSIDE")

                            if (state_transition_occurred or time_since_prox > 10.0) and is_moving_closer:
                                state.proximity_state = new_prox_state
                                state.last_proximity_time = now_epoch
                                event_id = f"evt-prox-{int(now_epoch * 1000)}"
                                alert_id = f"alt-prox-{int(now_epoch * 1000)}"

                                approach_dir = "TOWARD LINE" if is_moving_closer else "NEAR LINE"

                                event = IntrusionEvent(
                                    event_id=event_id,
                                    alert_id=alert_id,
                                    camera_id=cam_norm,
                                    zone_id=zone.zone_id,
                                    zone_name=zone.name,
                                    track_id=tid,
                                    class_name=class_name,
                                    category=category,
                                    confidence=confidence,
                                    direction=approach_dir,
                                    position=curr_pos,
                                    prev_position=prev_pos,
                                    timestamp=now_ts,
                                    severity="Medium",
                                    event_type="SUSPICIOUS_AREA_APPROACH",
                                    boundary_id=zone.zone_id,
                                    boundary_type=boundary_type,
                                    distance_px=round(dist_px, 1),
                                    distance_norm=round(dist_norm, 4),
                                    frame_id=trk_frame_id,
                                    risk_score=max(40.0, trk_risk or 40.0),
                                )
                                events_generated.append(event)
                                print(f"[SUSPICIOUS AREA APPROACH] Target #{tid} ({class_name} | {category}) approaching {zone.name} ({dist_px:.1f}px) on {cam_norm}")
                                self._persist_and_publish(event, publisher)
                            else:
                                state.proximity_state = new_prox_state
                        else:
                            # Target moved outside proximity buffer -> reset state
                            if state.proximity_state in ("APPROACHING", "NEAR_BOUNDARY", "CROSSING"):
                                state.proximity_state = "OUTSIDE"

                # -------------------------------------------------------------
                # CASE B: POLYGONAL RESTRICTED ZONE INTRUSION
                # -------------------------------------------------------------
                else:
                    # Only trigger Perimeter Breach if the zone is actually a RESTRICTED_ZONE
                    is_restricted_exclusion = boundary_type in ("RESTRICTED_ZONE", "EXCLUSION_ZONE", "RESTRICTED")
                    if not is_restricted_exclusion:
                        # Monitored Sector / Observation Zone — authorized presence, no perimeter breach
                        state.proximity_state = "INSIDE"
                        continue

                    # 1. OUTSIDE -> INSIDE (Restricted Zone Entry!)
                    if not state.previous_inside and state.current_inside:
                        state.entry_count += 1
                        state.proximity_state = "INSIDE"
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
                            category=category,
                            confidence=confidence,
                            direction="ENTERING",
                            position=curr_pos,
                            prev_position=prev_pos,
                            timestamp=now_ts,
                            severity="High",
                            event_type="RESTRICTED_ZONE_ENTRY",
                            boundary_id=zone.zone_id,
                            boundary_type=boundary_type,
                            frame_id=trk_frame_id,
                            risk_score=trk_risk,
                        )

                        if not state.alerted:
                            state.alerted = True
                            events_generated.append(event)

                            print(f"\n[RESTRICTED ZONE ENTRY / PERIMETER BREACH]")
                            print(f"Camera:    {cam_norm}")
                            print(f"Track:     #{tid} ({class_name} | {category})")
                            print(f"Zone:      {zone.name}")
                            print(f"Direction: ENTERING")
                            print(f"Position:  ({cx:.1f}, {cy:.1f})")
                            print(f"Timestamp: {now_ts}\n")

                            self._persist_and_publish(event, publisher)

                    # 2. INSIDE -> INSIDE (Linger / Dwell - Suppressed)
                    elif state.previous_inside and state.current_inside:
                        state.proximity_state = "INSIDE"

                    # 3. INSIDE -> OUTSIDE (Exit Zone)
                    elif state.previous_inside and not state.current_inside:
                        state.proximity_state = "OUTSIDE"
                        exit_event = IntrusionEvent(
                            event_id=f"evt-{int(now_epoch * 1000)}",
                            alert_id="",
                            camera_id=cam_norm,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            track_id=tid,
                            class_name=class_name,
                            category=category,
                            confidence=confidence,
                            direction="EXITING",
                            position=curr_pos,
                            prev_position=prev_pos,
                            timestamp=now_ts,
                            severity="Low",
                            event_type="RESTRICTED_ZONE_EXIT",
                            boundary_id=zone.zone_id,
                            boundary_type=boundary_type,
                            frame_id=trk_frame_id,
                            risk_score=trk_risk,
                        )
                        state.alerted = False  # Reset so subsequent re-entry will alert!
                        events_generated.append(exit_event)

                    # 4. OUTSIDE -> OUTSIDE (Check Proximity buffer for polygon)
                    else:
                        buffer_norm = getattr(zone, "proximity_buffer_norm", 0.035)
                        is_near, dist_px, dist_norm = zone.is_in_proximity(
                            curr_pos, frame_width, frame_height, proximity_buffer_norm=buffer_norm
                        )
                        if is_near:
                            prev_dist_px, _ = zone.distance_to_boundary(prev_pos, frame_width, frame_height)
                            is_moving_closer = dist_px < prev_dist_px
                            time_since_prox = now_epoch - state.last_proximity_time
                            state_transition_occurred = (state.proximity_state == "OUTSIDE")

                            if (state_transition_occurred or time_since_prox > 10.0) and is_moving_closer:
                                state.proximity_state = "APPROACHING"
                                state.last_proximity_time = now_epoch
                                event_id = f"evt-prox-{int(now_epoch * 1000)}"
                                alert_id = f"alt-prox-{int(now_epoch * 1000)}"

                                event = IntrusionEvent(
                                    event_id=event_id,
                                    alert_id=alert_id,
                                    camera_id=cam_norm,
                                    zone_id=zone.zone_id,
                                    zone_name=zone.name,
                                    track_id=tid,
                                    class_name=class_name,
                                    category=category,
                                    confidence=confidence,
                                    direction="TOWARD ZONE",
                                    position=curr_pos,
                                    prev_position=prev_pos,
                                    timestamp=now_ts,
                                    severity="Medium",
                                    event_type="SUSPICIOUS_AREA_APPROACH",
                                    boundary_id=zone.zone_id,
                                    boundary_type=boundary_type,
                                    distance_px=round(dist_px, 1),
                                    distance_norm=round(dist_norm, 4),
                                    frame_id=trk_frame_id,
                                    risk_score=max(40.0, trk_risk or 40.0),
                                )
                                events_generated.append(event)
                                print(f"[SUSPICIOUS AREA APPROACH] Target #{tid} ({class_name} | {category}) approaching {zone.name} ({dist_px:.1f}px) on {cam_norm}")
                                self._persist_and_publish(event, publisher)
                            else:
                                state.proximity_state = "APPROACHING"
                        else:
                            state.proximity_state = "OUTSIDE"

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

        # Smart Alert Title & Reason Generation
        cat = getattr(event, "category", "OBJECT")
        cls_upper = (event.class_name or "OBJECT").upper()

        if event.event_type == "SUSPICIOUS_AREA_APPROACH":
            title = f"⚠ {cls_upper} IN SUSPICIOUS AREA"
            reason_desc = (
                f"Track #{event.track_id} ({event.class_name} | {cat}) approaching security boundary "
                f"{event.zone_name} [{event.direction}] ({event.distance_px or 0:.1f}px)"
            )
        elif "CROSSING" in event.event_type or "ZEBRA" in event.event_type:
            title = f"🚨 {cls_upper} LINE CROSSING BREACH"
            reason_desc = (
                f"Track #{event.track_id} ({event.class_name} | {cat}) crossed boundary "
                f"{event.zone_name} [{event.direction}]"
            )
        else:
            title = f"🚨 {cls_upper} UNAUTHORIZED ZONE INTRUSION"
            reason_desc = (
                f"Track #{event.track_id} ({event.class_name} | {cat}) penetrated restricted zone {event.zone_name}"
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
                "boundary_id": getattr(event, "boundary_id", event.zone_id),
                "boundary_type": getattr(event, "boundary_type", "BORDER_LINE"),
                "track_id": event.track_id,
                "class_name": event.class_name,
                "category": cat,
                "direction": event.direction,
                "event_type": event.event_type,
                "distance_px": getattr(event, "distance_px", None),
                "distance_norm": getattr(event, "distance_norm", None),
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
