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
from cv_service.loitering.detector import LoiteringDetector
from cv_service.risk.engine import RiskEngine
from cv_service.evidence.circular_buffer import CircularFrameBuffer
from cv_service.evidence.evidence_writer import EvidenceWriter
from cv_service.evidence.incident_manager import IncidentManager
from cv_service.correlation.camera_topology import CameraTopology
from cv_service.correlation.correlation_engine import CorrelationEngine
from cv_service.environment.environment_analyzer import EnvironmentAnalyzer
from cv_service.environment.enhancement import LowLightEnhancer
from cv_service.environment.night_movement import NightMovementDetector
from cv_service.adaptive.adaptive_sampler import AdaptiveSampler
from cv_service.analytics.engine import MovementAnalyticsEngine
from cv_service.output.detection_publisher import DetectionPublisher


def parse_args():
    parser = argparse.ArgumentParser(
        description="SEEMADRISHTI AI - Computer Vision, Tracking & Intrusion Pipeline (Phase 4)"
    )
    parser.add_argument(
        "--source",
        type=str,
        default="cv_service/tests/fixtures/visdrone/CAM-01.mp4",
        help="Path to video file or webcam index (default: CAM-01.mp4)",
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
    parser.add_argument(
        "--loitering-threshold",
        type=float,
        default=30.0,
        help="Loitering dwell time threshold in seconds (default: 30.0)",
    )
    parser.add_argument(
        "--loitering-grace-period",
        type=float,
        default=2.0,
        help="Grace period in seconds before resetting lost track dwell (default: 2.0)",
    )
    parser.add_argument(
        "--no-loitering",
        action="store_true",
        help="Disable loitering / abnormal dwell-time detection",
    )
    parser.add_argument(
        "--no-risk",
        action="store_true",
        help="Disable explainable threat assessment & risk engine",
    )
    parser.add_argument(
        "--pre-event-seconds",
        type=float,
        default=10.0,
        help="Pre-event buffer duration in seconds (default: 10.0)",
    )
    parser.add_argument(
        "--post-event-seconds",
        type=float,
        default=10.0,
        help="Post-event capture duration in seconds (default: 10.0)",
    )
    parser.add_argument(
        "--evidence-dir",
        type=str,
        default="evidence",
        help="Directory to store MP4 forensic evidence clips (default: evidence)",
    )
    parser.add_argument(
        "--no-evidence",
        action="store_true",
        help="Disable Phase 7 forensic incident evidence capture",
    )
    parser.add_argument(
        "--no-correlation",
        action="store_true",
        help="Disable Phase 8 multi-camera threat correlation",
    )
    parser.add_argument(
        "--topology-config",
        type=str,
        default=None,
        help="Path to camera topology JSON configuration",
    )
    parser.add_argument(
        "--no-environment",
        action="store_true",
        help="Disable Phase 9 environmental illumination analysis",
    )
    parser.add_argument(
        "--no-enhancement",
        action="store_true",
        help="Disable Phase 9 low-light image enhancement",
    )
    parser.add_argument(
        "--no-adaptive",
        action="store_true",
        help="Disable Phase 9 adaptive frame sampling",
    )
    parser.add_argument(
        "--no-analytics",
        action="store_true",
        help="Disable Phase 10 movement and traffic flow analytics",
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
        loitering_enabled=not args.no_loitering,
        loitering_threshold_seconds=args.loitering_threshold,
        loitering_grace_period_seconds=args.loitering_grace_period,
        risk_engine_enabled=not args.no_risk,
        evidence_enabled=not args.no_evidence,
        evidence_pre_event_seconds=args.pre_event_seconds,
        evidence_post_event_seconds=args.post_event_seconds,
        evidence_dir=args.evidence_dir,
        correlation_enabled=not args.no_correlation,
        correlation_topology_path=args.topology_config,
        environment_enabled=not args.no_environment,
        enable_low_light_enhancement=not args.no_enhancement,
        enable_adaptive_sampling=not args.no_adaptive,
    )

    use_tracking = not args.no_tracking
    use_loitering = not args.no_loitering and config.loitering_enabled
    use_risk = not args.no_risk and config.risk_engine_enabled
    use_evidence = not args.no_evidence and config.evidence_enabled
    use_correlation = not args.no_correlation and config.correlation_enabled
    use_environment = not args.no_environment and config.environment_enabled
    use_enhancement = not args.no_enhancement and config.enable_low_light_enhancement
    use_adaptive = not args.no_adaptive and config.enable_adaptive_sampling
    use_analytics = not args.no_analytics and getattr(config, "analytics_enabled", True)

    print("\n===================================================================")
    print("SEEMADRISHTI AI - MOVEMENT, FLOW & BEHAVIOR SURVEILLANCE PIPELINE (PHASE 10)")
    print("===================================================================")
    print(f" * Video Source:       {args.source}")
    print(f" * Camera ID:          {config.camera_id}")
    print(f" * YOLO Model:         {config.model_name}")
    print(f" * Confidence Limit:   {config.confidence_threshold}")
    print(f" * Frame Skip Ratio:   {config.frame_skip}")
    print(f" * Tracking Engine:    {'ByteTrack (Active)' if use_tracking else 'Disabled'}")
    print(f" * Intrusion Engine:   Active (Polygon Point-in-Polygon & Transition)")
    print(f" * Loitering Engine:   {'Active (Threshold: ' + str(config.loitering_threshold_seconds) + 's)' if use_loitering else 'Disabled'}")
    print(f" * Threat Risk Engine: {'Active (Explainable 0-100 Scoring)' if use_risk else 'Disabled'}")
    print(f" * Evidence Engine:    {'Active (Pre: ' + str(config.evidence_pre_event_seconds) + 's, Post: ' + str(config.evidence_post_event_seconds) + 's)' if use_evidence else 'Disabled'}")
    print(f" * Evidence Output:    {config.evidence_dir}")
    print(f" * Correlation Engine: {'Active (Spatial-Temporal Cross-Camera Correlation)' if use_correlation else 'Disabled'}")
    print(f" * Environment Engine: {'Active (Day/Night/Low-Light Pixel Analysis)' if use_environment else 'Disabled'}")
    print(f" * Optical Enhancement:{'Active (' + config.enhancement_method.upper() + ')' if use_enhancement else 'Disabled'}")
    print(f" * Adaptive Sampling:  {'Active (Dynamic FPS Policy)' if use_adaptive else 'Disabled'}")
    print(f" * Analytics Engine:   {'Active (Trajectory, Direction, Flow, Occupancy & Anomalies)' if use_analytics else 'Disabled'}")
    print(f" * WebSocket Target:   {config.ws_url if not args.no_ws else 'Disabled'}")
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

    # 3. Initialize ByteTrack Engine (if enabled)
    tracker = None
    if use_tracking:
        try:
            tracker = ByteTrackEngine(config, detector=detector)
            tracker.initialize()
        except Exception as e:
            print(f"[FATAL] Failed to initialize ByteTrack: {e}", file=sys.stderr)
            source.release()
            sys.exit(1)

    # 4. Initialize Intrusion, Loitering & Risk Detectors & Load Zones
    intrusion_detector = IntrusionDetector(api_base_url="http://127.0.0.1:8000/api")
    loaded_count = intrusion_detector.load_zones_from_backend(config.camera_id)
    if loaded_count == 0:
        # Fallback default perimeter zone for Sector Alpha
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

    loitering_detector = None
    if use_loitering:
        loitering_detector = LoiteringDetector(
            threshold_seconds=config.loitering_threshold_seconds,
            grace_period_seconds=config.loitering_grace_period_seconds,
            target_classes=config.loitering_target_classes,
            api_base_url="http://127.0.0.1:8000/api",
        )
        loitering_detector.zones = intrusion_detector.zones

    risk_engine = None
    if use_risk:
        risk_engine = RiskEngine(
            intrusion_points=config.risk_intrusion_points,
            loitering_points=config.risk_loitering_points,
            reentry_points=config.risk_reentry_points,
            persistence_points=config.risk_persistence_points,
            persistence_min_seconds=config.risk_persistence_min_seconds,
            max_score=config.risk_max_score,
            target_classes=config.loitering_target_classes,
            api_base_url="http://127.0.0.1:8000/api",
            alert_threshold=config.risk_alert_threshold,
        )

    # 5. Initialize Phase 7 Incident Evidence Engine
    incident_manager = None
    if use_evidence:
        src_fps = meta.get("fps", 15.0) or 15.0
        circular_buf = CircularFrameBuffer(
            pre_event_seconds=config.evidence_pre_event_seconds,
            max_fps=src_fps,
        )
        writer = EvidenceWriter(
            evidence_dir=config.evidence_dir,
            fps=src_fps,
        )
        incident_manager = IncidentManager(
            circular_buffer=circular_buf,
            evidence_writer=writer,
            backend_http_url=config.http_backend_url,
            pre_event_seconds=config.evidence_pre_event_seconds,
            post_event_seconds=config.evidence_post_event_seconds,
            min_risk_level=config.evidence_min_risk_level,
            cooldown_seconds=config.evidence_cooldown_seconds,
        )

    # 6. Initialize Phase 8 Multi-Camera Correlation Engine
    correlation_engine = None
    if use_correlation:
        topology = CameraTopology(config.correlation_topology_path)
        correlation_engine = CorrelationEngine(
            topology=topology,
            backend_http_url=config.http_backend_url,
            min_correlation_score=config.correlation_min_score,
            max_dormant_seconds=config.correlation_max_dormant_seconds,
        )

    # 7. Initialize Phase 9 Environment, Enhancement & Adaptive Engines
    env_analyzer = None
    enhancer = None
    adaptive_sampler = None
    night_movement_detector = None
    if use_environment:
        env_analyzer = EnvironmentAnalyzer(
            night_brightness_threshold=config.night_brightness_threshold,
            low_light_brightness_threshold=config.low_light_brightness_threshold,
            low_light_contrast_threshold=config.low_light_contrast_threshold,
            dawn_threshold=config.dawn_threshold,
            dusk_threshold=config.dusk_threshold,
        )
        night_movement_detector = NightMovementDetector(
            min_consecutive_frames=config.min_night_movement_frames,
            min_displacement_px=config.min_night_displacement_px,
        )
    if use_enhancement:
        enhancer = LowLightEnhancer(
            default_method=config.enhancement_method,
            clahe_clip_limit=config.enhancement_clahe_clip,
            gamma=config.enhancement_gamma,
        )
    if use_adaptive:
        adaptive_sampler = AdaptiveSampler(
            normal_skip=config.adaptive_normal_skip,
            night_skip=config.adaptive_night_skip,
            threat_skip=config.adaptive_threat_skip,
        )

    # 8. Initialize Phase 10 Movement & Flow Analytics Engine
    use_analytics = not args.no_analytics and getattr(config, "analytics_enabled", True)
    analytics_engine = None
    if use_analytics:
        frame_w = int(meta.get("width", 1920) or 1920)
        frame_h = int(meta.get("height", 1080) or 1080)
        analytics_engine = MovementAnalyticsEngine(
            camera_id=config.camera_id,
            frame_width=frame_w,
            frame_height=frame_h,
            grid_rows=getattr(config, "density_grid_size", 8),
            grid_cols=getattr(config, "density_grid_size", 8),
            min_displacement_px=getattr(config, "direction_min_displacement_px", 3.0),
            max_separation_px=getattr(config, "group_max_separation_px", 120.0),
            min_group_size=getattr(config, "group_movement_min_size", 2),
        )
        for zid, zone in intrusion_detector.zones.items():
            poly_pts = zone.get_pixel_polygon(frame_w, frame_h) if hasattr(zone, "get_pixel_polygon") else getattr(zone, "raw_polygon", [])
            analytics_engine.register_zone(zid, zone.name, poly_pts)
        print(f"[CV-Service] Initialized Phase 10 Movement & Flow Analytics Engine for {config.camera_id}")
    # 9. Initialize WebSocket Publisher
    publisher = None
    if not args.no_ws:
        publisher = DetectionPublisher(config)
        publisher.start()

    # 6. Processing Loop
    frame_counter = 0
    processed_counter = 0
    total_objects_count = 0
    total_intrusions_count = 0
    total_tripwire_crossings_count = 0
    class_frequency: Dict[str, int] = {}
    unique_track_ids: Set[int] = set()
    unique_person_track_ids: Set[int] = set()
    unique_vehicle_track_ids: Set[int] = set()
    unique_class_track_ids: Dict[str, Set[int]] = {}

    total_inference_time_ms = 0.0
    total_tracking_time_ms = 0.0
    total_geometry_time_ms = 0.0
    total_loitering_time_ms = 0.0
    total_loitering_count = 0
    total_risk_time_ms = 0.0
    total_risk_alerts_count = 0
    total_evidence_time_ms = 0.0
    total_incidents_count = 0
    total_evidence_clips_count = 0
    total_correlation_time_ms = 0.0
    total_correlations_count = 0
    total_env_time_ms = 0.0
    total_enh_time_ms = 0.0
    total_enhanced_frames_count = 0
    total_night_movement_count = 0
    total_analytics_time_ms = 0.0
    total_movement_events_count = 0
    total_analytics_anomalies_count = 0
    total_groups_detected_count = 0
    last_known_mode = "DAY"

    t_start = time.perf_counter()
    last_log_time = time.perf_counter()

    try:
        print("[CV-Service] Video tracking, intrusion, loitering & risk monitoring running. Press Ctrl+C to stop.")
        while True:
            if getattr(source, "did_loop", False):
                print(f"\n[CV-Service] Source {config.camera_id} looped/reset. Resetting session states.")
                intrusion_detector.reset_session(config.camera_id)
                if tracker and hasattr(tracker, "reset"):
                    tracker.reset()
            ret, frame = source.read_frame()
            if not ret or frame is None:
                print("[CV-Service] End of video stream reached.")
                break

            # Handle MP4 loop event: reset trackers and memory to prevent ghost tracks across loops
            if getattr(source, "did_loop", False):
                print(f"[CV-Service] Source loop detected on {config.camera_id}. Resetting trackers.")
                if tracker:
                    tracker.reset()
                if intrusion_detector:
                    intrusion_detector.reset()
                if loitering_detector:
                    loitering_detector.track_states.clear()
                if risk_engine:
                    risk_engine.active_tracks.clear()
                if analytics_engine and hasattr(analytics_engine, "active_tracks"):
                    analytics_engine.active_tracks.clear()
                if night_movement_detector and hasattr(night_movement_detector, "track_histories"):
                    night_movement_detector.track_histories.clear()

            frame_counter += 1

            # Determine whether to sample frame via Phase 9 Adaptive Sampler
            current_env_mode = last_known_mode
            has_active_threat = (total_intrusions_count > 0 or total_risk_alerts_count > 0)
            if adaptive_sampler:
                should_run, cur_skip, policy = adaptive_sampler.should_process_frame(
                    config.camera_id, frame_counter, current_env_mode, has_active_threat
                )
                if not should_run:
                    continue
            else:
                if frame_counter % config.frame_skip != 0:
                    continue

            processed_counter += 1
            t_frame_start = time.perf_counter()
            h, w = frame.shape[:2]
            current_frame_time = time.time()

            # Phase 9: Real Environment Luminance & Scene Analysis
            env_metrics = None
            if env_analyzer:
                t_env0 = time.perf_counter()
                env_metrics = env_analyzer.analyze_frame(
                    frame, camera_id=config.camera_id, current_time=current_frame_time
                )
                total_env_time_ms += (time.perf_counter() - t_env0) * 1000.0
                last_known_mode = env_metrics.mode

                # Broadcast environment update over WebSocket (periodic or state changes)
                if publisher and (processed_counter % 10 == 0 or env_metrics.low_light):
                    publisher.publish(env_metrics.to_dict(), message_type="environment_update")

            # Phase 9: Dynamic Optical Enhancement (CLAHE / Gamma) in low-light conditions
            detection_frame = frame
            if enhancer and env_metrics and (env_metrics.low_light or env_metrics.mode == "NIGHT"):
                t_enh0 = time.perf_counter()
                detection_frame = enhancer.enhance_frame(frame, method=config.enhancement_method)
                total_enh_time_ms += (time.perf_counter() - t_enh0) * 1000.0
                total_enhanced_frames_count += 1

            # Step 5: Incident Evidence Frame Recording
            if incident_manager:
                t_ev0 = time.perf_counter()
                completed = incident_manager.record_frame(
                    camera_id=config.camera_id,
                    frame=frame,
                    timestamp=current_frame_time,
                    publisher=publisher,
                )
                total_evidence_time_ms += (time.perf_counter() - t_ev0) * 1000.0
                total_evidence_clips_count += len(completed)

            if use_tracking and tracker:
                # Step A: YOLO + ByteTrack (using enhanced detection_frame and frame_id)
                output = tracker.track(
                    detection_frame,
                    camera_id=config.camera_id,
                    frame_id=frame_counter,
                    timestamp=current_frame_time,
                )
                count = output["track_count"]
                total_objects_count += count
                total_inference_time_ms += output.get("inference_ms", 0.0)
                total_tracking_time_ms += output.get("tracking_ms", 0.0)

                current_class_counts: Dict[str, int] = {}
                for trk in output["tracks"]:
                    cls = str(trk["class_name"]).lower().strip()
                    tid = int(trk["track_id"])
                    unique_track_ids.add(tid)
                    if cls == "person":
                        unique_person_track_ids.add(tid)
                    elif cls in ("car", "truck", "bus", "motorcycle", "bicycle"):
                        unique_vehicle_track_ids.add(tid)
                    if cls not in unique_class_track_ids:
                        unique_class_track_ids[cls] = set()
                    unique_class_track_ids[cls].add(tid)

                    class_frequency[cls] = class_frequency.get(cls, 0) + 1
                    current_class_counts[cls] = current_class_counts.get(cls, 0) + 1

                # Package Phase 17 live & cumulative counting telemetry
                counts_payload = {
                    "visible": {
                        "total": len(output["tracks"]),
                        "person": current_class_counts.get("person", 0),
                        "car": current_class_counts.get("car", 0),
                        "truck": current_class_counts.get("truck", 0),
                        "bus": current_class_counts.get("bus", 0),
                        "motorcycle": current_class_counts.get("motorcycle", 0) + current_class_counts.get("motor", 0),
                        "bicycle": current_class_counts.get("bicycle", 0) + current_class_counts.get("bike", 0),
                        "by_class": current_class_counts,
                    },
                    "unique_session": {
                        "total": len(unique_track_ids),
                        "person": len(unique_person_track_ids),
                        "vehicle": len(unique_vehicle_track_ids),
                        "by_class": {k: len(v) for k, v in unique_class_track_ids.items()},
                    }
                }
                output["counts"] = counts_payload

                # Step B: Intrusion Geometry & State Transition
                events, geom_ms = intrusion_detector.process_tracks(
                    output["tracks"],
                    camera_id=config.camera_id,
                    frame_width=w,
                    frame_height=h,
                    publisher=publisher,
                    frame_id=frame_counter,
                )
                total_geometry_time_ms += geom_ms
                if events:
                    for ev in events:
                        if ev.event_type == "TRIPWIRE_CROSSING" or ev.direction in ("IN", "OUT", "CROSSING"):
                            total_tripwire_crossings_count += 1
                        elif ev.direction == "ENTERING" or ev.event_type == "RESTRICTED_ZONE_ENTRY":
                            total_intrusions_count += 1

                # Step C: Loitering Detection & Dwell Accumulation
                if loitering_detector:
                    loit_events, loit_ms = loitering_detector.process_tracks(
                        output["tracks"],
                        camera_id=config.camera_id,
                        frame_width=w,
                        frame_height=h,
                        publisher=publisher,
                    )
                    total_loitering_time_ms += loit_ms
                    total_loitering_count += len(loit_events)

                    # Enrich track objects with active dwell info for HUD display
                    for trk in output["tracks"]:
                        tid = trk["track_id"]
                        for zid in loitering_detector.zones:
                            st = loitering_detector.track_states.get((config.camera_id, tid, zid))
                            if st and st.inside and st.dwell_seconds > 0:
                                trk["dwell_seconds"] = round(st.dwell_seconds, 1)
                                trk["is_loitering"] = st.loitering_alerted

                # Step D: Phase 10 Advanced Movement & Traffic Flow Analytics
                active_anomalies = []
                active_groups = []
                if analytics_engine:
                    t_an0 = time.perf_counter()
                    an_res = analytics_engine.process_frame(output["tracks"], timestamp=current_frame_time)
                    total_analytics_time_ms += (time.perf_counter() - t_an0) * 1000.0
                    active_anomalies = an_res.get("anomalies", [])
                    active_groups = an_res.get("groups", [])

                    if publisher:
                        if an_res.get("movement_events"):
                            for mve in an_res["movement_events"]:
                                publisher.publish(mve, message_type="movement_update")
                                total_movement_events_count += 1
                        if an_res.get("occupancy") and (frame_counter % 15 == 0):
                            for occ in an_res["occupancy"]:
                                publisher.publish(occ, message_type="occupancy_update")
                        if active_anomalies:
                            for anom in active_anomalies:
                                publisher.publish(anom, message_type="analytics_anomaly")
                                total_analytics_anomalies_count += 1
                        if active_groups:
                            for grp in active_groups:
                                publisher.publish(grp, message_type="group_movement")
                                total_groups_detected_count += 1

                # Step E: Explainable Threat Assessment & Risk Engine
                if risk_engine:
                    t_risk0 = time.perf_counter()
                    for trk in output["tracks"]:
                        tid = trk["track_id"]
                        is_in_zone = False
                        has_intrus = False
                        is_loit = False
                        active_dwell = 0.0
                        reentry_ct = 0

                        # Check intrusion state & re-entry count
                        for zid in intrusion_detector.zones:
                            st = intrusion_detector.track_states.get((config.camera_id, tid, zid))
                            if st and st.current_inside:
                                is_in_zone = True
                                has_intrus = True
                                if hasattr(st, "entry_count") and st.entry_count > 1:
                                    reentry_ct = max(reentry_ct, st.entry_count - 1)
                                break

                        # Check loitering state
                        if loitering_detector:
                            for zid in loitering_detector.zones:
                                lst = loitering_detector.track_states.get((config.camera_id, tid, zid))
                                if lst and lst.inside:
                                    is_in_zone = True
                                    active_dwell = max(active_dwell, lst.dwell_seconds)
                                    if lst.loitering_alerted:
                                        is_loit = True

                        # Check Phase 9 Night Movement
                        has_night_mvmt = False
                        if night_movement_detector and env_metrics:
                            nm_event = night_movement_detector.process_track(
                                camera_id=config.camera_id,
                                track_id=tid,
                                class_name=cls,
                                bbox=trk["bbox"],
                                environment_mode=env_metrics.mode,
                                brightness=env_metrics.brightness,
                                visibility_score=env_metrics.visibility_score,
                                current_time=current_frame_time,
                            )
                            if nm_event:
                                has_night_mvmt = True
                                total_night_movement_count += 1
                                if publisher:
                                    publisher.publish(nm_event.to_dict(), message_type="night_movement")
                                if adaptive_sampler:
                                    adaptive_sampler.register_threat(config.camera_id, 30)

                        # Check Phase 10 Anomaly & Group flags
                        has_anom = any(a.get("track_id") == tid for a in active_anomalies)
                        anom_reason = next((a.get("reason") for a in active_anomalies if a.get("track_id") == tid), None)
                        in_group = any(tid in g.get("track_ids", []) for g in active_groups)

                        assessment, alert_trig = risk_engine.evaluate_track(
                            camera_id=config.camera_id,
                            track=trk,
                            is_inside_zone=is_in_zone,
                            has_intrusion=has_intrus,
                            is_loitering=is_loit,
                            dwell_seconds=active_dwell,
                            reentry_count=reentry_ct,
                            current_time=current_frame_time,
                            publisher=publisher,
                            has_night_movement=has_night_mvmt,
                            has_movement_anomaly=has_anom,
                            movement_anomaly_reason=anom_reason,
                            has_group_movement=in_group,
                        )

                        trk["risk_score"] = assessment.score
                        trk["risk_level"] = assessment.level
                        trk["risk_reasons"] = [r.to_dict() for r in assessment.reasons]
                        if alert_trig:
                            total_risk_alerts_count += 1

                        # Step E: Phase 7 Forensic Incident Trigger
                        if incident_manager and assessment.level in ("HIGH", "CRITICAL"):
                            t_trig0 = time.perf_counter()
                            active_zone = "Sector Alpha Restricted Perimeter"
                            if intrusion_detector.zones:
                                first_zone = next(iter(intrusion_detector.zones.values()))
                                active_zone = getattr(first_zone, "name", active_zone)

                            inc = incident_manager.check_and_trigger(
                                camera_id=config.camera_id,
                                track_id=tid,
                                class_name=cls,
                                risk_score=assessment.score,
                                risk_level=assessment.level,
                                reasons=[r.to_dict() for r in assessment.reasons],
                                zone_name=active_zone,
                                event_type="RISK_ASSESSMENT",
                                current_time=current_frame_time,
                                publisher=publisher,
                            )
                            if inc:
                                total_incidents_count += 1
                            total_evidence_time_ms += (time.perf_counter() - t_trig0) * 1000.0

                        # Step F: Phase 8 Multi-Camera Threat Correlation
                        if correlation_engine and assessment.level in ("HIGH", "CRITICAL"):
                            t_corr0 = time.perf_counter()
                            corr = correlation_engine.ingest_event(
                                camera_id=config.camera_id,
                                track_id=str(tid),
                                class_name=cls,
                                event_type="RISK_ASSESSMENT",
                                risk_score=assessment.score,
                                risk_level=assessment.level,
                                zone_name=active_zone,
                                timestamp=current_frame_time,
                                incident_id=(inc.id if inc else None),
                                publisher=publisher,
                            )
                            if corr:
                                total_correlations_count += 1
                            total_correlation_time_ms += (time.perf_counter() - t_corr0) * 1000.0

                    total_risk_time_ms += (time.perf_counter() - t_risk0) * 1000.0
                    risk_engine.cleanup_inactive_tracks(
                        config.camera_id, {t["track_id"] for t in output["tracks"]}
                    )

                # Calculate frame processing latency and enrich telemetry
                frame_latency_ms = round((time.perf_counter() - t_frame_start) * 1000.0, 2)
                output["processing_latency_ms"] = frame_latency_ms
                output["frame_id"] = frame_counter
                output["frame_sequence"] = frame_counter
                output["measured_fps"] = source.measured_fps
                output["source_type"] = source.source_type.upper()

                # Publish tracking telemetry packet over WebSocket
                if publisher:
                    publisher.publish(output, message_type="tracking")

                    # Phase 14 & 17: Unified frame_state packet with counts and stream synchronization
                    person_cnt = counts_payload["visible"].get("person", 0)
                    vehicle_cnt = (
                        counts_payload["visible"].get("car", 0)
                        + counts_payload["visible"].get("truck", 0)
                        + counts_payload["visible"].get("bus", 0)
                        + counts_payload["visible"].get("motorcycle", 0)
                        + counts_payload["visible"].get("bicycle", 0)
                    )
                    obj_cnt = counts_payload["visible"].get("total", len(output.get("tracks", [])))
                    tw_evs = [ev.to_dict() for ev in events if ev.event_type == "TRIPWIRE_CROSSING" or ev.direction in ("IN", "OUT")] if events else []
                    zn_evs = [ev.to_dict() for ev in events if ev.event_type in ("RESTRICTED_ZONE_ENTRY", "RESTRICTED_ZONE_EXIT")] if events else []
                    ingress_info = intrusion_detector.get_ingress_counts(config.camera_id)
                    counts_payload["ingress_egress"] = ingress_info

                    frame_state = {
                        "type": "frame_state",
                        "camera_id": config.camera_id,
                        "frame_id": frame_counter,
                        "frame_sequence": frame_counter,
                        "source_type": source.source_type.upper(),
                        "timestamp": current_frame_time,
                        "measured_fps": source.measured_fps,
                        "processing_latency_ms": frame_latency_ms,
                        "detections": output.get("detections", []),
                        "tracks": output.get("tracks", []),
                        "counts": counts_payload,
                        "active_counts": counts_payload["visible"],
                        "unique_counts": counts_payload["unique_session"],
                        "person_count": person_cnt,
                        "vehicle_count": vehicle_cnt,
                        "object_count": obj_cnt,
                        "entries": ingress_info.get("entries", 0),
                        "exits": ingress_info.get("exits", 0),
                        "net_occupancy": ingress_info.get("net_occupancy", 0),
                        "ingress_egress": ingress_info,
                        "tripwire_events": tw_evs,
                        "zone_events": zn_evs,
                        "alerts": [ev.to_dict() for ev in events] if events else [],
                        "environment": env_metrics.to_dict() if env_metrics else {},
                        "risk": {
                            "max_score": max((t.get("risk_score", 0) for t in output.get("tracks", [])), default=0),
                            "level": max((t.get("risk_level", "LOW") for t in output.get("tracks", [])), default="LOW"),
                        },
                    }
                    publisher.publish(frame_state, message_type="frame_state")

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
                avg_loit = round(total_loitering_time_ms / processed_counter, 2) if loitering_detector else 0.0
                avg_risk = round(total_risk_time_ms / processed_counter, 2) if risk_engine else 0.0
                print(
                    f"[RUNNING] Frames: {processed_counter} | "
                    f"FPS: {current_fps} | "
                    f"Inference: {avg_inf}ms | "
                    f"Tracking: {avg_trk}ms | "
                    f"Geometry: {avg_geo}ms | "
                    f"Loitering: {avg_loit}ms | "
                    f"Risk: {avg_risk}ms | "
                    f"Active: {count} | "
                    f"Intrusions: {total_intrusions_count} | "
                    f"Loitering: {total_loitering_count} | "
                    f"Risk Alerts: {total_risk_alerts_count}"
                )
                last_log_time = now

            if args.max_frames > 0 and processed_counter >= args.max_frames:
                print(f"[CV-Service] Reached maximum requested frames ({args.max_frames}).")
                break

    except KeyboardInterrupt:
        print("\n[CV-Service] Stopping upon operator interrupt...")
    finally:
        # Finalize any pending active incidents upon stream completion
        if incident_manager and incident_manager.active_incidents:
            for inc_id, inc in list(incident_manager.active_incidents.items()):
                incident_manager.finalize_incident(inc, publisher=publisher)
                total_evidence_clips_count += 1

        total_time = time.perf_counter() - t_start
        source.release()
        if publisher:
            publisher.close()

        # Performance Summary Table
        avg_fps = round(processed_counter / total_time, 2) if total_time > 0 else 0.0
        avg_inference_latency = round(total_inference_time_ms / processed_counter, 2) if processed_counter > 0 else 0.0
        avg_tracking_latency = round(total_tracking_time_ms / processed_counter, 2) if processed_counter > 0 and use_tracking else 0.0
        avg_geometry_latency = round(total_geometry_time_ms / processed_counter, 3) if processed_counter > 0 else 0.0
        avg_loitering_latency = round(total_loitering_time_ms / processed_counter, 3) if processed_counter > 0 and loitering_detector else 0.0
        avg_risk_latency = round(total_risk_time_ms / processed_counter, 3) if processed_counter > 0 and risk_engine else 0.0
        avg_evidence_latency = round(total_evidence_time_ms / processed_counter, 3) if processed_counter > 0 and incident_manager else 0.0
        avg_correlation_latency = round(total_correlation_time_ms / processed_counter, 3) if processed_counter > 0 and correlation_engine else 0.0
        avg_env_latency = round(total_env_time_ms / processed_counter, 3) if processed_counter > 0 and env_analyzer else 0.0
        avg_enh_latency = round(total_enh_time_ms / total_enhanced_frames_count, 3) if total_enhanced_frames_count > 0 else 0.0
        avg_analytics_latency = round(total_analytics_time_ms / processed_counter, 3) if processed_counter > 0 and analytics_engine else 0.0
        avg_total_latency = round(avg_inference_latency + avg_tracking_latency + avg_geometry_latency + avg_loitering_latency + avg_risk_latency + avg_evidence_latency + avg_correlation_latency + avg_env_latency + avg_analytics_latency, 2)

        print("\n===================================================================")
        print("[BENCHMARK REPORT] PHASE 10 MOVEMENT, FLOW & BEHAVIOR PIPELINE")
        print("===================================================================")
        print(f" * Total Ingested Frames:          {frame_counter}")
        print(f" * Total Processed Frames:         {processed_counter}")
        print(f" * Total Execution Time:           {round(total_time, 2)}s")
        print(f" * Average Processed FPS:          {avg_fps}")
        print(f" * Environmental Mode Observed:    {last_known_mode}")
        print(f" * Average Environment Latency:    {avg_env_latency} ms")
        print(f" * Average Enhancement Latency:    {avg_enh_latency} ms ({total_enhanced_frames_count} frames enhanced)")
        print(f" * Average YOLO Inference Latency: {avg_inference_latency} ms")
        print(f" * Average ByteTrack Latency:      {avg_tracking_latency} ms")
        print(f" * Average Zone Geometry Latency:  {avg_geometry_latency} ms")
        print(f" * Average Loitering Latency:      {avg_loitering_latency} ms")
        print(f" * Average Risk Engine Latency:    {avg_risk_latency} ms")
        print(f" * Average Evidence Latency:       {avg_evidence_latency} ms")
        print(f" * Average Correlation Latency:    {avg_correlation_latency} ms")
        print(f" * Average Movement Analytics Lat: {avg_analytics_latency} ms")
        print(f" * Total Processing Latency:       {avg_total_latency} ms")
        print(f" * Total Observed Track Records:   {total_objects_count}")
        print(f" * Unique Persistent Track IDs:    {len(unique_track_ids)} IDs: {sorted(list(unique_track_ids))}")
        print(f" * Real Intrusion Alerts Triggered: {total_intrusions_count}")
        print(f" * Real Loitering Alerts Triggered: {total_loitering_count}")
        print(f" * Real Night Movement Triggered:  {total_night_movement_count}")
        print(f" * Real Movement Events Recorded:  {total_movement_events_count}")
        print(f" * Real Coordinated Groups Found:  {total_groups_detected_count}")
        print(f" * Real Movement Anomalies Found:  {total_analytics_anomalies_count}")
        print(f" * Real Risk Alerts Triggered:      {total_risk_alerts_count}")
        print(f" * Real Incidents Triggered:        {total_incidents_count}")
        print(f" * Real Evidence Clips Generated:   {total_evidence_clips_count}")
        print(f" * Real Correlated Threat Events:   {total_correlations_count}")
        print(f" * Tracked Classes Tally:          {dict(class_frequency)}")
        print("===================================================================\n")


if __name__ == "__main__":
    main()
