import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
import requests

from .circular_buffer import CircularFrameBuffer
from .evidence_writer import EvidenceWriter


class ActiveIncident:
    """Represents an ongoing video evidence capture session."""

    def __init__(
        self,
        incident_id: str,
        camera_id: str,
        track_id: Optional[int],
        class_name: str,
        event_type: str,
        risk_score: int,
        risk_level: str,
        zone_name: str,
        reasons: List[Dict[str, Any]],
        trigger_time: float,
        pre_event_seconds: float,
        post_event_seconds: float,
        pre_frames: List[Tuple[float, np.ndarray]],
    ):
        self.id = incident_id
        self.camera_id = camera_id
        self.track_id = track_id
        self.class_name = class_name
        self.event_type = event_type
        self.risk_score = risk_score
        self.risk_level = risk_level
        self.zone_name = zone_name
        self.reasons = reasons
        self.trigger_time = trigger_time
        self.pre_event_seconds = pre_event_seconds
        self.post_event_seconds = post_event_seconds
        self.target_end_time = trigger_time + post_event_seconds
        self.frames: List[Tuple[float, np.ndarray]] = list(pre_frames)
        self.status = "capturing"
        self.evidence_path: Optional[str] = None
        self.started_at = datetime.fromtimestamp(trigger_time, tz=timezone.utc).isoformat()
        self.ended_at: Optional[str] = None
        self.result_summary: Optional[Dict[str, Any]] = None
        self.sha256: Optional[str] = None
        self.verification_status: str = "PENDING"

    @property
    def incident_id(self) -> str:
        return self.id

    @property
    def severity(self) -> str:
        return self.risk_level

    def add_frame(self, timestamp: float, frame: np.ndarray) -> None:
        self.frames.append((timestamp, frame.copy()))

    def is_complete(self, current_time: float) -> bool:
        return current_time >= self.target_end_time


