"""
SEEMADRISHTI AI - Phase 21 Test Suite
Cross-Camera Target Journey + Dynamic Threat Heatmap Verification

30 comprehensive unit tests:
1. test_journey_schema
2. test_real_track_journey
3. test_journey_timestamp_order
4. test_camera_path_uses_real_data
5. test_verified_handover_required
6. test_unverified_handover_rejected
7. test_camera_isolation
8. test_journey_insufficient_data
9. test_threat_heatmap_schema
10. test_heatmap_uses_real_events
11. test_heatmap_deterministic
12. test_no_random_heatmap_values
13. test_camera_threat_aggregation
14. test_sector_threat_aggregation
15. test_time_window_filter
16. test_hotspot_detection
17. test_high_risk_corridor_detection
18. test_zero_event_camera_handling
19. test_heatmap_event_breakdown
20. test_incident_to_heatmap_link
21. test_journey_to_camera_link
22. test_search_to_journey_link
23. test_real_cam01_journey
24. test_real_cam01_heatmap
25. test_no_hardcoded_camera_path
26. test_no_hardcoded_heatmap
27. test_phase20_compatibility
28. test_phase19_compatibility
29. test_phase18_compatibility
30. test_phase17_compatibility
"""

import unittest
import time
from datetime import datetime

from cv_service.journey.target_journey import TargetJourneyEngine
from cv_service.analytics.threat_heatmap import ThreatHeatmapEngine, HEATMAP_WEIGHTS
from cv_service.correlation.camera_topology import CameraTopology
from cv_service.search.query_parser import QueryParser


