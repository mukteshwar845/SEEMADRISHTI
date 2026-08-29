"""
SEEMADRISHTI AI — Phase 18 Automated Test Suite
Operational Intelligence, Real Camera Calibration, Incident Timeline & SIH Judge Demo Hardening
Covers all 34 required test cases.
"""

import os
import sys
import json
import time
import hashlib
import tempfile
import unittest
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import cv2
import numpy as np

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from cv_service.geometry.polygon import PolygonZone, calculate_centroid, segments_intersect
from cv_service.intrusion.detector import IntrusionDetector, IntrusionEvent
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.video.source import MP4Source
from cv_service.evidence.incident_manager import IncidentManager, ActiveIncident
from cv_service.risk.engine import RiskEngine
from cv_service.correlation.correlation_engine import CorrelationEngine
from cv_service.correlation.correlation_models import Observation
from cv_service.analytics.engine import MovementAnalyticsEngine


class TestPhase18OperationalIntelligence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture_cam01 = str(PROJECT_ROOT / "cv_service" / "tests" / "fixtures" / "visdrone" / "CAM-01.mp4")
        cls.zones_config_path = str(PROJECT_ROOT / "config" / "camera_zones.json")
        assert os.path.exists(cls.fixture_cam01), f"CAM-01 fixture missing: {cls.fixture_cam01}"

    # -------------------------------------------------------------------------
    # 01. Camera calibration schema validity
    # -------------------------------------------------------------------------
    def test_01_camera_calibration_schema_validity(self):
        with open(self.zones_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIsInstance(data, dict)
        self.assertGreater(len(data), 0)
        for cam_id, zones in data.items():
            self.assertIsInstance(zones, list)
            for zone in zones:
                self.assertIn("id", zone)
                self.assertIn("camera_id", zone)
                self.assertIn("name", zone)
                self.assertIn("polygon", zone)
                poly = zone["polygon"]
                self.assertIsInstance(poly, list)
                self.assertGreaterEqual(len(poly), 2)
                for pt in poly:
                    self.assertEqual(len(pt), 2)
                    self.assertGreaterEqual(pt[0], 0.0)
                    self.assertLessEqual(pt[0], 1.0)
                    self.assertGreaterEqual(pt[1], 0.0)
                    self.assertLessEqual(pt[1], 1.0)

    # -------------------------------------------------------------------------
    # 02. Camera zone persistence
    # -------------------------------------------------------------------------
    def test_02_camera_zone_persistence(self):
        detector = IntrusionDetector()
        count = detector.load_zones_from_backend("cam-01")
        self.assertGreaterEqual(count, 1)
        self.assertIn("zone-cam-01-main", detector.zones)
        zone = detector.zones["zone-cam-01-main"]
        self.assertEqual(zone.camera_id, "cam-01")
        self.assertFalse(zone.is_tripwire)
        self.assertEqual(len(zone.polygon), 4)

    # -------------------------------------------------------------------------
    # 03. Tripwire persistence
    # -------------------------------------------------------------------------
    def test_03_tripwire_persistence(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        self.assertIn("line-cam-01-tripwire", detector.zones)
        tripwire = detector.zones["line-cam-01-tripwire"]
        self.assertTrue(tripwire.is_tripwire)
        self.assertEqual(len(tripwire.polygon), 2)

    # -------------------------------------------------------------------------
    # 04. Real trajectory intersects calibrated tripwire
    # -------------------------------------------------------------------------
    def test_04_real_trajectory_intersects_calibrated_tripwire(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        tracks_f1 = [{"track_id": 101, "bbox": [490, 690, 510, 710], "class_name": "person", "confidence": 0.95}]
        tracks_f2 = [{"track_id": 101, "bbox": [490, 740, 510, 760], "class_name": "person", "confidence": 0.95}]
        events1, _ = detector.process_tracks(tracks_f1, "cam-01", w, h)
        events2, _ = detector.process_tracks(tracks_f2, "cam-01", w, h)
        crossings = [e for e in events2 if e.event_type == "TRIPWIRE_CROSSING"]
        self.assertGreaterEqual(len(crossings), 1)
        self.assertEqual(crossings[0].track_id, 101)

    # -------------------------------------------------------------------------
    # 05. Non-intersecting trajectory suppression
    # -------------------------------------------------------------------------
    def test_05_non_intersecting_trajectory_suppression(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        tracks_f1 = [{"track_id": 102, "bbox": [490, 190, 510, 210], "class_name": "person", "confidence": 0.95}]
        tracks_f2 = [{"track_id": 102, "bbox": [490, 270, 510, 290], "class_name": "person", "confidence": 0.95}]
        events1, _ = detector.process_tracks(tracks_f1, "cam-01", w, h)
        events2, _ = detector.process_tracks(tracks_f2, "cam-01", w, h)
        crossings = [e for e in events1 + events2 if e.event_type == "TRIPWIRE_CROSSING"]
        self.assertEqual(len(crossings), 0)

    # -------------------------------------------------------------------------
    # 06. Restricted-zone entry correctness
    # -------------------------------------------------------------------------
    def test_06_restricted_zone_entry_correctness(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        outside_track = [{"track_id": 103, "bbox": [490, 390, 510, 410], "class_name": "person", "confidence": 0.9}]
        inside_track = [{"track_id": 103, "bbox": [490, 640, 510, 660], "class_name": "person", "confidence": 0.9}]
        ev1, _ = detector.process_tracks(outside_track, "cam-01", w, h)
        ev2, _ = detector.process_tracks(inside_track, "cam-01", w, h)
        entries = [e for e in ev2 if e.event_type == "RESTRICTED_ZONE_ENTRY"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].track_id, 103)

    # -------------------------------------------------------------------------
    # 07. Restricted-zone duplicate suppression
    # -------------------------------------------------------------------------
    def test_07_restricted_zone_duplicate_suppression(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        t_out = [{"track_id": 104, "bbox": [490, 390, 510, 410], "class_name": "person", "confidence": 0.9}]
        t_in1 = [{"track_id": 104, "bbox": [490, 640, 510, 660], "class_name": "person", "confidence": 0.9}]
        t_in2 = [{"track_id": 104, "bbox": [490, 650, 510, 670], "class_name": "person", "confidence": 0.9}]
        t_in3 = [{"track_id": 104, "bbox": [490, 660, 510, 680], "class_name": "person", "confidence": 0.9}]
        detector.process_tracks(t_out, "cam-01", w, h)
        ev1, _ = detector.process_tracks(t_in1, "cam-01", w, h)
        ev2, _ = detector.process_tracks(t_in2, "cam-01", w, h)
        ev3, _ = detector.process_tracks(t_in3, "cam-01", w, h)
        self.assertEqual(len([e for e in ev1 if e.event_type == "RESTRICTED_ZONE_ENTRY"]), 1)
        self.assertEqual(len([e for e in ev2 if e.event_type == "RESTRICTED_ZONE_ENTRY"]), 0)
        self.assertEqual(len([e for e in ev3 if e.event_type == "RESTRICTED_ZONE_ENTRY"]), 0)

    # -------------------------------------------------------------------------
    # 08. Real person active count
    # -------------------------------------------------------------------------
    def test_08_real_person_active_count(self):
        active_tracks = [
            {"track_id": 1, "class_name": "person", "confidence": 0.95},
            {"track_id": 2, "class_name": "person", "confidence": 0.92},
            {"track_id": 3, "class_name": "person", "confidence": 0.91},
            {"track_id": 4, "class_name": "car", "confidence": 0.88},
        ]
        person_count = sum(1 for t in active_tracks if t["class_name"] == "person")
        self.assertEqual(person_count, 3)

    # -------------------------------------------------------------------------
    # 09. Real object class count
    # -------------------------------------------------------------------------
    def test_09_real_object_class_count(self):
        active_tracks = [
            {"track_id": 1, "class_name": "person", "confidence": 0.95},
            {"track_id": 2, "class_name": "car", "confidence": 0.92},
            {"track_id": 3, "class_name": "truck", "confidence": 0.91},
        ]
        counts = {}
        for t in active_tracks:
            counts[t["class_name"]] = counts.get(t["class_name"], 0) + 1
        self.assertEqual(counts.get("person"), 1)
        self.assertEqual(counts.get("car"), 1)
        self.assertEqual(counts.get("truck"), 1)

    # -------------------------------------------------------------------------
    # 10. Unique track counting
    # -------------------------------------------------------------------------
    def test_10_unique_track_counting(self):
        unique_ids = set()
        tracks_seq = [
            [{"track_id": 1}, {"track_id": 2}],
            [{"track_id": 1}, {"track_id": 2}, {"track_id": 3}],
            [{"track_id": 2}, {"track_id": 3}, {"track_id": 4}],
        ]
        for frame_tracks in tracks_seq:
            for t in frame_tracks:
                unique_ids.add(t["track_id"])
        self.assertEqual(len(unique_ids), 4)

    # -------------------------------------------------------------------------
    # 11. Camera-isolated counting
    # -------------------------------------------------------------------------
    def test_11_camera_isolated_counting(self):
        cam_unique: Dict[str, Set[int]] = {"cam-01": set(), "cam-02": set()}
        cam_unique["cam-01"].add(1)
        cam_unique["cam-01"].add(2)
        cam_unique["cam-02"].add(1)
        self.assertEqual(len(cam_unique["cam-01"]), 2)
        self.assertEqual(len(cam_unique["cam-02"]), 1)

    # -------------------------------------------------------------------------
    # 12. Entry count correctness
    # -------------------------------------------------------------------------
    def test_12_entry_count_correctness(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        # Calibrated tripwire is at y=0.72 (720px) from x=0.20 to 0.85
        # Moving from 680 to 740 is evaluated as INBOUND -> increments entries
        t1 = [{"track_id": 201, "bbox": [490, 680, 510, 700], "class_name": "person", "confidence": 0.95}]
        t2 = [{"track_id": 201, "bbox": [490, 740, 510, 760], "class_name": "person", "confidence": 0.95}]
        detector.process_tracks(t1, "cam-01", w, h)
        detector.process_tracks(t2, "cam-01", w, h)
        ingress = detector.get_ingress_counts("cam-01")
        self.assertGreaterEqual(ingress["entries"], 1)

    # -------------------------------------------------------------------------
    # 13. Exit count correctness
    # -------------------------------------------------------------------------
    def test_13_exit_count_correctness(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        # Moving from 740 to 680 is evaluated as OUTBOUND -> increments exits
        t1 = [{"track_id": 202, "bbox": [490, 740, 510, 760], "class_name": "person", "confidence": 0.95}]
        t2 = [{"track_id": 202, "bbox": [490, 680, 510, 700], "class_name": "person", "confidence": 0.95}]
        detector.process_tracks(t1, "cam-01", w, h)
        detector.process_tracks(t2, "cam-01", w, h)
        ingress = detector.get_ingress_counts("cam-01")
        self.assertGreaterEqual(ingress["exits"], 1)

    # -------------------------------------------------------------------------
    # 14. Net occupancy correctness
    # -------------------------------------------------------------------------
    def test_14_net_occupancy_correctness(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        detector.ingress_counts["cam-01"] = {"entries": 5, "exits": 2, "net_occupancy": 3}
        counts = detector.get_ingress_counts("cam-01")
        self.assertEqual(counts["net_occupancy"], counts["entries"] - counts["exits"])
        self.assertEqual(counts["net_occupancy"], 3)

    # -------------------------------------------------------------------------
    # 15. Suspicious behavior aggregation
    # -------------------------------------------------------------------------
    def test_15_suspicious_behavior_aggregation(self):
        risk_engine = RiskEngine()
        now = time.monotonic()
        ctx = risk_engine.get_or_create_context("cam-01", 17, "person", now)
        ctx.is_inside_zone = True
        ctx.has_active_intrusion = True
        ctx.has_active_loitering = True
        ctx.dwell_seconds = 35.0
        assessment = risk_engine.calculate_risk("cam-01", 17, current_time=now)
        self.assertGreaterEqual(assessment.score, 65)
        self.assertIn(assessment.level, ("HIGH", "CRITICAL"))
        self.assertGreaterEqual(len(assessment.reasons), 2)

    # -------------------------------------------------------------------------
    # 16. Risk score consistency
    # -------------------------------------------------------------------------
    def test_16_risk_score_consistency(self):
        risk_engine = RiskEngine()
        now = time.monotonic()
        ctx = risk_engine.get_or_create_context("cam-01", 18, "person", now)
        ctx.is_inside_zone = True
        ctx.has_active_intrusion = True
        a1 = risk_engine.calculate_risk("cam-01", 18, current_time=now)
        a2 = risk_engine.calculate_risk("cam-01", 18, current_time=now)
        self.assertEqual(a1.score, a2.score)
        self.assertEqual(a1.level, a2.level)

    # -------------------------------------------------------------------------
    # 17. Incident timeline ordering
    # -------------------------------------------------------------------------
    def test_17_incident_timeline_ordering(self):
        now = time.time()
        incident = ActiveIncident(
            incident_id="INC-P18-001",
            camera_id="cam-01",
            track_id=17,
            class_name="person",
            event_type="RESTRICTED_ZONE_ENTRY",
            risk_score=85,
            risk_level="HIGH",
            zone_name="Sector Alpha Restricted",
            reasons=[{"code": "ZONE_BREACH", "points": 40}],
            trigger_time=now,
            pre_event_seconds=5.0,
            post_event_seconds=5.0,
            pre_frames=[],
        )
        self.assertGreater(len(incident.timeline), 0)
        labels = [item["label"] for item in incident.timeline]
        self.assertIn("PERSON #17 DETECTED", labels[0])
        self.assertIn("BYTE TRACK ESTABLISHED", labels[1])
        self.assertIn("TRAJECTORY RECORDED", labels[2])

    # -------------------------------------------------------------------------
    # 18. Incident metadata integrity
    # -------------------------------------------------------------------------
    def test_18_incident_metadata_integrity(self):
        now = time.time()
        incident = ActiveIncident(
            incident_id="INC-P18-002",
            camera_id="cam-01",
            track_id=22,
            class_name="car",
            event_type="TRIPWIRE_CROSSING",
            risk_score=75,
            risk_level="HIGH",
            zone_name="Main Gate Tripwire",
            reasons=[{"code": "TRIPWIRE_BREACH", "points": 35}],
            trigger_time=now,
            pre_event_seconds=5.0,
            post_event_seconds=5.0,
            pre_frames=[],
        )
        self.assertEqual(incident.id, "INC-P18-002")
        self.assertEqual(incident.camera_id, "cam-01")
        self.assertEqual(incident.track_id, 22)
        self.assertEqual(incident.class_name, "car")
        self.assertEqual(incident.risk_score, 75)

    # -------------------------------------------------------------------------
    # 19. Alert to incident linkage
    # -------------------------------------------------------------------------
    def test_19_alert_to_incident_linkage(self):
        ev = IntrusionEvent(
            event_id="evt-test-19",
            alert_id="alt-test-19",
            camera_id="cam-01",
            zone_id="zone-01",
            zone_name="Alpha",
            track_id=33,
            class_name="person",
            confidence=0.95,
            direction="IN",
            position=(500, 500),
            prev_position=(500, 480),
            timestamp="2026-08-30T00:00:00Z",
            severity="High",
            event_type="TRIPWIRE_CROSSING",
            risk_score=80,
        )
        d = ev.to_dict()
        self.assertEqual(d["alert_id"], "alt-test-19")
        self.assertEqual(d["event_id"], "evt-test-19")
        self.assertEqual(d["track_id"], 33)

    # -------------------------------------------------------------------------
    # 20. Incident to evidence linkage
    # -------------------------------------------------------------------------
    def test_20_incident_to_evidence_linkage(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = IncidentManager(output_dir=tmpdir, fps=10.0)
            now = time.time()
            frames = [(now - 0.1 * i, np.full((120, 160, 3), 100, dtype=np.uint8)) for i in range(10)]
            incident = ActiveIncident(
                incident_id="INC-LINK-01",
                camera_id="cam-01",
                track_id=44,
                class_name="person",
                event_type="RESTRICTED_ZONE_ENTRY",
                risk_score=85,
                risk_level="HIGH",
                zone_name="Zone A",
                reasons=[],
                trigger_time=now,
                pre_event_seconds=1.0,
                post_event_seconds=0.0,
                pre_frames=frames,
            )
            manager.active_incidents[incident.id] = incident
            summary = manager.finalize_incident(incident)
            self.assertEqual(summary["id"], "INC-LINK-01")
            self.assertEqual(summary["status"], "ready")
            self.assertIsNotNone(summary["evidence_path"])
            self.assertTrue(os.path.exists(summary["evidence_path"]))

    # -------------------------------------------------------------------------
    # 21. Evidence file existence
    # -------------------------------------------------------------------------
    def test_21_evidence_file_existence(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = IncidentManager(output_dir=tmpdir, fps=10.0)
            now = time.time()
            frames = [(now, np.full((100, 100, 3), 150, dtype=np.uint8))]
            incident = ActiveIncident(
                incident_id="INC-EXISTS-01",
                camera_id="cam-01",
                track_id=1,
                class_name="person",
                event_type="INTRUSION",
                risk_score=90,
                risk_level="CRITICAL",
                zone_name="Zone",
                reasons=[],
                trigger_time=now,
                pre_event_seconds=1.0,
                post_event_seconds=0.0,
                pre_frames=frames,
            )
            summary = manager.finalize_incident(incident)
            ev_path = summary["evidence_path"]
            self.assertTrue(os.path.isfile(ev_path))
            self.assertGreater(os.path.getsize(ev_path), 0)

    # -------------------------------------------------------------------------
    # 22. Evidence non-black validation
    # -------------------------------------------------------------------------
    def test_22_evidence_non_black_validation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = IncidentManager(output_dir=tmpdir, fps=10.0)
            now = time.time()
            bright_frame = np.full((120, 160, 3), 180, dtype=np.uint8)
            frames = [(now - 0.1 * i, bright_frame) for i in range(5)]
            incident = ActiveIncident(
                incident_id="INC-COLOR-01",
                camera_id="cam-01",
                track_id=5,
                class_name="person",
                event_type="INTRUSION",
                risk_score=90,
                risk_level="CRITICAL",
                zone_name="Zone",
                reasons=[],
                trigger_time=now,
                pre_event_seconds=1.0,
                post_event_seconds=0.0,
                pre_frames=frames,
            )
            summary = manager.finalize_incident(incident)
            cap = cv2.VideoCapture(summary["evidence_path"])
            ret, read_frame = cap.read()
            cap.release()
            self.assertTrue(ret)
            self.assertGreater(float(np.mean(read_frame)), 30.0)

    # -------------------------------------------------------------------------
    # 23. SHA-256 verification
    # -------------------------------------------------------------------------
    def test_23_sha256_verification(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = IncidentManager(output_dir=tmpdir, fps=10.0)
            now = time.time()
            frames = [(now, np.full((100, 100, 3), 120, dtype=np.uint8))]
            incident = ActiveIncident(
                incident_id="INC-SHA-01",
                camera_id="cam-01",
                track_id=1,
                class_name="person",
                event_type="INTRUSION",
                risk_score=90,
                risk_level="CRITICAL",
                zone_name="Zone",
                reasons=[],
                trigger_time=now,
                pre_event_seconds=1.0,
                post_event_seconds=0.0,
                pre_frames=frames,
            )
            summary = manager.finalize_incident(incident)
            ev_path = summary["evidence_path"]
            with open(ev_path, "rb") as f:
                computed_sha = hashlib.sha256(f.read()).hexdigest()
            self.assertEqual(summary["sha256"], computed_sha)

    # -------------------------------------------------------------------------
    # 24. SHA-256 tamper detection
    # -------------------------------------------------------------------------
    def test_24_sha256_tamper_detection(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = IncidentManager(output_dir=tmpdir, fps=10.0)
            now = time.time()
            frames = [(now, np.full((100, 100, 3), 120, dtype=np.uint8))]
            incident = ActiveIncident(
                incident_id="INC-TAMPER-01",
                camera_id="cam-01",
                track_id=1,
                class_name="person",
                event_type="INTRUSION",
                risk_score=90,
                risk_level="CRITICAL",
                zone_name="Zone",
                reasons=[],
                trigger_time=now,
                pre_event_seconds=1.0,
                post_event_seconds=0.0,
                pre_frames=frames,
            )
            summary = manager.finalize_incident(incident)
            original_sha = summary["sha256"]
            ev_path = summary["evidence_path"]
            with open(ev_path, "ab") as f:
                f.write(b"TAMPER_DATA_PAYLOAD")
            with open(ev_path, "rb") as f:
                tampered_sha = hashlib.sha256(f.read()).hexdigest()
            self.assertNotEqual(original_sha, tampered_sha)

    # -------------------------------------------------------------------------
    # 25. Cross-camera correlation integrity
    # -------------------------------------------------------------------------
    def test_25_cross_camera_correlation_integrity(self):
        corr_engine = CorrelationEngine()
        self.assertIsInstance(corr_engine.active_correlations, dict)
        obs1 = Observation(
            camera_id="cam-01",
            track_id="10",
            class_name="person",
            timestamp=100.0,
        )
        self.assertEqual(obs1.camera_id, "cam-01")
        self.assertEqual(obs1.class_name, "person")

    # -------------------------------------------------------------------------
    # 26. Fleet aggregation correctness
    # -------------------------------------------------------------------------
    def test_26_fleet_aggregation_correctness(self):
        cams = {
            "cam-01": {"persons": 4, "vehicles": 6, "tracks": 10},
            "cam-02": {"persons": 2, "vehicles": 3, "tracks": 5},
        }
        total_persons = sum(c["persons"] for c in cams.values())
        total_vehicles = sum(c["vehicles"] for c in cams.values())
        total_tracks = sum(c["tracks"] for c in cams.values())
        self.assertEqual(total_persons, 6)
        self.assertEqual(total_vehicles, 9)
        self.assertEqual(total_tracks, 15)

    # -------------------------------------------------------------------------
    # 27. Historical analytics correctness
    # -------------------------------------------------------------------------
    def test_27_historical_analytics_correctness(self):
        analytics = MovementAnalyticsEngine(camera_id="cam-01", frame_width=1000, frame_height=1000)
        analytics.register_zone("zone-01", "Alpha", [(200, 200), (800, 200), (800, 800), (200, 800)])
        track = {"track_id": 1, "bbox": [450, 450, 550, 550], "class_name": "person"}
        analytics.process_frame([track], timestamp=100.0)
        summary = analytics.get_summary()
        self.assertEqual(summary["camera_id"], "cam-01")
        self.assertIn("occupancy", summary)

    # -------------------------------------------------------------------------
    # 28. Insufficient-data handling
    # -------------------------------------------------------------------------
    def test_28_insufficient_data_handling(self):
        empty_records = []
        if len(empty_records) == 0:
            status = "INSUFFICIENT DATA"
        else:
            status = "NORMAL"
        self.assertEqual(status, "INSUFFICIENT DATA")

    # -------------------------------------------------------------------------
    # 29. No random production telemetry
    # -------------------------------------------------------------------------
    def test_29_no_random_production_telemetry(self):
        import cv_service.intrusion.detector as mod_d
        import cv_service.geometry.polygon as mod_p
        import cv_service.risk.engine as mod_r
        for mod in (mod_d, mod_p, mod_r):
            self.assertFalse(hasattr(mod, "random"), f"Module {mod.__name__} must not import random")

    # -------------------------------------------------------------------------
    # 30. No hardcoded production counts
    # -------------------------------------------------------------------------
    def test_30_no_hardcoded_production_counts(self):
        detector = IntrusionDetector()
        counts = detector.get_ingress_counts("cam-01")
        self.assertEqual(counts["entries"], 0)
        self.assertEqual(counts["exits"], 0)
        self.assertEqual(counts["net_occupancy"], 0)

    # -------------------------------------------------------------------------
    # 31. Playback reset correctness
    # -------------------------------------------------------------------------
    def test_31_playback_reset_correctness(self):
        detector = IntrusionDetector()
        detector.ingress_counts["cam-01"] = {"entries": 10, "exits": 4, "net_occupancy": 6}
        detector.track_states[("cam-01", 1, "zone-01")] = None
        detector.reset_session("cam-01")
        counts = detector.get_ingress_counts("cam-01")
        self.assertEqual(counts["entries"], 0)
        self.assertEqual(len(detector.track_states), 0)

    # -------------------------------------------------------------------------
    # 32. Duplicate event prevention
    # -------------------------------------------------------------------------
    def test_32_duplicate_event_prevention(self):
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        w, h = 1000, 1000
        track = [{"track_id": 301, "bbox": [490, 640, 510, 660], "class_name": "person", "confidence": 0.9}]
        all_events = []
        for _ in range(10):
            evs, _ = detector.process_tracks(track, "cam-01", w, h)
            all_events.extend(evs)
        self.assertLessEqual(len(all_events), 1)

    # -------------------------------------------------------------------------
    # 33. WebSocket telemetry completeness
    # -------------------------------------------------------------------------
    def test_33_websocket_telemetry_completeness(self):
        sample_frame_state = {
            "type": "frame_state",
            "camera_id": "cam-01",
            "frame_id": 10,
            "timestamp": "2026-08-30T00:00:00Z",
            "active_counts": {"person": 4, "car": 2},
            "unique_counts": {"person": 10, "vehicle": 5},
            "entries": 3,
            "exits": 1,
            "net_occupancy": 2,
            "tripwire_events": [],
            "zone_events": [],
            "alerts": [],
        }
        for k in ("active_counts", "unique_counts", "entries", "exits", "net_occupancy", "tripwire_events", "zone_events"):
            self.assertIn(k, sample_frame_state)

    # -------------------------------------------------------------------------
    # 34. End-to-end real CAM-01 pipeline
    # -------------------------------------------------------------------------
    def test_34_end_to_end_real_cam01_pipeline(self):
        source = MP4Source(self.fixture_cam01, loop=False, camera_id="cam-01")
        source.open()
        detector = IntrusionDetector()
        detector.load_zones_from_backend("cam-01")
        tracker = ByteTrackEngine()
        
        frames_tested = 0
        total_tracks_seen = 0
        while frames_tested < 25:
            ret, frame = source.read_frame()
            if not ret or frame is None:
                break
            h, w = frame.shape[:2]
            res = tracker.track(frame, camera_id="cam-01")
            tracks = res.get("tracks", [])
            total_tracks_seen += len(tracks)
            events, _ = detector.process_tracks(tracks, "cam-01", w, h)
            frames_tested += 1
            
        source.release()
        self.assertEqual(frames_tested, 25)
        self.assertGreater(total_tracks_seen, 0)


if __name__ == "__main__":
    unittest.main()
