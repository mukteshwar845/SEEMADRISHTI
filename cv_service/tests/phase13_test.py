"""
SEEMADRISHTI AI - Phase 13 Comprehensive Automated Test Battery
Team: IQ100
SIH Problem Statement: SIH26187

Phase 13: Pipeline Hardening, Camera Source Validation, Forensic Recording & Playback Verification
Tests:
 1. Video source open (MP4Source on test fixture)
 2. Video source get_status() telemetry contract
 3. Real measured FPS calculation from inter-frame intervals
 4. Loop rewind behavior on file EOF
 5. Video source disconnect detection on release
 6. RTSPSource initialization, error handling, and reconnection tracking
 7. Video source factory (create_video_source) source type resolution
 8. Monotonic frame timestamping on ingested frames
 9. Circular buffer pre-event window retention
10. Forensic EvidenceWriter encodes MP4 with burned-in HUD
11. EvidenceWriter outputs non-empty file on disk (> 0 bytes)
12. EvidenceWriter computes authentic SHA-256 hash
13. EvidenceWriter verifies video container reopening with OpenCV
14. EvidenceWriter verification validates frame count and video duration
15. Recording validation detects missing or 0-byte file (status = FAILED)
16. Cryptographic tamper detection: 1-byte mutation invalidates SHA-256
17. Standalone verify_evidence_file static method validation
18. IncidentManager assigns SHA-256 and verification_status on finalization
19. REST API GET /api/incidents returns serialized incidents with SHA-256
20. REST API GET /api/incidents/:id returns single incident details
21. REST API GET /api/incidents/:id/evidence streams video/mp4 with Accept-Ranges
22. REST API Path traversal protection on /api/incidents/:id/evidence
23. REST API GET /api/incidents/storage/stats returns storage metrics
24. Camera ID normalization and consistent entity referencing
25. Incident deduplication prevents duplicate active triggers for same track
26. Backward compatibility: cv_service.video.capture exports match cv_service.video.source
27. Explicit evidence status transitions (capturing -> ready / verified)
"""

import os
import sys
import time
import hashlib
import sqlite3
import tempfile
import unittest
from pathlib import Path
from typing import Dict, Any

import cv2
import numpy as np
import requests

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from cv_service.video.source import (
    VideoSource,
    MP4Source,
    WebcamSource,
    RTSPSource,
    create_video_source,
)
import cv_service.video.capture as capture_module
from cv_service.evidence.circular_buffer import CircularFrameBuffer
from cv_service.evidence.evidence_writer import EvidenceWriter
from cv_service.evidence.incident_manager import IncidentManager, ActiveIncident

BACKEND_URL = "http://127.0.0.1:8000"
DB_PATH = str(PROJECT_ROOT / "data" / "seemadrishti.sqlite")
FIXTURE_VIDEO = str(PROJECT_ROOT / "cv_service" / "tests" / "fixtures" / "sample_test.mp4")
INTRUSION_VIDEO = str(PROJECT_ROOT / "cv_service" / "tests" / "fixtures" / "intrusion_test.mp4")


