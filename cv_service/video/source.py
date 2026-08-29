"""
SEEMADRISHTI AI - Video Ingestion & Source Abstraction Engine (Phase 13)
Team: IQ100
SIH Problem Statement: SIH26187

Standardized video ingestion layer supporting:
- RTSP / RTSPS network streams (CCTV edge devices)
- MP4 / AVI / MKV local video files
- Physical / Virtual USB Webcams

Exposes measured FPS (calculated from real frame intervals), frame dimensions,
connection state, frame timestamps, and reconnection handling.
"""

import os
import time
from abc import ABC, abstractmethod
from collections import deque
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np


class VideoSource(ABC):
    """Abstract base class representing a generic video ingestion source."""

    def __init__(self, camera_id: str = "cam-01"):
        self.camera_id = camera_id
        self.connected: bool = False
        self.last_frame_timestamp: float = 0.0
        self.frame_index: int = 0
        self.reconnect_attempts: int = 0
        self.last_error: Optional[str] = None
        self._recent_timestamps: deque = deque(maxlen=30)
        self._width: int = 0
        self._height: int = 0
        self._nominal_fps: float = 30.0

    @abstractmethod
    def open(self) -> bool:
        """Open the video stream or device. Return True on success."""
        pass

    @abstractmethod
    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Read next frame as BGR numpy array. Return (success, frame)."""
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Return stream metadata."""
        pass

    @abstractmethod
    def release(self) -> None:
        """Release underlying video capture resources."""
        pass

    @property
    @abstractmethod
    def source_type(self) -> str:
        """Return the source type descriptor."""
        pass

    @property
    def measured_fps(self) -> float:
        """Calculates real measured FPS from recent frame timestamps."""
        if len(self._recent_timestamps) < 2:
            return round(self._nominal_fps, 2)
        span = self._recent_timestamps[-1] - self._recent_timestamps[0]
        if span <= 0:
            return round(self._nominal_fps, 2)
        calculated = (len(self._recent_timestamps) - 1) / span
        return round(min(120.0, max(0.1, calculated)), 2)

    def _record_frame_arrival(self) -> float:
        now = time.time()
        self.last_frame_timestamp = now
        self._recent_timestamps.append(now)
        return now

    def get_status(self) -> Dict[str, Any]:
        """Returns unified runtime telemetry as required by Phase 13 and 14."""
        status = {
            "cameraId": self.camera_id,
            "sourceType": self.source_type,
            "connected": self.connected,
            "frameWidth": self._width,
            "frameHeight": self._height,
            "frameIndex": self.frame_index,
            "measuredFps": self.measured_fps,
            "lastFrameTimestamp": self.last_frame_timestamp,
            "reconnectAttempts": self.reconnect_attempts,
            "error": self.last_error,
        }
        if hasattr(self, "get_playback_position"):
            status["playback"] = self.get_playback_position()
        return status


class MP4Source(VideoSource):
    """Video ingestion from local MP4 video file using OpenCV."""

    def __init__(self, file_path: str, loop: bool = True, camera_id: str = "cam-01", on_loop=None):
        super().__init__(camera_id=camera_id)
        self.file_path = file_path
        self.loop = loop
        self.on_loop = on_loop
        self.cap: Optional[cv2.VideoCapture] = None
        self._total_frames: int = 0
        self._current_frame: int = 0
        self.loop_count: int = 0
        self.did_loop: bool = False

    @property
    def source_type(self) -> str:
        return "mp4"

    @property
    def total_frames(self) -> int:
        return self._total_frames

    def open(self) -> bool:
        if not os.path.exists(self.file_path):
            self.connected = False
            self.last_error = f"Video file not found: '{self.file_path}'"
            raise FileNotFoundError(f"[MP4Source] {self.last_error}")

        self.cap = cv2.VideoCapture(self.file_path)
        if not self.cap.isOpened():
            self.connected = False
            self.last_error = f"OpenCV failed to open: '{self.file_path}'"
            raise RuntimeError(f"[MP4Source] {self.last_error}")

        self._nominal_fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self._total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self._current_frame = 0
        self.frame_index = 0
        self.loop_count = 0
        self.did_loop = False
        self.connected = True
        self.last_error = None
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            self.connected = False
            return False, None

        ret, frame = self.cap.read()
        self._current_frame += 1

        if not ret or frame is None:
            if self.loop and self._total_frames > 0:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self._current_frame = 0
                self.loop_count += 1
                self.did_loop = True
                if callable(self.on_loop):
                    try:
                        self.on_loop()
                    except Exception:
                        pass
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    self._current_frame = 1
                    self.frame_index += 1
                    self._record_frame_arrival()
                    self.connected = True
                    return True, frame
            self.connected = False
            return False, None

        self.did_loop = False
        self.frame_index += 1
        self._record_frame_arrival()
        self.connected = True
        return True, frame

    def get_playback_position(self) -> Dict[str, Any]:
        return {
            "current_frame": self._current_frame,
            "total_frames": self._total_frames,
            "loop_count": self.loop_count,
            "progress_percent": round((self._current_frame / max(1, self._total_frames)) * 100, 1),
        }

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "path": self.file_path,
            "fps": self.measured_fps,
            "nominal_fps": round(self._nominal_fps, 2),
            "width": self._width,
            "height": self._height,
            "total_frames": self._total_frames,
            "current_frame": self._current_frame,
            "loop_count": self.loop_count,
            "connected": self.connected,
        }

    def release(self) -> None:
        if self.cap:
            self.cap.release()
            self.cap = None
        self.connected = False


