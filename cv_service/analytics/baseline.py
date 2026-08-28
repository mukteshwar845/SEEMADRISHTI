"""
SEEMADRISHTI AI - Baseline Learning Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Builds deterministic hourly surveillance baselines for movement, entry volume,
occupancy, and velocity. Flags INSUFFICIENT_DATA when sample size is low.
"""

import math
from typing import Any, Dict, List, Optional, Tuple


class HourlyMetricBaseline:
    """
    Stores historical observations and statistical distribution for a single metric
    in a specific hour bucket (0-23).
    """

    def __init__(self, metric_name: str, hour_bucket: int, min_samples: int = 3):
        self.metric_name: str = metric_name
        self.hour_bucket: int = int(hour_bucket)
        self.min_samples: int = int(min_samples)
        self.samples: List[float] = []

    def record_sample(self, value: float):
        self.samples.append(float(value))

    @property
    def sample_count(self) -> int:
        return len(self.samples)

    @property
    def status(self) -> str:
        if self.sample_count < self.min_samples:
            return "INSUFFICIENT_DATA"
        return "ESTABLISHED"

    @property
    def mean(self) -> float:
        if not self.samples:
            return 0.0
        return round(sum(self.samples) / len(self.samples), 2)

    @property
    def std_dev(self) -> float:
        if len(self.samples) < 2:
            return 0.0
        m = self.mean
        variance = sum((x - m) ** 2 for x in self.samples) / (len(self.samples) - 1)
        return round(math.sqrt(variance), 2)

    def calculate_deviation(self, observed_value: float) -> Tuple[float, Optional[float]]:
        """
        Returns (deviation_ratio, z_score).
        deviation_ratio = observed / max(0.1, mean)
        z_score = (observed - mean) / max(0.1, std_dev)
        """
        if self.status == "INSUFFICIENT_DATA":
            return (1.0, None)

        m = self.mean
        s = self.std_dev
        ratio = round(observed_value / max(0.1, m), 2)
        z_score = round((observed_value - m) / max(0.1, s), 2) if s > 0.0 else None
        return (ratio, z_score)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric_name": self.metric_name,
            "hour_bucket": self.hour_bucket,
            "sample_count": self.sample_count,
            "status": self.status,
            "mean": self.mean,
            "std_dev": self.std_dev,
        }


class BaselineLearner:
    """
    Learns and maintains baseline patterns across cameras, zones, and hours.
    """

    def __init__(self, min_samples: int = 3):
        self.min_samples: int = min_samples
        # Key: (camera_id, zone_id, hour_bucket, metric_name) -> HourlyMetricBaseline
        self.baselines: Dict[Tuple[str, str, int, str], HourlyMetricBaseline] = {}

    def get_or_create_baseline(
        self, camera_id: str, zone_id: str, hour_bucket: int, metric_name: str
    ) -> HourlyMetricBaseline:
        key = (camera_id, zone_id, int(hour_bucket), metric_name)
        if key not in self.baselines:
            self.baselines[key] = HourlyMetricBaseline(metric_name, hour_bucket, self.min_samples)
        return self.baselines[key]

    def record_observation(
        self, camera_id: str, zone_id: str, hour_bucket: int, metric_name: str, value: float
    ):
        baseline = self.get_or_create_baseline(camera_id, zone_id, hour_bucket, metric_name)
        baseline.record_sample(value)

    def evaluate_metric(
        self, camera_id: str, zone_id: str, hour_bucket: int, metric_name: str, current_value: float
    ) -> Dict[str, Any]:
        baseline = self.get_or_create_baseline(camera_id, zone_id, hour_bucket, metric_name)
        ratio, z_score = baseline.calculate_deviation(current_value)
        return {
            "camera_id": camera_id,
            "zone_id": zone_id,
            "hour_bucket": hour_bucket,
            "metric_name": metric_name,
            "current_value": current_value,
            "baseline_status": baseline.status,
            "baseline_mean": baseline.mean,
            "baseline_std_dev": baseline.std_dev,
            "deviation_ratio": ratio,
            "z_score": z_score,
        }
