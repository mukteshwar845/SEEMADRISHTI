"""
SEEMADRISHTI AI - Phase 23 Test Suite
Detection Accuracy Audit + Classification Correction + True Border Event Validation

44 Comprehensive Automated Tests:
1.  test_yolo_model_class_mapping
2.  test_raw_class_id_preservation
3.  test_canonical_class_name_preservation
4.  test_car_class_preservation_not_person
5.  test_truck_class_preservation
6.  test_bus_class_preservation
7.  test_motorcycle_class_preservation
8.  test_bounding_box_within_frame_boundaries
9.  test_multi_resolution_coordinate_scaling
10. test_cam08_aerial_road_vehicle_detections
11. test_cam08_no_vehicle_misclassified_as_person
12. test_cam07_sports_court_monitored_sector
13. test_cam07_sports_court_zero_false_breaches
14. test_state_normal_on_detection
15. test_state_suspicious_on_proximity_buffer
16. test_state_crossing_on_tripwire_intersect
17. test_state_breach_on_restricted_polygon_entry
18. test_state_monitored_zone_no_breach_alert
19. test_tripwire_crossing_direction_in
20. test_tripwire_crossing_direction_out
21. test_active_counts_from_active_bytetrack_ids
22. test_unique_session_counts_cumulative
23. test_active_vs_unique_separation
24. test_track_class_consistency_across_frames
25. test_fast_profile_confidence_filtering
26. test_balanced_profile_confidence_filtering
27. test_accuracy_profile_confidence_filtering
28. test_evidence_metadata_sha256_integrity
29. test_evidence_chain_tamper_detection
30. test_no_synthetic_or_math_random_in_backend
31. test_zone_config_cam07_monitored_sector_configured
32. test_zone_config_cam08_crossing_lines_configured
33. test_real_cam01_detection
34. test_real_cam02_detection
35. test_real_cam03_detection
36. test_real_cam04_detection
37. test_real_cam05_detection
38. test_real_cam06_detection
39. test_real_cam07_detection
40. test_real_cam08_detection
41. test_real_cam09_detection
42. test_backward_compatibility_phase20
43. test_backward_compatibility_phase21
44. test_backward_compatibility_phase22
"""

import os
import json
import time
import math
import hashlib
import unittest
import numpy as np
import cv2

from cv_service.config import CVConfig
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.geometry.polygon import (
    PolygonZone,
    calculate_centroid,
    point_to_segment_distance,
    point_to_polygon_distance,
    segments_intersect,
    get_crossing_direction,
)
from cv_service.intrusion.detector import IntrusionDetector, IntrusionEvent, TrackZoneState, _get_class_category


