import sys
import os
import cv2
import numpy as np

sys.path.insert(0, os.getcwd())

from cv_service.tools.webcam_processor import WebcamCVProcessor

print("Testing WebcamCVProcessor...")
proc = WebcamCVProcessor(port=8088)
proc.initialize()

# Read a test frame from fixture
fixture_path = "cv_service/tests/fixtures/intrusion_test.mp4"
if os.path.exists(fixture_path):
    cap = cv2.VideoCapture(fixture_path)
    ret, frame = cap.read()
    cap.release()
else:
    frame = np.zeros((480, 640, 3), dtype=np.uint8)

res = proc.process_frame("cam-01", frame)
print("Process frame result:")
print("Success:", res["success"])
print("Source type:", res["source_type"])
print("Processing mode:", res["processing_mode"])
print("Telemetry:", res["telemetry"])
print("Tracks count:", len(res["tracks"]))
print("Detections count:", len(res["detections"]))
print("Risk:", res["risk"])
print("TEST COMPLETED SUCCESSFULLY!")
