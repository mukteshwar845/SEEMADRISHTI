"""
SEEMADRISHTI AI - Low-Light Detector (Phase 9)

Team: IQ100
SIH Problem: SIH26187

Specialized low-light analysis combining multi-metric thresholds:
- Average luminance
- Dark pixel percentage
- Contrast degradation
- Visibility degradation score
"""

from typing import Tuple, Dict, Any
import numpy as np
import cv2


class LowLightDetector:
    """
    Evaluates whether optical conditions require active low-light compensation.
    """

    def __init__(
        self,
        luminance_threshold: float = 75.0,
        dark_pixel_threshold: float = 0.50,
        contrast_threshold: float = 25.0,
        visibility_threshold: float = 50.0,
    ):
        self.luminance_threshold = luminance_threshold
        self.dark_pixel_threshold = dark_pixel_threshold
        self.contrast_threshold = contrast_threshold
        self.visibility_threshold = visibility_threshold

    def evaluate(self, frame: np.ndarray) -> Tuple[bool, Dict[str, Any]]:
        """
        Analyze frame and return (is_low_light, metrics_dict).
        """
        if frame is None or frame.size == 0:
            return False, {"error": "empty_frame"}

        # Convert to Grayscale
        if len(frame.shape) == 3 and frame.shape[2] >= 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame

        mean_luminance = float(np.mean(gray))
        contrast = float(np.std(gray))
        dark_pixels = int(np.count_nonzero(gray < 30))
        dark_pixel_ratio = float(dark_pixels / max(gray.size, 1))

        # Composite visibility score
        visibility = max(
            0.0,
            min(
                100.0,
                (contrast * 1.1) + (mean_luminance * 0.25) - (dark_pixel_ratio * 35.0),
            ),
        )

        # Multi-metric voting
        indicators = [
            mean_luminance <= self.luminance_threshold,
            dark_pixel_ratio >= self.dark_pixel_threshold,
            contrast <= self.contrast_threshold,
            visibility <= self.visibility_threshold,
        ]

        # Low light is confirmed if at least 2 indicators trigger
        is_low_light = sum(indicators) >= 2

        details = {
            "is_low_light": is_low_light,
            "mean_luminance": round(mean_luminance, 2),
            "contrast": round(contrast, 2),
            "dark_pixel_ratio": round(dark_pixel_ratio, 4),
            "visibility_score": round(visibility, 2),
            "triggered_indicators": int(sum(indicators)),
        }

        return is_low_light, details
