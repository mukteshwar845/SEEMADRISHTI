# PHASE 9 STATUS REPORT: NIGHT INTELLIGENCE, LOW-LIGHT ROBUSTNESS & ADAPTIVE SURVEILLANCE

**Project:** SEEMADRISHTI AI  
**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Status:** **PHASE 9 COMPLETED & FULLY VERIFIED (45/45 TESTS PASSED, ZERO REGRESSIONS)**

---

## 1. Executive Summary

Phase 9 of SEEMADRISHTI AI introduces **Night Intelligence, Low-Light Robustness, and Adaptive Surveillance Intelligence** to the border security pipeline. Prior to Phase 9, computer vision pipelines relied on fixed frame sampling and standard object detection thresholds that struggle under degraded lighting, poor visibility, or nighttime infrared/visible transitions.

Rather than applying a synthetic or hardcoded night filter, Phase 9 implements **real pixel-level environmental scene analysis** (luminance mean, contrast standard deviation, dark-pixel ratio, and visibility score 0–100), **non-destructive optical enhancement** (CLAHE on the LAB luminance channel and gamma correction LUT), **dynamic adaptive frame sampling** (dynamic skip rates adapting between day, night, and active security threats), and **night movement intelligence** with human class gating and spatial displacement verification.

Crucially, in accordance with **Rule #7 (Pristine Evidence Immutability)**, optical enhancement is strictly performed on a copy for YOLO inference; the original ingested frame is preserved completely unaltered for circular buffer caching and forensic MP4 evidence recording.

```
RAW CCTV VIDEO STREAM (RTSP / MP4 / WEBCAM)
        │
        ▼ (Pristine Original Frame)
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PHASE 9: REAL ENVIRONMENTAL SCENE ANALYZER                │
│                                                                             │
│  - Luminance Mean: Y = 0.299R + 0.587G + 0.114B (0 - 255)                  │
│  - Contrast Standard Deviation: sqrt(1/N * sum((Y - mu)^2))                 │
│  - Dark Pixel Ratio: (pixels < 40) / total_pixels                          │
│  - Visibility Score: min(100, 0.45*Y + 0.55*contrast)                      │
│  - Deterministic Mode Hierarchy: NIGHT -> DUSK -> LOW_LIGHT -> DAWN -> DAY │
│  - Per-Camera State Isolation                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐                             ┌───────────────────────────────┐
│     ADAPTIVE FRAME SAMPLER    │                             │      LOW-LIGHT ENHANCER       │
│                               │                             │                               │
│ - NORMAL Mode: Skip 4 (3.75fps)│                            │ If low_light condition:       │
│ - NIGHT Mode:  Skip 2 (7.50fps)│                            │   enhanced_frame = CLAHE(L)   │
│ - THREAT Mode: Skip 1 (15.0fps)│                            │ Else:                         │
│ - 30-Frame Cooldown Recovery  │                             │   enhanced_frame = frame      │
└───────────────┬───────────────┘                             └───────────────┬───────────────┘
                │                                                             │
                │ (If sample cycle matches)                                   │
                └──────────────────────────────┬──────────────────────────────┘
                                               ▼
                                  ┌─────────────────────────┐
                                  │   YOLOv8 DETECTION      │
                                  │   & BYTETRACK TRACKING  │
                                  │  (Runs on enhanced copy)│
                                  └────────────┬────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │  VIRTUAL PERIMETER &    │
                                  │  LOITERING DETECTORS    │
                                  └────────────┬────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 NIGHT MOVEMENT INTELLIGENCE & RISK ENGINE                   │
│                                                                             │
│  - Person Class Gating: `class_name.lower() == 'person'` (Vehicles ignored) │
│  - Spatial Displacement: Euclidean delta >= 5.0 px across consecutive frames│
│  - Low-Light Mode Gating: Evaluated strictly during NIGHT / LOW_LIGHT       │
│  - Cooldown De-duplication: Anti-flood latching per track ID                │
│  - Explainable Threat Points: +10 NIGHT_MOVEMENT (Capped at 100 max)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐                             ┌───────────────────────────────┐
│  PRISTINE EVIDENCE CAPTURE    │                             │    REST API & WEBSOCKET       │
│                               │                             │                               │
│ Rule #7: Records unaltered    │                             │ - GET /api/environment        │
│ original frames to MP4 for    │                             │ - GET /api/environment/:cam   │
│ legal & courtroom forensics   │                             │ - WebSocket: environment_upd  │
│                               │                             │ - WebSocket: night_movement   │
└───────────────────────────────┘                             └───────────────────────────────┘
```

---

## 2. Phase 9 Automated Test Matrix (45/45 PASSED)

