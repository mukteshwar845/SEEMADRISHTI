import datetime
import time
from typing import Any, Dict, List, Optional, Set
import numpy as np
from cv_service.config import CVConfig
from cv_service.detection.yolo_detector import YoloDetector

class TrackLifecycleRecord:
    """Internal tracker metadata for lifecycle management and class consistency."""
    def __init__(self, track_id: int, class_id: int, class_name: str):
        self.track_id = track_id
        self.class_id = class_id
        self.class_name = class_name
        self.age = 0  # Total frames since creation
        self.hits = 1  # Total times detected
        self.time_since_update = 0  # Consecutive frames since last detection
        self.state = "NEW"  # NEW -> ACTIVE -> LOST -> REMOVED
        self.history: List[Dict[str, int]] = []  # Recent bounding box centroids

    def mark_detected(self, bbox: Dict[str, int]):
        self.hits += 1
        self.time_since_update = 0
        self.age += 1
        if self.hits >= 2:
            self.state = "ACTIVE"
        cx = (bbox["x1"] + bbox["x2"]) // 2
        cy = (bbox["y1"] + bbox["y2"]) // 2
        self.history.append({"cx": cx, "cy": cy})
        if len(self.history) > 30:
            self.history.pop(0)

    def mark_missed(self, max_buffer: int):
        self.time_since_update += 1
        self.age += 1
        if self.time_since_update > max_buffer:
            self.state = "REMOVED"
        else:
            self.state = "LOST"


