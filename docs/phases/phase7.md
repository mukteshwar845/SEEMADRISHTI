# PHASE 7 STATUS REPORT: INCIDENT EVIDENCE CAPTURE & RECONSTRUCTION ENGINE

**Project:** SEEMADRISHTI AI  
**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Status:** **PHASE 7 COMPLETED & FULLY VERIFIED (28/28 TESTS PASSED, ZERO REGRESSIONS)**

---

## 1. Executive Summary

Phase 7 of SEEMADRISHTI AI delivers an automated **Incident Evidence Capture & Reconstruction Engine** designed for tactical border security. When a confirmed **HIGH** or **CRITICAL** risk incident occurs, the system automatically reconstructs and encodes a forensically compliant video evidence package:

```
VIDEO INGESTION (OpenCV RTSP / CCTV / MP4)
  │
  ├──────────────────────────────────────────────┐
  ▼                                              ▼
In-Memory Bounded Circular Frame Buffer       YOLOv8n Object Detection (Edge Inference)
(Pre-Event Retention: 10.0s)                     │
                                                 ▼
                                              ByteTrack Multi-Object Tracking (Persistent IDs)
                                                 │
                                                 ▼
                                              Virtual Polygon Perimeter Geometry (Ray-Casting)
                                                 │
                                                 ▼
                                              Loitering & Abnormal Dwell Detection
                                                 │
                                                 ▼
                                              Explainable Risk Engine (0-100 Score, Levels)
                                                 │
                                                 ▼
┌────────────────────────────────────────────────┴─────────────────────────────────────────────┐
│                             INCIDENT EVIDENCE TRIGGER POLICY                                  │
│   Evaluates: Target Class == 'person' AND Risk Level in ('HIGH', 'CRITICAL')                 │
│   Duplicate Prevention: Gated per (camera_id, track_id) with automated cooldown windows     │
└────────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       SNAPSHOT PRE-EVENT BUFFER                                   ACCUMULATE POST-EVENT FRAMES
     (Past 10.0s of raw video)                                       (Next 10.0s of raw video)
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 ▼
                                     FORENSIC EVIDENCE WRITER
                           - Tactical Top Header Bar Overlay (Cyan Accent)
                           - Dynamic Incident ID & UTC Timestamps
                           - Camera ID, Track ID, Class, Event Type, Zone
                           - Threat Level & Score Badge (CRITICAL Red / HIGH Amber)
                           - Reason Code Demarcation & Progress Bar
                           - Multi-Codec Compliant MP4 Encoding (mp4v / avc1 / H264)
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
              SQLITE DATABASE PERSISTENCE                      WEBSOCKET FAN-OUT (/ws)
             (incidents table record)                    ('incident_created', 'evidence_ready')
                         │                                               │
                         └───────────────────────┬───────────────────────┘
                                                 ▼
                                     TACTICAL DASHBOARD & REST
                                (Streaming: GET /api/incidents/:id/evidence)
```

---

## 2. Phase 7 Verification Test Matrix (28/28 PASSED)

**Test Command:** `py -3.12 cv_service/tests/phase7_test.py`

