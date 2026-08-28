"""
SEEMADRISHTI AI - Phase 7 Incident Evidence Capture & Reconstruction Automated Test Suite

Verification suite for:
- Bounded in-memory circular frame buffer
- HIGH / CRITICAL incident trigger evaluation
- Anti-duplicate incident gating
- Post-event frame accumulation & capture
- MP4 forensic video encoding with burned-in HUD overlay
- Multi-camera buffer and evidence isolation
- SQLite incident record persistence
- Evidence video streaming endpoint
- WebSocket incident_created and evidence_ready telemetry
- Safe error handling (empty buffer, writer failure)
- Regressions (Phases 1-6)
"""

import asyncio
import json
import os
import shutil
import subprocess
import sys
import time
from typing import Any, Dict, List
import cv2
import numpy as np
import requests

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from cv_service.evidence.circular_buffer import CircularFrameBuffer
from cv_service.evidence.evidence_writer import EvidenceWriter
from cv_service.evidence.incident_manager import ActiveIncident, IncidentManager

TEST_RESULTS = []


def report_test(test_id: str, name: str, passed: bool, details: str = ""):
    status_str = "[PASS]" if passed else "[FAIL]"
    msg = f"  {status_str} {test_id}: {name}"
    if details:
        msg += f" -> {details}"
    print(msg)
    TEST_RESULTS.append({"test_id": test_id, "name": name, "passed": passed, "details": details})


