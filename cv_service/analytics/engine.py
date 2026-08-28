"""
SEEMADRISHTI AI - Master Movement & Behavior Analytics Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Unified analytics orchestrator integrating trajectories, direction, speed,
entry/exit counts, zone occupancy, spatial density, temporal aggregation,
corridor flow, baseline learning, anomaly detection, and group movement.
"""

import time
from typing import Any, Dict, List, Optional, Tuple

from cv_service.analytics.trajectory import TrajectoryEngine
from cv_service.analytics.direction import DirectionAnalyzer
from cv_service.analytics.speed import SpeedCalculator
from cv_service.analytics.counter import EntryExitCounter
from cv_service.analytics.occupancy import OccupancyEngine
from cv_service.analytics.density import SpatialDensityGrid
from cv_service.analytics.corridor import CorridorAnalyzer
from cv_service.analytics.temporal import TemporalAggregator
from cv_service.analytics.baseline import BaselineLearner
from cv_service.analytics.anomaly import AnomalyDetector
from cv_service.analytics.group_movement import GroupMovementDetector


class MovementAnalyticsEngine:
    """
    Main Analytics Engine orchestrating all Phase 10 computer vision intelligence.
    """

    def __init__(
        self,
        camera_id: str,
        frame_width: int = 1920,
        frame_height: int = 1080,
        grid_rows: int = 8,
        grid_cols: int = 8,
        min_displacement_px: float = 3.0,
        max_separation_px: float = 120.0,
        min_group_size: int = 2,
    ):
        self.camera_id: str = camera_id
        self.frame_width: int = int(frame_width)
        self.frame_height: int = int(frame_height)

        # Core analytics submodules
        self.trajectories: TrajectoryEngine = TrajectoryEngine(max_history_points=100)
        self.direction_analyzer: DirectionAnalyzer = DirectionAnalyzer(min_displacement_px=min_displacement_px)
        self.speed_calculator: SpeedCalculator = SpeedCalculator()
        self.counter: EntryExitCounter = EntryExitCounter()
        self.occupancy: OccupancyEngine = OccupancyEngine()
        self.density: SpatialDensityGrid = SpatialDensityGrid(
            camera_id=camera_id,
            frame_width=frame_width,
            frame_height=frame_height,
            grid_rows=grid_rows,
            grid_cols=grid_cols,
        )
        self.corridor_analyzer: CorridorAnalyzer = CorridorAnalyzer()
        self.temporal: TemporalAggregator = TemporalAggregator()
        self.baseline_learner: BaselineLearner = BaselineLearner(min_samples=3)
        self.anomaly_detector: AnomalyDetector = AnomalyDetector(self.baseline_learner)
        self.group_detector: GroupMovementDetector = GroupMovementDetector(
            max_separation_px=max_separation_px,
            min_group_size=min_group_size,
        )

        self.last_frame_time: float = time.time()
        self.processed_frames: int = 0

    def register_zone(self, zone_id: str, zone_name: str, polygon: List[Tuple[float, float]]):
        """
        Registers a restricted polygon zone for entry/exit and occupancy analytics.
        """
        self.counter.register_zone(self.camera_id, zone_id, zone_name, polygon)
        self.occupancy.register_zone(self.camera_id, zone_id, zone_name, polygon)

    def process_frame(
        self,
        tracks: List[Dict[str, Any]],
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Ingests ByteTrack output tracks for the current frame.
        Computes trajectories, directions, velocities, zone transitions,
        density, group dynamics, temporal buckets, and anomalies.
        """
        now = float(timestamp) if timestamp is not None else time.time()
        self.processed_frames += 1

        enriched_tracks = []
        for trk in tracks:
            tid = int(trk["track_id"])
            cname = trk.get("class_name", "person")
            bbox = trk["bbox"]
            if isinstance(bbox, dict):
                bbox_list = [bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]]
            else:
                bbox_list = list(bbox)

            cx = (bbox_list[0] + bbox_list[2]) / 2.0
            cy = (bbox_list[1] + bbox_list[3]) / 2.0

            # Update trajectory
            traj = self.trajectories.update_track(self.camera_id, tid, cname, bbox_list, now)

            # Compute direction
            direction = self.direction_analyzer.calculate_direction(traj.centroid_history)
            traj.current_direction = direction

            # Compute speed
            speed = self.speed_calculator.calculate_current_speed(traj.centroid_history, traj.timestamps)

            enriched = {
                "track_id": tid,
                "class_name": cname,
                "bbox": bbox_list,
                "centroid": (cx, cy),
                "direction": direction,
                "speed": speed,
                "total_distance": traj.total_distance,
                "average_speed": traj.average_speed,
            }
            enriched_tracks.append(enriched)

        # 1. Entry / Exit Transitions
        movement_events = self.counter.process_tracks(self.camera_id, enriched_tracks, now)

        # 2. Zone Occupancy
        occupancy_stats = self.occupancy.update_camera(self.camera_id, enriched_tracks, now)
        current_total_occupants = sum(s.get("current_occupants", 0) for s in occupancy_stats)

        # 3. Spatial Density
        self.density.record_centroids(enriched_tracks)

        # 4. Group Movement Detection
        groups = self.group_detector.process_tracks(self.camera_id, enriched_tracks, now)

        # 5. Temporal Aggregation
        for ev in movement_events:
            self.temporal.record_event(self.camera_id, ev["event_type"], ev["class_name"], 1, now)
        self.temporal.record_tracks_and_occupancy(self.camera_id, enriched_tracks, current_total_occupants, now)

        # 6. Anomaly Detection
        anomalies = []
        hour_bucket = int(time.strftime("%H", time.localtime(now)))
        for occ in occupancy_stats:
            zid = occ["zone_id"]
            cur_occ = occ["current_occupants"]
            anom = self.anomaly_detector.evaluate_occupancy(self.camera_id, zid, cur_occ, hour_bucket, now)
            if anom:
                anomalies.append(anom)

        # Speed anomalies on active tracks
        for trk in enriched_tracks:
            sp = trk["speed"]
            anom_spd = self.anomaly_detector.evaluate_speed(self.camera_id, "frame", trk["track_id"], sp, hour_bucket, now)
            if anom_spd:
                anomalies.append(anom_spd)

        return {
            "camera_id": self.camera_id,
            "timestamp": now,
            "active_tracks": len(enriched_tracks),
            "tracks": enriched_tracks,
            "movement_events": movement_events,
            "occupancy": occupancy_stats,
            "groups": groups,
            "anomalies": anomalies,
        }

    def get_summary(self) -> Dict[str, Any]:
        """
        Returns full statistical summary across all sub-engines for API consumption.
        """
        active_trajs = self.trajectories.get_active_trajectories(self.camera_id)
        speeds = [t.average_speed for t in active_trajs if t.average_speed > 0]
        avg_speed = round(sum(speeds) / len(speeds), 2) if speeds else 0.0

        direction_counts: Dict[str, int] = {}
        for t in active_trajs:
            d = t.current_direction
            direction_counts[d] = direction_counts.get(d, 0) + 1

        return {
            "camera_id": self.camera_id,
            "total_active_tracks": len(active_trajs),
            "average_speed_px_s": avg_speed,
            "direction_distribution": direction_counts,
            "zones": self.counter.get_all_stats(),
            "occupancy": self.occupancy.get_all_stats(),
            "hotspots": self.density.get_top_hotspots(5),
            "corridors": self.corridor_analyzer.get_all_corridors(),
        }