| Test # | Requirement / Stage | Expected Behavior | Actual Verified Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TEST 01** | Buffer Initialization | Starts with 0 frames | Initial frame count: `0` | **PASSED** |
| **TEST 02** | Frame Insertion | Continuous frame ingestion | `5` frames successfully buffered | **PASSED** |
| **TEST 03** | Buffer Duration Limit | Enforces configured time ceiling | Frames bounded to window, oldest $\ge 106.0\text{s}$ | **PASSED** |
| **TEST 04** | Old-Frame Eviction | Automatically drops expired frames | Evicted frames older than retention cutoff | **PASSED** |
| **TEST 05** | Pre-Event Preservation | Snapshots pre-event history | Retrieved `4` pre-event frames ($t=11.0$ to $14.0\text{s}$) | **PASSED** |
| **TEST 06** | HIGH Trigger | Level HIGH initiates incident | Created `INC-000001` with status `'capturing'` | **PASSED** |
| **TEST 07** | CRITICAL Trigger | Level CRITICAL initiates incident | Created `INC-000001` with level `'CRITICAL'` | **PASSED** |
| **TEST 08** | LOW/MEDIUM Ignored | Sub-threshold risk ignored | `LOW ➔ None`, `MEDIUM ➔ None` | **PASSED** |
| **TEST 09** | Duplicate Prevention | No frame-by-frame duplicate clips | Same active threat suppressed: `Second ➔ None` | **PASSED** |
| **TEST 10** | Post-Event Capture | Collects frames after trigger | Frame count expanded from `3` to `5` frames | **PASSED** |
| **TEST 11** | MP4 Creation | Assembles and encodes MP4 file | Encoded `evidence_test/INC-P7-TEST-...mp4` (15 frames) | **PASSED** |
| **TEST 12** | Evidence File on Disk | Valid file with non-zero size | Verified file size: `44,085 bytes` (> 1 KB) | **PASSED** |
| **TEST 13** | SQLite Metadata | `POST /api/incidents` succeeds | Persisted record in SQLite with HTTP 201 | **PASSED** |
| **TEST 14** | Risk Score Preserved | Score intact across DB boundary | Score = `87`, Level = `'CRITICAL'` | **PASSED** |
| **TEST 15** | Reason Preservation | Reasons list intact in metadata | Extracted reasons: `['INTRUSION', 'LOITERING']` | **PASSED** |
| **TEST 16** | Multi-Camera Isolation | Buffer partitioned by camera ID | `cam-01`: 2 frames, `cam-02`: 1 frame (zero bleed) | **PASSED** |
| **TEST 17** | Track ID Preservation | Target ID preserved in SQLite | Verified `track_id = '#13'` | **PASSED** |
| **TEST 18** | Incident REST API | List, Get, Ack, Evidence endpoints | List: HTTP 200, Ack: HTTP 200, Stream: HTTP 200 | **PASSED** |
| **TEST 19** | WebSocket incident_created | Broadcasts on incident trigger | Received `incident_created` packet over `/ws` | **PASSED** |
| **TEST 20** | WebSocket evidence_ready | Broadcasts on clip completion | Received `evidence_ready` packet over `/ws` | **PASSED** |
| **TEST 21** | Failed Writer Handling | Empty frame list handled safely | Caught `ValueError` gracefully without crashing | **PASSED** |
| **TEST 22** | Empty Buffer Handling | Zero-buffer handled gracefully | Returned clean empty list `[]` | **PASSED** |
| **TEST 23** | Phase 6 Risk Regression | Full 36-test suite execution | **36/36 passed** with exit code 0 | **PASSED** |
| **TEST 24** | Phase 5 Loitering Regression | Full 31-test suite execution | **31/31 passed** with exit code 0 | **PASSED** |
| **TEST 25** | Phase 4 Intrusion Regression | Full 22-test suite execution | **22/22 passed** with exit code 0 | **PASSED** |
| **TEST 26** | Phase 3 Tracking Regression | Full 12-test suite execution | **12/12 passed** with exit code 0 | **PASSED** |
| **TEST 27** | Phase 2 Detection Regression | Full 12-test suite execution | **12/12 passed** with exit code 0 | **PASSED** |
| **TEST 28** | Phase 1 Backend Regression | Full 13-test REST/DB suite | **13/13 passed** with exit code 0 | **PASSED** |

---

## 3. Files Created & Modified

