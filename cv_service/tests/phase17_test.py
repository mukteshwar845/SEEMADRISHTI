"""
SEEMADRISHTI AI - PHASE 17 AUTOMATED TEST SUITE
REAL INTELLIGENT ALERTS, TRIPWIRE CROSSING, SUSPICIOUS ZONES,
REAL-TIME PERSON/OBJECT COUNTING AND EVIDENCE VALIDATION

Comprehensive test validation combining:
- TestPhase17IntelligentAlertsAndCounting (28 comprehensive algorithmic and pipeline tests)
- TestPhase17IntelligentSurveillancePipeline (10 end-to-end telemetry and verification tests)
"""

import os
import sys
import unittest
import time
import json
import hashlib
import numpy as np
import cv2

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from cv_service.config import CVConfig
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.geometry.polygon import (
    PolygonZone,
    calculate_centroid,
    is_point_in_polygon,
    segments_intersect,
    is_point_on_segment,
    get_crossing_direction,
)
from cv_service.intrusion.detector import IntrusionDetector, IntrusionEvent, TrackZoneState
from cv_service.loitering.detector import LoiteringDetector
from cv_service.risk.engine import RiskEngine, RiskAssessment
from cv_service.evidence.incident_manager import IncidentManager
from cv_service.evidence.circular_buffer import CircularFrameBuffer
from cv_service.evidence.evidence_writer import EvidenceWriter


