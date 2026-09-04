# SEEMADRISHTI AI — PHASE 24 REALITY AUDIT
## Real Computer Vision Implementation Audit & Truthfulness Verification

**Project**: SEEMADRISHTI AI  
**SIH Problem Statement**: SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Auditor**: SEEMADRISHTI Core CV Engineering Team  
**Date**: August 31, 2026  

---

### Executive Summary

An exhaustive technical audit of the surveillance system was conducted to evaluate whether multi-camera features, homography, ReID, predictive trajectory, and counting mechanisms operate on **genuine computer-vision algorithms and telemetry** or **simulated / hardcoded artifacts**.

All cosmetic simulations, hardcoded percentages (e.g. `98.4%`, `99.4%`), synthetic SIFT tie-lines, and unverified panoramic stitching have been audited. The VisDrone video sequences (`CAM-01.mp4` through `CAM-09.mp4`) are separate UAV feeds that do not share physical geometric overlap. Accordingly, claiming a continuous 180° panorama between them without geometric evidence violates system truthfulness.

The table below provides the full feature-by-feature reality audit and the required engineering fixes.

---

### Reality Audit Matrix

| # | Feature | Previous Implementation | Real / Simulated | Source of Data | Algorithm Used | Proof / Evidence | Required Fix |
|---|---|---|---|---|---|---|---|
| **1** | **Panoramic Camera Stitching (CAM 1 + CAM 2)** | Synthetic canvas side-by-side drawing with soft feather blend gradient across seam line | **SIMULATED** | None (Visual canvas compositing) | None (Hardcoded linear gradient) | OpenCV ORB/SIFT match test between CAM-01 and CAM-08 yields <35% inliers; CAM-01 and CAM-02 in test fixtures are distinct sequences without geometric overlap | **Remove claim of continuous panorama.** Switch to **"Multi-Camera Synchronized View"** with side-by-side synchronized camera streams. |
| **2** | **Homography Alignment Score** | Hardcoded display: `98.4 / 100` or `98.4% INLIERS` | **SIMULATED / HARDCODED** | Mock state variable `calibrationScore` | None (Randomized mock timer) | `setCalibrationScore({ inliers: +(97 + Math.random() * 2.8).toFixed(1) })` in code | **Implement real OpenCV homography pipeline** (`cv2.findHomography(RANSAC)`). Calculate real inlier ratio, keypoints, and reprojection error. If $<35\%$ inliers, report `INSUFFICIENT OVERLAP`. |
| **3** | **Homography Calibration Suite** | Interactive sliders for tilt, offset, and scale with synthetic "Auto-Calibrate" timer | **SIMULATED** | Client-side React state | None (CSS/Canvas transformation without mathematical matrix) | Sliders simply apply canvas affine transform; no matrix $H$ computed | **Add backend OpenCV homography evaluation** reading actual frames from video sources and calculating real $H_{3\times 3}$ and inlier counts. |
| **4** | **SIFT / ORB Keypoint Tie-Points** | 6 hardcoded neon connecting lines rendered at fixed vertical percentages across seam | **SIMULATED** | Hardcoded array `tiePoints = [{ yNorm: 0.25 }, ...]` | None (Mock SVG/Canvas coordinates) | Explicit array of synthetic tie points in `MultiCamStitchingView.tsx` | **Remove fake tie lines.** If real homography is evaluated, render actual matched keypoint coordinates extracted by OpenCV. |
| **5** | **Cross-Camera ReID Matching Score** | Displayed `SEAMLESS ReID: 98%` / `98.4%` | **SIMULATED / HARDCODED** | Synthetic track object `reidConfidence: 0.984` | None (Hardcoded float) | Hardcoded `reidConfidence: 0.984` in `targetsRef` | **Implement real appearance ReID pipeline** (`reid_appearance.py`) computing color histogram / feature embedding cosine similarity combined with topological travel windows. |
| **6** | **Target Identity Continuity** | Target #084 walking continuously across seam | **SIMULATED** | Canvas animation loop incrementing `normX` | None (Canvas step animation) | `intruderX += intruderVx` in `requestAnimationFrame` | **Enforce camera-local ByteTrack IDs.** Cross-camera association must never assume identity; display source track and destination track with calculated similarity. |
| **7** | **Predictive Trajectory AI** | Forward dashed line with `EST (+3.2s)` circle | **SIMULATED** | Linear velocity multiplication on canvas | Primitive linear step ($x + v_x \cdot 60$) | Not connected to real ByteTrack history or boundary line intersection | **Calculate trajectory from actual centroid history** ($v_x, v_y$) and mathematically test for ray-segment intersection with configured boundary lines. |
| **8** | **Tactical Interception Countdown** | Static text: `Patrol 02 Dispatched - Intercept vector predicted within 42 seconds` | **SIMULATED / HARDCODED** | Static JSX string | None | Hardcoded text in card component | **Only trigger interception countdown if predicted trajectory mathematically intersects a configured tripwire / restricted boundary.** |
| **9** | **Field of View (FOV: 180° / 270° / 360° AI)** | Pill badge claiming `FOV: 180° Panoramic` | **SIMULATED CLAIM** | Static configuration string | None | Cameras are narrow/medium FOV UAV feeds without wide-angle calibration | **Remove unsupported FOV claims.** Label accurately as `SYNCHRONIZED DUAL-NODE STREAM`. |
| **10** | **Multi-Spectral Vision Modes (Thermal FLIR, NVG)** | CSS filter and color gradient overlays applied to video element | **SIMULATED (POST-PROCESS FILTER)** | Color remapping on standard RGB video | CSS / Canvas color blend | No physical thermal FLIR or phosphor sensor data | **Clearly label as "Software Multi-Spectral Simulation / False Color Emulation"** so judges know it is an analytical software shader. |
| **11** | **Object Detections & Bounding Boxes** | Real YOLOv8 detections for people and vehicles | **REAL** | `yolov8n.pt` inference on video frames | YOLOv8 + ByteTrack | PyTorch inference running on actual MP4 fixture frames | **Preserved and verified.** Eliminate synthetic fallbacks from generating false animal/vehicle tracks on court/perimeter feeds. |
| **12** | **Object Counting** | Real tracked entity counts per camera | **REAL (AFTER PHASE 23/24 FIX)** | Active tracked objects in `realTracksRef` / `camCountsMap` | ByteTrack MOT | Verified counts mapped from real tracker states | **Preserve 100% real tracking counts.** Zero false animal/vehicle counts on human-only corridors. |
| **13** | **Tripwire & Boundary Line Crossing** | Geometric line segment intersection | **REAL** | Configured zone coordinates & centroid history | 2D vector cross-product segment intersection | `cv_service/intrusion/tripwire.py` mathematical intersection logic | **Preserved.** Triggers only on genuine physical line crossings. |
| **14** | **Restricted Polygon Breach** | Point-in-polygon ray casting | **REAL** | Configured danger zone polygon vertices | Ray-casting algorithm | `cv_service/geometry/polygon.py` | **Preserved.** Proximity triggers "Suspicious Area", crossing triggers "Breach". |
| **15** | **Evidence Vault & SHA-256 Hashing** | Real MP4 recording clips and cryptographic SHA-256 digests | **REAL** | Video clips recorded to `/evidence` and SQLite DB | SHA-256 HMAC | `evidence_recorder.py` and SQLite `evidence_records` | **Preserved.** Fully verifiable against physical file hashes. |
| **16** | **Cross-Camera Corridors (Phase 8/19)** | Spatial-temporal topology and handover records | **REAL** | SQLite database `correlated_incidents` | `CameraTopology` + `TargetMatcher` | `cv_service/correlation/correlation_engine.py` | **Preserved.** Connected directly to live backend correlation engine. |

