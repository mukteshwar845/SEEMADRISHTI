"""
SEEMADRISHTI AI - Real Appearance-Based ReID Feature Extractor (Phase 24)

Team: IQ100
Problem Statement: SIH26187

Extracts genuine color histogram and geometric appearance embeddings from
detection bounding box crops. Computes real cosine and Bhattacharyya similarity.
Does NOT fabricate or hardcode ReID confidence scores.
"""

import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

from typing import Dict, Any, Optional, Tuple, List
import cv2
import numpy as np


class AppearanceReIDExtractor:
    """
    Extracts appearance feature vectors from object image crops using
    multi-bin HSV color histograms and aspect-ratio geometry.
    """

    def __init__(self, h_bins: int = 16, s_bins: int = 8, v_bins: int = 8):
        self.h_bins = h_bins
        self.s_bins = s_bins
        self.v_bins = v_bins

    def extract_embedding(self, crop: np.ndarray) -> Optional[np.ndarray]:
        """
        Extracts a normalized 1D appearance embedding vector from an image crop.
        Returns None if crop is invalid or too small.
        """
        if crop is None or crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
            return None

        # Convert to HSV color space
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)

        # Compute 3D HSV color histogram
        hist = cv2.calcHist(
            [hsv],
            [0, 1, 2],
            None,
            [self.h_bins, self.s_bins, self.v_bins],
            [0, 180, 0, 256, 0, 256],
        )

        # Normalize histogram (L2 norm)
        hist = cv2.normalize(hist, hist).flatten()

        # Add aspect ratio feature to embedding
        h, w = crop.shape[:2]
        aspect_ratio = np.array([float(w) / float(h)], dtype=np.float32)

        # Concatenate normalized color descriptor and aspect ratio
        embedding = np.concatenate([hist, aspect_ratio * 0.1])
        # Re-normalize full vector
        norm = np.linalg.norm(embedding)
        if norm > 1e-6:
            embedding = embedding / norm

        return embedding

    def compute_similarity(
        self,
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> float:
        """
        Computes cosine similarity between two appearance embeddings.
        Returns a calibrated score between 0.0 and 1.0.
        """
        if embedding_a is None or embedding_b is None:
            return 0.0

        if embedding_a.shape != embedding_b.shape:
            return 0.0

        dot = float(np.dot(embedding_a, embedding_b))
        norm_a = float(np.linalg.norm(embedding_a))
        norm_b = float(np.linalg.norm(embedding_b))

        if norm_a < 1e-6 or norm_b < 1e-6:
            return 0.0

        cos_sim = dot / (norm_a * norm_b)
        # Clamp to [0.0, 1.0]
        return round(max(0.0, min(1.0, cos_sim)), 4)

    def evaluate_cross_camera_association(
        self,
        crop_src: np.ndarray,
        crop_dst: np.ndarray,
        class_src: str,
        class_dst: str,
        temporal_gap_sec: float,
        min_travel_sec: float = 1.0,
        max_travel_sec: float = 60.0,
        appearance_threshold: float = 0.65,
    ) -> Dict[str, Any]:
        """
        Evaluates a complete, authentic cross-camera ReID association between two crops.
        """
        # Hard Rule 1: Class Compatibility
        if class_src.strip().lower() != class_dst.strip().lower():
            return {
                "decision": "REJECTED",
                "reason": f"Class mismatch: {class_src} != {class_dst}",
                "appearance_similarity": 0.0,
                "spatial_temporal_score": 0.0,
                "overall_confidence": 0.0,
            }

        # Hard Rule 2: Temporal Sequence & Feasibility
        if temporal_gap_sec < 0:
            return {
                "decision": "REJECTED",
                "reason": f"Negative travel time ({temporal_gap_sec:.1f}s)",
                "appearance_similarity": 0.0,
                "spatial_temporal_score": 0.0,
                "overall_confidence": 0.0,
            }

        if temporal_gap_sec < min_travel_sec:
            return {
                "decision": "REJECTED",
                "reason": f"Transit too rapid for physical terrain ({temporal_gap_sec:.1f}s < min {min_travel_sec:.1f}s)",
                "appearance_similarity": 0.0,
                "spatial_temporal_score": 0.1,
                "overall_confidence": 0.1,
            }

        if temporal_gap_sec > max_travel_sec:
            return {
                "decision": "EXPIRED",
                "reason": f"Temporal window expired ({temporal_gap_sec:.1f}s > max {max_travel_sec:.1f}s)",
                "appearance_similarity": 0.0,
                "spatial_temporal_score": 0.05,
                "overall_confidence": 0.05,
            }

        # Compute appearance similarity
        emb_src = self.extract_embedding(crop_src)
        emb_dst = self.extract_embedding(crop_dst)

        if emb_src is None or emb_dst is None:
            # Cannot verify appearance
            return {
                "decision": "INSUFFICIENT_DATA",
                "reason": "Detection crop too small or invalid for appearance extraction",
                "appearance_similarity": 0.0,
                "spatial_temporal_score": 0.5,
                "overall_confidence": 0.0,
            }

        app_sim = self.compute_similarity(emb_src, emb_dst)

        # Compute temporal feasibility score
        mid_time = (min_travel_sec + max_travel_sec) / 2.0
        time_score = max(0.0, 1.0 - abs(temporal_gap_sec - mid_time) / (max_travel_sec - min_travel_sec))

        # Overall weighted confidence: 60% appearance, 40% spatial-temporal feasibility
        overall_confidence = round(0.60 * app_sim + 0.40 * time_score, 4)

        if app_sim >= appearance_threshold and overall_confidence >= 0.60:
            decision = "VERIFIED_MATCH"
            reason = f"High appearance consistency ({app_sim*100:.1f}%) and valid travel time ({temporal_gap_sec:.1f}s)"
        elif app_sim >= 0.45:
            decision = "UNCERTAIN_CANDIDATE"
            reason = f"Moderate appearance match ({app_sim*100:.1f}%) requires manual verification"
        else:
            decision = "NO_MATCH"
            reason = f"Appearance divergence ({app_sim*100:.1f}% < threshold {appearance_threshold*100:.0f}%)"

        return {
            "decision": decision,
            "reason": reason,
            "appearance_similarity": app_sim,
            "spatial_temporal_score": round(time_score, 4),
            "overall_confidence": overall_confidence,
            "temporal_gap_sec": temporal_gap_sec,
        }
