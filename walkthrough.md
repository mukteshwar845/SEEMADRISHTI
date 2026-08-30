# SEEMADRISHTI AI — Walkthrough
## Phase 21: Cross-Camera Target Journey + Dynamic Threat Heatmap
## Security Hardening: Production Operator Authentication & Credential Isolation

**Project:** SEEMADRISHTI AI  
**Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Team:** IQ100  

---

## 1. Overview of Delivered Capabilities

### Phase 21: Multi-Camera Situational Awareness
1. **Cross-Camera Target Journey Engine (`cv_service/journey/target_journey.py`)**:
   - Reconstructs topological multi-camera journeys based solely on authentic telemetry, SQLite incident records, and confirmed spatial-temporal handover correlation.
   - Strictly enforces camera connectivity via `CameraTopology.are_cameras_connected()` and transition plausibility via `is_transition_timely()`.
   - Never hallucinates unverified camera hops; outputs `CONFIDENCE: INSUFFICIENT DATA` and explanatory telemetry gap notes when handover evidence is missing.
   - Real-time endpoints: `GET /api/intelligence/journey/:trackId` and `GET /api/intelligence/targets`.

2. **Dynamic Threat Heatmap Engine (`cv_service/analytics/threat_heatmap.py`)**:
   - Computes deterministic mathematical threat indices across all 9 canonical CCTV border nodes and sectors based strictly on real operational data:
     $$\text{Threat Index} = \min(100, \sum w_i \cdot \text{count}_i)$$
     Weights: Restricted Perimeter Breaches ($25$), Tripwire Crossings ($15$), Loitering ($12$), Anomalies ($8$), Critical Incidents ($30$), High Incidents ($18$), Re-Entry ($10$).
   - Multi-window temporal filtering: `15m`, `1h`, `6h`, `24h`.
   - Automated Threat Hotspot detection with trend derivation (`ESCALATING`, `DE-ESCALATING`, `STABLE`, or `INSUFFICIENT DATA`).
   - Automated High-Risk Corridor discovery identifying sequential threat vectors across adjacent CCTV nodes.
   - Endpoints: `GET /api/intelligence/threat-heatmap`, `GET /api/intelligence/cameras/:cameraId/threat-profile`, and `GET /api/intelligence/threat-corridors`.

3. **Natural Language Search Integration (`server/routes/search.ts` & `cv_service/search/query_parser.py`)**:
   - Understands queries for "highest risk camera", "threat hotspot", "most breaches", and "corridors".
   - Links search results directly to Target Journey and Dynamic Threat Heatmap views.

4. **Tactical UI Visualizers**:
   - `TargetJourneyView.tsx`: Directed animated path connectors across the camera network topology graph, chronological event trail table, and multi-tier filters (`[ALL]`, `[PERSON]`, `[VEHICLE]`, `[HIGH RISK]`, `[CRITICAL]`).
   - `ThreatHeatmapView.tsx`: Hotspot HUD banner, time window selector, 9-node CCTV threat distribution bars, sector matrix, high-risk corridor panel, and live WebSocket telemetry updates.
   - Integrated sidebar navigation (`[JOURNEY]`, `[HEATMAP]`) and cross-view buttons in Incident Inspector and Intelligence Search.

---

### Security Hardening: Credential Isolation & Operator Authentication
1. **Purged Hardcoded Shared Secrets**:
   - Deleted `'seemadrishti-tactical-secret-key-2026'` fallback from `server/middleware/auth.ts`, `src/services/api.ts`, `server/services/websocket.ts`, and `BACKEND_SETUP.md`.
   - Verified with ripgrep: **zero occurrences** in frontend source (`src/`), bundled assets (`dist/assets/`), backend (`server/`), or setup docs.
   - Configured `.env.example` with instructions to generate random 256-bit secrets via `openssl rand -hex 32`. Confirmed `.env` is gitignored.

2. **Per-Operator Salted Password Authentication**:
   - Upgraded SQLite `users` table schema with `username TEXT UNIQUE` and `password_hash TEXT` with automated migrations.
   - Passwords hashed with standard `bcryptjs` (salt rounds: 10).
   - Created `POST /api/auth/login` issuing 12-hour signed JWT session tokens containing user ID, username, and role.
   - Added `GET /api/auth/me` returning sanitized operator profile (never leaking `password_hash`).

