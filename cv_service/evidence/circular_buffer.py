import time
from collections import deque
from typing import Dict, List, Optional, Tuple
import numpy as np


class CircularFrameBuffer:
    """
    Bounded in-memory circular frame buffer partitioned by camera_id.
    Continuously ingests real video frames, automatically evicts frames
    older than the pre-event retention window, and bounds memory capacity.
    """

    def __init__(
        self,
        pre_event_seconds: float = 10.0,
        max_fps: float = 30.0,
        capacity_multiplier: float = 1.5,
        capacity_seconds: Optional[float] = None,
        fps: Optional[float] = None,
        **kwargs,
    ):
        if capacity_seconds is not None:
            pre_event_seconds = capacity_seconds
        if fps is not None:
            max_fps = fps
        self.pre_event_seconds = float(pre_event_seconds)
        self.max_fps = float(max_fps)
        # Bounded frame capacity per camera to guarantee memory safety
        self.max_capacity = max(10, int(self.pre_event_seconds * self.max_fps * capacity_multiplier))
        self._buffers: Dict[str, deque] = {}

    def _normalize_cam_id(self, camera_id: str) -> str:
        return str(camera_id).strip().lower()

    def _get_buffer(self, camera_id: str) -> deque:
        cid = self._normalize_cam_id(camera_id)
        if cid not in self._buffers:
            self._buffers[cid] = deque(maxlen=self.max_capacity)
        return self._buffers[cid]

    def push(
        self,
        camera_id: str,
        frame: np.ndarray,
        timestamp: Optional[float] = None,
    ) -> None:
        """
        Pushes a real video frame into the camera's circular buffer.
        Evicts expired frames older than pre_event_seconds.
        """
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            return

        ts = float(timestamp) if timestamp is not None else time.time()
        buf = self._get_buffer(camera_id)

        # Store deep copy so subsequent frame processing/drawing does not mutate buffered frame
        buf.append((ts, frame.copy()))

        # Evict old frames outside pre-event duration
        cutoff = ts - self.pre_event_seconds
        while len(buf) > 0 and buf[0][0] < cutoff:
            buf.popleft()

    def get_pre_event_frames(
        self,
        camera_id: str,
        trigger_time: Optional[float] = None,
        duration_seconds: Optional[float] = None,
    ) -> List[Tuple[float, np.ndarray]]:
        """
        Retrieves pre-event frames up to trigger_time for the specified duration.
        Returns a list of (timestamp, frame) tuples.
        """
        cid = self._normalize_cam_id(camera_id)
        buf = self._buffers.get(cid)
        if not buf or len(buf) == 0:
            return []

        t_end = float(trigger_time) if trigger_time is not None else time.time()
        dur = float(duration_seconds) if duration_seconds is not None else self.pre_event_seconds
        t_start = t_end - dur

        result: List[Tuple[float, np.ndarray]] = []
        for ts, frm in buf:
            if t_start <= ts <= t_end:
                result.append((ts, frm.copy()))

        # If strict window filtered out everything but buffer had frames preceding trigger, return available frames
        if not result and len(buf) > 0:
            for ts, frm in buf:
                if ts <= t_end:
                    result.append((ts, frm.copy()))

        # Fallback to all available buffer frames if still empty
        if not result and len(buf) > 0:
            for ts, frm in buf:
                result.append((ts, frm.copy()))

        return result

    def get_frame_count(self, camera_id: str) -> int:
        """Returns the number of buffered frames for a specific camera."""
        cid = self._normalize_cam_id(camera_id)
        buf = self._buffers.get(cid)
        return len(buf) if buf else 0

    def get_oldest_timestamp(self, camera_id: str) -> Optional[float]:
        cid = self._normalize_cam_id(camera_id)
        buf = self._buffers.get(cid)
        return buf[0][0] if buf and len(buf) > 0 else None

    def get_newest_timestamp(self, camera_id: str) -> Optional[float]:
        cid = self._normalize_cam_id(camera_id)
        buf = self._buffers.get(cid)
        return buf[-1][0] if buf and len(buf) > 0 else None

    def clear(self, camera_id: Optional[str] = None) -> None:
        """Clears buffers for one or all cameras."""
        if camera_id is not None:
            cid = self._normalize_cam_id(camera_id)
            if cid in self._buffers:
                self._buffers[cid].clear()
        else:
            self._buffers.clear()

