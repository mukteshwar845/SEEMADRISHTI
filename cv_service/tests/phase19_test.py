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
from cv_service.behavior.behavior_chain import (
    BehaviorChainEngine,
    BehaviorChain,
    ChainEvent,
)
from cv_service.behavior.behavior_rules import (
    PATTERN_NORMAL_MOVEMENT,
    PATTERN_PERIMETER_APPROACH,
    PATTERN_RESTRICTED_AREA_INTRUSION,
    PATTERN_PERSISTENT_LOITERING,
    PATTERN_REPEATED_REENTRY,
    PATTERN_POSSIBLE_RECONNAISSANCE,
    PATTERN_MULTI_EVENT_BREACH,
    PATTERN_CROSS_CAMERA_CONTINUATION,
    PATTERN_UNKNOWN,
)


class Phase19VerificationSuite(unittest.TestCase):
    """Phase 19 Multi-Camera Intelligence & Incident Fusion Verification (67 Tests - Including 25 Threat Behavior Chain Tests)."""

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
        self.chain_engine = BehaviorChainEngine()

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



    # =========================================================================
    # Group 5: Phase 19 Signature Feature - Threat Behavior Chain (25 tests)
    # =========================================================================

    def test_43_chain_creation_on_first_detection(self):
        chain = self.chain_engine.ingest_detection(
            camera_id="cam-01", track_id=27, class_name="person",
            centroid=(100.0, 200.0), bbox={"x1": 90, "y1": 180, "x2": 110, "y2": 220}, timestamp=10.0
        )
        self.assertIsNotNone(chain)
        self.assertEqual(chain.track_id, 27)
        self.assertEqual(chain.camera_id, "cam-01")
        self.assertEqual(chain.status, "ACTIVE")
        self.assertEqual(len(chain.events), 1)
        self.assertEqual(chain.events[0].event_type, "DETECTION")

    def test_44_events_appended_in_chronological_order(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_perimeter_approach("cam-01", 27, "Sector NW Perimeter", 5.0, 12.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Tripwire 1", "IN", 15.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        self.assertEqual(len(chain.events), 3)
        self.assertLessEqual(chain.events[0].timestamp, chain.events[1].timestamp)
        self.assertLessEqual(chain.events[1].timestamp, chain.events[2].timestamp)

    def test_45_sequence_numbers_strictly_monotonic(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_perimeter_approach("cam-01", 27, "Sector NW", 5.0, 11.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Tripwire 1", "IN", 12.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Polygon", 13.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        sequences = [e.sequence for e in chain.events]
        self.assertEqual(sequences, [1, 2, 3, 4])

    def test_46_tripwire_crossing_ingested_correctly(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Perimeter Alpha", "IN", 14.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        tw_events = [e for e in chain.events if e.event_type == "TRIPWIRE_CROSSING"]
        self.assertEqual(len(tw_events), 1)
        self.assertEqual(tw_events[0].metadata["direction"], "IN")
        self.assertEqual(tw_events[0].metadata["tripwire_name"], "Perimeter Alpha")

    def test_47_restricted_zone_entry_ingested_correctly(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Sector 4", 15.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        rz_events = [e for e in chain.events if e.event_type == "RESTRICTED_ZONE_ENTRY"]
        self.assertEqual(len(rz_events), 1)
        self.assertEqual(rz_events[0].metadata["zone_name"], "Restricted Sector 4")

    def test_48_loitering_dwell_accumulation(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_loitering("cam-01", 27, "Restricted Sector 4", 12.0, 22.0)
        self.chain_engine.ingest_loitering("cam-01", 27, "Restricted Sector 4", 25.0, 35.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        loit_events = [e for e in chain.events if e.event_type == "LOITERING"]
        self.assertEqual(len(loit_events), 1)
        self.assertEqual(loit_events[0].metadata["dwell_seconds"], 25.0)
        self.assertTrue(any("Prolonged dwell" in ev for ev in chain.evidence))

    def test_49_reentry_increments_counter(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_reentry("cam-01", 27, 1, 20.0)
        self.chain_engine.ingest_reentry("cam-01", 27, 2, 30.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        re_events = [e for e in chain.events if e.event_type == "RE_ENTRY"]
        self.assertEqual(len(re_events), 2)
        self.assertEqual(re_events[-1].metadata["reentry_count"], 2)

    def test_50_cross_camera_handover_preserves_chain(self):
        chain1 = self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Tripwire 1", "OUT", 15.0)
        handover_chain = self.chain_engine.ingest_cross_camera_handover("cam-01", "cam-02", 27, "CORR-0102-001", 22.0)

        self.assertEqual(chain1.chain_id, handover_chain.chain_id)
        self.assertIn("cam-01", handover_chain.camera_ids)
        self.assertIn("cam-02", handover_chain.camera_ids)
        self.assertEqual(handover_chain.correlation_id, "CORR-0102-001")

    def test_51_handover_correlates_by_correlation_id(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_cross_camera_handover("cam-01", "cam-02", 27, "CORR-ALPHA", 20.0)

        chain_by_corr = self.chain_engine.get_chain_by_correlation("CORR-ALPHA")
        self.assertIsNotNone(chain_by_corr)
        self.assertEqual(chain_by_corr.track_id, 27)

    def test_52_handover_updates_camera_list(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_cross_camera_handover("cam-01", "cam-02", 27, "CORR-1", 15.0)
        self.chain_engine.ingest_cross_camera_handover("cam-02", "cam-04", 27, "CORR-2", 30.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        self.assertEqual(chain.camera_ids, ["cam-01", "cam-02", "cam-04"])

    def test_53_unrelated_tracks_not_merged(self):
        chain_a = self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        chain_b = self.chain_engine.ingest_detection("cam-01", 31, "person", (300.0, 400.0), {}, 10.0)

        self.assertNotEqual(chain_a.chain_id, chain_b.chain_id)
        self.assertEqual(chain_a.track_id, 27)
        self.assertEqual(chain_b.track_id, 31)

    def test_54_same_track_different_cameras_merged_if_correlated(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_cross_camera_handover("cam-01", "cam-02", 27, "CORR-MATCH", 15.0)

        # Target reappears on cam-02 with track_id 27 and same correlation
        chain_on_cam2 = self.chain_engine.get_chain("cam-02", 27)
        self.assertIsNotNone(chain_on_cam2)
        self.assertEqual(chain_on_cam2.correlation_id, "CORR-MATCH")

    def test_55_risk_engine_score_authoritative(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        chain = self.chain_engine.ingest_risk_assessment(
            camera_id="cam-01", track_id=27, risk_score=88, risk_level="CRITICAL",
            reasons=[{"factor": "ZONE_INTRUSION", "points": 40}], timestamp=15.0
        )
        self.assertEqual(chain.risk_score, 88)
        self.assertEqual(chain.risk_level, "CRITICAL")

    def test_56_risk_factors_match_existing_engine(self):
        reasons = [
            {"factor": "Restricted Zone Entry", "points": 35},
            {"factor": "Persistent Loitering", "points": 25},
        ]
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        chain = self.chain_engine.ingest_risk_assessment("cam-01", 27, 60, "HIGH", reasons, 15.0)

        self.assertEqual(chain.risk_contributions, reasons)

    def test_57_pattern_possible_reconnaissance_all_criteria_met(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Perimeter Wire", "IN", 12.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Area", 15.0)
        self.chain_engine.ingest_loitering("cam-01", 27, "Restricted Area", 18.0, 33.0)
        chain = self.chain_engine.ingest_reentry("cam-01", 27, 1, 40.0)

        self.assertEqual(chain.behavior_pattern, PATTERN_POSSIBLE_RECONNAISSANCE)
        self.assertGreaterEqual(chain.confidence, 0.90)
        self.assertEqual(chain.confidence_label, "HIGH CONFIDENCE")

    def test_58_pattern_reconnaissance_fails_if_no_reentry(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Perimeter Wire", "IN", 12.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Area", 15.0)
        chain = self.chain_engine.ingest_loitering("cam-01", 27, "Restricted Area", 18.0, 30.0)

        self.assertNotEqual(chain.behavior_pattern, PATTERN_POSSIBLE_RECONNAISSANCE)

    def test_59_pattern_reconnaissance_fails_if_insufficient_dwell(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Perimeter Wire", "IN", 12.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Area", 15.0)
        self.chain_engine.ingest_loitering("cam-01", 27, "Restricted Area", 5.0, 20.0)  # Only 5s dwell (<15s)
        chain = self.chain_engine.ingest_reentry("cam-01", 27, 1, 25.0)

        self.assertNotEqual(chain.behavior_pattern, PATTERN_POSSIBLE_RECONNAISSANCE)

    def test_60_pattern_reconnaissance_fails_if_no_zone_entry(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Perimeter Wire", "IN", 12.0)
        self.chain_engine.ingest_loitering("cam-01", 27, "Exterior Sector", 20.0, 32.0)
        chain = self.chain_engine.ingest_reentry("cam-01", 27, 1, 40.0)

        self.assertNotEqual(chain.behavior_pattern, PATTERN_POSSIBLE_RECONNAISSANCE)

    def test_61_pattern_restricted_area_intrusion(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        chain = self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Ammo Depot", 15.0)

        self.assertEqual(chain.behavior_pattern, PATTERN_RESTRICTED_AREA_INTRUSION)

    def test_62_pattern_persistent_loitering(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        chain = self.chain_engine.ingest_loitering("cam-01", 27, "Perimeter Zone", 22.0, 32.0)

        self.assertEqual(chain.behavior_pattern, PATTERN_PERSISTENT_LOITERING)

    def test_63_pattern_normal_movement(self):
        chain = self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_detection("cam-01", 27, "person", (105.0, 205.0), {}, 11.0)
        self.assertEqual(chain.behavior_pattern, PATTERN_NORMAL_MOVEMENT)

    def test_64_evidence_checklist_items_match_real_events(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Tripwire Alpha", "IN", 12.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Polygon Bravo", 15.0)

        chain = self.chain_engine.get_chain("cam-01", 27)
        self.assertIn("Tripwire crossing", chain.evidence)
        self.assertIn("Restricted-zone interaction", chain.evidence)
        self.assertNotIn("Prolonged dwell", chain.evidence)

    def test_65_chain_serialization_json_valid(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Depot", 15.0)
        chain = self.chain_engine.ingest_risk_assessment("cam-01", 27, 85, "CRITICAL", [{"factor": "ZONE", "points": 40}], 18.0)

        d = chain.to_dict()
        self.assertIn("chain_id", d)
        self.assertIn("events", d)
        self.assertIn("behavior_pattern", d)
        self.assertIn("confidence", d)
        self.assertIn("confidence_label", d)
        self.assertIn("evidence", d)
        self.assertIn("explanation", d)
        self.assertEqual(d["risk_score"], 85)

    def test_66_chain_status_progression(self):
        chain = self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.assertEqual(chain.status, "ACTIVE")

        self.chain_engine.ingest_risk_assessment("cam-01", 27, 85, "CRITICAL", [], 15.0)
        self.assertEqual(chain.status, "CRITICAL")

        self.chain_engine.ingest_incident("cam-01", 27, "INC-00099", 20.0)
        self.assertEqual(chain.status, "INCIDENT_CREATED")
        self.assertEqual(chain.incident_id, "INC-00099")

    def test_67_session_reset_clears_chains(self):
        self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.assertEqual(len(self.chain_engine.active_chains), 1)

        self.chain_engine.reset_session()
        self.assertEqual(len(self.chain_engine.active_chains), 0)
        self.assertEqual(len(self.chain_engine.correlation_to_chain), 0)

if __name__ == "__main__":
    unittest.main()
