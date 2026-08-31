"""
SEEMADRISHTI AI - Real Homography Evaluator Tool (Phase 24)

Team: IQ100
Problem Statement: SIH26187

Command-line tool to evaluate real homography between two camera video files
and return strict JSON containing verified computer vision metrics.
"""

import sys
import json
import os

os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import cv2
from cv_service.geometry.homography import HomographyEngine

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "ERROR", "message": "Usage: python evaluate_homography.py <camA_path> <camB_path>"}))
        return

    cam_a_path = sys.argv[1]
    cam_b_path = sys.argv[2]

    if not os.path.exists(cam_a_path) or not os.path.exists(cam_b_path):
        print(json.dumps({
            "status": "ERROR",
            "message": f"File not found: {cam_a_path} or {cam_b_path}",
            "is_overlapping": False,
            "inlier_ratio": 0.0
        }))
        return

    cap_a = cv2.VideoCapture(cam_a_path)
    ret_a, frame_a = cap_a.read()
    cap_a.release()

    cap_b = cv2.VideoCapture(cam_b_path)
    ret_b, frame_b = cap_b.read()
    cap_b.release()

    if not ret_a or not ret_b or frame_a is None or frame_b is None:
        print(json.dumps({
            "status": "ERROR",
            "message": "Failed to read frame from one or both video streams",
            "is_overlapping": False,
            "inlier_ratio": 0.0
        }))
        return

    engine = HomographyEngine(n_features=1500, min_inlier_ratio=0.35, min_matches=12)
    res = engine.evaluate_homography(frame_a, frame_b)
    print(json.dumps(res))

if __name__ == '__main__':
    main()
