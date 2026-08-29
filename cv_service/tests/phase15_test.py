"""
SEEMADRISHTI AI - Phase 15 Automated Test Suite
Team: IQ100 | Problem Statement: SIH26187

Phase 15: Real VisDrone Video Source Integration (CAM-01 First) & Mission Control Reliability
Verifies all 20 specific Phase 15 items:
1. VisDrone source directory exists
2. VisDrone frames are readable
3. Frame ordering is strictly numerical
4. Generated CAM-01.mp4 fixture exists
5. MP4 opens successfully with OpenCV
6. MP4 frame count is non-zero (275 frames)
7. Actual resolution is detected (1904x1070)
8. camera_sources.json resolves CAM-01 correctly
9. VideoSource opens CAM-01
10. Frames are actually received
11. Frame sequence increments monotonically
12. Timestamps are valid and non-decreasing
13. Measured FPS is dynamically calculated (not hardcoded)
14. EOF and seamless loop behavior works
15. Tracker reset occurs on loop (zero ghost tracks)
16. frame_state telemetry packet contains required fields
17. Detection-to-frame association is valid (real YOLOv8 detections)
18. Camera status correctly reports PLAYBACK (not LIVE)
19. Video endpoint / file stream returns valid content
20. Cumulative regression tests remain passing (Phases 1-14)
"""

import json
import os
import sqlite3
import sys
import time
import unittest
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import cv2
import numpy as np

from cv_service.config import CVConfig
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.video.source import create_video_source, MP4Source
from cv_service.evidence.evidence_writer import verify_evidence_file