class ByteTrackEngine:
    """
    Multi-Object Tracking engine using ByteTrack for persistent identity preservation.
    
    Associates consecutive frame detections to maintain consistent Track IDs,
    manages track lifecycle states (NEW, ACTIVE, LOST, REMOVED), and enforces
    class-aware tracking to prevent cross-class ID swapping.
    """

    def __init__(self, config: Optional[CVConfig] = None, detector: Optional[YoloDetector] = None):
        self.config = config or CVConfig()
        self.detector = detector
        self.active_tracks: Dict[int, TrackLifecycleRecord] = {}
        self.observed_session_track_ids: Set[int] = set()
        self._total_tracking_time_ms = 0.0
        self._total_track_calls = 0
        self._is_initialized = False

    def initialize(self) -> bool:
        """Initialize tracker resources and ensure YOLO detector is loaded."""
        if self.detector is None:
            self.detector = YoloDetector(self.config)
            self.detector.load_model()
        elif not self.detector.is_loaded:
            self.detector.load_model()

        self._is_initialized = True
        print(f"[ByteTrackEngine] Initialized ByteTrack (buffer: {self.config.track_buffer} frames, match_thresh: {self.config.match_threshold})")
        return True

    def update(
        self,
        detections: Optional[List[Dict[str, Any]]] = None,
        frame: Optional[np.ndarray] = None,
        frame_id: Optional[int] = None,
        camera_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Convenience wrapper around track() returning only the active tracks list.
        """
        if frame is None:
            return []
        if not self._is_initialized:
            self.initialize()
        result = self.track(frame, camera_id=camera_id, frame_id=frame_id)
        return result.get("tracks", [])

    def track(
        self,
        frame: np.ndarray,
        camera_id: Optional[str] = None,
        frame_id: Optional[int] = None,
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute YOLO detection followed by ByteTrack multi-object association.

        Returns structured tracking payload containing persistent track IDs,
        bounding boxes, class labels, frame ID, and latency breakdowns.
        """
        if not self._is_initialized:
            self.initialize()

        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError("[ByteTrackEngine] Invalid or empty frame provided for tracking.")

        h, w = frame.shape[:2]
        cam_id = camera_id or self.config.camera_id
        timestamp_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Step 1: Run YOLO detection with latency measurement
        t_det_start = time.perf_counter()
        results = self.detector.model.track(
            source=frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=self.config.confidence_threshold,
            iou=getattr(self.config, "iou_threshold", 0.45),
            imgsz=self.config.input_size,
            classes=list(self.config.target_classes.keys()) if self.config.target_classes else None,
            verbose=False,
        )
        inference_time_ms = round((time.perf_counter() - t_det_start) * 1000, 2)

        # Step 2: ByteTrack identity extraction and lifecycle management
        t_track_start = time.perf_counter()

        raw_detections: List[Dict[str, Any]] = []
        tracks: List[Dict[str, Any]] = []
        observed_track_ids: Set[int] = set()

        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None and len(boxes) > 0:
                xyxy = boxes.xyxy.cpu().numpy()
                confs = boxes.conf.cpu().numpy()
                classes = boxes.cls.cpu().numpy().astype(int)
                track_ids = boxes.id.cpu().numpy().astype(int) if boxes.id is not None else None

                for i in range(len(boxes)):
                    cls_id = int(classes[i])
                    conf_val = round(float(confs[i]), 4)
                    box = xyxy[i]

                    # Clamp coordinates to actual frame boundaries
                    x1 = max(0, min(w, int(box[0])))
                    y1 = max(0, min(h, int(box[1])))
                    x2 = max(0, min(w, int(box[2])))
                    y2 = max(0, min(h, int(box[3])))

                    bbox_dict = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
                    class_name = self.config.target_classes.get(
                        cls_id,
                        self.detector.model.names.get(cls_id, f"class_{cls_id}")
                    )
                    category = YoloDetector.get_category_for_class(class_name)

                    # Append raw detection
                    raw_detections.append({
                        "class_name": class_name,
                        "class": class_name,
                        "class_id": cls_id,
                        "category": category,
                        "confidence": conf_val,
                        "bbox": bbox_dict,
                    })

                    # If tracker assigned a track_id, record track lifecycle
                    if track_ids is not None and i < len(track_ids):
                        track_id = int(track_ids[i])

                        # Class-Aware Consistency check
                        if track_id in self.active_tracks:
                            record = self.active_tracks[track_id]
                            if record.class_id != cls_id:
                                class_name = record.class_name
                                cls_id = record.class_id
                                category = YoloDetector.get_category_for_class(class_name)
                            record.mark_detected(bbox_dict)
                        else:
                            # New Track
                            record = TrackLifecycleRecord(track_id, cls_id, class_name)
                            record.mark_detected(bbox_dict)
                            self.active_tracks[track_id] = record

                        observed_track_ids.add(track_id)

                        cx = (x1 + x2) / 2.0
                        cy = (y1 + y2) / 2.0

                        tracks.append({
                            "track_id": track_id,
                            "class_name": class_name,
                            "class": class_name,
                            "class_id": cls_id,
                            "category": category,
                            "confidence": conf_val,
                            "state": record.state,
                            "bbox": bbox_dict,
                            "centroid": (cx, cy),
                            "frame_id": frame_id,
                            "trajectory": [{"x": p["cx"], "y": p["cy"]} for p in record.history],
                        })

        # Step 3: Handle lost and removed tracks
        current_active_ids = list(self.active_tracks.keys())
        for tid in current_active_ids:
            if tid not in observed_track_ids:
                self.active_tracks[tid].mark_missed(self.config.track_buffer)
                if self.active_tracks[tid].state == "REMOVED":
                    del self.active_tracks[tid]

        for tid in observed_track_ids:
            self.observed_session_track_ids.add(tid)

        tracking_time_ms = round((time.perf_counter() - t_track_start) * 1000, 2)
        self._total_tracking_time_ms += tracking_time_ms
        self._total_track_calls += 1

        total_latency_ms = round(inference_time_ms + tracking_time_ms, 2)

        return {
            "camera_id": cam_id,
            "frame_id": frame_id,
            "timestamp": timestamp_str,
            "source_timestamp": timestamp,
            "frame_width": w,
            "frame_height": h,
            "inference_ms": inference_time_ms,
            "tracking_ms": tracking_time_ms,
            "total_ms": total_latency_ms,
            "detection_count": len(raw_detections),
            "detections": raw_detections,
            "active_count": len(tracks),
            "track_count": len(tracks),
            "unique_session_count": len(self.observed_session_track_ids),
            "tracks": tracks,
        }

    def get_average_tracking_latency_ms(self) -> float:
        if self._total_track_calls == 0:
            return 0.0
        return round(self._total_tracking_time_ms / self._total_track_calls, 2)

    def reset(self):
        """Reset active track states and internal tracker memory upon video loop."""
        self.active_tracks.clear()
        if self.detector and self.detector.model:
            try:
                predictor = getattr(self.detector.model, "predictor", None)
                if predictor and hasattr(predictor, "trackers"):
                    for trk in predictor.trackers:
                        if hasattr(trk, "reset"):
                            trk.reset()
            except Exception:
                pass

# Alias for backwards compatibility
ByteTracker = ByteTrackEngine