### Files Created:
1. [`cv_service/evidence/circular_buffer.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/evidence/circular_buffer.py): Bounded in-memory circular frame buffer partitioned by camera ID.
2. [`cv_service/evidence/evidence_writer.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/evidence/evidence_writer.py): Forensic video writer with tactical HUD overlay and multi-codec fallback.
3. [`cv_service/evidence/incident_manager.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/evidence/incident_manager.py): Incident lifecycle coordinator (triggering, buffering, post-capture, REST/WS notifications).
4. [`cv_service/evidence/__init__.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/evidence/__init__.py): Module re-exports.
5. [`server/routes/incidents.ts`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/routes/incidents.ts): REST API router for incidents (`/api/incidents`, `/api/incidents/:id`, `/api/incidents/:id/evidence`, `/api/incidents/:id/acknowledge`).
6. [`cv_service/tests/phase7_test.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/tests/phase7_test.py): 28-test automated verification suite.
7. [`PHASE7_STATUS.md`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/PHASE7_STATUS.md): This status report.

### Files Modified:
1. [`cv_service/config.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/config.py): Added Phase 7 configuration options (`PRE_EVENT_SECONDS`, `POST_EVENT_SECONDS`, `EVIDENCE_DIR`, `MIN_EVIDENCE_RISK_LEVEL`, etc.).
2. [`cv_service/main.py`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/main.py): Connected circular frame buffer, incident trigger checking, post-event collection, evidence clip finalization, and benchmark reporting.
3. [`server/db/schema.ts`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/db/schema.ts): Added `incidents` table and performance indexes.
4. [`server/types/api.ts`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/types/api.ts): Added `IncidentEntity`, `CreateIncidentDTO`, `UpdateIncidentDTO`, and WebSocket message types `incident_created` and `evidence_ready`.
5. [`server/app.ts`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/app.ts): Mounted `incidentsRouter` at `/api/incidents`.
6. [`server/services/websocket.ts`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/services/websocket.ts): Added message routing to fan out `incident_created` and `evidence_ready`.
7. [`src/services/websocketService.ts`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/src/services/websocketService.ts): Added `IncidentPayload`, `IncidentListener`, and `onIncidentCreated` / `onEvidenceReady` subscriptions.
8. [`cv_service/README.md`](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/README.md): Updated architecture, CLI arguments, and test commands.

---

## 4. Circular Frame Buffer Design

- **Thread-safe & Memory-bounded**: Implemented with Python `collections.deque(maxlen=N)`.
- **Capacity Formula**:
  $$\text{Capacity} = \max\left(10, \, \text{int}\left(\text{pre\_event\_seconds} \times \text{max\_fps} \times 1.5\right)\right)$$
- **Automated Eviction**: On each frame push, frames with timestamps older than $\text{current\_time} - \text{pre\_event\_seconds}$ are immediately evicted from the left of the deque.
- **Deep-Copy Isolation**: Incoming OpenCV numpy frames are stored via `frame.copy()` so subsequent inference annotations or pipeline steps do not corrupt historical buffer data.
- **Multi-Camera Partitioning**: Separate deques are maintained per `camera_id` (`cam-01`, `cam-02`, etc.) ensuring total isolation between streams.

---

## 5. Incident Trigger & Anti-Duplicate Policy

- **Trigger Gate**:
  $$\text{Trigger} = (\text{class\_name} == \text{'person'}) \land (\text{risk\_level} \in \{\text{'HIGH'}, \text{'CRITICAL'}\})$$
- **Anti-Duplicate Suppression**:
  - If target track $(camera\_id, track\_id)$ already has an ongoing active incident session, redundant triggers are suppressed.
  - If target risk escalates from `HIGH` to `CRITICAL` during capture, the existing incident's risk level and end time are dynamically extended.
  - Cooldown window: Upon finalization, the target enters a 15.0s cooldown during which duplicate incidents for identical risk levels are prevented.

---

## 6. Forensic Evidence HUD Overlay

Burned directly into every encoded MP4 frame using OpenCV graphics:
- **Top Forensic Header (Dark Slate `#0C1018`, Cyan `#38BDF8` accent)**:
  - `"SEEMADRISHTI AI  //  FORENSIC EVIDENCE RECONSTRUCTION"`
  - UTC Timestamp + Frame index counter: `YYYY-MM-DD HH:MM:SS UTC [FRM 0001/0035]`
  - Metadata Sub-bar: `CAM: CAM-01  |  TRACK: #1 (PERSON)  |  EVENT: RISK_ASSESSMENT  |  ZONE: SECTOR ALPHA`
