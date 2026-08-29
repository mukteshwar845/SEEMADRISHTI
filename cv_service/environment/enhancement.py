"""
SEEMADRISHTI AI - Low-Light Enhancement Module (Phase 9)

Team: IQ100
SIH Problem: SIH26187

Non-destructive optical enhancement for detection inference:
- CLAHE (Contrast Limited Adaptive Histogram Equalization) on LAB L-channel
- Non-linear Gamma Correction
- Original input frames are strictly preserved and never mutated (Rule #7)
"""

from typing import Optional
import numpy as np
import cv2


class LowLightEnhancer:
    """
    Provides fast, edge-optimized low-light image enhancement for YOLO inference.
    """

    def __init__(
        self,
        default_method: str = "clahe",
        clahe_clip_limit: float = 3.0,
        clahe_tile_grid: tuple = (8, 8),
        gamma: float = 1.5,
    ):
        self.default_method = default_method.lower()
        self.clahe_clip_limit = float(clahe_clip_limit)
        self.clahe_tile_grid = clahe_tile_grid
        self.gamma = float(gamma)

        # Precompute gamma lookup table for fast O(1) pixel transformation
        inv_gamma = 1.0 / max(self.gamma, 0.1)
        self._gamma_table = np.array(
            [((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]
        ).astype("uint8")

        # Initialize CLAHE operator
        self._clahe = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit, tileGridSize=self.clahe_tile_grid
        )

    def enhance(self, frame: np.ndarray, method: Optional[str] = None) -> np.ndarray:
        """
        Enhance a low-light frame without modifying the input array.
        Returns a new enhanced ndarray for detection.
        """
        if frame is None or frame.size == 0:
            return frame

        selected_method = (method or self.default_method).lower()

        if selected_method == "gamma":
            return self.apply_gamma(frame)
        else:
            return self.apply_clahe(frame)

    # Backward-compatible alias
    enhance_frame = enhance

    def apply_clahe(self, frame: np.ndarray) -> np.ndarray:
        """
        Apply CLAHE to the Luminance (L) channel in LAB color space.
        Preserves original chrominance (A and B channels) while equalizing contrast.
        """
        if len(frame.shape) != 3 or frame.shape[2] != 3:
            # Grayscale fallback
            return self._clahe.apply(frame.copy())

        # Convert BGR to LAB color space
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Equalize only the luminance channel
        enhanced_l = self._clahe.apply(l_channel)

        # Merge back and convert to BGR
        enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        return enhanced_bgr

    def apply_gamma(self, frame: np.ndarray) -> np.ndarray:
        """
        Apply non-linear gamma curve adjustment using precomputed LUT.
        """
        return cv2.LUT(frame, self._gamma_table)