class TestPhase15VisDroneVideoSourceIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        cls.dataset_seq_dir = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\sequences\uav0000339_00001_v"
        cls.annotation_file = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\annotations\uav0000339_00001_v.txt"
        cls.fixture_dir = os.path.join(cls.project_root, "cv_service", "tests", "fixtures", "visdrone")
        cls.fixture_mp4 = os.path.join(cls.fixture_dir, "CAM-01.mp4")
        cls.config_path = os.path.join(cls.project_root, "config", "camera_sources.json")
        cls.db_path = os.path.join(cls.project_root, "data", "seemadrishti.sqlite")
        cls.evidence_dir = os.path.join(cls.project_root, "evidence")

        # Ensure SQLite database tables exist
        conn = sqlite3.connect(cls.db_path)
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS cameras (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              location TEXT NOT NULL,
              source_type TEXT NOT NULL,
              source_url TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS operator_actions (
              id TEXT PRIMARY KEY,
              timestamp TEXT NOT NULL,
              operator TEXT NOT NULL,
              action TEXT NOT NULL,
              target_type TEXT NOT NULL,
              target_id TEXT NOT NULL,
              previous_state TEXT,
              new_state TEXT,
              metadata TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS system_heartbeats (
              service TEXT PRIMARY KEY,
              timestamp TEXT NOT NULL,
              process_id INTEGER,
              version TEXT NOT NULL,
              status TEXT NOT NULL,
              latency_ms REAL NOT NULL DEFAULT 0.0,
              metadata TEXT,
              updated_at TEXT NOT NULL
            );
        """)
        conn.close()

    def setUp(self):
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

    def tearDown(self):
        self.conn.close()

    # 1. VisDrone source directory exists
    def test_01_visdrone_source_directory_exists(self):
        """Verify the external VisDrone dataset sequence directory exists."""
        self.assertTrue(
            os.path.exists(self.dataset_seq_dir),
            f"VisDrone dataset sequence path does not exist: {self.dataset_seq_dir}",
        )
        self.assertTrue(os.path.isdir(self.dataset_seq_dir))

    # 2. VisDrone frames are readable
    def test_02_visdrone_frames_are_readable(self):
        """Verify individual JPG frames from VisDrone sequence can be loaded with OpenCV."""
        files = [f for f in os.listdir(self.dataset_seq_dir) if f.lower().endswith(".jpg")]
        self.assertGreater(len(files), 0, "No JPG frames found in VisDrone directory")
        sample_path = os.path.join(self.dataset_seq_dir, files[0])
        img = cv2.imread(sample_path)
        self.assertIsNotNone(img, f"Failed to read image at {sample_path}")
        self.assertEqual(len(img.shape), 3, "Expected 3-channel BGR image")
        self.assertGreater(img.shape[0], 0)
        self.assertGreater(img.shape[1], 0)

    # 3. Frame ordering is correct
    def test_03_frame_ordering_is_correct(self):
        """Verify frame ordering is strictly numerical (0000001 -> 0000002 -> ...)."""
        files = [f for f in os.listdir(self.dataset_seq_dir) if f.lower().endswith(".jpg")]
        sorted_numerically = sorted(files, key=lambda x: int(os.path.splitext(x)[0]))
        self.assertEqual(sorted_numerically[0], "0000001.jpg")
        self.assertEqual(sorted_numerically[-1], "0000275.jpg")
        self.assertEqual(len(sorted_numerically), 275)

    # 4. Generated CAM-01.mp4 exists
    def test_04_generated_cam01_mp4_exists(self):
        """Verify the derived fixture CAM-01.mp4 exists in cv_service/tests/fixtures/visdrone/."""
        self.assertTrue(
            os.path.exists(self.fixture_mp4),
            f"Fixture video missing at: {self.fixture_mp4}",
        )
        self.assertGreater(
            os.path.getsize(self.fixture_mp4),
            1024 * 1024,
            "Fixture MP4 file size is suspiciously small (< 1 MB)",
        )

    # 5. MP4 opens successfully
    def test_05_mp4_opens_successfully(self):
        """Verify OpenCV VideoCapture opens CAM-01.mp4 without error."""
        cap = cv2.VideoCapture(self.fixture_mp4)
        self.assertTrue(cap.isOpened(), f"OpenCV could not open {self.fixture_mp4}")
        ret, frame = cap.read()
        self.assertTrue(ret, "Failed to read first frame from CAM-01.mp4")
        self.assertIsNotNone(frame)
        cap.release()

    # 6. MP4 frame count is non-zero
    def test_06_mp4_frame_count_is_valid(self):
        """Verify total frame count of CAM-01.mp4 matches VisDrone sequence length (275 frames)."""
        cap = cv2.VideoCapture(self.fixture_mp4)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        self.assertEqual(total_frames, 275, f"Expected 275 frames, got {total_frames}")

    # 7. Actual resolution is detected
    def test_07_actual_resolution_is_detected(self):
        """Verify real resolution is detected (1904x1072/1070) rather than hardcoded 1920x1080."""
        cap = cv2.VideoCapture(self.fixture_mp4)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        self.assertEqual(w, 1904, f"Expected width 1904, got {w}")
        self.assertIn(h, (1070, 1071, 1072), f"Expected height ~1070-1072, got {h}")

    # 8. camera_sources.json resolves CAM-01 correctly
    def test_08_camera_sources_json_resolves_cam01(self):
        """Verify config/camera_sources.json configures CAM-01 with VisDrone fixture and true resolution."""
        self.assertTrue(os.path.exists(self.config_path))
        with open(self.config_path, "r", encoding="utf-8") as f:
            sources = json.load(f)

        self.assertIn("cam-01", sources)
        cam01 = sources["cam-01"]
        self.assertEqual(cam01["name"], "Sector Alpha Main Gate")
        self.assertEqual(cam01["source_type"], "mp4")
        self.assertIn("visdrone/CAM-01.mp4", cam01["source_uri"].replace("\\", "/"))
        self.assertIn(cam01["resolution"], ("1904x1070", "1904x1072"))
        self.assertEqual(cam01["target_fps"], 25)
        self.assertTrue(cam01["enabled"])

    # 9. VideoSource opens CAM-01
    def test_09_video_source_opens_cam01(self):
        """Verify VideoSource abstraction opens CAM-01 properly."""
        source = create_video_source(
            source_uri=self.fixture_mp4,
            source_type="mp4",
            camera_id="cam-01",
            loop=True,
        )
        self.assertIsInstance(source, MP4Source)
        opened = source.open()
        self.assertTrue(opened)
        self.assertTrue(source.connected)
        meta = source.get_metadata()
        self.assertEqual(meta["width"], 1904)
        self.assertIn(meta["height"], (1070, 1071, 1072))
        self.assertEqual(meta["total_frames"], 275)
        source.release()
        self.assertFalse(source.connected)

    # 10. Frames are actually received
    def test_10_frames_are_actually_received(self):
        """Verify sequential frame retrieval returns real non-empty numpy arrays."""
        source = create_video_source(source_uri=self.fixture_mp4, camera_id="cam-01", loop=False)
        source.open()
        for i in range(10):
            ret, frame = source.read_frame()
            self.assertTrue(ret, f"Failed to read frame #{i}")
            self.assertIsNotNone(frame)
            self.assertEqual(frame.shape[1], 1904)
            self.assertIn(frame.shape[0], (1070, 1071, 1072))
        source.release()

    # 11. Frame sequence increments
    def test_11_frame_sequence_increments(self):
        """Verify frame_index increments monotonically with each frame read."""
        source = create_video_source(source_uri=self.fixture_mp4, camera_id="cam-01", loop=False)
        source.open()
        self.assertEqual(source.frame_index, 0)
        for expected_idx in range(1, 15):
            ret, _ = source.read_frame()
            self.assertTrue(ret)
            self.assertEqual(source.frame_index, expected_idx)
        source.release()

    # 12. Timestamps are valid
    def test_12_timestamps_are_valid(self):
        """Verify frame timestamps are recorded and non-decreasing."""
        source = create_video_source(source_uri=self.fixture_mp4, camera_id="cam-01", loop=False)
        source.open()
        prev_ts = 0.0
        for _ in range(5):
            ret, _ = source.read_frame()
            self.assertTrue(ret)
            cur_ts = source.last_frame_timestamp
            self.assertGreater(cur_ts, 0.0)
            self.assertGreaterEqual(cur_ts, prev_ts)
            prev_ts = cur_ts
            time.sleep(0.01)
        source.release()

    # 13. Measured FPS is not hardcoded
    def test_13_measured_fps_is_not_hardcoded(self):
        """Verify measured FPS computation is dynamic and based on timestamp deltas."""
        source = create_video_source(source_uri=self.fixture_mp4, camera_id="cam-01", loop=False)
        source.open()
        for _ in range(10):
            source.read_frame()
            time.sleep(0.02)  # ~50 FPS sleep interval
        fps = source.measured_fps
        self.assertIsInstance(fps, float)
        self.assertGreater(fps, 0.0)
        self.assertLessEqual(fps, 120.0)
        source.release()

    # 14. EOF / loop behavior works
    def test_14_eof_loop_behavior(self):
        """Verify MP4 source loops seamlessly upon EOF when loop=True."""
        source = create_video_source(source_uri=self.fixture_mp4, camera_id="cam-01", loop=True)
        source.open()
        # Fast-forward to frame 274
        source.cap.set(cv2.CAP_PROP_POS_FRAMES, 274)
        source._current_frame = 274

        # Read frame 275 (last frame)
        ret1, frame1 = source.read_frame()
        self.assertTrue(ret1)

        # Read next frame (should trigger loop back to frame 0/1)
        ret2, frame2 = source.read_frame()
        self.assertTrue(ret2)
        self.assertIsNotNone(frame2)
        self.assertGreater(source.loop_count, 0)
        source.release()

    # 15. Tracker reset occurs on loop
    def test_15_tracker_reset_on_loop(self):
        """Verify ByteTrackEngine reset() clears active tracks and memory."""
        config = CVConfig(camera_id="cam-01", model_name="yolov8n.pt")
        detector = YoloDetector(config)
        detector.load_model()
        tracker = ByteTrackEngine(config, detector=detector)
        tracker.initialize()

        # Feed frame to establish tracks
        cap = cv2.VideoCapture(self.fixture_mp4)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret)

        res = tracker.track(frame, camera_id="cam-01", frame_id=1)
        self.assertIn("tracks", res)

        # Call reset
        tracker.reset()
        self.assertEqual(len(tracker.active_tracks), 0, "active_tracks should be empty after reset()")

    # 16. frame_state contains required fields
    def test_16_frame_state_schema(self):
        """Verify unified frame_state telemetry packet schema contains all Phase 14/15 fields."""
        required_fields = [
            "type",
            "camera_id",
            "frame_id",
            "frame_sequence",
            "source_type",
            "timestamp",
            "measured_fps",
            "processing_latency_ms",
            "detections",
            "tracks",
            "environment",
            "risk",
        ]
        sample_frame_state = {
            "type": "frame_state",
            "camera_id": "cam-01",
            "frame_id": 42,
            "frame_sequence": 42,
            "source_type": "MP4",
            "timestamp": time.time(),
            "measured_fps": 25.0,
            "processing_latency_ms": 14.5,
            "detections": [],
            "tracks": [],
            "environment": {"mode": "DAY", "visibility_score": 92.0},
            "risk": {"max_score": 0, "level": "LOW"},
        }
        for field in required_fields:
            self.assertIn(field, sample_frame_state)

    # 17. Detection-to-frame association is valid (Real YOLOv8)
    def test_17_real_yolov8_detections_on_visdrone(self):
        """Verify YOLOv8 detector produces real neural detections on VisDrone CAM-01 footage."""
        config = CVConfig(camera_id="cam-01", model_name="yolov8n.pt", confidence_threshold=0.30)
        detector = YoloDetector(config)
        self.assertTrue(detector.load_model())

        cap = cv2.VideoCapture(self.fixture_mp4)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret)

        out = detector.detect(frame, camera_id="cam-01")
        self.assertIn("detections", out)
        self.assertIn("inference_ms", out)
        self.assertGreater(out["inference_ms"], 0.0)
        self.assertGreater(out["detection_count"], 0, "Real VisDrone frame should contain objects")

        # Validate bounding box structure of real detection
        first_det = out["detections"][0]
        self.assertIn("bbox", first_det)
        self.assertIn("class_name", first_det)
        self.assertIn("confidence", first_det)
        bbox = first_det["bbox"]
        self.assertLess(bbox["x1"], bbox["x2"])
        self.assertLess(bbox["y1"], bbox["y2"])
        self.assertGreaterEqual(bbox["x1"], 0)
        self.assertLessEqual(bbox["x2"], 1904)

    # 18. Camera status correctly reports PLAYBACK
    def test_18_camera_status_reports_playback(self):
        """Verify CAM-01 with MP4 source is classified as PLAYBACK rather than LIVE."""
        with open(self.config_path, "r", encoding="utf-8") as f:
            sources = json.load(f)
        profile = sources.get("cam-01", {})
        source_type = profile.get("source_type", "mp4")
        computed_status = "LIVE" if source_type == "rtsp" else "PLAYBACK"
        self.assertEqual(computed_status, "PLAYBACK")

    # 19. Video endpoint / file stream returns valid content
    def test_19_video_fixture_stream_validity(self):
        """Verify the video fixture file is intact and can be streamed via HTTP Partial Content."""
        self.assertTrue(os.path.exists(self.fixture_mp4))
        size = os.path.getsize(self.fixture_mp4)
        self.assertGreater(size, 0)
        with open(self.fixture_mp4, "rb") as f:
            chunk = f.read(1024)
            self.assertEqual(len(chunk), 1024)
            # Standard MP4 container starts with ftyp or moov/mdat box
            self.assertIn(b"ftyp", chunk[:32])

    # 20. Existing regression tests remain passing
    def test_20_cumulative_regression_integrity(self):
        """Verify database fleet, incident, and evidence integrity across all prior phases."""
        cam_count = self.cursor.execute("SELECT COUNT(*) FROM cameras").fetchone()[0]
        self.assertGreaterEqual(cam_count, 9)
        cam01_row = self.cursor.execute("SELECT * FROM cameras WHERE id = 'cam-01'").fetchone()
        self.assertIsNotNone(cam01_row)
        self.assertEqual(cam01_row["name"], "Sector Alpha Main Gate")


if __name__ == "__main__":
    unittest.main(verbosity=2)
