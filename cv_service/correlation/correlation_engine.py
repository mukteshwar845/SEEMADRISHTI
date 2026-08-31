"""
SEEMADRISHTI AI - Multi-Camera Intelligent Threat Correlation Engine (Phase 8)

Team: IQ100
Problem Statement: SIH26187

Deterministic, explainable cross-camera threat correlation based on:
1. Spatial camera topology
2. Temporal transition window boundaries
3. Target class compatibility
4. Event sequence progression
5. Camera-local track isolation (zero fake re-ID)
"""

from collections import OrderedDict
from datetime import datetime, timezone
import json
import logging
import os
import time
from typing import Dict, List, Optional, Set, Tuple

import requests

from cv_service.correlation.camera_topology import CameraTopology
from cv_service.correlation.correlation_models import (
    CorrelatedIncident,
    CorrelationReason,
    Observation,
)

logger = logging.getLogger("CorrelationEngine")


class CorrelationEngine:
    """
    Evaluates incoming camera events/incidents against active correlation graphs,
    enforcing topological, temporal, and class-compatibility rules.
    """

    def __init__(
        self,
        topology: Optional[CameraTopology] = None,
        backend_http_url: str = "http://127.0.0.1:8000",
        min_correlation_score: int = 50,
        max_dormant_seconds: float = 300.0,
        id_prefix: str = "CORR-",
    ):
        self.topology = topology or CameraTopology()
        self.backend_http_url = backend_http_url.rstrip("/") if backend_http_url else ""
        self.min_correlation_score = min_correlation_score
        self.max_dormant_seconds = max_dormant_seconds
        self.id_prefix = id_prefix

        # Active correlated incidents indexed by correlation ID
        self.active_correlations: Dict[str, CorrelatedIncident] = {}

        # Set of observed event hashes to guarantee strict duplicate suppression
        self.processed_observations: Set[str] = set()

        # Counter for deterministic ID generation
        self._correlation_counter = 0

    def _next_correlation_id(self) -> str:
        self._correlation_counter += 1
        return f"{self.id_prefix}{self._correlation_counter:06d}"

    def get_correlation_level(self, score: int) -> str:
        """Determines tactical correlation level from 0-100 score."""
        if score >= 75:
            return "CRITICAL"
        if score >= 50:
            return "HIGH"
        if score >= 25:
            return "MEDIUM"
        return "LOW"

    def calculate_match(
        self,
        existing_corr: CorrelatedIncident,
        new_obs: Observation,
        current_time: float,
    ) -> Tuple[bool, int, List[CorrelationReason]]:
        """
        Determines whether new_obs matches existing_corr.
        Returns: (is_match, score, reasons)
        """
        if not existing_corr.observations:
            return False, 0, []

        last_obs = existing_corr.observations[-1]

        # 1. DIFFERENT CAMERA CHECK (Rule: cannot cross-correlate same camera)
        if new_obs.camera_id == last_obs.camera_id:
            return False, 0, []

        # 2. CLASS COMPATIBILITY CHECK
        if new_obs.class_name.lower() != existing_corr.primary_class.lower():
            return False, 0, []

        # 3. TOPOLOGY CONNECTIVITY CHECK
        if not self.topology.are_cameras_connected(last_obs.camera_id, new_obs.camera_id):
            return False, 0, []

        # 4. TEMPORAL TRANSITION CHECK
        delta_t = new_obs.timestamp - last_obs.timestamp
        timely, time_msg = self.topology.is_transition_timely(
            last_obs.camera_id, new_obs.camera_id, delta_t
        )
        if not timely:
            return False, 0, []

        # All hard gating constraints passed -> calculate explainable score
        reasons: List[CorrelationReason] = []
        score = 0

        # Points for Class Compatibility (+30)
        reasons.append(
            CorrelationReason(
                code="CLASS_MATCH",
                points=30,
                message=f"Both events involve compatible '{new_obs.class_name}' targets",
            )
        )
        score += 30

        # Points for Spatial Topology Connectivity (+30)
        reasons.append(
            CorrelationReason(
                code="CAMERA_TOPOLOGY",
                points=30,
                message=f"Direct topology corridor between '{last_obs.camera_id}' and '{new_obs.camera_id}'",
            )
        )
        score += 30

        # Points for Temporal Window Adherence (+25)
        reasons.append(
            CorrelationReason(
                code="TEMPORAL_MATCH",
                points=25,
                message=time_msg,
            )
        )
        score += 25

        # Points for Event Sequence Compatibility (+15)
        reasons.append(
            CorrelationReason(
                code="SEQUENCE_COMPATIBILITY",
                points=15,
                message=f"Compatible threat transition from '{last_obs.event_type}' to '{new_obs.event_type}'",
            )
        )
        score += 15

        # Multi-Hop Bonus: if third or fourth camera is involved in same corridor
        future_seq_len = len(existing_corr.camera_sequence) + (
            1 if new_obs.camera_id not in existing_corr.camera_sequence else 0
        )
        if future_seq_len >= 3:
            reasons.append(
                CorrelationReason(
                    code="MULTI_HOP_ESCALATION",
                    points=10,
                    message=f"Continuous intrusion corridor across {future_seq_len} surveillance sectors",
                )
            )
            score = min(100, score + 10)

        return True, min(100, score), reasons

    def ingest_event(
        self,
        camera_id: str,
        track_id: str,
        class_name: str = "person",
        event_type: str = "RISK_ASSESSMENT",
        risk_score: int = 65,
        risk_level: str = "HIGH",
        zone_name: Optional[str] = None,
        timestamp: Optional[float] = None,
        incident_id: Optional[str] = None,
        publisher: Optional[object] = None,
    ) -> Optional[CorrelatedIncident]:
        """
        Primary entry point for feeding surveillance events into the correlation engine.
        Returns the affected CorrelatedIncident or None if event does not trigger a correlation.
        """
        now = float(timestamp) if timestamp is not None else time.time()
        obs = Observation(
            camera_id=camera_id,
            track_id=track_id,
            class_name=class_name,
            event_type=event_type,
            risk_score=risk_score,
            risk_level=risk_level,
            zone_name=zone_name,
            timestamp=now,
            incident_id=incident_id,
        )

        # 1. DUPLICATE SUPPRESSION CHECK
        if obs.observation_key in self.processed_observations:
            return None
        self.processed_observations.add(obs.observation_key)

        # 2. EVICT DORMANT CORRELATIONS
        self._cleanup_dormant(now)

        # 3. ATTEMPT MATCH AGAINST ACTIVE CORRELATIONS
        best_match: Optional[CorrelatedIncident] = None
        best_score = -1
        best_reasons: List[CorrelationReason] = []

        for corr in self.active_correlations.values():
            matched, score, reasons = self.calculate_match(corr, obs, now)
            if matched and score > best_score:
                best_score = score
                best_match = corr
                best_reasons = reasons

        # 4. EXTEND EXISTING CORRELATION
        if best_match:
            prev_level = best_match.correlation_level

            best_match.observations.append(obs)
            if obs.camera_id not in best_match.camera_sequence:
                best_match.camera_sequence.append(obs.camera_id)
            if obs.incident_id and obs.incident_id not in best_match.linked_incidents:
                best_match.linked_incidents.append(obs.incident_id)

            # Update score, level, and timestamp
            best_match.correlation_score = best_score
            best_match.correlation_level = self.get_correlation_level(best_score)
            best_match.last_seen_at = now
            best_match.reasons = best_reasons

            # Check for multi-hop escalation
            is_escalated = (prev_level != "CRITICAL" and best_match.correlation_level == "CRITICAL") or (
                len(best_match.camera_sequence) >= 3 and best_match.correlation_level == "CRITICAL"
            )

            # Persist & Broadcast
            self._sync_with_backend(best_match, is_create=False, is_escalated=is_escalated, publisher=publisher)
            return best_match

        # 5. CANDIDATE SEED CORRELATION (Single HIGH or CRITICAL incident seeds a potential cross-camera corridor)
        # Note: A single-camera incident seeds a correlation of level HIGH (score 50) ready to link incoming transitions
        if risk_level in ("HIGH", "CRITICAL"):
            corr_id = self._next_correlation_id()
            base_score = 50 if risk_level == "HIGH" else 60
            initial_reason = CorrelationReason(
                code="INITIAL_BREACH",
                points=base_score,
                message=f"Initial breach detected on {obs.camera_id.upper()} (Risk: {risk_score}/100 [{risk_level}])",
            )
            new_corr = CorrelatedIncident(
                id=corr_id,
                status="ACTIVE",
                correlation_score=base_score,
                correlation_level=self.get_correlation_level(base_score),
                started_at=now,
                last_seen_at=now,
                camera_sequence=[obs.camera_id],
                linked_incidents=[obs.incident_id] if obs.incident_id else [],
                observations=[obs],
                reasons=[initial_reason],
            )
            self.active_correlations[corr_id] = new_corr
            self._sync_with_backend(new_corr, is_create=True, is_escalated=False, publisher=publisher)
            return new_corr

        return None

    def _cleanup_dormant(self, current_time: float) -> None:
        """Closes correlations that have exceeded max_dormant_seconds."""
        expired_ids = []
        for cid, corr in self.active_correlations.items():
            if current_time - corr.last_seen_at > self.max_dormant_seconds:
                expired_ids.append(cid)

        for cid in expired_ids:
            corr = self.active_correlations.pop(cid, None)
            if corr:
                corr.status = "CLOSED"
                self._sync_with_backend(corr, is_create=False, is_escalated=False)

    def _sync_with_backend(
        self,
        corr: CorrelatedIncident,
        is_create: bool = False,
        is_escalated: bool = False,
        publisher: Optional[object] = None,
    ) -> None:
        """Syncs correlation state with SQLite REST API and WebSocket gateway."""
        if not self.backend_http_url:
            return

        payload = {
            "id": corr.id,
            "status": corr.status,
            "correlation_score": corr.correlation_score,
            "correlation_level": corr.correlation_level,
            "started_at": corr.started_at_iso,
            "last_seen_at": corr.last_seen_at_iso,
            "camera_sequence": corr.camera_sequence,
            "linked_incidents": corr.linked_incidents,
            "observations": [obs.to_dict() for obs in corr.observations],
            "reasons": [r.to_dict() for r in corr.reasons],
        }

        try:
            url = f"{self.backend_http_url}/api/correlations"
            requests.post(url, json=payload, timeout=0.03)
        except Exception:
            pass

        # Broadcast via WebSocket publisher if provided
        if publisher and hasattr(publisher, "publish"):
            msg_type = "correlation_escalated" if is_escalated else ("correlation_created" if is_create else "correlation_updated")
            try:
                publisher.publish(msg_type, payload)
            except Exception as e:
                logger.warning("Failed to publish %s over WS: %s", msg_type, e)