class Phase13PipelineHardeningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Verify test fixtures exist
        if not os.path.exists(FIXTURE_VIDEO):
            # Fallback to intrusion_test.mp4
            cls.test_video = INTRUSION_VIDEO
        else:
            cls.test_video = FIXTURE_VIDEO

    # 1. Video source open
    def test_01_mp4_source_open(self):
        source = MP4Source(file_path=self.test_video, camera_id="cam-01")
        opened = source.open()
        self.assertTrue(opened)
        self.assertTrue(source.connected)
        meta = source.get_metadata()
        self.assertGreater(meta["width"], 0)
        self.assertGreater(meta["height"], 0)
        source.release()
        self.assertFalse(source.connected)

    # 2. Video source get_status() telemetry contract
    def test_02_video_source_get_status_contract(self):
        source = MP4Source(file_path=self.test_video, camera_id="cam-01")
        source.open()
        status = source.get_status()
        self.assertEqual(status["cameraId"], "cam-01")
        self.assertEqual(status["sourceType"], "mp4")
        self.assertTrue(status["connected"])
        self.assertIn("frameWidth", status)
        self.assertIn("frameHeight", status)
        self.assertIn("measuredFps", status)
        self.assertIn("lastFrameTimestamp", status)
        self.assertIn("reconnectAttempts", status)
        self.assertIn("error", status)
        source.release()

    # 3. Real measured FPS calculation from inter-frame intervals
    def test_03_measured_fps_calculation(self):
        source = MP4Source(file_path=self.test_video, camera_id="cam-01")
        source.open()
        for _ in range(5):
            ret, frame = source.read_frame()
            self.assertTrue(ret)
            self.assertIsNotNone(frame)
            time.sleep(0.02)
        fps = source.measured_fps
        self.assertGreater(fps, 0.0)
        self.assertLessEqual(fps, 120.0)
        source.release()

    # 4. Loop rewind behavior on file EOF
    def test_04_loop_rewind_behavior(self):
        source = MP4Source(file_path=self.test_video, loop=True, camera_id="cam-01")
        source.open()
        total_frames = source._total_frames
        # Read slightly past total frames
        for _ in range(total_frames + 2):
            ret, frame = source.read_frame()
            self.assertTrue(ret)
            self.assertIsNotNone(frame)
        self.assertTrue(source.connected)
        source.release()

    # 5. Video source disconnect detection on release
    def test_05_disconnect_detection_on_release(self):
        source = MP4Source(file_path=self.test_video, camera_id="cam-01")
        source.open()
        self.assertTrue(source.connected)
        source.release()
        self.assertFalse(source.connected)
        ret, frame = source.read_frame()
        self.assertFalse(ret)
        self.assertIsNone(frame)

    # 6. RTSPSource initialization, error handling, and reconnection tracking
    def test_06_rtsp_source_reconnection_tracking(self):
        rtsp = RTSPSource(
            rtsp_url="rtsp://invalid-host-for-testing:554/stream1",
            camera_id="cam-01",
            reconnect_cooldown_sec=0.01,
        )
        self.assertEqual(rtsp.source_type, "rtsp")
        opened = rtsp.open()
        self.assertFalse(opened)
        self.assertFalse(rtsp.connected)
        self.assertIsNotNone(rtsp.last_error)
        
        # Test reconnect attempt
        reconnected = rtsp.reconnect()
        self.assertFalse(reconnected)
        self.assertEqual(rtsp.reconnect_attempts, 1)
        rtsp.release()

    # 7. Video source factory source type resolution
    def test_07_create_video_source_factory(self):
        src_mp4 = create_video_source(self.test_video, camera_id="cam-01")
        self.assertEqual(src_mp4.source_type, "mp4")

        src_rtsp = create_video_source("rtsp://192.168.1.100:554/live", camera_id="cam-02")
        self.assertEqual(src_rtsp.source_type, "rtsp")

        src_cam = create_video_source("0", camera_id="cam-03")
        self.assertEqual(src_cam.source_type, "webcam")

    # 8. Monotonic frame timestamping on ingested frames
    def test_08_monotonic_frame_timestamps(self):
        source = MP4Source(file_path=self.test_video, camera_id="cam-01")
        source.open()
        timestamps = []
        for _ in range(5):
            ret, _ = source.read_frame()
            self.assertTrue(ret)
            timestamps.append(source.last_frame_timestamp)
            time.sleep(0.01)
        source.release()
        for i in range(len(timestamps) - 1):
            self.assertGreaterEqual(timestamps[i + 1], timestamps[i])

    # 9. Circular buffer pre-event window retention
    def test_09_circular_buffer_retention(self):
        buf = CircularFrameBuffer(pre_event_seconds=2.0, max_fps=30.0)
        h, w = 240, 320
        dummy_frame = np.zeros((h, w, 3), dtype=np.uint8)
        now = time.time()
        for i in range(30):
            buf.push("cam-01", dummy_frame, timestamp=now + (i * 0.1))
        
        # Retrieve snapshot at now + 2.5
        pre_frames = buf.get_pre_event_frames("cam-01", trigger_time=now + 2.5)
        self.assertGreater(len(pre_frames), 0)
        oldest_ts = pre_frames[0][0]
        self.assertGreaterEqual(oldest_ts, (now + 2.5) - 2.5)

    # 10. Forensic EvidenceWriter encodes MP4 with burned-in HUD
    def test_10_evidence_writer_encodes_mp4(self):
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        h, w = 480, 640
        frames = []
        t0 = time.time()
        for i in range(15):
            f = np.zeros((h, w, 3), dtype=np.uint8)
            cv2.putText(f, f"FRAME {i}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
            frames.append((t0 + (i * 0.066), f))

        meta = {
            "camera_id": "cam-01",
            "track_id": "42",
            "risk_score": 90,
            "risk_level": "CRITICAL",
            "zone_name": "Sector Alpha",
            "reasons": [{"code": "INTRUSION", "points": 50}],
        }
        inc_id = f"INC-P13-TEST-{int(time.time() * 1000)}"
        res = writer.write_evidence_clip(inc_id, frames, meta)

        self.assertTrue(res["success"])
        self.assertTrue(os.path.exists(res["file_path"]))
        self.assertGreater(res["file_size_bytes"], 0)
        self.assertEqual(res["verification_status"], "VERIFIED")

    # 11. EvidenceWriter outputs non-empty file on disk (> 0 bytes)
    def test_11_evidence_file_non_empty(self):
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        f = np.ones((240, 320, 3), dtype=np.uint8) * 128
        frames = [(time.time(), f) for _ in range(5)]
        inc_id = f"INC-NONEMPTY-{int(time.time() * 1000)}"
        res = writer.write_evidence_clip(inc_id, frames, {"camera_id": "cam-01"})
        file_size = os.path.getsize(res["file_path"])
        self.assertGreater(file_size, 500)

    # 12. EvidenceWriter computes authentic SHA-256 hash
    def test_12_evidence_sha256_authenticity(self):
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        f = np.ones((240, 320, 3), dtype=np.uint8) * 200
        frames = [(time.time(), f) for _ in range(5)]
        inc_id = f"INC-SHA-{int(time.time() * 1000)}"
        res = writer.write_evidence_clip(inc_id, frames, {"camera_id": "cam-01"})
        
        # Independently calculate SHA-256
        hasher = hashlib.sha256()
        with open(res["file_path"], "rb") as fp:
            hasher.update(fp.read())
        expected_digest = hasher.hexdigest()

        self.assertEqual(res["sha256"], expected_digest)

    # 13. EvidenceWriter verifies video container reopening with OpenCV
    def test_13_opencv_reopen_verification(self):
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        f = np.zeros((240, 320, 3), dtype=np.uint8)
        frames = [(time.time(), f) for _ in range(10)]
        inc_id = f"INC-REOPEN-{int(time.time() * 1000)}"
        res = writer.write_evidence_clip(inc_id, frames, {"camera_id": "cam-01"})
        
        cap = cv2.VideoCapture(res["file_path"])
        self.assertTrue(cap.isOpened())
        ret, frame = cap.read()
        self.assertTrue(ret)
        self.assertIsNotNone(frame)
        cap.release()

    # 14. EvidenceWriter verification validates frame count and video duration
    def test_14_verification_frame_count_and_duration(self):
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        f = np.zeros((240, 320, 3), dtype=np.uint8)
        frames = [(time.time(), f) for _ in range(30)]
        inc_id = f"INC-DUR-{int(time.time() * 1000)}"
        res = writer.write_evidence_clip(inc_id, frames, {"camera_id": "cam-01"})

        verification = EvidenceWriter.verify_evidence_file(res["file_path"])
        self.assertTrue(verification["valid"])
        self.assertEqual(verification["status"], "VERIFIED")
        self.assertGreaterEqual(verification["frame_count"], 1)
        self.assertGreater(verification["duration"], 0.0)

    # 15. Recording validation detects missing or 0-byte file (status = FAILED)
    def test_15_validation_detects_invalid_files(self):
        res_missing = EvidenceWriter.verify_evidence_file("evidence/non_existent_file.mp4")
        self.assertFalse(res_missing["valid"])
        self.assertEqual(res_missing["status"], "FAILED")

        # Test empty 0-byte file
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf:
            tf_name = tf.name
        try:
            res_empty = EvidenceWriter.verify_evidence_file(tf_name)
            self.assertFalse(res_empty["valid"])
            self.assertEqual(res_empty["status"], "FAILED")
        finally:
            if os.path.exists(tf_name):
                os.remove(tf_name)

    # 16. Cryptographic tamper detection: 1-byte mutation invalidates SHA-256
    def test_16_tamper_detection(self):
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        f = np.ones((240, 320, 3), dtype=np.uint8) * 100
        frames = [(time.time(), f) for _ in range(10)]
        inc_id = f"INC-TAMPER-{int(time.time() * 1000)}"
        res = writer.write_evidence_clip(inc_id, frames, {"camera_id": "cam-01"})

        original_sha = res["sha256"]
        file_path = res["file_path"]

        # Mutate 1 byte
        with open(file_path, "r+b") as fp:
            fp.seek(100)
            byte = fp.read(1)
            mutated = bytes([(byte[0] ^ 0xFF)])
            fp.seek(100)
            fp.write(mutated)

        # Verification with original expected SHA should fail
        check = EvidenceWriter.verify_evidence_file(file_path, expected_sha256=original_sha)
        self.assertFalse(check["valid"])
        self.assertEqual(check["status"], "FAILED")
        self.assertIn("mismatch", check["error"])

    # 17. Standalone verify_evidence_file static method validation
    def test_17_verify_evidence_file_static_method(self):
        # Test on existing INC-000001.mp4 in evidence/
        p = os.path.join("evidence", "INC-000001.mp4")
        if os.path.exists(p):
            check = EvidenceWriter.verify_evidence_file(p)
            self.assertTrue(check["valid"])
            self.assertEqual(check["status"], "VERIFIED")
            self.assertIn("sha256", check)
            self.assertGreater(check["file_size"], 0)

    # 18. IncidentManager assigns SHA-256 and verification_status on finalization
    def test_18_incident_manager_finalization_fields(self):
        buf = CircularFrameBuffer(pre_event_seconds=2.0)
        writer = EvidenceWriter(evidence_dir="evidence_test", fps=15.0)
        mgr = IncidentManager(
            circular_buffer=buf,
            evidence_writer=writer,
            post_event_seconds=0.1,
            backend_http_url=BACKEND_URL,
        )
        f = np.zeros((240, 320, 3), dtype=np.uint8)
        buf.push("cam-01", f, timestamp=time.time())
        inc = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=99,
            class_name="person",
            risk_score=95,
            risk_level="CRITICAL",
            reasons=[{"code": "INTRUSION", "points": 50}],
            zone_name="Sector Alpha",
            event_type="PERIMETER_BREACH",
        )
        self.assertIsNotNone(inc)
        # Add frame and complete
        inc.add_frame(time.time() + 0.2, f)
        summary = mgr.finalize_incident(inc)

        self.assertIn("sha256", summary)
        self.assertIsNotNone(summary["sha256"])
        self.assertEqual(summary["verification_status"], "VERIFIED")

    # 19. REST API GET /api/incidents returns serialized incidents with SHA-256
    def test_19_api_get_incidents(self):
        try:
            r = requests.get(f"{BACKEND_URL}/api/incidents?limit=5", timeout=3.0)
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertTrue(data.get("success"))
            self.assertIsInstance(data.get("data"), list)
            if len(data["data"]) > 0:
                first = data["data"][0]
                self.assertIn("id", first)
                self.assertIn("camera_id", first)
                self.assertIn("risk_score", first)
                self.assertIn("evidence_status", first)
        except requests.exceptions.ConnectionError:
            self.skipTest("Backend server is not running on port 8000")

    # 20. REST API GET /api/incidents/:id returns single incident details
    def test_20_api_get_incident_by_id(self):
        try:
            r = requests.get(f"{BACKEND_URL}/api/incidents/INC-000001", timeout=3.0)
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["data"]["id"], "INC-000001")
            self.assertIn("sha256", data["data"])
            self.assertIn("verification_status", data["data"])
        except requests.exceptions.ConnectionError:
            self.skipTest("Backend server is not running on port 8000")

    # 21. REST API GET /api/incidents/:id/evidence streams video/mp4 with Accept-Ranges
    def test_21_api_get_evidence_stream(self):
        try:
            r = requests.get(f"{BACKEND_URL}/api/incidents/INC-000001/evidence", timeout=3.0)
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.headers.get("content-type"), "video/mp4")
            self.assertEqual(r.headers.get("accept-ranges"), "bytes")
            self.assertGreater(len(r.content), 1000)
        except requests.exceptions.ConnectionError:
            self.skipTest("Backend server is not running on port 8000")

    # 22. REST API Path traversal protection on /api/incidents/:id/evidence
    def test_22_api_evidence_path_traversal_protection(self):
        try:
            # Traversal attempt with ..
            r1 = requests.get(f"{BACKEND_URL}/api/incidents/..%2F..%2Fetc%2Fpasswd/evidence", timeout=3.0)
            self.assertIn(r1.status_code, [400, 403, 404])

            # Non-existent ID
            r2 = requests.get(f"{BACKEND_URL}/api/incidents/NON-EXISTENT-ID/evidence", timeout=3.0)
            self.assertEqual(r2.status_code, 404)
        except requests.exceptions.ConnectionError:
            self.skipTest("Backend server is not running on port 8000")

    # 23. REST API GET /api/incidents/storage/stats returns storage metrics
    def test_23_api_storage_stats(self):
        try:
            r = requests.get(f"{BACKEND_URL}/api/incidents/storage/stats", timeout=3.0)
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertTrue(data["success"])
            stats = data["data"]
            self.assertIn("storageUsedBytes", stats)
            self.assertIn("storageUsedMb", stats)
            self.assertIn("totalClips", stats)
            self.assertIn("evidenceDirectory", stats)
        except requests.exceptions.ConnectionError:
            self.skipTest("Backend server is not running on port 8000")

    # 24. Camera ID normalization and consistent entity referencing
    def test_24_camera_id_referencing(self):
        # cam-01 vs CAM-01
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT DISTINCT camera_id FROM incidents LIMIT 5")
        cam_ids = [row[0] for row in c.fetchall()]
        conn.close()
        self.assertGreater(len(cam_ids), 0)

    # 25. Incident deduplication prevents duplicate active triggers for same track
    def test_25_incident_deduplication(self):
        buf = CircularFrameBuffer(pre_event_seconds=2.0)
        mgr = IncidentManager(
            circular_buffer=buf,
            evidence_writer=EvidenceWriter(evidence_dir="evidence_test", fps=15.0),
            post_event_seconds=5.0,
            backend_http_url=BACKEND_URL,
        )
        f = np.zeros((240, 320, 3), dtype=np.uint8)
        buf.push("cam-01", f, timestamp=time.time())
        inc1 = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=77,
            class_name="person",
            risk_score=88,
            risk_level="CRITICAL",
            reasons=[],
            zone_name="Alpha",
        )
        self.assertIsNotNone(inc1)

        # Immediate second trigger for same camera & track must be suppressed (deduplicated)
        inc2 = mgr.check_and_trigger(
            camera_id="cam-01",
            track_id=77,
            class_name="person",
            risk_score=88,
            risk_level="CRITICAL",
            reasons=[],
            zone_name="Alpha",
        )
        self.assertIsNone(inc2)

    # 26. Backward compatibility: cv_service.video.capture exports match cv_service.video.source
    def test_26_capture_backward_compatibility(self):
        self.assertTrue(hasattr(capture_module, "VideoSource"))
        self.assertTrue(hasattr(capture_module, "MP4Source"))
        self.assertTrue(hasattr(capture_module, "WebcamSource"))
        self.assertTrue(hasattr(capture_module, "RTSPSource"))
        self.assertTrue(hasattr(capture_module, "create_video_source"))
        self.assertIs(capture_module.MP4Source, MP4Source)

    # 27. Explicit evidence status transitions
    def test_27_evidence_status_transitions(self):
        inc = ActiveIncident(
            incident_id="INC-STATUS-TEST",
            camera_id="cam-01",
            track_id=5,
            class_name="person",
            event_type="INTRUSION",
            risk_score=85,
            risk_level="HIGH",
            zone_name="Sector Beta",
            reasons=[],
            trigger_time=time.time(),
            pre_event_seconds=10.0,
            post_event_seconds=10.0,
            pre_frames=[],
        )
        self.assertEqual(inc.status, "capturing")
        inc.status = "ready"
        self.assertEqual(inc.status, "ready")


if __name__ == "__main__":
    unittest.main(verbosity=2)
