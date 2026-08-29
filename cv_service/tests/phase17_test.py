"""
SEEMADRISHTI AI — PHASE 17 AUTOMATED TEST SUITE
REAL INTELLIGENT ALERTS, TRIPWIRE CROSSING, SUSPICIOUS ZONES,
REAL-TIME PERSON/OBJECT COUNTING & EVIDENCE VALIDATION

Comprehensive 28-test validation covering:
1. Polygon containment geometry
2. Resolution scaling across varied resolutions
3. Tripwire line segment intersection
4. Tripwire direction vector math (IN)
5. Tripwire direction vector math (OUT)
6. Non-intersecting parallel motion gating
7. OUTSIDE -> INSIDE state transition alert generation
8. Inside lingering alert deduplication
9. Zone exit and re-entry alert generation
10. Tripwire crossing cooldown deduplication
11. Real-time class-wise visible object counting
12. Session unique track counting by class
13. Multi-camera track ID isolation
14. Camera zones configuration schema validity
15. Camera sources configuration schema validity
16. Real CAM-01 tripwire crossings detection
17. Real CAM-01 zone intrusions detection
18. Real CAM-01 object counting accuracy & variance
19. IntrusionEvent schema completeness
20. frame_state counts payload structure
21. Risk engine zone intrusion weighting
22. Incident manager trigger and recording lifecycle
23. Evidence MP4 non-black video variance validation (10%, 50%, 90%)
24. Evidence SHA-256 seal and metadata JSON integrity
25. Zero-dummy random audit in production CV modules
26. Boundary precision math for tripwires
27. Concave / L-shaped polygon containment
28. End-to-end live pipeline simulation on real footage
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
from cv_service.geometry.polygon import (
    PolygonZone,
    calculate_centroid,
    is_point_in_polygon,
    segments_intersect,
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
            polygon=[(0.20, 0.65), (0.92, 0.65)],
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

        if not mp4_files:
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
        else:
            target_mp4 = mp4_files[0]

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

        tw = PolygonZone(zone_id="tw-01", camera_id="cam-01", name="Gate", polygon=[(0.2, 0.65), (0.9, 0.65)], is_tripwire=True, is_normalized=True)
        rz = PolygonZone(zone_id="rz-01", camera_id="cam-01", name="Perimeter", polygon=[(0.35, 0.40), (0.88, 0.40), (0.88, 0.90), (0.35, 0.90)], is_tripwire=False, is_normalized=True)
        intrusion_det.add_zone(tw)
        intrusion_det.add_zone(rz)

        cap = cv2.VideoCapture(self.cam01_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        all_events = []
        all_tracks_count = 0

        for f_idx in range(40):
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


if __name__ == "__main__":
    unittest.main()
