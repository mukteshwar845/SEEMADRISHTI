# SEEMADRISHTI AI — PHASE 17 STATUS REPORT
## REAL SUSPICIOUS AREA ALERT + LINE CROSSING ALERT + REAL PERSON & OBJECT COUNTING

**Project**: SEEMADRISHTI AI  
**Team**: IQ100  
**SIH Problem Statement**: SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Status**: **COMPLETE & FULLY VERIFIED**  
**Date**: August 29, 2026  
**Commit**: `422dcfc`

---

## 1. Executive Summary

In Phase 17, the SEEMADRISHTI AI intelligence pipeline was upgraded to deliver genuine, trajectory-grounded perimeter intrusion alerts, direction-aware tripwire crossing alerts, and real-time person/object counting across all VisDrone camera channels (`CAM-01` through `CAM-09`).

Every alert, counter, and trajectory originates from actual YOLOv8 neural detections and ByteTrack multi-object tracking executing on real CCTV video footage, with zero synthetic generation, zero fake alerts, and zero `Math.random()`.

### End-to-End Verified Pipeline Flow:
$$\\text{REAL MP4 FIXTURE} \\longrightarrow \\text{YOLOv8 DETECTION} \\longrightarrow \\text{BYTETRACK PERSISTENT TRACKS} \\longrightarrow \\text{ACTIVE COUNTS (PERSON/VEHICLE)} \\longrightarrow \\text{CENTROID TRAJECTORY} \\longrightarrow \\text{ZONE / TRIPWIRE INTERSECTION} \\longrightarrow \\text{DIRECTION (IN/OUT)} \\longrightarrow \\text{RISK EVALUATION} \\longrightarrow \\text{DEDUPLICATED ALERT} \\longrightarrow \\text{FORENSIC EVIDENCE (SHA-256)} \\longrightarrow \\text{WEBSOCKET HUD}$$

---

## 2. Core Capabilities Implemented

### 2.1 Suspicious / Restricted Area Alert (`RESTRICTED_ZONE_ENTRY`)
- **Computational Geometry**: Ray-casting point-in-polygon algorithm detects centroid entry into arbitrary convex or non-convex polygons.
- **State Transition Gating**: Only transitions from `OUTSIDE \u2192 INSIDE` emit an alert.
- **Duplicate Suppression**: Objects lingering inside (`INSIDE \u2192 INSIDE`) produce zero duplicate alerts.
- **Re-Entry Intelligence**: Target leaving and re-entering (`INSIDE \u2192 OUTSIDE \u2192 INSIDE`) emits a new alert with incremented re-entry count.
- **Real Footage Validation**: Verified on CAM-01 VisDrone footage where persistent tracks #6, #11, and #33 cross into calibrated restricted zones.

### 2.2 Line Crossing / Virtual Tripwire Alert (`TRIPWIRE_CROSSING`)
- **Segment Intersection Math**: Trajectory segment (`prev_centroid \u2192 curr_centroid`) tested against line segment (`P1 \u2192 P2`).
- **Vector Normal Direction**: Crossing direction (`IN` vs `OUT`) is mathematically determined via 2D vector dot product with the tripwire's 90-degree normal vector.
- **Crossing Cooldown Deduplication**: Cooldown mechanism prevents sensor flutter and duplicate alerts while the object remains on the same side.
- **Real Footage Validation**: Verified on CAM-01 VisDrone footage where track #10 crosses the entry tripwire with direction `IN`.

### 2.3 Real Person & Object/Vehicle Counting
- **Separation of Counts**:
  - **Active Visible Counts**: Number of active targets currently in frame (e.g. `Active Persons: 15`).
  - **Cumulative Session Counts**: Unique targets observed over the session (e.g. `Unique Targets: 62`).
- **Target Classification**: Direct PyTorch output from YOLOv8:
  - `person`
  - `car`, `truck`, `bus` (grouped as `vehicle`)
  - `motorcycle`, `bicycle`
- **Camera-Isolated Tracking**: Track IDs and counts remain strictly isolated per camera to prevent cross-channel identity contamination.

### 2.4 Demonstration Camera Calibration
- Zones and tripwires calibrated against actual object movement paths in `CAM-01.mp4` through `CAM-09.mp4`.
- Configurations stored in `config/camera_zones.json` and served via REST API `/api/zones`.

### 2.5 Preserved Non-Black Evidence Pipeline
- Verified native ffmpeg libx264 encoder generating non-black H.264 forensic clips (`YUV420p`).
- Burned-in tactical HUD with timestamps, camera ID, track ID, risk score, and SHA-256 seal.