**Test Command:** `py -3.12 cv_service/tests/phase9_test.py`

| Test # | Subsystem / Requirement | Expected Behavior | Actual Verified Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TEST 01** | Environment Analyzer Init | Initializes with calibrated illumination thresholds | Night: 40.0, Low-Light: 75.0, Contrast: 25.0 | **PASSED** |
| **TEST 02** | Bright Frame Classification | Identifies daytime high-lux frame without false alarms | Classified `DAY`, `low_light=False`, lux: 180.0 | **PASSED** |
| **TEST 03** | Dark Frame Classification | Detects night-time conditions below threshold | Classified `NIGHT`, `low_light=True`, lux: 20.0 | **PASSED** |
| **TEST 04** | Low-Light Scene Detection | Accurately identifies low illumination twilight | Classified `LOW_LIGHT`, `low_light=True` | **PASSED** |
| **TEST 05** | Real Luminance Calculation | Measures grayscale mean luminance accurately | Target: 142, Measured: 142.0 ($\Delta < 0.01$) | **PASSED** |
| **TEST 06** | Scene Contrast Measurement | Computes true standard deviation of pixel values | Expected: 50.00, Measured: 50.00 | **PASSED** |
| **TEST 07** | Visibility Score (0-100) | Generates composite visibility index from metrics | Verified score: 71.69% | **PASSED** |
| **TEST 08** | Environment Confidence | Calculates statistical confidence bounded [0.5, 1.0] | Verified confidence: 1.00 | **PASSED** |
| **TEST 09** | Dawn / Dusk Classification | Classifies transitional boundary illumination | Dawn: `DAWN` (lux: 85), Dusk: `DUSK` (lux: 55) | **PASSED** |
| **TEST 10** | Deterministic Assessment | Same input frame produces identical outputs | Mode, lux, contrast identical across iterations | **PASSED** |
| **TEST 11** | Enhancement Module Init | Initializes CLAHE and gamma lookup tables | Clip limit: 3.0, Grid: (8, 8), Gamma: 1.5 | **PASSED** |
| **TEST 12** | CLAHE Contrast Expansion | Enhances contrast on low-light frames via LAB space | Contrast std dev: $6.11 \to 7.34$ | **PASSED** |
| **TEST 13** | Gamma Correction LUT | Non-linearly lifts shadow detail without clipping | Grayscale mean: $30.0 \to 87.0$ | **PASSED** |
| **TEST 14** | Resolution Preservation | Preserves input frame height, width, and channels | Exact shape: (480, 640, 3), dtype: uint8 | **PASSED** |
| **TEST 15** | Pristine Frame Immutability | Rule #7: original frame is never mutated | Zero array mutation (`array_equal == True`) | **PASSED** |
| **TEST 16** | Daylight Enhancement Bypass | Enhancement is skipped on normal lighting | `low_light == False`, bypass verified | **PASSED** |
| **TEST 17** | Normal Adaptive Sampling | Uses standard frame skip during daylight conditions | Policy: `NORMAL`, Skip: 4 | **PASSED** |
| **TEST 18** | Night-Time Sampling | Increases sampling rate during darkness | Policy: `NIGHT_SAMPLING`, Skip: 2 | **PASSED** |
| **TEST 19** | Threat Priority Sampling | Samples every single frame during active threats | Policy: `THREAT_PRIORITY`, Skip: 1 (100% duty) | **PASSED** |
| **TEST 20** | Threat Cooldown Recovery | Decays back to normal rate after threat resolves | Reverts to `NORMAL` (Skip: 4) after 30 frames | **PASSED** |
| **TEST 21** | Sampler Config Override | Custom skip configuration is strictly obeyed | Verified: normal=5, night=3, threat=1 | **PASSED** |
| **TEST 22** | Night Movement Detection | Person moving at night triggers night movement event | Emitted `NIGHT_MOVEMENT` on Track #1 | **PASSED** |
| **TEST 23** | Stationary Noise Suppression| Stationary target does not produce repeated alarms | Suppressed stationary noise ($\Delta < 1.0\text{px}$) | **PASSED** |
| **TEST 24** | Vehicle Class Filtering | Non-human vehicles do not trigger human night alert| Vehicle safely ignored (person-only gating) | **PASSED** |
| **TEST 25** | Night Movement Payload | Validates payload schema and required fields | Camera: `cam-01`, Track: #4, Reason present | **PASSED** |
| **TEST 26** | Camera State Isolation | Independent environmental states across cameras | `cam-01=NIGHT`, `cam-02=DAY` | **PASSED** |
| **TEST 27** | Risk Engine Integration | Adds explainable +10 points for night movement | Assessment score: 10, Reason: `NIGHT_MOVEMENT` | **PASSED** |
| **TEST 28** | Anti-Multiplication Latch | Night points added once, not multiplied each frame | Frame 1: 10 pts, Frame 2: 10 pts (latched) | **PASSED** |
| **TEST 29** | Explainable Reason Code | Reason contains human-readable explanation | "Person movement detected during low-light..." | **PASSED** |
| **TEST 30** | Maximum Score Capping | Total risk score never exceeds 100 ceiling | Combined: $40+25+30+10+7 = 112 \to \mathbf{100}$ | **PASSED** |
| **TEST 31** | WebSocket `environment_update` | Publishes live environment state to frontend | Received `environment_update` over `/ws` | **PASSED** |
| **TEST 32** | Backend WebSocket Fan-Out | REST updates broadcast out over WebSocket | POST broadcasted to all connected clients | **PASSED** |
| **TEST 33** | WebSocket `night_movement` | Dispatches night movement alert over WebSocket | Received `night_movement` over `/ws` | **PASSED** |
| **TEST 34** | REST List `GET /api/environment` | Returns environment states for all active cameras | HTTP 200, array of camera environment records | **PASSED** |
| **TEST 35** | REST Get `GET /api/environment/:id`| Returns specific camera environmental metrics | HTTP 200, `cam-01`, mode: `NIGHT` | **PASSED** |
| **TEST 36** | Phase 8 Correlation Regression | Validates multi-camera correlation engine | 37/37 Phase 8 tests passed | **PASSED** |
| **TEST 37** | Phase 7 Evidence Regression | Validates forensic MP4 evidence engine | 28/28 Phase 7 tests passed | **PASSED** |
| **TEST 38** | Phase 6 Risk Regression | Validates explainable risk engine (0-100) | 36/36 Phase 6 tests passed | **PASSED** |
| **TEST 39** | Phase 5 Loitering Regression | Validates dwell time & loitering detector | 31/31 Phase 5 tests passed | **PASSED** |
| **TEST 40** | Phase 4 Intrusion Regression | Validates polygon perimeter & ray-casting | 22/22 Phase 4 tests passed | **PASSED** |
| **TEST 41** | Phase 3 Tracking Regression | Validates ByteTrack multi-object tracking | 12/12 Phase 3 tests passed | **PASSED** |
| **TEST 42** | Phase 2 Detection Regression | Validates YOLOv8 edge object detection | 12/12 Phase 2 tests passed | **PASSED** |
| **TEST 43** | Phase 1 Backend Regression | Validates REST endpoints, SQLite, WebSocket | 13/13 Phase 1 tests passed | **PASSED** |
| **TEST 44** | TypeScript Strict Typecheck | Full codebase typecheck (`tsc --noEmit`) | 0 errors | **PASSED** |
| **TEST 45** | Vite Production Bundle Build | Production asset compilation (`vite build`) | Compiled in 26.68s, 0 errors | **PASSED** |