class IncidentManager:
    """
    Orchestrates real-time incident evidence capture and reconstruction.
    Coordinates the circular buffer, trigger evaluation, post-event collection,
    evidence encoding, SQLite persistence, and WebSocket notifications.
    """

    @staticmethod
    def should_record(risk_level: str) -> bool:
        """Determines if a risk level qualifies for automated circular buffer recording."""
        return str(risk_level).upper() in ("HIGH", "CRITICAL")

    def __init__(
        self,
        circular_buffer: Optional[CircularFrameBuffer] = None,
        evidence_writer: Optional[EvidenceWriter] = None,
        backend_http_url: str = "http://127.0.0.1:8000",
        pre_event_seconds: float = 10.0,
        post_event_seconds: float = 10.0,
        min_risk_level: str = "HIGH",
        cooldown_seconds: float = 15.0,
    ):
        self.circular_buffer = circular_buffer or CircularFrameBuffer(pre_event_seconds=pre_event_seconds)
        self.evidence_writer = evidence_writer or EvidenceWriter(fps=15.0)
        self.backend_http_url = backend_http_url.rstrip("/")
        self.pre_event_seconds = float(pre_event_seconds)
        self.post_event_seconds = float(post_event_seconds)
        self.min_risk_level = min_risk_level.upper()
        self.cooldown_seconds = float(cooldown_seconds)

        self._incident_counter: int = 0
        self.active_incidents: Dict[str, ActiveIncident] = {}  # incident_id -> ActiveIncident
        # Track active recording sessions by (camera_id, track_id) to prevent duplicate incidents
        self._active_track_incident: Dict[Tuple[str, Optional[int]], str] = {}
        # Cooldown memory: (camera_id, track_id) -> (completion_time, risk_level)
        self._track_cooldown: Dict[Tuple[str, Optional[int]], Tuple[float, str]] = {}
        # History of finalized incidents
        self.finalized_incidents: List[Dict[str, Any]] = []

    def _next_incident_id(self) -> str:
        self._incident_counter += 1
        return f"INC-{self._incident_counter:06d}"

    def check_and_trigger(
        self,
        camera_id: str,
        track_id: Optional[int],
        class_name: str,
        risk_score: int,
        risk_level: str,
        reasons: List[Dict[str, Any]],
        zone_name: str,
        event_type: str = "RISK_ASSESSMENT",
        current_time: Optional[float] = None,
        publisher: Optional[Any] = None,
    ) -> Optional[ActiveIncident]:
        """
        Evaluates whether an observed surveillance event triggers incident creation.
        HIGH and CRITICAL levels trigger; MEDIUM and LOW are ignored.
        Prevents frame-by-frame duplicate incident creation for the same active threat.
        """
        now = float(current_time) if current_time is not None else time.time()
        level_up = str(risk_level).upper()

        # Rule 5: Only HIGH and CRITICAL risk levels trigger incident creation
        if level_up not in ("HIGH", "CRITICAL"):
            return None

        key = (camera_id, track_id)

        # Rule 6: Duplicate prevention
        # If an active incident is already recording for this target, extend or skip
        if key in self._active_track_incident:
            active_id = self._active_track_incident[key]
            active_inc = self.active_incidents.get(active_id)
            if active_inc:
                # If escalated to CRITICAL from HIGH, update the incident risk level
                if level_up == "CRITICAL" and active_inc.risk_level != "CRITICAL":
                    active_inc.risk_level = "CRITICAL"
                    active_inc.risk_score = max(active_inc.risk_score, risk_score)
                    active_inc.target_end_time = max(active_inc.target_end_time, now + self.post_event_seconds)
                return None  # Suppress duplicate incident

        # Check cooldown from recently finalized incident on this track
        if key in self._track_cooldown:
            last_time, last_level = self._track_cooldown[key]
            # If within cooldown and not escalating from HIGH to CRITICAL, suppress duplicate
            if (now - last_time < self.cooldown_seconds) and not (last_level != "CRITICAL" and level_up == "CRITICAL"):
                return None

        # Snapshot pre-event frames from circular buffer
        pre_frames = self.circular_buffer.get_pre_event_frames(
            camera_id=camera_id,
            trigger_time=now,
            duration_seconds=self.pre_event_seconds,
        )

        incident_id = self._next_incident_id()

        incident = ActiveIncident(
            incident_id=incident_id,
            camera_id=camera_id,
            track_id=track_id,
            class_name=class_name,
            event_type=event_type,
            risk_score=risk_score,
            risk_level=level_up,
            zone_name=zone_name,
            reasons=reasons,
            trigger_time=now,
            pre_event_seconds=self.pre_event_seconds,
            post_event_seconds=self.post_event_seconds,
            pre_frames=pre_frames,
        )

        self.active_incidents[incident_id] = incident
        self._active_track_incident[key] = incident_id

        # Persist incident in SQLite backend via REST
        self._persist_incident_created(incident)

        # Broadcast WebSocket notification
        if publisher:
            self._publish_incident_created(incident, publisher)

        return incident

    def record_frame(
        self,
        camera_id: str,
        frame: np.ndarray,
        timestamp: Optional[float] = None,
        publisher: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Feeds incoming raw video frames into the camera's circular buffer
        and appends to any active incidents recording for that camera.
        Finalizes incidents when their post-event window completes.
        """
        now = float(timestamp) if timestamp is not None else time.time()

        # Step 1: Ingest into circular buffer
        self.circular_buffer.push(camera_id, frame, now)

        finalized: List[Dict[str, Any]] = []

        # Step 2: Feed to active incidents for this camera
        completed_ids = []
        for inc_id, inc in list(self.active_incidents.items()):
            if inc.camera_id == camera_id:
                inc.add_frame(now, frame)
                if inc.is_complete(now):
                    completed_ids.append(inc_id)

        # Step 3: Finalize completed incidents
        for inc_id in completed_ids:
            inc = self.active_incidents.get(inc_id)
            if inc:
                result = self.finalize_incident(inc, publisher=publisher, current_time=now)
                finalized.append(result)

        return finalized

    def finalize_incident(
        self,
        incident: ActiveIncident,
        publisher: Optional[Any] = None,
        current_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Finalizes an incident:
        1. Encodes MP4 evidence clip with burned-in forensic overlay
        2. Updates SQLite record with evidence path and 'ready' status
        3. Emits WebSocket 'evidence_ready' broadcast
        """
        now = float(current_time) if current_time is not None else time.time()
        incident.ended_at = datetime.fromtimestamp(now, tz=timezone.utc).isoformat()

        metadata = {
            "camera_id": incident.camera_id,
            "track_id": incident.track_id,
            "class_name": incident.class_name,
            "event_type": incident.event_type,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "zone_name": incident.zone_name,
            "reasons": incident.reasons,
        }

        try:
            write_result = self.evidence_writer.write_evidence_clip(
                incident_id=incident.id,
                frames=incident.frames,
                metadata=metadata,
            )
            incident.status = "ready"
            incident.evidence_path = write_result["file_path"]
            incident.sha256 = write_result.get("sha256")
            incident.verification_status = write_result.get("verification_status", "VERIFIED")
            incident.result_summary = write_result
        except Exception as e:
            incident.status = "failed"
            incident.verification_status = "FAILED"
            write_result = {"success": False, "error": str(e)}

        # Update SQLite record in backend
        self._persist_incident_finalized(incident)

        # Broadcast WebSocket notification
        if publisher and incident.status == "ready":
            self._publish_evidence_ready(incident, publisher)

        # Update state tracking
        key = (incident.camera_id, incident.track_id)
        if key in self._active_track_incident:
            del self._active_track_incident[key]
        self._track_cooldown[key] = (now, incident.risk_level)

        if incident.id in self.active_incidents:
            del self.active_incidents[incident.id]

        summary = {
            "id": incident.id,
            "camera_id": incident.camera_id,
            "track_id": incident.track_id,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "status": incident.status,
            "evidence_path": incident.evidence_path,
            "sha256": incident.sha256,
            "verification_status": incident.verification_status,
            "total_frames": len(incident.frames),
            "write_result": write_result,
        }
        self.finalized_incidents.append(summary)

        # Console audit log
        print(f"\n[INCIDENT EVIDENCE READY]")
        print(f"Incident ID:   {incident.id}")
        print(f"Camera ID:     {incident.camera_id}")
        print(f"Track ID:      #{incident.track_id} ({incident.class_name})")
        print(f"Risk Level:    {incident.risk_level} ({incident.risk_score}/100)")
        print(f"Zone:          {incident.zone_name}")
        print(f"Total Frames:  {len(incident.frames)}")
        print(f"Evidence File: {incident.evidence_path}\n")

        return summary

    def _persist_incident_created(self, incident: ActiveIncident) -> None:
        """Calls POST /api/incidents to create SQLite record."""
        payload = {
            "id": incident.id,
            "camera_id": incident.camera_id,
            "track_id": str(incident.track_id) if incident.track_id is not None else None,
            "event_type": incident.event_type,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "zone_name": incident.zone_name,
            "started_at": incident.started_at,
            "pre_event_seconds": incident.pre_event_seconds,
            "post_event_seconds": incident.post_event_seconds,
            "evidence_status": "capturing",
            "metadata": {
                "class_name": incident.class_name,
                "reasons": incident.reasons,
            },
        }
        try:
            requests.post(
                f"{self.backend_http_url}/api/incidents",
                json=payload,
                timeout=3.0,
            )
        except Exception:
            pass  # Non-blocking fallback

    def _persist_incident_finalized(self, incident: ActiveIncident) -> None:
        """Calls PATCH /api/incidents/:id to update evidence status, path, and cryptographic metadata."""
        file_size = incident.result_summary.get("file_size_bytes", 0) if incident.result_summary else 0
        duration = incident.result_summary.get("video_duration_seconds", 0) if incident.result_summary else 0

        metadata_patch = {
            "class_name": incident.class_name,
            "reasons": incident.reasons,
            "sha256": incident.sha256,
            "verification_status": incident.verification_status,
            "file_size": file_size,
            "duration": duration,
        }

        payload = {
            "ended_at": incident.ended_at,
            "evidence_path": incident.evidence_path,
            "evidence_status": incident.status,
            "metadata": metadata_patch,
        }
        try:
            requests.patch(
                f"{self.backend_http_url}/api/incidents/{incident.id}",
                json=payload,
                timeout=3.0,
            )
        except Exception:
            pass

    def _publish_incident_created(self, incident: ActiveIncident, publisher: Any) -> None:
        payload = {
            "id": incident.id,
            "camera_id": incident.camera_id,
            "track_id": incident.track_id,
            "class_name": incident.class_name,
            "event_type": incident.event_type,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "zone_name": incident.zone_name,
            "started_at": incident.started_at,
            "evidence_status": incident.status,
            "reasons": incident.reasons,
        }
        try:
            if hasattr(publisher, "publish"):
                publisher.publish(payload, message_type="incident_created")
        except Exception:
            pass

    def _publish_evidence_ready(self, incident: ActiveIncident, publisher: Any) -> None:
        file_size = incident.result_summary.get("file_size_bytes", 0) if incident.result_summary else 0
        duration = incident.result_summary.get("video_duration_seconds", 0) if incident.result_summary else 0

        payload = {
            "id": incident.id,
            "camera_id": incident.camera_id,
            "track_id": incident.track_id,
            "class_name": incident.class_name,
            "event_type": incident.event_type,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "zone_name": incident.zone_name,
            "started_at": incident.started_at,
            "ended_at": incident.ended_at,
            "evidence_path": incident.evidence_path,
            "evidence_status": incident.status,
            "verification_status": incident.verification_status,
            "sha256": incident.sha256,
            "file_size": file_size,
            "duration": duration,
            "total_frames": len(incident.frames),
        }
        try:
            if hasattr(publisher, "publish"):
                publisher.publish(payload, message_type="evidence_ready")
        except Exception:
            pass
