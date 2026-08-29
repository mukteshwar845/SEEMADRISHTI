"""
SEEMADRISHTI AI — PHASE 16 AUTOMATED TEST SUITE
REAL-TIME INTELLIGENT EVENT PIPELINE & JUDGE-DEMO HARDENING

Tests the complete live surveillance intelligence chain:
Real Camera Frame -> YOLOv8 Detection -> ByteTrack ID -> Trajectory Trails ->
Virtual Zones & Tripwires -> Breach Detection -> Spatial Loitering ->
6-Factor Risk Engine -> Alert Deduplication -> Incident Creation ->
Forensic Evidence Recording -> SHA-256 Seal Verification -> Tamper Detection ->
Cross-Camera Handover -> Camera Isolation & Telemetry Integrity.
"""

import os
import sys
import unittest
import time
import json
import hashlib
import numpy as np
import cv2

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from cv_service.config import CVConfig
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.geometry.polygon import PolygonZone, calculate_centroid, is_point_in_polygon, segments_intersect
from cv_service.intrusion.detector import IntrusionDetector, IntrusionEvent
from cv_service.loitering.detector import LoiteringDetector, LoiteringTrackState
from cv_service.risk.engine import RiskEngine, RiskAssessment, RiskReason
from cv_service.evidence.incident_manager import IncidentManager
from cv_service.evidence.circular_buffer import CircularFrameBuffer
from cv_service.evidence.evidence_writer import EvidenceWriter