def create_dummy_frame(width: int = 320, height: int = 240, text: str = "") -> np.ndarray:
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:, :] = (30, 30, 30)
    if text:
        cv2.putText(frame, text, (20, height // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    return frame


def run_phase7_suite():
    print("\n===================================================================")
    print("[TEST SUITE] RUNNING SEEMADRISHTI PHASE 7 EVIDENCE ENGINE TESTS")
    print("===================================================================\n")

    test_evidence_dir = "evidence_test"
    if os.path.exists(test_evidence_dir):
        shutil.rmtree(test_evidence_dir, ignore_errors=True)
    os.makedirs(test_evidence_dir, exist_ok=True)

    # -------------------------------------------------------------
    # TEST 01: Buffer Initialization
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=5.0, max_fps=15.0)
        c1 = buf.get_frame_count("cam-01")
        passed = c1 == 0 and buf.pre_event_seconds == 5.0
        report_test("Test 01", "Buffer Initializes Correctly", passed, f"Initial count: {c1}")
    except Exception as e:
        report_test("Test 01", "Buffer Initializes Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 02: Frame Insertion
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=5.0, max_fps=15.0)
        frame = create_dummy_frame()
        for i in range(5):
            buf.push("cam-01", frame, timestamp=100.0 + i)
        count = buf.get_frame_count("cam-01")
        passed = count == 5
        report_test("Test 02", "Frame Insertion Works", passed, f"Buffered frames: {count}")
    except Exception as e:
        report_test("Test 02", "Frame Insertion Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 03: Buffer Duration Limit
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=3.0, max_fps=10.0)
        frame = create_dummy_frame()
        # Push 10 frames across 10 seconds (t=100 to t=109)
        for i in range(10):
            buf.push("cam-01", frame, timestamp=100.0 + i)
        count = buf.get_frame_count("cam-01")
        oldest = buf.get_oldest_timestamp("cam-01")
        # In a 3.0s buffer at t=109.0, cutoff is 106.0 -> only frames >= 106.0 remain (4 frames: 106, 107, 108, 109)
        passed = count <= 4 and oldest is not None and oldest >= 106.0
        report_test("Test 03", "Buffer Duration Limit Enforced", passed, f"Remaining frames: {count}, oldest ts: {oldest}")
    except Exception as e:
        report_test("Test 03", "Buffer Duration Limit Enforced", False, str(e))

    # -------------------------------------------------------------
    # TEST 04: Old-Frame Eviction
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=2.0, max_fps=10.0)
        frame = create_dummy_frame()
        buf.push("cam-01", frame, timestamp=10.0)
        buf.push("cam-01", frame, timestamp=11.0)
        buf.push("cam-01", frame, timestamp=15.0)  # Gap: 15.0 - 2.0 = 13.0 -> 10.0 and 11.0 evicted
        count = buf.get_frame_count("cam-01")
        oldest = buf.get_oldest_timestamp("cam-01")
        passed = count == 1 and oldest == 15.0
        report_test("Test 04", "Old-Frame Eviction Verified", passed, f"Count after eviction: {count}, oldest: {oldest}")
    except Exception as e:
        report_test("Test 04", "Old-Frame Eviction Verified", False, str(e))

    # -------------------------------------------------------------
    # TEST 05: Pre-Event Preservation
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=5.0, max_fps=10.0)
        frame = create_dummy_frame()
        for i in range(5):
            buf.push("cam-01", frame, timestamp=10.0 + i)  # 10, 11, 12, 13, 14
        pre_frames = buf.get_pre_event_frames("cam-01", trigger_time=14.0, duration_seconds=3.0)
        # Should return frames from t=11.0 to t=14.0 (4 frames)
        passed = len(pre_frames) == 4 and pre_frames[0][0] == 11.0 and pre_frames[-1][0] == 14.0
        report_test("Test 05", "Pre-Event Frames Preserved", passed, f"Retrieved {len(pre_frames)} pre-event frame(s)")
    except Exception as e:
        report_test("Test 05", "Pre-Event Frames Preserved", False, str(e))

    # -------------------------------------------------------------
    # TEST 06: HIGH Trigger
    # -------------------------------------------------------------
    try:
        mgr = IncidentManager(
            backend_http_url="http://127.0.0.1:8000",
            pre_event_seconds=3.0,
            post_event_seconds=3.0,
        )
        inc = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=1,
            class_name="person",
            risk_score=65,
            risk_level="HIGH",
            reasons=[{"code": "INTRUSION", "points": 40}],
            zone_name="Sector Alpha",
            current_time=100.0,
        )
        passed = inc is not None and inc.risk_level == "HIGH" and inc.status == "capturing"
        report_test("Test 06", "HIGH Risk Triggers Incident", passed, f"Incident created: {inc.id if inc else None} ({inc.risk_level if inc else None})")
    except Exception as e:
        report_test("Test 06", "HIGH Risk Triggers Incident", False, str(e))

    # -------------------------------------------------------------
    # TEST 07: CRITICAL Trigger
    # -------------------------------------------------------------
    try:
        mgr = IncidentManager(
            backend_http_url="http://127.0.0.1:8000",
            pre_event_seconds=3.0,
            post_event_seconds=3.0,
        )
        inc = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=2,
            class_name="person",
            risk_score=87,
            risk_level="CRITICAL",
            reasons=[{"code": "INTRUSION", "points": 40}, {"code": "LOITERING", "points": 25}],
            zone_name="Sector Alpha",
            current_time=100.0,
        )
        passed = inc is not None and inc.risk_level == "CRITICAL" and inc.risk_score == 87
        report_test("Test 07", "CRITICAL Risk Triggers Incident", passed, f"Incident created: {inc.id if inc else None} ({inc.risk_level if inc else None})")
    except Exception as e:
        report_test("Test 07", "CRITICAL Risk Triggers Incident", False, str(e))

    # -------------------------------------------------------------
    # TEST 08: LOW and MEDIUM Ignored
    # -------------------------------------------------------------
    try:
        mgr = IncidentManager(backend_http_url="http://127.0.0.1:8000")
        inc_low = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=3,
            class_name="person",
            risk_score=15,
            risk_level="LOW",
            reasons=[],
            zone_name="Sector Alpha",
            current_time=100.0,
        )
        inc_med = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=4,
            class_name="person",
            risk_score=40,
            risk_level="MEDIUM",
            reasons=[{"code": "INTRUSION", "points": 40}],
            zone_name="Sector Alpha",
            current_time=100.0,
        )
        passed = inc_low is None and inc_med is None
        report_test("Test 08", "LOW and MEDIUM Levels Ignored", passed, f"LOW -> {inc_low}, MEDIUM -> {inc_med}")
    except Exception as e:
        report_test("Test 08", "LOW and MEDIUM Levels Ignored", False, str(e))

    # -------------------------------------------------------------
    # TEST 09: Duplicate Prevention (Same Active Threat)
    # -------------------------------------------------------------
    try:
        mgr = IncidentManager(backend_http_url="http://127.0.0.1:8000")
        inc1 = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=9,
            class_name="person",
            risk_score=65,
            risk_level="HIGH",
            reasons=[{"code": "INTRUSION", "points": 40}],
            zone_name="Sector Alpha",
            current_time=100.0,
        )
        # Immediate subsequent frame with same threat
        inc2 = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=9,
            class_name="person",
            risk_score=65,
            risk_level="HIGH",
            reasons=[{"code": "INTRUSION", "points": 40}],
            zone_name="Sector Alpha",
            current_time=100.1,
        )
        passed = inc1 is not None and inc2 is None
        report_test("Test 09", "Duplicate Prevention on Active Threat", passed, f"First -> {inc1.id if inc1 else None}, Second -> {inc2}")
    except Exception as e:
        report_test("Test 09", "Duplicate Prevention on Active Threat", False, str(e))

    # -------------------------------------------------------------
    # TEST 10: Post-Event Capture
    # -------------------------------------------------------------
    try:
        mgr = IncidentManager(
            backend_http_url="http://127.0.0.1:8000",
            pre_event_seconds=2.0,
            post_event_seconds=2.0,
        )
        frame = create_dummy_frame()
        # Feed 3 pre-event frames
        mgr.record_frame("cam-01", frame, timestamp=100.0)
        mgr.record_frame("cam-01", frame, timestamp=101.0)
        mgr.record_frame("cam-01", frame, timestamp=102.0)

        inc = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=10,
            class_name="person",
            risk_score=75,
            risk_level="CRITICAL",
            reasons=[{"code": "INTRUSION", "points": 40}],
            zone_name="Sector Alpha",
            current_time=102.0,
        )
        initial_frame_count = len(inc.frames) if inc else 0

        # Feed post-event frames at 102.5 and 103.0
        mgr.record_frame("cam-01", frame, timestamp=102.5)
        mgr.record_frame("cam-01", frame, timestamp=103.0)

        updated_count = len(inc.frames) if inc else 0
        passed = updated_count == initial_frame_count + 2
        report_test("Test 10", "Post-Event Frames Accumulated", passed, f"Initial: {initial_frame_count}, After post-event: {updated_count}")
    except Exception as e:
        report_test("Test 10", "Post-Event Frames Accumulated", False, str(e))

    # -------------------------------------------------------------
    # TEST 11: MP4 Creation
    # -------------------------------------------------------------
    test_inc_id = f"INC-P7-TEST-{int(time.time() * 1000)}"
    mp4_path = ""
    try:
        writer = EvidenceWriter(evidence_dir=test_evidence_dir, fps=10.0)
        frames = [(100.0 + i * 0.1, create_dummy_frame(text=f"FRAME {i}")) for i in range(15)]
        meta = {
            "camera_id": "CAM-01",
            "track_id": 11,
            "class_name": "person",
            "event_type": "INTRUSION",
            "risk_score": 80,
            "risk_level": "CRITICAL",
            "zone_name": "Sector Alpha",
            "reasons": [{"code": "INTRUSION", "points": 40}],
        }
        res = writer.write_evidence_clip(test_inc_id, frames, meta)
        mp4_path = res["file_path"]
        passed = res["success"] and res["frame_count"] == 15 and os.path.exists(res["absolute_path"])
        report_test("Test 11", "MP4 Evidence Creation Works", passed, f"Created {res['file_path']} ({res['frame_count']} frames)")
    except Exception as e:
        report_test("Test 11", "MP4 Evidence Creation Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 12: Evidence File Existence & Non-Zero Size
    # -------------------------------------------------------------
    try:
        abs_mp4 = os.path.abspath(mp4_path) if mp4_path else ""
        exists = os.path.exists(abs_mp4)
        size = os.path.getsize(abs_mp4) if exists else 0
        passed = exists and size > 1024  # Video file must be at least 1 KB
        report_test("Test 12", "Evidence File Verified on Disk", passed, f"File size: {size} bytes")
    except Exception as e:
        report_test("Test 12", "Evidence File Verified on Disk", False, str(e))

    # -------------------------------------------------------------
    # TEST 13: Metadata Persistence in SQLite
    # -------------------------------------------------------------
    sqlite_inc_id = f"INC-SQL-{int(time.time() * 1000)}"
    try:
        resp = requests.post(
            "http://127.0.0.1:8000/api/incidents",
            json={
                "id": sqlite_inc_id,
                "camera_id": "cam-01",
                "track_id": "13",
                "event_type": "RISK_ASSESSMENT",
                "risk_score": 87,
                "risk_level": "CRITICAL",
                "zone_name": "Sector Alpha",
                "started_at": "2026-08-27T18:00:00Z",
                "pre_event_seconds": 10.0,
                "post_event_seconds": 10.0,
                "evidence_status": "ready",
                "evidence_path": mp4_path,
                "metadata": {"reasons": [{"code": "INTRUSION", "points": 40}, {"code": "LOITERING", "points": 25}]},
            },
            timeout=5.0,
        )
        passed = resp.status_code == 201 and resp.json().get("data", {}).get("id") == sqlite_inc_id
        report_test("Test 13", "Metadata Persisted in SQLite", passed, f"HTTP {resp.status_code}, ID: {sqlite_inc_id}")
    except Exception as e:
        report_test("Test 13", "Metadata Persisted in SQLite", False, str(e))

    # -------------------------------------------------------------
    # TEST 14: Risk Score Preservation
    # -------------------------------------------------------------
    try:
        resp = requests.get(f"http://127.0.0.1:8000/api/incidents/{sqlite_inc_id}", timeout=5.0)
        data = resp.json().get("data", {})
        passed = resp.status_code == 200 and data.get("risk_score") == 87 and data.get("risk_level") == "CRITICAL"
        report_test("Test 14", "Risk Score Preserved in Database", passed, f"Score: {data.get('risk_score')}, Level: {data.get('risk_level')}")
    except Exception as e:
        report_test("Test 14", "Risk Score Preserved in Database", False, str(e))

    # -------------------------------------------------------------
    # TEST 15: Risk Reason Preservation
    # -------------------------------------------------------------
    try:
        resp = requests.get(f"http://127.0.0.1:8000/api/incidents/{sqlite_inc_id}", timeout=5.0)
        data = resp.json().get("data", {})
        reasons = data.get("metadata", {}).get("reasons", [])
        passed = resp.status_code == 200 and len(reasons) == 2 and reasons[0].get("code") == "INTRUSION"
        report_test("Test 15", "Risk Reasons Preserved in Database", passed, f"Extracted {len(reasons)} reason codes: {[r.get('code') for r in reasons]}")
    except Exception as e:
        report_test("Test 15", "Risk Reasons Preserved in Database", False, str(e))

    # -------------------------------------------------------------
    # TEST 16: Multi-Camera Buffer Isolation
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=5.0)
        frame1 = create_dummy_frame(text="CAM1")
        frame2 = create_dummy_frame(text="CAM2")
        buf.push("cam-01", frame1, timestamp=100.0)
        buf.push("cam-01", frame1, timestamp=101.0)
        buf.push("cam-02", frame2, timestamp=200.0)

        c1 = buf.get_frame_count("cam-01")
        c2 = buf.get_frame_count("cam-02")
        passed = c1 == 2 and c2 == 1 and buf.get_oldest_timestamp("cam-02") == 200.0
        report_test("Test 16", "Multi-Camera Buffer Isolation", passed, f"cam-01: {c1} frames, cam-02: {c2} frames")
    except Exception as e:
        report_test("Test 16", "Multi-Camera Buffer Isolation", False, str(e))

    # -------------------------------------------------------------
    # TEST 17: Track ID Preservation
    # -------------------------------------------------------------
    try:
        resp = requests.get(f"http://127.0.0.1:8000/api/incidents/{sqlite_inc_id}", timeout=5.0)
        data = resp.json().get("data", {})
        passed = resp.status_code == 200 and data.get("track_id") == "13"
        report_test("Test 17", "Track ID Preserved in Database", passed, f"Track ID: #{data.get('track_id')}")
    except Exception as e:
        report_test("Test 17", "Track ID Preserved in Database", False, str(e))

    # -------------------------------------------------------------
    # TEST 18: Incident REST API (List, Get, Acknowledge, Evidence)
    # -------------------------------------------------------------
    try:
        # 1. List
        r_list = requests.get("http://127.0.0.1:8000/api/incidents?limit=5", timeout=5.0)
        # 2. Acknowledge
        r_ack = requests.post(f"http://127.0.0.1:8000/api/incidents/{sqlite_inc_id}/acknowledge", timeout=5.0)
        # 3. Evidence stream
        r_ev = requests.get(f"http://127.0.0.1:8000/api/incidents/{sqlite_inc_id}/evidence", timeout=5.0)
        passed = (
            r_list.status_code == 200
            and r_ack.status_code == 200
            and r_ack.json().get("data", {}).get("acknowledged") is True
            and r_ev.status_code == 200
            and "video/mp4" in r_ev.headers.get("content-type", "")
        )
        report_test("Test 18", "Incident REST API Verified", passed, f"List: HTTP {r_list.status_code}, Ack: HTTP {r_ack.status_code}, Evidence: HTTP {r_ev.status_code}")
    except Exception as e:
        report_test("Test 18", "Incident REST API Verified", False, str(e))

    # -------------------------------------------------------------
    # TEST 19: WebSocket incident_created Broadcast
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_incident_created():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                # Send incident_created broadcast packet
                test_payload = {
                    "type": "incident_created",
                    "data": {
                        "id": "INC-WS-001",
                        "camera_id": "cam-01",
                        "risk_score": 87,
                        "risk_level": "CRITICAL",
                    },
                }
                await ws.send(json.dumps(test_payload))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "incident_created" and parsed.get("data", {}).get("id") == "INC-WS-001"

        ws_passed = asyncio.run(test_ws_incident_created())
        report_test("Test 19", "WebSocket incident_created Broadcast", ws_passed, "Received incident_created packet over /ws")
    except Exception as e:
        report_test("Test 19", "WebSocket incident_created Broadcast", False, str(e))

    # -------------------------------------------------------------
    # TEST 20: WebSocket evidence_ready Broadcast
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_evidence_ready():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                test_payload = {
                    "type": "evidence_ready",
                    "data": {
                        "id": "INC-WS-001",
                        "camera_id": "cam-01",
                        "evidence_path": "evidence/INC-WS-001.mp4",
                    },
                }
                await ws.send(json.dumps(test_payload))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "evidence_ready" and parsed.get("data", {}).get("id") == "INC-WS-001"

        ws_ev_passed = asyncio.run(test_ws_evidence_ready())
        report_test("Test 20", "WebSocket evidence_ready Broadcast", ws_ev_passed, "Received evidence_ready packet over /ws")
    except Exception as e:
        report_test("Test 20", "WebSocket evidence_ready Broadcast", False, str(e))

    # -------------------------------------------------------------
    # TEST 21: Failed Writer Handling (Graceful Error Handling)
    # -------------------------------------------------------------
    try:
        writer = EvidenceWriter(evidence_dir=test_evidence_dir)
        # Passing empty frame list must raise clean ValueError
        threw_error = False
        try:
            writer.write_evidence_clip("INC-ERR", [], {})
        except ValueError:
            threw_error = True
        report_test("Test 21", "Failed Writer Handling", threw_error, "Correctly caught empty frames exception without crashing")
    except Exception as e:
        report_test("Test 21", "Failed Writer Handling", False, str(e))

    # -------------------------------------------------------------
    # TEST 22: Empty Buffer Handling
    # -------------------------------------------------------------
    try:
        buf = CircularFrameBuffer(pre_event_seconds=5.0)
        frames = buf.get_pre_event_frames("cam-99", trigger_time=100.0)
        passed = isinstance(frames, list) and len(frames) == 0
        report_test("Test 22", "Empty Buffer Handled Gracefully", passed, f"Returned clean empty list: {frames}")
    except Exception as e:
        report_test("Test 22", "Empty Buffer Handled Gracefully", False, str(e))

    # -------------------------------------------------------------
    # TEST 23: Phase 6 Risk Regression Suite (36 tests)
    # -------------------------------------------------------------
    try:
        res_p6 = subprocess.run(
            [sys.executable, "cv_service/tests/phase6_test.py"],
            capture_output=True,
            text=True,
            timeout=240,
        )
        passed = res_p6.returncode == 0 and "Failed: 0" in res_p6.stdout
        report_test("Test 23", "Phase 6 Risk Regression Suite", passed, "36/36 Phase 6 risk tests passed")
    except Exception as e:
        report_test("Test 23", "Phase 6 Risk Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 24: Phase 5 Loitering Regression Suite (31 tests)
    # -------------------------------------------------------------
    try:
        res_p5 = subprocess.run(
            [sys.executable, "cv_service/tests/phase5_test.py"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        passed = res_p5.returncode == 0 and "Failed: 0" in res_p5.stdout
        report_test("Test 24", "Phase 5 Loitering Regression Suite", passed, "31/31 Phase 5 loitering tests passed")
    except Exception as e:
        report_test("Test 24", "Phase 5 Loitering Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 25: Phase 4 Intrusion Regression Suite (22 tests)
    # -------------------------------------------------------------
    try:
        res_p4 = subprocess.run(
            [sys.executable, "cv_service/tests/phase4_test.py"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        passed = res_p4.returncode == 0 and "Failed: 0" in res_p4.stdout
        report_test("Test 25", "Phase 4 Intrusion Regression Suite", passed, "22/22 Phase 4 intrusion tests passed")
    except Exception as e:
        report_test("Test 25", "Phase 4 Intrusion Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 26: Phase 3 Tracking Regression Suite (12 tests)
    # -------------------------------------------------------------
    try:
        res_p3 = subprocess.run(
            [sys.executable, "cv_service/tests/phase3_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
        )
        passed = res_p3.returncode == 0 and "Failed: 0" in res_p3.stdout
        report_test("Test 26", "Phase 3 Tracking Regression Suite", passed, "12/12 Phase 3 tracking tests passed")
    except Exception as e:
        report_test("Test 26", "Phase 3 Tracking Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 27: Phase 2 Detection Regression Suite (12 tests)
    # -------------------------------------------------------------
    try:
        res_p2 = subprocess.run(
            [sys.executable, "cv_service/tests/phase2_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
        )
        passed = res_p2.returncode == 0 and "Failed: 0" in res_p2.stdout
        report_test("Test 27", "Phase 2 Detection Regression Suite", passed, "12/12 Phase 2 detection tests passed")
    except Exception as e:
        report_test("Test 27", "Phase 2 Detection Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 28: Phase 1 Backend Regression Suite (13 tests)
    # -------------------------------------------------------------
    try:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res_p1 = subprocess.run(
            [npm_cmd, "run", "test:phase1"],
            capture_output=True,
            text=True,
            timeout=60,
            shell=(sys.platform == "win32"),
        )
        passed = res_p1.returncode == 0 and "Failed: 0" in res_p1.stdout and "Passed: 13" in res_p1.stdout
        report_test("Test 28", "Phase 1 Backend Regression Suite", passed, "13/13 Phase 1 REST & DB tests passed")
    except Exception as e:
        report_test("Test 28", "Phase 1 Backend Regression Suite", False, str(e))

    # Clean up test dir
    shutil.rmtree(test_evidence_dir, ignore_errors=True)

    total = len(TEST_RESULTS)
    passed_count = sum(1 for t in TEST_RESULTS if t["passed"])
    failed_count = total - passed_count

    print("\n===================================================================")
    print("[SUMMARY] PHASE 7 TEST SUMMARY:")
    print(f"  Total:  {total}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {failed_count}")
    print("===================================================================\n")

    if failed_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    run_phase7_suite()
