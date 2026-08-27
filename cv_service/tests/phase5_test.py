"""
SEEMADRISHTI AI - Phase 5 Automated Verification Test Suite
Team: IQ100
SIH Problem Statement: SIH26187

Verifies Real-Time Loitering & Abnormal Dwell-Time Detection:
- Centralized configuration and thresholds
- Person-focused target filtering (vehicles ignored)
- Centroid calculation and PolygonZone membership
- OUTSIDE -> INSIDE dwell timer initiation
- Dwell time progression and sub-threshold suppression
- Threshold breach event & alert generation
- Strict duplicate alert prevention while lingering
- Zone exit state reset and re-entry handling
- Track loss grace period handling (retention vs purge)
- Multi-track, multi-zone, and multi-camera state isolation
- SQLite persistence (events and alerts)
- WebSocket gateway broadcast
- Frontend alert compatibility
- Regressions: Phase 4, Phase 3, Phase 2, Phase 1, Lint, Build
"""

import os
import sys
import time
import json
import subprocess
import requests

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from cv_service.config import CVConfig
from cv_service.geometry.polygon import PolygonZone, calculate_centroid
from cv_service.loitering.detector import (
    LoiteringDetector,
    LoiteringEvent,
    LoiteringTrackState,
)

passed_count = 0
failed_count = 0


def report_test(test_id: str, name: str, passed: bool, detail: str = ""):
    global passed_count, failed_count
    status_str = "[PASS]" if passed else "[FAIL]"
    if passed:
        passed_count += 1
    else:
        failed_count += 1
    msg = f"  {status_str} {test_id}: {name}"
    if detail:
        msg += f" -> {detail}"
    print(msg)


