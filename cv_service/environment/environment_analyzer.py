"""
SEEMADRISHTI AI - Environment Analyzer (Phase 9)

Team: IQ100
SIH Problem: SIH26187

Pixel-level real illumination, contrast, visibility, and day/night/low-light
classification engine for tactical CCTV surveillance streams.
Maintains state independently per camera_id. Zero fake AI.
"""

import time
from dataclasses import dataclass, asdict
from typing import Dict, Optional, Tuple, Any
import numpy as np
import cv2


@dataclass
class EnvironmentMetrics:
    camera_id: str
    mode: str  # 'DAY', 'DAWN', 'DUSK', 'NIGHT', 'LOW_LIGHT'
    brightness: float  # 0.0 to 255.0
    contrast: float  # 0.0 to 127.0 (std deviation of grayscale intensities)
    dark_pixel_ratio: float  # 0.0 to 1.0 (fraction of pixels with value < 30)
    visibility_score: float  # 0.0 to 100.0 (composite perception clarity)
    low_light: bool  # True when scene illumination or contrast degrades below operational thresholds
    confidence: float  # 0.0 to 1.0 (statistical classification certainty)
    timestamp: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class EnvironmentAnalyzer:
    """
    Deterministic environmental illumination and scene visibility analyzer.
    Analyzes raw frame pixel distributions using OpenCV.
    """

    def __init__(
        self,
        night_brightness_threshold: float = 40.0,
        low_light_brightness_threshold: float = 75.0,
        low_light_contrast_threshold: float = 25.0,
        dawn_threshold: float = 90.0,
        dusk_threshold: float = 60.0,
        analysis_resolution: Tuple[int, int] = (320, 180),
    ):
        self.night_brightness_threshold = float(night_brightness_threshold)
        self.low_light_brightness_threshold = float(low_light_brightness_threshold)
        self.low_light_contrast_threshold = float(low_light_contrast_threshold)
        self.dawn_threshold = float(dawn_threshold)
        self.dusk_threshold = float(dusk_threshold)
        self.analysis_resolution = analysis_resolution

        # Independent environmental states per camera: camera_id -> EnvironmentMetrics
        self._camera_states: Dict[str, EnvironmentMetrics] = {}

    def analyze_frame(
        self,
        frame: np.ndarray,
        camera_id: str = "cam-01",
        current_time: Optional[float] = None,
    ) -> EnvironmentMetrics:
        """
        Extract measurable optical metrics from the frame and determine environmental mode.
        """
        now = current_time if current_time is not None else time.time()

        if frame is None or frame.size == 0:
            fallback = EnvironmentMetrics(
                camera_id=camera_id,
                mode="DAY",
                brightness=128.0,
                contrast=45.0,
                dark_pixel_ratio=0.0,
                visibility_score=80.0,
                low_light=False,
                confidence=0.5,
                timestamp=now,
            )
            self._camera_states[camera_id] = fallback
            return fallback

        # Optional downsampling for sub-millisecond evaluation speed
        h, w = frame.shape[:2]
        if w > self.analysis_resolution[0] or h > self.analysis_resolution[1]:
            sample_frame = cv2.resize(
                frame, self.analysis_resolution, interpolation=cv2.INTER_NEAREST
            )
        else:
            sample_frame = frame

        # Convert to single-channel 8-bit grayscale
        if len(sample_frame.shape) == 3 and sample_frame.shape[2] == 3:
            gray = cv2.cvtColor(sample_frame, cv2.COLOR_BGR2GRAY)
        elif len(sample_frame.shape) == 3 and sample_frame.shape[2] == 4:
            gray = cv2.cvtColor(sample_frame, cv2.COLOR_BGRA2GRAY)
        else:
            gray = sample_frame

        # 1. Luminance Mean (Brightness: 0 - 255)
        brightness = float(np.mean(gray))

        # 2. Standard Deviation of Intensities (Contrast: 0 - 127)
        contrast = float(np.std(gray))

        # 3. Ratio of Deep Dark Pixels (intensity < 30)
        dark_pixels = int(np.count_nonzero(gray < 30))
        total_pixels = int(gray.size)
        dark_pixel_ratio = float(dark_pixels / max(total_pixels, 1))

        # 4. Visibility Score (0 to 100)
        # Higher contrast and moderate brightness improve visibility; heavy dark ratio penalizes it.
        contrast_factor = min(contrast / 45.0, 1.2) * 50.0
        brightness_factor = min(brightness / 128.0, 1.0) * 40.0
        dark_penalty = dark_pixel_ratio * 40.0
        raw_visibility = (contrast_factor + brightness_factor) - dark_penalty
        visibility_score = round(max(0.0, min(100.0, raw_visibility)), 2)

        # 5. Deterministic Mode Classification
        # Mode Hierarchy: NIGHT -> DUSK -> LOW_LIGHT -> DAWN -> DAY
        if brightness <= self.night_brightness_threshold or dark_pixel_ratio >= 0.70:
            mode = "NIGHT"
            low_light = True
            confidence = min(1.0, 0.70 + (self.night_brightness_threshold - brightness) / 100.0)
        elif brightness <= self.dusk_threshold and contrast < self.low_light_contrast_threshold:
            mode = "DUSK"
            low_light = True
            confidence = 0.85
        elif brightness <= self.low_light_brightness_threshold or (
            contrast <= self.low_light_contrast_threshold and brightness <= self.dawn_threshold
        ):
            mode = "LOW_LIGHT"
            low_light = True
            confidence = min(1.0, 0.65 + (self.low_light_brightness_threshold - brightness) / 100.0)
        elif brightness <= self.dawn_threshold:
            mode = "DAWN"
            low_light = False
            confidence = 0.80
        else:
            mode = "DAY"
            low_light = False
            confidence = min(1.0, 0.75 + (brightness - self.dawn_threshold) / 200.0)

        metrics = EnvironmentMetrics(
            camera_id=camera_id,
            mode=mode,
            brightness=round(brightness, 2),
            contrast=round(contrast, 2),
            dark_pixel_ratio=round(dark_pixel_ratio, 4),
            visibility_score=visibility_score,
            low_light=low_light,
            confidence=round(max(0.5, min(1.0, confidence)), 3),
            timestamp=now,
        )

        self._camera_states[camera_id] = metrics
        return metrics

    def get_latest_metrics(self, camera_id: str) -> Optional[EnvironmentMetrics]:
        """Retrieve cached environment state for a specific camera."""
        return self._camera_states.get(camera_id)

    def get_all_camera_states(self) -> Dict[str, EnvironmentMetrics]:
        """Retrieve latest environmental state across all active surveillance cameras."""
        return dict(self._camera_states)
