"""
SEEMADRISHTI AI - Multi-Camera Handover Models & Records (Phase 19)

Team: IQ100
Problem Statement: SIH26187

Maintains structured handover records between distinct camera channels
without modifying or merging camera-local ByteTrack identifiers.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import time
from typing import Any, Dict, List, Optional


@dataclass
class HandoverRecord:
    correlation_id: str
    source_camera: str
    source_track_id: int
    destination_camera: str
    destination_track_id: int
    class_name: str
    first_seen: float
    last_seen: float
    temporal_gap: float
    confidence: float  # 0.0 to 1.0 (e.g. 0.87 = 87%)
    reason: str
    spatial_relationship: str
    status: str = "VERIFIED"  # "VERIFIED", "UNCERTAIN", "REJECTED"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def confidence_percent(self) -> int:
        return int(round(self.confidence * 100))

    @property
    def display_status(self) -> str:
        if self.status == "VERIFIED" and self.confidence >= 0.50:
            return "TARGET HANDOVER DETECTED"
        if self.status == "UNCERTAIN" or (0.20 <= self.confidence < 0.50):
            return "CORRELATION UNCERTAIN"
        return "NO VERIFIED HANDOVER"

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["confidence_percent"] = self.confidence_percent
        d["display_status"] = self.display_status
        return d
