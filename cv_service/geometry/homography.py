"""
SEEMADRISHTI AI - Real Homography & Geometric Alignment Engine (Phase 24)

Team: IQ100
Problem Statement: SIH26187

Performs genuine computer vision feature matching, RANSAC estimation,
and homography matrix computation between two video camera frames.
Does NOT fabricate or hardcode inlier ratios or alignment metrics.
"""

import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

from typing import Dict, Any, Optional, Tuple
import cv2
import numpy as np


class HomographyEngine:
    """
    Evaluates real feature correspondence and homography between two camera frames
    using ORB/SIFT feature descriptors and RANSAC geometric estimation.
    """

    def __init__(
        self,
        n_features: int = 1500,
        ransac_reproj_threshold: float = 5.0,
        min_inlier_ratio: float = 0.35,
        min_matches: int = 12,
    ):
        self.n_features = n_features
        self.ransac_reproj_threshold = ransac_reproj_threshold
        self.min_inlier_ratio = min_inlier_ratio
        self.min_matches = min_matches
        self.orb = cv2.ORB_create(nfeatures=self.n_features)

    def extract_features(self, frame: np.ndarray) -> Tuple[Any, Any]:
        """Extracts ORB keypoints and descriptors from a BGR image."""
        if frame is None or frame.size == 0:
            return [], None

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        # Resize to standard processing resolution if too large
        h, w = gray.shape[:2]
        if w > 1280 or h > 720:
            scale = min(1280.0 / w, 720.0 / h)
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        keypoints, descriptors = self.orb.detectAndCompute(gray, None)
        return keypoints, descriptors

    def evaluate_homography(
        self,
        frame_a: np.ndarray,
        frame_b: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Computes real homography matrix H between frame_a and frame_b.
        Returns authentic metrics (matches, inliers, inlier_ratio, reprojection_error, status).
        """
        if frame_a is None or frame_b is None:
            return {
                "status": "ERROR",
                "message": "Invalid input frames",
                "total_keypoints_a": 0,
                "total_keypoints_b": 0,
                "raw_matches": 0,
                "inliers": 0,
                "inlier_ratio": 0.0,
                "reprojection_error_px": 0.0,
                "is_overlapping": False,
                "homography_matrix": None,
            }

        kp_a, des_a = self.extract_features(frame_a)
        kp_b, des_b = self.extract_features(frame_b)

        total_kp_a = len(kp_a)
        total_kp_b = len(kp_b)

        if des_a is None or des_b is None or total_kp_a < 4 or total_kp_b < 4:
            return {
                "status": "INSUFFICIENT_FEATURES",
                "message": "Insufficient keypoint descriptors detected",
                "total_keypoints_a": total_kp_a,
                "total_keypoints_b": total_kp_b,
                "raw_matches": 0,
                "inliers": 0,
                "inlier_ratio": 0.0,
                "reprojection_error_px": 0.0,
                "is_overlapping": False,
                "homography_matrix": None,
            }

        # BFMatcher with Hamming distance for ORB
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        try:
            knn_matches = matcher.knnMatch(des_a, des_b, k=2)
        except Exception as e:
            return {
                "status": "ERROR",
                "message": f"Matching failed: {str(e)}",
                "total_keypoints_a": total_kp_a,
                "total_keypoints_b": total_kp_b,
                "raw_matches": 0,
                "inliers": 0,
                "inlier_ratio": 0.0,
                "reprojection_error_px": 0.0,
                "is_overlapping": False,
                "homography_matrix": None,
            }

        # Lowe's ratio test to filter ambiguous matches
        good_matches = []
        for m_pair in knn_matches:
            if len(m_pair) == 2:
                m, n = m_pair
                if m.distance < 0.75 * n.distance:
                    good_matches.append(m)

        raw_matches_count = len(good_matches)

        if raw_matches_count < self.min_matches:
            return {
                "status": "INSUFFICIENT_OVERLAP",
                "message": f"Too few reliable feature matches ({raw_matches_count} < {self.min_matches})",
                "total_keypoints_a": total_kp_a,
                "total_keypoints_b": total_kp_b,
                "raw_matches": raw_matches_count,
                "inliers": 0,
                "inlier_ratio": 0.0,
                "reprojection_error_px": 0.0,
                "is_overlapping": False,
                "homography_matrix": None,
            }

        # Extract coordinates of corresponding keypoints
        pts_a = np.float32([kp_a[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        pts_b = np.float32([kp_b[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        # RANSAC homography estimation
        H, mask = cv2.findHomography(pts_a, pts_b, cv2.RANSAC, self.ransac_reproj_threshold)

        if H is None or mask is None:
            return {
                "status": "HOMOGRAPHY_FAILED",
                "message": "RANSAC failed to compute valid geometric transformation",
                "total_keypoints_a": total_kp_a,
                "total_keypoints_b": total_kp_b,
                "raw_matches": raw_matches_count,
                "inliers": 0,
                "inlier_ratio": 0.0,
                "reprojection_error_px": 0.0,
                "is_overlapping": False,
                "homography_matrix": None,
            }

        inliers = int(mask.sum())
        inlier_ratio = round(inliers / float(raw_matches_count), 4) if raw_matches_count > 0 else 0.0

        # Calculate authentic root-mean-square reprojection error on inliers
        inlier_indices = np.where(mask.ravel() == 1)[0]
        if len(inlier_indices) > 0:
            inlier_pts_a = pts_a[inlier_indices]
            inlier_pts_b = pts_b[inlier_indices]
            transformed_a = cv2.perspectiveTransform(inlier_pts_a, H)
            errors = np.linalg.norm(inlier_pts_b - transformed_a, axis=2)
            mean_reproj_error = round(float(np.mean(errors)), 2)
        else:
            mean_reproj_error = 0.0

        # Determine true geometric overlap
        is_overlapping = (inlier_ratio >= self.min_inlier_ratio) and (inliers >= self.min_matches)

        status = "VALID_OVERLAP" if is_overlapping else "INSUFFICIENT_OVERLAP"
        msg = (
            f"Verified geometric overlap with {inliers}/{raw_matches_count} RANSAC inliers ({inlier_ratio*100:.1f}%)"
            if is_overlapping
            else f"Insufficient geometric overlap ({inlier_ratio*100:.1f}% inliers < threshold {self.min_inlier_ratio*100:.0f}%)"
        )

        return {
            "status": status,
            "message": msg,
            "total_keypoints_a": total_kp_a,
            "total_keypoints_b": total_kp_b,
            "raw_matches": raw_matches_count,
            "inliers": inliers,
            "inlier_ratio": inlier_ratio,
            "reprojection_error_px": mean_reproj_error,
            "is_overlapping": is_overlapping,
            "homography_matrix": H.tolist() if H is not None else None,
        }
