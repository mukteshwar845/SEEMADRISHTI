import os
import time
import hashlib
import shutil
import subprocess
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np

logger = logging.getLogger("EvidenceWriter")


class EvidenceWriter:
    """
    Forensic video evidence writer for SEEMADRISHTI AI.
    Assembles pre-event, incident, and post-event video frames, burns tactical
    forensic HUD metadata overlays into every frame, and encodes a compliant MP4 clip.
    """

    def __init__(
        self,
        evidence_dir: str = "evidence",
        fps: float = 15.0,
        output_dir: Optional[str] = None,
        **kwargs,
    ):
        if output_dir:
            evidence_dir = output_dir
        self.evidence_dir = evidence_dir
        self.fps = float(fps)
        self._ensure_dir()

    def _ensure_dir(self) -> None:
        if not os.path.exists(self.evidence_dir):
            os.makedirs(self.evidence_dir, exist_ok=True)

    def write_evidence_clip(
        self,
        incident_id: str,
        frames: List[Tuple[float, np.ndarray]],
        metadata: Dict[str, Any],
        output_filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Encodes an MP4 evidence clip with burned-in forensic overlay.

        Parameters:
            incident_id: Deterministic incident identifier (e.g. 'INC-000001')
            frames: Chronological list of (timestamp, frame_bgr) tuples
            metadata: Incident metadata dictionary containing:
                      camera_id, track_id, class_name, event_type,
                      risk_score, risk_level, zone_name, reasons, etc.
            output_filename: Optional override for the mp4 filename

        Returns:
            Dict containing success status, file_path, frame_count, file_size_bytes, duration_seconds.
        """
        if not frames or len(frames) == 0:
            raise ValueError(f"Cannot write evidence clip for incident '{incident_id}': empty frame list provided.")

        # Filter and validate valid numpy frames
        valid_frames: List[Tuple[float, np.ndarray]] = []
        for ts, frm in frames:
            if frm is not None and isinstance(frm, np.ndarray) and frm.size > 0:
                valid_frames.append((float(ts), frm))

        if not valid_frames:
            raise ValueError(f"Cannot write evidence clip for incident '{incident_id}': no valid non-empty frames found.")

        self._ensure_dir()

        filename = output_filename or f"{incident_id}.mp4"
        file_path = os.path.join(self.evidence_dir, filename)

        first_frame = valid_frames[0][1]
        raw_h, raw_w = first_frame.shape[:2]
        # Align width and height to even numbers for strict H.264 / codec compliance
        w = max(2, (raw_w // 2) * 2)
        h = max(2, (raw_h // 2) * 2)

        # Extract metadata fields
        cam_id = str(metadata.get("camera_id", "CAM-01")).upper()
        track_id = metadata.get("track_id", "N/A")
        cls_name = str(metadata.get("class_name", "person")).upper()
        evt_type = str(metadata.get("event_type", "INCIDENT")).upper()
        risk_score = int(metadata.get("risk_score", 0))
        risk_level = str(metadata.get("risk_level", "HIGH")).upper()
        zone_name = str(metadata.get("zone_name", "RESTRICTED PERIMETER")).upper()
        reasons = metadata.get("reasons", [])

        # Format reasons string
        reason_strs = []
        if isinstance(reasons, list):
            for r in reasons:
                if isinstance(r, dict):
                    code = r.get("code", "")
                    pts = r.get("points", "")
                    reason_strs.append(f"[{code}: +{pts}]")
                else:
                    reason_strs.append(str(r))
        reasons_line = " ".join(reason_strs[:3]) if reason_strs else "[EVIDENCE CAPTURE TRIGGERED]"

        # Color coding for Risk Level (BGR)
        badge_color = (0, 0, 220) if risk_level == "CRITICAL" else (0, 140, 255)

        t_write0 = time.perf_counter()

        # Check for imageio_ffmpeg or system ffmpeg for browser-compliant H.264
        ffmpeg_exe = None
        try:
            import imageio_ffmpeg
            exe = imageio_ffmpeg.get_ffmpeg_exe()
            if exe and os.path.exists(exe):
                ffmpeg_exe = exe
        except Exception:
            ffmpeg_exe = None

        encoded_via_ffmpeg = False
        chosen_path = file_path

        def render_hud_frame(idx: int, frame_ts: float, raw_frame: np.ndarray) -> np.ndarray:
            # Diagnostic conversions: ensure 3-channel uint8
            if raw_frame.ndim == 2:
                raw_frame = cv2.cvtColor(raw_frame, cv2.COLOR_GRAY2BGR)
            elif raw_frame.ndim == 3 and raw_frame.shape[2] == 4:
                raw_frame = cv2.cvtColor(raw_frame, cv2.COLOR_BGRA2BGR)
            elif raw_frame.ndim != 3:
                raw_frame = np.zeros((h, w, 3), dtype=np.uint8)

            if raw_frame.dtype != np.uint8:
                raw_frame = np.clip(raw_frame, 0, 255).astype(np.uint8)

            if raw_frame.shape[1] != w or raw_frame.shape[0] != h:
                raw_frame = cv2.resize(raw_frame, (w, h), interpolation=cv2.INTER_AREA)

            overlaid = raw_frame.copy()

            # 1. Top Forensic Header Bar
            cv2.rectangle(overlaid, (0, 0), (w, 54), (12, 16, 24), -1)
            cv2.line(overlaid, (0, 54), (w, 54), (56, 189, 248), 2)  # Cyan accent border

            cv2.putText(
                overlaid,
                "SEEMADRISHTI AI  //  FORENSIC EVIDENCE RECONSTRUCTION",
                (14, 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.52,
                (56, 189, 248),  # Cyan
                1,
                cv2.LINE_AA,
            )

            utc_dt = datetime.fromtimestamp(frame_ts, tz=timezone.utc)
            utc_str = utc_dt.strftime("%Y-%m-%d %H:%M:%S UTC")

            # Header Right: Timestamp & Frame counter
            cv2.putText(
                overlaid,
                f"{utc_str}  [FRM {idx + 1:04d}/{len(valid_frames):04d}]",
                (max(14, w - 340), 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.42,
                (200, 200, 200),
                1,
                cv2.LINE_AA,
            )

            # Header Sub-bar: Camera, Track, Event Type & Zone
            sub_meta = f"CAM: {cam_id}  |  TRACK: #{track_id} ({cls_name})  |  EVENT: {evt_type}  |  ZONE: {zone_name}"
            cv2.putText(
                overlaid,
                sub_meta,
                (14, 42),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.42,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

            # 2. Top-Right Threat Badge Overlay
            badge_w = 170
            badge_h = 24
            bx = max(0, w - badge_w - 14)
            by = 28
            cv2.rectangle(overlaid, (bx, by), (bx + badge_w, by + badge_h), badge_color, -1)
            cv2.putText(
                overlaid,
                f"RISK: {risk_score}/100 [{risk_level}]",
                (bx + 8, by + 16),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.44,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

            # 3. Bottom Reason Codes & Incident Demarcation
            cv2.rectangle(overlaid, (0, h - 34), (w, h), (12, 16, 24), -1)
            cv2.line(overlaid, (0, h - 34), (w, h - 34), badge_color, 1)

            cv2.putText(
                overlaid,
                f"INCIDENT: {incident_id}  |  INDICATORS: {reasons_line}",
                (14, h - 12),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.42,
                (220, 220, 220),
                1,
                cv2.LINE_AA,
            )

            # Progress indicator bar along the very bottom
            progress = (idx + 1) / len(valid_frames)
            bar_len = int(w * progress)
            cv2.line(overlaid, (0, h - 2), (bar_len, h - 2), (56, 189, 248), 2)

            return overlaid

        # Primary encoding attempt via FFmpeg rawvideo pipe
        if ffmpeg_exe and file_path.endswith(".mp4"):
            import subprocess
            cmd = [
                ffmpeg_exe,
                "-y",
                "-f", "rawvideo",
                "-vcodec", "rawvideo",
                "-s", f"{w}x{h}",
                "-pix_fmt", "bgr24",
                "-r", str(self.fps),
                "-i", "-",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                file_path,
            ]
            try:
                proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                for idx, (frame_ts, raw_frame) in enumerate(valid_frames):
                    hud_frame = render_hud_frame(idx, frame_ts, raw_frame)
                    proc.stdin.write(hud_frame.tobytes())
                proc.stdin.close()
                proc.communicate(timeout=30)
                if proc.returncode == 0 and os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    encoded_via_ffmpeg = True
                    chosen_path = file_path
            except Exception:
                encoded_via_ffmpeg = False

        # Fallback to OpenCV VideoWriter if FFmpeg was not used or failed
        if not encoded_via_ffmpeg:
            codecs_to_try = [
                ("avc1", ".mp4"),
                ("mp4v", ".mp4"),
                ("H264", ".mp4"),
                ("XVID", ".avi"),
            ]
            writer = None
            for fourcc_str, ext in codecs_to_try:
                test_path = file_path if file_path.endswith(ext) else os.path.splitext(file_path)[0] + ext
                try:
                    fourcc = cv2.VideoWriter_fourcc(*fourcc_str)
                    test_writer = cv2.VideoWriter(test_path, fourcc, self.fps, (w, h))
                    if test_writer.isOpened():
                        writer = test_writer
                        chosen_path = test_path
                        break
                except Exception:
                    continue

            if writer is None or not writer.isOpened():
                raise RuntimeError(f"OpenCV failed to initialize VideoWriter for '{file_path}' across all fallback codecs.")

            try:
                for idx, (frame_ts, raw_frame) in enumerate(valid_frames):
                    hud_frame = render_hud_frame(idx, frame_ts, raw_frame)
                    writer.write(hud_frame)
            finally:
                writer.release()

        write_duration_ms = (time.perf_counter() - t_write0) * 1000.0

        if not os.path.exists(chosen_path):
            raise RuntimeError(f"Evidence file was not created at expected path: '{chosen_path}'")

        file_size = os.path.getsize(chosen_path)
        if file_size == 0:
            raise RuntimeError(f"Evidence file was written with 0 bytes: '{chosen_path}'")

        # HTML5 Browser Playback Compatibility Fix (H.264 / yuv420p):
        # Native web browsers cannot decode MPEG-4 'mp4v' in HTML5 <video> elements.
        # Transcode to standard H.264 baseline/high profile with yuv420p and faststart flags.
        ffmpeg_bin = shutil.which("ffmpeg") or ("/usr/bin/ffmpeg" if os.path.isfile("/usr/bin/ffmpeg") else None)
        if ffmpeg_bin and os.path.exists(chosen_path):
            try:
                web_mp4_path = os.path.splitext(chosen_path)[0] + "_h264.mp4"
                cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-i", chosen_path,
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "ultrafast",
                    "-movflags", "+faststart",
                    web_mp4_path,
                ]
                proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
                if proc.returncode == 0 and os.path.exists(web_mp4_path) and os.path.getsize(web_mp4_path) > 0:
                    os.replace(web_mp4_path, chosen_path)
                    file_size = os.path.getsize(chosen_path)
            except Exception as e:
                logger.debug(f"ffmpeg H.264 transcode fallback notice: {e}")

        # Compute SHA-256 cryptographic digest of finalized MP4
        hasher = hashlib.sha256()
        with open(chosen_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        sha256_digest = hasher.hexdigest()

        # Step 5: Recording Validation & Pixel Variance Check
        verification_status = "FAILED"
        reopen_frames = 0
        reopen_fps = self.fps
        first_frame_var = 0.0
        try:
            check_cap = cv2.VideoCapture(chosen_path)
            if check_cap.isOpened():
                reopen_frames = int(check_cap.get(cv2.CAP_PROP_FRAME_COUNT))
                reopen_fps = check_cap.get(cv2.CAP_PROP_FPS) or self.fps
                ret_chk, frame_chk = check_cap.read()
                if ret_chk and frame_chk is not None:
                    first_frame_var = float(np.var(frame_chk))
                check_cap.release()
                if reopen_frames > 0 and file_size > 0:
                    verification_status = "VERIFIED"
        except Exception:
            verification_status = "FAILED"

        # Standardize relative path for database storage
        rel_path = os.path.relpath(chosen_path, os.getcwd()).replace("\\", "/")

        return {
            "success": True,
            "incident_id": incident_id,
            "file_path": rel_path,
            "absolute_path": os.path.abspath(chosen_path),
            "frame_count": len(valid_frames),
            "file_size_bytes": file_size,
            "video_duration_seconds": round(len(valid_frames) / self.fps, 2),
            "write_duration_ms": round(write_duration_ms, 2),
            "fps": self.fps,
            "resolution": f"{w}x{h}",
            "sha256": sha256_digest,
            "verification_status": verification_status,
            "first_frame_variance": round(first_frame_var, 2),
        }

    @staticmethod
    def calculate_sha256(file_path: str) -> str:
        """Computes hexadecimal SHA-256 hash of a file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def verify_evidence_file(
        file_path: str,
        expected_sha256: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validates an existing MP4 evidence file on disk:
        1. Checks file exists and is non-empty
        2. Verifies OpenCV can reopen the video and read frames
        3. Computes SHA-256 and compares with expected digest if provided
        """
        if not os.path.exists(file_path):
            return {"valid": False, "status": "FAILED", "error": f"File not found: {file_path}"}

        size = os.path.getsize(file_path)
        if size == 0:
            return {"valid": False, "status": "FAILED", "error": "File is empty (0 bytes)"}

        # SHA-256
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        digest = hasher.hexdigest()

        if expected_sha256 and digest.lower() != expected_sha256.lower():
            return {
                "valid": False,
                "status": "FAILED",
                "sha256": digest,
                "error": f"SHA-256 mismatch: computed {digest} vs expected {expected_sha256}",
            }

        # OpenCV Reopen test
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return {
                "valid": False,
                "status": "FAILED",
                "sha256": digest,
                "error": "OpenCV failed to decode video container",
            }

        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
        cap.release()

        if frames <= 0:
            return {
                "valid": False,
                "status": "FAILED",
                "sha256": digest,
                "error": "Video container has zero frames",
            }

        duration = round(frames / fps, 2)
        return {
            "valid": True,
            "status": "VERIFIED",
            "sha256": digest,
            "file_size": size,
            "frame_count": frames,
            "fps": round(fps, 2),
            "duration": duration,
        }


# Module level alias for convenience
verify_evidence_file = EvidenceWriter.verify_evidence_file


