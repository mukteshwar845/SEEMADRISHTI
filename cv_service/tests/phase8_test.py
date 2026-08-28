"""
SEEMADRISHTI AI - Phase 8 Multi-Camera Intelligent Threat Correlation Automated Test Suite

Verification suite for:
- Spatial camera topology graph (nodes, edges, bidirectional transitions)
- Travel time window validation (min_travel, max_travel boundaries)
- Target class compatibility gating
- Event sequence & temporal progression
- Multi-camera escalation (CAM-01 -> CAM-02 -> CAM-03)
- Camera-local track ID isolation (zero fake re-ID)
- Same-camera and duplicate suppression
- Deterministic explainable scoring and reason-code generation
- SQLite persistence (correlated_incidents table)
- REST API (/api/correlations, :id, :id/timeline, :id/incidents)
- WebSocket broadcast (correlation_created, correlation_updated, correlation_escalated)
- Regressions for Phases 1 through 7
"""

import asyncio
import json
import os
import subprocess
import sys
import time
from typing import Any, Dict, List
import requests

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from cv_service.correlation.camera_topology import CameraEdge, CameraTopology
from cv_service.correlation.correlation_models import (
    CorrelatedIncident,
    CorrelationReason,
    Observation,
)
from cv_service.correlation.correlation_engine import CorrelationEngine

TEST_RESULTS = []


def report_test(test_id: str, name: str, passed: bool, details: str = ""):
    status_str = "[PASS]" if passed else "[FAIL]"
    msg = f"  {status_str} {test_id}: {name}"
    if details:
        msg += f" -> {details}"
    print(msg)
    TEST_RESULTS.append({"test_id": test_id, "name": name, "passed": passed, "details": details})


