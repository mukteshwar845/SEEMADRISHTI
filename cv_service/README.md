# SEEMADRISHTI AI — Computer Vision, Tracking, Intrusion, Risk, Evidence, Correlation & Night Intelligence Pipeline (Phase 9)

**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Service:** `cv_service`

---

## 1. Overview & Architecture

The SEEMADRISHTI Computer Vision service (`cv_service`) provides edge-ready real-time object detection, multi-object tracking (MOT), geometric virtual perimeter intrusion detection, abnormal dwell-time loitering detection, an **Explainable Threat Assessment & Risk Engine**, an automated **Incident Evidence Capture Engine**, a **Multi-Camera Intelligent Threat Correlation Engine**, and **Night Intelligence + Low-Light Robustness + Adaptive Surveillance Intelligence**.

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
│ (MP4 Clip)   │     │(HIGH/CRITIC) │     │ & WS (/ws)   │     │(+10 Night)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                                                      ▼
                                                       ┌──────────────────────────┐
                                                       │  MULTI-CAMERA CORRELATOR │
                                                       │ (Spatial-Temporal Graph) │
                                                       └──────────────┬───────────┘
                                                                      ▼
                                                       ┌──────────────────────────┐
                                                       │ CORRELATED INCIDENT (DB) │
                                                       │   (CAM-01 -> 02 -> 03)   │
                                                       └──────────────────────────┘
```

1. **Environment Analyzer (`cv_service/environment/environment_analyzer.py`)**: Computes real-time luminance mean, contrast standard deviation, dark pixel ratio, and visibility index (0-100). Deterministically classifies `DAY`, `DAWN`, `DUSK`, `LOW_LIGHT`, and `NIGHT` conditions.
2. **Adaptive Frame Sampler (`cv_service/adaptive/adaptive_sampler.py`)**: Dynamically adjusts sampling frequency (NORMAL: skip 4, NIGHT: skip 2, THREAT_PRIORITY: skip 1) with 30-frame recovery cooldown.
3. **Low-Light Optical Enhancer (`cv_service/environment/enhancement.py`)**: Applies CLAHE on the LAB luminance channel and gamma correction strictly on a copy for YOLO inference, leaving original frames unaltered for forensic evidence.
4. **Night Movement Detector (`cv_service/environment/night_movement.py`)**: Gated to `person` targets exhibiting spatial displacement $\ge 5\text{ px}$ across consecutive frames during low-light conditions.
5. **YOLOv8n Neural Network**: Real-time edge object detection classifying `person`, `car`, `truck`, `bus`, and `motorcycle`.
6. **ByteTrack Engine**: Frame-to-frame association assigning persistent, unique `track_id` values per camera.
7. **Ray-Casting Intrusion Geometry**: Evaluates physical target centroids against virtual `PolygonZones` to detect `OUTSIDE ➔ INSIDE` crossings.
8. **Loitering Engine**: Monitors continuous dwell time within restricted perimeters with anti-duplicate alert gating.
9. **Explainable Risk Engine**: Deterministically synthesizes contextual surveillance signals into a 0–100 risk score and maps to tactical threat levels (**LOW**, **MEDIUM**, **HIGH**, **CRITICAL**), incorporating `NIGHT_MOVEMENT (+10)`.
10. **Incident Evidence Engine**: Continuously buffers pre-event frames, triggers on HIGH/CRITICAL events, collects post-event frames, burns a tactical HUD overlay, and saves pristine MP4 evidence clips.
11. **Multi-Camera Correlation Engine**: Correlates events across camera networks based on spatial topology, temporal windows, class compatibility, and sequence progression.

---

## 2. Running Automated Tests

```bash
# Run Phase 9 complete test suite (45 tests + regressions for Phase 1-8)
py -3.12 cv_service/tests/phase9_test.py
```

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
