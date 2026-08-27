"""
SEEMADRISHTI AI - Intrusion Detection Package (Phase 4)
Provides stateful geometric boundary crossing detection, duplicate alert prevention,
and SQLite persistence bridge.
"""

from .detector import IntrusionDetector, IntrusionEvent, TrackZoneState

__all__ = ["IntrusionDetector", "IntrusionEvent", "TrackZoneState"]
