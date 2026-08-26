import os
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple
import cv2
import numpy as np

class VideoSource(ABC):
    """Abstract base class representing a generic video ingestion source."""

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
        """Return stream metadata (fps, width, height, frame_count)."""
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


class MP4Source(VideoSource):
    """Video ingestion from local MP4 video file using OpenCV."""

    def __init__(self, file_path: str, loop: bool = True):
        self.file_path = file_path
        self.loop = loop
        self.cap: Optional[cv2.VideoCapture] = None
        self._fps: float = 30.0
        self._width: int = 0
        self._height: int = 0
        self._total_frames: int = 0
        self._current_frame: int = 0

    @property
    def source_type(self) -> str:
        return "mp4"

    def open(self) -> bool:
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(
                f"[MP4Source] Video file does not exist: '{self.file_path}'"
            )

        self.cap = cv2.VideoCapture(self.file_path)
        if not self.cap.isOpened():
            raise RuntimeError(
                f"[MP4Source] OpenCV failed to open video file: '{self.file_path}'"
            )

        self._fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self._total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self._current_frame = 0
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            return False, None

        ret, frame = self.cap.read()
        self._current_frame += 1

        # Handle End of File (EOF)
        if not ret or frame is None:
            if self.loop and self._total_frames > 0:
                # Rewind to frame 0
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self._current_frame = 0
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    return True, frame
            return False, None

        return True, frame

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "path": self.file_path,
            "fps": round(self._fps, 2),
            "width": self._width,
            "height": self._height,
            "total_frames": self._total_frames,
            "current_frame": self._current_frame,
        }

    def release(self) -> None:
        if self.cap:
            self.cap.release()
            self.cap = None


class WebcamSource(VideoSource):
    """Video ingestion from physical or virtual webcam using OpenCV."""

    def __init__(self, device_index: int = 0):
        self.device_index = device_index
        self.cap: Optional[cv2.VideoCapture] = None
        self._fps: float = 30.0
        self._width: int = 0
        self._height: int = 0

    @property
    def source_type(self) -> str:
        return "webcam"

    def open(self) -> bool:
        self.cap = cv2.VideoCapture(self.device_index)
        if not self.cap.isOpened():
            raise RuntimeError(
                f"[WebcamSource] Unable to access camera device index {self.device_index}. "
                "Ensure a webcam is physically connected and permissions are granted."
            )

        self._fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            return False, None

        ret, frame = self.cap.read()
        if not ret or frame is None:
            return False, None
        return True, frame

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "device_index": self.device_index,
            "fps": round(self._fps, 2),
            "width": self._width,
            "height": self._height,
        }

    def release(self) -> None:
        if self.cap:
            self.cap.release()
            self.cap = None


class RTSPSource(VideoSource):
    """RTSP Stream Source placeholder designed for Phase 3+."""

    def __init__(self, rtsp_url: str):
        self.rtsp_url = rtsp_url

    @property
    def source_type(self) -> str:
        return "rtsp"

    def open(self) -> bool:
        raise NotImplementedError(
            "[RTSPSource] Full RTSP ingestion with GStreamer/FFmpeg buffer is scheduled for Phase 3. "
            "Please use MP4Source or WebcamSource for Phase 2."
        )

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        return False, None

    def get_metadata(self) -> Dict[str, Any]:
        return {"source_type": self.source_type, "url": self.rtsp_url}

    def release(self) -> None:
        pass


def create_video_source(source_input: Any, loop: bool = True) -> VideoSource:
    """Factory helper to instantiate appropriate VideoSource."""
    if isinstance(source_input, int) or (isinstance(source_input, str) and source_input.isdigit()):
        return WebcamSource(device_index=int(source_input))

    source_str = str(source_input)
    if source_str.startswith("rtsp://") or source_str.startswith("rtsps://"):
        return RTSPSource(source_str)

    return MP4Source(source_str, loop=loop)
