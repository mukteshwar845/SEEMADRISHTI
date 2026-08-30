"""
SEEMADRISHTI AI - Cross-Camera Intelligence & Handover Correlator (Phase 19)

Team: IQ100
Problem Statement: SIH26187

Coordinates multi-camera surveillance intelligence without mutating or merging
camera-local ByteTrack identifiers.
"""

import time
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone

from cv_service.correlation.camera_topology import CameraTopology
from cv_service.correlation.handover import HandoverRecord
from cv_service.correlation.target_matcher import TargetMatcher


class CrossCameraCorrelator:
    """
    Maintains cross-camera target handovers, correlations, and trajectory continuations.
    """

    def __init__(self, topology: Optional[CameraTopology] = None):
        self.topology = topology or CameraTopology()
        self.matcher = TargetMatcher(self.topology)
        self._correlation_counter = 0
        self.active_correlations: Dict[str, HandoverRecord] = {}
        # Recent track exits: (camera_id, track_id) -> record dict
        self.recent_exits: Dict[Tuple[str, int], Dict[str, Any]] = {}
        self.handovers: List[HandoverRecord] = []

    def _next_correlation_id(self) -> str:
        self._correlation_counter += 1
        return f"CORR-{self._correlation_counter:04d}"

    def register_track_exit(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        exit_time: Optional[float] = None,
        direction: str = "OUT",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Records a track exiting or leaving the monitored boundary of a camera."""
        now = exit_time if exit_time is not None else time.time()
        self.recent_exits[(camera_id.strip().lower(), int(track_id))] = {
            "camera_id": camera_id.strip().lower(),
            "track_id": int(track_id),
            "class_name": class_name.strip().lower(),
            "exit_time": now,
            "direction": direction,
            "metadata": metadata or {},
        }

    def evaluate_track_entry(
        self,
        camera_id: str,
        track_id: int,
        class_name: str,
        entry_time: Optional[float] = None,
        direction: str = "IN",
        publisher: Optional[Any] = None,
    ) -> Optional[HandoverRecord]:
        """
        Evaluates whether a newly appearing track on camera_id correlates with a recent exit
        from an adjacent topological sector.
        """
        now = entry_time if entry_time is not None else time.time()
        dst_cam = camera_id.strip().lower()
        dst_tid = int(track_id)
        dst_cls = class_name.strip().lower()

        best_match: Optional[Tuple[Tuple[str, int], float, str, float]] = None
        best_confidence = 0.0

        # Scan recent candidate exits
        for (src_cam, src_tid), exit_data in list(self.recent_exits.items()):
            if src_cam == dst_cam:
                continue  # cannot correlate on same camera

            valid, conf, reason, gap = self.matcher.evaluate_handover(
                src_camera=src_cam,
                src_track_id=src_tid,
                src_class=exit_data["class_name"],
                src_exit_time=exit_data["exit_time"],
                dst_camera=dst_cam,
                dst_track_id=dst_tid,
                dst_class=dst_cls,
                src_direction=exit_data.get("direction", "OUT"),
                dst_direction=direction,
                dst_entry_time=now,
            )

            if valid and conf > best_confidence:
                best_confidence = conf
                best_match = ((src_cam, src_tid), conf, reason, gap)

        if best_match and best_confidence >= 0.50:
            (src_cam, src_tid), conf, reason, gap = best_match
            corr_id = self._next_correlation_id()
            edge = self.topology.get_edge(src_cam, dst_cam)
            sector_name = edge.sector_name if edge else "Inter-Sector Corridor"

            handover = HandoverRecord(
                correlation_id=corr_id,
                source_camera=src_cam,
                source_track_id=src_tid,
                destination_camera=dst_cam,
                destination_track_id=dst_tid,
                class_name=dst_cls,
                first_seen=self.recent_exits[(src_cam, src_tid)]["exit_time"],
                last_seen=now,
                temporal_gap=round(gap, 2),
                confidence=conf,
                reason=reason,
                spatial_relationship=f"{src_cam.upper()} -> {dst_cam.upper()} ({sector_name})",
                status="VERIFIED",
            )
            self.active_correlations[corr_id] = handover
            self.handovers.append(handover)

            # Consume used exit
            self.recent_exits.pop((src_cam, src_tid), None)

            # Publish WebSocket notification
            if publisher and hasattr(publisher, "publish"):
                publisher.publish(handover.to_dict(), message_type="correlation_created")

            return handover

        elif best_match and 0.20 <= best_confidence < 0.50:
            (src_cam, src_tid), conf, reason, gap = best_match
            corr_id = self._next_correlation_id()
            uncertain_record = HandoverRecord(
                correlation_id=corr_id,
                source_camera=src_cam,
                source_track_id=src_tid,
                destination_camera=dst_cam,
                destination_track_id=dst_tid,
                class_name=dst_cls,
                first_seen=self.recent_exits[(src_cam, src_tid)]["exit_time"],
                last_seen=now,
                temporal_gap=round(gap, 2),
                confidence=conf,
                reason="CORRELATION UNCERTAIN: " + reason,
                spatial_relationship=f"{src_cam.upper()} ?-> {dst_cam.upper()}",
                status="UNCERTAIN",
            )
            self.active_correlations[corr_id] = uncertain_record
            return uncertain_record

        return None

    def get_all_handovers(self) -> List[Dict[str, Any]]:
        return [h.to_dict() for h in self.handovers]

    def prune_stale_exits(self, current_time: Optional[float] = None, max_age_seconds: float = 60.0) -> int:
        now = current_time if current_time is not None else time.time()
        to_delete = [
            k for k, exit_info in self.recent_exits.items()
            if (now - exit_info["exit_time"]) > max_age_seconds
        ]
        for k in to_delete:
            del self.recent_exits[k]
        return len(to_delete)

    def reset_session(self) -> None:
        """Resets active transient correlations without breaking topology."""
        self.active_correlations.clear()
        self.recent_exits.clear()
        self.handovers.clear()
