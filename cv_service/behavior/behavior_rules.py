"""
SEEMADRISHTI AI - Deterministic Threat Behavior Classification Rules (Phase 19)

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Core Principles:
1. Deterministic evidence-based classification (zero Math.random() or guesswork).
2. Neutral, professional security terminology ("POSSIBLE RECONNAISSANCE", never "CONFIRMED INFILTRATOR").
3. Measurable confidence derived strictly from confirmed pipeline milestones.
"""

from typing import Dict, List, Tuple, Any, Optional, Set


# Standard Neutral Security Patterns
PATTERN_UNKNOWN = "UNKNOWN"
PATTERN_NORMAL_MOVEMENT = "NORMAL_MOVEMENT"
PATTERN_PERIMETER_APPROACH = "PERIMETER_APPROACH"
PATTERN_RESTRICTED_AREA_INTRUSION = "RESTRICTED_AREA_INTRUSION"
PATTERN_PERSISTENT_LOITERING = "PERSISTENT_LOITERING"
PATTERN_REPEATED_REENTRY = "REPEATED_REENTRY"
PATTERN_POSSIBLE_RECONNAISSANCE = "POSSIBLE_RECONNAISSANCE"
PATTERN_MULTI_EVENT_SECURITY_BREACH = "MULTI_EVENT_SECURITY_BREACH"
PATTERN_MULTI_EVENT_BREACH = PATTERN_MULTI_EVENT_SECURITY_BREACH
PATTERN_CROSS_CAMERA_CONTINUATION = "CROSS_CAMERA_CONTINUATION"

SUPPORTED_PATTERNS = {
    PATTERN_UNKNOWN,
    PATTERN_NORMAL_MOVEMENT,
    PATTERN_PERIMETER_APPROACH,
    PATTERN_RESTRICTED_AREA_INTRUSION,
    PATTERN_PERSISTENT_LOITERING,
    PATTERN_REPEATED_REENTRY,
    PATTERN_POSSIBLE_RECONNAISSANCE,
    PATTERN_MULTI_EVENT_SECURITY_BREACH,
    PATTERN_CROSS_CAMERA_CONTINUATION,
}


