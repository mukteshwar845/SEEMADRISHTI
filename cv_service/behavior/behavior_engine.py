"""
SEEMADRISHTI AI - Behavior Intelligence Engine (Phase 19)

Team: IQ100
Problem Statement: SIH26187

Deterministic, transparent behavior classification based strictly on
real trajectories, zones, tripwires, and dwell metrics.
Zero random or synthetic values.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Any, Set, Tuple


@dataclass
class BehaviorEvent:
    behavior_type: str
    track_id: int
    camera_id: str
    timestamp: float
    confidence: float
    evidence: List[str]
    severity: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Aliases for Phase 19 naming compatibility
BehaviorSignal = BehaviorEvent


class TrackBehaviorState:
    """Maintains behavior history for an active track."""

    def __init__(self, camera_id: str, track_id: int, class_name: str, start_time: float):
        self.camera_id = camera_id
        self.track_id = track_id
        self.class_name = class_name
        self.first_seen = start_time
        self.last_seen = start_time

        # Tracked behavior milestones
        self.emitted_behaviors: Set[str] = set()
        self.evidence_history: List[str] = []
        self.zone_entry_count = 0
        self.tripwire_crossings = 0
        self.loitering_detected = False
        self.reentry_count = 0
        self.wrong_direction_count = 0
        self.max_dwell_seconds = 0.0

        # Trajectory & velocity analysis
        self.recent_positions: List[Tuple[float, float, float]] = []  # (x, y, t)
        self.unusual_movement_flag = False


TrackSpatialHistory = TrackBehaviorState


class BehaviorIntelligenceEngine:
    """
    Evaluates verified spatial-temporal behavior signals:
    A. RESTRICTED_AREA_ENTRY
    B. TRIPWIRE_CROSSING
    C. LOITERING
    D. RE_ENTRY
    E. WRONG_DIRECTION_CROSSING
    F. EXCESSIVE_DWELL
    G. UNUSUAL_MOVEMENT
    H. REPEATED_PERIMETER_INTERACTION
    I. MULTI_EVENT_ESCALATION
    """

    def __init__(self, excessive_dwell_sec: float = 45.0):
        self.excessive_dwell_sec = excessive_dwell_sec
        # (camera_id, track_id) -> TrackBehaviorState
        self.track_states: Dict[Tuple[str, int], TrackBehaviorState] = {}
        self.active_behavior_events: List[BehaviorEvent] = []

    def get_or_create_state(
        self, camera_id: str, track_id: int, class_name: str, now: float
    ) -> TrackBehaviorState:
        key = (camera_id.strip().lower(), int(track_id))
        if key not in self.track_states:
            self.track_states[key] = TrackBehaviorState(
                camera_id=camera_id.strip().lower(),
                track_id=int(track_id),
                class_name=class_name,
                start_time=now,
            )
        state = self.track_states[key]
        state.last_seen = now
        return state

    def process_signals(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        centroid: Tuple[float, float],
        is_inside_zone: bool,
        dwell_seconds: float,
        reentry_count: int,
        zone_breach_event: Optional[Dict[str, Any]] = None,
        tripwire_event: Optional[Dict[str, Any]] = None,
        current_time: Optional[float] = None,
    ) -> List[BehaviorEvent]:
        """
        Processes real tracking & geometry signals to extract deterministic behaviors.
        """
        now = current_time if current_time is not None else time.time()
        state = self.get_or_create_state(camera_id, track_id, class_name, now)
        state.max_dwell_seconds = max(state.max_dwell_seconds, dwell_seconds)
        state.reentry_count = max(state.reentry_count, reentry_count)

        # Update position history (keep last 10 points)
        state.recent_positions.append((centroid[0], centroid[1], now))
        if len(state.recent_positions) > 10:
            state.recent_positions.pop(0)

        new_events: List[BehaviorEvent] = []

        # A. RESTRICTED_AREA_ENTRY
        if zone_breach_event and "RESTRICTED_AREA_ENTRY" not in state.emitted_behaviors:
            state.zone_entry_count += 1
            state.emitted_behaviors.add("RESTRICTED_AREA_ENTRY")
            state.evidence_history.append("restricted_zone_entry")
            evt = BehaviorEvent(
                behavior_type="RESTRICTED_AREA_ENTRY",
                track_id=track_id,
                camera_id=camera_id,
                timestamp=now,
                confidence=0.95,
                evidence=list(state.evidence_history),
                severity="HIGH",
                metadata={"zone_name": zone_breach_event.get("zone_name", "Restricted Area")},
            )
            new_events.append(evt)
            self.active_behavior_events.append(evt)

        # B. TRIPWIRE_CROSSING
        if tripwire_event:
            state.tripwire_crossings += 1
            direction = tripwire_event.get("direction", "IN")
            b_key = f"TRIPWIRE_CROSSING_{state.tripwire_crossings}"
            if b_key not in state.emitted_behaviors:
                state.emitted_behaviors.add(b_key)
                state.evidence_history.append(f"tripwire_crossed_{direction.lower()}")
                evt = BehaviorEvent(
                    behavior_type="TRIPWIRE_CROSSING",
                    track_id=track_id,
                    camera_id=camera_id,
                    timestamp=now,
                    confidence=0.92,
                    evidence=list(state.evidence_history),
                    severity="HIGH",
                    metadata={"direction": direction, "tripwire": tripwire_event.get("tripwire_name", "Tripwire")},
                )
                new_events.append(evt)
                self.active_behavior_events.append(evt)

                # E. WRONG_DIRECTION_CROSSING
                # If calibrated tripwire expected 'IN' but target crossed 'OUT' (or vice versa)
                configured_dir = tripwire_event.get("expected_direction", "IN")
                if configured_dir and direction != configured_dir and configured_dir != "BOTH":
                    if "WRONG_DIRECTION_CROSSING" not in state.emitted_behaviors:
                        state.emitted_behaviors.add("WRONG_DIRECTION_CROSSING")
                        state.evidence_history.append("wrong_direction_crossing")
                        state.wrong_direction_count += 1
                        evt_wd = BehaviorEvent(
                            behavior_type="WRONG_DIRECTION_CROSSING",
                            track_id=track_id,
                            camera_id=camera_id,
                            timestamp=now,
                            confidence=0.88,
                            evidence=list(state.evidence_history),
                            severity="HIGH",
                            metadata={"actual_direction": direction, "expected_direction": configured_dir},
                        )
                        new_events.append(evt_wd)
                        self.active_behavior_events.append(evt_wd)

        # C. LOITERING
        if is_inside_zone and dwell_seconds >= 15.0 and "LOITERING" not in state.emitted_behaviors:
            state.loitering_detected = True
            state.emitted_behaviors.add("LOITERING")
            state.evidence_history.append(f"loitering_dwell_{int(dwell_seconds)}s")
            evt = BehaviorEvent(
                behavior_type="LOITERING",
                track_id=track_id,
                camera_id=camera_id,
                timestamp=now,
                confidence=0.90,
                evidence=list(state.evidence_history),
                severity="MEDIUM",
                metadata={"dwell_seconds": round(dwell_seconds, 1)},
            )
            new_events.append(evt)
            self.active_behavior_events.append(evt)

        # D. RE_ENTRY
        if reentry_count > 0:
            re_key = f"RE_ENTRY_{reentry_count}"
            if re_key not in state.emitted_behaviors:
                state.emitted_behaviors.add(re_key)
                state.evidence_history.append(f"reentry_count_{reentry_count}")
                evt = BehaviorEvent(
                    behavior_type="RE_ENTRY",
                    track_id=track_id,
                    camera_id=camera_id,
                    timestamp=now,
                    confidence=0.94,
                    evidence=list(state.evidence_history),
                    severity="HIGH",
                    metadata={"reentry_count": reentry_count},
                )
                new_events.append(evt)
                self.active_behavior_events.append(evt)

        # F. EXCESSIVE_DWELL
        if dwell_seconds >= self.excessive_dwell_sec and "EXCESSIVE_DWELL" not in state.emitted_behaviors:
            state.emitted_behaviors.add("EXCESSIVE_DWELL")
            state.evidence_history.append(f"excessive_dwell_{int(dwell_seconds)}s")
            evt = BehaviorEvent(
                behavior_type="EXCESSIVE_DWELL",
                track_id=track_id,
                camera_id=camera_id,
                timestamp=now,
                confidence=0.92,
                evidence=list(state.evidence_history),
                severity="CRITICAL",
                metadata={"dwell_seconds": round(dwell_seconds, 1), "threshold": self.excessive_dwell_sec},
            )
            new_events.append(evt)
            self.active_behavior_events.append(evt)

        # G. UNUSUAL_MOVEMENT
        # Calculate velocity variance from recent trajectory points
        if len(state.recent_positions) >= 2 and "UNUSUAL_MOVEMENT" not in state.emitted_behaviors:
            p0 = state.recent_positions[-2]
            p1 = state.recent_positions[-1]
            dt = p1[2] - p0[2]
            if dt > 0.05:
                dist = ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2) ** 0.5
                speed = dist / dt
                if speed > 200.0:  # Rapid displacement
                    state.emitted_behaviors.add("UNUSUAL_MOVEMENT")
                    state.evidence_history.append(f"unusual_speed_{int(speed)}px_per_s")
                    evt = BehaviorEvent(
                        behavior_type="UNUSUAL_MOVEMENT",
                        track_id=track_id,
                        camera_id=camera_id,
                        timestamp=now,
                        confidence=0.85,
                        evidence=list(state.evidence_history),
                        severity="MEDIUM",
                        metadata={"speed_px_sec": round(speed, 1)},
                    )
                    new_events.append(evt)
                    self.active_behavior_events.append(evt)

        # H. REPEATED_PERIMETER_INTERACTION
        total_interactions = state.zone_entry_count + state.tripwire_crossings + state.reentry_count
        if total_interactions >= 2 and "REPEATED_PERIMETER_INTERACTION" not in state.emitted_behaviors:
            state.emitted_behaviors.add("REPEATED_PERIMETER_INTERACTION")
            state.evidence_history.append(f"total_perimeter_interactions_{total_interactions}")
            evt = BehaviorEvent(
                behavior_type="REPEATED_PERIMETER_INTERACTION",
                track_id=track_id,
                camera_id=camera_id,
                timestamp=now,
                confidence=0.93,
                evidence=list(state.evidence_history),
                severity="HIGH",
                metadata={"total_interactions": total_interactions},
            )
            new_events.append(evt)
            self.active_behavior_events.append(evt)

        # I. MULTI_EVENT_ESCALATION
        distinct_behaviors = len(state.emitted_behaviors)
        if distinct_behaviors >= 3 and "MULTI_EVENT_ESCALATION" not in state.emitted_behaviors:
            state.emitted_behaviors.add("MULTI_EVENT_ESCALATION")
            state.evidence_history.append(f"multi_event_count_{distinct_behaviors}")
            evt = BehaviorEvent(
                behavior_type="MULTI_EVENT_ESCALATION",
                track_id=track_id,
                camera_id=camera_id,
                timestamp=now,
                confidence=0.96,
                severity="CRITICAL",
                evidence=list(state.evidence_history),
                metadata={"distinct_behavior_count": distinct_behaviors},
            )
            new_events.append(evt)
            self.active_behavior_events.append(evt)

        return new_events

    def get_track_behaviors(self, camera_id: str, track_id: int) -> List[Dict[str, Any]]:
        cid = camera_id.strip().lower()
        tid = int(track_id)
        return [
            e.to_dict()
            for e in self.active_behavior_events
            if e.camera_id.strip().lower() == cid and e.track_id == tid
        ]

    def reset_session(self) -> None:
        self.track_states.clear()
        self.active_behavior_events.clear()