class WebcamSource(VideoSource):
    """Video ingestion from physical or virtual webcam using OpenCV."""

    def __init__(self, device_index: int = 0, camera_id: str = "cam-01"):
        super().__init__(camera_id=camera_id)
        self.device_index = int(device_index)
        self.cap: Optional[cv2.VideoCapture] = None

    @property
    def source_type(self) -> str:
        return "webcam"

    def open(self) -> bool:
        self.cap = cv2.VideoCapture(self.device_index)
        if not self.cap.isOpened():
            self.connected = False
            self.last_error = f"Device index {self.device_index} unavailable"
            raise RuntimeError(f"[WebcamSource] {self.last_error}")

        self._nominal_fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.connected = True
        self.last_error = None
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            self.connected = False
            return False, None

        ret, frame = self.cap.read()
        if not ret or frame is None:
            self.connected = False
            self.last_error = "Frame read failed"
            return False, None

        self._record_frame_arrival()
        self.connected = True
        return True, frame

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "device_index": self.device_index,
            "fps": self.measured_fps,
            "nominal_fps": round(self._nominal_fps, 2),
            "width": self._width,
            "height": self._height,
            "connected": self.connected,
        }

    def release(self) -> None:
        if self.cap:
            self.cap.release()
            self.cap = None
        self.connected = False


class RTSPSource(VideoSource):
    """
    RTSP network stream video ingestion with automated reconnection
    and transport error recovery.
    """

    def __init__(
        self,
        rtsp_url: str,
        camera_id: str = "cam-01",
        max_reconnect_attempts: int = 5,
        reconnect_cooldown_sec: float = 2.0,
    ):
        super().__init__(camera_id=camera_id)
        self.rtsp_url = rtsp_url
        self.max_reconnect_attempts = int(max_reconnect_attempts)
        self.reconnect_cooldown_sec = float(reconnect_cooldown_sec)
        self.cap: Optional[cv2.VideoCapture] = None
        self._last_reconnect_time: float = 0.0

    @property
    def source_type(self) -> str:
        return "rtsp"

    def open(self) -> bool:
        # Set environment options for low latency network streams where supported
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|max_delay;500000"
        
        self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        if not self.cap.isOpened():
            self.connected = False
            self.last_error = f"Failed to connect to RTSP URL: '{self.rtsp_url}'"
            return False

        self._nominal_fps = self.cap.get(cv2.CAP_PROP_FPS) or 25.0
        self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.connected = True
        self.last_error = None
        self.reconnect_attempts = 0
        return True

    def reconnect(self) -> bool:
        """Attempts safe reconnection without leaking previous capture instances."""
        now = time.time()
        if (now - self._last_reconnect_time) < self.reconnect_cooldown_sec:
            return False

        self._last_reconnect_time = now
        self.reconnect_attempts += 1
        self.release()

        try:
            success = self.open()
            if success:
                self.reconnect_attempts = 0
                return True
        except Exception as e:
            self.last_error = str(e)

        return False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            self.connected = False
            return False, None

        ret, frame = self.cap.read()
        if not ret or frame is None:
            self.connected = False
            self.last_error = "RTSP frame stream disconnected"
            return False, None

        self._record_frame_arrival()
        self.connected = True
        return True, frame

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "url": self.rtsp_url,
            "fps": self.measured_fps,
            "nominal_fps": round(self._nominal_fps, 2),
            "width": self._width,
            "height": self._height,
            "connected": self.connected,
            "reconnect_attempts": self.reconnect_attempts,
        }

    def release(self) -> None:
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.connected = False


def create_video_source(
    source_input: Any = None,
    loop: bool = True,
    camera_id: str = "cam-01",
    source_type: Optional[str] = None,
    source_uri: Optional[str] = None,
) -> VideoSource:
    """Factory helper to instantiate appropriate VideoSource."""
    uri = source_uri if source_uri is not None else source_input
    stype = (source_type or "").lower().strip()

    if stype == "webcam" or isinstance(uri, int) or (isinstance(uri, str) and str(uri).isdigit()):
        dev_idx = int(uri) if uri is not None and str(uri).isdigit() else 0
        return WebcamSource(device_index=dev_idx, camera_id=camera_id)

    uri_str = str(uri or "").strip()
    if stype == "rtsp" or uri_str.startswith("rtsp://") or uri_str.startswith("rtsps://"):
        return RTSPSource(rtsp_url=uri_str, camera_id=camera_id)

    return MP4Source(file_path=uri_str, loop=loop, camera_id=camera_id)
