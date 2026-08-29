import datetime
import time
from typing import Any, Dict, List, Optional
import numpy as np
from cv_service.config import CVConfig

class YoloDetector:
    """Ultralytics YOLO inference wrapper for real-time object detection."""

    def __init__(self, config: Optional[CVConfig] = None):
        self.config = config or CVConfig()
        self.model = None
        self.is_loaded = False
        self._total_inferences = 0
        self._total_inference_time_ms = 0.0

    def load_model(self) -> bool:
        """Load pretrained YOLO weights and run a dummy warm-up inference."""
        try:
            from ultralytics import YOLO

            print(f"[YoloDetector] Loading YOLO model: '{self.config.model_name}'...")
            self.model = YOLO(self.config.model_name)

            # Warm-up inference with blank image
            dummy_img = np.zeros((self.config.input_size, self.config.input_size, 3), dtype=np.uint8)
            self.model.predict(
                source=dummy_img,
                imgsz=self.config.input_size,
                conf=self.config.confidence_threshold,
                verbose=False,
            )

            self.is_loaded = True
            print(f"[YoloDetector] Model '{self.config.model_name}' loaded and warmed up successfully.")
            return True
        except Exception as e:
            self.is_loaded = False
            raise RuntimeError(
                f"[YoloDetector] Failed to load YOLO model '{self.config.model_name}': {str(e)}"
            ) from e

    def detect(self, frame: np.ndarray, camera_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute real YOLO inference on an input frame.

        Returns structured detection output containing real bounding boxes,
        confidence percentages, class labels, and inference latency.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("[YoloDetector] Model is not loaded. Call load_model() first.")

        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError("[YoloDetector] Invalid or empty frame provided for detection.")

        h, w = frame.shape[:2]
        cam_id = camera_id or self.config.camera_id
        timestamp_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

        t_start = time.perf_counter()

        # Run actual Ultralytics YOLO inference
        results = self.model.predict(
            source=frame,
            imgsz=self.config.input_size,
            conf=self.config.confidence_threshold,
            classes=list(self.config.target_classes.keys()),
            verbose=False,
        )

        inference_time_ms = round((time.perf_counter() - t_start) * 1000, 2)
        self._total_inferences += 1
        self._total_inference_time_ms += inference_time_ms

        detections: List[Dict[str, Any]] = []

        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None and len(boxes) > 0:
                xyxy = boxes.xyxy.cpu().numpy()  # [x1, y1, x2, y2]
                confs = boxes.conf.cpu().numpy()  # confidence
                classes = boxes.cls.cpu().numpy().astype(int)  # class id

                limit = min(len(boxes), self.config.max_detections)
                for i in range(limit):
                    cls_id = int(classes[i])
                    conf_val = round(float(confs[i]), 4)
                    box = xyxy[i]

                    # Clamp coordinates to frame boundaries
                    x1 = max(0, int(box[0]))
                    y1 = max(0, int(box[1]))
                    x2 = min(w, int(box[2]))
                    y2 = min(h, int(box[3]))

                    class_name = self.config.target_classes.get(
                        cls_id,
                        self.model.names.get(cls_id, f"class_{cls_id}")
                    )

                    detections.append({
                        "class_name": class_name,
                        "class_id": cls_id,
                        "confidence": conf_val,
                        "bbox": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                        },
                    })

        return {
            "camera_id": cam_id,
            "timestamp": timestamp_str,
            "frame_width": w,
            "frame_height": h,
            "inference_ms": inference_time_ms,
            "detection_count": len(detections),
            "detections": detections,
        }

    def get_average_latency_ms(self) -> float:
        if self._total_inferences == 0:
            return 0.0
        return round(self._total_inference_time_ms / self._total_inferences, 2)

# Alias for backwards compatibility
YOLODetector = YoloDetector