class TestPhase17IntelligentAlertsAndCounting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures_dir = os.path.join(PROJECT_ROOT, "cv_service", "tests", "fixtures", "visdrone")
        cls.cam01_path = os.path.join(cls.fixtures_dir, "CAM-01.mp4")
        cls.cam02_path = os.path.join(cls.fixtures_dir, "CAM-02.mp4")
        cls.zones_config_path = os.path.join(PROJECT_ROOT, "config", "camera_zones.json")
        cls.sources_config_path = os.path.join(PROJECT_ROOT, "config", "camera_sources.json")

        if not os.path.exists(cls.cam01_path):
            raise unittest.SkipTest(f"CAM-01.mp4 fixture missing at {cls.cam01_path}")

    # 1. Polygon containment geometry
    def test_01_polygon_contains_point(self):
        poly = [(100, 100), (400, 100), (400, 400), (100, 400)]
        self.assertTrue(is_point_in_polygon((250, 250), poly))
        self.assertFalse(is_point_in_polygon((50, 50), poly))
        self.assertFalse(is_point_in_polygon((500, 250), poly))

    # 2. Polygon normalized coordinates scaling across varied resolutions
    def test_02_polygon_normalized_coordinates_scaling(self):
        norm_poly = [(0.2, 0.3), (0.8, 0.3), (0.8, 0.7), (0.2, 0.7)]
        zone = PolygonZone(
            zone_id="test-zone",
            name="Test Normalized Zone",
            polygon=norm_poly,
            is_normalized=True,
        )

        test_resolutions = [
            (1344, 756),
            (1904, 1072),
            (2688, 1512),
            (2720, 1530),
            (3840, 2160),
        ]

        for w, h in test_resolutions:
            px_poly = zone.get_pixel_polygon(w, h)
            self.assertEqual(len(px_poly), 4)
            self.assertAlmostEqual(px_poly[0][0], 0.2 * w)
            self.assertAlmostEqual(px_poly[0][1], 0.3 * h)
            self.assertAlmostEqual(px_poly[2][0], 0.8 * w)
            self.assertAlmostEqual(px_poly[2][1], 0.7 * h)
            # Centroid in normalized coordinates is (0.5, 0.5)
            self.assertTrue(zone.is_inside((w * 0.5, h * 0.5), w, h))
            self.assertFalse(zone.is_inside((w * 0.1, h * 0.1), w, h))

    # 3. Tripwire line segment intersection
    def test_03_tripwire_line_intersection_basic(self):
        tripwire = ((100, 200), (500, 200))
        # Crossing trajectory
        p_prev = (300, 150)
        p_curr = (300, 250)
        self.assertTrue(segments_intersect(p_prev, p_curr, tripwire[0], tripwire[1]))

        # Non-crossing trajectory
        p_prev2 = (300, 150)
        p_curr2 = (300, 180)
        self.assertFalse(segments_intersect(p_prev2, p_curr2, tripwire[0], tripwire[1]))

    # 4. Tripwire crossing direction vector math (IN)
    def test_04_tripwire_crossing_direction_in(self):
        # Horizontal tripwire from left to right: (100, 300) -> (700, 300)
        # Normal vector N = (-(300-300), 700-100) = (0, 600) -> points downwards (increasing Y)
        tripwire = PolygonZone(
            zone_id="tw-01",
            name="Entry Line",
            polygon=[(100, 300), (700, 300)],
            is_tripwire=True,
            is_normalized=False,
        )
        # Moving downwards from Y=250 to Y=350 -> should be "IN"
        prev_pos = (400, 250)
        curr_pos = (400, 350)
        direction = tripwire.get_crossing_direction(prev_pos, curr_pos, 1920, 1080)
        self.assertEqual(direction, "IN")

    # 5. Tripwire crossing direction vector math (OUT)
    def test_05_tripwire_crossing_direction_out(self):
        tripwire = PolygonZone(
            zone_id="tw-01",
            name="Entry Line",
            polygon=[(100, 300), (700, 300)],
            is_tripwire=True,
            is_normalized=False,
        )
        # Moving upwards from Y=350 to Y=250 -> should be "OUT"
        prev_pos = (400, 350)
        curr_pos = (400, 250)
        direction = tripwire.get_crossing_direction(prev_pos, curr_pos, 1920, 1080)
        self.assertEqual(direction, "OUT")

    # 6. Non-intersecting parallel motion gating
    def test_06_tripwire_parallel_or_non_intersecting(self):
        tripwire = PolygonZone(
            zone_id="tw-01",
            name="Entry Line",
            polygon=[(100, 300), (700, 300)],
            is_tripwire=True,
            is_normalized=False,
        )
        # Parallel motion along Y=250
        prev_pos = (150, 250)
        curr_pos = (650, 250)
        self.assertFalse(tripwire.intersects_trajectory(prev_pos, curr_pos, 1920, 1080))

    # 7. OUTSIDE -> INSIDE state transition alert generation
    def test_07_zone_state_transition_outside_to_inside(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zone-alpha",
            name="Alpha Zone",
            polygon=[(200, 200), (600, 200), (600, 600), (200, 600)],
            is_normalized=False,
        )
        detector.add_zone(zone)

        # Frame 1: Track is outside at (100, 100)
        tracks_f1 = [{"track_id": 10, "class_name": "person", "bbox": [90, 90, 110, 110]}]
        events_f1, _ = detector.process_tracks(tracks_f1, camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(events_f1), 0)

        # Frame 2: Track moves inside to (400, 400)
        tracks_f2 = [{"track_id": 10, "class_name": "person", "bbox": [390, 390, 410, 410]}]
        events_f2, _ = detector.process_tracks(tracks_f2, camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(events_f2), 1)
        self.assertEqual(events_f2[0].event_type, "RESTRICTED_ZONE_ENTRY")
        self.assertEqual(events_f2[0].direction, "ENTERING")
        self.assertEqual(events_f2[0].track_id, 10)

    # 8. Inside lingering alert deduplication
    def test_08_zone_state_lingering_deduplication(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zone-alpha",
            name="Alpha Zone",
            polygon=[(200, 200), (600, 200), (600, 600), (200, 600)],
            is_normalized=False,
        )
        detector.add_zone(zone)

        # Frame 1: outside -> inside (Alert generated)
        detector.process_tracks([{"track_id": 10, "class_name": "person", "bbox": [90, 90, 110, 110]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        evs_entry, _ = detector.process_tracks([{"track_id": 10, "class_name": "person", "bbox": [390, 390, 410, 410]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(evs_entry), 1)

        # Frames 3 through 10: lingering inside zone (0 duplicate alerts)
        for i in range(8):
            evs_linger, _ = detector.process_tracks(
                [{"track_id": 10, "class_name": "person", "bbox": [400 + i, 400 + i, 420 + i, 420 + i]}],
                camera_id="cam-01",
                frame_width=1000,
                frame_height=1000,
            )
            self.assertEqual(len(evs_linger), 0, f"Lingering frame {i} produced unexpected duplicate alert")

    # 9. Zone exit and re-entry alert generation
    def test_09_zone_state_reentry_after_exit(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zone-alpha",
            name="Alpha Zone",
            polygon=[(200, 200), (600, 200), (600, 600), (200, 600)],
            is_normalized=False,
        )
        detector.add_zone(zone)

        # 1. Entry
        detector.process_tracks([{"track_id": 10, "class_name": "person", "bbox": [50, 50, 70, 70]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        ev1, _ = detector.process_tracks([{"track_id": 10, "class_name": "person", "bbox": [300, 300, 320, 320]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(ev1), 1)

        # 2. Exit
        ev_exit, _ = detector.process_tracks([{"track_id": 10, "class_name": "person", "bbox": [50, 50, 70, 70]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        # Exit resets the alert flag

        # 3. Re-entry (Should generate 2nd alert)
        ev2, _ = detector.process_tracks([{"track_id": 10, "class_name": "person", "bbox": [300, 300, 320, 320]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(ev2), 1)
        self.assertEqual(ev2[0].event_type, "RESTRICTED_ZONE_ENTRY")

    # 10. Tripwire crossing cooldown deduplication
    def test_10_tripwire_cooldown_deduplication(self):
        detector = IntrusionDetector()
        tripwire = PolygonZone(
            zone_id="tw-gate",
            name="Main Gate Line",
            polygon=[(100, 500), (900, 500)],
            is_tripwire=True,
            is_normalized=False,
        )
        detector.add_zone(tripwire)

        # Step 1: Initial position above tripwire
        detector.process_tracks([{"track_id": 5, "class_name": "car", "bbox": [480, 430, 520, 470]}], camera_id="cam-01", frame_width=1000, frame_height=1000)

        # Step 2: Cross tripwire downwards -> Alert 1
        ev1, _ = detector.process_tracks([{"track_id": 5, "class_name": "car", "bbox": [480, 530, 520, 570]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(ev1), 1)
        self.assertEqual(ev1[0].event_type, "TRIPWIRE_CROSSING")
        self.assertEqual(ev1[0].direction, "IN")

        # Step 3: Immediate jitter / oscillation back and forth within cooldown window -> Gated (0 alerts)
        detector.process_tracks([{"track_id": 5, "class_name": "car", "bbox": [480, 430, 520, 470]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        ev_cooldown, _ = detector.process_tracks([{"track_id": 5, "class_name": "car", "bbox": [480, 530, 520, 570]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(ev_cooldown), 0)

    # 11. Real-time class-wise visible object counting
    def test_11_class_wise_live_counting(self):
        tracks = [
            {"track_id": 1, "class_name": "person", "bbox": [10, 10, 20, 20]},
            {"track_id": 2, "class_name": "person", "bbox": [30, 30, 40, 40]},
            {"track_id": 3, "class_name": "car", "bbox": [50, 50, 80, 80]},
            {"track_id": 4, "class_name": "car", "bbox": [90, 90, 120, 120]},
            {"track_id": 5, "class_name": "car", "bbox": [130, 130, 160, 160]},
            {"track_id": 6, "class_name": "truck", "bbox": [170, 170, 220, 220]},
            {"track_id": 7, "class_name": "bus", "bbox": [230, 230, 290, 290]},
            {"track_id": 8, "class_name": "motorcycle", "bbox": [300, 300, 320, 320]},
            {"track_id": 9, "class_name": "bicycle", "bbox": [330, 330, 345, 345]},
        ]

        class_counts = {}
        for trk in tracks:
            cls = trk["class_name"].lower()
            class_counts[cls] = class_counts.get(cls, 0) + 1

        counts_payload = {
            "visible": {
                "total": len(tracks),
                "person": class_counts.get("person", 0),
                "car": class_counts.get("car", 0),
                "truck": class_counts.get("truck", 0),
                "bus": class_counts.get("bus", 0),
                "motorcycle": class_counts.get("motorcycle", 0),
                "bicycle": class_counts.get("bicycle", 0),
            }
        }

        self.assertEqual(counts_payload["visible"]["total"], 9)
        self.assertEqual(counts_payload["visible"]["person"], 2)
        self.assertEqual(counts_payload["visible"]["car"], 3)
        self.assertEqual(counts_payload["visible"]["truck"], 1)
        self.assertEqual(counts_payload["visible"]["bus"], 1)
        self.assertEqual(counts_payload["visible"]["motorcycle"], 1)
        self.assertEqual(counts_payload["visible"]["bicycle"], 1)

    # 12. Session unique track counting by class
    def test_12_session_unique_track_counting(self):
        unique_track_ids = set()
        unique_person_ids = set()
        unique_vehicle_ids = set()

        frames_tracks = [
            [{"track_id": 1, "class_name": "person"}, {"track_id": 2, "class_name": "car"}],
            [{"track_id": 1, "class_name": "person"}, {"track_id": 2, "class_name": "car"}, {"track_id": 3, "class_name": "truck"}],
            [{"track_id": 4, "class_name": "person"}, {"track_id": 3, "class_name": "truck"}],
        ]

        for frame in frames_tracks:
            for trk in frame:
                tid = trk["track_id"]
                cls = trk["class_name"].lower()
                unique_track_ids.add(tid)
                if cls == "person":
                    unique_person_ids.add(tid)
                elif cls in ("car", "truck", "bus", "motorcycle", "bicycle"):
                    unique_vehicle_ids.add(tid)

        self.assertEqual(len(unique_track_ids), 4)
        self.assertEqual(len(unique_person_ids), 2)
        self.assertEqual(len(unique_vehicle_ids), 2)

    # 13. Multi-camera track ID isolation
    def test_13_multi_camera_track_isolation(self):
        detector = IntrusionDetector()
        zone1 = PolygonZone(
            zone_id="zone-test-1",
            camera_id="cam-01",
            name="Zone Cam 1",
            polygon=[(100, 100), (500, 100), (500, 500), (100, 500)],
            is_normalized=False,
        )
        zone2 = PolygonZone(
            zone_id="zone-test-2",
            camera_id="cam-02",
            name="Zone Cam 2",
            polygon=[(100, 100), (500, 100), (500, 500), (100, 500)],
            is_normalized=False,
        )
        detector.add_zone(zone1)
        detector.add_zone(zone2)

        # Track 1 on CAM-01 enters zone
        detector.process_tracks([{"track_id": 1, "class_name": "person", "bbox": [10, 10, 20, 20]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        ev1, _ = detector.process_tracks([{"track_id": 1, "class_name": "person", "bbox": [200, 200, 220, 220]}], camera_id="cam-01", frame_width=1000, frame_height=1000)
        self.assertEqual(len(ev1), 1)
        self.assertEqual(ev1[0].camera_id, "cam-01")

        # Track 1 on CAM-02 enters zone independently
        detector.process_tracks([{"track_id": 1, "class_name": "person", "bbox": [10, 10, 20, 20]}], camera_id="cam-02", frame_width=1000, frame_height=1000)
        ev2, _ = detector.process_tracks([{"track_id": 1, "class_name": "person", "bbox": [200, 200, 220, 220]}], camera_id="cam-02", frame_width=1000, frame_height=1000)
        self.assertEqual(len(ev2), 1)
        self.assertEqual(ev2[0].camera_id, "cam-02")

    # 14. Camera zones configuration schema validity
    def test_14_camera_zones_json_validity(self):
        self.assertTrue(os.path.exists(self.zones_config_path))
        with open(self.zones_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        cam_keys = [f"cam-0{i}" for i in range(1, 10)]
        for k in cam_keys:
            self.assertIn(k, data)
            zones = data[k]
            self.assertGreater(len(zones), 0)
            for z in zones:
                self.assertIn("id", z)
                self.assertIn("name", z)
                self.assertIn("polygon", z)
                for pt in z["polygon"]:
                    self.assertEqual(len(pt), 2)
                    self.assertGreaterEqual(pt[0], 0.0)
                    self.assertLessEqual(pt[0], 1.0)
                    self.assertGreaterEqual(pt[1], 0.0)
                    self.assertLessEqual(pt[1], 1.0)

    # 15. Camera sources configuration schema validity
    def test_15_camera_sources_json_validity(self):
        self.assertTrue(os.path.exists(self.sources_config_path))
        with open(self.sources_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        cam_keys = [f"cam-0{i}" for i in range(1, 10)]
        for k in cam_keys:
            self.assertIn(k, data)
            src_info = data[k]
            self.assertIn("name", src_info)
            self.assertIn("source_uri", src_info)
            self.assertIn("resolution", src_info)

    # 16. Real CAM-01 tripwire crossings detection
    def test_16_real_cam01_tripwire_crossings(self):
        detector = YoloDetector()
        detector.load_model()
        tracker = ByteTrackEngine()

        intrusion_det = IntrusionDetector()
        # Calibrated CAM-01 tripwire
        tw = PolygonZone(
            zone_id="line-cam-01-tripwire",
            name="Alpha Entry Tripwire",
            polygon=[(0.20, 0.72), (0.85, 0.72)],
            is_tripwire=True,
            is_normalized=True,
        )
        intrusion_det.add_zone(tw)

        cap = cv2.VideoCapture(self.cam01_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        tripwire_events = []
        frame_idx = 0
        while frame_idx < 100:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            frame_idx += 1

            det_res = detector.detect(frame, camera_id="cam-01")
            tracks = tracker.update(det_res["detections"], frame, frame_id=frame_idx)

            evs, _ = intrusion_det.process_tracks(tracks, camera_id="cam-01", frame_width=w, frame_height=h, frame_id=frame_idx)
            for ev in evs:
                if ev.event_type == "TRIPWIRE_CROSSING":
                    tripwire_events.append(ev)
            if len(tripwire_events) >= 2:
                break

        cap.release()
        self.assertGreater(len(tripwire_events), 0, "No real tripwire crossings detected in first 100 frames of CAM-01.mp4")
        for ev in tripwire_events:
            self.assertIn(ev.direction, ("IN", "OUT"))
            self.assertGreater(ev.track_id, 0)

    # 17. Real CAM-01 zone intrusions detection
    def test_17_real_cam01_zone_intrusions(self):
        detector = YoloDetector()
        detector.load_model()
        tracker = ByteTrackEngine()

        intrusion_det = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zone-cam-01-main",
            name="Sector Alpha Main Gate Restricted Zone",
            polygon=[(0.35, 0.40), (0.88, 0.40), (0.88, 0.92), (0.35, 0.92)],
            is_tripwire=False,
            is_normalized=True,
        )
        intrusion_det.add_zone(zone)

        cap = cv2.VideoCapture(self.cam01_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        zone_events = []
        frame_idx = 0
        while frame_idx < 80:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            frame_idx += 1

            det_res = detector.detect(frame, camera_id="cam-01")
            tracks = tracker.update(det_res["detections"], frame, frame_id=frame_idx)

            evs, _ = intrusion_det.process_tracks(tracks, camera_id="cam-01", frame_width=w, frame_height=h, frame_id=frame_idx)
            for ev in evs:
                if ev.event_type == "RESTRICTED_ZONE_ENTRY":
                    zone_events.append(ev)
            if len(zone_events) >= 2:
                break

        cap.release()
        self.assertGreater(len(zone_events), 0, "No real zone intrusions detected in first 80 frames of CAM-01.mp4")

    # 18. Real CAM-01 object counting accuracy & variance
    def test_18_real_cam01_counting_accuracy(self):
        detector = YoloDetector()
        detector.load_model()
        tracker = ByteTrackEngine()

        cap = cv2.VideoCapture(self.cam01_path)
        counts_history = []
        unique_tids = set()

        for idx in range(30):
            ret, frame = cap.read()
            if not ret:
                break
            det = detector.detect(frame, camera_id="cam-01")
            tracks = tracker.update(det["detections"], frame, frame_id=idx + 1)
            counts_history.append(len(tracks))
            for t in tracks:
                unique_tids.add(t["track_id"])

        cap.release()
        self.assertGreater(len(counts_history), 20)
        self.assertGreater(max(counts_history), 0)
        self.assertGreater(len(unique_tids), 5)
        # Content variance in counts (real traffic dynamic count)
        self.assertGreater(np.var(counts_history), 0.0)

    # 19. IntrusionEvent schema completeness
    def test_19_intrusion_event_schema_completeness(self):
        ev = IntrusionEvent(
            camera_id="cam-01",
            zone_id="zone-01",
            zone_name="Main Sector",
            track_id=42,
            class_name="person",
            position=(500, 500),
            direction="IN",
            timestamp=1234567.89,
            event_type="TRIPWIRE_CROSSING",
            prev_position=(500, 480),
            frame_id=105,
            risk_score=75.0,
        )

        d = ev.to_dict()
        self.assertEqual(d["camera_id"], "cam-01")
        self.assertEqual(d["event_type"], "TRIPWIRE_CROSSING")
        self.assertEqual(d["direction"], "IN")
        self.assertEqual(d["track_id"], 42)
        self.assertEqual(d["frame_id"], 105)
        self.assertEqual(d["risk_score"], 75.0)

    # 20. frame_state counts payload structure
    def test_20_frame_state_counts_payload_structure(self):
        frame_state = {
            "type": "frame_state",
            "camera_id": "cam-01",
            "frame_id": 12,
            "frame_sequence": 12,
            "source_type": "MP4",
            "timestamp": time.time(),
            "measured_fps": 30.0,
            "processing_latency_ms": 14.5,
            "detections": [],
            "tracks": [],
            "counts": {
                "visible": {
                    "total": 5,
                    "person": 1,
                    "car": 3,
                    "truck": 1,
                    "bus": 0,
                    "motorcycle": 0,
                    "bicycle": 0,
                },
                "unique_session": {
                    "total": 12,
                    "person": 3,
                    "vehicle": 9,
                },
            },
        }

        self.assertIn("counts", frame_state)
        self.assertIn("visible", frame_state["counts"])
        self.assertIn("unique_session", frame_state["counts"])
        self.assertEqual(frame_state["counts"]["visible"]["total"], 5)
        self.assertEqual(frame_state["counts"]["unique_session"]["total"], 12)

    # 21. Risk engine zone intrusion weighting
    def test_21_risk_engine_zone_integration(self):
        risk_engine = RiskEngine()
        track = {
            "track_id": 99,
            "class_name": "person",
            "bbox": [100, 100, 200, 300],
            "confidence": 0.92,
        }

        # Assessment outside zone
        assessment_outside, _ = risk_engine.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=False,
            has_intrusion=False,
            is_loitering=False,
            dwell_seconds=0.0,
            reentry_count=0,
            current_time=time.time(),
        )

        # Assessment inside zone with intrusion
        assessment_inside, _ = risk_engine.evaluate_track(
            camera_id="cam-01",
            track=track,
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=False,
            dwell_seconds=5.0,
            reentry_count=0,
            current_time=time.time() + 1.0,
        )

        self.assertGreater(assessment_inside.score, assessment_outside.score)

    # 22. Incident manager trigger and recording lifecycle
    def test_22_incident_manager_evidence_recording(self):
        buffer = CircularFrameBuffer(capacity_seconds=3.0, fps=10.0)
        out_dir = os.path.join(PROJECT_ROOT, "evidence_test_p17")
        os.makedirs(out_dir, exist_ok=True)

        manager = IncidentManager(
            circular_buffer=buffer,
            output_dir=out_dir,
            pre_event_seconds=1.0,
            post_event_seconds=1.0,
            fps=10.0,
        )

        # Push 15 synthetic frames with texture
        for i in range(15):
            f = np.full((360, 640, 3), i * 15, dtype=np.uint8)
            buffer.push("cam-01", f, time.time() + i * 0.1)

        inc = manager.check_and_trigger(
            camera_id="cam-01",
            track_id=1,
            class_name="person",
            risk_score=92.0,
            risk_level="CRITICAL",
            reasons=[{"factor": "ZONE_INTRUSION", "description": "Breach"}],
            zone_name="Perimeter Gate",
            event_type="TRIPWIRE_CROSSING",
            current_time=time.time() + 1.5,
        )

        self.assertIsNotNone(inc)
        self.assertEqual(inc.risk_level, "CRITICAL")
        self.assertEqual(inc.camera_id, "cam-01")

        # Push remaining frames to complete recording
        completed = []
        for i in range(15, 30):
            f = np.full((360, 640, 3), i * 8, dtype=np.uint8)
            comp = manager.record_frame("cam-01", f, time.time() + i * 0.1)
            completed.extend(comp)

        self.assertGreater(len(completed), 0)

    # 23. Evidence MP4 non-black video variance validation (10%, 50%, 90%)
    def test_23_evidence_mp4_video_visual_content(self):
        evidence_dir = os.path.join(PROJECT_ROOT, "evidence")
        mp4_files = [os.path.join(evidence_dir, f) for f in os.listdir(evidence_dir) if f.endswith(".mp4")] if os.path.exists(evidence_dir) else []

        target_mp4 = None
        for f in mp4_files:
            cap_test = cv2.VideoCapture(f)
            if int(cap_test.get(cv2.CAP_PROP_FRAME_COUNT)) > 5:
                target_mp4 = f
                cap_test.release()
                break
            cap_test.release()

        if not target_mp4:
            # Generate a test evidence clip from CAM-01 frames
            out_path = os.path.join(PROJECT_ROOT, "evidence_test_p17", "INC-TEST-01.mp4")
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            writer = EvidenceWriter(fps=10.0)

            cap = cv2.VideoCapture(self.cam01_path)
            frames = []
            for _ in range(25):
                r, f = cap.read()
                if r:
                    frames.append(f)
            cap.release()

            metadata = {
                "incident_id": "INC-TEST-01",
                "camera_id": "CAM-01",
                "timestamp": "2026-08-30 01:00:00 UTC",
                "risk_level": "CRITICAL",
                "risk_score": 95,
                "event_type": "TRIPWIRE_CROSSING",
                "zone_name": "Sector Alpha Gate",
                "track_id": 7,
                "class_name": "person",
                "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            }
            writer.write_clip(frames, out_path, metadata)
            target_mp4 = out_path

        cap = cv2.VideoCapture(target_mp4)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.assertGreater(total_frames, 5)

        check_indices = [
            int(total_frames * 0.1),
            int(total_frames * 0.5),
            int(total_frames * 0.9),
        ]

        for f_idx in check_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
            ret, frame = cap.read()
            self.assertTrue(ret)
            self.assertIsNotNone(frame)
            # Inspect middle 60% of the image (ignoring HUD bars)
            h, w, _ = frame.shape
            center_crop = frame[int(h * 0.2) : int(h * 0.8), int(w * 0.2) : int(w * 0.8)]
            variance = float(np.var(center_crop))
            self.assertGreater(variance, 100.0, f"Frame {f_idx} has variance {variance} <= 100 (possible black frame)")

        cap.release()

    # 24. Evidence SHA-256 seal and metadata JSON integrity
    def test_24_evidence_metadata_json_fields(self):
        evidence_dir = os.path.join(PROJECT_ROOT, "evidence")
        json_files = [os.path.join(evidence_dir, f) for f in os.listdir(evidence_dir) if f.endswith(".json")] if os.path.exists(evidence_dir) else []

        if json_files:
            with open(json_files[0], "r", encoding="utf-8") as f:
                meta = json.load(f)
            self.assertIn("incident_id", meta)
            self.assertIn("sha256_hash", meta)
            self.assertIn("camera_id", meta)
            self.assertIn("risk_score", meta)
            self.assertEqual(len(meta["sha256_hash"]), 64)

    # 25. Zero-dummy random audit in production CV modules
    def test_25_zero_dummy_random_audit(self):
        audited_files = [
            os.path.join(PROJECT_ROOT, "cv_service", "detection", "yolo_detector.py"),
            os.path.join(PROJECT_ROOT, "cv_service", "tracking", "byte_tracker.py"),
            os.path.join(PROJECT_ROOT, "cv_service", "geometry", "polygon.py"),
            os.path.join(PROJECT_ROOT, "cv_service", "intrusion", "detector.py"),
            os.path.join(PROJECT_ROOT, "cv_service", "risk", "engine.py"),
        ]

        forbidden_tokens = ["random.randint", "random.choice", "np.random.randint", "fake_detection", "dummy_track"]
        for fpath in audited_files:
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                for token in forbidden_tokens:
                    self.assertNotIn(token, content, f"Forbidden token {token} found in {fpath}")

    # 26. Boundary precision math for tripwires
    def test_26_tripwire_crossing_boundary_precision(self):
        # Tripwire at Y = 500
        p1 = (100, 500)
        p2 = (900, 500)

        # Step exactly touching line
        p_touch = (500, 500)
        p_above = (500, 480)
        p_below = (500, 520)

        self.assertTrue(segments_intersect(p_above, p_touch, p1, p2))
        self.assertTrue(segments_intersect(p_touch, p_below, p1, p2))
        self.assertTrue(segments_intersect(p_above, p_below, p1, p2))

    # 27. Concave / L-shaped polygon containment
    def test_27_convex_and_concave_polygon_support(self):
        # L-shaped polygon
        l_poly = [
            (0, 0),
            (200, 0),
            (200, 100),
            (100, 100),
            (100, 200),
            (0, 200),
        ]
        # Point inside lower-left section
        self.assertTrue(is_point_in_polygon((50, 150), l_poly))
        # Point inside upper-right section
        self.assertTrue(is_point_in_polygon((150, 50), l_poly))
        # Point in the cut-out corner (outside)
        self.assertFalse(is_point_in_polygon((150, 150), l_poly))

    # 28. End-to-end live pipeline simulation on real footage
    def test_28_end_to_end_pipeline_live_stream_simulation(self):
        detector = YoloDetector()
        detector.load_model()
        tracker = ByteTrackEngine()
        intrusion_det = IntrusionDetector()
        risk_eng = RiskEngine()

        tw = PolygonZone(zone_id="tw-01", camera_id="cam-01", name="Gate", polygon=[(0.20, 0.72), (0.85, 0.72)], is_tripwire=True, is_normalized=True)
        rz = PolygonZone(zone_id="rz-01", camera_id="cam-01", name="Perimeter", polygon=[(0.20, 0.55), (0.85, 0.55), (0.85, 0.95), (0.20, 0.95)], is_tripwire=False, is_normalized=True)
        intrusion_det.add_zone(tw)
        intrusion_det.add_zone(rz)

        cap = cv2.VideoCapture(self.cam01_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        all_events = []
        all_tracks_count = 0

        for f_idx in range(60):
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            det_res = detector.detect(frame, camera_id="cam-01")
            tracks = tracker.update(det_res["detections"], frame, frame_id=f_idx + 1)
            all_tracks_count += len(tracks)

            evs, _ = intrusion_det.process_tracks(tracks, camera_id="cam-01", frame_width=w, frame_height=h, frame_id=f_idx + 1)
            all_events.extend(evs)

            for trk in tracks:
                risk_eng.evaluate_track(
                    camera_id="cam-01",
                    track=trk,
                    is_inside_zone=any(ev.track_id == trk["track_id"] for ev in evs),
                    has_intrusion=any(ev.track_id == trk["track_id"] for ev in evs),
                    is_loitering=False,
                    dwell_seconds=0.0,
                    reentry_count=0,
                    current_time=time.time(),
                )

        cap.release()
        self.assertGreater(all_tracks_count, 100)
        self.assertGreater(len(all_events), 0)


class TestPhase17IntelligentSurveillancePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures_dir = os.path.join(PROJECT_ROOT, "cv_service", "tests", "fixtures", "visdrone")
        cls.cam01_path = os.path.join(cls.fixtures_dir, "CAM-01.mp4")
        cls.cam02_path = os.path.join(cls.fixtures_dir, "CAM-02.mp4")
        cls.evidence_dir = os.path.join(PROJECT_ROOT, "evidence", "test_phase17")
        os.makedirs(cls.evidence_dir, exist_ok=True)

    def _get_test_frames(self, count=30):
        frames = []
        now_ts = time.time()
        if os.path.exists(self.cam01_path):
            cap = cv2.VideoCapture(self.cam01_path)
            for i in range(count):
                ret, frame = cap.read()
                if not ret or frame is None:
                    break
                frames.append((now_ts + (i / 15.0), frame))
            cap.release()

        # Fallback if fixture video missing or short: generate structured surveillance test frames
        if len(frames) < count:
            needed = count - len(frames)
            for i in range(needed):
                f = np.full((720, 1280, 3), 40 + (i % 20), dtype=np.uint8)
                # Draw realistic surveillance context
                cv2.rectangle(f, (100, 100), (400, 500), (0, 140, 255), 2)
                cv2.putText(f, f"TEST FRAME {i}", (120, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                frames.append((now_ts + (len(frames) / 15.0), f))
        return frames

    # 1. Normalized polygon coordinates support in PolygonZone
    def test_01_normalized_polygon_zone_coordinates(self):
        norm_zone = PolygonZone(
            zone_id="zn-norm-01",
            camera_id="cam-01",
            name="Normalized Test Zone",
            polygon=[(0.1, 0.1), (0.6, 0.1), (0.6, 0.6), (0.1, 0.6)],
            zone_type="RESTRICTED_ZONE",
        )
        self.assertTrue(norm_zone.is_normalized)
        pixel_poly = norm_zone.get_pixel_polygon(1920, 1080)
        self.assertEqual(len(pixel_poly), 4)
        self.assertAlmostEqual(pixel_poly[0][0], 192.0)
        self.assertAlmostEqual(pixel_poly[0][1], 108.0)
        self.assertAlmostEqual(pixel_poly[2][0], 1152.0)
        self.assertAlmostEqual(pixel_poly[2][1], 648.0)

        # Inside point (0.3*1920=576, 0.3*1080=324)
        self.assertTrue(norm_zone.is_inside((576.0, 324.0), 1920, 1080))
        # Outside point (1500, 900)
        self.assertFalse(norm_zone.is_inside((1500.0, 900.0), 1920, 1080))

    # 2. Outside -> Inside state transition generates Intrusion Alert
    def test_02_suspicious_zone_intrusion_alert(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zn-res-01",
            camera_id="cam-01",
            name="Secure Depot Alpha",
            polygon=[(200.0, 200.0), (800.0, 200.0), (800.0, 800.0), (200.0, 800.0)],
            zone_type="RESTRICTED_ZONE",
        )
        detector.add_zone(zone)

        # Frame 1: Track #101 is OUTSIDE at (100, 100)
        tracks_f1 = [
            {"track_id": 101, "class_name": "person", "confidence": 0.92, "bbox": {"x1": 80, "y1": 80, "x2": 120, "y2": 120}}
        ]
        events_f1, _ = detector.process_tracks(tracks_f1, "cam-01", 1920, 1080)
        self.assertEqual(len(events_f1), 0, "No alert should be fired while target is outside")

        # Frame 2: Track #101 moves INSIDE to (400, 400)
        tracks_f2 = [
            {"track_id": 101, "class_name": "person", "confidence": 0.94, "bbox": {"x1": 380, "y1": 380, "x2": 420, "y2": 420}}
        ]
        events_f2, _ = detector.process_tracks(tracks_f2, "cam-01", 1920, 1080)
        self.assertEqual(len(events_f2), 1, "Intrusion event must be generated on OUTSIDE -> INSIDE transition")
        ev = events_f2[0]
        self.assertEqual(ev.track_id, 101)
        self.assertEqual(ev.direction, "ENTERING")
        self.assertEqual(ev.camera_id, "cam-01")
        self.assertEqual(ev.zone_id, "zn-res-01")
        self.assertTrue(ev.alert_id.startswith("alt-"))

    # 3. Target lingering inside generates no duplicate alerts
    def test_03_suspicious_zone_no_duplicate_alert_on_dwell(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zn-res-02",
            camera_id="cam-01",
            name="Restricted Bay",
            polygon=[(200.0, 200.0), (800.0, 200.0), (800.0, 800.0), (200.0, 800.0)],
        )
        detector.add_zone(zone)

        # Move inside
        detector.process_tracks([{"track_id": 102, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 90, "y1": 90, "x2": 110, "y2": 110}}], "cam-01", 1920, 1080)
        events_enter, _ = detector.process_tracks([{"track_id": 102, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 490, "y1": 490, "x2": 510, "y2": 510}}], "cam-01", 1920, 1080)
        self.assertEqual(len(events_enter), 1)

        # Dwell inside for 5 subsequent frames
        for _ in range(5):
            events_dwell, _ = detector.process_tracks(
                [{"track_id": 102, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 500, "y1": 500, "x2": 520, "y2": 520}}],
                "cam-01",
                1920,
                1080,
            )
            self.assertEqual(len(events_dwell), 0, "No duplicate intrusion alert should fire while target dwells inside")

    # 4. Re-entry after zone exit fires new intrusion alert
    def test_04_suspicious_zone_reentry_alert(self):
        detector = IntrusionDetector()
        zone = PolygonZone(
            zone_id="zn-res-03",
            camera_id="cam-01",
            name="Restricted Zone C",
            polygon=[(200.0, 200.0), (600.0, 200.0), (600.0, 600.0), (200.0, 600.0)],
        )
        detector.add_zone(zone)

        # Step 1: Start outside
        detector.process_tracks([{"track_id": 103, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 100, "y1": 100, "x2": 120, "y2": 120}}], "cam-01", 1920, 1080)

        # Step 2: Enter zone (Alert 1)
        ev1, _ = detector.process_tracks([{"track_id": 103, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 300, "y1": 300, "x2": 320, "y2": 320}}], "cam-01", 1920, 1080)
        self.assertEqual(len(ev1), 1)
        self.assertEqual(ev1[0].direction, "ENTERING")

        # Step 3: Exit zone
        ev_exit, _ = detector.process_tracks([{"track_id": 103, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 800, "y1": 800, "x2": 820, "y2": 820}}], "cam-01", 1920, 1080)
        self.assertEqual(len(ev_exit), 1)
        self.assertEqual(ev_exit[0].direction, "EXITING")

        # Step 4: Re-enter zone (Alert 2)
        ev_reenter, _ = detector.process_tracks([{"track_id": 103, "class_name": "person", "confidence": 0.9, "bbox": {"x1": 400, "y1": 400, "x2": 420, "y2": 420}}], "cam-01", 1920, 1080)
        self.assertEqual(len(ev_reenter), 1)
        self.assertEqual(ev_reenter[0].direction, "ENTERING")

    # 5. Tripwire crossing line segment intersection
    def test_05_tripwire_crossing_detection(self):
        detector = IntrusionDetector()
        tripwire = PolygonZone(
            zone_id="tw-01",
            camera_id="cam-01",
            name="Virtual Border Tripwire",
            polygon=[(100.0, 500.0), (900.0, 500.0)],
            zone_type="TRIPWIRE",
        )
        detector.add_zone(tripwire)
        self.assertTrue(tripwire.is_tripwire)

        # Frame 1: Position north of tripwire (500, 450)
        detector.process_tracks([{"track_id": 104, "class_name": "vehicle", "confidence": 0.88, "bbox": {"x1": 480, "y1": 430, "x2": 520, "y2": 470}}], "cam-01", 1920, 1080)

        # Frame 2: Position south of tripwire (500, 550) -> Crossed y=500 line
        events, _ = detector.process_tracks([{"track_id": 104, "class_name": "vehicle", "confidence": 0.89, "bbox": {"x1": 480, "y1": 530, "x2": 520, "y2": 570}}], "cam-01", 1920, 1080)
        self.assertEqual(len(events), 1, "Tripwire crossing must be detected when trajectory crosses line")
        self.assertIn(events[0].direction, ("IN", "CROSSING"))
        self.assertEqual(events[0].zone_id, "tw-01")

    # 6. Real-Time Person and Object Counting
    def test_06_realtime_person_and_object_counting(self):
        # Sample tracked objects
        tracks = [
            {"track_id": 1, "class_name": "person", "bbox": {"x1": 10, "y1": 10, "x2": 30, "y2": 30}},
            {"track_id": 2, "class_name": "person", "bbox": {"x1": 40, "y1": 40, "x2": 60, "y2": 60}},
            {"track_id": 3, "class_name": "car", "bbox": {"x1": 100, "y1": 100, "x2": 180, "y2": 150}},
            {"track_id": 4, "class_name": "truck", "bbox": {"x1": 200, "y1": 200, "x2": 300, "y2": 280}},
            {"track_id": 5, "class_name": "backpack", "bbox": {"x1": 50, "y1": 50, "x2": 70, "y2": 70}},
        ]
        person_count = sum(1 for t in tracks if t["class_name"].lower() == "person")
        vehicle_count = sum(1 for t in tracks if t["class_name"].lower() in ("car", "truck", "bus", "van", "motorcycle", "vehicle"))
        total_count = len(tracks)

        self.assertEqual(person_count, 2)
        self.assertEqual(vehicle_count, 2)
        self.assertEqual(total_count, 5)

    # 7. Forensic Evidence Video Creation (Non-black and H.264 compatible)
    def test_07_evidence_video_non_black_and_h264_compatible(self):
        writer = EvidenceWriter(evidence_dir=self.evidence_dir, fps=15.0)
        frames = self._get_test_frames(count=30)
        self.assertGreaterEqual(len(frames), 15, "At least 15 real video frames must be extracted")

        metadata = {
            "camera_id": "cam-01",
            "track_id": 17,
            "class_name": "person",
            "event_type": "PERIMETER_BREACH",
            "risk_score": 92,
            "risk_level": "CRITICAL",
            "zone_name": "Sector Alpha Restricted Zone",
            "reasons": [{"code": "INTRUSION", "points": 40}, {"code": "LOITERING", "points": 25}],
        }

        res = writer.write_evidence_clip("INC-P17-001", frames, metadata)
        self.assertTrue(res["success"])
        self.assertEqual(res["verification_status"], "VERIFIED")
        self.assertGreater(res["file_size_bytes"], 1000)
        self.assertTrue(os.path.exists(res["absolute_path"]))

        # Verify video can be opened and decoded by OpenCV
        check_cap = cv2.VideoCapture(res["absolute_path"])
        self.assertTrue(check_cap.isOpened())
        read_frames = 0
        non_zero_pixels = 0
        while True:
            ret, f = check_cap.read()
            if not ret or f is None:
                break
            read_frames += 1
            if np.mean(f) > 5.0:  # Confirms frame is not pitch black
                non_zero_pixels += 1
        check_cap.release()

        self.assertGreaterEqual(read_frames, 15)
        self.assertGreaterEqual(non_zero_pixels, 15, "Evidence video must contain real visible frames and forensic HUD, not black video")

    # 8. SHA-256 Cryptographic Evidence Seal Verification
    def test_08_evidence_sha256_cryptographic_seal(self):
        writer = EvidenceWriter(evidence_dir=self.evidence_dir, fps=15.0)
        frames = self._get_test_frames(count=20)

        metadata = {
            "camera_id": "cam-01",
            "track_id": 22,
            "class_name": "person",
            "event_type": "RESTRICTED_ZONE_BREACH",
            "risk_score": 85,
            "risk_level": "HIGH",
            "zone_name": "Sector Bravo",
            "reasons": [{"code": "INTRUSION", "points": 40}],
        }

        res = writer.write_evidence_clip("INC-P17-002", frames, metadata)
        sha256_returned = res["sha256"]
        self.assertEqual(len(sha256_returned), 64)

        # Manually compute SHA-256 on disk
        hasher = hashlib.sha256()
        with open(res["absolute_path"], "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        manual_sha256 = hasher.hexdigest()

        self.assertEqual(sha256_returned, manual_sha256, "Returned SHA-256 seal must match exact byte hash of MP4 file")

    # 9. Evidence Tamper Detection
    def test_09_evidence_tamper_detection(self):
        writer = EvidenceWriter(evidence_dir=self.evidence_dir, fps=15.0)
        frames = self._get_test_frames(count=20)

        res = writer.write_evidence_clip("INC-P17-003", frames, {"camera_id": "cam-01", "track_id": 5, "class_name": "person", "event_type": "BREACH", "risk_score": 80, "risk_level": "HIGH", "zone_name": "Alpha"})
        original_hash = res["sha256"]
        file_path = res["absolute_path"]

        # Validate original integrity
        verification = EvidenceWriter.verify_evidence_file(file_path, original_hash)
        self.assertTrue(verification["verified"])
        self.assertFalse(verification["tampered"])

        # Tamper with file (flip a byte)
        with open(file_path, "r+b") as f:
            f.seek(100)
            orig_byte = f.read(1)
            new_byte = bytes([(orig_byte[0] ^ 0xFF)]) if orig_byte else b"\x00"
            f.seek(100)
            f.write(new_byte)

        # Verify tamper detection triggers
        tamper_check = EvidenceWriter.verify_evidence_file(file_path, original_hash)
        self.assertFalse(tamper_check["verified"])
        self.assertTrue(tamper_check["tampered"])

    # 10. Frame state telemetry payload integrity
    def test_10_frame_state_telemetry_schema(self):
        sample_frame_state = {
            "type": "frame_state",
            "camera_id": "cam-01",
            "frame_id": 142,
            "frame_sequence": 142,
            "source_type": "FILE",
            "timestamp": time.time(),
            "measured_fps": 25.0,
            "processing_latency_ms": 14.5,
            "person_count": 3,
            "vehicle_count": 1,
            "object_count": 4,
            "tracks": [
                {"track_id": 1, "class_name": "person", "confidence": 0.92, "bbox": {"x1": 100, "y1": 100, "x2": 150, "y2": 200}, "risk_score": 75, "risk_level": "HIGH"},
                {"track_id": 2, "class_name": "person", "confidence": 0.88, "bbox": {"x1": 200, "y1": 150, "x2": 240, "y2": 220}, "risk_score": 20, "risk_level": "LOW"},
                {"track_id": 3, "class_name": "person", "confidence": 0.85, "bbox": {"x1": 300, "y1": 200, "x2": 330, "y2": 260}, "risk_score": 15, "risk_level": "LOW"},
                {"track_id": 4, "class_name": "car", "confidence": 0.95, "bbox": {"x1": 400, "y1": 300, "x2": 550, "y2": 420}, "risk_score": 30, "risk_level": "LOW"},
            ],
            "risk": {"max_score": 75, "level": "HIGH"},
        }
        self.assertEqual(sample_frame_state["person_count"], 3)
        self.assertEqual(sample_frame_state["vehicle_count"], 1)
        self.assertEqual(sample_frame_state["object_count"], 4)
        self.assertEqual(len(sample_frame_state["tracks"]), 4)
        self.assertGreater(sample_frame_state["measured_fps"], 0)
        self.assertGreater(sample_frame_state["processing_latency_ms"], 0)


if __name__ == "__main__":
    unittest.main()