class Phase21TestSuite(unittest.TestCase):

    def setUp(self):
        self.topology = CameraTopology()
        self.journey_engine = TargetJourneyEngine(self.topology)
        self.heatmap_engine = ThreatHeatmapEngine()
        self.query_parser = QueryParser()

    # 1. Schema & Structure Tests
    def test_journey_schema(self):
        """Journey output contains all required fields with proper types."""
        res = self.journey_engine.build_journey(9999, [], [], [], [])
        expected_keys = [
            "track_id", "class", "first_seen", "last_seen", "duration_seconds",
            "risk_score", "risk_level", "camera_path", "unique_cameras",
            "handovers", "observed_events", "correlation_id", "is_complete",
            "insufficient_data", "status_note"
        ]
        for key in expected_keys:
            self.assertIn(key, res, f"Missing key {key} in journey schema")
        self.assertTrue(res["insufficient_data"])

    def test_threat_heatmap_schema(self):
        """Heatmap output contains all required keys, cameras, sectors, and weights."""
        res = self.heatmap_engine.calculate_heatmap([], [], [])
        self.assertIn("hotspot", res)
        self.assertIn("cameras", res)
        self.assertIn("sectors", res)
        self.assertIn("corridors", res)
        self.assertIn("weights", res)
        self.assertEqual(len(res["cameras"]), 9)
        self.assertGreater(len(res["sectors"]), 0)

    # 2. Real Track Journey Tests
    def test_real_track_journey(self):
        """Reconstructs authentic multi-event journey for tracked target."""
        now = time.time()
        events = [
            {"track_id": 27, "camera_id": "cam-01", "event_type": "DETECTION", "timestamp": now - 30},
            {"track_id": 27, "camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 20},
            {"track_id": 27, "camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 10},
        ]
        res = self.journey_engine.build_journey(27, events=events)
        self.assertEqual(res["track_id"], 27)
        self.assertFalse(res["insufficient_data"])
        self.assertEqual(len(res["observed_events"]), 3)
        self.assertGreaterEqual(res["duration_seconds"], 20)

    def test_journey_timestamp_order(self):
        """Events in journey are strictly sorted by timestamp regardless of input order."""
        now = time.time()
        events = [
            {"track_id": 33, "camera_id": "cam-01", "event_type": "LOITERING", "timestamp": now - 5},
            {"track_id": 33, "camera_id": "cam-01", "event_type": "DETECTION", "timestamp": now - 50},
            {"track_id": 33, "camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 25},
        ]
        res = self.journey_engine.build_journey(33, events=events)
        timestamps = [e["timestamp_epoch"] for e in res["observed_events"]]
        self.assertEqual(timestamps, sorted(timestamps))
        self.assertEqual(res["observed_events"][0]["event"], "DETECTION")
        self.assertEqual(res["observed_events"][-1]["event"], "LOITERING")

    def test_camera_path_uses_real_data(self):
        """Camera path nodes are strictly generated from real events."""
        now = time.time()
        events = [
            {"track_id": 42, "camera_id": "cam-02", "event_type": "DETECTION", "timestamp": now - 15},
            {"track_id": 42, "camera_id": "cam-02", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 5},
        ]
        res = self.journey_engine.build_journey(42, events=events)
        for node in res["camera_path"]:
            self.assertEqual(node["camera_id"], "cam-02")
        self.assertEqual(res["unique_cameras"], ["cam-02"])

    # 3. Handover Verification & Isolation
    def test_verified_handover_required(self):
        """Verified handover is flagged when explicit handover event or topology match exists."""
        now = time.time()
        events = [
            {"track_id": 55, "camera_id": "cam-01", "event_type": "DETECTION", "timestamp": now - 30},
            {"track_id": 55, "camera_id": "cam-01", "event_type": "CROSS_CAMERA_HANDOVER", "timestamp": now - 20, "metadata": {"from_camera": "cam-01", "to_camera": "cam-02"}},
            {"track_id": 55, "camera_id": "cam-02", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 10},
        ]
        res = self.journey_engine.build_journey(55, events=events)
        self.assertEqual(len(res["handovers"]), 1)
        self.assertTrue(res["handovers"][0]["verified"])
        self.assertTrue(res["is_complete"])

    def test_unverified_handover_rejected(self):
        """Unconnected cameras without handover records are marked as unverified and incomplete."""
        now = time.time()
        # cam-01 and cam-07 have no direct edge in topology
        events = [
            {"track_id": 88, "camera_id": "cam-01", "event_type": "DETECTION", "timestamp": now - 30},
            {"track_id": 88, "camera_id": "cam-07", "event_type": "DETECTION", "timestamp": now - 10},
        ]
        res = self.journey_engine.build_journey(88, events=events)
        self.assertFalse(res["is_complete"])
        self.assertIn("INSUFFICIENT DATA FOR COMPLETE JOURNEY", res["status_note"])

    def test_camera_isolation(self):
        """Observations on one camera never bleed or duplicate to another camera."""
        now = time.time()
        events = [
            {"track_id": 12, "camera_id": "cam-03", "event_type": "DETECTION", "timestamp": now - 20},
            {"track_id": 12, "camera_id": "cam-03", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 10},
        ]
        res = self.journey_engine.build_journey(12, events=events)
        self.assertEqual(res["unique_cameras"], ["cam-03"])
        self.assertEqual(len(res["handovers"]), 0)

    def test_journey_insufficient_data(self):
        """Returns clear INSUFFICIENT DATA response when track ID has no history."""
        res = self.journey_engine.build_journey(99999)
        self.assertTrue(res["insufficient_data"])
        self.assertIn("INSUFFICIENT DATA", res["status_note"])
        self.assertEqual(len(res["camera_path"]), 0)

    # 4. Threat Heatmap Determinism & Math
    def test_heatmap_uses_real_events(self):
        """Threat intensity increases directly with genuine event counts."""
        now = time.time()
        events = [
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 100},
            {"camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 80},
            {"camera_id": "cam-01", "event_type": "LOITERING", "timestamp": now - 60},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        cam1 = next(c for c in res["cameras"] if c["camera_id"] == "cam-01")
        expected_raw = HEATMAP_WEIGHTS["restricted_breaches"] + HEATMAP_WEIGHTS["tripwire_crossings"] + HEATMAP_WEIGHTS["loitering_events"]
        self.assertEqual(cam1["threat_index"], expected_raw)
        self.assertEqual(cam1["threat_level"], "HIGH")

    def test_heatmap_deterministic(self):
        """Calculations produce identical outputs given identical event inputs."""
        now = time.time()
        events = [
            {"camera_id": "cam-02", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 100},
            {"camera_id": "cam-02", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 50},
        ]
        res1 = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        res2 = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        self.assertEqual(res1["hotspot"]["threat_index"], res2["hotspot"]["threat_index"])
        self.assertEqual(res1["cameras"], res2["cameras"])

    def test_no_random_heatmap_values(self):
        """Zero events produce exactly 0 intensity; never random numbers."""
        res = self.heatmap_engine.calculate_heatmap([])
        for cam in res["cameras"]:
            self.assertEqual(cam["threat_index"], 0)
            self.assertEqual(cam["threat_level"], "LOW")
            self.assertFalse(cam["has_activity"])

    def test_camera_threat_aggregation(self):
        """All 9 canonical CCTV nodes are evaluated and sorted by threat index."""
        now = time.time()
        events = [
            {"camera_id": "cam-04", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 50},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        self.assertEqual(len(res["cameras"]), 9)
        self.assertEqual(res["cameras"][0]["camera_id"], "cam-04")
        self.assertGreater(res["cameras"][0]["threat_index"], res["cameras"][-1]["threat_index"])

    def test_sector_threat_aggregation(self):
        """Sector threat indexes correctly aggregate child camera metrics."""
        now = time.time()
        events = [
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 50},
            {"camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 30},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        sec_alpha = next(s for s in res["sectors"] if s["sector_name"] == "Sector Alpha")
        self.assertGreater(sec_alpha["threat_index"], 0)
        self.assertIn("cam-01", sec_alpha["cameras"])

    def test_time_window_filter(self):
        """Events outside the requested time window are strictly excluded."""
        now = time.time()
        old_events = [
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 5000},
        ]
        # Window of 900 seconds (15 min)
        res = self.heatmap_engine.calculate_heatmap(events=old_events, time_window_seconds=900, current_time=now)
        cam1 = next(c for c in res["cameras"] if c["camera_id"] == "cam-01")
        self.assertEqual(cam1["threat_index"], 0)

    def test_hotspot_detection(self):
        """The camera with the maximum threat is correctly identified as the hotspot."""
        now = time.time()
        events = [
            {"camera_id": "cam-02", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 100},
            {"camera_id": "cam-03", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 50},
            {"camera_id": "cam-03", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 40},
            {"camera_id": "cam-03", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 30},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        self.assertEqual(res["hotspot"]["camera_id"], "cam-03")
        self.assertEqual(res["hotspot"]["threat_level"], "CRITICAL")

    def test_high_risk_corridor_detection(self):
        """Multi-camera correlated movements are detected as propagating corridors."""
        correlations = [
            {
                "id": "CORR-01",
                "camera_sequence": ["cam-01", "cam-02"],
                "correlation_score": 85,
            }
        ]
        res = self.heatmap_engine.calculate_heatmap(correlated_incidents=correlations)
        self.assertGreaterEqual(len(res["corridors"]), 1)
        self.assertEqual(res["corridors"][0]["corridor_id"], "cam-01->cam-02")
        self.assertEqual(res["corridors"][0]["threat_score"], 85)

    def test_zero_event_camera_handling(self):
        """Quiet cameras report clean zeroes without errors or NaN."""
        res = self.heatmap_engine.calculate_heatmap([])
        for cam in res["cameras"]:
            self.assertEqual(cam["threat_index"], 0)
            self.assertEqual(cam["event_counts"]["restricted_breaches"], 0)
            self.assertEqual(cam["event_counts"]["tripwire_crossings"], 0)

    def test_heatmap_event_breakdown(self):
        """Event breakdown counters exactly match the ingested event categories."""
        now = time.time()
        events = [
            {"camera_id": "cam-05", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 50},
            {"camera_id": "cam-05", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 45},
            {"camera_id": "cam-05", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 40},
            {"camera_id": "cam-05", "event_type": "LOITERING", "timestamp": now - 35},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        cam5 = next(c for c in res["cameras"] if c["camera_id"] == "cam-05")
        self.assertEqual(cam5["event_counts"]["restricted_breaches"], 2)
        self.assertEqual(cam5["event_counts"]["tripwire_crossings"], 1)
        self.assertEqual(cam5["event_counts"]["loitering"], 1)

    # 5. Cross-Feature Links & Search Integration
    def test_incident_to_heatmap_link(self):
        """Incidents increase the threat index of their associated camera."""
        now = time.time()
        incidents = [
            {"camera_id": "cam-01", "risk_level": "CRITICAL", "risk_score": 95, "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 30},
        ]
        res = self.heatmap_engine.calculate_heatmap(incidents=incidents, current_time=now)
        cam1 = next(c for c in res["cameras"] if c["camera_id"] == "cam-01")
        self.assertGreaterEqual(cam1["threat_index"], 50)
        self.assertEqual(cam1["event_counts"]["critical_incidents"], 1)

    def test_journey_to_camera_link(self):
        """Unique cameras from journey map cleanly to valid topology cameras."""
        now = time.time()
        events = [
            {"track_id": 77, "camera_id": "cam-01", "event_type": "DETECTION", "timestamp": now - 30},
            {"track_id": 77, "camera_id": "cam-02", "event_type": "CROSS_CAMERA_HANDOVER", "timestamp": now - 20, "metadata": {"from_camera": "cam-01", "to_camera": "cam-02"}},
        ]
        res = self.journey_engine.build_journey(77, events=events)
        for cam in res["unique_cameras"]:
            self.assertIn(cam, ["cam-01", "cam-02"])

    def test_search_to_journey_link(self):
        """Query parser correctly identifies journey intent and target ID."""
        q1 = "Show person #27 journey"
        p1 = self.query_parser.parse(q1)
        self.assertEqual(p1["entity"], "journey")
        self.assertEqual(p1["track_id"], 27)

        q2 = "Where did track #33 go?"
        p2 = self.query_parser.parse(q2)
        self.assertEqual(p2["entity"], "journey")
        self.assertEqual(p2["track_id"], 33)

    def test_real_cam01_journey(self):
        """Builds valid journey from CAM-01 VisDrone realistic intrusion sequence."""
        now = time.time()
        events = [
            {"track_id": 1, "camera_id": "cam-01", "event_type": "DETECTION", "timestamp": now - 60},
            {"track_id": 1, "camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 45, "metadata": {"direction": "IN"}},
            {"track_id": 1, "camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 30, "metadata": {"zone_name": "Perimeter Zone"}},
            {"track_id": 1, "camera_id": "cam-01", "event_type": "LOITERING", "timestamp": now - 15, "metadata": {"dwell_seconds": 18}},
        ]
        res = self.journey_engine.build_journey(1, events=events)
        self.assertEqual(res["track_id"], 1)
        self.assertEqual(len(res["observed_events"]), 4)
        self.assertTrue(res["is_complete"])
        self.assertIn("Single-sector", res["status_note"])

    def test_real_cam01_heatmap(self):
        """Evaluates realistic CAM-01 intrusion events in threat heatmap."""
        now = time.time()
        events = [
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 60},
            {"camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 45},
            {"camera_id": "cam-01", "event_type": "LOITERING", "timestamp": now - 30},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        cam1 = next(c for c in res["cameras"] if c["camera_id"] == "cam-01")
        self.assertGreater(cam1["threat_index"], 40)
        self.assertIn(cam1["threat_level"], ["HIGH", "MEDIUM"])

    def test_no_hardcoded_camera_path(self):
        """Camera path adapts dynamically to whatever camera IDs are in events."""
        now = time.time()
        events = [
            {"track_id": 99, "camera_id": "cam-08", "event_type": "DETECTION", "timestamp": now - 20},
        ]
        res = self.journey_engine.build_journey(99, events=events)
        self.assertEqual(res["camera_path"][0]["camera_id"], "cam-08")

    def test_no_hardcoded_heatmap(self):
        """Different event counts produce strictly proportional different indices."""
        now = time.time()
        ev_small = [{"camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 10}]
        ev_large = [
            {"camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 10},
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 10},
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 10},
        ]
        res_s = self.heatmap_engine.calculate_heatmap(events=ev_small, current_time=now)
        res_l = self.heatmap_engine.calculate_heatmap(events=ev_large, current_time=now)
        cam_s = next(c for c in res_s["cameras"] if c["camera_id"] == "cam-01")
        cam_l = next(c for c in res_l["cameras"] if c["camera_id"] == "cam-01")
        self.assertGreater(cam_l["threat_index"], cam_s["threat_index"])

    # 6. Backward Compatibility with Previous Phases
    def test_phase20_compatibility(self):
        """Query parser supports Phase 20 natural language queries alongside Phase 21."""
        p20 = self.query_parser.parse("Show critical incidents in the last 10 minutes")
        self.assertEqual(p20["risk_level"], "CRITICAL")
        self.assertEqual(p20["time_range"]["value"], 10)
        self.assertEqual(p20["time_range"]["unit"], "minutes")

        p21 = self.query_parser.parse("Which camera is currently highest risk?")
        self.assertEqual(p21["entity"], "hotspot")

    def test_phase19_compatibility(self):
        """Behavior chains can be ingested directly into target journey reconstruction."""
        chain = {
            "track_id": 105,
            "camera_id": "cam-01",
            "class_name": "person",
            "risk_score": 82,
            "risk_level": "CRITICAL",
            "events": [
                {"event_type": "DETECTION", "timestamp": 1700000000, "camera_id": "cam-01"},
                {"event_type": "TRIPWIRE_CROSSING", "timestamp": 1700000010, "camera_id": "cam-01"},
            ],
        }
        res = self.journey_engine.build_journey(105, behavior_chains=[chain])
        self.assertEqual(res["track_id"], 105)
        self.assertEqual(res["risk_score"], 82)
        self.assertEqual(res["risk_level"], "CRITICAL")
        self.assertEqual(len(res["observed_events"]), 2)

    def test_phase18_compatibility(self):
        """Incident dossiers and evidence records integrate with target journey."""
        incident = {
            "track_id": 204,
            "camera_id": "cam-01",
            "class_name": "person",
            "risk_score": 75,
            "risk_level": "HIGH",
            "started_at": 1700000000,
        }
        event = {"track_id": 204, "camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": 1700000000}
        res = self.journey_engine.build_journey(204, events=[event], incidents=[incident])
        self.assertEqual(res["risk_score"], 75)
        self.assertEqual(res["risk_level"], "HIGH")

    def test_phase17_compatibility(self):
        """Standard Phase 17 event types (tripwire, restricted, count) map cleanly to heatmap."""
        now = time.time()
        events = [
            {"camera_id": "cam-01", "event_type": "TRIPWIRE_CROSSING", "timestamp": now - 20},
            {"camera_id": "cam-01", "event_type": "RESTRICTED_ZONE_ENTRY", "timestamp": now - 15},
            {"camera_id": "cam-01", "event_type": "PERSON_COUNT", "timestamp": now - 10},
        ]
        res = self.heatmap_engine.calculate_heatmap(events=events, current_time=now)
        cam1 = next(c for c in res["cameras"] if c["camera_id"] == "cam-01")
        self.assertEqual(cam1["event_counts"]["tripwire_crossings"], 1)
        self.assertEqual(cam1["event_counts"]["restricted_breaches"], 1)


if __name__ == "__main__":
    unittest.main()
