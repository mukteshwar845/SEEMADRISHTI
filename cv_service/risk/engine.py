"""
SEEMADRISHTI AI - Explainable Threat Assessment & Risk Engine (Phase 6)

Team: IQ100
SIH Problem: SIH26187

Deterministic, transparent, rule-based contextual threat assessment.
Synthesizes:
- Intrusion state (Phase 4 OUTSIDE -> INSIDE)
- Loitering dwell accumulation (Phase 5)
- Re-entry behavior (Phase 4/5)
- Track persistence duration (Phase 3)
- Target class filtering (primarily 'person')

Outputs:
- Score: 0 to 100
- Level: LOW, MEDIUM, HIGH, CRITICAL
- Reasons: Explainable breakdown with code, points, and human-readable description
- Anti-duplicate alert gating (alerts emitted ONLY on level escalation)
"""

import time
import logging
from typing import Dict, List, Tuple, Optional, Any, Set
from dataclasses import dataclass, asdict

import requests

logger = logging.getLogger("RiskEngine")


@dataclass
class RiskReason:
    code: str
    points: int
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RiskAssessment:
    camera_id: str
    track_id: int
    class_name: str
    score: int
    level: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    reasons: List[RiskReason]
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "track_id": self.track_id,
            "class_name": self.class_name,
            "score": self.score,
            "level": self.level,
            "reasons": [r.to_dict() for r in self.reasons],
            "timestamp": self.timestamp,
        }


class TrackRiskContext:
    """Maintains continuous surveillance context for an individual (camera_id, track_id)."""

    def __init__(self, camera_id: str, track_id: int, class_name: str, start_time: float):
        self.camera_id: str = camera_id
        self.track_id: int = track_id
        self.class_name: str = class_name
        self.first_seen_at: float = start_time
        self.last_seen_at: float = start_time

        # Active surveillance conditions
        self.is_inside_zone: bool = False
        self.has_active_intrusion: bool = False
        self.has_active_loitering: bool = False
        self.dwell_seconds: float = 0.0
        self.reentry_count: int = 0

        # State tracking for alerts
        self.last_score: int = 0
        self.last_level: str = "LOW"
        self.last_alerted_level: Optional[str] = None


