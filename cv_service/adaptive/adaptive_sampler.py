"""
SEEMADRISHTI AI - Adaptive Frame Sampler (Phase 9)

Team: IQ100
SIH Problem: SIH26187

Dynamic frame sampling policy reacting to:
- Environmental illumination (Day vs Night / Low Light)
- Security trigger states (Intrusion, Loitering, Risk >= HIGH, Active Threat)
"""

from typing import Dict, Tuple


class AdaptiveSampler:
    """
    Dynamically adjusts frame sampling frequency to balance edge compute efficiency
    with tactical surveillance vigilance.
    """

    def __init__(
        self,
        normal_skip: int = 3,
        night_skip: int = 2,
        threat_skip: int = 1,
        threat_cooldown_frames: int = 25,
    ):
        self.normal_skip = max(1, int(normal_skip))
        self.night_skip = max(1, int(night_skip))
        self.threat_skip = max(1, int(threat_skip))
        self.threat_cooldown_frames = max(1, int(threat_cooldown_frames))

        # Remaining high-priority threat frames per camera: camera_id -> int
        self._threat_counter: Dict[str, int] = {}

    def register_threat(self, camera_id: str, duration_frames: int = 25) -> None:
        """Elevate camera processing priority due to an active security trigger."""
        self._threat_counter[camera_id] = max(
            self._threat_counter.get(camera_id, 0), duration_frames
        )

    def should_process_frame(
        self,
        camera_id: str,
        frame_index: int,
        environment_mode: str = "DAY",
        has_active_threat: bool = False,
    ) -> Tuple[bool, int, str]:
        """
        Determines whether the current frame should be sent through the CV inference pipeline.

        Returns:
            Tuple of (should_process: bool, skip_ratio: int, policy_name: str)
        """
        # If external threat is signaled, rearm cooldown
        if has_active_threat:
            self.register_threat(camera_id, self.threat_cooldown_frames)

        threat_remaining = self._threat_counter.get(camera_id, 0)

        # Policy Resolution
        if threat_remaining > 0:
            policy = "THREAT_PRIORITY"
            skip_ratio = self.threat_skip
            self._threat_counter[camera_id] = threat_remaining - 1
        elif environment_mode in ("NIGHT", "LOW_LIGHT", "DUSK"):
            policy = "NIGHT_SAMPLING"
            skip_ratio = self.night_skip
        else:
            policy = "NORMAL"
            skip_ratio = self.normal_skip

        # Process when frame_index is a multiple of skip_ratio
        should_process = (frame_index % skip_ratio) == 0

        return should_process, skip_ratio, policy

    def get_current_skip_ratio(self, camera_id: str, environment_mode: str = "DAY") -> int:
        """Query currently active frame skip ratio for reporting."""
        if self._threat_counter.get(camera_id, 0) > 0:
            return self.threat_skip
        if environment_mode in ("NIGHT", "LOW_LIGHT", "DUSK"):
            return self.night_skip
        return self.normal_skip

    def reset(self, camera_id: str) -> None:
        """Reset threat state for a camera."""
        self._threat_counter.pop(camera_id, None)
