"""
SEEMADRISHTI AI - Threat Behavior Chain Engine (Phase 19)

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Core Functionality:
Correlates real pipeline events belonging to the same target into an authentic,
chronological behavioral sequence.
Deduplicates transient frame-level duplicates while preserving every verified milestone.
Zero synthetic, fake, or randomized data.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Any, Set, Tuple

from cv_service.behavior.behavior_rules import (
    evaluate_behavior_pattern,
    PATTERN_UNKNOWN,
    PATTERN_NORMAL_MOVEMENT,
    PATTERN_PERIMETER_APPROACH,
    PATTERN_RESTRICTED_AREA_INTRUSION,
    PATTERN_PERSISTENT_LOITERING,
    PATTERN_REPEATED_REENTRY,
    PATTERN_POSSIBLE_RECONNAISSANCE,
    PATTERN_MULTI_EVENT_SECURITY_BREACH,
    PATTERN_CROSS_CAMERA_CONTINUATION,
)


@dataclass
class ChainEvent:
    sequence: int
    event_type: str
    timestamp: float
    camera_id: str
    track_id: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    iso_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sequence": self.sequence,
            "event_type": self.event_type,
            "timestamp": self.timestamp,
            "camera_id": self.camera_id,
            "track_id": self.track_id,
            "metadata": self.metadata,
            "iso_time": self.iso_time,
        }


@dataclass
class BehaviorChain:
    chain_id: str
    track_id: int
    camera_id: str
    class_name: str = "person"
    camera_ids: List[str] = field(default_factory=list)
    correlation_id: Optional[str] = None
    status: str = "ACTIVE"  # ACTIVE, ESCALATING, CRITICAL, INCIDENT_CREATED, RESOLVED, EXPIRED
    started_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    events: List[ChainEvent] = field(default_factory=list)
    risk_score: int = 0
    risk_level: str = "LOW"
    behavior_pattern: str = PATTERN_UNKNOWN
    confidence: float = 0.0
    confidence_label: str = "INSUFFICIENT DATA"
    evidence: List[str] = field(default_factory=list)
    explanation: str = ""
    risk_contributions: List[Dict[str, Any]] = field(default_factory=list)
    incident_id: Optional[str] = None
    max_dwell_seconds: float = 0.0
    reentry_count: int = 0

    def __post_init__(self):
        if not self.camera_ids and self.camera_id:
            self.camera_ids = [self.camera_id]

    @property
    def event_count(self) -> int:
        return len(self.events)

    @property
    def duration_seconds(self) -> float:
        return max(0.0, round(self.updated_at - self.started_at, 1))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chain_id": self.chain_id,
            "track_id": self.track_id,
            "class_name": self.class_name,
            "camera_id": self.camera_id,
            "camera_ids": list(self.camera_ids),
            "correlation_id": self.correlation_id,
            "status": self.status,
            "started_at": self.started_at,
            "updated_at": self.updated_at,
            "events": [e.to_dict() for e in self.events],
            "event_count": self.event_count,
            "duration_seconds": self.duration_seconds,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "behavior_pattern": self.behavior_pattern,
            "confidence": self.confidence,
            "confidence_label": self.confidence_label,
            "evidence": list(self.evidence),
            "explanation": self.explanation,
            "risk_contributions": self.risk_contributions,
            "incident_id": self.incident_id,
            "max_dwell_seconds": round(self.max_dwell_seconds, 1),
            "reentry_count": self.reentry_count,
        }


class BehaviorChainEngine:
    """
    Stateful engine that correlates real-world spatial-temporal events into chronological
    Threat Behavior Chains.
    """

    def __init__(self, session_timeout_sec: float = 90.0):
        self.session_timeout_sec = session_timeout_sec
        self._chain_counter = 0

        # (camera_id, track_id) -> BehaviorChain
        self.active_chains: Dict[Tuple[str, int], BehaviorChain] = {}
        # chain_id -> BehaviorChain
        self.chains_by_id: Dict[str, BehaviorChain] = {}
        # incident_id -> chain_id
        self.incident_to_chain: Dict[str, str] = {}
        # correlation_id -> chain_id
        self.correlation_to_chain: Dict[str, str] = {}
        # Historical archived chains
        self.historical_chains: List[BehaviorChain] = []

    def _next_chain_id(self) -> str:
        self._chain_counter += 1
        return f"CHAIN-{self._chain_counter:06d}"

    def get_or_create_chain(
        self,
        camera_id: str,
        track_id: int,
        class_name: str = "person",
        correlation_id: Optional[str] = None,
        current_time: Optional[float] = None,
    ) -> BehaviorChain:
        now = current_time if current_time is not None else time.time()
        cid = camera_id.strip().lower()
        tid = int(track_id)
        key = (cid, tid)

        # 1. Check if correlation_id links to an existing chain across cameras
        if correlation_id and correlation_id in self.correlation_to_chain:
            existing_chain_id = self.correlation_to_chain[correlation_id]
            if existing_chain_id in self.chains_by_id:
                chain = self.chains_by_id[existing_chain_id]
                if cid not in chain.camera_ids:
                    chain.camera_ids.append(cid)
                chain.updated_at = now
                self.active_chains[key] = chain
                return chain

        # 2. Check active key
        if key in self.active_chains:
            chain = self.active_chains[key]
            chain.updated_at = now
            return chain

        # 3. Create fresh chain
        chain_id = self._next_chain_id()
        chain = BehaviorChain(
            chain_id=chain_id,
            track_id=tid,
            camera_id=cid,
            class_name=class_name,
            camera_ids=[cid],
            correlation_id=correlation_id,
            status="ACTIVE",
            started_at=now,
            updated_at=now,
        )
        self.active_chains[key] = chain
        self.chains_by_id[chain_id] = chain
        if correlation_id:
            self.correlation_to_chain[correlation_id] = chain_id

        return chain

    def get_chain(self, camera_id: str, track_id: int) -> Optional[BehaviorChain]:
        cid = camera_id.strip().lower()
        tid = int(track_id)
        return self.active_chains.get((cid, tid))

    def get_chain_by_correlation(self, correlation_id: str) -> Optional[BehaviorChain]:
        chain_id = self.correlation_to_chain.get(correlation_id)
        if chain_id:
            return self.chains_by_id.get(chain_id)
        return None

    def _append_event(
        self,
        chain: BehaviorChain,
        event_type: str,
        timestamp: float,
        camera_id: str,
        track_id: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[ChainEvent]:
        """Appends a new chronological event if not duplicate."""
        meta = metadata or {}
        seq = len(chain.events) + 1
        ev = ChainEvent(
            sequence=seq,
            event_type=event_type,
            timestamp=timestamp,
            camera_id=camera_id,
            track_id=track_id,
            metadata=meta,
        )
        chain.events.append(ev)
        chain.updated_at = timestamp
        return ev

    def _refresh_classification(self, chain: BehaviorChain) -> None:
        """Deterministically evaluates pattern, confidence, and explanations."""
        events_dicts = [e.to_dict() for e in chain.events]
        pattern, conf, conf_lbl, ev_list, expl = evaluate_behavior_pattern(
            events=events_dicts,
            camera_ids=chain.camera_ids,
            track_id=chain.track_id,
            dwell_seconds=chain.max_dwell_seconds,
            reentry_count=chain.reentry_count,
            max_risk_score=chain.risk_score,
        )
        chain.behavior_pattern = pattern
        chain.confidence = conf
        chain.confidence_label = conf_lbl
        chain.evidence = ev_list
        chain.explanation = expl

        # Update lifecycle status based on severity
        if chain.risk_score >= 80 or chain.risk_level == "CRITICAL":
            if chain.status not in ("INCIDENT_CREATED", "RESOLVED"):
                chain.status = "CRITICAL"
        elif chain.risk_score >= 50 or chain.risk_level == "HIGH":
            if chain.status not in ("CRITICAL", "INCIDENT_CREATED", "RESOLVED"):
                chain.status = "ESCALATING"

    # -------------------------------------------------------------------------
    # Ingestion Methods for Real Pipeline Events
    # -------------------------------------------------------------------------

    def ingest_detection(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        centroid: Tuple[float, float],
        bbox: Dict[str, float],
        timestamp: float,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, class_name, current_time=timestamp)
        # Deduplication: append DETECTION once, append tracking MOVEMENT if elapsed or moved
        has_detection = any(e.event_type == "DETECTION" for e in chain.events)
        if not has_detection:
            self._append_event(
                chain=chain,
                event_type="DETECTION",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"class_name": class_name, "centroid": centroid, "bbox": bbox},
            )
            self._refresh_classification(chain)
        elif len(chain.events) == 1 and (timestamp - chain.events[0].timestamp) >= 1.0:
            self._append_event(
                chain=chain,
                event_type="MOVEMENT",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"class_name": class_name, "centroid": centroid, "bbox": bbox},
            )
            self._refresh_classification(chain)
        return chain

    def ingest_perimeter_approach(
        self,
        camera_id: str,
        track_id: int,
        zone_name: str,
        distance_meters: float = 5.0,
        timestamp: Optional[float] = None,
    ) -> BehaviorChain:
        now = timestamp if timestamp is not None else time.time()
        chain = self.get_or_create_chain(camera_id, track_id, current_time=now)
        # Throttled approach event
        has_recent_approach = any(
            e.event_type == "PERIMETER_APPROACH" and (now - e.timestamp) < 5.0
            for e in chain.events
        )
        if not has_recent_approach:
            self._append_event(
                chain=chain,
                event_type="PERIMETER_APPROACH",
                timestamp=now,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"zone_name": zone_name, "distance_meters": round(distance_meters, 1)},
            )
            self._refresh_classification(chain)
        return chain

    def ingest_tripwire_crossing(
        self,
        camera_id: str,
        track_id: int,
        tripwire_name: str,
        direction: str,
        timestamp: float,
        crossing_point: Optional[Tuple[float, float]] = None,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        # Deduplication: record tripwire crossing when direction or tripwire changes or >3s apart
        last_tw = next((e for e in reversed(chain.events) if e.event_type == "TRIPWIRE_CROSSING"), None)
        if not last_tw or (timestamp - last_tw.timestamp) > 2.0 or last_tw.metadata.get("direction") != direction:
            self._append_event(
                chain=chain,
                event_type="TRIPWIRE_CROSSING",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={
                    "tripwire_name": tripwire_name,
                    "direction": direction,
                    "crossing_point": crossing_point,
                },
            )
            self._refresh_classification(chain)
        return chain

    def ingest_zone_entry(
        self,
        camera_id: str,
        track_id: int,
        zone_name: str,
        timestamp: float,
        position: Optional[Tuple[float, float]] = None,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        # Deduplication: do not append 100 times while inside zone
        has_entry = any(
            e.event_type == "RESTRICTED_ZONE_ENTRY" and e.metadata.get("zone_name") == zone_name
            for e in chain.events
        )
        if not has_entry:
            self._append_event(
                chain=chain,
                event_type="RESTRICTED_ZONE_ENTRY",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"zone_name": zone_name, "position": position},
            )
            self._refresh_classification(chain)
        return chain

    def ingest_loitering(
        self,
        camera_id: str,
        track_id: int,
        zone_name: str,
        dwell_seconds: float,
        timestamp: float,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        chain.max_dwell_seconds = max(chain.max_dwell_seconds, dwell_seconds)

        # Look for existing LOITERING event in chain
        existing_loit = next((e for e in reversed(chain.events) if e.event_type == "LOITERING"), None)
        if existing_loit:
            # Update dwell seconds without spamming the chain
            existing_loit.metadata["dwell_seconds"] = round(dwell_seconds, 1)
            existing_loit.timestamp = timestamp
        else:
            self._append_event(
                chain=chain,
                event_type="LOITERING",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"zone_name": zone_name, "dwell_seconds": round(dwell_seconds, 1)},
            )
        self._refresh_classification(chain)
        return chain

    def ingest_reentry(
        self,
        camera_id: str,
        track_id: int,
        reentry_count: int,
        timestamp: float,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        if reentry_count > chain.reentry_count:
            chain.reentry_count = reentry_count
            self._append_event(
                chain=chain,
                event_type="RE_ENTRY",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"reentry_count": reentry_count},
            )
            self._refresh_classification(chain)
        return chain

    def ingest_wrong_direction(
        self,
        camera_id: str,
        track_id: int,
        actual_direction: str,
        expected_direction: str,
        timestamp: float,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        has_wrong_dir = any(e.event_type == "WRONG_DIRECTION" for e in chain.events)
        if not has_wrong_dir:
            self._append_event(
                chain=chain,
                event_type="WRONG_DIRECTION",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"actual_direction": actual_direction, "expected_direction": expected_direction},
            )
            self._refresh_classification(chain)
        return chain

    def ingest_cross_camera_handover(
        self,
        from_camera: str,
        to_camera: str,
        track_id: int,
        correlation_id: str,
        timestamp: float,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(
            from_camera, track_id, correlation_id=correlation_id, current_time=timestamp
        )
        if to_camera not in chain.camera_ids:
            chain.camera_ids.append(to_camera)
        chain.correlation_id = correlation_id
        self.correlation_to_chain[correlation_id] = chain.chain_id
        self.active_chains[(to_camera.strip().lower(), int(track_id))] = chain

        self._append_event(
            chain=chain,
            event_type="CROSS_CAMERA_HANDOVER",
            timestamp=timestamp,
            camera_id=from_camera,
            track_id=track_id,
            metadata={"from_camera": from_camera, "to_camera": to_camera, "correlation_id": correlation_id},
        )
        self._refresh_classification(chain)
        return chain

    def ingest_risk_assessment(
        self,
        camera_id: str,
        track_id: int,
        risk_score: int,
        risk_level: str,
        reasons: List[Dict[str, Any]],
        timestamp: float,
    ) -> BehaviorChain:
        """Integrates authoritative risk assessment directly from existing RiskEngine."""
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        chain.risk_score = risk_score
        chain.risk_level = risk_level
        chain.risk_contributions = reasons

        # Append RISK_ESCALATION milestone if critical or significant step
        if risk_level in ("HIGH", "CRITICAL"):
            has_risk_esc = any(
                e.event_type == "RISK_ESCALATION" and e.metadata.get("risk_level") == risk_level
                for e in chain.events
            )
            if not has_risk_esc:
                self._append_event(
                    chain=chain,
                    event_type="RISK_ESCALATION",
                    timestamp=timestamp,
                    camera_id=camera_id,
                    track_id=track_id,
                    metadata={"risk_score": risk_score, "risk_level": risk_level},
                )
        self._refresh_classification(chain)
        return chain

    def ingest_incident(
        self,
        camera_id: str,
        track_id: int,
        incident_id: str,
        timestamp: float,
    ) -> BehaviorChain:
        chain = self.get_or_create_chain(camera_id, track_id, current_time=timestamp)
        chain.incident_id = incident_id
        chain.status = "INCIDENT_CREATED"
        self.incident_to_chain[incident_id] = chain.chain_id

        has_inc_event = any(e.event_type == "INCIDENT_CREATED" for e in chain.events)
        if not has_inc_event:
            self._append_event(
                chain=chain,
                event_type="INCIDENT_CREATED",
                timestamp=timestamp,
                camera_id=camera_id,
                track_id=track_id,
                metadata={"incident_id": incident_id},
            )
            self._refresh_classification(chain)
        return chain

    # -------------------------------------------------------------------------
    # Retrieval and KPI Queries
    # -------------------------------------------------------------------------

    def get_chain_by_id(self, chain_id: str) -> Optional[BehaviorChain]:
        return self.chains_by_id.get(chain_id)

    def get_chain_for_track(self, camera_id: str, track_id: int) -> Optional[BehaviorChain]:
        key = (camera_id.strip().lower(), int(track_id))
        return self.active_chains.get(key)

    def get_chain_for_incident(self, incident_id: str) -> Optional[BehaviorChain]:
        chain_id = self.incident_to_chain.get(incident_id)
        if chain_id:
            return self.chains_by_id.get(chain_id)
        # Search all chains if not in fast index
        for chain in self.chains_by_id.values():
            if chain.incident_id == incident_id:
                return chain
        return None

    def get_active_chains(self) -> List[BehaviorChain]:
        return list(self.active_chains.values())

    def get_all_chains(self) -> List[BehaviorChain]:
        return list(self.chains_by_id.values())

    def get_kpis(self) -> Dict[str, int]:
        active = self.get_active_chains()
        suspicious = [
            c for c in active
            if c.behavior_pattern not in (PATTERN_UNKNOWN, PATTERN_NORMAL_MOVEMENT)
        ]
        critical = [
            c for c in active
            if c.risk_level == "CRITICAL" or c.status == "CRITICAL"
        ]
        return {
            "active_chains": len(active),
            "suspicious_patterns": len(suspicious),
            "critical_chains": len(critical),
        }

    def reset_session(self) -> None:
        """
        Clears transient session tracks during video loop/reset,
        while strictly preserving historical chains linked to incidents or records.
        """
        for chain in self.active_chains.values():
            if chain.incident_id or len(chain.events) >= 2:
                if chain not in self.historical_chains:
                    self.historical_chains.append(chain)
            chain.status = "RESOLVED"
        self.active_chains.clear()