class RiskEngine:
    """
    Explainable, deterministic threat assessment engine.
    Translates raw surveillance events into a calibrated 0-100 threat score.
    """

    def __init__(
        self,
        intrusion_points: int = 40,
        loitering_points: int = 25,
        reentry_points: int = 15,
        persistence_points: int = 7,
        persistence_min_seconds: float = 10.0,
        max_score: int = 100,
        target_classes: Optional[List[str]] = None,
        api_base_url: str = "http://127.0.0.1:8000/api",
        alert_threshold: str = "HIGH",  # Alerts generated at HIGH and CRITICAL
    ):
        self.intrusion_points: int = int(intrusion_points)
        self.loitering_points: int = int(loitering_points)
        self.reentry_points: int = int(reentry_points)
        self.persistence_points: int = int(persistence_points)
        self.persistence_min_seconds: float = float(persistence_min_seconds)
        self.max_score: int = int(max_score)
        self.target_classes: List[str] = [c.lower() for c in (target_classes or ["person"])]
        self.api_base_url: str = api_base_url
        self.alert_threshold: str = alert_threshold.upper()

        # Severity level order for escalation checks
        self.level_order: Dict[str, int] = {
            "LOW": 0,
            "MEDIUM": 1,
            "HIGH": 2,
            "CRITICAL": 3,
        }

        # Track contexts: (camera_id, track_id) -> TrackRiskContext
        self.track_contexts: Dict[Tuple[str, int], TrackRiskContext] = {}

    def classify_score(self, score: int) -> str:
        """Categorize 0-100 score into standard tactical risk tiers."""
        if score >= 75:
            return "CRITICAL"
        if score >= 50:
            return "HIGH"
        if score >= 25:
            return "MEDIUM"
        return "LOW"

    def get_or_create_context(
        self, camera_id: str, track_id: int, class_name: str, now: float
    ) -> TrackRiskContext:
        key = (camera_id, track_id)
        if key not in self.track_contexts:
            self.track_contexts[key] = TrackRiskContext(
                camera_id=camera_id,
                track_id=track_id,
                class_name=class_name,
                start_time=now,
            )
        ctx = self.track_contexts[key]
        ctx.last_seen_at = now
        return ctx

    def calculate_risk(
        self,
        camera_id: str,
        track_id: int,
        current_time: Optional[float] = None,
    ) -> RiskAssessment:
        """
        Calculates explainable threat score from current active conditions for this track.
        """
        now = current_time if current_time is not None else time.monotonic()
        key = (camera_id, track_id)
        ctx = self.track_contexts.get(key)
        iso_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        if not ctx:
            return RiskAssessment(
                camera_id=camera_id,
                track_id=track_id,
                class_name="person",
                score=0,
                level="LOW",
                reasons=[],
                timestamp=iso_time,
            )

        # Non-target classes produce 0 risk points
        if ctx.class_name.lower() not in self.target_classes:
            return RiskAssessment(
                camera_id=camera_id,
                track_id=track_id,
                class_name=ctx.class_name,
                score=0,
                level="LOW",
                reasons=[],
                timestamp=iso_time,
            )

        score = 0
        reasons: List[RiskReason] = []

        # 1. Intrusion Condition (+40 points)
        # Evaluated while the target is inside a restricted zone with an observed breach
        if ctx.is_inside_zone and ctx.has_active_intrusion:
            pts = self.intrusion_points
            score += pts
            reasons.append(
                RiskReason(
                    code="INTRUSION",
                    points=pts,
                    description="Restricted-zone intrusion",
                )
            )

        # 2. Loitering Condition (+25 points)
        # Evaluated when continuous dwell time exceeds configured threshold
        if ctx.is_inside_zone and ctx.has_active_loitering:
            pts = self.loitering_points
            score += pts
            reasons.append(
                RiskReason(
                    code="LOITERING",
                    points=pts,
                    description=f"Abnormal dwell time ({ctx.dwell_seconds:.1f}s)",
                )
            )

        # 3. Re-entry Condition (+15 points per re-entry, capped at 30)
        # Evaluated when target enters, exits, and re-enters zone
        if ctx.is_inside_zone and ctx.reentry_count > 0:
            pts = min(ctx.reentry_count * self.reentry_points, 30)
            score += pts
            reasons.append(
                RiskReason(
                    code="REENTRY",
                    points=pts,
                    description=f"Repeated zone entry ({ctx.reentry_count}x)",
                )
            )

        # 4. Persistent Presence (+7 points)
        # Evaluated when track has maintained continuous tracking presence > min threshold
        tracking_duration = now - ctx.first_seen_at
        if tracking_duration >= self.persistence_min_seconds:
            pts = self.persistence_points
            score += pts
            reasons.append(
                RiskReason(
                    code="PERSISTENCE",
                    points=pts,
                    description=f"Persistent tracked presence ({int(tracking_duration)}s)",
                )
            )

        # Cap score at configured max (100)
        score = min(score, self.max_score)
        level = self.classify_score(score)

        ctx.last_score = score
        ctx.last_level = level

        return RiskAssessment(
            camera_id=camera_id,
            track_id=track_id,
            class_name=ctx.class_name,
            score=score,
            level=level,
            reasons=reasons,
            timestamp=iso_time,
        )

    def evaluate_track(
        self,
        camera_id: str,
        track: Dict[str, Any],
        is_inside_zone: bool,
        has_intrusion: bool,
        is_loitering: bool,
        dwell_seconds: float,
        reentry_count: int,
        current_time: Optional[float] = None,
        publisher: Optional[Any] = None,
    ) -> Tuple[RiskAssessment, bool]:
        """
        Updates track state and assesses risk.
        Returns:
            Tuple[RiskAssessment, bool]: assessment and whether an alert was triggered.
        """
        now = current_time if current_time is not None else time.monotonic()
        tid = track["track_id"]
        cname = track.get("class_name", "person")

        ctx = self.get_or_create_context(camera_id, tid, cname, now)
        ctx.is_inside_zone = is_inside_zone
        ctx.has_active_intrusion = has_intrusion
        ctx.has_active_loitering = is_loitering
        ctx.dwell_seconds = dwell_seconds
        ctx.reentry_count = reentry_count

        assessment = self.calculate_risk(camera_id, tid, current_time=now)

        # Check escalation / alert policy
        alert_triggered = False
        current_rank = self.level_order.get(assessment.level, 0)
        threshold_rank = self.level_order.get(self.alert_threshold, 2)  # default HIGH

        if current_rank >= threshold_rank:
            # Check if this is an escalation from previous alerted level
            prev_alerted_rank = (
                self.level_order.get(ctx.last_alerted_level, -1)
                if ctx.last_alerted_level
                else -1
            )
            if current_rank > prev_alerted_rank:
                alert_triggered = True
                ctx.last_alerted_level = assessment.level
                self._log_risk_assessment(assessment)
                self._persist_and_publish_alert(assessment, publisher)

        # Always publish real-time risk assessment via WebSocket
        is_conn = getattr(publisher, "is_connected", False) or getattr(publisher, "_connected", False)
        if publisher and is_conn:
            try:
                publisher.publish(assessment.to_dict(), message_type="risk_assessment")
            except Exception as e:
                logger.debug(f"WS risk publisher error: {e}")

        return assessment, alert_triggered

    def evaluate_signal(
        self,
        signal: Dict[str, Any],
        current_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Directly evaluates a structured surveillance signal dictionary.
        Input format:
        {
            "camera_id": "cam-01",
            "track_id": 17,
            "class_name": "person",
            "intrusion": true,
            "loitering": true,
            "dwell_seconds": 35.2,
            "reentry_count": 1,
            "persistent_track": true
        }
        Returns:
        {
            "score": 87,
            "level": "CRITICAL",
            "reasons": [ ... ]
        }
        """
        now = current_time if current_time is not None else time.monotonic()
        cid = str(signal.get("camera_id", "cam-01"))
        tid = int(signal.get("track_id", 0))
        cname = str(signal.get("class_name", "person"))
        has_intrus = bool(signal.get("intrusion", False))
        is_loit = bool(signal.get("loitering", False))
        dwell_sec = float(signal.get("dwell_seconds", 0.0))
        reentry_ct = int(signal.get("reentry_count", 0))
        is_persistent = bool(signal.get("persistent_track", False))

        ctx = self.get_or_create_context(cid, tid, cname, now)
        ctx.is_inside_zone = has_intrus or is_loit or dwell_sec > 0
        ctx.has_active_intrusion = has_intrus
        ctx.has_active_loitering = is_loit
        ctx.dwell_seconds = dwell_sec
        ctx.reentry_count = reentry_ct
        if is_persistent and (now - ctx.first_seen_at) < self.persistence_min_seconds:
            ctx.first_seen_at = now - self.persistence_min_seconds

        assessment = self.calculate_risk(cid, tid, current_time=now)
        return {
            "score": assessment.score,
            "level": assessment.level,
            "reasons": [r.to_dict() for r in assessment.reasons],
        }

    def cleanup_inactive_tracks(
        self, camera_id: str, active_track_ids: Set[int], max_idle_seconds: float = 5.0, current_time: Optional[float] = None
    ) -> int:
        """Cleans up risk state for permanently removed tracks."""
        now = current_time if current_time is not None else time.monotonic()
        keys_to_remove = []
        for (cam, tid), ctx in self.track_contexts.items():
            if cam.lower() == camera_id.lower():
                if tid not in active_track_ids and (now - ctx.last_seen_at) > max_idle_seconds:
                    keys_to_remove.append((cam, tid))

        for k in keys_to_remove:
            del self.track_contexts[k]
        return len(keys_to_remove)

    def _log_risk_assessment(self, assessment: RiskAssessment) -> None:
        """Structured console logging upon meaningful risk escalation."""
        print(f"\n[RISK ASSESSMENT]")
        print(f"Camera: {assessment.camera_id}")
        print(f"Track:  #{assessment.track_id} ({assessment.class_name})")
        print(f"Score:  {assessment.score} / {self.max_score}")
        print(f"Level:  {assessment.level}")
        print(f"Reasons:")
        for r in assessment.reasons:
            print(f"  - {r.code} (+{r.points}): {r.description}")
        print(f"Timestamp: {assessment.timestamp}\n")

    def _persist_and_publish_alert(self, assessment: RiskAssessment, publisher: Optional[Any]) -> None:
        """Persists risk event and alert to SQLite and broadcasts to dashboard."""
        ts_int = int(time.time() * 1000)
        reasons_summary = ", ".join([r.description.lower() for r in assessment.reasons]) or "contextual threat indicators"
        title = f"{assessment.level.capitalize()} Threat Assessment"
        reason = f"Track #{assessment.track_id} classified as {assessment.level} risk ({assessment.score}/100): {reasons_summary}"

        event_payload = {
            "id": f"evt-risk-{ts_int}",
            "camera_id": assessment.camera_id,
            "event_type": "RISK_ASSESSMENT",
            "severity": "High",  # SQLite schema constraint allows High, Medium, Low
            "object_id": str(assessment.track_id),
            "timestamp": assessment.timestamp,
            "metadata": {
                "risk_score": assessment.score,
                "risk_level": assessment.level,
                "reasons": [r.to_dict() for r in assessment.reasons],
                "class_name": assessment.class_name,
            },
        }

        alert_payload = {
            "id": f"alt-risk-{ts_int}",
            "event_id": event_payload["id"],
            "camera_id": assessment.camera_id,
            "severity": "High",
            "title": title,
            "reason": reason,
            "acknowledged": False,
            "timestamp": assessment.timestamp,
        }

        # 1. Persist to SQLite REST Backend
        try:
            requests.post(f"{self.api_base_url}/events", json=event_payload, timeout=2.0)
            requests.post(f"{self.api_base_url}/alerts", json=alert_payload, timeout=2.0)
        except Exception as e:
            logger.debug(f"REST persistence error (server offline?): {e}")

        # 2. Publish to WebSocket gateway
        is_conn = getattr(publisher, "is_connected", False) or getattr(publisher, "_connected", False)
        if publisher and is_conn:
            try:
                publisher.publish(event_payload, message_type="event_created")
                publisher.publish(alert_payload, message_type="alert_created")
            except Exception as e:
                logger.debug(f"WS publisher error: {e}")
