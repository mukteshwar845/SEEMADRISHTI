"""
SEEMADRISHTI AI - Multi-Event Incident Fusion Engine (Phase 19)

Team: IQ100
Problem Statement: SIH26187

Deterministic fusion of multi-stage security events (detection, tracking,
restricted entry, tripwire crossing, loitering, re-entry, risk escalation)
into a single, consolidated operational incident.
Suppresses duplicate incident records while preserving full chronological event history.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Any, Set, Tuple


@dataclass
class FusedIncident:
    incident_id: str
    correlation_id: Optional[str]
    camera_ids: List[str]
    track_ids: List[int]
    class_names: List[str]
    event_types: List[str]
    first_seen: float
    last_seen: float
    risk_score: int
    risk_level: str
    timeline: List[Dict[str, Any]]
    evidence_ids: List[str]
    fusion_reason: str
    status: str = "ACTIVE"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def events_count(self) -> int:
        return len(self.event_types)

    @property
    def duration_seconds(self) -> float:
        return max(0.0, round(self.last_seen - self.first_seen, 1))

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["events_count"] = self.events_count
        d["duration_seconds"] = self.duration_seconds
        return d


class IncidentFusionEngine:
    """
    Intelligently groups related security events belonging to the same target/session
    into a single unified Incident record.
    """

    def __init__(self, session_timeout_sec: float = 60.0):
        self.session_timeout_sec = session_timeout_sec
        self._incident_counter = 0
        # incident_id -> FusedIncident
        self.incidents: Dict[str, FusedIncident] = {}
        # (camera_id, track_id) -> incident_id
        self.track_to_incident: Dict[Tuple[str, int], str] = {}
        # correlation_id -> incident_id
        self.correlation_to_incident: Dict[str, str] = {}

    def _next_incident_id(self) -> str:
        self._incident_counter += 1
        return f"INC-{self._incident_counter:06d}"

    def fuse_or_create_incident(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        event_type: str,
        risk_score: int,
        risk_level: str,
        zone_name: Optional[str] = None,
        correlation_id: Optional[str] = None,
        timestamp: Optional[float] = None,
        evidence_id: Optional[str] = None,
        details: Optional[str] = None,
    ) -> Tuple[FusedIncident, bool]:
        """
        Fuses event into an existing active incident for this target/session,
        or creates a new incident if none exists.
        Returns: (incident, is_new)
        """
        now = timestamp if timestamp is not None else time.time()
        cam = camera_id.strip().lower()
        tid = int(track_id)
        cls = class_name.strip().lower()
        key = (cam, tid)
        now_iso = datetime.fromtimestamp(now, tz=timezone.utc).isoformat()

        # Step 1: Look for existing incident by track key or correlation ID
        existing_id: Optional[str] = None

        if correlation_id and correlation_id in self.correlation_to_incident:
            existing_id = self.correlation_to_incident[correlation_id]
        elif key in self.track_to_incident:
            candidate_id = self.track_to_incident[key]
            candidate = self.incidents.get(candidate_id)
            if candidate and (now - candidate.last_seen) <= self.session_timeout_sec:
                existing_id = candidate_id

        # Step 2: If existing incident found, fuse event into it
        if existing_id and existing_id in self.incidents:
            incident = self.incidents[existing_id]

            # Update cameras and tracks
            if cam not in incident.camera_ids:
                incident.camera_ids.append(cam)
            if tid not in incident.track_ids:
                incident.track_ids.append(tid)
            if cls not in incident.class_names:
                incident.class_names.append(cls)

            # Update event types
            if event_type not in incident.event_types:
                incident.event_types.append(event_type)

            # Update risk score & level
            incident.risk_score = max(incident.risk_score, int(risk_score))
            if incident.risk_score >= 75:
                incident.risk_level = "CRITICAL"
            elif incident.risk_score >= 50:
                incident.risk_level = "HIGH"
            elif incident.risk_score >= 25:
                incident.risk_level = "MEDIUM"

            # Update timeline
            timeline_label = details or f"{event_type.replace('_', ' ')} ({cam.upper()} #{tid})"
            incident.timeline.append({
                "time": now_iso,
                "label": timeline_label,
                "type": event_type,
                "status": "VERIFIED",
            })

            # Update evidence linkage
            if evidence_id and evidence_id not in incident.evidence_ids:
                incident.evidence_ids.append(evidence_id)

            # Update correlation ID if newly established
            if correlation_id:
                incident.correlation_id = correlation_id
                self.correlation_to_incident[correlation_id] = incident.incident_id

            incident.last_seen = now

            # Update fusion reason
            incident.fusion_reason = (
                f"Unified {len(incident.event_types)} distinct surveillance events for "
                f"{cls.upper()} #{incident.track_ids} across {len(incident.camera_ids)} camera sector(s)"
            )

            # Keep map fresh
            self.track_to_incident[key] = incident.incident_id

            return incident, False

        # Step 3: Otherwise, create new FusedIncident
        new_id = self._next_incident_id()
        initial_timeline = [
            {"time": now_iso, "label": f"{cls.upper()} #{tid} DETECTED BY YOLOv8", "type": "DETECTION", "status": "VERIFIED"},
            {"time": now_iso, "label": f"BYTE TRACK ESTABLISHED ({cam.upper()} #{tid})", "type": "TRACKING", "status": "VERIFIED"},
        ]
        if event_type not in ("DETECTION", "TRACKING"):
            initial_timeline.append({
                "time": now_iso,
                "label": details or f"{event_type.replace('_', ' ')} ({zone_name or cam.upper()})",
                "type": event_type,
                "status": "VERIFIED",
            })

        evidence_list = [evidence_id] if evidence_id else []

        incident = FusedIncident(
            incident_id=new_id,
            correlation_id=correlation_id,
            camera_ids=[cam],
            track_ids=[tid],
            class_names=[cls],
            event_types=[event_type],
            first_seen=now,
            last_seen=now,
            risk_score=int(risk_score),
            risk_level=risk_level,
            timeline=initial_timeline,
            evidence_ids=evidence_list,
            fusion_reason=f"Consolidated security session for {cls.upper()} #{tid} on {cam.upper()}",
            status="ACTIVE",
        )

        self.incidents[new_id] = incident
        self.track_to_incident[key] = new_id
        if correlation_id:
            self.correlation_to_incident[correlation_id] = new_id

        return incident, True

    def get_incident(self, incident_id: str) -> Optional[FusedIncident]:
        return self.incidents.get(incident_id)

    def get_all_incidents(self) -> List[Dict[str, Any]]:
        return [inc.to_dict() for inc in self.incidents.values()]

    def reset_session(self) -> None:
        self.incidents.clear()
        self.track_to_incident.clear()
        self.correlation_to_incident.clear()
