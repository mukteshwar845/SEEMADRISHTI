"""
SEEMADRISHTI AI - Cross-Camera Target Journey Engine (Phase 21)

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Principles:
1. Reconstruct multi-camera target journeys strictly from real telemetry, events, and handovers.
2. Verified handovers required: Unverified camera jumps are rejected, never assumed.
3. Strictly chronological ordering based on authentic timestamps.
4. Transparent reporting: "INSUFFICIENT DATA" when handover evidence is missing.
5. No false identity claims: uses "TRACK CONTINUITY", "CORRELATED TARGET", "VERIFIED HANDOVER".
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from cv_service.correlation.camera_topology import CameraTopology


class TargetJourneyEngine:
    """Reconstructs evidence-based multi-camera journeys for tracked surveillance targets."""

    def __init__(self, topology: Optional[CameraTopology] = None):
        self.topology = topology or CameraTopology()

    def build_journey(
        self,
        track_id: int,
        events: Optional[List[Dict[str, Any]]] = None,
        behavior_chains: Optional[List[Dict[str, Any]]] = None,
        correlated_incidents: Optional[List[Dict[str, Any]]] = None,
        incidents: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Builds a verified chronological target journey for a track ID.
        Requires authentic cross-camera handover evidence to establish multi-camera transitions.
        """
        events = events or []
        behavior_chains = behavior_chains or []
        correlated_incidents = correlated_incidents or []
        incidents = incidents or []

        tid = int(track_id)

        # 1. Collect all observations and events linked to this target
        target_events = []
        matching_chain = None
        matched_correlation_id = None
        target_class = "person"
        max_risk_score = 0
        max_risk_level = "LOW"

        # Check behavior chains
        for ch in behavior_chains:
            if ch.get("track_id") == tid:
                matching_chain = ch
                matched_correlation_id = ch.get("correlation_id")
                target_class = ch.get("class_name", target_class)
                max_risk_score = max(max_risk_score, ch.get("risk_score", 0))
                if ch.get("risk_level"):
                    max_risk_level = ch["risk_level"]
                for ev in ch.get("events", []):
                    target_events.append(ev)
                break

        # Check raw events
        for ev in events:
            ev_tid = ev.get("track_id") or ev.get("object_id")
            try:
                if ev_tid is not None and int(str(ev_tid).replace("#", "").replace("TRK-", "")) == tid:
                    target_events.append(ev)
                    meta = ev.get("metadata", {})
                    if meta.get("class_name"):
                        target_class = meta["class_name"]
            except (ValueError, TypeError):
                pass

        # Check correlated incidents if matching correlation ID
        matched_corr = None
        if matched_correlation_id:
            for corr in correlated_incidents:
                if corr.get("id") == matched_correlation_id:
                    matched_corr = corr
                    break
        else:
            # Check if any correlation contains this track
            for corr in correlated_incidents:
                for obs in corr.get("observations", []):
                    try:
                        if int(str(obs.get("track_id", -1)).replace("#", "").replace("TRK-", "")) == tid:
                            matched_corr = corr
                            matched_correlation_id = corr.get("id")
                            break
                    except (ValueError, TypeError):
                        pass
                if matched_corr:
                    break

        if matched_corr:
            max_risk_score = max(max_risk_score, matched_corr.get("correlation_score", 0))
            if matched_corr.get("correlation_level"):
                max_risk_level = matched_corr["correlation_level"]

        # Check incidents table
        for inc in incidents:
            inc_tid = inc.get("track_id")
            try:
                if inc_tid is not None and int(str(inc_tid).replace("#", "").replace("TRK-", "")) == tid:
                    max_risk_score = max(max_risk_score, inc.get("risk_score", 0))
                    if inc.get("risk_level"):
                        max_risk_level = inc["risk_level"]
                    if inc.get("class_name"):
                        target_class = inc["class_name"]
            except (ValueError, TypeError):
                pass

        # If zero events found for track
        if not target_events and not matching_chain:
            return {
                "track_id": tid,
                "class": target_class,
                "first_seen": None,
                "last_seen": None,
                "duration_seconds": 0,
                "risk_score": 0,
                "risk_level": "LOW",
                "camera_path": [],
                "unique_cameras": [],
                "handovers": [],
                "observed_events": [],
                "chronological_events": [],
                "correlation_id": None,
                "is_complete": False,
                "insufficient_data": True,
                "status_note": f"INSUFFICIENT DATA: Target #{tid} not found in recent surveillance telemetry.",
            }

        # 2. Normalize and sort events strictly chronologically
        sorted_steps = []
        seen_keys = set()

        for ev in target_events:
            ts = ev.get("timestamp", 0)
            epoch = 0.0
            iso_str = None

            if isinstance(ts, (int, float)):
                epoch = float(ts)
                iso_str = datetime.fromtimestamp(epoch, timezone.utc).isoformat().replace("+00:00", "Z")
            elif isinstance(ts, str):
                iso_str = ts
                try:
                    epoch = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                except Exception:
                    epoch = 0.0

            cam_id = (ev.get("camera_id") or "cam-01").lower()
            ev_type = (ev.get("event_type") or "DETECTION").upper()
            meta = ev.get("metadata", {})

            key = (cam_id, ev_type, round(epoch, 2))
            if key not in seen_keys:
                seen_keys.add(key)
                sorted_steps.append({
                    "camera_id": cam_id,
                    "timestamp": iso_str,
                    "timestamp_epoch": epoch,
                    "event": ev_type,
                    "description": self._format_description(ev_type, meta, cam_id),
                    "metadata": meta,
                })

        sorted_steps.sort(key=lambda s: s["timestamp_epoch"])

        first_seen = sorted_steps[0]["timestamp"] if sorted_steps else None
        last_seen = sorted_steps[-1]["timestamp"] if sorted_steps else None
        duration = 0
        if sorted_steps and len(sorted_steps) > 1:
            duration = max(0, int(sorted_steps[-1]["timestamp_epoch"] - sorted_steps[0]["timestamp_epoch"]))

        # 3. Detect and Validate Camera Handovers
        # A camera handover requires authentic evidence:
        # A) Explicit CROSS_CAMERA_HANDOVER event, or
        # B) Record in correlated_incidents, or
        # C) Topological connectivity + valid travel time window
        handovers = []
        unique_cameras_in_order = []
        current_cam = None

        for step in sorted_steps:
            cid = step["camera_id"]
            if cid != current_cam:
                if current_cam is not None:
                    # Transition from current_cam to cid
                    t_from = current_cam
                    t_to = cid
                    ts_step = step["timestamp"]
                    delta_t = 0.0

                    # Find previous step on current_cam
                    prev_steps = [s for s in sorted_steps if s["camera_id"] == current_cam and s["timestamp_epoch"] <= step["timestamp_epoch"]]
                    if prev_steps:
                        delta_t = step["timestamp_epoch"] - prev_steps[-1]["timestamp_epoch"]

                    # Check validity via topology
                    is_connected = self.topology.are_cameras_connected(t_from, t_to)
                    timely, time_msg = self.topology.is_transition_timely(t_from, t_to, delta_t) if is_connected else (False, "Not connected")

                    # Check explicit handover record
                    has_explicit_handover = any(
                        s["event"] == "CROSS_CAMERA_HANDOVER" and
                        (s["metadata"].get("from_camera", "").lower() == t_from and s["metadata"].get("to_camera", "").lower() == t_to)
                        for s in sorted_steps
                    )

                    # Handover confidence calculation
                    handover_conf = None
                    if matched_corr and matched_corr.get("correlation_score"):
                        handover_conf = round(matched_corr["correlation_score"] / 100.0, 2)
                    elif has_explicit_handover:
                        handover_conf = 0.85
                    elif is_connected and timely:
                        handover_conf = 0.75

                    is_verified = (has_explicit_handover or (is_connected and timely) or (matched_corr is not None))

                    handovers.append({
                        "from_camera": t_from,
                        "to_camera": t_to,
                        "timestamp": ts_step,
                        "temporal_gap_seconds": round(delta_t, 1),
                        "confidence": handover_conf,
                        "confidence_percent": int(handover_conf * 100) if handover_conf is not None else None,
                        "confidence_display": f"{int(handover_conf * 100)}%" if handover_conf is not None else "INSUFFICIENT DATA",
                        "verified": is_verified,
                        "reason": f"Corridor transition {t_from.upper()} ➔ {t_to.upper()} ({delta_t:.1f}s)" if is_verified else f"Unverified transit ({time_msg})",
                    })

                unique_cameras_in_order.append(cid)
                current_cam = cid

        # Determine journey completeness
        has_multiple_cameras = len(unique_cameras_in_order) > 1
        all_handovers_verified = len(handovers) > 0 and all(h["verified"] for h in handovers)

        if not has_multiple_cameras:
            is_complete = True
            status_note = "Single-sector surveillance journey recorded."
        elif all_handovers_verified:
            is_complete = True
            status_note = "Complete cross-camera journey verified via corridor handover records."
        else:
            is_complete = False
            status_note = "INSUFFICIENT DATA FOR COMPLETE JOURNEY: Corridors traversed without confirmed handover record."

        # Format camera path sequence for UI
        camera_path = [
            {
                "camera_id": s["camera_id"],
                "camera_name": s["camera_id"].upper(),
                "timestamp": s["timestamp"],
                "event": s["event"],
                "description": s["description"],
            }
            for s in sorted_steps
        ]

        return {
            "track_id": tid,
            "class": target_class,
            "first_seen": first_seen,
            "last_seen": last_seen,
            "duration_seconds": duration,
            "risk_score": max_risk_score,
            "risk_level": max_risk_level,
            "camera_path": camera_path,
            "unique_cameras": unique_cameras_in_order,
            "handovers": handovers,
            "observed_events": sorted_steps,
            "chronological_events": sorted_steps,
            "correlation_id": matched_correlation_id,
            "is_complete": is_complete,
            "insufficient_data": False,
            "status_note": status_note,
        }

    def _format_description(self, event_type: str, metadata: Dict[str, Any], camera_id: str) -> str:
        cam_upper = camera_id.upper()
        if event_type == "DETECTION":
            return f"Detected target on {cam_upper}"
        elif event_type == "PERIMETER_APPROACH":
            return f"Approaching perimeter boundary on {cam_upper}"
        elif event_type == "TRIPWIRE_CROSSING":
            d = metadata.get("direction", "IN")
            return f"Crossed perimeter tripwire ({d}) on {cam_upper}"
        elif event_type == "RESTRICTED_ZONE_ENTRY":
            z = metadata.get("zone_name", "Restricted Area")
            return f"Breached geofence into {z} on {cam_upper}"
        elif event_type == "LOITERING":
            dw = metadata.get("dwell_seconds", 0)
            return f"Loitering dwell accumulated ({dw}s) on {cam_upper}"
        elif event_type == "RE_ENTRY":
            rc = metadata.get("reentry_count", 1)
            return f"Re-entered monitored zone (cycle #{rc}) on {cam_upper}"
        elif event_type == "CROSS_CAMERA_HANDOVER":
            fc = metadata.get("from_camera", "").upper()
            tc = metadata.get("to_camera", "").upper()
            return f"Corridor transit handover: {fc} ➔ {tc}"
        return f"{event_type.replace('_', ' ')} observed on {cam_upper}"