3. **Dual-Scheme `requireAuth` Middleware**:
   - Gating all mutating endpoints (`POST`, `PUT`, `DELETE`, `PATCH`).
   - Rejects unauthenticated requests with `401 Unauthorized`.
   - Rejects requests with old/invalid keys with `403 Forbidden`.
   - Accepts valid operator JWT session tokens (`Authorization: Bearer <jwt>`).
   - Accepts isolated machine-to-machine service tokens (`x-api-key: <API_KEY>` or `CV_SERVICE_TOKEN`) for CV service to backend communication.
   - Whitelists `/api/auth/login` from requiring a pre-existing token.

4. **WebSocket Ingestion Protection**:
   - Consumer dashboards connect unauthenticated to `/ws` as receive-only subscribers.
   - Telemetry publishers (e.g. `cv_service`) must authenticate via `?token=<CV_SERVICE_TOKEN>` or `{ "type": "auth", "token": "<CV_SERVICE_TOKEN>" }`.

5. **Hackathon Demo Operator Credentials (For Judges)**:
   Pre-seeded in `server/db/seed.ts` with bcrypt-hashed credentials:
   - `admin` / `Admin@123` (Major Vikram Sen, Commander, All Sectors)
   - `operator` / `Operator@123` (Officer Rajesh Kumar, Surveillance Operator, Sector Alpha)
   - `patrol` / `Patrol@123` (Havaldar Amit Patel, Patrol Officer, East Perimeter)
   - `analyst` / `Analyst@123` (Dr. Ananya Sharma, AI Analyst, Neural Net Training)
   - Added interactive Quick-Fill chips in the `UserManagementView` login modal for instant 1-click judge evaluation.

---

## 2. Test Execution & Verification Results

| Test Suite | File | Tests Run | Result | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **Security & Authentication** | `tests/security_auth_test.ts` | 10 / 10 | **PASS (100%)** | 5.2s |
| **Phase 1 Backend Integration** | `tests/phase1_test.ts` | 14 / 14 | **PASS (100%)** | 7.8s |
| **Phase 21 Target Journey & Heatmap** | `cv_service/tests/phase21_test.py` | 30 / 30 | **PASS (100%)** | 0.02s |
| **Phase 20 Search & Summary** | `cv_service/tests/phase20_test.py` | 28 / 28 | **PASS (100%)** | 2.0s |
| **Phase 19 Threat Chains & XAI** | `cv_service/tests/phase19_test.py` | 67 / 67 | **PASS (100%)** | 0.01s |
| **Phase 18 Operational Intelligence**| `cv_service/tests/phase18_test.py` | 34 / 34 | **PASS (100%)** | 63.0s |
| **TypeScript Compilation** | `tsc --noEmit` | Whole Repo | **0 Errors** | 12.1s |
| **Production Build** | `npm run build` | Frontend + Server | **SUCCESS** | 39.8s |
| **Secret Leak Audit** | `grep dist/assets` | All Bundles | **0 Matches** | — |

---

## 3. Summary of Key Files Created / Modified

- [target_journey.py](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/journey/target_journey.py): Cross-camera target journey reconstruction engine.
- [threat_heatmap.py](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/analytics/threat_heatmap.py): Multi-camera threat heatmap, hotspot, and corridor engine.
- [phase21_test.py](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/cv_service/tests/phase21_test.py): 30 unit tests for Phase 21.
- [intelligence.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/routes/intelligence.ts): REST endpoints for journey and threat heatmap analytics.
- [auth.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/routes/auth.ts): Operator login (`/login`), session profile (`/me`), and logout (`/logout`).
- [auth.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/middleware/auth.ts): Dual-scheme authentication middleware (JWT Bearer + M2M API key).
- [schema.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/db/schema.ts): Added `username` and `password_hash` columns with automatic migrations.
- [seed.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/server/db/seed.ts): Seeded demo operators with bcrypt hashed passwords.
- [security_auth_test.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/tests/security_auth_test.ts): 10-point automated security verification suite.
- [api.ts](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/src/services/api.ts): Dynamic JWT token management with zero hardcoded keys.
- [TargetJourneyView.tsx](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/src/components/TargetJourneyView.tsx): Tactical camera network topology and target journey visualizer.
- [ThreatHeatmapView.tsx](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/src/components/ThreatHeatmapView.tsx): Dynamic threat heatmap, hotspot HUD, and corridor discovery view.
- [UserManagementView.tsx](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/src/components/UserManagementView.tsx): Operator session HUD, login/switch modal, and judge quick-fill chips.
- [BACKEND_SETUP.md](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/BACKEND_SETUP.md): Security guide, secret generation commands, and judge credentials.
- [.env.example](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/.env.example): Environment variable template for secrets.
- [CHANGELOG.md](file:///c:/Users/tribh/Downloads/SEEMADRISHTI/CHANGELOG.md): Updated project history.