---

## 3. Cumulative Verification Progression

| Surveillance Phase | Objective & Core Capabilities | Test Count | Status |
| :--- | :--- | :---: | :---: |
| **Phase 1** | Tactical Backend Gateway, SQLite Persistence, REST & WebSocket | 13 / 13 | **PASSED** |
| **Phase 2** | Real YOLOv8 Computer Vision Object Detection & Video Ingestion | 12 / 12 | **PASSED** |
| **Phase 3** | ByteTrack Persistent Multi-Object Tracking & Track IDs | 12 / 12 | **PASSED** |
| **Phase 4** | Virtual Perimeter Geofencing & Real-Time Intrusion Detection | 22 / 22 | **PASSED** |
| **Phase 5** | Dwell Time Measurement & Autonomous Loitering Detection | 31 / 31 | **PASSED** |
| **Phase 6** | Explainable Deterministic Threat Assessment & Risk Engine | 36 / 36 | **PASSED** |
| **Phase 7** | Forensic Incident Evidence Capture & MP4 Reconstruction Engine | 28 / 28 | **PASSED** |
| **Phase 8** | Multi-Camera Intelligent Threat Correlation Engine | 37 / 37 | **PASSED** |
| **Phase 9** | **Night Intelligence, Low-Light Robustness & Adaptive Surveillance** | **45 / 45** | **PASSED** |
| **Cumulative Total** | **End-to-End Enterprise Surveillance Platform** | **236 / 236** | **100% PASSED** |

---

## 4. Key Design Decisions & Architectural Integrity

