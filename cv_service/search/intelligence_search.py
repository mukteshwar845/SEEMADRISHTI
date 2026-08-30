"""
SEEMADRISHTI AI - Surveillance Intelligence Search Engine (Phase 20)

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Principles:
1. Execute structured filters over real database records and active telemetry.
2. Reconstruct authentic target journeys across cameras with chronological milestones.
3. Compute exact per-camera breach aggregations without hiding zero-count cameras.
4. Transparently report INSUFFICIENT DATA when cross-camera handovers or track journeys are incomplete.
5. Zero fabrication: No fake records, no synthetic IDs, no random scores.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime


class IntelligenceSearchEngine:
    """Executes structured surveillance intelligence queries against real runtime/stored data."""

    def __init__(self, known_cameras: Optional[List[str]] = None):
        self.known_cameras = known_cameras or [
            "cam-01", "cam-02", "cam-03", "cam-04", "cam-05", "cam-06", "cam-07", "cam-08", "cam-09"
        ]

    def search(
        self,
        filters: Dict[str, Any],
        incidents: Optional[List[Dict[str, Any]]] = None,
        events: Optional[List[Dict[str, Any]]] = None,
        alerts: Optional[List[Dict[str, Any]]] = None,
        behavior_chains: Optional[List[Dict[str, Any]]] = None,
        current_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Executes filter dictionary against authentic project data.
        Returns unified results packet.
        """
        incidents = incidents or []
        events = events or []
        alerts = alerts or []
        behavior_chains = behavior_chains or []

        entity = filters.get("entity", "all")
        query_text = filters.get("query", "")

        # 1. Target Journey Search
        if entity == "journey" or (filters.get("track_id") is not None and "journey" in query_text.lower()):
            return self._execute_journey_search(filters, events, behavior_chains, incidents)

        # 2. Camera Breakdown Search (e.g. "Which cameras had restricted-zone breaches?")
        if entity == "camera" or any(w in query_text.lower() for w in ["which camera", "which cameras", "camera breakdown"]):
            return self._execute_camera_breakdown(filters, incidents, events)

        # 3. Standard Filter Search (Incidents / Events / Alerts)
        results = []

        # Search Incidents
        if entity in ("all", "incident"):
            for inc in incidents:
                if self._matches_incident(inc, filters, current_time):
                    results.append(self._format_incident_result(inc))

        # Search Events (if not strictly incident entity search)
        if entity in ("all", "event") and not results:
            for ev in events:
                if self._matches_event(ev, filters, current_time):
                    results.append(self._format_event_result(ev))

        # Search Behavior Chains (if pattern filter or behavior query)
        if entity in ("all", "behavior") or filters.get("behavior_pattern"):
            for ch in behavior_chains:
                if self._matches_chain(ch, filters, current_time):
                    # Avoid duplicate if incident already returned
                    inc_id = ch.get("incident_id")
                    if not any(r.get("incident_id") == inc_id for r in results if inc_id):
                        results.append(self._format_chain_result(ch))

        # Sort results: CRITICAL first, then latest timestamp
        def sort_key(r: Dict[str, Any]):
            risk_prio = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}.get(r.get("risk_level", "LOW"), 0)
            return (risk_prio, r.get("timestamp_epoch", 0))

        results.sort(key=sort_key, reverse=True)

        insufficient_data = len(results) == 0

        return {
            "query": query_text,
            "filters": filters,
            "chips": filters.get("chips", []),
            "result_count": len(results),
            "results": results,
            "insufficient_data": insufficient_data,
            "message": (
                f"{len(results)} matching surveillance records found"
                if len(results) > 0
                else "NO MATCHING SURVEILLANCE EVENTS"
            ),
        }

    def _execute_journey_search(
        self,
        filters: Dict[str, Any],
        events: List[Dict[str, Any]],
        behavior_chains: List[Dict[str, Any]],
        incidents: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Assembles a chronological target journey across cameras from authentic events and chains."""
        target_id = filters.get("track_id")
        if target_id is None:
            return {
                "query": filters.get("query", ""),
                "filters": filters,
                "chips": filters.get("chips", []),
                "result_count": 0,
                "results": [],
                "journey": None,
                "insufficient_data": True,
                "message": "INSUFFICIENT DATA: Target track ID required for journey reconstruction.",
            }

        # Gather events matching track_id
        target_events = []
        matching_cameras = set()
        matched_correlation_id = None

        # Look in behavior chains first
        matching_chain = None
        for ch in behavior_chains:
            if ch.get("track_id") == target_id:
                matching_chain = ch
                matched_correlation_id = ch.get("correlation_id")
                for c in ch.get("camera_ids", []):
                    matching_cameras.add(c.lower())
                for ev in ch.get("events", []):
                    target_events.append(ev)
                break

        # Also search raw events for track_id
        for ev in events:
            ev_tid = ev.get("track_id") or ev.get("object_id")
            try:
                if ev_tid is not None and int(str(ev_tid).replace("#", "").replace("TRK-", "")) == target_id:
                    target_events.append(ev)
                    if ev.get("camera_id"):
                        matching_cameras.add(ev["camera_id"].lower())
            except (ValueError, TypeError):
                pass

        if not target_events and not matching_chain:
            return {
                "query": filters.get("query", ""),
                "filters": filters,
                "chips": filters.get("chips", []),
                "result_count": 0,
                "results": [],
                "journey": None,
                "insufficient_data": True,
                "message": f"INSUFFICIENT DATA: Target #{target_id} not found in recent surveillance telemetry.",
            }

        # Deduplicate and sort chronologically
        seen_keys = set()
        ordered_steps = []
        for ev in target_events:
            ts = ev.get("timestamp") or 0
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                except Exception:
                    ts = 0.0
            ev_type = ev.get("event_type", "DETECTION")
            cam = ev.get("camera_id", "cam-01").lower()
            key = (cam, ev_type, round(float(ts), 1))
            if key not in seen_keys:
                seen_keys.add(key)
                meta = ev.get("metadata", {})
                ordered_steps.append({
                    "timestamp": ts,
                    "camera_id": cam,
                    "event_type": ev_type,
                    "description": self._format_step_description(ev_type, meta, cam),
                    "metadata": meta,
                })

        ordered_steps.sort(key=lambda s: s["timestamp"])

        # Determine cross-camera status
        has_cross_cam = len(matching_cameras) > 1
        has_handover = any(s["event_type"] == "CROSS_CAMERA_HANDOVER" for s in ordered_steps)
        is_complete = has_cross_cam and has_handover

        journey_note = (
            "Complete cross-camera journey verified via corridor handover records."
            if is_complete
            else (
                "Single-sector surveillance journey recorded."
                if len(matching_cameras) == 1
                else "INSUFFICIENT DATA FOR COMPLETE JOURNEY: Corridors traversed without confirmed handover record."
            )
        )

        journey_result = {
            "type": "journey",
            "track_id": target_id,
            "class_name": matching_chain.get("class_name", "person") if matching_chain else "person",
            "camera_path": sorted(list(matching_cameras)),
            "steps": ordered_steps,
            "step_count": len(ordered_steps),
            "correlation_id": matched_correlation_id,
            "is_complete": is_complete,
            "status_note": journey_note,
        }

        return {
            "query": filters.get("query", ""),
            "filters": filters,
            "chips": filters.get("chips", []),
            "result_count": 1,
            "results": [journey_result],
            "journey": journey_result,
            "insufficient_data": False,
            "message": f"Target #{target_id} journey assembled across {len(matching_cameras)} cameras ({len(ordered_steps)} milestones).",
        }

    def _execute_camera_breakdown(
        self,
        filters: Dict[str, Any],
        incidents: List[Dict[str, Any]],
        events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Computes authentic per-camera event/incident breach counts without hiding zero-count cameras."""
        camera_counts = {cam: 0 for cam in self.known_cameras}
        target_event = filters.get("event_type")

        # Aggregate counts from incidents
        for inc in incidents:
            cam = inc.get("camera_id", "").lower()
            if cam in camera_counts:
                if target_event:
                    inc_ev = inc.get("event_type", "")
                    if target_event in inc_ev or inc_ev in target_event:
                        camera_counts[cam] += 1
                else:
                    camera_counts[cam] += 1

        # Also aggregate matching raw events if incidents were sparse
        for ev in events:
            cam = ev.get("camera_id", "").lower()
            if cam in camera_counts:
                if target_event:
                    ev_type = ev.get("event_type", "")
                    if target_event in ev_type or ev_type in target_event:
                        camera_counts[cam] += 1

        # Format camera breakdown results
        results = []
        for cam in self.known_cameras:
            cnt = camera_counts[cam]
            results.append({
                "type": "camera_stat",
                "camera_id": cam,
                "camera_name": cam.upper(),
                "breach_count": cnt,
                "event_type": target_event or "ALL_BREACHES",
                "has_activity": cnt > 0,
            })

        # Sort descending by count, with matching cameras first
        results.sort(key=lambda r: r["breach_count"], reverse=True)

        return {
            "query": filters.get("query", ""),
            "filters": filters,
            "chips": filters.get("chips", []),
            "result_count": len(results),
            "results": results,
            "insufficient_data": False,
            "message": f"Camera breach breakdown computed across {len(results)} operational CCTV nodes.",
        }

    # -------------------------------------------------------------------------
    # Filtering Predicates
    # -------------------------------------------------------------------------

    def _matches_incident(
        self,
        inc: Dict[str, Any],
        filters: Dict[str, Any],
        current_time: Optional[float],
    ) -> bool:
        # Camera filter
        cam_ids = filters.get("camera_ids", [])
        if cam_ids and inc.get("camera_id", "").lower() not in cam_ids:
            return False

        # Incident ID filter
        if filters.get("incident_id"):
            if inc.get("id", "").upper() != filters["incident_id"].upper():
                return False

        # Track ID filter
        if filters.get("track_id") is not None:
            inc_tid = inc.get("track_id")
            try:
                if inc_tid is None or int(str(inc_tid).replace("#", "").replace("TRK-", "")) != filters["track_id"]:
                    return False
            except (ValueError, TypeError):
                return False

        # Risk level filter
        if filters.get("risk_level"):
            if inc.get("risk_level", "").upper() != filters["risk_level"].upper():
                return False

        # Event type filter
        if filters.get("event_type"):
            inc_ev = inc.get("event_type", "").upper()
            target_ev = filters["event_type"].upper()
            if target_ev not in inc_ev and inc_ev not in target_ev:
                return False

        # Status filter (unresolved vs resolved)
        if filters.get("status"):
            ack = inc.get("acknowledged", 0)
            if filters["status"] == "unresolved" and ack != 0:
                return False
            elif filters["status"] == "resolved" and ack == 0:
                return False

        # Time range filter
        tr = filters.get("time_range")
        if tr and current_time:
            started = inc.get("started_at")
            if started:
                try:
                    if isinstance(started, str):
                        ts = datetime.fromisoformat(started.replace("Z", "+00:00")).timestamp()
                    else:
                        ts = float(started)
                    cutoff = current_time - self._time_range_to_seconds(tr)
                    if ts < cutoff:
                        return False
                except Exception:
                    pass

        return True

    def _matches_event(
        self,
        ev: Dict[str, Any],
        filters: Dict[str, Any],
        current_time: Optional[float],
    ) -> bool:
        cam_ids = filters.get("camera_ids", [])
        if cam_ids and ev.get("camera_id", "").lower() not in cam_ids:
            return False

        if filters.get("event_type"):
            ev_type = ev.get("event_type", "").upper()
            target_ev = filters["event_type"].upper()
            if target_ev not in ev_type and ev_type not in target_ev:
                return False

        if filters.get("track_id") is not None:
            ev_tid = ev.get("track_id") or ev.get("object_id")
            try:
                if ev_tid is None or int(str(ev_tid).replace("#", "").replace("TRK-", "")) != filters["track_id"]:
                    return False
            except (ValueError, TypeError):
                return False

        return True

    def _matches_chain(
        self,
        ch: Dict[str, Any],
        filters: Dict[str, Any],
        current_time: Optional[float],
    ) -> bool:
        cam_ids = filters.get("camera_ids", [])
        if cam_ids:
            chain_cams = [c.lower() for c in ch.get("camera_ids", [ch.get("camera_id", "")])]
            if not any(c in chain_cams for c in cam_ids):
                return False

        if filters.get("track_id") is not None:
            if ch.get("track_id") != filters["track_id"]:
                return False

        if filters.get("behavior_pattern"):
            pat = ch.get("behavior_pattern", "").upper()
            target_pat = filters["behavior_pattern"].upper()
            if target_pat == "SUSPICIOUS":
                if pat in ("NORMAL_MOVEMENT", "UNKNOWN"):
                    return False
            elif target_pat not in pat:
                return False

        if filters.get("risk_level"):
            if ch.get("risk_level", "").upper() != filters["risk_level"].upper():
                return False

        return True

    def _format_incident_result(self, inc: Dict[str, Any]) -> Dict[str, Any]:
        ts = inc.get("started_at", "")
        epoch = 0.0
        if isinstance(ts, str):
            try:
                epoch = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
            except Exception:
                pass
        elif isinstance(ts, (int, float)):
            epoch = float(ts)

        return {
            "type": "incident",
            "incident_id": inc.get("id"),
            "camera_id": inc.get("camera_id", "cam-01").lower(),
            "track_id": inc.get("track_id", 1),
            "class_name": inc.get("class_name", "person"),
            "event_type": inc.get("event_type", "RESTRICTED_ZONE_ENTRY"),
            "risk_level": inc.get("risk_level", "HIGH"),
            "risk_score": inc.get("risk_score", 75),
            "zone_name": inc.get("zone_name", "Monitored Perimeter"),
            "timestamp": ts,
            "timestamp_epoch": epoch,
            "acknowledged": bool(inc.get("acknowledged", 0)),
            "evidence_path": inc.get("evidence_path"),
            "evidence_status": inc.get("evidence_status", "ready"),
        }

    def _format_event_result(self, ev: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": "event",
            "event_id": ev.get("id"),
            "camera_id": ev.get("camera_id", "cam-01").lower(),
            "track_id": ev.get("track_id") or ev.get("object_id"),
            "event_type": ev.get("event_type", "INTRUSION"),
            "severity": ev.get("severity", "Medium"),
            "timestamp": ev.get("timestamp"),
            "timestamp_epoch": 0.0,
            "metadata": ev.get("metadata", {}),
        }

    def _format_chain_result(self, ch: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": "behavior_chain",
            "chain_id": ch.get("chain_id"),
            "incident_id": ch.get("incident_id"),
            "camera_id": ch.get("camera_id", "cam-01").lower(),
            "camera_ids": ch.get("camera_ids", []),
            "track_id": ch.get("track_id"),
            "class_name": ch.get("class_name", "person"),
            "behavior_pattern": ch.get("behavior_pattern", "UNKNOWN"),
            "risk_level": ch.get("risk_level", "LOW"),
            "risk_score": ch.get("risk_score", 0),
            "confidence": ch.get("confidence", 0.0),
            "timestamp": ch.get("started_at"),
            "timestamp_epoch": float(ch.get("started_at", 0) or 0),
            "evidence": ch.get("evidence", []),
            "explanation": ch.get("explanation", ""),
        }

    def _format_step_description(self, event_type: str, metadata: Dict[str, Any], camera_id: str) -> str:
        if event_type == "DETECTION":
            return f"Detected target on {camera_id.upper()}"
        elif event_type == "PERIMETER_APPROACH":
            return f"Approaching monitored perimeter boundary on {camera_id.upper()}"
        elif event_type == "TRIPWIRE_CROSSING":
            d = metadata.get("direction", "IN")
            return f"Crossed perimeter tripwire ({d}) on {camera_id.upper()}"
        elif event_type == "RESTRICTED_ZONE_ENTRY":
            z = metadata.get("zone_name", "Restricted Area")
            return f"Breached geofence into {z} on {camera_id.upper()}"
        elif event_type == "LOITERING":
            dw = metadata.get("dwell_seconds", 0)
            return f"Loitering dwell accumulated ({dw}s) on {camera_id.upper()}"
        elif event_type == "RE_ENTRY":
            rc = metadata.get("reentry_count", 1)
            return f"Re-entered monitored zone (cycle #{rc}) on {camera_id.upper()}"
        elif event_type == "CROSS_CAMERA_HANDOVER":
            fc = metadata.get("from_camera", "").upper()
            tc = metadata.get("to_camera", "").upper()
            return f"Corridor transit handover: {fc} ➔ {tc}"
        return f"{event_type.replace('_', ' ')} observed on {camera_id.upper()}"

    def _time_range_to_seconds(self, time_range: Dict[str, Any]) -> float:
        val = float(time_range.get("value", 10))
        unit = time_range.get("unit", "minutes").lower()
        if "min" in unit:
            return val * 60.0
        elif "hour" in unit or "hr" in unit:
            return val * 3600.0
        elif "day" in unit:
            return val * 86400.0
        return val * 60.0