---

## 3. Architecture & File Changes

| File | Purpose |
| :--- | :--- |
| `config/camera_zones.json` | Calibrated tripwire (`y=0.72`) and restricted zone (`y: 0.55-0.95`) for CAM-01 |
| `cv_service/intrusion/detector.py` | State-transition gating, vector normal crossing direction, and `centroid` alias |
| `cv_service/main.py` | Unified `frame_state` telemetry packet with `active_counts`, `unique_counts`, `tripwire_events` |
| `cv_service/tests/phase17_test.py` | Complete Phase 17 test suite (38/38 tests) |
| `src/services/websocketService.ts` | Fleet counts listener and `TRIPWIRE_CROSSING` handling |
| `src/components/CameraFeedCanvas.tsx` | Dynamic HUD overlay for bounding boxes, trajectories, and tripwire alerts |
| `src/components/MatrixCameraCell.tsx` | Real-time object count strip and visual status |
| `src/components/QuadLiveStreamView.tsx` | Top-level Fleet Intelligence Object Counter Banner |
| `src/components/AlertsLog.tsx` | Alert cards with `TRIPWIRE` and zone name badges |

---

## 4. Verification & Automated Test Results

### Phase 17 Master Test Suite (`cv_service/tests/phase17_test.py`)
```bash
python -m unittest cv_service.tests.phase17_test
```
```
----------------------------------------------------------------------
Ran 38 tests in 79.466s

OK (38/38 Passed)
```

- **Section 1: Intelligent Alerts & Counting Tests (20 Tests)**:
  - `test_01_real_person_detection_count`: PASSED
  - `test_02_real_vehicle_detection_count`: PASSED
  - `test_03_active_vs_unique_target_counting`: PASSED
  - `test_04_camera_isolated_counting`: PASSED
  - `test_05_restricted_zone_schema_validity`: PASSED
  - `test_06_point_in_polygon_ray_casting_correctness`: PASSED
  - `test_07_real_track_zone_entry_event`: PASSED
  - `test_08_stationary_lingering_suppresses_duplicate_entry`: PASSED
  - `test_09_zone_exit_and_reentry_increments_count`: PASSED
  - `test_10_virtual_tripwire_schema_validity`: PASSED
  - `test_11_line_segment_intersection_math`: PASSED
  - `test_12_parallel_non_intersecting_trajectory_suppressed`: PASSED
  - `test_13_tripwire_crossing_direction_in`: PASSED
  - `test_14_tripwire_crossing_direction_out`: PASSED
  - `test_15_tripwire_cooldown_prevents_duplicate_spam`: PASSED
  - `test_16_explainable_risk_score_on_intrusion`: PASSED
  - `test_17_alert_deduplication_by_track_and_zone`: PASSED
  - `test_18_forensic_evidence_clip_generation`: PASSED
  - `test_19_evidence_sha256_verification`: PASSED
  - `test_20_zero_random_production_telemetry`: PASSED

- **Section 2: Pipeline Integration & CAM-01 Validation (18 Tests)**:
  - `test_21_cam01_tripwire_crossing_on_fixture`: PASSED
  - `test_22_cam01_zone_entry_on_fixture`: PASSED
  - `test_23_cam01_loitering_alert_generation`: PASSED
  - `test_24_cam01_risk_engine_score_escalation`: PASSED
  - `test_25_evidence_video_non_black_frames`: PASSED
  - `test_26_websocket_telemetry_payload_completeness`: PASSED
  - `... through test_38`: PASSED

---

## 5. Live CAM-01 Verification

```
[TRIPWIRE CROSSING / BREACH]
Camera:    cam-01
Track:     #10 (person)
Tripwire:  Alpha Entry Tripwire
Direction: IN
From:      (319.0, 544.0) -> To: (318.0, 544.5)
Timestamp: 2026-08-29T21:47:30Z

[RESTRICTED ZONE ENTRY / PERIMETER BREACH]
Camera:    cam-01
Track:     #33 (person)
Zone:      Sector Alpha Main Gate Restricted Zone
Direction: ENTERING
Position:  (790.0, 694.5)
Timestamp: 2026-08-29T21:48:18Z

[INCIDENT EVIDENCE READY]
Incident ID:   INC-000001
Camera ID:     cam-01
Track ID:      #1 (person)
Risk Level:    CRITICAL (92.0/100)
Evidence File: evidence/INC-000001.mp4 (SHA-256 Verified)
```

---

## 6. Conclusion
Phase 17 successfully established authentic, ground-truth perimeter security telemetry on real VisDrone CCTV fixtures with zero synthetic injection.
