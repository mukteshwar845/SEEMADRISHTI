# SEEMADRISHTI AI — Computer Vision, Tracking, Risk, Evidence, Correlation, Night Intel & Movement Analytics Pipeline (Phase 10)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection, multi-object tracking (MOT), geometric virtual perimeter intrusion detection, abnormal dwell-time loitering detection, an **Explainable Threat Assessment & Risk Engine**, an automated **Incident Evidence Capture Engine**, a **Multi-Camera Intelligent Threat Correlation Engine**, **Night Intelligence + Low-Light Robustness + Adaptive Surveillance Intelligence**, and **Advanced Movement, Traffic Flow & Behavior Analytics**.

### Comprehensive Pipeline Flow:
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ VIDEO CAMERAS│ ──▶ │ ENVIRONMENT  │ ──▶ │ ADAPTIVE     │ ──▶ │ OPTICAL      │
│(MP4 / RTSP)  │     │ ANALYZER     │     │ SAMPLER      │     │ ENHANCEMENT  │
└──────────────┘     │(Luminance/Vis│     │(Skip 4/2/1)  │     │ (CLAHE/Gamma)│
       │             └──────────────┘     └──────────────┘     └──────┬───────┘
       │                                                              │
       │ (Original pristine frame - Rule #7)                          ▼
       │                                                       ┌──────────────┐
       │                                                       │ YOLO & TRACK │
       │                                                       │ (ByteTrack)  │
       │                                                       └──────┬───────┘
       │                                                              │
       ▼                                                              ▼
┌──────────────┐                                               ┌──────────────┐
│CIRCULAR BUFF │                                               │ RAY-CASTING  │
│(Pre-10s Frame│                                               │ & LOITERING  │
└──────────────┘                                               └──────┬───────┘
       │                                                              │
       ▼                                                              ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│EVIDENCE WRITE│ ◀── │INCIDENT TRIG │ ◀── │SQLITE PERSIST│ ◀── │ RISK ENGINE  │
│ (MP4 Clip)   │     │(HIGH/CRITIC) │     │ & WS (/ws)   │     │(+8 Anomaly)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                                                      ▼
                                                       ┌──────────────────────────┐
                                                       │ PHASE 10: MOVEMENT &     │
                                                       │ TRAFFIC FLOW ANALYTICS   │
                                                       │ (Trajectory/Density/Flow)│
                                                       └──────────────┬───────────┘
                                                                      ▼
                                                       ┌──────────────────────────┐
                                                       │  MULTI-CAMERA CORRELATOR │
                                                       │ (Spatial-Temporal Graph) │
                                                       └──────────────────────────┘
```

1. **Trajectory Tracker (`cv_service/analytics/trajectory.py`)**: Real-time bounded spatial history deque calculating cumulative Euclidean travel distance and pixel speed.
2. **Directional Analyzer (`cv_service/analytics/direction.py`)**: 8-compass quadrant vector mapping (`NORTH`, `SOUTH`, `EAST`, `WEST`, diagonals, `STATIONARY`) with jitter noise suppression.
3. **Speed Calculator (`cv_service/analytics/speed.py`)**: Measures speed in `pixel_speed_px_per_sec` with zero $\Delta t$ protection and teleportation spike suppression ($> 600\text{ px/s}$).
4. **Entry/Exit Counter (`cv_service/analytics/counter.py`)**: Uses Phase 4 ray-casting geometry to track `OUTSIDE ➔ INSIDE` and `INSIDE ➔ OUTSIDE` perimeter crossings.
5. **Zone Occupancy Engine (`cv_service/analytics/occupancy.py`)**: Monitors live occupants, peak counts, average occupants, and classification breakdown.
6. **Spatial Density Grid (`cv_service/analytics/density.py`)**: $8 \times 8$ grid partitioning recording physical cell visits, dwell duration, and activity hotspots.
7. **Temporal Aggregator (`cv_service/analytics/temporal.py`)**: Aggregates entries, exits, speeds, intrusions, and loitering into 1m, 5m, 15m, and 1h intervals.
8. **Deterministic Baseline Learner (`cv_service/analytics/baseline.py`)**: Learns hourly statistical distribution ($\mu, \sigma$), safely reporting `INSUFFICIENT_DATA` until sufficient sample history exists.
9. **Statistical Anomaly Detector (`cv_service/analytics/anomaly.py`)**: Emits explainable mathematical alerts when volume $> 2.5\times$ or occupancy $> 2.0\times$ baseline.
10. **Coordinated Group Movement (`cv_service/analytics/group_movement.py`)**: Detects multi-track synchronized movements based on proximity, direction, and speed.

---

## 2. Running Automated Tests

```bash
# Run Phase 10 complete test suite (63 tests + regressions for Phases 1-9)
py -3.12 cv_service/tests/phase10_test.py
```

### Cumulative Test Results:
- **Phase 1 (Backend Gateway & SQLite):** 13/13 PASSED
- **Phase 2 (YOLOv8 Edge Object Detection):** 12/12 PASSED
- **Phase 3 (ByteTrack MOT Tracking):** 12/12 PASSED
- **Phase 4 (Virtual Perimeter Geofence):** 22/22 PASSED
- **Phase 5 (Abnormal Dwell Loitering):** 31/31 PASSED
- **Phase 6 (Explainable Threat Risk Engine):** 36/36 PASSED
- **Phase 7 (Forensic Evidence Capture Engine):** 28/28 PASSED
- **Phase 8 (Multi-Camera Threat Correlation):** 37/37 PASSED
- **Phase 9 (Night Intelligence & Adaptive Sampling):** 45/45 PASSED
- **Phase 10 (Advanced Movement & Traffic Flow Analytics):** 63/63 PASSED
- **Total Cumulative Tests:** **299 / 299 PASSED (100%)**


### Run Real Video Surveillance Pipeline:
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id CAM-01
```

### CLI Configuration Flags:
- `--no-environment`: Disable environmental illumination analysis.
- `--no-enhancement`: Disable low-light image enhancement.
- `--no-adaptive`: Disable adaptive frame sampling.
- `--no-correlation`: Disable multi-camera correlation engine.
- `--no-evidence`: Disable forensic MP4 evidence recording.
- `--no-risk`: Disable threat risk assessment scoring.
- `--no-loitering`: Disable loitering dwell time detection.