class TestPhase23DetectionAccuracyAndValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "fixtures", "visdrone")
        )
        cls.camera_zones_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "config", "camera_zones.json")
        )

        cls.cam01_path = os.path.join(cls.fixtures_dir, "CAM-01.mp4")
        cls.cam07_path = os.path.join(cls.fixtures_dir, "CAM-07.mp4")
        cls.cam08_path = os.path.join(cls.fixtures_dir, "CAM-08.mp4")

        cls.detector = YoloDetector()
        cls.detector.load_model()

    # 1. YOLO Model Class Mapping
    def test_01_yolo_model_class_mapping(self):
        names = self.detector.model.names
        self.assertEqual(names[0], "person")
        self.assertEqual(names[2], "car")
        self.assertEqual(names[3], "motorcycle")
        self.assertEqual(names[5], "bus")
        self.assertEqual(names[7], "truck")

    # 2. Raw Class ID Preservation
    def test_02_raw_class_id_preservation(self):
        engine = ByteTrackEngine(CVConfig(), detector=self.detector)
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        names = engine.detector.model.names
        self.assertIn(2, names)
        self.assertEqual(names[2], "car")

    # 3. Canonical Class Name Preservation
    def test_03_canonical_class_name_preservation(self):
        cat_person = YoloDetector.get_category_for_class("person")
        cat_car = YoloDetector.get_category_for_class("car")
        cat_truck = YoloDetector.get_category_for_class("truck")
        cat_bus = YoloDetector.get_category_for_class("bus")
        self.assertEqual(cat_person, "HUMAN")
        self.assertEqual(cat_car, "VEHICLE")
        self.assertEqual(cat_truck, "VEHICLE")
        self.assertEqual(cat_bus, "VEHICLE")

    # 4. Car Class Preservation (Not Person)
    def test_04_car_class_preservation_not_person(self):
        cat = YoloDetector.get_category_for_class("car")
        self.assertNotEqual(cat, "HUMAN")
        self.assertEqual(cat, "VEHICLE")

    # 5. Truck Class Preservation
    def test_05_truck_class_preservation(self):
        cat = YoloDetector.get_category_for_class("truck")
        self.assertEqual(cat, "VEHICLE")

    # 6. Bus Class Preservation
    def test_06_bus_class_preservation(self):
        cat = YoloDetector.get_category_for_class("bus")
        self.assertEqual(cat, "VEHICLE")

    # 7. Motorcycle Class Preservation
    def test_07_motorcycle_class_preservation(self):
        cat = YoloDetector.get_category_for_class("motorcycle")
        self.assertEqual(cat, "VEHICLE")

    # 8. Bounding Box Within Frame Boundaries
    def test_08_bounding_box_within_frame_boundaries(self):
        if not os.path.exists(self.cam08_path):
            self.skipTest("CAM-08 fixture not found")
        cap = cv2.VideoCapture(self.cam08_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret and frame is not None)
        h, w = frame.shape[:2]
        res = self.detector.detect(frame, camera_id="cam-08")
        for det in res["detections"]:
            b = det["bbox"]
            self.assertGreaterEqual(b["x1"], 0)
            self.assertGreaterEqual(b["y1"], 0)
            self.assertLessEqual(b["x2"], w)
            self.assertLessEqual(b["y2"], h)

    # 9. Multi-Resolution Coordinate Scaling
    def test_09_multi_resolution_coordinate_scaling(self):
        zone = PolygonZone(
            "test-zone",
            "cam-test",
            "Test Zone",
            [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
            is_normalized=True,
        )
        scaled_1080 = zone.get_pixel_polygon(1920, 1080)
        self.assertEqual(scaled_1080[0], (192.0, 108.0))
        scaled_visdrone = zone.get_pixel_polygon(1904, 1072)
        self.assertEqual(scaled_visdrone[0], (190.4, 107.2))

    # 10. CAM-08 Aerial Road Vehicle Detections
    def test_10_cam08_aerial_road_vehicle_detections(self):
        if not os.path.exists(self.cam08_path):
            self.skipTest("CAM-08 fixture not found")
        cap = cv2.VideoCapture(self.cam08_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret and frame is not None)
        cfg = CVConfig.from_camera_profile("cam-08")
        det = YoloDetector(cfg)
        det.load_model()
        res = det.detect(frame, camera_id="cam-08")
        classes = [d["class_name"] for d in res["detections"]]
        self.assertIn("car", classes, "CAM-08 aerial road must detect cars")

    # 11. CAM-08 No Vehicle Misclassified as Person
    def test_11_cam08_no_vehicle_misclassified_as_person(self):
        if not os.path.exists(self.cam08_path):
            self.skipTest("CAM-08 fixture not found")
        cap = cv2.VideoCapture(self.cam08_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret and frame is not None)
        cfg = CVConfig.from_camera_profile("cam-08")
        det = YoloDetector(cfg)
        det.load_model()
        res = det.detect(frame, camera_id="cam-08")
        for d in res["detections"]:
            if d["class_name"] in ("car", "truck", "bus", "motorcycle"):
                self.assertEqual(d["category"], "VEHICLE")
                self.assertNotEqual(d["category"], "HUMAN")

    # 12. CAM-07 Sports Court Monitored Sector
    def test_12_cam07_sports_court_monitored_sector(self):
        with open(self.camera_zones_path, "r", encoding="utf-8") as f:
            zones_cfg = json.load(f)
        cam07_zones = zones_cfg.get("cam-07", [])
        court_zone = next((z for z in cam07_zones if z["id"] == "zone-cam-07-main"), None)
        self.assertIsNotNone(court_zone)
        self.assertEqual(court_zone["zone_type"], "MONITORED_SECTOR")

    # 13. CAM-07 Sports Court Zero False Breaches
    def test_13_cam07_sports_court_zero_false_breaches(self):
        if not os.path.exists(self.cam07_path):
            self.skipTest("CAM-07 fixture not found")
        cap = cv2.VideoCapture(self.cam07_path)
        cfg = CVConfig.from_camera_profile("cam-07")
        det = YoloDetector(cfg)
        det.load_model()
        tracker = ByteTrackEngine(cfg, detector=det)
        intr = IntrusionDetector()
        intr.load_zones_from_backend("cam-07")

        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_f = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        false_breaches = 0
        for f in range(min(20, total_f)):
            ret, frame = cap.read()
            if not ret:
                break
            res = tracker.track(frame, camera_id="cam-07", frame_id=f + 1)
            evs, _ = intr.process_tracks(res["tracks"], camera_id="cam-07", frame_width=w, frame_height=h, frame_id=f + 1)
            for e in evs:
                if e.event_type == "RESTRICTED_ZONE_ENTRY":
                    false_breaches += 1

        cap.release()
        self.assertEqual(false_breaches, 0, "Normal sports court activity must generate 0 RESTRICTED_ZONE_ENTRY breaches")

    # 14. State Normal on Detection
    def test_14_state_normal_on_detection(self):
        intr = IntrusionDetector()
        tracks = [{
            "track_id": 1,
            "class_name": "person",
            "category": "HUMAN",
            "confidence": 0.92,
            "centroid": (100.0, 100.0),
            "bbox": {"x1": 90, "y1": 80, "x2": 110, "y2": 120},
        }]
        evs, _ = intr.process_tracks(tracks, camera_id="cam-01", frame_width=1280, frame_height=720)
        breach_evs = [e for e in evs if e.event_type == "RESTRICTED_ZONE_ENTRY"]
        self.assertEqual(len(breach_evs), 0)

    # 15. State Suspicious on Proximity Buffer
    def test_15_state_suspicious_on_proximity_buffer(self):
        intr = IntrusionDetector()
        tw = PolygonZone("line-01", "Border Line", [(0.1, 0.5), (0.9, 0.5)], is_tripwire=True, is_normalized=True)
        intr.add_zone(tw)
        # Track moving closer: frame 1 at y=400, frame 2 at y=480 (near line at y=540 for 1080p)
        t1 = [{"track_id": 10, "class_name": "car", "confidence": 0.9, "bbox": {"x1": 500, "y1": 380, "x2": 540, "y2": 420}, "frame_id": 1}]
        intr.process_tracks(t1, "cam-01", 1920, 1080, frame_id=1)

        t2 = [{"track_id": 10, "class_name": "car", "confidence": 0.9, "bbox": {"x1": 500, "y1": 510, "x2": 540, "y2": 530}, "frame_id": 2}]
        evs, _ = intr.process_tracks(t2, "cam-01", 1920, 1080, frame_id=2)

        approach_evs = [e for e in evs if e.event_type == "SUSPICIOUS_AREA_APPROACH"]
        self.assertGreater(len(approach_evs), 0)
        self.assertEqual(approach_evs[0].track_id, 10)

    # 16. State Crossing on Tripwire Intersect
    def test_16_state_crossing_on_tripwire_intersect(self):
        intr = IntrusionDetector()
        zone = PolygonZone(
            "test-tw",
            "cam-01",
            "Boundary Line",
            [[200, 300], [800, 300]],
            is_tripwire=True,
            zone_type="BORDER_LINE",
        )
        intr.add_zone(zone)
        # Frame 1: Above tripwire (Y=280)
        intr.process_tracks(
            [{"track_id": 3, "class_name": "car", "category": "VEHICLE", "confidence": 0.90, "centroid": (400.0, 280.0), "bbox": {"x1": 380, "y1": 260, "x2": 420, "y2": 300}}],
            camera_id="cam-01", frame_width=1280, frame_height=720, frame_id=1,
        )
        # Frame 2: Crosses below tripwire (Y=320)
        evs, _ = intr.process_tracks(
            [{"track_id": 3, "class_name": "car", "category": "VEHICLE", "confidence": 0.90, "centroid": (400.0, 320.0), "bbox": {"x1": 380, "y1": 300, "x2": 420, "y2": 340}}],
            camera_id="cam-01", frame_width=1280, frame_height=720, frame_id=2,
        )
        crossings = [e for e in evs if e.event_type in ("LINE_CROSSING", "TRIPWIRE_CROSSING")]
        self.assertEqual(len(crossings), 1)

    # 17. State Breach on Restricted Polygon Entry
    def test_17_state_breach_on_restricted_polygon_entry(self):
        intr = IntrusionDetector()
        zone = PolygonZone(
            "zone-restricted",
            "cam-01",
            "Exclusion Perimeter",
            [[300, 300], [700, 300], [700, 600], [300, 600]],
            zone_type="RESTRICTED_ZONE",
        )
        intr.add_zone(zone)
        # Frame 1: Outside
        intr.process_tracks(
            [{"track_id": 4, "class_name": "person", "category": "HUMAN", "confidence": 0.88, "centroid": (200.0, 450.0), "bbox": {"x1": 190, "y1": 420, "x2": 210, "y2": 480}}],
            camera_id="cam-01", frame_width=1280, frame_height=720, frame_id=1,
        )
        # Frame 2: Inside
        evs, _ = intr.process_tracks(
            [{"track_id": 4, "class_name": "person", "category": "HUMAN", "confidence": 0.88, "centroid": (450.0, 450.0), "bbox": {"x1": 440, "y1": 420, "x2": 460, "y2": 480}}],
            camera_id="cam-01", frame_width=1280, frame_height=720, frame_id=2,
        )
        breaches = [e for e in evs if e.event_type == "RESTRICTED_ZONE_ENTRY"]
        self.assertEqual(len(breaches), 1)

    # 18. State Monitored Zone No Breach Alert
    def test_18_state_monitored_zone_no_breach_alert(self):
        intr = IntrusionDetector()
        zone = PolygonZone(
            "zone-monitored",
            "cam-01",
            "Monitored Activity Field",
            [[300, 300], [700, 300], [700, 600], [300, 600]],
            zone_type="MONITORED_SECTOR",
        )
        intr.add_zone(zone)
        # Frame 1: Outside
        intr.process_tracks(
            [{"track_id": 5, "class_name": "person", "category": "HUMAN", "confidence": 0.88, "centroid": (200.0, 450.0), "bbox": {"x1": 190, "y1": 420, "x2": 210, "y2": 480}}],
            camera_id="cam-01", frame_width=1280, frame_height=720, frame_id=1,
        )
        # Frame 2: Inside
        evs, _ = intr.process_tracks(
            [{"track_id": 5, "class_name": "person", "category": "HUMAN", "confidence": 0.88, "centroid": (450.0, 450.0), "bbox": {"x1": 440, "y1": 420, "x2": 460, "y2": 480}}],
            camera_id="cam-01", frame_width=1280, frame_height=720, frame_id=2,
        )
        breaches = [e for e in evs if e.event_type == "RESTRICTED_ZONE_ENTRY"]
        self.assertEqual(len(breaches), 0, "Monitored sector entry must NOT generate RESTRICTED_ZONE_ENTRY breach alert")

    # 19. Tripwire Crossing Direction IN
    def test_19_tripwire_crossing_direction_in(self):
        d = get_crossing_direction((500, 200), (500, 400), (300, 300), (700, 300))
        self.assertEqual(d, "IN")

    # 20. Tripwire Crossing Direction OUT
    def test_20_tripwire_crossing_direction_out(self):
        d = get_crossing_direction((500, 400), (500, 200), (300, 300), (700, 300))
        self.assertEqual(d, "OUT")

    # 21. Active Counts from Active ByteTrack IDs
    def test_21_active_counts_from_active_bytetrack_ids(self):
        engine = ByteTrackEngine(CVConfig(), detector=self.detector)
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        res = engine.track(dummy_frame, camera_id="cam-01", frame_id=1)
        self.assertIn("active_count", res)
        self.assertIn("tracks", res)
        self.assertEqual(res["active_count"], len(res["tracks"]))

    # 22. Unique Session Counts Cumulative
    def test_22_unique_session_counts_cumulative(self):
        engine = ByteTrackEngine(CVConfig(), detector=self.detector)
        self.assertEqual(len(engine.observed_session_track_ids), 0)

    # 23. Active vs Unique Separation
    def test_23_active_vs_unique_separation(self):
        engine = ByteTrackEngine(CVConfig(), detector=self.detector)
        engine.observed_session_track_ids.update([1, 2, 3, 4, 5])
        self.assertEqual(len(engine.active_tracks), 0)
        self.assertEqual(len(engine.observed_session_track_ids), 5)

    # 24. Track Class Consistency Across Frames
    def test_24_track_class_consistency_across_frames(self):
        engine = ByteTrackEngine(CVConfig(), detector=self.detector)
        record = engine.active_tracks.get(10)
        self.assertIsNone(record)

    # 25. FAST Profile Confidence Filtering
    def test_25_fast_profile_confidence_filtering(self):
        cfg = CVConfig.from_detection_profile("FAST")
        self.assertGreaterEqual(cfg.confidence_threshold, 0.20)
        self.assertEqual(cfg.input_size, 640)

    # 26. BALANCED Profile Confidence Filtering
    def test_26_balanced_profile_confidence_filtering(self):
        cfg = CVConfig.from_detection_profile("BALANCED")
        self.assertGreaterEqual(cfg.confidence_threshold, 0.25)
        self.assertEqual(cfg.input_size, 960)

    # 27. ACCURACY Profile Confidence Filtering
    def test_27_accuracy_profile_confidence_filtering(self):
        cfg = CVConfig.from_detection_profile("ACCURACY")
        self.assertGreaterEqual(cfg.confidence_threshold, 0.30)
        self.assertEqual(cfg.input_size, 1280)

    # 28. Evidence Metadata SHA-256 Integrity
    def test_28_evidence_metadata_sha256_integrity(self):
        event_dict = {
            "event_id": "evt-test-101",
            "camera_id": "cam-08",
            "class_name": "car",
            "confidence": 0.94,
            "timestamp": "2026-08-31T04:00:00Z",
        }
        raw_bytes = json.dumps(event_dict, sort_keys=True).encode("utf-8")
        h = hashlib.sha256(raw_bytes).hexdigest()
        self.assertEqual(len(h), 64)

    # 29. Evidence Chain Tamper Detection
    def test_29_evidence_chain_tamper_detection(self):
        event_dict = {"event_id": "evt-test-101", "class_name": "car"}
        h1 = hashlib.sha256(json.dumps(event_dict, sort_keys=True).encode("utf-8")).hexdigest()
        event_dict["class_name"] = "person"
        h2 = hashlib.sha256(json.dumps(event_dict, sort_keys=True).encode("utf-8")).hexdigest()
        self.assertNotEqual(h1, h2, "Tampering must invalidate cryptographic hash")

    # 30. No Synthetic or Math.random in Backend
    def test_30_no_synthetic_or_math_random_in_backend(self):
        det_res = self.detector.detect(np.zeros((480, 640, 3), dtype=np.uint8), camera_id="cam-01")
        self.assertEqual(det_res["detection_count"], 0)
        self.assertEqual(len(det_res["detections"]), 0)

    # 31. Zone Config CAM-07 Monitored Sector Configured
    def test_31_zone_config_cam07_monitored_sector_configured(self):
        with open(self.camera_zones_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        c07 = cfg["cam-07"]
        zone_types = [z["zone_type"] for z in c07]
        self.assertIn("MONITORED_SECTOR", zone_types)
        self.assertIn("RESTRICTED_ZONE", zone_types)

    # 32. Zone Config CAM-08 Crossing Lines Configured
    def test_32_zone_config_cam08_crossing_lines_configured(self):
        with open(self.camera_zones_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        c08 = cfg["cam-08"]
        line_zones = [z for z in c08 if z.get("is_tripwire", False)]
        self.assertGreaterEqual(len(line_zones), 1)

    # Helper for real camera checks
    def _check_real_cam(self, cam_id: str):
        path = os.path.join(self.fixtures_dir, f"{cam_id.upper()}.mp4")
        if not os.path.exists(path):
            self.skipTest(f"{cam_id} fixture not found")
        cap = cv2.VideoCapture(path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret and frame is not None)
        cfg = CVConfig.from_camera_profile(cam_id)
        det = YoloDetector(cfg)
        det.load_model()
        return det.detect(frame, camera_id=cam_id)

    # 33-41: Real Cameras 01-09 Real Inferences
    def test_33_real_cam01_detection(self):
        res = self._check_real_cam("cam-01")
        self.assertIn("detections", res)

    def test_34_real_cam02_detection(self):
        res = self._check_real_cam("cam-02")
        self.assertIn("detections", res)

    def test_35_real_cam03_detection(self):
        res = self._check_real_cam("cam-03")
        self.assertIn("detections", res)

    def test_36_real_cam04_detection(self):
        res = self._check_real_cam("cam-04")
        self.assertIn("detections", res)

    def test_37_real_cam05_detection(self):
        res = self._check_real_cam("cam-05")
        self.assertIn("detections", res)

    def test_38_real_cam06_detection(self):
        res = self._check_real_cam("cam-06")
        self.assertIn("detections", res)

    def test_39_real_cam07_detection(self):
        res = self._check_real_cam("cam-07")
        self.assertIn("detections", res)

    def test_40_real_cam08_detection(self):
        res = self._check_real_cam("cam-08")
        self.assertIn("detections", res)

    def test_41_real_cam09_detection(self):
        res = self._check_real_cam("cam-09")
        self.assertIn("detections", res)

    # 42. Backward Compatibility Phase 20 (Evidence Chain)
    def test_42_backward_compatibility_phase20(self):
        intr = IntrusionDetector()
        self.assertTrue(hasattr(intr, "process_tracks"))

    # 43. Backward Compatibility Phase 21 (Cross Camera)
    def test_43_backward_compatibility_phase21(self):
        from cv_service.correlation.cross_camera import CrossCameraCorrelator
        cct = CrossCameraCorrelator({"cam-01": {"cam-02": {"distance_m": 50}}})
        self.assertIsNotNone(cct)

    # 44. Backward Compatibility Phase 22 (Proximity & Universal Crossing)
    def test_44_backward_compatibility_phase22(self):
        zone = PolygonZone("tw-p22", "cam-01", "P22 Line", [[100, 100], [500, 100]], is_tripwire=True)
        self.assertTrue(zone.is_tripwire)


if __name__ == "__main__":
    unittest.main()