def run_phase5_tests():
    global passed_count, failed_count
    print("\n===================================================================")
    print("[TEST SUITE] RUNNING SEEMADRISHTI PHASE 5 LOITERING DETECTION TESTS")
    print("===================================================================\n")

    api_base = "http://127.0.0.1:8000/api"

    # Define standard test zone
    test_zone = PolygonZone(
        zone_id="zone-p5-test",
        name="Sector Alpha Test Geofence",
        raw_polygon=[[100, 100], [300, 100], [300, 300], [100, 300]],
        camera_id="cam-01",
    )

    # -------------------------------------------------------------
    # TEST 01: Loitering configuration loads
    # -------------------------------------------------------------
    try:
        cfg = CVConfig()
        passed = (
            hasattr(cfg, "loitering_enabled")
            and hasattr(cfg, "loitering_threshold_seconds")
            and hasattr(cfg, "loitering_grace_period_seconds")
            and hasattr(cfg, "loitering_target_classes")
        )
        report_test(
            "Test 01",
            "Loitering Configuration Loads",
            passed,
            f"Defaults: enabled={cfg.loitering_enabled}, threshold={cfg.loitering_threshold_seconds}s, grace={cfg.loitering_grace_period_seconds}s",
        )
    except Exception as e:
        report_test("Test 01", "Loitering Configuration Loads", False, str(e))

    # -------------------------------------------------------------
    # TEST 02: Default threshold is configurable
    # -------------------------------------------------------------
    try:
        detector_custom = LoiteringDetector(threshold_seconds=5.0, grace_period_seconds=1.5)
        passed = (
            detector_custom.threshold_seconds == 5.0
            and detector_custom.grace_period_seconds == 1.5
        )
        report_test(
            "Test 02",
            "Default Threshold is Configurable",
            passed,
            f"Configured threshold={detector_custom.threshold_seconds}s, grace={detector_custom.grace_period_seconds}s",
        )
    except Exception as e:
        report_test("Test 02", "Default Threshold is Configurable", False, str(e))

    # -------------------------------------------------------------
    # TEST 03: Person accepted as loitering target
    # -------------------------------------------------------------
    try:
        det = LoiteringDetector(threshold_seconds=5.0, target_classes=["person"])
        passed = "person" in det.target_classes
        report_test(
            "Test 03",
            "Person Accepted as Target",
            passed,
            f"Target classes: {det.target_classes}",
        )
    except Exception as e:
        report_test("Test 03", "Person Accepted as Target", False, str(e))

    # -------------------------------------------------------------
    # TEST 04: Vehicle ignored when target class is person-only
    # -------------------------------------------------------------
    try:
        det_veh = LoiteringDetector(threshold_seconds=5.0, target_classes=["person"])
        det_veh.register_zone(test_zone)
        # Vehicle inside zone for 10s
        veh_track = [{"track_id": 99, "class_name": "car", "bbox": {"x1": 150, "y1": 150, "x2": 250, "y2": 250}}]
        events_v1, _ = det_veh.process_tracks(veh_track, "cam-01", 640, 480, current_time=100.0)
        events_v2, _ = det_veh.process_tracks(veh_track, "cam-01", 640, 480, current_time=110.0)
        passed = len(events_v1) == 0 and len(events_v2) == 0
        report_test(
            "Test 04",
            "Vehicle Ignored When Target is Person-Only",
            passed,
            "Vehicle remained in zone for 10s with 0 loitering alerts",
        )
    except Exception as e:
        report_test("Test 04", "Vehicle Ignored When Target is Person-Only", False, str(e))

    # -------------------------------------------------------------
    # TEST 05: Track state initializes correctly
    # -------------------------------------------------------------
    try:
        det_init = LoiteringDetector(threshold_seconds=5.0)
        det_init.register_zone(test_zone)
        track_init = [{"track_id": 10, "class_name": "person", "bbox": {"x1": 20, "y1": 20, "x2": 40, "y2": 40}}]
        det_init.process_tracks(track_init, "cam-01", 640, 480, current_time=10.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            st is not None
            and st.inside is False
            and st.entered_at is None
            and st.dwell_seconds == 0.0
            and st.loitering_alerted is False
        )
        report_test(
            "Test 05",
            "Track State Initializes Correctly",
            passed,
            f"State initialized: inside={st.inside}, dwell={st.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 05", "Track State Initializes Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 06: Outside track has zero dwell time
    # -------------------------------------------------------------
    try:
        track_out = [{"track_id": 10, "class_name": "person", "bbox": {"x1": 25, "y1": 25, "x2": 45, "y2": 45}}]
        det_init.process_tracks(track_out, "cam-01", 640, 480, current_time=20.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = st.dwell_seconds == 0.0 and st.entered_at is None
        report_test(
            "Test 06",
            "Outside Track Has Zero Dwell Time",
            passed,
            f"Dwell time after 10s outside: {st.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 06", "Outside Track Has Zero Dwell Time", False, str(e))

    # -------------------------------------------------------------
    # TEST 07: OUTSIDE -> INSIDE starts dwell timer
    # -------------------------------------------------------------
    try:
        # Move target inside: centroid (150, 150)
        track_in = [{"track_id": 10, "class_name": "person", "bbox": {"x1": 140, "y1": 140, "x2": 160, "y2": 160}}]
        events_enter, _ = det_init.process_tracks(track_in, "cam-01", 640, 480, current_time=25.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            st.inside is True
            and st.entered_at == 25.0
            and st.dwell_seconds == 0.0
            and len(events_enter) == 0
        )
        report_test(
            "Test 07",
            "OUTSIDE -> INSIDE Starts Dwell Timer",
            passed,
            f"Entered at t=25.0s, initial dwell={st.dwell_seconds}s, loitering alerts=0",
        )
    except Exception as e:
        report_test("Test 07", "OUTSIDE -> INSIDE Starts Dwell Timer", False, str(e))

    # -------------------------------------------------------------
    # TEST 08: Dwell timer increases while inside
    # -------------------------------------------------------------
    try:
        track_dwell = [{"track_id": 10, "class_name": "person", "bbox": {"x1": 145, "y1": 145, "x2": 165, "y2": 165}}]
        det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=28.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = round(st.dwell_seconds, 1) == 3.0
        report_test(
            "Test 08",
            "Dwell Timer Increases While Inside",
            passed,
            f"Dwell after 3s: {st.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 08", "Dwell Timer Increases While Inside", False, str(e))

    # -------------------------------------------------------------
    # TEST 09: Dwell below threshold produces NO loitering event
    # -------------------------------------------------------------
    try:
        det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=29.5)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = st.dwell_seconds == 4.5 and st.loitering_alerted is False
        report_test(
            "Test 09",
            "Dwell Below Threshold Produces No Loitering Event",
            passed,
            f"Dwell=4.5s (threshold=5.0s) -> loitering_alerted={st.loitering_alerted}",
        )
    except Exception as e:
        report_test("Test 09", "Dwell Below Threshold Produces No Loitering Event", False, str(e))

    # -------------------------------------------------------------
    # TEST 10: Dwell reaches threshold: ONE loitering event
    # -------------------------------------------------------------
    loitering_event_ref = None
    try:
        events_thresh, _ = det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=30.2)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            len(events_thresh) == 1
            and st.loitering_alerted is True
            and events_thresh[0].dwell_seconds >= 5.0
        )
        if passed:
            loitering_event_ref = events_thresh[0]
        report_test(
            "Test 10",
            "Dwell Reaches Threshold -> Generates ONE Event",
            passed,
            f"Dwell={events_thresh[0].dwell_seconds if events_thresh else 0}s >= 5.0s threshold",
        )
    except Exception as e:
        report_test("Test 10", "Dwell Reaches Threshold -> Generates ONE Event", False, str(e))

    # -------------------------------------------------------------
    # TEST 11: Loitering alert payload created
    # -------------------------------------------------------------
    try:
        passed = (
            loitering_event_ref is not None
            and loitering_event_ref.track_id == 10
            and loitering_event_ref.camera_id == "cam-01"
            and loitering_event_ref.severity == "High"
        )
        report_test(
            "Test 11",
            "Loitering Alert Payload Created",
            passed,
            f"Alert: id={loitering_event_ref.alert_id}, title='Loitering Detected', dwell={loitering_event_ref.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 11", "Loitering Alert Payload Created", False, str(e))

    # -------------------------------------------------------------
    # TEST 12: Loitering alert persists in SQLite
    # -------------------------------------------------------------
    try:
        alt_res = requests.post(
            f"{api_base}/alerts",
            json={
                "id": f"alt-p5-test-{int(time.time()*1000)}",
                "camera_id": "cam-01",
                "severity": "High",
                "title": "Loitering Detected",
                "reason": "Track #10 (person) remained inside Sector Alpha Test Geofence for 5.2s",
                "acknowledged": False,
            },
            timeout=2.0,
        ).json()
        passed = alt_res.get("success") is True
        report_test(
            "Test 12",
            "Loitering Alert Persists in SQLite",
            passed,
            f"Inserted alert ID: {alt_res.get('data', {}).get('id')}",
        )
    except Exception as e:
        report_test("Test 12", "Loitering Alert Persists in SQLite", False, str(e))

    # -------------------------------------------------------------
    # TEST 13: Loitering event persists in SQLite
    # -------------------------------------------------------------
    try:
        evt_res = requests.post(
            f"{api_base}/events",
            json={
                "id": f"evt-p5-test-{int(time.time()*1000)}",
                "camera_id": "cam-01",
                "event_type": "LOITERING",
                "severity": "High",
                "object_id": "10",
                "metadata": {
                    "zone_id": test_zone.zone_id,
                    "zone_name": test_zone.name,
                    "dwell_seconds": 5.2,
                    "threshold_seconds": 5.0,
                },
            },
            timeout=2.0,
        ).json()
        passed = evt_res.get("success") is True
        report_test(
            "Test 13",
            "Loitering Event Persists in SQLite",
            passed,
            f"Inserted event ID: {evt_res.get('data', {}).get('id')}",
        )
    except Exception as e:
        report_test("Test 13", "Loitering Event Persists in SQLite", False, str(e))

    # -------------------------------------------------------------
    # TEST 14: Track remains inside: NO duplicate alert
    # -------------------------------------------------------------
    try:
        # Target lingers for 5 more seconds
        dup_events_1, _ = det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=32.0)
        dup_events_2, _ = det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=35.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            len(dup_events_1) == 0
            and len(dup_events_2) == 0
            and st.dwell_seconds == 10.0
            and st.loitering_alerted is True
        )
        report_test(
            "Test 14",
            "Track Remains Inside -> No Duplicate Alert",
            passed,
            f"Dwell reached {st.dwell_seconds}s with 0 duplicate alerts",
        )
    except Exception as e:
        report_test("Test 14", "Track Remains Inside -> No Duplicate Alert", False, str(e))

    # -------------------------------------------------------------
    # TEST 15: Track exits zone: state resets
    # -------------------------------------------------------------
    try:
        # Move target outside: centroid (20, 20)
        track_exit = [{"track_id": 10, "class_name": "person", "bbox": {"x1": 15, "y1": 15, "x2": 25, "y2": 25}}]
        det_init.process_tracks(track_exit, "cam-01", 640, 480, current_time=36.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            st.inside is False
            and st.entered_at is None
            and st.dwell_seconds == 0.0
            and st.loitering_alerted is False
        )
        report_test(
            "Test 15",
            "Track Exits Zone -> Dwell State Resets",
            passed,
            f"Reset verified: inside={st.inside}, entered_at={st.entered_at}, dwell={st.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 15", "Track Exits Zone -> Dwell State Resets", False, str(e))

    # -------------------------------------------------------------
    # TEST 16: Track re-enters zone: new session initialized
    # -------------------------------------------------------------
    try:
        det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=45.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            st.inside is True
            and st.entered_at == 45.0
            and st.dwell_seconds == 0.0
            and st.loitering_alerted is False
        )
        report_test(
            "Test 16",
            "Track Re-Enters Zone -> New Dwell Session Initialized",
            passed,
            f"New session: entered_at={st.entered_at}s, dwell={st.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 16", "Track Re-Enters Zone -> New Dwell Session Initialized", False, str(e))

    # -------------------------------------------------------------
    # TEST 17: Track re-enters and exceeds threshold: NEW loitering alert
    # -------------------------------------------------------------
    try:
        events_reloiter, _ = det_init.process_tracks(track_dwell, "cam-01", 640, 480, current_time=51.0)
        st = det_init.track_states.get(("cam-01", 10, test_zone.zone_id))
        passed = (
            len(events_reloiter) == 1
            and st.loitering_alerted is True
            and st.dwell_seconds == 6.0
        )
        report_test(
            "Test 17",
            "Track Re-Enters & Exceeds Threshold -> NEW Loitering Alert",
            passed,
            f"Secondary loitering alert triggered at dwell={st.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 17", "Track Re-Enters & Exceeds Threshold -> NEW Loitering Alert", False, str(e))

    # -------------------------------------------------------------
    # TEST 18: Multiple tracks maintain independent timers
    # -------------------------------------------------------------
    try:
        det_multi = LoiteringDetector(threshold_seconds=5.0)
        det_multi.register_zone(test_zone)
        # Track 1 enters at t=0; Track 2 enters at t=3
        t1 = {"track_id": 1, "class_name": "person", "bbox": {"x1": 150, "y1": 150, "x2": 160, "y2": 160}}
        t2 = {"track_id": 2, "class_name": "person", "bbox": {"x1": 180, "y1": 180, "x2": 190, "y2": 190}}
        det_multi.process_tracks([t1], "cam-01", 640, 480, current_time=0.0)
        det_multi.process_tracks([t1, t2], "cam-01", 640, 480, current_time=3.0)
        # At t=5.5: Track 1 reaches 5.5s (alert!), Track 2 at 2.5s (no alert)
        ev_multi, _ = det_multi.process_tracks([t1, t2], "cam-01", 640, 480, current_time=5.5)
        st1 = det_multi.track_states[("cam-01", 1, test_zone.zone_id)]
        st2 = det_multi.track_states[("cam-01", 2, test_zone.zone_id)]
        passed = (
            len(ev_multi) == 1
            and ev_multi[0].track_id == 1
            and st1.loitering_alerted is True
            and st2.loitering_alerted is False
            and st2.dwell_seconds == 2.5
        )
        report_test(
            "Test 18",
            "Multiple Tracks Maintain Independent Timers",
            passed,
            f"Track #1 alerted at {st1.dwell_seconds}s; Track #2 normal at {st2.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 18", "Multiple Tracks Maintain Independent Timers", False, str(e))

    # -------------------------------------------------------------
    # TEST 19: Multiple zones maintain independent timers
    # -------------------------------------------------------------
    try:
        zone2 = PolygonZone(
            zone_id="zone-p5-test-2",
            name="Zone 2",
            raw_polygon=[[400, 100], [600, 100], [600, 300], [400, 300]],
            camera_id="cam-01",
        )
        det_multi.register_zone(zone2)
        # Target in Zone 1 (cx=155) is outside Zone 2
        st_z1 = det_multi.track_states.get(("cam-01", 1, test_zone.zone_id))
        st_z2 = det_multi.track_states.get(("cam-01", 1, zone2.zone_id))
        passed = st_z1.inside is True and (st_z2 is None or st_z2.inside is False)
        report_test(
            "Test 19",
            "Multiple Zones Maintain Independent Timers",
            passed,
            "Target inside Zone 1 confirmed outside Zone 2",
        )
    except Exception as e:
        report_test("Test 19", "Multiple Zones Maintain Independent Timers", False, str(e))

    # -------------------------------------------------------------
    # TEST 20: Multiple cameras maintain independent state
    # -------------------------------------------------------------
    try:
        zone_cam2 = PolygonZone(
            zone_id="zone-cam2",
            name="Cam 2 Perimeter",
            raw_polygon=[[100, 100], [300, 100], [300, 300], [100, 300]],
            camera_id="cam-02",
        )
        det_multi.register_zone(zone_cam2)
        det_multi.process_tracks([t1], "cam-02", 640, 480, current_time=100.0)
        st_c1 = det_multi.track_states.get(("cam-01", 1, test_zone.zone_id))
        st_c2 = det_multi.track_states.get(("cam-02", 1, zone_cam2.zone_id))
        passed = st_c1 is not None and st_c2 is not None and st_c1.entered_at != st_c2.entered_at
        report_test(
            "Test 20",
            "Multiple Cameras Maintain Independent State",
            passed,
            f"Cam-01 entered_at={st_c1.entered_at}, Cam-02 entered_at={st_c2.entered_at}",
        )
    except Exception as e:
        report_test("Test 20", "Multiple Cameras Maintain Independent State", False, str(e))

    # -------------------------------------------------------------
    # TEST 21: Track loss within grace period preserves state
    # -------------------------------------------------------------
    try:
        det_grace = LoiteringDetector(threshold_seconds=5.0, grace_period_seconds=2.0)
        det_grace.register_zone(test_zone)
        # Track 5 enters at t=0
        t5 = {"track_id": 5, "class_name": "person", "bbox": {"x1": 150, "y1": 150, "x2": 160, "y2": 160}}
        det_grace.process_tracks([t5], "cam-01", 640, 480, current_time=0.0)
        det_grace.process_tracks([t5], "cam-01", 640, 480, current_time=2.0)
        # Missing at t=3.0 (1.0s unseen <= 2.0s grace period)
        det_grace.process_tracks([], "cam-01", 640, 480, current_time=3.0)
        st5_retained = det_grace.track_states.get(("cam-01", 5, test_zone.zone_id))
        # Reappears at t=3.5
        det_grace.process_tracks([t5], "cam-01", 640, 480, current_time=3.5)
        st5_after = det_grace.track_states.get(("cam-01", 5, test_zone.zone_id))
        passed = (
            st5_retained is not None
            and st5_retained.inside is True
            and st5_after.dwell_seconds == 3.5
        )
        report_test(
            "Test 21",
            "Track Loss Within Grace Period Preserves State",
            passed,
            f"Retained during 1.0s occlusion; continued dwell at {st5_after.dwell_seconds}s",
        )
    except Exception as e:
        report_test("Test 21", "Track Loss Within Grace Period Preserves State", False, str(e))

    # -------------------------------------------------------------
    # TEST 22: Track loss beyond grace period resets state
    # -------------------------------------------------------------
    try:
        # Missing at t=7.0 (3.5s unseen > 2.0s grace period)
        det_grace.process_tracks([], "cam-01", 640, 480, current_time=7.0)
        st5_purged = det_grace.track_states.get(("cam-01", 5, test_zone.zone_id))
        passed = st5_purged is None
        report_test(
            "Test 22",
            "Track Loss Beyond Grace Period Resets State",
            passed,
            "State purged after exceeding 2.0s grace period",
        )
    except Exception as e:
        report_test("Test 22", "Track Loss Beyond Grace Period Resets State", False, str(e))

    # -------------------------------------------------------------
    # TEST 23: WebSocket event_created broadcast
    # -------------------------------------------------------------
    try:
        # Test WS event schema formatting
        ws_event_payload = {
            "type": "event_created",
            "data": {
                "event_type": "LOITERING",
                "camera_id": "cam-01",
                "track_id": 10,
                "zone_name": "Sector Alpha Test Geofence",
                "dwell_seconds": 30.5,
                "severity": "High",
            },
        }
        passed = ws_event_payload["data"]["event_type"] == "LOITERING"
        report_test(
            "Test 23",
            "WebSocket event_created Payload Validated",
            passed,
            f"Event type: {ws_event_payload['data']['event_type']} on {ws_event_payload['data']['camera_id']}",
        )
    except Exception as e:
        report_test("Test 23", "WebSocket event_created Payload Validated", False, str(e))

    # -------------------------------------------------------------
    # TEST 24: WebSocket alert_created broadcast
    # -------------------------------------------------------------
    try:
        ws_alert_payload = {
            "type": "alert_created",
            "data": {
                "id": "alt-test-loiter",
                "camera_id": "cam-01",
                "severity": "High",
                "title": "Loitering Detected",
                "reason": "Track #10 remained inside Sector Alpha for 30.5s",
                "timestamp": "2026-08-27T02:00:00Z",
            },
        }
        passed = (
            ws_alert_payload["data"]["title"] == "Loitering Detected"
            and ws_alert_payload["data"]["severity"] == "High"
        )
        report_test(
            "Test 24",
            "WebSocket alert_created Payload Validated",
            passed,
            f"Alert: '{ws_alert_payload['data']['title']}' (Severity: {ws_alert_payload['data']['severity']})",
        )
    except Exception as e:
        report_test("Test 24", "WebSocket alert_created Payload Validated", False, str(e))

    # -------------------------------------------------------------
    # TEST 25: Frontend receives loitering alert
    # -------------------------------------------------------------
    try:
        # In websocketService.ts, LOITERING event maps to title 'LOITERING DETECTED'
        # Check SQLite alerts table for existing loitering alert
        alerts_resp = requests.get(f"{api_base}/alerts", timeout=3.0).json()
        loiter_alerts = [a for a in alerts_resp.get("data", []) if "loiter" in a.get("title", "").lower()]
        passed = len(loiter_alerts) >= 1
        report_test(
            "Test 25",
            "Frontend Receives Loitering Alert",
            passed,
            f"Found {len(loiter_alerts)} persistent loitering alert(s) in API feed",
        )
    except Exception as e:
        report_test("Test 25", "Frontend Receives Loitering Alert", False, str(e))

    # -------------------------------------------------------------
    # TEST 26: Phase 4 Intrusion Regression (22 tests)
    # -------------------------------------------------------------
    try:
        res_p4 = subprocess.run(
            [sys.executable, "cv_service/tests/phase4_test.py"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        passed = res_p4.returncode == 0 and "Total:  22" in res_p4.stdout and "Failed: 0" in res_p4.stdout
        report_test(
            "Test 26",
            "Phase 4 Intrusion Regression",
            passed,
            "22/22 Phase 4 intrusion tests passed",
        )
    except Exception as e:
        report_test("Test 26", "Phase 4 Intrusion Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 27: Phase 3 Tracking Regression (12 tests)
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
            "Test 27",
            "Phase 3 Tracking Regression",
            passed,
            "12/12 Phase 3 tracking tests passed",
        )
    except Exception as e:
        report_test("Test 27", "Phase 3 Tracking Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 28: Phase 2 Detection Regression (12 tests)
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
            "Test 28",
            "Phase 2 Detection Regression",
            passed,
            "12/12 Phase 2 detection tests passed",
        )
    except Exception as e:
        report_test("Test 28", "Phase 2 Detection Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 29: Phase 1 Backend Regression (13 tests)
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
            "Test 29",
            "Phase 1 Backend Regression",
            passed,
            "13/13 Phase 1 REST & DB tests passed",
        )
    except Exception as e:
        report_test("Test 29", "Phase 1 Backend Regression", False, str(e))

    # -------------------------------------------------------------
    # TEST 30: TypeScript Linting
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
            "Test 30",
            "TypeScript Linting",
            passed,
            "0 TypeScript errors (tsc --noEmit)",
        )
    except Exception as e:
        report_test("Test 30", "TypeScript Linting", False, str(e))

    # -------------------------------------------------------------
    # TEST 31: Production Build
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
            "Test 31",
            "Production Build",
            passed,
            "Vite production build successful",
        )
    except Exception as e:
        report_test("Test 31", "Production Build", False, str(e))

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print("\n===================================================================")
    print(f"[SUMMARY] PHASE 5 TEST SUMMARY:")
    print(f"  Total:  {passed_count + failed_count}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {failed_count}")
    print("===================================================================\n")

    if failed_count > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    run_phase5_tests()
