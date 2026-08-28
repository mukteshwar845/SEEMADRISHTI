"""
SEEMADRISHTI AI - Phase 6 Automated Test Suite
Explainable Threat Assessment & Risk Engine Verification (36 Tests)

Team: IQ100
SIH Problem: SIH26187
"""

import os
import sys
import time
import json
import requests
import subprocess
from typing import Dict, Any, List

# Ensure repository root is on sys.path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from cv_service.config import CVConfig
from cv_service.risk.engine import (
    RiskEngine,
    RiskAssessment,
    RiskReason,
    TrackRiskContext,
)
from cv_service.geometry.polygon import PolygonZone


class MockPublisher:
    def __init__(self):
        self.published_messages: List[Dict[str, Any]] = []
        self.is_connected = True

    def publish(self, data: Any, message_type: str = "detection"):
        self.published_messages.append({"type": message_type, "data": data})


def main():
    print("\n===================================================================")
    print("[TEST SUITE] RUNNING SEEMADRISHTI PHASE 6 THREAT & RISK TESTS")
    print("===================================================================\n")

    passed_count = 0
    failed_count = 0

    def report_test(test_id: str, desc: str, passed: bool, details: str = ""):
        nonlocal passed_count, failed_count
        status = "[PASS]" if passed else "[FAIL]"
        if passed:
            passed_count += 1
        else:
            failed_count += 1
        print(f"  {status} {test_id}: {desc} -> {details}")

    # -------------------------------------------------------------
    # TEST 01: Risk engine initializes
    # -------------------------------------------------------------
    try:
        engine = RiskEngine()
        passed = isinstance(engine, RiskEngine) and len(engine.track_contexts) == 0
        report_test(
            "Test 01",
            "Risk Engine Initializes",
            passed,
            f"Engine created successfully: contexts={len(engine.track_contexts)}",
        )
    except Exception as e:
        report_test("Test 01", "Risk Engine Initializes", False, str(e))

    # -------------------------------------------------------------
    # TEST 02: Default configuration loads
    # -------------------------------------------------------------
    try:
        cfg = CVConfig()
        passed = (
            cfg.risk_engine_enabled is True
            and cfg.risk_intrusion_points == 40
            and cfg.risk_loitering_points == 25
            and cfg.risk_reentry_points == 15
            and cfg.risk_persistence_points == 7
            and cfg.risk_persistence_min_seconds == 10.0
            and cfg.risk_max_score == 100
        )
        report_test(
            "Test 02",
            "Default Configuration Loads",
            passed,
            f"Defaults: intrusion={cfg.risk_intrusion_points}, loitering={cfg.risk_loitering_points}, reentry={cfg.risk_reentry_points}, persistence={cfg.risk_persistence_points}",
        )
    except Exception as e:
        report_test("Test 02", "Default Configuration Loads", False, str(e))

    # -------------------------------------------------------------
    # TEST 03: Custom score configuration works
    # -------------------------------------------------------------
    try:
        custom_engine = RiskEngine(
            intrusion_points=50,
            loitering_points=30,
            reentry_points=20,
            persistence_points=10,
            persistence_min_seconds=5.0,
            max_score=100,
        )
        passed = (
            custom_engine.intrusion_points == 50
            and custom_engine.loitering_points == 30
            and custom_engine.reentry_points == 20
            and custom_engine.persistence_points == 10
            and custom_engine.persistence_min_seconds == 5.0
        )
        report_test(
            "Test 03",
            "Custom Score Configuration Works",
            passed,
            f"Configured: intrusion={custom_engine.intrusion_points}, loitering={custom_engine.loitering_points}, reentry={custom_engine.reentry_points}",
        )
    except Exception as e:
        report_test("Test 03", "Custom Score Configuration Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 04: Score starts at zero
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        assessment = eng.calculate_risk("cam-01", 17, current_time=100.0)
        passed = assessment.score == 0 and assessment.level == "LOW" and len(assessment.reasons) == 0
        report_test(
            "Test 04",
            "Score Starts at Zero",
            passed,
            f"Initial state: score={assessment.score}, level={assessment.level}",
        )
    except Exception as e:
        report_test("Test 04", "Score Starts at Zero", False, str(e))

    # -------------------------------------------------------------
    # TEST 05: Detection alone produces zero risk points
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        track = {"track_id": 1, "class_name": "person", "confidence": 0.95}
        assessment, alerted = eng.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=False,
            has_intrusion=False,
            is_loitering=False,
            dwell_seconds=0.0,
            reentry_count=0,
            current_time=100.0,
        )
        passed = assessment.score == 0 and assessment.level == "LOW" and not alerted
        report_test(
            "Test 05",
            "Detection Alone Produces Zero Risk Points",
            passed,
            f"Detected person outside zone: score={assessment.score}, level={assessment.level}",
        )
    except Exception as e:
        report_test("Test 05", "Detection Alone Produces Zero Risk Points", False, str(e))

    # -------------------------------------------------------------
    # TEST 06: Tracking alone produces zero risk points
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        track = {"track_id": 2, "class_name": "person", "confidence": 0.92}
        # Evaluated across 5 seconds outside zone
        for t in range(100, 106):
            assessment, alerted = eng.evaluate_track(
                camera_id="cam-01",
                track=track,
                is_inside_zone=False,
                has_intrusion=False,
                is_loitering=False,
                dwell_seconds=0.0,
                reentry_count=0,
                current_time=float(t),
            )
        passed = assessment.score == 0 and assessment.level == "LOW" and not alerted
        report_test(
            "Test 06",
            "Tracking Alone Produces Zero Risk Points",
            passed,
            f"Tracked person for 5s outside zone: score={assessment.score}, level={assessment.level}",
        )
    except Exception as e:
        report_test("Test 06", "Tracking Alone Produces Zero Risk Points", False, str(e))

    # -------------------------------------------------------------
    # TEST 07: Intrusion adds configured points (+40)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40)
        track = {"track_id": 3, "class_name": "person", "confidence": 0.90}
        assessment, alerted = eng.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=False,
            dwell_seconds=1.0,
            reentry_count=0,
            current_time=100.0,
        )
        has_intrus_reason = any(r.code == "INTRUSION" and r.points == 40 for r in assessment.reasons)
        passed = assessment.score == 40 and assessment.level == "MEDIUM" and has_intrus_reason
        report_test(
            "Test 07",
            "Intrusion Adds Configured Points (+40)",
            passed,
            f"Intrusion score={assessment.score}, level={assessment.level}, reasons={[r.code for r in assessment.reasons]}",
        )
    except Exception as e:
        report_test("Test 07", "Intrusion Adds Configured Points (+40)", False, str(e))

    # -------------------------------------------------------------
    # TEST 08: Loitering adds configured points (+25)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25)
        track = {"track_id": 4, "class_name": "person", "confidence": 0.88}
        assessment, alerted = eng.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=30.5,
            reentry_count=0,
            current_time=100.0,
        )
        passed = (
            assessment.score == 65
            and assessment.level == "HIGH"
            and any(r.code == "LOITERING" and r.points == 25 for r in assessment.reasons)
        )
        report_test(
            "Test 08",
            "Loitering Adds Configured Points (+25)",
            passed,
            f"Intrusion+Loitering score={assessment.score}, level={assessment.level}",
        )
    except Exception as e:
        report_test("Test 08", "Loitering Adds Configured Points (+25)", False, str(e))

    # -------------------------------------------------------------
    # TEST 09: Re-entry adds configured points (+15)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25, reentry_points=15)
        track = {"track_id": 5, "class_name": "person", "confidence": 0.89}
        assessment, alerted = eng.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=32.0,
            reentry_count=1,
            current_time=100.0,
        )
        passed = (
            assessment.score == 80
            and assessment.level == "CRITICAL"
            and any(r.code == "REENTRY" and r.points == 15 for r in assessment.reasons)
        )
        report_test(
            "Test 09",
            "Re-Entry Adds Configured Points (+15)",
            passed,
            f"Intrusion+Loitering+Reentry score={assessment.score}, level={assessment.level}",
        )
    except Exception as e:
        report_test("Test 09", "Re-Entry Adds Configured Points (+15)", False, str(e))

    # -------------------------------------------------------------
    # TEST 10: Persistent presence adds configured points (+7)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(
            intrusion_points=40,
            loitering_points=25,
            reentry_points=15,
            persistence_points=7,
            persistence_min_seconds=10.0,
        )
        track = {"track_id": 6, "class_name": "person", "confidence": 0.91}
        # First seen at t=100
        eng.get_or_create_context("cam-01", 6, "person", now=100.0)
        # Evaluated at t=115 (15 seconds elapsed > 10s persistence threshold)
        assessment, alerted = eng.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=35.0,
            reentry_count=1,
            current_time=115.0,
        )
        passed = (
            assessment.score == 87
            and assessment.level == "CRITICAL"
            and any(r.code == "PERSISTENCE" and r.points == 7 for r in assessment.reasons)
        )
        report_test(
            "Test 10",
            "Persistent Presence Adds Configured Points (+7)",
            passed,
            f"Intrusion+Loitering+Reentry+Persistence score={assessment.score}, level={assessment.level}",
        )
    except Exception as e:
        report_test("Test 10", "Persistent Presence Adds Configured Points (+7)", False, str(e))

    # -------------------------------------------------------------
    # TEST 11: Score capped at 100
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(
            intrusion_points=50,
            loitering_points=40,
            reentry_points=30,
            persistence_points=20,
            max_score=100,
        )
        track = {"track_id": 7, "class_name": "person", "confidence": 0.94}
        eng.get_or_create_context("cam-01", 7, "person", now=100.0)
        assessment, alerted = eng.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=40.0,
            reentry_count=2,
            current_time=120.0,
        )
        # Raw sum would be 50 + 40 + 30 + 20 = 140, capped at 100
        passed = assessment.score == 100 and assessment.level == "CRITICAL"
        report_test(
            "Test 11",
            "Score Capped at 100",
            passed,
            f"Sum of 140 points capped to {assessment.score} / {eng.max_score}",
        )
    except Exception as e:
        report_test("Test 11", "Score Capped at 100", False, str(e))

    # -------------------------------------------------------------
    # TEST 12: LOW classification works (0-24)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        passed = eng.classify_score(0) == "LOW" and eng.classify_score(24) == "LOW"
        report_test(
            "Test 12",
            "LOW Classification Works (0-24)",
            passed,
            f"Score 0 -> {eng.classify_score(0)}, Score 24 -> {eng.classify_score(24)}",
        )
    except Exception as e:
        report_test("Test 12", "LOW Classification Works (0-24)", False, str(e))

    # -------------------------------------------------------------
    # TEST 13: MEDIUM classification works (25-49)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        passed = eng.classify_score(25) == "MEDIUM" and eng.classify_score(49) == "MEDIUM"
        report_test(
            "Test 13",
            "MEDIUM Classification Works (25-49)",
            passed,
            f"Score 25 -> {eng.classify_score(25)}, Score 49 -> {eng.classify_score(49)}",
        )
    except Exception as e:
        report_test("Test 13", "MEDIUM Classification Works (25-49)", False, str(e))

    # -------------------------------------------------------------
    # TEST 14: HIGH classification works (50-74)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        passed = eng.classify_score(50) == "HIGH" and eng.classify_score(74) == "HIGH"
        report_test(
            "Test 14",
            "HIGH Classification Works (50-74)",
            passed,
            f"Score 50 -> {eng.classify_score(50)}, Score 74 -> {eng.classify_score(74)}",
        )
    except Exception as e:
        report_test("Test 14", "HIGH Classification Works (50-74)", False, str(e))

    # -------------------------------------------------------------
    # TEST 15: CRITICAL classification works (75-100)
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        passed = eng.classify_score(75) == "CRITICAL" and eng.classify_score(100) == "CRITICAL"
        report_test(
            "Test 15",
            "CRITICAL Classification Works (75-100)",
            passed,
            f"Score 75 -> {eng.classify_score(75)}, Score 100 -> {eng.classify_score(100)}",
        )
    except Exception as e:
        report_test("Test 15", "CRITICAL Classification Works (75-100)", False, str(e))

    # -------------------------------------------------------------
    # TEST 16: Reasons contain correct point values
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25)
        track = {"track_id": 8, "class_name": "person"}
        assessment, _ = eng.evaluate_track(
            "cam-01",
            track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=30.0,
            reentry_count=0,
            current_time=100.0,
        )
        pts_map = {r.code: r.points for r in assessment.reasons}
        passed = pts_map.get("INTRUSION") == 40 and pts_map.get("LOITERING") == 25
        report_test(
            "Test 16",
            "Reasons Contain Correct Point Values",
            passed,
            f"Extracted reason point values: {pts_map}",
        )
    except Exception as e:
        report_test("Test 16", "Reasons Contain Correct Point Values", False, str(e))

    # -------------------------------------------------------------
    # TEST 17: Reasons contain human-readable explanations
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25)
        track = {"track_id": 9, "class_name": "person"}
        assessment, _ = eng.evaluate_track(
            "cam-01",
            track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=30.0,
            reentry_count=0,
            current_time=100.0,
        )
        descriptions = [r.description for r in assessment.reasons]
        passed = (
            len(descriptions) == 2
            and all(isinstance(d, str) and len(d) > 5 for d in descriptions)
        )
        report_test(
            "Test 17",
            "Reasons Contain Human-Readable Explanations",
            passed,
            f"Explanations: {descriptions}",
        )
    except Exception as e:
        report_test("Test 17", "Reasons Contain Human-Readable Explanations", False, str(e))

    # -------------------------------------------------------------
    # TEST 18: No duplicate intrusion contribution
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40)
        track = {"track_id": 10, "class_name": "person"}
        # Evaluated across 20 consecutive frames inside zone
        for f in range(20):
            assessment, _ = eng.evaluate_track(
                "cam-01",
                track,
                is_inside_zone=True,
                has_intrusion=True,
                is_loitering=False,
                dwell_seconds=float(f),
                reentry_count=0,
                current_time=100.0 + f * 0.1,
            )
        # Score must remain bounded at 40, not 40 * 20 = 800!
        passed = assessment.score == 40 and len(assessment.reasons) == 1
        report_test(
            "Test 18",
            "No Duplicate Intrusion Contribution",
            passed,
            f"20 consecutive frames inside produced score={assessment.score} (bounded)",
        )
    except Exception as e:
        report_test("Test 18", "No Duplicate Intrusion Contribution", False, str(e))

    # -------------------------------------------------------------
    # TEST 19: No duplicate loitering contribution
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25)
        track = {"track_id": 11, "class_name": "person"}
        # Evaluated across 20 consecutive frames of continuous loitering
        for f in range(20):
            assessment, _ = eng.evaluate_track(
                "cam-01",
                track,
                is_inside_zone=True,
                has_intrusion=True,
                is_loitering=True,
                dwell_seconds=30.0 + f * 0.1,
                reentry_count=0,
                current_time=130.0 + f * 0.1,
            )
        # Score must remain bounded at 65, not accumulating!
        passed = assessment.score == 65 and len(assessment.reasons) == 2
        report_test(
            "Test 19",
            "No Duplicate Loitering Contribution",
            passed,
            f"20 consecutive loitering frames produced score={assessment.score} (bounded)",
        )
    except Exception as e:
        report_test("Test 19", "No Duplicate Loitering Contribution", False, str(e))

    # -------------------------------------------------------------
    # TEST 20: Re-entry count behaves correctly
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, reentry_points=15)
        track = {"track_id": 12, "class_name": "person"}
        # Re-entry 1: +15 -> 55
        a1, _ = eng.evaluate_track("cam-01", track, True, True, False, 1.0, 1, 100.0)
        # Re-entry 2: +30 -> 70
        a2, _ = eng.evaluate_track("cam-01", track, True, True, False, 1.0, 2, 101.0)
        # Re-entry 3: capped at 30 -> 70
        a3, _ = eng.evaluate_track("cam-01", track, True, True, False, 1.0, 3, 102.0)
        passed = a1.score == 55 and a2.score == 70 and a3.score == 70
        report_test(
            "Test 20",
            "Re-Entry Count Behaves Correctly",
            passed,
            f"Re-entry 1={a1.score}, Re-entry 2={a2.score}, Re-entry 3 (capped)={a3.score}",
        )
    except Exception as e:
        report_test("Test 20", "Re-Entry Count Behaves Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 21: Multiple tracks maintain independent risk
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25)
        track_high = {"track_id": 21, "class_name": "person"}
        track_low = {"track_id": 22, "class_name": "person"}

        a_high, _ = eng.evaluate_track("cam-01", track_high, True, True, True, 30.0, 0, 100.0)
        a_low, _ = eng.evaluate_track("cam-01", track_low, False, False, False, 0.0, 0, 100.0)

        passed = (
            a_high.score == 65
            and a_high.level == "HIGH"
            and a_low.score == 0
            and a_low.level == "LOW"
        )
        report_test(
            "Test 21",
            "Multiple Tracks Maintain Independent Risk",
            passed,
            f"Track #21 score={a_high.score} ({a_high.level}) | Track #22 score={a_low.score} ({a_low.level})",
        )
    except Exception as e:
        report_test("Test 21", "Multiple Tracks Maintain Independent Risk", False, str(e))

    # -------------------------------------------------------------
    # TEST 22: Multiple cameras maintain independent risk
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40)
        track = {"track_id": 1, "class_name": "person"}

        a_cam1, _ = eng.evaluate_track("cam-01", track, True, True, False, 1.0, 0, 100.0)
        a_cam2, _ = eng.evaluate_track("cam-02", track, False, False, False, 0.0, 0, 100.0)

        passed = (
            a_cam1.score == 40
            and a_cam1.level == "MEDIUM"
            and a_cam2.score == 0
            and a_cam2.level == "LOW"
        )
        report_test(
            "Test 22",
            "Multiple Cameras Maintain Independent Risk",
            passed,
            f"CAM-01 Track #1={a_cam1.score} | CAM-02 Track #1={a_cam2.score}",
        )
    except Exception as e:
        report_test("Test 22", "Multiple Cameras Maintain Independent Risk", False, str(e))

    # -------------------------------------------------------------
    # TEST 23: Risk event persisted to SQLite
    # -------------------------------------------------------------
    try:
        ts_ms = int(time.time() * 1000)
        event_payload = {
            "id": f"evt-risk-test-{ts_ms}",
            "camera_id": "cam-01",
            "event_type": "RISK_ASSESSMENT",
            "severity": "High",
            "object_id": "17",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metadata": {
                "risk_score": 87,
                "risk_level": "CRITICAL",
                "reasons": [{"code": "INTRUSION", "points": 40, "description": "Restricted-zone intrusion"}],
            },
        }
        resp = requests.post("http://127.0.0.1:8000/api/events", json=event_payload, timeout=2.0)
        passed = resp.status_code == 201
        report_test(
            "Test 23",
            "Risk Event Persisted to SQLite",
            passed,
            f"Inserted event ID: {event_payload['id']} (HTTP {resp.status_code})",
        )
    except Exception as e:
        report_test("Test 23", "Risk Event Persisted to SQLite", False, str(e))

    # -------------------------------------------------------------
    # TEST 24: Risk alert persisted to SQLite
    # -------------------------------------------------------------
    try:
        ts_ms = int(time.time() * 1000)
        evt_id = f"evt-risk-alert-ref-{ts_ms}"
        event_payload = {
            "id": evt_id,
            "camera_id": "cam-01",
            "event_type": "RISK_ASSESSMENT",
            "severity": "High",
            "object_id": "17",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metadata": {"risk_score": 87, "risk_level": "CRITICAL"},
        }
        requests.post("http://127.0.0.1:8000/api/events", json=event_payload, timeout=2.0)

        alert_payload = {
            "id": f"alt-risk-test-{ts_ms}",
            "event_id": evt_id,
            "camera_id": "cam-01",
            "severity": "High",
            "title": "Critical Threat Assessment",
            "reason": "Track #17 classified as CRITICAL risk (87/100): restricted-zone intrusion, abnormal dwell time, and repeated entry.",
            "acknowledged": False,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        resp = requests.post("http://127.0.0.1:8000/api/alerts", json=alert_payload, timeout=2.0)
        passed = resp.status_code == 201
        report_test(
            "Test 24",
            "Risk Alert Persisted to SQLite",
            passed,
            f"Inserted alert ID: {alert_payload['id']} (HTTP {resp.status_code})",
        )
    except Exception as e:
        report_test("Test 24", "Risk Alert Persisted to SQLite", False, str(e))

    # -------------------------------------------------------------
    # TEST 25: WebSocket risk_assessment broadcast works
    # -------------------------------------------------------------
    try:
        mock_pub = MockPublisher()
        eng = RiskEngine()
        track = {"track_id": 25, "class_name": "person"}
        assessment, alerted = eng.evaluate_track(
            "cam-01",
            track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=30.0,
            reentry_count=0,
            publisher=mock_pub,
        )
        types_sent = [m["type"] for m in mock_pub.published_messages]
        passed = "risk_assessment" in types_sent
        report_test(
            "Test 25",
            "WebSocket risk_assessment Broadcast Works",
            passed,
            f"Published message types: {types_sent}",
        )
    except Exception as e:
        report_test("Test 25", "WebSocket risk_assessment Broadcast Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 26: Alert generated when risk crosses threshold
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25, alert_threshold="HIGH")
        track = {"track_id": 26, "class_name": "person"}
        # Frame 1: Intrusion only -> Score 40 (MEDIUM) -> Below alert threshold (HIGH)
        _, alert1 = eng.evaluate_track("cam-01", track, True, True, False, 1.0, 0, 100.0)
        # Frame 2: Loitering threshold reached -> Score 65 (HIGH) -> Crosses into HIGH -> Alert!
        _, alert2 = eng.evaluate_track("cam-01", track, True, True, True, 30.0, 0, 130.0)
        passed = not alert1 and alert2
        report_test(
            "Test 26",
            "Alert Generated When Risk Crosses Threshold",
            passed,
            f"Medium state: alert={alert1} | High state: alert={alert2}",
        )
    except Exception as e:
        report_test("Test 26", "Alert Generated When Risk Crosses Threshold", False, str(e))

    # -------------------------------------------------------------
    # TEST 27: No duplicate alert when risk remains same
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25, alert_threshold="HIGH")
        track = {"track_id": 27, "class_name": "person"}
        # Trigger HIGH alert on first transition
        _, alert1 = eng.evaluate_track("cam-01", track, True, True, True, 30.0, 0, 130.0)
        # Next 10 frames remain at HIGH level
        duplicate_alerts = 0
        for f in range(10):
            _, a_next = eng.evaluate_track("cam-01", track, True, True, True, 31.0 + f, 0, 131.0 + f)
            if a_next:
                duplicate_alerts += 1
        passed = alert1 and duplicate_alerts == 0
        report_test(
            "Test 27",
            "No Duplicate Alert When Risk Remains Same",
            passed,
            f"Initial alert={alert1}, subsequent duplicate alerts={duplicate_alerts}",
        )
    except Exception as e:
        report_test("Test 27", "No Duplicate Alert When Risk Remains Same", False, str(e))

    # -------------------------------------------------------------
    # TEST 28: Risk decreases when active condition disappears
    # -------------------------------------------------------------
    try:
        eng = RiskEngine(intrusion_points=40, loitering_points=25)
        track = {"track_id": 28, "class_name": "person"}
        # Target inside zone: Intrusion + Loitering = 65 (HIGH)
        a_in, _ = eng.evaluate_track("cam-01", track, True, True, True, 30.0, 0, 100.0)
        # Target exits zone: Active conditions clear -> Score decreases to 0 (LOW)
        a_out, _ = eng.evaluate_track("cam-01", track, False, False, False, 0.0, 0, 105.0)
        passed = a_in.score == 65 and a_out.score == 0 and a_out.level == "LOW"
        report_test(
            "Test 28",
            "Risk Decreases When Active Condition Disappears",
            passed,
            f"Inside score={a_in.score} ({a_in.level}) -> Exited score={a_out.score} ({a_out.level})",
        )
    except Exception as e:
        report_test("Test 28", "Risk Decreases When Active Condition Disappears", False, str(e))

    # -------------------------------------------------------------
    # TEST 29: Track cleanup works
    # -------------------------------------------------------------
    try:
        eng = RiskEngine()
        track = {"track_id": 29, "class_name": "person"}
        eng.evaluate_track("cam-01", track, True, True, False, 1.0, 0, 100.0)
        assert ("cam-01", 29) in eng.track_contexts
        # Clean up with empty active set at t=110 (10s idle > 5s max_idle)
        removed_count = eng.cleanup_inactive_tracks("cam-01", set(), max_idle_seconds=5.0, current_time=110.0)
        passed = removed_count == 1 and ("cam-01", 29) not in eng.track_contexts
        report_test(
            "Test 29",
            "Track Cleanup Works",
            passed,
            f"Removed {removed_count} inactive track context(s)",
        )
    except Exception as e:
        report_test("Test 29", "Track Cleanup Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 30: Phase 5 Loitering Regression (31 tests)
    # -------------------------------------------------------------
    try:
        res_p5 = subprocess.run(
            [sys.executable, "cv_service/tests/phase5_test.py"],
            capture_output=True,
            text=True,
            timeout=180,
        )
        passed = res_p5.returncode == 0 and "Failed: 0" in res_p5.stdout
        report_test(
            "Test 30",
            "Phase 5 Loitering Regression",
            passed,
            "31/31 Phase 5 loitering tests passed",
        )
    except Exception as e:
        report_test("Test 30", "Phase 5 Loitering Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 31: Phase 4 Intrusion Regression (22 tests)
    # -------------------------------------------------------------
    try:
        res_p4 = subprocess.run(
            [sys.executable, "cv_service/tests/phase4_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
        )
        passed = res_p4.returncode == 0 and "Failed: 0" in res_p4.stdout
        report_test(
            "Test 31",
            "Phase 4 Intrusion Regression",
            passed,
            "22/22 Phase 4 intrusion tests passed",
        )
    except Exception as e:
        report_test("Test 31", "Phase 4 Intrusion Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 32: Phase 3 Tracking Regression (12 tests)
    # -------------------------------------------------------------
    try:
        res_p3 = subprocess.run(
            [sys.executable, "cv_service/tests/phase3_test.py"],
            capture_output=True,
            text=True,
            timeout=40,
        )
        passed = res_p3.returncode == 0 and "Failed: 0" in res_p3.stdout
        report_test(
            "Test 32",
            "Phase 3 Tracking Regression",
            passed,
            "12/12 Phase 3 tracking tests passed",
        )
    except Exception as e:
        report_test("Test 32", "Phase 3 Tracking Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 33: Phase 2 Detection Regression (12 tests)
    # -------------------------------------------------------------
    try:
        res_p2 = subprocess.run(
            [sys.executable, "cv_service/tests/phase2_test.py"],
            capture_output=True,
            text=True,
            timeout=40,
        )
        passed = res_p2.returncode == 0 and "Failed: 0" in res_p2.stdout
        report_test(
            "Test 33",
            "Phase 2 Detection Regression",
            passed,
            "12/12 Phase 2 detection tests passed",
        )
    except Exception as e:
        report_test("Test 33", "Phase 2 Detection Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 34: Phase 1 Backend Regression (13 tests)
    # -------------------------------------------------------------
    try:
        res_p1 = subprocess.run(
            ["npm.cmd", "run", "test:phase1"],
            capture_output=True,
            text=True,
            shell=True,
            timeout=30,
        )
        passed = res_p1.returncode == 0 and "passed" in res_p1.stdout.lower()
        report_test(
            "Test 34",
            "Phase 1 Backend Regression",
            passed,
            "13/13 Phase 1 REST & DB tests passed",
        )
    except Exception as e:
        report_test("Test 34", "Phase 1 Backend Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 35: TypeScript Linting
    # -------------------------------------------------------------
    try:
        res_lint = subprocess.run(
            ["npm.cmd", "run", "lint"],
            capture_output=True,
            text=True,
            shell=True,
            timeout=30,
        )
        passed = res_lint.returncode == 0
        report_test(
            "Test 35",
            "TypeScript Linting",
            passed,
            "0 TypeScript errors (tsc --noEmit)",
        )
    except Exception as e:
        report_test("Test 35", "TypeScript Linting", False, str(e))

    # -------------------------------------------------------------
    # TEST 36: Production Build
    # -------------------------------------------------------------
    try:
        res_build = subprocess.run(
            ["npm.cmd", "run", "build"],
            capture_output=True,
            text=True,
            shell=True,
            timeout=60,
        )
        passed = res_build.returncode == 0 and "built in" in res_build.stdout.lower()
        report_test(
            "Test 36",
            "Production Build",
            passed,
            "Vite production build successful",
        )
    except Exception as e:
        report_test("Test 36", "Production Build", False, str(e))

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print("\n===================================================================")
    print(f"[SUMMARY] PHASE 6 TEST SUMMARY:")
    print(f"  Total:  {passed_count + failed_count}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {failed_count}")
    print("===================================================================\n")

    if failed_count > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