- **Threat Level Badge (Top Right)**:
  - CRITICAL: Crimson Red (`BGR: 0, 0, 220`)
  - HIGH: Deep Amber (`BGR: 0, 140, 255`)
  - Text: `RISK: {risk_score}/100 [{risk_level}]`
- **Bottom Indicators Bar**:
  - `INCIDENT: INC-000001  |  INDICATORS: [INTRUSION: +40] [LOITERING: +25]`
  - Real-time forensic timeline progress bar along bottom border.

---

## 7. SQLite Database Schema & REST Endpoints

### Table Definition (`server/db/schema.ts`):
```sql
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  track_id TEXT,
  event_id TEXT,
  event_type TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK(risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  zone_name TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  evidence_path TEXT,
  pre_event_seconds REAL NOT NULL DEFAULT 10.0,
  post_event_seconds REAL NOT NULL DEFAULT 10.0,
  evidence_status TEXT NOT NULL DEFAULT 'capturing' CHECK(evidence_status IN ('capturing', 'ready', 'failed')),
  metadata TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0 CHECK(acknowledged IN (0, 1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);
```

### REST API Endpoints:
| Method | Path | Description | Response Status |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/incidents` | List incidents (filter by camera, level, status, time) | `200 OK` |
| `GET` | `/api/incidents/:id` | Fetch single incident metadata | `200 OK` / `404` |
| `GET` | `/api/incidents/:id/evidence` | Stream/download forensic MP4 video | `200 OK` (`video/mp4`) |
| `POST` | `/api/incidents` | Create incident session (called by CV service) | `201 Created` |
| `PATCH` | `/api/incidents/:id` | Update evidence path, status, and end timestamp | `200 OK` |
| `POST` | `/api/incidents/:id/acknowledge` | Mark incident as acknowledged by operator | `200 OK` |

---

## 8. Real Video Integrated Benchmark Report

Execution on real test video (`cv_service/tests/fixtures/intrusion_test.mp4`):

```
===================================================================
SEEMADRISHTI AI - EVIDENCE, RISK & SURVEILLANCE PIPELINE (PHASE 7)
===================================================================
 * Video Source:       cv_service/tests/fixtures/intrusion_test.mp4
 * Camera ID:          cam-01
 * YOLO Model:         yolov8n.pt
 * Confidence Limit:   0.40
 * Frame Skip Ratio:   1
 * Tracking Engine:    ByteTrack (Active)
 * Intrusion Engine:   Active (Polygon Point-in-Polygon & Transition)
 * Loitering Engine:   Active (Threshold: 1.0s)
 * Threat Risk Engine: Active (Explainable 0-100 Scoring)
 * Evidence Engine:    Active (Pre: 10.0s, Post: 10.0s)
 * Evidence Output:    evidence
 * WebSocket Target:   ws://127.0.0.1:8000/ws
===================================================================

[INTRUSION]
Camera:    cam-01
Track:     #1 (person)
Zone:      Sector Alpha Restricted Perimeter
Direction: ENTERING
Position:  (553.0, 357.5)
Timestamp: 2026-08-27T18:28:01Z

[LOITERING]
Camera:    cam-01
Track:     #1 (person)
Zone:      Sector Alpha Restricted Perimeter
Dwell:     1.0s
Threshold: 1s
Timestamp: 2026-08-27T18:28:02Z

[RISK ASSESSMENT]
Camera: cam-01
Track:  #1 (person)
Score:  65 / 100
Level:  HIGH
Reasons:
  - INTRUSION (+40): Restricted-zone intrusion
  - LOITERING (+25): Abnormal dwell time (1.0s)
Timestamp: 2026-08-27T18:28:02Z

[INCIDENT EVIDENCE READY]
Incident ID:   INC-000001
Camera ID:     cam-01
Track ID:      #1 (person)
Risk Level:    HIGH (65/100)
Zone:          Sector Alpha Restricted Perimeter
Total Frames:  35
Evidence File: evidence/INC-000001.mp4

