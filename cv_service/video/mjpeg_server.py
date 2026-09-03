"""
SEEMADRISHTI AI - Real-Time MJPEG Stream Broadcaster
Serves live processed video frames over HTTP (MJPEG) for zero-lag browser consumption.
"""

import time
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from typing import Dict, Optional
import cv2
import numpy as np


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server so multiple browser clients can stream concurrently."""
    daemon_threads = True
    allow_reuse_address = True


class MJPEGStreamServer:
    """Lightweight MJPEG server broadcasting video frames over HTTP."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8085):
        self.host = host
        self.port = port
        self.latest_frames: Dict[str, bytes] = {}
        self._lock = threading.Lock()
        self._server: Optional[ThreadedHTTPServer] = None
        self._thread: Optional[threading.Thread] = None
        self._is_running = False

    def update_frame(self, frame: np.ndarray, camera_id: str = "cam-01", quality: int = 70) -> None:
        """Encodes frame to JPEG and stores latest frame for streaming."""
        if frame is None:
            return
        try:
            # Resize frame if too large for smooth network transport
            h, w = frame.shape[:2]
            if w > 1280:
                scale = 1280 / w
                frame = cv2.resize(frame, (1280, int(h * scale)))
            
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            success, buffer = cv2.imencode(".jpg", frame, encode_param)
            if success:
                cam_key = str(camera_id).lower().replace("^cam-0?", "cam-0")
                with self._lock:
                    self.latest_frames[cam_key] = buffer.tobytes()
                    self.latest_frames["default"] = buffer.tobytes()
        except Exception:
            pass

    def start(self) -> None:
        """Start streaming server in background daemon thread."""
        if self._is_running:
            return

        outer = self

        class StreamHandler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                # Suppress noisy HTTP connection logging
                pass

            def do_GET(self):
                cam_key = self.path.split("/")[-1].lower() or "default"
                if not cam_key or cam_key == "stream":
                    cam_key = "default"

                if self.path.startswith("/health"):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(b'{"status":"ok","service":"seemadrishti-mjpeg"}')
                    return

                if not self.path.startswith("/stream"):
                    self.send_response(404)
                    self.end_headers()
                    return

                # Send MJPEG multipart header
                self.send_response(200)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()

                last_sent_time = 0
                while outer._is_running:
                    now = time.time()
                    # Limit stream to ~30 FPS
                    if now - last_sent_time < 0.033:
                        time.sleep(0.01)
                        continue

                    frame_bytes = None
                    with outer._lock:
                        frame_bytes = outer.latest_frames.get(cam_key) or outer.latest_frames.get("default")

                    if frame_bytes:
                        try:
                            self.wfile.write(b"--frame\r\n")
                            self.send_header("Content-Type", "image/jpeg")
                            self.send_header("Content-Length", str(len(frame_bytes)))
                            self.end_headers()
                            self.wfile.write(frame_bytes)
                            self.wfile.write(b"\r\n")
                            last_sent_time = now
                        except (BrokenPipeError, ConnectionResetError):
                            break
                        except Exception:
                            break
                    else:
                        time.sleep(0.05)

        try:
            self._server = ThreadedHTTPServer((self.host, self.port), StreamHandler)
            self._is_running = True
            self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
            self._thread.start()
            print(f"[MJPEGStreamServer] Live HTTP streaming server running on http://{self.host}:{self.port}/stream/cam-01")
        except Exception as e:
            print(f"[MJPEGStreamServer] Warning: Failed to bind streaming server on port {self.port}: {e}")

    def stop(self) -> None:
        """Stop streaming server."""
        self._is_running = False
        if self._server:
            try:
                self._server.shutdown()
                self._server.server_close()
            except Exception:
                pass
        self._server = None
