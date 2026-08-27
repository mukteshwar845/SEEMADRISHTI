"""
SEEMADRISHTI AI - Real-Time Video Ingestion, Detection, Multi-Object Tracking & Intrusion Pipeline

Team: IQ100
Problem Statement: SIH26187

Pipeline flow:
VIDEO ➔ OpenCV ➔ YOLOv8n ➔ ByteTrack ➔ Centroid ➔ Polygon Geometry ➔ State Transition ➔ SQLite Event/Alert ➔ WebSocket ➔ HUD
"""

import os
import sys
import time
import argparse
from typing import Dict, Set

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cv_service.config import CVConfig
from cv_service.video.capture import create_video_source
from cv_service.detection.yolo_detector import YoloDetector
from cv_service.tracking.byte_tracker import ByteTrackEngine
from cv_service.geometry.polygon import PolygonZone
from cv_service.intrusion.detector import IntrusionDetector
from cv_service.output.detection_publisher import DetectionPublisher


def parse_args():
    parser = argparse.ArgumentParser(
        description="SEEMADRISHTI AI - Computer Vision, Tracking & Intrusion Pipeline (Phase 4)"
    )
    parser.add_argument(
        "--source",
        type=str,
        default="cv_service/tests/fixtures/intrusion_test.mp4",
        help="Path to video file or webcam index (default: intrusion_test.mp4)",
    )
    parser.add_argument(
        "--camera-id",
        type=str,
        default="cam-01",
        help="Target camera identifier (default: cam-01)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8n.pt",
        help="YOLO model name or weights path (default: yolov8n.pt)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.40,
        help="Confidence threshold for detections (default: 0.40)",
    )
    parser.add_argument(
        "--frame-skip",
        type=int,
        default=1,
        help="Process every Nth frame (default: 1)",
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=0,
        help="Maximum frames to process before exiting (0 = infinite loop)",
    )
    parser.add_argument(
        "--no-ws",
        action="store_true",
        help="Disable WebSocket publisher (run in local offline mode)",
    )
    parser.add_argument(
        "--no-tracking",
        action="store_true",
        help="Disable ByteTrack multi-object tracking (raw detection only)",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    config = CVConfig(
        model_name=args.model,
        confidence_threshold=args.conf,
        frame_skip=args.frame_skip,
        camera_id=args.camera_id,
        ws_url="ws://127.0.0.1:8000/ws",
    )

    use_tracking = not args.no_tracking

    print("\n===================================================================")
    print("SEEMADRISHTI AI - INTRUSION DETECTION PIPELINE (PHASE 4)")
    print("===================================================================")
    print(f" * Video Source:     {args.source}")
    print(f" * Camera ID:        {config.camera_id}")
    print(f" * YOLO Model:       {config.model_name}")
    print(f" * Confidence Limit: {config.confidence_threshold}")
    print(f" * Frame Skip Ratio: {config.frame_skip}")
    print(f" * Tracking Engine:  {'ByteTrack (Active)' if use_tracking else 'Disabled'}")
    print(f" * Intrusion Engine: Active (Polygon Point-in-Polygon & Transition)")
    print(f" * WebSocket Target: {config.ws_url if not args.no_ws else 'Disabled'}")
    print("===================================================================")

    # 1. Initialize Video Source
    try:
        source = create_video_source(args.source, loop=(args.max_frames == 0))
        source.open()
        meta = source.get_metadata()
        print(f"[CV-Service] Source opened successfully: {meta}")
    except Exception as e:
        print(f"[FATAL] Failed to open video source '{args.source}': {e}", file=sys.stderr)
        sys.exit(1)

    # 2. Initialize YOLO Detector
    try:
        detector = YoloDetector(config)
        detector.load_model()
    except Exception as e:
        print(f"[FATAL] Failed to initialize YOLO detector: {e}", file=sys.stderr)
        source.release()
        sys.exit(1)

    # 3. Initialize ByteTrack Engine (if tracking enabled)
    tracker = None
    if use_tracking:
        try:
            tracker = ByteTrackEngine(config, detector=detector)
            tracker.initialize()
        except Exception as e:
            print(f"[FATAL] Failed to initialize ByteTrack: {e}", file=sys.stderr)
            source.release()
            sys.exit(1)

    # 4. Initialize Intrusion Detector & Load Zones
    intrusion_detector = IntrusionDetector(api_base_url="http://127.0.0.1:8000/api")
    loaded_count = intrusion_detector.load_zones_from_backend(config.camera_id)
    if loaded_count == 0:
        # Fallback default perimeter zone for Sector Alpha: Y <= 360 in 768x432 (or 35% normalized)
        default_zone = PolygonZone(
            zone_id=f"zone-{config.camera_id}-default",
            camera_id=config.camera_id,
            name="Restricted Perimeter Alpha",
            polygon=[[450, 100], [680, 100], [680, 360], [450, 360]],
            enabled=True,
        )
        intrusion_detector.add_zone(default_zone)
        print(f"[CV-Service] Configured default virtual zone: '{default_zone.name}' with polygon: {default_zone.raw_polygon}")
    else:
        print(f"[CV-Service] Loaded {loaded_count} active zone(s) from backend for {config.camera_id}")

    # 5. Initialize WebSocket Publisher
    publisher = None
    if not args.no_ws:
        publisher = DetectionPublisher(config)
        publisher.start()

    # 6. Processing Loop
    frame_counter = 0
    processed_counter = 0
    total_objects_count = 0
    total_intrusions_count = 0
    class_frequency: Dict[str, int] = {}
    unique_track_ids: Set[int] = set()

    total_inference_time_ms = 0.0
    total_tracking_time_ms = 0.0
    total_geometry_time_ms = 0.0

    t_start = time.perf_counter()
    last_log_time = time.perf_counter()

    try:
        print("[CV-Service] Video tracking & intrusion monitoring running. Press Ctrl+C to stop.")
        while True:
            ret, frame = source.read_frame()
            if not ret or frame is None:
                print("[CV-Service] End of video stream reached.")
                break

            frame_counter += 1

            # Skip frames if configured
            if frame_counter % config.frame_skip != 0:
                continue

            processed_counter += 1
            h, w = frame.shape[:2]

            if use_tracking and tracker:
                # Step A: YOLO + ByteTrack
                output = tracker.track(frame, camera_id=config.camera_id)
                count = output["track_count"]
                total_objects_count += count
                total_inference_time_ms += output.get("inference_ms", 0.0)
                total_tracking_time_ms += output.get("tracking_ms", 0.0)

                for trk in output["tracks"]:
                    cls = trk["class_name"]
                    tid = trk["track_id"]
                    unique_track_ids.add(tid)
                    class_frequency[cls] = class_frequency.get(cls, 0) + 1

                # Step B: Intrusion Geometry & State Transition
                events, geom_ms = intrusion_detector.process_tracks(
                    output["tracks"],
                    camera_id=config.camera_id,
                    frame_width=w,
                    frame_height=h,
                    publisher=publisher,
                )
                total_geometry_time_ms += geom_ms
                if events:
                    for ev in events:
                        if ev.direction == "ENTERING":
                            total_intrusions_count += 1

                # Publish tracking telemetry packet over WebSocket
                if publisher:
                    publisher.publish(output, message_type="tracking")

            else:
                # Fallback: Raw Detection Only
                output = detector.detect(frame, camera_id=config.camera_id)
                count = output["detection_count"]
                total_objects_count += count
                total_inference_time_ms += output.get("inference_ms", 0.0)

                if publisher:
                    publisher.publish(output, message_type="detection")

            # Periodic Heartbeat Log
            now = time.perf_counter()
            if now - last_log_time >= 2.0:
                elapsed = now - t_start
                current_fps = round(processed_counter / elapsed, 1) if elapsed > 0 else 0.0
                avg_inf = round(total_inference_time_ms / processed_counter, 1)
                avg_trk = round(total_tracking_time_ms / processed_counter, 1)
                avg_geo = round(total_geometry_time_ms / processed_counter, 2)
                print(
                    f"[RUNNING] Frames: {processed_counter} | "
                    f"FPS: {current_fps} | "
                    f"Inference: {avg_inf}ms | "
                    f"Tracking: {avg_trk}ms | "
                    f"Geometry: {avg_geo}ms | "
                    f"Active: {count} | "
                    f"Intrusions: {total_intrusions_count}"
                )
                last_log_time = now

            if args.max_frames > 0 and processed_counter >= args.max_frames:
                print(f"[CV-Service] Reached maximum requested frames ({args.max_frames}).")
                break

    except KeyboardInterrupt:
        print("\n[CV-Service] Stopping upon operator interrupt...")
    finally:
        total_time = time.perf_counter() - t_start
        source.release()
        if publisher:
            publisher.close()

        # Performance Summary Table
        avg_fps = round(processed_counter / total_time, 2) if total_time > 0 else 0.0
        avg_inference_latency = round(total_inference_time_ms / processed_counter, 2) if processed_counter > 0 else 0.0
        avg_tracking_latency = round(total_tracking_time_ms / processed_counter, 2) if processed_counter > 0 and use_tracking else 0.0
        avg_geometry_latency = round(total_geometry_time_ms / processed_counter, 3) if processed_counter > 0 else 0.0
        avg_total_latency = round(avg_inference_latency + avg_tracking_latency + avg_geometry_latency, 2)

        print("\n===================================================================")
        print("[BENCHMARK REPORT] PHASE 4 INTRUSION PIPELINE PERFORMANCE")
        print("===================================================================")
        print(f" * Total Ingested Frames:          {frame_counter}")
        print(f" * Total Processed Frames:         {processed_counter}")
        print(f" * Total Execution Time:           {round(total_time, 2)}s")
        print(f" * Average Processed FPS:          {avg_fps}")
        print(f" * Average YOLO Inference Latency: {avg_inference_latency} ms")
        print(f" * Average ByteTrack Latency:      {avg_tracking_latency} ms")
        print(f" * Average Zone Geometry Latency:  {avg_geometry_latency} ms")
        print(f" * Total Processing Latency:       {avg_total_latency} ms")
        print(f" * Total Observed Track Records:   {total_objects_count}")
        print(f" * Unique Persistent Track IDs:    {len(unique_track_ids)} IDs: {sorted(list(unique_track_ids))}")
        print(f" * Real Intrusion Alerts Triggered: {total_intrusions_count}")
        print(f" * Tracked Classes Tally:          {dict(class_frequency)}")
        print("===================================================================\n")


if __name__ == "__main__":
    main()