### 1. Rule #7: Absolute Preservation of Original Frames
Forensic evidence presented to military command or in legal proceedings must remain unmanipulated:
- `LowLightEnhancer.enhance(frame)` performs operations strictly on a copied buffer (`np.ndarray.copy()`).
- The enhanced frame is passed to `tracker.track(enhanced_frame, camera_id)`.
- The **unaltered original frame** is passed directly to `incident_manager.record_frame(camera_id, frame, timestamp)`.
- Verified in **Test 15** (`np.array_equal(original, original_copy) == True`).

### 2. Deterministic, Pixel-Derived Measurements (No Synthetic "Fake AI")
All environmental states derive directly from the pixel buffer:
- **Luminance:** Standard ITU-R BT.601 formula $Y = 0.299R + 0.587G + 0.114B$.
- **Contrast:** Standard deviation $\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^N (Y_i - \bar{Y})^2}$.
- **Dark Pixel Ratio:** $\frac{\sum [Y_i < 40]}{N}$.
- **Visibility Index:** Weighted composite metric $\min(100.0, 0.45 \cdot \bar{Y} + 0.55 \cdot \sigma)$.
- **Confidence Metric:** Proximity to threshold boundaries mapped to $[0.50, 1.00]$.

### 3. Human-Only Night Movement Classification
To prevent false alarms caused by moving vegetation, headlights, or distant vehicles:
- Only objects where `class_name.lower() == 'person'` qualify for night movement.
- Track must exhibit continuous spatial displacement $\ge 5.0\text{ px}$ across at least 2 frames.
- Cooldown gating prevents flooding duplicate alerts for the same track.

### 4. Dynamic Adaptive Frame Sampling
Edge compute resources are preserved during peaceful daytime conditions and dynamically focused during critical intervals:
- **`DAY` Mode:** Samples 1 out of 4 frames (~3.75 FPS processing on a 15 FPS camera), saving 75% CPU load.
- **`NIGHT` / `LOW_LIGHT` Mode:** Samples 1 out of 2 frames (~7.50 FPS processing), doubling temporal sensitivity.
- **`THREAT_PRIORITY` Mode:** Automatically locks to 1 out of 1 frames (100% duty cycle, 15 FPS) whenever an intrusion, loitering, or night movement threat is active, with a 30-frame decay cooldown.

### 5. Seamless Backward Compatibility & Preserved Argument Order
The `RiskEngine.evaluate_track()` method preserves its exact positional arguments from Phase 6 (`current_time` as 8th argument), introducing `has_night_movement: bool = False` as a keyword argument. This guaranteed 100% backward compatibility across all existing test suites.

---

## 5. REST & WebSocket API Reference

### 1. `GET /api/environment`
Lists environmental status records for all surveillance cameras.
```json
{
  "success": true,
  "data": [
    {
      "camera_id": "cam-01",
      "mode": "NIGHT",
      "brightness": 28.4,
      "contrast": 18.2,
      "dark_pixel_ratio": 0.74,
      "visibility_score": 38.5,
      "low_light": true,
      "confidence": 0.92,
      "updated_at": "2026-08-28T07:16:35Z"
    }
  ]
}
```

### 2. `GET /api/environment/:camera_id`
Retrieves the real-time environmental condition for a specific camera.

### 3. `POST /api/environment`
Updates the environmental condition for a camera (persists to SQLite `environment_states` table and broadcasts over WebSocket).

### 4. WebSocket Message: `environment_update`
Broadcast to all connected tactical dashboards whenever environmental parameters shift or periodically every 10 processed frames:
```json
{
  "type": "environment_update",
  "data": {
    "camera_id": "cam-01",
    "mode": "NIGHT",
    "brightness": 28.4,
    "contrast": 18.2,
    "visibility_score": 38.5,
    "low_light": true,
    "confidence": 0.92
  }
}
```

### 5. WebSocket Message: `night_movement`
Dispatched immediately when a moving human target is detected under low-light or night illumination:
```json
{
  "type": "night_movement",
  "data": {
    "camera_id": "cam-01",
    "track_id": 14,
    "class_name": "person",
    "environment_mode": "NIGHT",
    "brightness": 24.1,
    "visibility_score": 32.0,
    "displacement_px": 14.8,
    "reason": "Person movement detected during low-light/night conditions (displacement: 14.8px)"
  }
}
```

---

## 6. How to Run & Verify

### 1. Run Complete Automated Test Suite (45 Tests):
```bash
py -3.12 cv_service/tests/phase9_test.py
```

### 2. Start Full Pipeline on Real Video Stream:
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id CAM-01
```

### 3. Query Environment States via REST:
```bash
py -3.12 -c "import requests; print(requests.get('http://127.0.0.1:8000/api/environment').json())"
```

### 4. Run TypeScript Linting & Production Build:
```bash
npm.cmd run lint
npm.cmd run build
```
