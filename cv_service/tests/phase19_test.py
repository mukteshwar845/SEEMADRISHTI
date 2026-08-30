"""
SEEMADRISHTI AI - Phase 19 Multi-Camera Intelligence, Behavior Correlation,
Incident Fusion & System Hardening Verification Suite

Team: IQ100
Problem Statement: SIH26187
"""

import unittest
import time
from cv_service.correlation.camera_topology import CameraTopology, CameraEdge
from cv_service.correlation.handover import HandoverRecord
from cv_service.correlation.target_matcher import TargetMatcher
from cv_service.correlation.cross_camera import CrossCameraCorrelator
from cv_service.behavior.behavior_engine import (
    BehaviorSignal,
    BehaviorIntelligenceEngine,
    TrackSpatialHistory,
)
from cv_service.incidents.incident_fusion import FusedIncident, IncidentFusionEngine
from cv_service.risk.engine import RiskEngine
from cv_service.health.system_health import SystemHealthTracker, PipelinePerformanceMetrics


class Phase19VerificationSuite(unittest.TestCase):
    """Phase 19 Multi-Camera Intelligence & Incident Fusion Verification (42 Tests)."""

    def setUp(self):
        # Create a test topology with 4 cameras and 2 corridors
        self.topology = CameraTopology()
        self.topology.add_camera_node("cam-01")
        self.topology.add_camera_node("cam-02")
        self.topology.add_camera_node("cam-04")
        self.topology.add_camera_node("cam-09")
        self.topology.add_relationship(
            from_camera_id="cam-01",
            to_camera_id="cam-02",
            min_travel_seconds=5.0,
            max_travel_seconds=30.0,
            distance_meters=100.0,
            sector_name="Corridor 01-02",
        )
        self.topology.add_relationship(
            from_camera_id="cam-02",
            to_camera_id="cam-04",
            min_travel_seconds=4.0,
            max_travel_seconds=25.0,
            distance_meters=80.0,
            sector_name="Corridor 02-04",
        )
        self.matcher = TargetMatcher(self.topology)
        self.correlator = CrossCameraCorrelator(self.topology)
        self.behavior_engine = BehaviorIntelligenceEngine()
        self.fusion_engine = IncidentFusionEngine(session_timeout_sec=60.0)
        self.risk_engine = RiskEngine()
        self.health_tracker = SystemHealthTracker()

    # =========================================================================
    # Group 1: Multi-Camera Correlation & Handover (15 tests)
    # =========================================================================

    def test_01_candidate_exit_registration(self):
        t0 = 100.0
        self.correlator.register_track_exit("cam-01", 17, "person", t0, "OUT")
        self.assertEqual(len(self.correlator.recent_exits), 1)
        cand = self.correlator.recent_exits[("cam-01", 17)]
        self.assertEqual(cand["camera_id"], "cam-01")
        self.assertEqual(cand["track_id"], 17)
        self.assertEqual(cand["class_name"], "person")
        self.assertEqual(cand["exit_time"], t0)

    def test_02_candidate_entry_evaluation(self):
        t0 = 100.0
        self.correlator.register_track_exit("cam-01", 17, "person", t0, "OUT")
        handover = self.correlator.evaluate_track_entry("cam-02", 8, "person", t0 + 10.0, "IN")
        self.assertIsNotNone(handover)
        self.assertEqual(handover.source_camera, "cam-01")
        self.assertEqual(handover.source_track_id, 17)
        self.assertEqual(handover.destination_camera, "cam-02")
        self.assertEqual(handover.destination_track_id, 8)

    def test_03_adjacent_camera_match(self):
        corridor = self.topology.get_corridor("cam-01", "cam-02")
        self.assertIsNotNone(corridor)
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="person", src_exit_time=100.0,
            dst_camera="cam-02", dst_track_id=8, dst_class="person", dst_entry_time=110.0
        )
        self.assertTrue(is_match)
        self.assertGreaterEqual(conf, 0.50)

    def test_04_non_adjacent_camera_match(self):
        # CAM-01 and CAM-09 have no corridor
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="person", src_exit_time=100.0,
            dst_camera="cam-09", dst_track_id=5, dst_class="person", dst_entry_time=110.0
        )
        self.assertFalse(is_match)
        self.assertEqual(conf, 0.0)

    def test_05_minimum_travel_time_gating(self):
        # Corridor 01-02 requires minimum 5.0 seconds
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="person", src_exit_time=100.0,
            dst_camera="cam-02", dst_track_id=8, dst_class="person", dst_entry_time=102.0  # only 2.0s
        )
        self.assertFalse(is_match)
        self.assertIn("too rapid", reason.lower())

    def test_06_maximum_travel_time_gating(self):
        # Corridor 01-02 has maximum 30.0 seconds
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="person", src_exit_time=100.0,
            dst_camera="cam-02", dst_track_id=8, dst_class="person", dst_entry_time=145.0  # 45.0s > 30.0s
        )
        self.assertFalse(is_match)
        self.assertIn("expired", reason.lower())

    def test_07_class_match_requirement(self):
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="car", src_exit_time=100.0,
            dst_camera="cam-02", dst_track_id=8, dst_class="car", dst_entry_time=110.0
        )
        self.assertTrue(is_match)

    def test_08_class_mismatch_rejection(self):
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="person", src_exit_time=100.0,
            dst_camera="cam-02", dst_track_id=8, dst_class="car", dst_entry_time=110.0
        )
        self.assertFalse(is_match)
        self.assertIn("mismatch", reason.lower())

    def test_09_confidence_scoring_calculation(self):
        # Optimal midpoint of (5.0s, 30.0s) is 17.5s
        is_match, conf, reason, gap = self.matcher.evaluate_handover(
            src_camera="cam-01", src_track_id=17, src_class="person", src_exit_time=100.0,
            dst_camera="cam-02", dst_track_id=8, dst_class="person", dst_entry_time=117.5
        )
        self.assertTrue(is_match)
        self.assertGreaterEqual(conf, 0.80)

    def test_10_handover_record_generation(self):
        self.correlator.register_track_exit("cam-01", 17, "person", 100.0, "OUT")
        rec = self.correlator.evaluate_track_entry("cam-02", 8, "person", 110.0, "IN")
        self.assertIsInstance(rec, HandoverRecord)
        self.assertEqual(rec.confidence_percent, int(round(rec.confidence * 100)))
        self.assertEqual(rec.display_status, "TARGET HANDOVER DETECTED")
        d = rec.to_dict()
        self.assertIn("correlation_id", d)
        self.assertIn("confidence_percent", d)

    def test_11_camera_topology_lookup(self):
        neighbors = self.topology.get_neighbors("cam-01")
        self.assertIn("cam-02", neighbors)

    def test_12_corridor_lookup_reverse(self):
        corridor = self.topology.get_corridor("cam-02", "cam-01")
        self.assertIsNotNone(corridor)
        self.assertEqual(corridor.min_travel_seconds, 5.0)

    def test_13_active_candidate_pruning(self):
        self.correlator.register_track_exit("cam-01", 10, "person", 50.0, "OUT")
        self.correlator.register_track_exit("cam-01", 11, "person", 150.0, "OUT")
        self.correlator.prune_stale_exits(current_time=160.0, max_age_seconds=60.0)
        # Exit at 50.0 is age 110s > 60s, so pruned. Exit at 150.0 remains.
        self.assertEqual(len(self.correlator.recent_exits), 1)
        self.assertEqual(self.correlator.recent_exits[("cam-01", 11)]["track_id"], 11)

    def test_14_multi_camera_path_tracking(self):
        # 1. CAM-01 -> CAM-02
        self.correlator.register_track_exit("cam-01", 17, "person", 100.0, "OUT")
        h1 = self.correlator.evaluate_track_entry("cam-02", 8, "person", 110.0, "IN")
        self.assertIsNotNone(h1)

        # 2. CAM-02 -> CAM-04
        self.correlator.register_track_exit("cam-02", 8, "person", 120.0, "OUT")
        h2 = self.correlator.evaluate_track_entry("cam-04", 3, "person", 130.0, "IN")
        self.assertIsNotNone(h2)
        self.assertEqual(h2.source_camera, "cam-02")
        self.assertEqual(h2.destination_camera, "cam-04")

    def test_15_correlation_id_stability(self):
        self.correlator.register_track_exit("cam-01", 17, "person", 100.0, "OUT")
        h1 = self.correlator.evaluate_track_entry("cam-02", 8, "person", 110.0, "IN")
        self.assertTrue(h1.correlation_id.startswith("CORR-"))
        self.correlator.register_track_exit("cam-02", 8, "person", 120.0, "OUT")
        h2 = self.correlator.evaluate_track_entry("cam-04", 3, "person", 130.0, "IN")
        self.assertTrue(h2.correlation_id.startswith("CORR-"))
        self.assertNotEqual(h1.correlation_id, h2.correlation_id)

    # =========================================================================
    # Group 2: Behavior Intelligence (10 tests)
    # =========================================================================

    def test_16_wrong_direction_crossing_detection(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=1, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=5.0, reentry_count=0,
            tripwire_event={"direction": "OUT"},  # opposite authorized flow
            current_time=10.0,
        )
        self.assertTrue(any(s.behavior_type == "WRONG_DIRECTION_CROSSING" for s in signals))

    def test_17_excessive_dwell_detection(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=2, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=50.0, reentry_count=0,
            current_time=60.0,
        )
        self.assertTrue(any(s.behavior_type == "EXCESSIVE_DWELL" for s in signals))

    def test_18_unusual_movement_detection(self):
        # Fast displacement between frames
        self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=3, class_name="person",
            centroid=(10.0, 10.0), is_inside_zone=False, dwell_seconds=0.0, reentry_count=0,
            current_time=1.0,
        )
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=3, class_name="person",
            centroid=(400.0, 400.0), is_inside_zone=False, dwell_seconds=0.0, reentry_count=0,
            current_time=1.5,
        )
        self.assertTrue(any(s.behavior_type == "UNUSUAL_MOVEMENT" for s in signals))

    def test_19_loitering_pattern_confirmation(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=4, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=32.0, reentry_count=0,
            current_time=35.0,
        )
        self.assertTrue(any(s.behavior_type == "LOITERING" for s in signals))

    def test_20_repeated_perimeter_interaction(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=5, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=10.0, reentry_count=2,
            current_time=20.0,
        )
        self.assertTrue(any(s.behavior_type == "REPEATED_PERIMETER_INTERACTION" for s in signals))

    def test_21_reentry_pattern_detection(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=6, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=5.0, reentry_count=1,
            current_time=25.0,
        )
        self.assertTrue(any(s.behavior_type == "RE_ENTRY" for s in signals))

    def test_22_multi_event_compound_escalation(self):
        # Compound: breach + tripwire + dwell + reentry
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=7, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=50.0, reentry_count=2,
            zone_breach_event={"zone_name": "Sector Alpha"},
            tripwire_event={"direction": "OUT"},
            current_time=60.0,
        )
        self.assertTrue(any(s.behavior_type == "MULTI_EVENT_ESCALATION" for s in signals))

    def test_23_behavior_confidence_scoring(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=8, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=50.0, reentry_count=0,
            current_time=60.0,
        )
        for s in signals:
            self.assertGreaterEqual(s.confidence, 0.80)
            self.assertLessEqual(s.confidence, 1.0)

    def test_24_behavior_evidence_generation(self):
        signals = self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=9, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=50.0, reentry_count=0,
            current_time=60.0,
        )
        self.assertTrue(len(signals) > 0)
        self.assertTrue(len(signals[0].evidence) > 0)

    def test_25_chronological_behavior_ordering(self):
        self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=1, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=5.0, reentry_count=0,
            current_time=10.0,
        )
        self.behavior_engine.process_signals(
            camera_id="cam-01", track_id=1, class_name="person",
            centroid=(100.0, 100.0), is_inside_zone=True, dwell_seconds=50.0, reentry_count=0,
            current_time=60.0,
        )
        events = self.behavior_engine.active_behavior_events
        for i in range(len(events) - 1):
            self.assertLessEqual(events[i].timestamp, events[i + 1].timestamp)

    # =========================================================================
    # Group 3: Incident Fusion (9 tests)
    # =========================================================================

    def test_26_multi_event_incident_grouping(self):
        inc1, is_new1 = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=17, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=40, risk_level="MEDIUM",
            timestamp=100.0,
        )
        self.assertTrue(is_new1)

        inc2, is_new2 = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=17, class_name="person",
            event_type="TRIPWIRE_CROSSING", risk_score=65, risk_level="HIGH",
            timestamp=105.0,
        )
        self.assertFalse(is_new2)
        self.assertEqual(inc1.incident_id, inc2.incident_id)
        self.assertIn("TRIPWIRE_CROSSING", inc2.event_types)

    def test_27_single_incident_creation(self):
        inc, is_new = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=5, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=50, risk_level="HIGH",
            timestamp=10.0,
        )
        self.assertTrue(is_new)
        self.assertTrue(inc.incident_id.startswith("INC-"))

    def test_28_event_timeline_assembly(self):
        inc, _ = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=5, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=50, risk_level="HIGH",
            timestamp=10.0,
        )
        self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=5, class_name="person",
            event_type="LOITERING", risk_score=75, risk_level="CRITICAL",
            timestamp=45.0,
        )
        self.assertGreaterEqual(len(inc.timeline), 3)

    def test_29_risk_score_max_aggregation(self):
        inc, _ = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=9, class_name="person",
            event_type="DETECTION", risk_score=25, risk_level="LOW",
            timestamp=10.0,
        )
        self.assertEqual(inc.risk_score, 25)
        self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=9, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=85, risk_level="CRITICAL",
            timestamp=15.0,
        )
        self.assertEqual(inc.risk_score, 85)
        self.assertEqual(inc.risk_level, "CRITICAL")

    def test_30_multi_camera_sector_aggregation(self):
        inc, _ = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=17, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=40, risk_level="MEDIUM",
            correlation_id="CORR-0001", timestamp=100.0,
        )
        # Correlated entry on CAM-02 fuses into same incident
        self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-02", track_id=8, class_name="person",
            event_type="TRIPWIRE_CROSSING", risk_score=60, risk_level="HIGH",
            correlation_id="CORR-0001", timestamp=115.0,
        )
        self.assertIn("cam-01", inc.camera_ids)
        self.assertIn("cam-02", inc.camera_ids)

    def test_31_correlation_id_linkage(self):
        inc, _ = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=1, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=40, risk_level="MEDIUM",
            correlation_id="CORR-0042", timestamp=100.0,
        )
        self.assertEqual(inc.correlation_id, "CORR-0042")

    def test_32_duplicate_incident_suppression(self):
        count_before = len(self.fusion_engine.incidents)
        for i in range(5):
            self.fusion_engine.fuse_or_create_incident(
                camera_id="cam-01", track_id=20, class_name="person",
                event_type="RESTRICTED_ZONE_ENTRY", risk_score=40 + i, risk_level="MEDIUM",
                timestamp=100.0 + i * 2.0,
            )
        count_after = len(self.fusion_engine.incidents)
        self.assertEqual(count_after, count_before + 1)

    def test_33_session_timeout_reset(self):
        inc1, is_new1 = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=30, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=40, risk_level="MEDIUM",
            timestamp=100.0,
        )
        self.assertTrue(is_new1)

        # Activity after 120s (exceeds session_timeout_sec = 60s)
        inc2, is_new2 = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=30, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=40, risk_level="MEDIUM",
            timestamp=250.0,
        )
        self.assertTrue(is_new2)
        self.assertNotEqual(inc1.incident_id, inc2.incident_id)

    def test_34_fusion_reason_generation(self):
        inc, _ = self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=17, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=40, risk_level="MEDIUM",
            timestamp=100.0,
        )
        self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=17, class_name="person",
            event_type="TRIPWIRE_CROSSING", risk_score=65, risk_level="HIGH",
            timestamp=105.0,
        )
        self.assertIn("Unified", inc.fusion_reason)
        self.assertIn("PERSON", inc.fusion_reason)

    # =========================================================================
    # Group 4: System Health & Demo Hardening (8 tests)
    # =========================================================================

    def test_35_subsystem_health_reporting(self):
        summary = self.health_tracker.get_health_summary()
        self.assertEqual(summary["overall_status"], "ONLINE")
        self.assertIn("ai_engine", summary["subsystems"])
        self.assertIn("yolov8", summary["subsystems"])
        self.assertIn("bytetrack", summary["subsystems"])
        self.assertIn("websocket", summary["subsystems"])
        self.assertIn("database", summary["subsystems"])
        self.assertIn("evidence_engine", summary["subsystems"])
        self.assertIn("sha256", summary["subsystems"])

    def test_36_camera_status_reporting(self):
        self.health_tracker.update_camera_telemetry(
            camera_id="cam-01", source_type="MP4", frame_id=150, fps=24.8,
            detections_count=3, tracks_count=2,
        )
        cam = self.health_tracker.cameras.get("cam-01")
        self.assertIsNotNone(cam)
        self.assertEqual(cam["last_frame_id"], 150)
        self.assertEqual(cam["fps"], 24.8)

    def test_37_mp4_source_playback_labeling(self):
        self.health_tracker.update_camera_telemetry(
            camera_id="cam-01", source_type="MP4", frame_id=10, fps=25.0,
            detections_count=1, tracks_count=1,
        )
        cam = self.health_tracker.cameras["cam-01"]
        self.assertEqual(cam["status"], "PLAYBACK")
        self.assertIn("PLAYBACK", cam["source_type"])

    def test_38_rtsp_source_live_labeling(self):
        self.health_tracker.update_camera_telemetry(
            camera_id="cam-02", source_type="RTSP", frame_id=10, fps=30.0,
            detections_count=1, tracks_count=1,
        )
        cam = self.health_tracker.cameras["cam-02"]
        self.assertEqual(cam["status"], "LIVE")
        self.assertIn("LIVE", cam["source_type"])

    def test_39_latency_metric_recording(self):
        self.health_tracker.record_frame_metrics(
            yolo_ms=85.0, tracking_ms=1.5, geometry_ms=0.8, risk_ms=0.5, pipeline_ms=90.0, current_fps=11.0,
        )
        perf = self.health_tracker.get_performance_metrics()
        self.assertFalse(perf.to_dict()["insufficient_data"])
        self.assertAlmostEqual(perf.yolo_latency_ms, 85.0, places=1)
        self.assertAlmostEqual(perf.tracking_latency_ms, 1.5, places=1)

    def test_40_processing_fps_calculation(self):
        self.health_tracker.record_frame_metrics(
            yolo_ms=80.0, tracking_ms=1.0, geometry_ms=0.5, risk_ms=0.5, pipeline_ms=85.0, current_fps=11.7,
        )
        perf = self.health_tracker.get_performance_metrics()
        self.assertAlmostEqual(perf.processing_fps, 11.7, places=1)

    def test_41_insufficient_data_handling(self):
        # Empty health tracker has 0 samples
        empty_tracker = SystemHealthTracker()
        perf = empty_tracker.get_performance_metrics()
        d = perf.to_dict()
        self.assertTrue(d["insufficient_data"])
        self.assertEqual(d["samples_count"], 0)

    def test_42_demo_session_reset(self):
        self.health_tracker.record_frame_metrics(
            yolo_ms=80.0, tracking_ms=1.0, geometry_ms=0.5, risk_ms=0.5, pipeline_ms=85.0, current_fps=11.7,
        )
        self.fusion_engine.fuse_or_create_incident(
            camera_id="cam-01", track_id=1, class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY", risk_score=50, risk_level="HIGH",
        )
        self.correlator.register_track_exit("cam-01", 1, "person", 10.0, "OUT")

        # Execute resets
        self.health_tracker.reset_session()
        self.fusion_engine.reset_session()
        self.correlator.reset_session()

        self.assertEqual(len(self.fusion_engine.incidents), 0)
        self.assertEqual(len(self.correlator.recent_exits), 0)
        self.assertTrue(self.health_tracker.get_performance_metrics().to_dict()["insufficient_data"])


if __name__ == "__main__":
    unittest.main()
