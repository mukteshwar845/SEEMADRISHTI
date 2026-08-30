"""
SEEMADRISHTI AI - Surveillance Intelligence Query Parser (Phase 20)

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Principles:
1. Deterministic translation of natural language queries into structured filters.
2. Zero hallucinations: query understanding only produces constraints, never synthetic answers.
3. Supports 8 core intents: Incidents, Events, Targets, Journeys, Cameras, Directions, Behaviors, Time.
"""

import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta


class QueryParser:
    """Parses natural-language operator surveillance queries into structured filter dictionaries."""

    def __init__(self):
        # Known entity regexes
        self.camera_regex = re.compile(r"\b(cam[-\s]?0?([1-9]|1[0-9]|20))\b", re.IGNORECASE)
        self.track_regex = re.compile(r"\b(?:person|track|target|id|trk|object)[-\s#]*([0-9]{1,6})\b", re.IGNORECASE)
        self.incident_id_regex = re.compile(r"\b(inc[-\s]?[0-9]{3,8})\b", re.IGNORECASE)

    def parse(self, query: str) -> Dict[str, Any]:
        """
        Parses raw text query into a validated filter dictionary:
        {
            "query": raw string,
            "entity": "incident" | "event" | "target" | "journey" | "camera" | "all",
            "event_type": str or None,
            "camera_ids": list of strings,
            "track_id": int or None,
            "incident_id": str or None,
            "risk_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" or None,
            "time_range": { "value": int, "unit": "minutes"|"hours"|"days" } or None,
            "status": "unresolved" | "active" | "resolved" or None,
            "class_name": "person" | "vehicle" | "car" | "truck" or None,
            "direction": "IN" | "OUT" | "EAST" | "WEST" | "NORTH" | "SOUTH" or None,
            "behavior_pattern": str or None,
            "chips": list of filter badge strings for UI
        }
        """
        raw = query.strip()
        q = raw.lower()

        filters: Dict[str, Any] = {
            "query": raw,
            "entity": "all",
            "event_type": None,
            "camera_ids": [],
            "track_id": None,
            "incident_id": None,
            "risk_level": None,
            "time_range": None,
            "status": None,
            "class_name": None,
            "direction": None,
            "behavior_pattern": None,
            "chips": [],
        }

        # 1. Camera extraction
        cam_matches = self.camera_regex.findall(q)
        if cam_matches:
            found_cams = set()
            for full_match, num in cam_matches:
                cid = f"cam-{int(num):02d}"
                found_cams.add(cid)
            filters["camera_ids"] = sorted(list(found_cams))
            for c in filters["camera_ids"]:
                filters["chips"].append(c.upper())

        # 2. Track / Target extraction
        track_match = self.track_regex.search(q)
        if track_match:
            try:
                filters["track_id"] = int(track_match.group(1))
                filters["chips"].append(f"TARGET #{filters['track_id']}")
            except (ValueError, IndexError):
                pass

        # 3. Incident ID extraction
        inc_match = self.incident_id_regex.search(q)
        if inc_match:
            raw_inc = inc_match.group(1).replace(" ", "").upper()
            if not raw_inc.startswith("INC-"):
                num_part = re.sub(r"[^0-9]", "", raw_inc)
                raw_inc = f"INC-{int(num_part):06d}"
            filters["incident_id"] = raw_inc
            filters["entity"] = "incident"
            filters["chips"].append(raw_inc)

        # 4. Journey / Hotspot / Corridor intent
        if any(w in q for w in ["journey", "where did", "appear in", "path", "route", "travel", "movement path"]):
            filters["entity"] = "journey"
            filters["chips"].append("JOURNEY")
        elif any(w in q for w in ["highest risk", "threat hotspot", "hotspot", "most breaches", "highest threat"]):
            filters["entity"] = "hotspot"
            filters["chips"].append("THREAT HOTSPOT")
        elif any(w in q for w in ["corridor", "corridors", "high-risk corridor", "high risk corridor"]):
            filters["entity"] = "corridor"
            filters["chips"].append("THREAT CORRIDORS")

        # 5. Entity intent (if not journey/hotspot/corridor)
        if filters["entity"] == "all":
            if any(w in q for w in ["incident", "incidents", "dossier", "breach incident"]):
                filters["entity"] = "incident"
                filters["chips"].append("INCIDENTS")
            elif any(w in q for w in ["which camera", "which cameras", "cameras with", "camera breakdown", "camera list"]):
                filters["entity"] = "camera"
                filters["chips"].append("CAMERA BREAKDOWN")
            elif any(w in q for w in ["event", "events", "crossing", "breach", "intrusion", "loitering", "re-entry"]):
                filters["entity"] = "event"
                filters["chips"].append("EVENTS")

        # 6. Risk level extraction
        if "critical" in q:
            filters["risk_level"] = "CRITICAL"
            filters["chips"].append("CRITICAL")
        elif "high" in q:
            filters["risk_level"] = "HIGH"
            filters["chips"].append("HIGH RISK")
        elif "medium" in q:
            filters["risk_level"] = "MEDIUM"
            filters["chips"].append("MEDIUM RISK")
        elif "low" in q:
            filters["risk_level"] = "LOW"
            filters["chips"].append("LOW RISK")

        # 7. Event type extraction
        if any(w in q for w in ["tripwire", "line crossing", "crossed", "virtual tripwire", "boundary wire"]):
            filters["event_type"] = "TRIPWIRE_CROSSING"
            filters["chips"].append("TRIPWIRE")
        elif any(w in q for w in ["restricted", "zone breach", "polygon breach", "restricted area", "perimeter entry", "unauthorized zone"]):
            filters["event_type"] = "RESTRICTED_ZONE_ENTRY"
            filters["chips"].append("RESTRICTED ZONE")
        elif any(w in q for w in ["loitering", "loiter", "dwell", "prolonged dwell", "stationary"]):
            filters["event_type"] = "LOITERING"
            filters["chips"].append("LOITERING")
        elif any(w in q for w in ["re-entry", "reentry", "repeated entry", "re-entered"]):
            filters["event_type"] = "RE_ENTRY"
            filters["chips"].append("RE-ENTRY")
        elif any(w in q for w in ["handover", "cross camera", "cross-camera", "corridor"]):
            filters["event_type"] = "CROSS_CAMERA_HANDOVER"
            filters["chips"].append("HANDOVER")

        # 8. Time range extraction
        time_match_min = re.search(r"\b(?:last|past)\s*(\d+)\s*(?:min|minute|minutes)\b", q)
        time_match_hr = re.search(r"\b(?:last|past)\s*(\d+)\s*(?:hr|hour|hours)\b", q)
        time_match_day = re.search(r"\b(?:last|past)\s*(\d+)\s*(?:day|days)\b", q)

        if time_match_min:
            mins = int(time_match_min.group(1))
            filters["time_range"] = {"value": mins, "unit": "minutes"}
            filters["chips"].append(f"LAST {mins} MIN")
        elif time_match_hr:
            hrs = int(time_match_hr.group(1))
            filters["time_range"] = {"value": hrs, "unit": "hours"}
            filters["chips"].append(f"LAST {hrs} HR" if hrs == 1 else f"LAST {hrs} HRS")
        elif time_match_day:
            days = int(time_match_day.group(1))
            filters["time_range"] = {"value": days, "unit": "days"}
            filters["chips"].append(f"LAST {days} DAYS")
        elif "last hour" in q or "past hour" in q:
            filters["time_range"] = {"value": 1, "unit": "hours"}
            filters["chips"].append("LAST 1 HR")
        elif "today" in q:
            filters["time_range"] = {"value": 24, "unit": "hours", "scope": "today"}
            filters["chips"].append("TODAY")
        elif "yesterday" in q:
            filters["time_range"] = {"value": 48, "unit": "hours", "scope": "yesterday"}
            filters["chips"].append("YESTERDAY")

        # 9. Status extraction
        if any(w in q for w in ["unresolved", "open", "active", "pending", "unacknowledged"]):
            filters["status"] = "unresolved"
            filters["chips"].append("UNRESOLVED")
        elif any(w in q for w in ["resolved", "closed", "acknowledged"]):
            filters["status"] = "resolved"
            filters["chips"].append("RESOLVED")

        # 10. Class name extraction
        if any(w in q for w in ["person", "people", "pedestrian", "human", "individual"]):
            filters["class_name"] = "person"
            filters["chips"].append("PERSON")
        elif any(w in q for w in ["vehicle", "vehicles", "car", "cars", "truck", "trucks", "motorcycle", "bike"]):
            if "truck" in q:
                filters["class_name"] = "truck"
            elif "car" in q:
                filters["class_name"] = "car"
            else:
                filters["class_name"] = "vehicle"
            filters["chips"].append(filters["class_name"].upper())

        # 11. Direction extraction
        if any(w in q for w in ["inbound", "entering", "entry", "inward", "in"]):
            if "in the last" not in q and "in cam" not in q:
                filters["direction"] = "IN"
                filters["chips"].append("INBOUND")
        elif any(w in q for w in ["outbound", "exiting", "exit", "outward", "out"]):
            filters["direction"] = "OUT"
            filters["chips"].append("OUTBOUND")
        elif "from east" in q or "east" in q:
            filters["direction"] = "EAST"
            filters["chips"].append("FROM EAST")
        elif "from west" in q or "west" in q:
            filters["direction"] = "WEST"
            filters["chips"].append("FROM WEST")

        # 12. Behavior pattern extraction
        if any(w in q for w in ["reconnaissance", "recon", "scouting", "casing"]):
            filters["behavior_pattern"] = "POSSIBLE_RECONNAISSANCE"
            filters["chips"].append("RECONNAISSANCE")
        elif any(w in q for w in ["suspicious movement", "suspicious movements", "suspicious person", "suspicious"]):
            filters["behavior_pattern"] = "SUSPICIOUS"
            filters["chips"].append("SUSPICIOUS")
        elif any(w in q for w in ["repeated re-entry", "repeated reentry"]):
            filters["behavior_pattern"] = "REPEATED_REENTRY"
            filters["chips"].append("REPEATED RE-ENTRY")
        elif any(w in q for w in ["persistent loitering", "prolonged loitering"]):
            filters["behavior_pattern"] = "PERSISTENT_LOITERING"
            filters["chips"].append("PERSISTENT LOITERING")

        # Remove duplicate chips while preserving order
        seen_chips = set()
        unique_chips = []
        for chip in filters["chips"]:
            if chip not in seen_chips:
                seen_chips.add(chip)
                unique_chips.append(chip)
        filters["chips"] = unique_chips

        return filters
