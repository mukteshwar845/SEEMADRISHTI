# SEEMADRISHTI AI — Chronological Engineering Changelog
**Project:** AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Problem Statement:** SIH26187 | **Team:** IQ100  
**Stack:** React 19 + TypeScript + Vite, Node.js/Express + SQLite (`node:sqlite`), Python CV (YOLOv8 + ByteTrack)

---

## Chronological Phase Progression (Phase 1 — Phase 19)

### Phase 1 — Foundational Backend Architecture & Data Layer
- SQLite database schema (`node:sqlite`, WAL mode, Foreign Keys ON) with 13 core relational tables.
- Express REST API Gateway with endpoints for cameras, zones, events, alerts, and system health.
- Real-time WebSocket Gateway (`/ws`) with bi-directional heartbeat (ping/pong) and fan-out broadcasting.
- Automated 14-point backend integration test suite (`tests/phase1_test.ts`).

### Phase 2 — YOLOv8 Computer Vision Pipeline Integration
- Integrated real Ultralytics YOLOv8 inference engine (`yolov8n.pt`).
- Edge-optimized bipedal and vehicular object detection with confidence thresholding and NMS.
- Detection publisher transmitting real bounding box payloads to the backend WebSocket gateway.

### Phase 3 — ByteTrack Multi-Object Tracking (MOT)
- Replaced frame-isolated detections with persistent track associations via ByteTrack.
- Unique track ID assignment across frames, eliminating track-flicker and ID-switching.
- Kinematic velocity vectors, Kalman filter state prediction, and trajectory history accumulators.

### Phase 4 — Virtual Geofencing & Convex/Concave Polygon Zones
- Mathematical Ray-Casting algorithm for arbitrary $N$-point polygon inclusion tests.
- Support for complex convex, concave, and L-shaped security perimeter boundaries.
- Dedicated optical tripwire line-crossing intersection checks using vector cross products.

### Phase 5 — Tactical Ingress/Egress Counting & Directional Detection
- Inward vs. outward movement vector classification relative to perimeter boundary normals.
- Bi-directional entry and exit telemetry counters per camera sector.
- Real-time net occupancy calculations with automatic duplicate suppression.

### Phase 6 — Explainable Risk Engine (XAI) & Multi-Factor Scoring
- Deterministic 0–100 tactical threat scoring engine eliminating arbitrary random numbers.
- Factor weights: Zone Incursion ($w=0.35$), Dwell Loitering ($w=0.30$), Approach Vector ($w=0.20$), Neural Model Confidence ($w=0.15$).
- Mathematical formulation: $\text{Threat Index} = \min\left(100, \sum w_i \cdot s_i \cdot M_{\text{env}}\right)$.

### Phase 7 — Automated Forensic Incident Video Capture & Packaging
- Ring buffer pre-event (10s) and post-event (10s) frame recording upon high-threat alert trigger.
- Evidence video compilation into standard MP4 clips with visual telemetry HUD overlays.
- Cryptographic SHA-256 evidence hashing and forensic manifest generation for legal chain-of-custody.

### Phase 8 — Multi-Camera Correlation & Cross-Sector Spatial Tracking
- Cross-camera spatial-temporal handover tracking across overlapping and adjacent CCTV fields of view.
- Track re-identification based on target spatial kinematics, aspect ratio, and movement corridor vectors.
- Consolidated multi-camera incident fusion linking sequential sector intrusions.

### Phase 9 — Environmental Shift & Low-Light / Night-Vision Adaptation
- Automated environmental lighting classifier detecting daylight, dusk, dawn, and night conditions.
- Contrast-Limited Adaptive Histogram Equalization (CLAHE) for low-contrast infrared enhancement.
- Dynamic sensitivity tuning based on environmental visibility scores and atmospheric degradation.

### Phase 10 — Mission Control Tactical HUD & Sector Matrix
- $3 \times 3$ synchronous camera matrix grid displaying live surveillance feeds across 9 border posts.
- High-contrast tactical night-vision UI with HUD brackets, target reticles, and real-time alert tickers.
- Interactive spotlight inspection mode with synchronized pan-tilt-zoom (PTZ) controls.

### Phase 11 — Edge Device Diagnostics & Network Telemetry
- Real-time hardware telemetry: CPU core load, memory allocation, storage utilization, and network throughput.
- Per-camera diagnostic health monitoring: frame drop rates, jitter, latency (ms), and packet loss percentage.
- Self-healing connection watchdogs with automated stream reconnection logic.

### Phase 12 — Real-Time Alert Dispatch & Notification Center
- Instant acoustic and visual alert notification banners with color-coded threat severity tiers.
- One-click Quick Reaction Team (QRT) dispatch trigger with real-time countdown tracking.
- Formal operator incident acknowledgment and logging into permanent SQLite audit trail.

### Phase 13 — Forensic Video Timeline & Multi-Speed Scrubber
- Interactive frame scrubber allowing operator investigation of pre- and post-incident moments.
- Variable playback speeds ($0.5\times$, $1\times$, $1.5\times$, $2\times$), frame stepping, and loop toggles.
- Direct forensic evidence MP4 clip export and cryptographic integrity verification.

