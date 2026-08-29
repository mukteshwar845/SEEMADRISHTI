"""
SEEMADRISHTI AI - Video Ingestion Adapter (Backward Compatibility Layer)
Re-exports all symbols from cv_service.video.source.
"""

from cv_service.video.source import (
    VideoSource,
    MP4Source,
    WebcamSource,
    RTSPSource,
    create_video_source,
)

__all__ = [
    "VideoSource",
    "MP4Source",
    "WebcamSource",
    "RTSPSource",
    "create_video_source",
]