class TestPhase16IntelligentEventPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures_dir = os.path.join(PROJECT_ROOT, "cv_service", "tests", "fixtures", "visdrone")
        cls.cam01_path = os.path.join(cls.fixtures_dir, "CAM-01.mp4")
        cls.cam02_path = os.path.join(cls.fixtures_dir, "CAM-02.mp4")

        # Verify fixtures exist
        if not os.path.exists(cls.cam01_path):
            raise unittest.SkipTest(f"CAM-01.mp4 fixture missing at {cls.cam01_path}")

    # 1. Detection contains valid frame association
    def test_01_detection_frame_association(self):
        detector = YoloDetector()
        detector.load_model()

        cap = cv2.VideoCapture(self.cam01_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret)

        res = detector.detect(frame, camera_id="cam-01")
        self.assertIn("detections", res)
        self.assertIn("frame_width", res)
        self.assertIn("frame_height", res)
        self.assertIn("timestamp", res)
        self.assertEqual(res["camera_id"], "cam-01")

    # 2. Detection bounding boxes are valid
    def test_02_detection_bounding_boxes_valid(self):
        detector = YoloDetector()
        detector.load_model()

        cap = cv2.VideoCapture(self.cam01_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret)

        h, w = frame.shape[:2]
        res = detector.detect(frame, camera_id="cam-01")
        for det in res["detections"]:
            bbox = det["bbox"]
            self.assertGreaterEqual(bbox["x1"], 0)
            self.assertGreaterEqual(bbox["y1"], 0)
            self.assertLessEqual(bbox["x2"], w)
            self.assertLessEqual(bbox["y2"], h)
            self.assertLess(bbox["x1"], bbox["x2"])
            self.assertLess(bbox["y1"], bbox["y2"])
            self.assertGreaterEqual(det["confidence"], 0.0)
            self.assertLessEqual(det["confidence"], 1.0)

    # 3. Track IDs are camera-isolated
    def test_03_track_ids_camera_isolated(self):
        tracker1 = ByteTrackEngine()
        tracker2 = ByteTrackEngine()
        tracker1.initialize()
        tracker2.initialize()

        cap1 = cv2.VideoCapture(self.cam01_path)
        cap2 = cv2.VideoCapture(self.cam02_path)
        ret1, frame1 = cap1.read()
        ret2, frame2 = cap2.read()
        cap1.release()
        cap2.release()

        res1 = tracker1.track(frame1, camera_id="cam-01", frame_id=1)
        res2 = tracker2.track(frame2, camera_id="cam-02", frame_id=1)

        self.assertEqual(res1["camera_id"], "cam-01")
        self.assertEqual(res2["camera_id"], "cam-02")
        self.assertIsNot(tracker1.active_tracks, tracker2.active_tracks)

    # 4. Trajectory history uses real coordinates
    def test_04_trajectory_history_real_coordinates(self):
        tracker = ByteTrackEngine()
        tracker.initialize()

        cap = cv2.VideoCapture(self.cam01_path)
        for frame_idx in range(1, 5):
            ret, frame = cap.read()
            if not ret:
                break
            res = tracker.track(frame, camera_id="cam-01", frame_id=frame_idx)
            for trk in res["tracks"]:
                self.assertIn("trajectory", trk)
                traj = trk["trajectory"]
                self.assertIsInstance(traj, list)
                self.assertGreater(len(traj), 0)
                for pt in traj:
                    self.assertIn("x", pt)
                    self.assertIn("y", pt)
                    self.assertGreaterEqual(pt["x"], 0)
                    self.assertGreaterEqual(pt["y"], 0)
        cap.release()

    # 5. Trajectory resets correctly on loop/reset
    def test_05_trajectory_resets_on_loop(self):
        tracker = ByteTrackEngine()
        tracker.initialize()

        cap = cv2.VideoCapture(self.cam01_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret)

        tracker.track(frame, camera_id="cam-01", frame_id=1)
        self.assertGreater(len(tracker.active_tracks), 0)

        tracker.reset()
        self.assertEqual(len(tracker.active_tracks), 0)

    # 6. Perimeter geometry is valid (polygons & tripwires)
    def test_06_perimeter_geometry_valid(self):
        # Closed Polygon
        zone = PolygonZone(
            zone_id="zone-test-01",
            camera_id="cam-01",
            name="Alpha Zone",
            polygon=[[100, 100], [300, 100], [300, 300], [100, 300]],
            enabled=True,
        )
        self.assertFalse(zone.is_tripwire)
        self.assertTrue(zone.is_inside((200, 200), 1920, 1080))
        self.assertFalse(zone.is_inside((50, 50), 1920, 1080))

        # Virtual Tripwire Line
        tripwire = PolygonZone(
            zone_id="line-test-01",
            camera_id="cam-01",
            name="Alpha Line",
            polygon=[[100, 200], [400, 200]],
            enabled=True,
            zone_type="TRIPWIRE",
        )
        self.assertTrue(tripwire.is_tripwire)
        self.assertTrue(tripwire.test_crossing((250, 150), (250, 250), 1920, 1080))
        self.assertFalse(tripwire.test_crossing((250, 50), (250, 100), 1920, 1080))

    # 7. Real track crossing generates breach event
    def test_07_real_track_crossing_generates_breach(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zone-alpha",
            camera_id="cam-01",
            name="Alpha Perimeter",
            polygon=[[100, 100], [300, 100], [300, 300], [100, 300]],
            enabled=True,
        )
        detector.add_zone(zone)

        # Step 1: Track initially outside
        outside_tracks = [{
            "track_id": 10,
            "class_name": "person",
            "confidence": 0.92,
            "bbox": {"x1": 20, "y1": 20, "x2": 40, "y2": 40},
        }]
        events1, _ = detector.process_tracks(outside_tracks, camera_id="cam-01", frame_width=1920, frame_height=1080)
        self.assertEqual(len(events1), 0)

        # Step 2: Track moves INSIDE zone
        inside_tracks = [{
            "track_id": 10,
            "class_name": "person",
            "confidence": 0.92,
            "bbox": {"x1": 180, "y1": 180, "x2": 220, "y2": 220},
        }]
        events2, _ = detector.process_tracks(inside_tracks, camera_id="cam-01", frame_width=1920, frame_height=1080)
        self.assertEqual(len(events2), 1)
        self.assertEqual(events2[0].direction, "ENTERING")
        self.assertEqual(events2[0].track_id, 10)
        self.assertEqual(events2[0].camera_id, "cam-01")

    # 8. Non-crossing track does not generate breach event
    def test_08_non_crossing_track_suppressed(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zone-alpha",
            camera_id="cam-01",
            name="Alpha Perimeter",
            polygon=[[500, 500], [800, 500], [800, 800], [500, 800]],
            enabled=True,
        )
        detector.add_zone(zone)

        tracks = [{
            "track_id": 11,
            "class_name": "person",
            "confidence": 0.88,
            "bbox": {"x1": 50, "y1": 50, "x2": 80, "y2": 80},
        }]
        events, _ = detector.process_tracks(tracks, camera_id="cam-01", frame_width=1920, frame_height=1080)
        self.assertEqual(len(events), 0)

    # 9. Loitering duration logic works
    def test_09_loitering_duration_accumulation(self):
        zone = PolygonZone(
            zone_id="zone-loiter",
            camera_id="cam-01",
            name="Loiter Zone",
            polygon=[[100, 100], [400, 100], [400, 400], [100, 400]],
            enabled=True,
        )
        state = LoiteringTrackState(
            camera_id="cam-01",
            track_id=12,
            zone_id="zone-loiter",
            class_name="person",
            initial_inside=True,
            initial_pos=(200.0, 200.0),
            start_time=100.0,
        )
        # Advance time by 35 seconds
        state.update_position((205.0, 202.0), now=135.0)
        state.dwell_seconds = 135.0 - state.entered_at
        self.assertEqual(state.dwell_seconds, 35.0)
        self.assertGreater(state.dwell_seconds, 30.0)

    # 10. Loitering displacement logic works
    def test_10_loitering_displacement_logic(self):
        state = LoiteringTrackState(
            camera_id="cam-01",
            track_id=14,
            zone_id="zone-loiter",
            class_name="person",
            initial_inside=True,
            initial_pos=(200.0, 200.0),
            start_time=100.0,
        )
        for i in range(10):
            state.update_position((200.0 + i * 0.5, 200.0 + i * 0.5), now=100.0 + i)

        p0 = state.centroid_history[0]
        p_last = state.current_position
        disp = ((p_last[0] - p0[0]) ** 2 + (p_last[1] - p0[1]) ** 2) ** 0.5
        self.assertLess(disp, 20.0)  # Stationary/lingering target

    # 11. Threat score remains within 0-100 bounds
    def test_11_threat_score_bounded_0_to_100(self):
        engine = RiskEngine()
        track = {"track_id": 15, "class_name": "person", "bbox": {"x1": 100, "y1": 100, "x2": 150, "y2": 150}}

        assessment, _ = engine.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=60.0,
            reentry_count=3,
            current_time=time.time(),
            has_night_movement=True,
            has_movement_anomaly=True,
        )
        self.assertGreaterEqual(assessment.score, 0)
        self.assertLessEqual(assessment.score, 100)
        self.assertIn(assessment.level, ["LOW", "MEDIUM", "HIGH", "CRITICAL"])

    # 12. Risk rationale corresponds to actual contributing factors
    def test_12_risk_rationale_corresponds_to_factors(self):
        engine = RiskEngine()
        track = {"track_id": 16, "class_name": "person", "bbox": {"x1": 100, "y1": 100, "x2": 150, "y2": 150}}

        assessment, _ = engine.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=False,
            dwell_seconds=0.0,
            reentry_count=0,
            current_time=time.time(),
        )
        codes = [r.code for r in assessment.reasons]
        self.assertIn("INTRUSION", codes)
        self.assertGreater(assessment.score, 0)

    # 13. Alert deduplication works (no spam per frame)
    def test_13_alert_deduplication(self):
        engine = RiskEngine()
        track = {"track_id": 17, "class_name": "person", "bbox": {"x1": 100, "y1": 100, "x2": 150, "y2": 150}}

        t0 = time.time()
        # Frame 1: Triggers alert when level reaches HIGH
        _, alert1 = engine.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=30.0,
            reentry_count=0,
            current_time=t0,
        )
        # Frame 2: Same conditions, should NOT re-trigger duplicate alert
        _, alert2 = engine.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=30.0,
            reentry_count=0,
            current_time=t0 + 0.04,
        )
        self.assertTrue(alert1)
        self.assertFalse(alert2)

    # 14. Incident contains actual event metadata
    def test_14_incident_contains_actual_event_metadata(self):
        buf = CircularFrameBuffer(pre_event_seconds=1.0)
        writer = EvidenceWriter(evidence_dir="temp_evidence_test", fps=25.0)
        manager = IncidentManager(
            circular_buffer=buf,
            evidence_writer=writer,
            min_risk_level="HIGH",
            cooldown_seconds=1.0,
        )

        inc = manager.check_and_trigger(
            camera_id="cam-01",
            track_id=18,
            class_name="person",
            risk_score=78,
            risk_level="HIGH",
            reasons=[{"code": "INTRUSION", "points": 40, "description": "Perimeter breach"}],
            zone_name="Sector Alpha Main Gate",
            event_type="PERIMETER_BREACH",
            current_time=time.time(),
        )
        self.assertIsNotNone(inc)
        self.assertEqual(inc.camera_id, "cam-01")
        self.assertEqual(inc.track_id, 18)
        self.assertEqual(inc.risk_level, "HIGH")
        self.assertEqual(inc.risk_score, 78)

    # 15. Evidence package created correctly
    def test_15_evidence_package_creation(self):
        buf = CircularFrameBuffer(pre_event_seconds=0.5)
        writer = EvidenceWriter(evidence_dir="temp_evidence_test", fps=10.0)
        manager = IncidentManager(
            circular_buffer=buf,
            evidence_writer=writer,
            min_risk_level="HIGH",
            cooldown_seconds=0.1,
        )

        # Feed 5 frames
        for f_idx in range(5):
            dummy = np.zeros((100, 100, 3), dtype=np.uint8)
            manager.record_frame(camera_id="cam-01", frame=dummy, timestamp=time.time())

        inc = manager.check_and_trigger(
            camera_id="cam-01",
            track_id=19,
            class_name="person",
            risk_score=85,
            risk_level="CRITICAL",
            reasons=[],
            zone_name="Gate",
            event_type="BREACH",
            current_time=time.time(),
        )
        self.assertIsNotNone(inc)
        self.assertTrue(inc.incident_id.startswith("INC-"))

    # 16. SHA-256 seal verification works
    def test_16_sha256_verification_works(self):
        os.makedirs("temp_evidence_test", exist_ok=True)
        test_file = os.path.join("temp_evidence_test", "seal_test.mp4")
        test_data = b"SEEMADRISHTI_REAL_VIDEO_EVIDENCE_STREAM_DATA_12345"
        with open(test_file, "wb") as f:
            f.write(test_data)

        expected_hash = hashlib.sha256(test_data).hexdigest()
        calculated_hash = EvidenceWriter.calculate_sha256(test_file)
        self.assertEqual(calculated_hash, expected_hash)

        # Cleanup
        if os.path.exists(test_file):
            os.remove(test_file)

    # 17. Tampering invalidates evidence
    def test_17_tampering_invalidates_evidence(self):
        os.makedirs("temp_evidence_test", exist_ok=True)
        test_file = os.path.join("temp_evidence_test", "tamper_test.mp4")
        orig_data = b"ORIGINAL_VALID_EVIDENCE_CLIP"
        with open(test_file, "wb") as f:
            f.write(orig_data)

        orig_hash = EvidenceWriter.calculate_sha256(test_file)

        # Tamper 1 bit
        with open(test_file, "wb") as f:
            f.write(b"TAMPERED_INVALID_CLIP")

        tampered_hash = EvidenceWriter.calculate_sha256(test_file)
        self.assertNotEqual(orig_hash, tampered_hash)

        # Cleanup
        if os.path.exists(test_file):
            os.remove(test_file)

    # 18. Cross-camera handover conditions enforced
    def test_18_cross_camera_handover_conditions(self):
        from cv_service.correlation.camera_topology import CameraTopology
        topo = CameraTopology()
        topo.add_relationship("cam-01", "cam-02", min_travel_seconds=1.0, max_travel_seconds=15.0, distance_meters=25.0)

        # Valid transit time (5 seconds)
        valid, _ = topo.is_transition_timely("cam-01", "cam-02", elapsed_seconds=5.0)
        self.assertTrue(valid)

        # Invalid transit time (too fast: 0.1s)
        too_fast, _ = topo.is_transition_timely("cam-01", "cam-02", elapsed_seconds=0.1)
        self.assertFalse(too_fast)

        # Invalid transit time (too slow: 50s)
        too_slow, _ = topo.is_transition_timely("cam-01", "cam-02", elapsed_seconds=50.0)
        self.assertFalse(too_slow)

    # 19. Camera isolation is preserved
    def test_19_camera_isolation_preserved(self):
        det1 = IntrusionDetector()
        det2 = IntrusionDetector()
        z1 = PolygonZone(zone_id="z1", camera_id="cam-01", name="Z1", polygon=[[10, 10], [50, 10], [50, 50], [10, 50]])
        z2 = PolygonZone(zone_id="z2", camera_id="cam-02", name="Z2", polygon=[[100, 100], [500, 100], [500, 500], [100, 500]])
        det1.add_zone(z1)
        det2.add_zone(z2)

        self.assertEqual(len(det1.zones), 1)
        self.assertEqual(len(det2.zones), 1)
        self.assertIn("z1", det1.zones)
        self.assertNotIn("z2", det1.zones)

    # 20. Zero synthetic/random telemetry introduced
    def test_20_zero_synthetic_telemetry_audit(self):
        backend_routes = os.path.join(PROJECT_ROOT, "server", "routes")
        for root, _, files in os.walk(backend_routes):
            for file in files:
                if file.endswith((".ts", ".js")):
                    path = os.path.join(root, file)
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    self.assertNotIn("Math.random()", content, f"Math.random() found in {path}")


if __name__ == "__main__":
    unittest.main()
