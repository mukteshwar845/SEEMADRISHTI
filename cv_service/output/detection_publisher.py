import asyncio
import json
import threading
import time
from typing import Any, Dict, Optional
import requests
import websockets
from cv_service.config import CVConfig

class DetectionPublisher:
    """Publishes real YOLO detection metadata to Node.js WebSocket gateway with HTTP fallback."""

    def __init__(self, config: Optional[CVConfig] = None):
        self.config = config or CVConfig()
        self.ws_url = self.config.ws_url
        self.http_url = f"{self.config.http_backend_url}/api/dev/broadcast"
        self._ws = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._is_running = False
        self._connected = False
        self._outbox = asyncio.Queue() if hasattr(asyncio, "Queue") else None
        self.packets_sent = 0
        self.packets_failed = 0

    def start(self) -> None:
        """Start background worker thread for asynchronous WebSocket publishing."""
        if self._is_running:
            return

        self._is_running = True
        self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self._thread.start()

        # Wait up to 1.5s for initial connection
        t0 = time.time()
        while not self._connected and (time.time() - t0) < 1.5:
            time.sleep(0.1)

    def _run_event_loop(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._outbox = asyncio.Queue()
        try:
            self._loop.run_until_complete(self._worker_loop())
        except Exception:
            pass
        finally:
            try:
                pending = asyncio.all_tasks(self._loop)
                for task in pending:
                    task.cancel()
                if pending:
                    self._loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
                self._loop.run_until_complete(self._loop.shutdown_asyncgens())
                self._loop.close()
            except Exception:
                pass

    async def _worker_loop(self) -> None:
        """Main connection and message draining loop with auto-reconnect."""
        while self._is_running:
            try:
                print(f"[DetectionPublisher] Connecting to WebSocket: {self.ws_url}...")
                async with websockets.connect(self.ws_url, ping_interval=10, ping_timeout=5) as ws:
                    self._ws = ws
                    self._connected = True
                    print(f"[DetectionPublisher] Connected to WebSocket gateway: {self.ws_url}")

                    while self._is_running:
                        try:
                            # Wait for next packet from queue (with timeout)
                            packet = await asyncio.wait_for(self._outbox.get(), timeout=1.0)
                            if "timestamp" not in packet:
                                packet["timestamp"] = int(time.time() * 1000)
                            await ws.send(json.dumps(packet))
                            self.packets_sent += 1
                            self._outbox.task_done()
                        except asyncio.TimeoutError:
                            continue
                        except websockets.ConnectionClosed:
                            print("[DetectionPublisher] WebSocket connection closed. Reconnecting...")
                            break
            except Exception as e:
                self._connected = False
                self._ws = None
                # Sleep before retrying
                await asyncio.sleep(2.0)

    def publish(self, payload_data: Dict[str, Any], message_type: Optional[str] = None) -> bool:
        """
        Publish detection or tracking data synchronously. Queues to WebSocket worker,
        or falls back to HTTP POST if WebSocket is disconnected.
        """
        if not self._is_running:
            self.start()

        # Determine message type: tracking if 'tracks' present, else detection
        m_type = message_type or ("tracking" if "tracks" in payload_data else "detection")
        packet = {
            "type": m_type,
            "data": payload_data,
            "timestamp": int(time.time() * 1000),
        }

        # If connected to WebSocket and loop is alive, enqueue message
        if self._connected and self._loop and self._outbox:
            try:
                self._loop.call_soon_threadsafe(self._outbox.put_nowait, packet)
                return True
            except Exception:
                pass

        # Fallback to HTTP POST if WebSocket is disconnected or enqueuing fails
        try:
            resp = requests.post(
                self.http_url,
                json=packet,
                timeout=0.8,
            )
            if resp.status_code == 200:
                self.packets_sent += 1
                return True
        except Exception:
            self.packets_failed += 1
            return False

        return False

    def close(self) -> None:
        self._is_running = False
        if self._loop:
            self._loop.call_soon_threadsafe(self._loop.stop)
        self._connected = False