===================================================================
[BENCHMARK REPORT] PHASE 7 EVIDENCE, RISK & TRACKING PERFORMANCE
===================================================================
 * Total Ingested Frames:          35
 * Total Processed Frames:         35
 * Total Execution Time:           6.06s
 * Average Processed FPS:          5.77 FPS (CPU)
 * Average YOLO Inference Latency: 156.55 ms
 * Average ByteTrack Latency:      0.34 ms
 * Average Zone Geometry Latency:  0.967 ms
 * Average Loitering Latency:      0.695 ms
 * Average Risk Engine Latency:    1.741 ms
 * Average Evidence Latency:       1.471 ms
 * Total Processing Latency:       161.76 ms
 * Total Observed Track Records:   35
 * Unique Persistent Track IDs:    1 IDs: [1]
 * Real Intrusion Alerts Triggered: 1
 * Real Loitering Alerts Triggered: 1
 * Real Risk Alerts Triggered:      1
 * Real Incidents Triggered:        1
 * Real Evidence Clips Generated:   1
 * Tracked Classes Tally:          {'person': 35}
===================================================================
```

### Verified Evidence File Attributes:
- **File Name**: `evidence/INC-000001.mp4`
- **File Size**: `183,331 bytes`
- **Resolution**: `768 x 432`
- **Encoded Frame Count**: `35 frames`
- **Video Framerate**: `12.0 FPS`
- **Average Evidence Buffer & Processing Overhead**: `1.471 ms` per frame

---

## 9. Full System Regression Verification

| Phase / Suite | Test Command | Tests Executed | Tests Passed | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 7 Evidence Engine** | `py -3.12 cv_service/tests/phase7_test.py` | 28 | 28 | **PASSED** |
| **Phase 6 Risk Engine** | `py -3.12 cv_service/tests/phase6_test.py` | 36 | 36 | **PASSED** |
| **Phase 5 Loitering** | `py -3.12 cv_service/tests/phase5_test.py` | 31 | 31 | **PASSED** |
| **Phase 4 Intrusion** | `py -3.12 cv_service/tests/phase4_test.py` | 22 | 22 | **PASSED** |
| **Phase 3 Tracking** | `py -3.12 cv_service/tests/phase3_test.py` | 12 | 12 | **PASSED** |
| **Phase 2 Detection** | `py -3.12 cv_service/tests/phase2_test.py` | 12 | 12 | **PASSED** |
| **Phase 1 Backend REST & DB** | `npm.cmd run test:phase1` | 13 | 13 | **PASSED** |
| **TypeScript Strict Lint** | `npm.cmd run lint` (`tsc --noEmit`) | - | 0 errors | **PASSED** |
| **Vite Production Build** | `npm.cmd run build` (`vite build`) | - | Built in 15.67s | **PASSED** |

---

## 10. Operational Run Commands

### 1. Start Backend Server:
```bash
npm.cmd run server
```

### 2. Run Phase 7 Automated Test Suite (28 Tests):
```bash
py -3.12 cv_service/tests/phase7_test.py
```

### 3. Run Real Integrated Video Pipeline with Evidence Capture:
```bash
py -3.12 cv_service/main.py --source cv_service/tests/fixtures/intrusion_test.mp4 --camera-id cam-01 --loitering-threshold 1.0 --max-frames 35
```

### 4. Query Evidence Incidents via REST API:
```bash
py -3.12 -c "import requests; print(requests.get('http://127.0.0.1:8000/api/incidents').json())"
```

### 5. Stream Forensic MP4 Video via REST:
```bash
curl -I http://127.0.0.1:8000/api/incidents/INC-000001/evidence
```

---

## 11. Known Limitations & Recommendations

1. **CPU Video Encoding**: Real-time MP4 encoding is executed on the CPU using OpenCV's `mp4v` codec. On systems with an NVIDIA GPU, configuring hardware-accelerated NVENC (e.g. `hevc_nvenc` or `h264_nvenc`) reduces encoding time to $< 10\text{ ms}$.
2. **Disk Storage Management**: The evidence directory retains all finalized MP4 clips. For production field deployment, an automated retention policy (e.g., rolling 30-day purge or cloud S3 / MinIO archival) should be configured.
