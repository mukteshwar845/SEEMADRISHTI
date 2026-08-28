"""
SEEMADRISHTI AI - Explainable Movement Anomaly Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Deterministic, rule-based statistical anomaly detector for border traffic flow.
Generates human-readable, auditable reason codes with explicit mathematical ratios.
"""

import time
import uuid
from typing import Any, Dict, List, Optional

from cv_service.analytics.baseline import BaselineLearner


class AnomalyDetector:
    """
    Evaluates live surveillance metrics against learned baselines.
    Emits explainable anomaly records when metrics cross calibrated thresholds.
    """

    def __init__(
        self,
        baseline_learner: BaselineLearner,
        entry_anomaly_ratio: float = 2.5,
        exit_anomaly_ratio: float = 2.5,
        occupancy_anomaly_ratio: float = 2.0,
        speed_anomaly_ratio: float = 3.0,
    ):
        self.baseline_learner: BaselineLearner = baseline_learner
        self.entry_anomaly_ratio: float = float(entry_anomaly_ratio)
        self.exit_anomaly_ratio: float = float(exit_anomaly_ratio)
        self.occupancy_anomaly_ratio: float = float(occupancy_anomaly_ratio)
        self.speed_anomaly_ratio: float = float(speed_anomaly_ratio)

        # Anti-flood cooldown: key -> last_alert_time
        self.last_alerts: Dict[str, float] = {}
        self.cooldown_seconds: float = 30.0

    def evaluate_entry_count(
        self,
        camera_id: str,
        zone_id: str,
        current_entries: int,
        hour_bucket: int,
        timestamp: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Checks if current entry count is an anomaly relative to historical hourly baseline.
        """
        now = float(timestamp) if timestamp is not None else time.time()
        res = self.baseline_learner.evaluate_metric(camera_id, zone_id, hour_bucket, "entries", current_entries)

        if res["baseline_status"] != "ESTABLISHED":
            return None

        ratio = res["deviation_ratio"]
        mean_val = res["baseline_mean"]

        if ratio >= self.entry_anomaly_ratio and current_entries >= 3:
            dedup_key = f"{camera_id}_{zone_id}_entry_anomaly"
            if (now - self.last_alerts.get(dedup_key, 0.0)) < self.cooldown_seconds:
                return None
            self.last_alerts[dedup_key] = now

            severity = "HIGH" if ratio >= 3.0 else "MEDIUM"
            reason = (
                f"{camera_id} recorded {current_entries} entries during {hour_bucket:02d}:00–"
                f"{(hour_bucket+1)%24:02d}:00, which is {ratio:.1f}× the learned baseline ({mean_val:.1f})."
            )

            return {
                "id": f"anom-{uuid.uuid4().hex[:12]}",
                "camera_id": camera_id,
                "zone_id": zone_id,
                "anomaly_type": "HIGH_VOLUME_ENTRY",
                "severity": severity,
                "score": min(100, int(ratio * 25)),
                "reason": reason,
                "observed_value": float(current_entries),
                "baseline_value": float(mean_val),
                "deviation_ratio": ratio,
                "timestamp": now,
            }

        return None

    def evaluate_occupancy(
        self,
        camera_id: str,
        zone_id: str,
        current_occupants: int,
        hour_bucket: int,
        timestamp: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        now = float(timestamp) if timestamp is not None else time.time()
        res = self.baseline_learner.evaluate_metric(camera_id, zone_id, hour_bucket, "occupancy", current_occupants)

        if res["baseline_status"] != "ESTABLISHED":
            return None

        ratio = res["deviation_ratio"]
        mean_val = res["baseline_mean"]

        if ratio >= self.occupancy_anomaly_ratio and current_occupants >= 3:
            dedup_key = f"{camera_id}_{zone_id}_occupancy_anomaly"
            if (now - self.last_alerts.get(dedup_key, 0.0)) < self.cooldown_seconds:
                return None
            self.last_alerts[dedup_key] = now

            severity = "CRITICAL" if ratio >= 3.0 else "HIGH"
            reason = (
                f"{camera_id} zone {zone_id} occupancy reached {current_occupants} occupants, "
                f"which is {ratio:.1f}× the normal baseline ({mean_val:.1f})."
            )

            return {
                "id": f"anom-{uuid.uuid4().hex[:12]}",
                "camera_id": camera_id,
                "zone_id": zone_id,
                "anomaly_type": "ABNORMAL_OCCUPANCY",
                "severity": severity,
                "score": min(100, int(ratio * 30)),
                "reason": reason,
                "observed_value": float(current_occupants),
                "baseline_value": float(mean_val),
                "deviation_ratio": ratio,
                "timestamp": now,
            }

        return None

    def evaluate_speed(
        self,
        camera_id: str,
        zone_id: str,
        track_id: int,
        speed_px_s: float,
        hour_bucket: int,
        timestamp: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        now = float(timestamp) if timestamp is not None else time.time()
        res = self.baseline_learner.evaluate_metric(camera_id, zone_id, hour_bucket, "speed", speed_px_s)

        if res["baseline_status"] != "ESTABLISHED":
            return None

        ratio = res["deviation_ratio"]
        mean_val = res["baseline_mean"]

        if ratio >= self.speed_anomaly_ratio and speed_px_s >= 50.0:
            dedup_key = f"{camera_id}_{track_id}_speed_anomaly"
            if (now - self.last_alerts.get(dedup_key, 0.0)) < self.cooldown_seconds:
                return None
            self.last_alerts[dedup_key] = now

            reason = (
                f"Track #{track_id} on {camera_id} moving at {speed_px_s:.1f} px/s, "
                f"which is {ratio:.1f}× normal speed ({mean_val:.1f} px/s)."
            )

            return {
                "id": f"anom-{uuid.uuid4().hex[:12]}",
                "camera_id": camera_id,
                "zone_id": zone_id,
                "anomaly_type": "ABNORMAL_SPEED",
                "severity": "MEDIUM",
                "score": min(100, int(ratio * 20)),
                "reason": reason,
                "observed_value": float(speed_px_s),
                "baseline_value": float(mean_val),
                "deviation_ratio": ratio,
                "timestamp": now,
            }

        return None
