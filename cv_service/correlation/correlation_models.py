"""
SEEMADRISHTI AI - Correlation Models & Data Structures (Phase 8)

Team: IQ100
Problem Statement: SIH26187

Strict Rules:
- Rule #3: Track IDs remain camera-local. Observation identity = (camera_id + track_id).
- Transparent explainable reason codes with itemized point contributions.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import json
import time
from typing import Dict, List, Optional


@dataclass
class CorrelationReason:
    code: str
    points: int
    message: str

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Observation:
    camera_id: str
    track_id: str
    class_name: str = "person"
    event_type: str = "RISK_ASSESSMENT"
    risk_score: int = 60
    risk_level: str = "HIGH"
    zone_name: Optional[str] = "Sector Alpha"
    timestamp: float = field(default_factory=time.time)
    iso_timestamp: str = ""
    incident_id: Optional[str] = None

    def __post_init__(self):
        self.camera_id = self.camera_id.strip().lower()
        self.track_id = str(self.track_id).strip()
        if not self.iso_timestamp:
            self.iso_timestamp = datetime.fromtimestamp(self.timestamp, tz=timezone.utc).isoformat()

    @property
    def observation_key(self) -> str:
        # Unique identity for deduplication (camera_id + track_id + rounded timestamp)
        return f"{self.camera_id}:{self.track_id}:{self.timestamp:.1f}"

    def to_dict(self) -> Dict:
        return {
            "camera_id": self.camera_id,
            "track_id": self.track_id,
            "class_name": self.class_name,
            "event_type": self.event_type,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "zone_name": self.zone_name,
            "timestamp": self.iso_timestamp,
            "incident_id": self.incident_id,
        }


@dataclass
class CorrelatedIncident:
    id: str
    status: str = "ACTIVE"  # ACTIVE | CLOSED | ARCHIVED
    correlation_score: int = 0
    correlation_level: str = "LOW"  # LOW | MEDIUM | HIGH | CRITICAL
    started_at: float = field(default_factory=time.time)
    last_seen_at: float = field(default_factory=time.time)
    camera_sequence: List[str] = field(default_factory=list)
    linked_incidents: List[str] = field(default_factory=list)
    observations: List[Observation] = field(default_factory=list)
    reasons: List[CorrelationReason] = field(default_factory=list)

    @property
    def started_at_iso(self) -> str:
        return datetime.fromtimestamp(self.started_at, tz=timezone.utc).isoformat()

    @property
    def last_seen_at_iso(self) -> str:
        return datetime.fromtimestamp(self.last_seen_at, tz=timezone.utc).isoformat()

    @property
    def primary_class(self) -> str:
        if self.observations:
            return self.observations[0].class_name
        return "person"

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "status": self.status,
            "correlation_score": self.correlation_score,
            "correlation_level": self.correlation_level,
            "started_at": self.started_at_iso,
            "last_seen_at": self.last_seen_at_iso,
            "camera_sequence": list(self.camera_sequence),
            "linked_incidents": list(self.linked_incidents),
            "observations": [obs.to_dict() for obs in self.observations],
            "reasons": [r.to_dict() for r in self.reasons],
        }