---

### Corrective Action Plan

1. **Retitle & Redesign Component**:
   - Replace "PANORAMIC MULTI-CAMERA FEED STITCHING & ReID" with **"MULTI-CAMERA SYNCHRONIZED SURVEILLANCE & CROSS-CAMERA INTELLIGENCE"**.
   - Show CAM-01 and CAM-02 as distinct, synchronized high-definition video streams side-by-side with individual camera telemetry HUDs.

2. **Implement Real Homography Evaluation Service**:
   - Create `cv_service/geometry/homography.py` utilizing OpenCV ORB/SIFT, `BFMatcher`, and `cv2.findHomography(..., cv2.RANSAC)`.
   - Provide a backend API route `POST /api/cv/homography-evaluate` that captures current frames from two selected cameras, computes keypoint correspondences, and returns real inlier counts and reprojection errors.
   - When cameras do not overlap, display:
     `HOMOGRAPHY STATUS: INSUFFICIENT OVERLAP (Matches: X, RANSAC Inliers: Y, Ratio: Z% < Threshold 35%) — CAMERAS OPERATE AS INDEPENDENT SURVEILLANCE NODES`.

3. **Implement Real Appearance ReID Service**:
   - Create `cv_service/correlation/reid_appearance.py` to extract appearance feature embeddings (normalized 3D HSV color histograms and aspect ratio vectors) from detection crops.
   - Calculate real Cosine Similarity and Bhattacharyya distance between candidate tracks across cameras.
   - Display truthful ReID verdicts:
     `ReID MATCH: Similarity 0.84 | Source: CAM-01 Track #27 | Target: CAM-02 Track #11 | Time Gap: 4.2s | Decision: VERIFIED MATCH` or `NOT CONFIDENT (Similarity 0.41)`.

4. **Real Trajectory Projection & Interception**:
   - Compute forward trajectories using the real track centroid velocity vector ($\Delta x, \Delta y$).
   - Test for mathematical intersection against the configured boundary tripwire.
   - If no intersection occurs, truthfully display: `NO PREDICTED BORDER CROSSING`.

5. **Developer & Judge Diagnostic HUD**:
   - Provide an expandable raw diagnostic telemetry view exposing: Frame ID, Detection Class, Bounding Box, Centroid, Track ID, Proximity Distance, Line Crossing Status, and ReID similarity metrics.
