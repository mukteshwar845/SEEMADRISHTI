"""
Phase 22 Multi-Camera Empirical Detection Diagnostics & Benchmark Script
Runs real inference on CAM-01 through CAM-09 using actual VisDrone footage.
Collects truthful, un-fabricated metrics:
- Resolution, aspect ratio
- Default vs Optimized detection counts & frame detection rates
- Per-class breakdown (person, car, bus, truck, motor, bicycle, etc.)
- Model capability probe (Animal capability)
- YOLO latency (inference ms) & FPS
- Track continuity & Unique session counts
"""

import os
import sys
import json
import time
import cv2
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from cv_service.config import CVConfig
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.intrusion.detector import IntrusionDetector

def benchmark_camera(cam_id: str, max_frames: int = 15):
    fixtures_dir = os.path.join(PROJECT_ROOT, "cv_service", "tests", "fixtures", "visdrone")
    video_path = os.path.join(fixtures_dir, f"{cam_id.upper()}.mp4")
    if not os.path.exists(video_path):
        return None

    cap = cv2.VideoCapture(video_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    nominal_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    frames = []
    for _ in range(max_frames):
        ret, frame = cap.read()
        if not ret or frame is None:
            break
        frames.append(frame)
    cap.release()

    if not frames:
        return None

    # 1. Baseline Run: imgsz=640, conf=0.45
    baseline_cfg = CVConfig(input_size=640, confidence_threshold=0.45, camera_id=cam_id)
    baseline_det = YoloDetector(baseline_cfg)
    baseline_det.load_model()

    baseline_times = []
    baseline_dets_count = 0
    baseline_frames_with_det = 0
    baseline_classes = {}

    for f in frames:
        t0 = time.perf_counter()
        res = baseline_det.detect(f, camera_id=cam_id)
        baseline_times.append((time.perf_counter() - t0) * 1000.0)
        dets = res["detections"]
        baseline_dets_count += len(dets)
        if len(dets) > 0:
            baseline_frames_with_det += 1
        for d in dets:
            c = d["class_name"]
            baseline_classes[c] = baseline_classes.get(c, 0) + 1

    # 2. Optimized Profile Run: from_camera_profile(cam_id)
    opt_cfg = CVConfig.from_camera_profile(cam_id)
    opt_det = YoloDetector(opt_cfg)
    opt_det.load_model()
    opt_tracker = ByteTrackEngine(config=opt_cfg, detector=opt_det)
    opt_tracker.initialize()
    opt_intrusion = IntrusionDetector()
    opt_intrusion.load_zones_from_backend(cam_id)

    opt_times = []
    opt_dets_count = 0
    opt_frames_with_det = 0
    opt_classes = {}
    opt_categories = {"HUMAN": 0, "VEHICLE": 0, "ANIMAL": 0, "OBJECT": 0}
    unique_ids = set()
    proximity_events = 0
    line_crossing_events = 0

    for idx, f in enumerate(frames):
        t0 = time.perf_counter()
        tracks_res = opt_tracker.track(f, camera_id=cam_id, frame_id=idx + 1)
        opt_times.append((time.perf_counter() - t0) * 1000.0)
        tracks = tracks_res.get("tracks", [])
        dets_count = tracks_res.get("track_count", len(tracks))
        opt_dets_count += dets_count
        if dets_count > 0:
            opt_frames_with_det += 1

        for trk in tracks:
            c = trk["class_name"]
            cat = trk.get("category", "HUMAN")
            opt_classes[c] = opt_classes.get(c, 0) + 1
            opt_categories[cat] = opt_categories.get(cat, 0) + 1
            unique_ids.add(trk["track_id"])

        evs, _ = opt_intrusion.process_tracks(tracks, camera_id=cam_id, frame_width=w, frame_height=h, frame_id=idx + 1)
        for ev in evs:
            if ev.event_type == "SUSPICIOUS_AREA_APPROACH":
                proximity_events += 1
            elif "CROSSING" in ev.event_type:
                line_crossing_events += 1

    return {
        "camera_id": cam_id,
        "width": w,
        "height": h,
        "aspect_ratio": f"{round(w/h, 2)}:1 ({w}x{h})",
        "tested_frames": len(frames),
        "nominal_fps": nominal_fps,
        "baseline": {
            "imgsz": 640,
            "conf": 0.45,
            "avg_latency_ms": round(float(np.mean(baseline_times)), 1),
            "fps": round(1000.0 / float(np.mean(baseline_times)), 1) if float(np.mean(baseline_times)) > 0 else 0,
            "total_detections": baseline_dets_count,
            "detection_rate": round(baseline_frames_with_det / len(frames) * 100.0, 1),
            "classes": baseline_classes,
        },
        "optimized": {
            "imgsz": opt_cfg.input_size,
            "conf": opt_cfg.confidence_threshold,
            "avg_latency_ms": round(float(np.mean(opt_times)), 1),
            "fps": round(1000.0 / float(np.mean(opt_times)), 1) if float(np.mean(opt_times)) > 0 else 0,
            "total_detections": opt_dets_count,
            "detection_rate": round(opt_frames_with_det / len(frames) * 100.0, 1),
            "classes": opt_classes,
            "categories": opt_categories,
            "unique_tracks": len(unique_ids),
            "proximity_events": proximity_events,
            "crossing_events": line_crossing_events,
            "animal_capable": opt_det.is_animal_capable(),
        }
    }

def main():
    cameras = [f"cam-0{i}" for i in range(1, 10)]
    all_results = {}
    print("Starting empirical multi-camera benchmark on actual VisDrone footage...")

    for cam in cameras:
        print(f"Benchmarking {cam}...")
        res = benchmark_camera(cam, max_frames=15)
        if res:
            all_results[cam] = res
            print(f"  Done {cam}: Baseline {res['baseline']['total_detections']} dets ({res['baseline']['detection_rate']}%) -> Optimized {res['optimized']['total_detections']} dets ({res['optimized']['detection_rate']}%)")

    out_json = os.path.join(PROJECT_ROOT, "cv_service", "tests", "benchmark_results.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print(f"Saved benchmark results to {out_json}")

if __name__ == "__main__":
    main()