def run_phase8_suite():
    print("\n===================================================================")
    print("[TEST SUITE] RUNNING SEEMADRISHTI PHASE 8 CORRELATION ENGINE TESTS")
    print("===================================================================\n")

    # -------------------------------------------------------------
    # TEST 01: Camera Topology Initializes
    # -------------------------------------------------------------
    try:
        topo = CameraTopology()
        nodes = len(topo._camera_nodes)
        edges = len(topo.get_all_edges())
        passed = nodes >= 4 and edges >= 6
        report_test("Test 01", "Camera Topology Initializes", passed, f"Nodes: {nodes}, Edges: {edges}")
    except Exception as e:
        report_test("Test 01", "Camera Topology Initializes", False, str(e))

    # -------------------------------------------------------------
    # TEST 02: Camera Relationship Loads
    # -------------------------------------------------------------
    try:
        topo = CameraTopology()
        edge = topo.get_relationship("cam-01", "cam-02")
        passed = (
            edge is not None
            and edge.min_travel_seconds == 3.0
            and edge.max_travel_seconds == 30.0
            and edge.bidirectional is True
        )
        report_test("Test 02", "Camera Relationship Loads", passed, f"cam-01 -> cam-02: {edge.min_travel_seconds}s - {edge.max_travel_seconds}s")
    except Exception as e:
        report_test("Test 02", "Camera Relationship Loads", False, str(e))

    # -------------------------------------------------------------
    # TEST 03: Valid Topology Transition Accepted
    # -------------------------------------------------------------
    try:
        topo = CameraTopology()
        connected = topo.are_cameras_connected("cam-01", "cam-02")
        valid, msg = topo.is_transition_timely("cam-01", "cam-02", elapsed_seconds=12.0)
        passed = connected and valid
        report_test("Test 03", "Valid Topology Transition Accepted", passed, f"12s transition: {msg}")
    except Exception as e:
        report_test("Test 03", "Valid Topology Transition Accepted", False, str(e))

    # -------------------------------------------------------------
    # TEST 04: Invalid Topology Transition Rejected
    # -------------------------------------------------------------
    try:
        topo = CameraTopology()
        connected = topo.are_cameras_connected("cam-01", "cam-99")
        valid, msg = topo.is_transition_timely("cam-01", "cam-99", elapsed_seconds=10.0)
        passed = (not connected) and (not valid)
        report_test("Test 04", "Invalid Topology Transition Rejected", passed, f"cam-01 -> cam-99 rejected: {msg}")
    except Exception as e:
        report_test("Test 04", "Invalid Topology Transition Rejected", False, str(e))

    # -------------------------------------------------------------
    # TEST 05: Compatible Class Accepted
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        corr = CorrelatedIncident(
            id="CORR-T5",
            status="ACTIVE",
            observations=[Observation(camera_id="cam-01", track_id="1", class_name="person", timestamp=100.0)],
        )
        new_obs = Observation(camera_id="cam-02", track_id="5", class_name="person", timestamp=110.0)
        matched, score, reasons = engine.calculate_match(corr, new_obs, current_time=110.0)
        has_class_reason = any(r.code == "CLASS_MATCH" for r in reasons)
        passed = matched and has_class_reason
        report_test("Test 05", "Compatible Class Accepted", passed, f"Person-person matched with score: {score}")
    except Exception as e:
        report_test("Test 05", "Compatible Class Accepted", False, str(e))

    # -------------------------------------------------------------
    # TEST 06: Incompatible Class Rejected
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        corr = CorrelatedIncident(
            id="CORR-T6",
            status="ACTIVE",
            observations=[Observation(camera_id="cam-01", track_id="1", class_name="person", timestamp=100.0)],
        )
        new_obs = Observation(camera_id="cam-02", track_id="2", class_name="car", timestamp=110.0)
        matched, score, reasons = engine.calculate_match(corr, new_obs, current_time=110.0)
        passed = not matched
        report_test("Test 06", "Incompatible Class Rejected", passed, f"Person vs Car matched: {matched}")
    except Exception as e:
        report_test("Test 06", "Incompatible Class Rejected", False, str(e))

    # -------------------------------------------------------------
    # TEST 07: Valid Temporal Window Accepted
    # -------------------------------------------------------------
    try:
        topo = CameraTopology()
        timely, msg = topo.is_transition_timely("cam-01", "cam-02", elapsed_seconds=15.0)
        passed = timely
        report_test("Test 07", "Valid Temporal Window Accepted", passed, f"15s in [3s, 30s]: {msg}")
    except Exception as e:
        report_test("Test 07", "Valid Temporal Window Accepted", False, str(e))

    # -------------------------------------------------------------
    # TEST 08: Expired Temporal Window Rejected
    # -------------------------------------------------------------
    try:
        topo = CameraTopology()
        timely, msg = topo.is_transition_timely("cam-01", "cam-02", elapsed_seconds=120.0)
        passed = not timely and "expired" in msg.lower()
        report_test("Test 08", "Expired Temporal Window Rejected", passed, f"120s vs max 30s: {msg}")
    except Exception as e:
        report_test("Test 08", "Expired Temporal Window Rejected", False, str(e))

    # -------------------------------------------------------------
    # TEST 09: Valid Camera Sequence Correlated
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c1 = engine.ingest_event(camera_id="cam-01", track_id="1", class_name="person", risk_level="HIGH", risk_score=65, timestamp=100.0)
        c2 = engine.ingest_event(camera_id="cam-02", track_id="2", class_name="person", risk_level="HIGH", risk_score=70, timestamp=115.0)
        passed = c1 is not None and c2 is not None and c1.id == c2.id and c2.camera_sequence == ["cam-01", "cam-02"]
        report_test("Test 09", "Valid Camera Sequence Correlated", passed, f"Sequence: {c2.camera_sequence if c2 else None}")
    except Exception as e:
        report_test("Test 09", "Valid Camera Sequence Correlated", False, str(e))

    # -------------------------------------------------------------
    # TEST 10: Invalid Camera Sequence Rejected
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c1 = engine.ingest_event(camera_id="cam-01", track_id="10", class_name="person", risk_level="HIGH", risk_score=65, timestamp=200.0)
        # cam-01 does not connect directly to cam-03 (only via cam-02)
        c_invalid = engine.ingest_event(camera_id="cam-03", track_id="20", class_name="person", risk_level="LOW", risk_score=20, timestamp=210.0)
        # c_invalid should not link to c1 (c_invalid will either be None or new correlation if HIGH)
        passed = (c_invalid is None) and ("cam-03" not in c1.camera_sequence)
        report_test("Test 10", "Invalid Camera Sequence Rejected", passed, f"cam-01 -> cam-03 without intermediate hop was rejected")
    except Exception as e:
        report_test("Test 10", "Invalid Camera Sequence Rejected", False, str(e))

    # -------------------------------------------------------------
    # TEST 11: First Incident Creates Correlation
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c = engine.ingest_event(camera_id="cam-01", track_id="100", class_name="person", risk_level="HIGH", risk_score=65, timestamp=300.0)
        passed = c is not None and c.status == "ACTIVE" and c.camera_sequence == ["cam-01"]
        report_test("Test 11", "First Incident Creates Correlation", passed, f"Created {c.id if c else None} ({c.correlation_level if c else None})")
    except Exception as e:
        report_test("Test 11", "First Incident Creates Correlation", False, str(e))

    # -------------------------------------------------------------
    # TEST 12: Second Compatible Incident Extends Correlation
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c1 = engine.ingest_event(camera_id="cam-01", track_id="101", class_name="person", risk_level="HIGH", risk_score=65, timestamp=400.0)
        c2 = engine.ingest_event(camera_id="cam-02", track_id="202", class_name="person", risk_level="HIGH", risk_score=75, timestamp=412.0)
        passed = c1 is not None and c2 is not None and c1.id == c2.id and len(c2.observations) == 2
        report_test("Test 12", "Second Compatible Incident Extends Correlation", passed, f"Total observations: {len(c2.observations) if c2 else 0}")
    except Exception as e:
        report_test("Test 12", "Second Compatible Incident Extends Correlation", False, str(e))

    # -------------------------------------------------------------
    # TEST 13: Third Camera Extends Correlation
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c1 = engine.ingest_event(camera_id="cam-01", track_id="1", class_name="person", risk_level="HIGH", risk_score=65, timestamp=500.0)
        c2 = engine.ingest_event(camera_id="cam-02", track_id="2", class_name="person", risk_level="HIGH", risk_score=70, timestamp=515.0)
        c3 = engine.ingest_event(camera_id="cam-03", track_id="3", class_name="person", risk_level="HIGH", risk_score=75, timestamp=535.0)
        passed = (
            c3 is not None
            and c3.id == c1.id
            and c3.camera_sequence == ["cam-01", "cam-02", "cam-03"]
            and len(c3.observations) == 3
        )
        report_test("Test 13", "Third Camera Extends Correlation", passed, f"Full Corridor: {' -> '.join(c3.camera_sequence) if c3 else None}")
    except Exception as e:
        report_test("Test 13", "Third Camera Extends Correlation", False, str(e))

    # -------------------------------------------------------------
    # TEST 14: Track IDs Remain Camera-Local (Rule 3)
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        engine.ingest_event(camera_id="cam-01", track_id="17", class_name="person", risk_level="HIGH", timestamp=600.0)
        corr = engine.ingest_event(camera_id="cam-02", track_id="4", class_name="person", risk_level="HIGH", timestamp=615.0)
        obs_ids = [(obs.camera_id, obs.track_id) for obs in corr.observations] if corr else []
        # Track IDs must NOT be merged or changed
        passed = obs_ids == [("cam-01", "17"), ("cam-02", "4")]
        report_test("Test 14", "Track IDs Remain Camera-Local", passed, f"Local observations: {obs_ids}")
    except Exception as e:
        report_test("Test 14", "Track IDs Remain Camera-Local", False, str(e))

    # -------------------------------------------------------------
    # TEST 15: Same Camera Does Not Falsely Cross-Correlate
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c1 = engine.ingest_event(camera_id="cam-01", track_id="10", class_name="person", risk_level="HIGH", timestamp=700.0)
        # Event on same camera 5s later should not be treated as a cross-camera hop
        c2 = engine.ingest_event(camera_id="cam-01", track_id="11", class_name="person", risk_level="HIGH", timestamp=705.0)
        # Same camera must not match as an extension of c1
        passed = c1 is not None and c2 is not None and c1.id != c2.id
        report_test("Test 15", "Same Camera Does Not Falsely Cross-Correlate", passed, f"c1 ID: {c1.id}, c2 ID: {c2.id} (Separate sessions)")
    except Exception as e:
        report_test("Test 15", "Same Camera Does Not Falsely Cross-Correlate", False, str(e))

    # -------------------------------------------------------------
    # TEST 16: Duplicate Event Suppressed
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        c1 = engine.ingest_event(camera_id="cam-01", track_id="25", class_name="person", risk_level="HIGH", timestamp=800.0)
        # Exact duplicate
        c_dup = engine.ingest_event(camera_id="cam-01", track_id="25", class_name="person", risk_level="HIGH", timestamp=800.0)
        passed = c1 is not None and c_dup is None
        report_test("Test 16", "Duplicate Event Suppressed", passed, f"Duplicate return: {c_dup}")
    except Exception as e:
        report_test("Test 16", "Duplicate Event Suppressed", False, str(e))

    # -------------------------------------------------------------
    # TEST 17: Correlation Reasons Generated
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        engine.ingest_event(camera_id="cam-01", track_id="1", class_name="person", risk_level="HIGH", timestamp=900.0)
        corr = engine.ingest_event(camera_id="cam-02", track_id="2", class_name="person", risk_level="HIGH", timestamp=915.0)
        reason_codes = [r.code for r in corr.reasons] if corr else []
        passed = "CLASS_MATCH" in reason_codes and "CAMERA_TOPOLOGY" in reason_codes and "TEMPORAL_MATCH" in reason_codes
        report_test("Test 17", "Correlation Reasons Generated", passed, f"Reasons: {reason_codes}")
    except Exception as e:
        report_test("Test 17", "Correlation Reasons Generated", False, str(e))

    # -------------------------------------------------------------
    # TEST 18: Correlation Score Calculated Correctly
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        engine.ingest_event(camera_id="cam-01", track_id="1", class_name="person", risk_level="HIGH", timestamp=1000.0)
        corr = engine.ingest_event(camera_id="cam-02", track_id="2", class_name="person", risk_level="HIGH", timestamp=1015.0)
        # Class (30) + Topology (30) + Temporal (25) + Sequence (15) = 100
        passed = corr is not None and corr.correlation_score >= 85
        report_test("Test 18", "Correlation Score Calculated Correctly", passed, f"Calculated score: {corr.correlation_score if corr else 0}/100")
    except Exception as e:
        report_test("Test 18", "Correlation Score Calculated Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 19: Correlation Level Calculated Correctly
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        l_low = engine.get_correlation_level(20)
        l_med = engine.get_correlation_level(40)
        l_high = engine.get_correlation_level(65)
        l_crit = engine.get_correlation_level(85)
        passed = l_low == "LOW" and l_med == "MEDIUM" and l_high == "HIGH" and l_crit == "CRITICAL"
        report_test("Test 19", "Correlation Level Calculated Correctly", passed, f"20={l_low}, 40={l_med}, 65={l_high}, 85={l_crit}")
    except Exception as e:
        report_test("Test 19", "Correlation Level Calculated Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 20: HIGH Correlation Generated
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        corr = engine.ingest_event(camera_id="cam-01", track_id="50", class_name="person", risk_level="HIGH", timestamp=1100.0)
        passed = corr is not None and corr.correlation_level == "HIGH" and corr.correlation_score == 50
        report_test("Test 20", "HIGH Correlation Generated", passed, f"Score: {corr.correlation_score if corr else None} [{corr.correlation_level if corr else None}]")
    except Exception as e:
        report_test("Test 20", "HIGH Correlation Generated", False, str(e))

    # -------------------------------------------------------------
    # TEST 21: CRITICAL Escalation Generated
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        engine.ingest_event(camera_id="cam-01", track_id="1", class_name="person", risk_level="HIGH", timestamp=1200.0)
        c2 = engine.ingest_event(camera_id="cam-02", track_id="2", class_name="person", risk_level="HIGH", timestamp=1215.0)
        passed = c2 is not None and c2.correlation_level == "CRITICAL" and c2.correlation_score >= 75
        report_test("Test 21", "CRITICAL Escalation Generated", passed, f"Score: {c2.correlation_score if c2 else None} [{c2.correlation_level if c2 else None}]")
    except Exception as e:
        report_test("Test 21", "CRITICAL Escalation Generated", False, str(e))

    # -------------------------------------------------------------
    # TEST 22: Risk Escalation Persisted
    # -------------------------------------------------------------
    test_corr_id = f"CORR-P8-ESC-{int(time.time() * 1000)}"
    try:
        # Create initially as HIGH
        r1 = requests.post(
            "http://127.0.0.1:8000/api/correlations",
            json={
                "id": test_corr_id,
                "correlation_score": 60,
                "correlation_level": "HIGH",
                "started_at": "2026-08-28T05:00:00Z",
                "last_seen_at": "2026-08-28T05:00:00Z",
                "camera_sequence": ["cam-01"],
                "observations": [{"camera_id": "cam-01", "track_id": "1", "timestamp": "2026-08-28T05:00:00Z"}],
                "reasons": [{"code": "INITIAL_BREACH", "points": 60, "message": "Initial"}],
            },
            timeout=5.0,
        )
        # Escalate to CRITICAL
        r2 = requests.patch(
            f"http://127.0.0.1:8000/api/correlations/{test_corr_id}",
            json={
                "correlation_score": 85,
                "correlation_level": "CRITICAL",
                "camera_sequence": ["cam-01", "cam-02"],
            },
            timeout=5.0,
        )
        passed = r1.status_code == 201 and r2.status_code == 200 and r2.json().get("data", {}).get("correlation_level") == "CRITICAL"
        report_test("Test 22", "Risk Escalation Persisted", passed, f"Level: {r2.json().get('data', {}).get('correlation_level')}")
    except Exception as e:
        report_test("Test 22", "Risk Escalation Persisted", False, str(e))

    # -------------------------------------------------------------
    # TEST 23: SQLite Correlation Persistence
    # -------------------------------------------------------------
    try:
        r = requests.get(f"http://127.0.0.1:8000/api/correlations/{test_corr_id}", timeout=5.0)
        data = r.json().get("data", {})
        passed = r.status_code == 200 and data.get("id") == test_corr_id and data.get("camera_sequence") == ["cam-01", "cam-02"]
        report_test("Test 23", "SQLite Correlation Persistence", passed, f"ID: {data.get('id')}, Status: {data.get('status')}")
    except Exception as e:
        report_test("Test 23", "SQLite Correlation Persistence", False, str(e))

    # -------------------------------------------------------------
    # TEST 24: REST List Endpoint
    # -------------------------------------------------------------
    try:
        r = requests.get("http://127.0.0.1:8000/api/correlations?limit=10", timeout=5.0)
        passed = r.status_code == 200 and isinstance(r.json().get("data"), list) and r.json().get("success") is True
        report_test("Test 24", "REST List Endpoint (/api/correlations)", passed, f"Retrieved {len(r.json().get('data', []))} records")
    except Exception as e:
        report_test("Test 24", "REST List Endpoint (/api/correlations)", False, str(e))

    # -------------------------------------------------------------
    # TEST 25: REST Detail Endpoint
    # -------------------------------------------------------------
    try:
        r = requests.get(f"http://127.0.0.1:8000/api/correlations/{test_corr_id}", timeout=5.0)
        passed = r.status_code == 200 and r.json().get("data", {}).get("id") == test_corr_id
        report_test("Test 25", "REST Detail Endpoint (/api/correlations/:id)", passed, f"HTTP {r.status_code}")
    except Exception as e:
        report_test("Test 25", "REST Detail Endpoint (/api/correlations/:id)", False, str(e))

    # -------------------------------------------------------------
    # TEST 26: REST Timeline Endpoint
    # -------------------------------------------------------------
    try:
        r = requests.get(f"http://127.0.0.1:8000/api/correlations/{test_corr_id}/timeline", timeout=5.0)
        t_data = r.json().get("data", {})
        passed = r.status_code == 200 and "timeline" in t_data and isinstance(t_data.get("timeline"), list)
        report_test("Test 26", "REST Timeline Endpoint (/api/correlations/:id/timeline)", passed, f"Timeline steps: {len(t_data.get('timeline', []))}")
    except Exception as e:
        report_test("Test 26", "REST Timeline Endpoint (/api/correlations/:id/timeline)", False, str(e))

    # -------------------------------------------------------------
    # TEST 27: WebSocket correlation_created
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_corr_created():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                pkt = {
                    "type": "correlation_created",
                    "data": {
                        "id": "CORR-WS-001",
                        "correlation_score": 75,
                        "correlation_level": "CRITICAL",
                        "camera_sequence": ["cam-01", "cam-02"],
                    },
                }
                await ws.send(json.dumps(pkt))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "correlation_created" and parsed.get("data", {}).get("id") == "CORR-WS-001"

        ws_passed = asyncio.run(test_ws_corr_created())
        report_test("Test 27", "WebSocket correlation_created Broadcast", ws_passed, "Received correlation_created over /ws")
    except Exception as e:
        report_test("Test 27", "WebSocket correlation_created Broadcast", False, str(e))

    # -------------------------------------------------------------
    # TEST 28: WebSocket correlation_updated
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_corr_updated():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                pkt = {
                    "type": "correlation_updated",
                    "data": {
                        "id": "CORR-WS-001",
                        "correlation_score": 80,
                        "correlation_level": "CRITICAL",
                    },
                }
                await ws.send(json.dumps(pkt))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "correlation_updated" and parsed.get("data", {}).get("id") == "CORR-WS-001"

        ws_upd_passed = asyncio.run(test_ws_corr_updated())
        report_test("Test 28", "WebSocket correlation_updated Broadcast", ws_upd_passed, "Received correlation_updated over /ws")
    except Exception as e:
        report_test("Test 28", "WebSocket correlation_updated Broadcast", False, str(e))

    # -------------------------------------------------------------
    # TEST 29: WebSocket correlation_escalated
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_corr_escalated():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                pkt = {
                    "type": "correlation_escalated",
                    "data": {
                        "correlation_id": "CORR-WS-001",
                        "previous_level": "HIGH",
                        "new_level": "CRITICAL",
                        "score": 85,
                        "camera_sequence": ["cam-01", "cam-02", "cam-03"],
                    },
                }
                await ws.send(json.dumps(pkt))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "correlation_escalated" and parsed.get("data", {}).get("correlation_id") == "CORR-WS-001"

        ws_esc_passed = asyncio.run(test_ws_corr_escalated())
        report_test("Test 29", "WebSocket correlation_escalated Broadcast", ws_esc_passed, "Received correlation_escalated over /ws")
    except Exception as e:
        report_test("Test 29", "WebSocket correlation_escalated Broadcast", False, str(e))

    # -------------------------------------------------------------
    # TEST 30: Multi-Camera Isolation (Independent Tracks)
    # -------------------------------------------------------------
    try:
        engine = CorrelationEngine(backend_http_url="")
        # Sector Alpha track (cam-01)
        c_alpha = engine.ingest_event(camera_id="cam-01", track_id="1", class_name="person", risk_level="HIGH", timestamp=1500.0)
        # Disconnected Sector Charlie Outpost track (cam-04) occurring simultaneously
        # cam-01 to cam-04 minimum travel is 10 seconds, so delta_t=1s will NOT correlate
        c_charlie = engine.ingest_event(camera_id="cam-04", track_id="2", class_name="person", risk_level="HIGH", timestamp=1501.0)
        passed = c_alpha is not None and c_charlie is not None and c_alpha.id != c_charlie.id
        report_test("Test 30", "Multi-Camera Isolation for Unrelated Targets", passed, f"Alpha ID: {c_alpha.id}, Charlie ID: {c_charlie.id} (Strictly isolated)")
    except Exception as e:
        report_test("Test 30", "Multi-Camera Isolation for Unrelated Targets", False, str(e))

    # -------------------------------------------------------------
    # TEST 31: Phase 7 Evidence Regression Suite (28 tests)
    # -------------------------------------------------------------
    try:
        res_p7 = subprocess.run(
            [sys.executable, "cv_service/tests/phase7_test.py"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        passed = res_p7.returncode == 0 and "Failed: 0" in res_p7.stdout
        report_test("Test 31", "Phase 7 Evidence Regression Suite", passed, "28/28 Phase 7 evidence tests passed")
    except Exception as e:
        report_test("Test 31", "Phase 7 Evidence Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 32: Phase 6 Risk Regression Suite (36 tests)
    # -------------------------------------------------------------
    try:
        res_p6 = subprocess.run(
            [sys.executable, "cv_service/tests/phase6_test.py"],
            capture_output=True,
            text=True,
            timeout=240,
        )
        passed = res_p6.returncode == 0 and "Failed: 0" in res_p6.stdout
        report_test("Test 32", "Phase 6 Risk Regression Suite", passed, "36/36 Phase 6 risk tests passed")
    except Exception as e:
        report_test("Test 32", "Phase 6 Risk Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 33: Phase 5 Loitering Regression Suite (31 tests)
    # -------------------------------------------------------------
    try:
        res_p5 = subprocess.run(
            [sys.executable, "cv_service/tests/phase5_test.py"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        passed = res_p5.returncode == 0 and "Failed: 0" in res_p5.stdout
        report_test("Test 33", "Phase 5 Loitering Regression Suite", passed, "31/31 Phase 5 loitering tests passed")
    except Exception as e:
        report_test("Test 33", "Phase 5 Loitering Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 34: Phase 4 Intrusion Regression Suite (22 tests)
    # -------------------------------------------------------------
    try:
        res_p4 = subprocess.run(
            [sys.executable, "cv_service/tests/phase4_test.py"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        passed = res_p4.returncode == 0 and "Failed: 0" in res_p4.stdout
        report_test("Test 34", "Phase 4 Intrusion Regression Suite", passed, "22/22 Phase 4 intrusion tests passed")
    except Exception as e:
        report_test("Test 34", "Phase 4 Intrusion Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 35: Phase 3 Tracking Regression Suite (12 tests)
    # -------------------------------------------------------------
    try:
        res_p3 = subprocess.run(
            [sys.executable, "cv_service/tests/phase3_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
        )
        passed = res_p3.returncode == 0 and "Failed: 0" in res_p3.stdout
        report_test("Test 35", "Phase 3 Tracking Regression Suite", passed, "12/12 Phase 3 tracking tests passed")
    except Exception as e:
        report_test("Test 35", "Phase 3 Tracking Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 36: Phase 2 Detection Regression Suite (12 tests)
    # -------------------------------------------------------------
    try:
        res_p2 = subprocess.run(
            [sys.executable, "cv_service/tests/phase2_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
        )
        passed = res_p2.returncode == 0 and "Failed: 0" in res_p2.stdout
        report_test("Test 36", "Phase 2 Detection Regression Suite", passed, "12/12 Phase 2 detection tests passed")
    except Exception as e:
        report_test("Test 36", "Phase 2 Detection Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # TEST 37: Phase 1 Backend Regression Suite (13 tests)
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
        report_test("Test 37", "Phase 1 Backend Regression Suite", passed, "13/13 Phase 1 REST & DB tests passed")
    except Exception as e:
        report_test("Test 37", "Phase 1 Backend Regression Suite", False, str(e))

    total = len(TEST_RESULTS)
    passed_count = sum(1 for t in TEST_RESULTS if t["passed"])
    failed_count = total - passed_count

    print("\n===================================================================")
    print("[SUMMARY] PHASE 8 TEST SUMMARY:")
    print(f"  Total:  {total}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {failed_count}")
    print("===================================================================\n")

    if failed_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    run_phase8_suite()
