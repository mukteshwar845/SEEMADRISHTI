"""
SEEMADRISHTI AI - Dynamic Threat Heatmap & Hotspot Analytics Engine (Phase 21)

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Principles:
1. Deterministic event-driven threat intensity calculated from actual surveillance data.
2. No Math.random(), no dummy numbers, no decorative static heatmaps.
3. Multi-level spatial aggregation: Node (Camera) and Sector.
4. Temporal windowing: 15m, 1h, 6h, 24h with historical trend derivation.
5. High-risk corridor detection linking propagating threat sequences across cameras.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone


# Deterministic Threat Factor Weights
HEATMAP_WEIGHTS = {
    "restricted_breaches": 25,  # Perimeter geofence breach into restricted zone
    "tripwire_crossings": 15,   # Line crossing
    "loitering_events": 12,     # Prolonged stationary dwell
    "anomalies": 8,             # Velocity / direction / group movement anomaly
    "critical_incidents": 30,   # Incident severity CRITICAL
    "high_incidents": 18,       # Incident severity HIGH
    "reentry_events": 10,       # Repeated boundary re-entry
}

CAMERA_SECTOR_MAP = {
    "cam-01": "Sector Alpha",
    "cam-02": "Sector Bravo",
    "cam-03": "Sector Charlie",
    "cam-04": "Sector Delta",
    "cam-05": "Sector Echo",
    "cam-06": "Sector Foxtrot",
    "cam-07": "Sector Golf",
    "cam-08": "Sector Hotel",
    "cam-09": "Sector India",
}

DEFAULT_CAMERAS = [
    {"id": "cam-01", "name": "Sector Alpha Main Gate", "sector": "Sector Alpha"},
    {"id": "cam-02", "name": "Sector Bravo Perimeter", "sector": "Sector Bravo"},
    {"id": "cam-03", "name": "Sector Charlie Vehicle Checkpoint", "sector": "Sector Charlie"},
    {"id": "cam-04", "name": "Sector Delta Checkpost", "sector": "Sector Delta"},
    {"id": "cam-05", "name": "Sector Echo Forest Canopy", "sector": "Sector Echo"},
    {"id": "cam-06", "name": "Sector Foxtrot Mountain Pass", "sector": "Sector Foxtrot"},
    {"id": "cam-07", "name": "Sector Golf Desert Outpost", "sector": "Sector Golf"},
    {"id": "cam-08", "name": "Sector Hotel Logistics Gate", "sector": "Sector Hotel"},
    {"id": "cam-09", "name": "Sector India Coastal Guard", "sector": "Sector India"},
]


class ThreatHeatmapEngine:
    """Calculates deterministic event-driven threat intensity and detects hotspots and corridors."""

    def __init__(self, camera_list: Optional[List[Dict[str, str]]] = None):
        self.cameras = camera_list or DEFAULT_CAMERAS
        self.camera_map = {c["id"].lower(): c for c in self.cameras}

    def calculate_heatmap(
        self,
        events: Optional[List[Dict[str, Any]]] = None,
        incidents: Optional[List[Dict[str, Any]]] = None,
        correlated_incidents: Optional[List[Dict[str, Any]]] = None,
        time_window_seconds: int = 86400,
        current_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculates dynamic threat heatmap across all cameras and sectors.
        All values are derived directly from actual events and incidents.
        """
        events = events or []
        incidents = incidents or []
        correlated_incidents = correlated_incidents or []

        now_epoch = current_time if current_time is not None else datetime.now(timezone.utc).timestamp()
        cutoff_epoch = now_epoch - time_window_seconds
        previous_cutoff_epoch = cutoff_epoch - time_window_seconds

        # 1. Filter events and incidents within the time window
        current_events = [e for e in events if self._extract_epoch(e) >= cutoff_epoch]
        previous_events = [e for e in events if previous_cutoff_epoch <= self._extract_epoch(e) < cutoff_epoch]

        current_incidents = [i for i in incidents if self._extract_epoch(i) >= cutoff_epoch]
        previous_incidents = [i for i in incidents if previous_cutoff_epoch <= self._extract_epoch(i) < cutoff_epoch]

        # 2. Camera-Level Event Aggregation
        camera_stats: Dict[str, Dict[str, int]] = {}
        prev_camera_stats: Dict[str, Dict[str, int]] = {}

        for c in self.cameras:
            cid = c["id"].lower()
            camera_stats[cid] = self._empty_stats()
            prev_camera_stats[cid] = self._empty_stats()

        # Tally current events
        for ev in current_events:
            cid = (ev.get("camera_id") or "cam-01").lower()
            if cid not in camera_stats:
                camera_stats[cid] = self._empty_stats()
            self._tally_event(camera_stats[cid], ev)

        # Tally current incidents
        for inc in current_incidents:
            cid = (inc.get("camera_id") or "cam-01").lower()
            if cid not in camera_stats:
                camera_stats[cid] = self._empty_stats()
            self._tally_incident(camera_stats[cid], inc)

        # Tally previous window for trend analysis
        for ev in previous_events:
            cid = (ev.get("camera_id") or "cam-01").lower()
            if cid in prev_camera_stats:
                self._tally_event(prev_camera_stats[cid], ev)

        for inc in previous_incidents:
            cid = (inc.get("camera_id") or "cam-01").lower()
            if cid in prev_camera_stats:
                self._tally_incident(prev_camera_stats[cid], inc)

        # 3. Calculate Threat Indices per Camera
        camera_results = []
        for c in self.cameras:
            cid = c["id"].lower()
            stats = camera_stats.get(cid, self._empty_stats())
            threat_index = self._compute_intensity(stats)
            level = self._threat_level(threat_index)

            # Trend calculation
            prev_stats = prev_camera_stats.get(cid, self._empty_stats())
            prev_threat_index = self._compute_intensity(prev_stats)
            trend = self._derive_trend(threat_index, prev_threat_index, len(previous_events) + len(previous_incidents))

            camera_results.append({
                "camera_id": cid,
                "camera_name": c.get("name", cid.upper()),
                "sector": c.get("sector") or CAMERA_SECTOR_MAP.get(cid, "Border Sector"),
                "threat_index": threat_index,
                "threat_level": level,
                "event_counts": stats,
                "trend": trend,
                "has_activity": threat_index > 0,
            })

        # Sort cameras descending by threat index
        camera_results.sort(key=lambda r: r["threat_index"], reverse=True)

        # 4. Sector-Level Aggregation
        sectors_map: Dict[str, Dict[str, Any]] = {}
        for cam_res in camera_results:
            sec_name = cam_res["sector"]
            if sec_name not in sectors_map:
                sectors_map[sec_name] = {
                    "sector_name": sec_name,
                    "cameras": [],
                    "total_events": 0,
                    "raw_threat_sum": 0,
                    "event_counts": self._empty_stats(),
                }
            sec_entry = sectors_map[sec_name]
            sec_entry["cameras"].append(cam_res["camera_id"])
            sec_entry["raw_threat_sum"] += cam_res["threat_index"]
            for k, v in cam_res["event_counts"].items():
                sec_entry["event_counts"][k] += v
                sec_entry["total_events"] += v

        sector_results = []
        for sec_name, sec_data in sectors_map.items():
            cam_count = max(1, len(sec_data["cameras"]))
            # Average or max intensity
            sec_index = min(100, int(round(sec_data["raw_threat_sum"] / cam_count)))
            sector_results.append({
                "sector_name": sec_name,
                "cameras": sec_data["cameras"],
                "threat_index": sec_index,
                "threat_level": self._threat_level(sec_index),
                "total_events": sec_data["total_events"],
                "event_counts": sec_data["event_counts"],
            })

        sector_results.sort(key=lambda s: s["threat_index"], reverse=True)

        # 5. Hotspot Detection
        hotspot = None
        if camera_results:
            top_cam = camera_results[0]
            hotspot = {
                "camera_id": top_cam["camera_id"],
                "camera_name": top_cam["camera_name"],
                "sector": top_cam["sector"],
                "threat_index": top_cam["threat_index"],
                "threat_level": top_cam["threat_level"],
                "primary_contributors": top_cam["event_counts"],
                "trend": top_cam["trend"],
            }

        # 6. High-Risk Corridor Detection
        corridors = self._detect_high_risk_corridors(correlated_incidents, current_events, current_incidents)

        return {
            "time_window_seconds": time_window_seconds,
            "hotspot": hotspot,
            "cameras": camera_results,
            "sectors": sector_results,
            "corridors": corridors,
            "weights": HEATMAP_WEIGHTS,
            "timestamp": datetime.fromtimestamp(now_epoch, timezone.utc).isoformat().replace("+00:00", "Z"),
        }

    def _empty_stats(self) -> Dict[str, int]:
        return {
            "restricted_breaches": 0,
            "tripwire_crossings": 0,
            "loitering": 0,
            "anomalies": 0,
            "critical_incidents": 0,
            "high_incidents": 0,
            "reentry_count": 0,
        }

    def _tally_event(self, stats: Dict[str, int], ev: Dict[str, Any]):
        et = (ev.get("event_type") or "").upper()
        if "RESTRICTED" in et or "ZONE_ENTRY" in et or "INTRUSION" in et:
            stats["restricted_breaches"] += 1
        elif "TRIPWIRE" in et or "LINE_CROSSING" in et:
            stats["tripwire_crossings"] += 1
        elif "LOITER" in et:
            stats["loitering"] += 1
        elif "RE_ENTRY" in et or "REENTRY" in et:
            stats["reentry_count"] += 1
        elif "ANOMALY" in et or "SPEED" in et or "NIGHT_MOVEMENT" in et:
            stats["anomalies"] += 1

    def _tally_incident(self, stats: Dict[str, int], inc: Dict[str, Any]):
        lvl = (inc.get("risk_level") or "").upper()
        score = inc.get("risk_score") or 0

        if lvl == "CRITICAL" or score >= 80:
            stats["critical_incidents"] += 1
        elif lvl == "HIGH" or score >= 50:
            stats["high_incidents"] += 1

        et = (inc.get("event_type") or "").upper()
        if "RESTRICTED" in et or "INTRUSION" in et:
            stats["restricted_breaches"] += 1
        elif "TRIPWIRE" in et:
            stats["tripwire_crossings"] += 1

    def _compute_intensity(self, stats: Dict[str, int]) -> int:
        raw = (
            stats["restricted_breaches"] * HEATMAP_WEIGHTS["restricted_breaches"]
            + stats["tripwire_crossings"] * HEATMAP_WEIGHTS["tripwire_crossings"]
            + stats["loitering"] * HEATMAP_WEIGHTS["loitering_events"]
            + stats["anomalies"] * HEATMAP_WEIGHTS["anomalies"]
            + stats["critical_incidents"] * HEATMAP_WEIGHTS["critical_incidents"]
            + stats["high_incidents"] * HEATMAP_WEIGHTS["high_incidents"]
            + stats["reentry_count"] * HEATMAP_WEIGHTS["reentry_events"]
        )
        return min(100, int(round(raw)))

    def _threat_level(self, score: int) -> str:
        if score >= 75:
            return "CRITICAL"
        if score >= 50:
            return "HIGH"
        if score >= 25:
            return "MEDIUM"
        return "LOW"

    def _derive_trend(self, current_score: int, previous_score: int, prev_event_count: int) -> str:
        if prev_event_count == 0 and previous_score == 0:
            return "STABLE" if current_score == 0 else "ESCALATING"
        delta = current_score - previous_score
        if delta > 5:
            return "ESCALATING"
        elif delta < -5:
            return "DE-ESCALATING"
        return "STABLE"

    def _detect_high_risk_corridors(
        self,
        correlated_incidents: List[Dict[str, Any]],
        events: List[Dict[str, Any]],
        incidents: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Detects corridors where threat activity propagates across cameras.
        Requires authentic multi-camera correlation data.
        """
        corridors = []
        corridor_counts: Dict[str, Dict[str, Any]] = {}

        # 1. Inspect verified correlations
        for corr in correlated_incidents:
            cams = corr.get("camera_sequence", [])
            if isinstance(cams, str):
                import json
                try:
                    cams = json.loads(cams)
                except Exception:
                    cams = []

            if len(cams) >= 2:
                for i in range(len(cams) - 1):
                    pair = (cams[i].lower(), cams[i + 1].lower())
                    cid = f"{pair[0]}->{pair[1]}"
                    if cid not in corridor_counts:
                        corridor_counts[cid] = {
                            "corridor_id": cid,
                            "from_camera": pair[0],
                            "to_camera": pair[1],
                            "path": [pair[0].upper(), pair[1].upper()],
                            "correlated_incidents": 0,
                            "restricted_breaches": 0,
                            "tripwire_crossings": 0,
                            "loitering": 0,
                            "threat_score": 0,
                        }
                    corridor_counts[cid]["correlated_incidents"] += 1
                    corridor_counts[cid]["threat_score"] = max(
                        corridor_counts[cid]["threat_score"],
                        corr.get("correlation_score", 60)
                    )

        # 2. Inspect explicit handover events
        for ev in events:
            if ev.get("event_type") == "CROSS_CAMERA_HANDOVER":
                meta = ev.get("metadata", {})
                fc = meta.get("from_camera", "").lower()
                tc = meta.get("to_camera", "").lower()
                if fc and tc and fc != tc:
                    cid = f"{fc}->{tc}"
                    if cid not in corridor_counts:
                        corridor_counts[cid] = {
                            "corridor_id": cid,
                            "from_camera": fc,
                            "to_camera": tc,
                            "path": [fc.upper(), tc.upper()],
                            "correlated_incidents": 1,
                            "restricted_breaches": 0,
                            "tripwire_crossings": 0,
                            "loitering": 0,
                            "threat_score": 50,
                        }
                    else:
                        corridor_counts[cid]["correlated_incidents"] += 1

        # Populate breach and tripwire counts along corridor endpoints
        for cid, data in corridor_counts.items():
            fc = data["from_camera"]
            tc = data["to_camera"]

            for ev in events:
                cam = (ev.get("camera_id") or "").lower()
                if cam in (fc, tc):
                    et = (ev.get("event_type") or "").upper()
                    if "RESTRICTED" in et or "ZONE" in et:
                        data["restricted_breaches"] += 1
                    elif "TRIPWIRE" in et:
                        data["tripwire_crossings"] += 1
                    elif "LOITER" in et:
                        data["loitering"] += 1

            # Event density classification
            tot = data["correlated_incidents"] + data["restricted_breaches"] + data["tripwire_crossings"]
            data["event_density"] = "HIGH" if tot >= 8 else ("MEDIUM" if tot >= 4 else "LOW")
            corridors.append(data)

        corridors.sort(key=lambda c: c["threat_score"], reverse=True)
        return corridors

    def _extract_epoch(self, item: Dict[str, Any]) -> float:
        ts = item.get("timestamp") or item.get("started_at") or item.get("created_at") or 0.0
        if isinstance(ts, (int, float)):
            return float(ts)
        elif isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
            except Exception:
                return 0.0
        return 0.0
