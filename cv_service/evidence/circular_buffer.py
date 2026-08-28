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
    ):
        self.pre_event_seconds = float(pre_event_seconds)
        self.max_fps = float(max_fps)
        # Bounded frame capacity per camera to guarantee memory safety
        self.max_capacity = max(10, int(self.pre_event_seconds * self.max_fps * capacity_multiplier))
        self._buffers: Dict[str, deque] = {}

    def _get_buffer(self, camera_id: str) -> deque:
        if camera_id not in self._buffers:
            self._buffers[camera_id] = deque(maxlen=self.max_capacity)
        return self._buffers[camera_id]

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
        if frame is None or not isinstance(frame, np.ndarray):
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
        buf = self._buffers.get(camera_id)
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

        return result

    def get_frame_count(self, camera_id: str) -> int:
        """Returns the number of buffered frames for a specific camera."""
        buf = self._buffers.get(camera_id)
        return len(buf) if buf else 0

    def get_oldest_timestamp(self, camera_id: str) -> Optional[float]:
        buf = self._buffers.get(camera_id)
        return buf[0][0] if buf and len(buf) > 0 else None

    def get_newest_timestamp(self, camera_id: str) -> Optional[float]:
        buf = self._buffers.get(camera_id)
        return buf[-1][0] if buf and len(buf) > 0 else None

    def clear(self, camera_id: Optional[str] = None) -> None:
        """Clears buffers for one or all cameras."""
        if camera_id is not None:
            if camera_id in self._buffers:
                self._buffers[camera_id].clear()
        else:
            self._buffers.clear()