def evaluate_behavior_pattern(
    events: List[Dict[str, Any]],
    camera_ids: List[str],
    track_id: int,
    dwell_seconds: float = 0.0,
    reentry_count: int = 0,
    max_risk_score: int = 0,
) -> Tuple[str, float, str, List[str], str]:
    """
    Evaluates chronological chain events and returns:
    (pattern, confidence, confidence_label, evidence_list, explanation)

    All results are deterministic and derived strictly from confirmed events.
    """
    if not events or len(events) < 2:
        return (
            PATTERN_UNKNOWN,
            0.0,
            "INSUFFICIENT DATA",
            [],
            "Insufficient real events to establish a conclusive behavioral pattern.",
        )

    # Extract distinct event types
    event_types: Set[str] = {e.get("event_type", "").upper() for e in events}
    evidence: List[str] = []

    has_detection = "DETECTION" in event_types
    has_approach = "PERIMETER_APPROACH" in event_types
    has_tripwire = any("TRIPWIRE" in et for et in event_types)
    has_zone_entry = any("RESTRICTED" in et or "ZONE_ENTRY" in et for et in event_types)
    has_loitering = dwell_seconds >= 15.0 or any(
        e.get("event_type") == "LOITERING" and e.get("metadata", {}).get("dwell_seconds", 0) >= 15.0
        for e in events
    )
    has_reentry = "RE_ENTRY" in event_types or reentry_count > 0
    has_wrong_dir = "WRONG_DIRECTION" in event_types
    has_handover = (
        "CROSS_CAMERA_HANDOVER" in event_types
        or "HANDOVER" in event_types
        or len(set(camera_ids)) > 1
    )
    has_incident = "INCIDENT_CREATED" in event_types

    # Collect verified evidence checklist
    if has_zone_entry:
        evidence.append("Restricted-zone interaction")
    if has_tripwire:
        evidence.append("Tripwire crossing")
    if has_loitering:
        evidence.append("Prolonged dwell")
    if has_reentry:
        evidence.append("Re-entry detected")
    if has_wrong_dir:
        evidence.append("Counter-flow movement")
    if has_handover:
        evidence.append("Cross-camera continuation")

    distinct_security_milestones = sum(
        1 for flag in [has_tripwire, has_zone_entry, has_loitering, has_reentry, has_wrong_dir] if flag
    )

    # -------------------------------------------------------------------------
    # RULE 1: POSSIBLE RECONNAISSANCE
    # Strict evidence threshold:
    # (Tripwire crossing OR Perimeter approach)
    # AND Restricted zone interaction
    # AND Prolonged dwell (dwell >= 15s)
    # AND Re-entry attempt (reentry >= 1 or repeated interaction)
    # -------------------------------------------------------------------------
    if (has_tripwire or has_approach) and has_zone_entry and has_loitering and has_reentry:
        conf = 0.94 if len(events) >= 5 else 0.88
        explanation = (
            f"Target #{track_id} crossed a monitored perimeter tripwire, entered a restricted zone, "
            f"maintained an abnormal dwell ({round(dwell_seconds, 1)}s), and performed re-entry. "
            f"This verified chronological sequence satisfies the Possible Reconnaissance criteria."
        )
        return (
            PATTERN_POSSIBLE_RECONNAISSANCE,
            conf,
            "HIGH CONFIDENCE",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 2: MULTI_EVENT_SECURITY_BREACH
    # When target accumulates 3+ distinct security milestones
    # -------------------------------------------------------------------------
    if distinct_security_milestones >= 3:
        conf = 0.92 if len(events) >= 4 else 0.85
        explanation = (
            f"Target #{track_id} triggered {distinct_security_milestones} distinct security breach milestones "
            f"across perimeter tripwires and restricted zones in chronological succession."
        )
        return (
            PATTERN_MULTI_EVENT_SECURITY_BREACH,
            conf,
            "HIGH CONFIDENCE",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 3: REPEATED RE-ENTRY
    # -------------------------------------------------------------------------
    if reentry_count >= 2 or (has_reentry and distinct_security_milestones >= 2):
        conf = 0.90
        explanation = (
            f"Target #{track_id} demonstrated repeated re-entry cycles ({reentry_count} verified entries) "
            f"into restricted perimeter territory."
        )
        return (
            PATTERN_REPEATED_REENTRY,
            conf,
            "CONFIRMED PATTERN",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 4: PERSISTENT LOITERING
    # -------------------------------------------------------------------------
    if has_loitering and dwell_seconds >= 15.0:
        conf = 0.89
        explanation = (
            f"Target #{track_id} remained stationary or loitering within monitored zone for "
            f"{round(dwell_seconds, 1)} seconds, exceeding the operational dwell threshold."
        )
        return (
            PATTERN_PERSISTENT_LOITERING,
            conf,
            "CONFIRMED PATTERN",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 5: RESTRICTED AREA INTRUSION
    # -------------------------------------------------------------------------
    if has_zone_entry:
        conf = 0.93
        explanation = (
            f"Target #{track_id} physically breached and occupied the designated restricted zone polygon."
        )
        return (
            PATTERN_RESTRICTED_AREA_INTRUSION,
            conf,
            "CONFIRMED PATTERN",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 6: PERIMETER APPROACH / TRIPWIRE CROSSING
    # -------------------------------------------------------------------------
    if has_tripwire or has_approach:
        conf = 0.91
        explanation = (
            f"Target #{track_id} traversed the calibrated optical perimeter tripwire boundary."
        )
        return (
            PATTERN_PERIMETER_APPROACH,
            conf,
            "CONFIRMED PATTERN",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 7: CROSS CAMERA CONTINUATION
    # -------------------------------------------------------------------------
    if has_handover:
        conf = 0.86
        explanation = (
            f"Target trajectory transitioned across cameras: {', '.join(camera_ids)}."
        )
        return (
            PATTERN_CROSS_CAMERA_CONTINUATION,
            conf,
            "CONFIRMED PATTERN",
            evidence,
            explanation,
        )

    # -------------------------------------------------------------------------
    # RULE 8: NORMAL MOVEMENT
    # -------------------------------------------------------------------------
    if has_detection and distinct_security_milestones == 0:
        conf = 0.80
        explanation = (
            f"Target #{track_id} shows standard transit movement without perimeter breaches or policy violations."
        )
        return (
            PATTERN_NORMAL_MOVEMENT,
            conf,
            "STANDARD TRANSIT",
            ["Standard trajectory detected"],
            explanation,
        )

    return (
        PATTERN_UNKNOWN,
        0.0,
        "INSUFFICIENT DATA",
        [],
        "Insufficient real events to establish a conclusive behavioral pattern.",
    )