### Phase 14 — Full VisDrone 9-Camera Real Video Deployment
- Eliminated all placeholder loops; backed all 9 cameras with real VisDrone UAV border surveillance footage.
- HTTP Range Request streaming (`206 Partial Content`) via `/api/cameras/:id/video` for instant seeking.
- Real-world validation against high-density pedestrian and vehicle surveillance footage.

### Phase 15 — Camera Fleet Management & Multi-Stream Orchestration
- Dynamic camera source profile manager (`config/camera_sources.json`) supporting RTSP, MP4, and webcams.
- Comprehensive fleet management dashboard (`/api/cameras/fleet`) displaying operational health and active streams.
- Live stream switching with real-time stream restart and failure simulation capabilities.

### Phase 16 — Zero-Random Production Audit & Forensic Hardening
- Complete repository audit replacing every instance of synthetic `Math.random()` with deterministic telemetry.
- Ground-truth validation: every detection, alert, trajectory, and count maps to verified computer vision events.
- Production-grade error boundaries and graceful degradation fallbacks across all views.

### Phase 17 — Production Verification of YOLOv8 & ByteTrack
- 34 comprehensive tests validating real bipedal detection accuracy and persistent track ID continuity.
- Calibrated tripwires and perimeter polygon zones matching operational VisDrone video dimensions.
- Verified forensic clip generation with non-black pixel variance testing at 10%, 50%, and 90% timestamps.

### Phase 18 — Operational Intelligence & Calibration Hardening
- Interactive Camera Calibration tool for dynamic polygon and tripwire placement.
- Live ingress/egress counter verification with directional arrow vectors.
- Complete 34-test suite (`cv_service/tests/phase18_test.py`) verifying calibration persistence and tripwire crossing.

### Phase 19 — Explainable AI (XAI) Suite & Cross-Camera Incident Fusion
- **XAI Multi-Factor Attribution**: Detailed weight bars with explicit point contributions summing to final risk score.
- **Audited Decision Trace**: Sequential 5-step rule execution trail explaining why alerts were generated.
- **Interactive Counterfactual Simulator**: Live What-If reasoning engine with dwell slider and direction toggles.
- **Grad-CAM Attention Heatmap**: Tactical pseudo-color saliency overlay visualizing neural ROI over target and breach line.
- **Real Video Playback in Historical Logs**: HTML5 `<video>` player with hover sneak-peeks and scrub bars, removing all dummy Unsplash images.
- **Threat Behavior Chains**: Multi-event behavioral correlation detecting loitering-before-breach, reconnaissance probes, and group perimeter rushes.

### Phase 20 — AI Surveillance Search & Automatic Incident Intelligence Summary
- **Natural Language Surveillance Search**: Edge query parser extracting camera IDs, time windows, risk tiers, behavior patterns, and entities without external cloud dependencies.
- **Multi-Camera Search Execution**: Unified search across incidents, events, behavior chains, and targets with interactive tactical filters.
- **Automatic Incident Intelligence Summary**: Rule-based explainable incident summaries synthesizing operational threat chronology, involved cameras, and tactical recommendations.

### Phase 21 — Cross-Camera Target Journey & Dynamic Threat Heatmap
- **Target Journey Reconstruction Engine (`cv_service/journey/target_journey.py`)**: Reconstructs evidence-based multi-camera journeys for tracked surveillance targets with topological handover validation and strict chronological event ordering.
- **Dynamic Threat Heatmap Engine (`cv_service/analytics/threat_heatmap.py`)**: Computes deterministic threat weighting across 9 CCTV nodes and border sectors with temporal windowing (`15m`, `1h`, `6h`, `24h`).
- **Automated Threat Hotspot & Corridor Detection**: Derives escalating/de-escalating trends and discovers propagating cross-camera threat corridors across connected perimeter cameras.
- **Interactive Tactical Visualizers**: `TargetJourneyView` with animated directed camera graph connectors, and `ThreatHeatmapView` with 9-node CCTV distribution, sector matrix, and WebSocket live updates.

### Security Hardening — Operator Authentication & Credential Isolation
- **Elimination of Shared Secrets**: Completely purged hardcoded static API keys from frontend source code, client bundle (`dist/`), backend middleware, and setup documentation.
- **Per-Operator Salted Password Authentication**: Secure bcrypt password hashing (`users.password_hash`), `POST /api/auth/login`, and 12-hour signed JWT session tokens.
- **Dual-Scheme `requireAuth` Middleware**: Gating all mutating endpoints (`POST`, `PUT`, `DELETE`, `PATCH`) with support for operator JWT Bearer tokens and isolated machine-to-machine `x-api-key` service tokens.
- **WebSocket Ingestion Protection**: Unauthenticated receive-only connections for browser telemetry viewers; cryptographically authenticated `CV_SERVICE_TOKEN` for telemetry publishers.
- **Hackathon Demo Operator Credentials**: Pre-seeded demo operators with bcrypt hashed passwords (`admin` / `Admin@123`, `operator` / `Operator@123`, `patrol` / `Patrol@123`, `analyst` / `Analyst@123`) and interactive quick-fill UI chips in `UserManagementView`.
- **Automated Security Verification**: 10-point test suite (`tests/security_auth_test.ts`) validating 401 unauthenticated rejections, 403 old-key rejections, 200 JWT login, and M2M service token authorization.
