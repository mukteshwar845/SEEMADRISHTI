# SEEMADRISHTI AI — Backend Setup Guide (Phase 1)

**Project:** SEEMADRISHTI AI  
**Team:** IQ100  
**SIH Problem Statement:** SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Architecture:** Node.js + Express + WebSocket + SQLite (`node:sqlite`)  

---

## 1. Prerequisites

- **Node.js**: v20.0.0 or higher (v24 recommended; uses built-in `node:sqlite`)
- **Package Manager**: npm v10+ (or bun/pnpm)
- **Operating System**: Windows, Linux, or macOS

---

## 2. Installation

1. Navigate to the project root:
   ```bash
   cd c:\Users\tribh\Downloads\SEEMADRISHTI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## 3. Environment Configuration

Copy or inspect `.env.example`:
```bash
# Windows PowerShell
Copy-Item .env.example .env
```

Configuration variables in `.env`:
| Variable | Default / Example | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | HTTP and WebSocket port |
| `HOST` | `0.0.0.0` | Bind network interface |
| `DATABASE_PATH` | `./data/seemadrishti.sqlite` | SQLite database file location |
| `CORS_ORIGIN` | `*` | Allowed CORS origins for frontend access |
| `NODE_ENV` | `development` | Runtime mode (`development`, `production`, or `test`) |
| `API_KEY` | *(Set via .env)* | Cryptographic secret for CV service M2M REST API authentication |
| `CV_SERVICE_TOKEN` | *(Set via .env)* | Cryptographic secret for CV service WebSocket telemetry publishing |
| `JWT_SECRET` | *(Set via .env)* | Secret key used to sign and verify operator session JWTs |

---

## 3.1 Security & Authentication Architecture

All mutating REST routes (`POST`, `PUT`, `DELETE`, `PATCH`) are secured with `requireAuth` middleware (`server/middleware/auth.ts`).

### Generating Secrets
Generate strong random 256-bit secrets for your `.env` file (which is gitignored):
```bash
# Generate API_KEY / CV_SERVICE_TOKEN / JWT_SECRET
openssl rand -hex 32
```

### Authentication Schemes
1. **Per-Operator JWT Session Authentication (Browser Dashboard)**:
   - Operators authenticate via `POST /api/auth/login`.
   - On valid credentials, a signed JWT session token is returned.
   - All subsequent browser requests send `Authorization: Bearer <jwt_token>`.
   - No static API key is ever shipped or embedded in the client bundle.

2. **Machine-to-Machine Service Authentication (CV Pipeline -> Backend)**:
   - The Python CV service authenticates via `x-api-key: <API_KEY>` or `Authorization: Bearer <API_KEY>`.
   - Configured securely on the server via `process.env.API_KEY`.

### Hackathon Demo Credentials (For Judges)
The SQLite database is seeded with the following demo operators in `server/db/seed.ts` (passwords are securely hashed with `bcrypt`):
| Username | Password | Operator Name | Role | Assigned Sector |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `Admin@123` | Major Vikram Sen | Commander | All Border Sectors |
| `operator` | `Operator@123` | Officer Rajesh Kumar | Surveillance Operator | Gate Alpha & Checkpoint 1 |
| `patrol` | `Patrol@123` | Havaldar Amit Patel | Patrol Officer | East Perimeter Border Fence |
| `analyst` | `Analyst@123` | Dr. Ananya Sharma | AI Analyst | Neural Net Model Training |

### WebSocket Security Architecture
- **Browser Clients**: Connect unauthenticated to `/ws` as receive-only consumers. Browser clients receive live alerts, telemetry, and heatmaps, but cannot publish fake detections.
- **CV Service Publishers**: Authenticate via `ws://127.0.0.1:8000/ws?token=<CV_SERVICE_TOKEN>` or send an `{ "type": "auth", "token": "<CV_SERVICE_TOKEN>" }` handshake. Unauthenticated injection attempts are rejected.

---

## 4. Database Setup & Architecture

SEEMADRISHTI uses SQLite via Node.js native `node:sqlite` (`DatabaseSync`), requiring zero external binary compilation.

The database schema and demo seed data are initialized automatically on startup if the database file does not already exist:
- **Foreign Key Enforcement**: Enabled via `PRAGMA foreign_keys = ON;`
- **Write-Ahead Logging**: Enabled via `PRAGMA journal_mode = WAL;`
- **Location**: `./data/seemadrishti.sqlite`

### Relational Schema
- **`cameras`**: `id`, `name`, `location`, `source_type` (`mp4` \| `webcam` \| `rtsp`), `source_url`, `status` (`Online` \| `Degraded` \| `Offline` \| `Standby`), `created_at`, `updated_at`
- **`zones`**: `id`, `camera_id` (FK), `name`, `polygon` (JSON array of `[x, y]` normalized coordinates), `enabled` (0/1), `created_at`, `updated_at`
- **`events`**: `id`, `camera_id` (FK), `event_type`, `severity` (`High` \| `Medium` \| `Low` \| `Info`), `object_id`, `timestamp`, `metadata` (JSON)
- **`alerts`**: `id`, `event_id` (FK), `camera_id` (FK), `severity`, `title`, `reason`, `acknowledged` (0/1), `timestamp`

---

## 5. Starting the Backend

### Development Mode (with hot reload via `tsx`):
```bash
npm run server
```
Or directly:
```bash
npx tsx server/index.ts
```

Server banner output:
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👁️  SEEMADRISHTI AI - TACTICAL BACKEND GATEWAY (PHASE 1)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Service:          seemadrishti-backend                                    │
│ ● REST Base URL:    http://127.0.0.1:8000/api                                │
│ ● Health Check:     http://127.0.0.1:8000/api/health                         │
│ ● WebSocket Gate:   ws://127.0.0.1:8000/ws                                   │
│ ● Database:         SQLite (./data/seemadrishti.sqlite)                      │
│ ● Bound Interface:  0.0.0.0:8000                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. REST API Endpoints

### System & Health
- **`GET /api/health`**  
  Response:
  ```json
  {
    "status": "ok",
    "service": "seemadrishti-backend"
  }
  ```
- **`GET /api/telemetry`**  
  Returns host CPU, RAM, uptime, and SQLite database row counts.

### Camera Management (`/api/cameras`)
- **`GET /api/cameras`** — List all registered cameras (supports `?status=Online`).
- **`GET /api/cameras/:id`** — Get camera by ID.
- **`POST /api/cameras`** — Register new camera:
  ```json
  {
    "id": "cam-04",
    "name": "Sector D - City Tram Promenade",
    "location": "Transit Arterial East",
    "source_type": "mp4",
    "source_url": "https://example.com/stream.mp4",
    "status": "Online"
  }
  ```
- **`PUT /api/cameras/:id`** — Update camera name, status, or streaming URL.
- **`DELETE /api/cameras/:id`** — Delete camera (cascades to zones and events).

### Geofence Zone Management (`/api/zones`)
- **`GET /api/zones`** — List zones (supports `?camera_id=cam-01`).
- **`GET /api/zones/:id`** — Get zone details and polygon coordinates.
- **`POST /api/zones`** — Create geofence boundary:
  ```json
  {
    "camera_id": "cam-01",
    "name": "Zero-Line Buffer Zone",
    "polygon": [[0.1, 0.8], [0.9, 0.8], [0.9, 0.95], [0.1, 0.95]],
    "enabled": true
  }
  ```
- **`PUT /api/zones/:id`** — Update zone polygon or enable/disable.
- **`DELETE /api/zones/:id`** — Delete zone.

### Detection Events (`/api/events`)
- **`GET /api/events`** — Query events with filters (`camera_id`, `severity`, `event_type`, `from`, `to`, `limit`).
- **`GET /api/events/:id`** — Get event by ID.
- **`POST /api/events`** — Ingest detection event (used by test suite & future CV pipeline):
  ```json
  {
    "camera_id": "cam-01",
    "event_type": "PERIMETER_PROXIMITY",
    "severity": "High",
    "object_id": "target-102",
    "metadata": { "confidence": 0.94 }
  }
  ```

### Tactical Alerts (`/api/alerts`)
- **`GET /api/alerts`** — Query alerts with filters (`severity`, `camera_id`, `acknowledged=0|1`, `from`, `to`).
- **`GET /api/alerts/:id`** — Get alert details.
- **`POST /api/alerts`** — Create new alert.
- **`POST /api/alerts/:id/acknowledge`** — Acknowledge alert:
  ```json
  {
    "operator_id": "OP-402",
    "action": "DISPATCH_QRT_TEAM_ALPHA"
  }
  ```

---

## 7. WebSocket Gateway (`/ws`)

- **Primary Path**: `ws://127.0.0.1:8000/ws`
- **Compatibility Alias**: `ws://127.0.0.1:8000/ws/alerts`

### Handshake & Acknowledgement
Upon connection, the server transmits:
```json
{
  "type": "connection_ack",
  "data": {
    "message": "SEEMADRISHTI AI WebSocket Gateway Connected",
    "service": "seemadrishti-backend"
  },
  "timestamp": 1787775956000
}
```

### Supported Event Types
- `camera_status` (emitted on camera create/update/delete)
- `detection` (future CV service detections)
- `tracking` (future multi-object tracker)
- `event_created` (emitted when `/api/events` creates an event)
- `alert_created` (emitted when `/api/alerts` creates an alert)
- `alert_updated` (emitted when `/api/alerts/:id/acknowledge` is triggered)
- `ping` / `pong` (heartbeat round-trip)

### Manual Event Dispatch (Dev Utility)
Send a POST request to dispatch test events over the WebSocket:
```bash
curl -X POST http://127.0.0.1:8000/api/dev/broadcast \
  -H "Content-Type: application/json" \
  -d '{"type": "broadcast_test", "data": {"message": "Test breach message"}}'
```

---

## 8. Running the Automated Test Suite

Execute the comprehensive Phase 1 verification suite (13 automated test suites):
```bash
npm run test:phase1
```

Verification covers:
1. Server startup and port binding
2. `/api/health` response
3. Camera creation (`POST /api/cameras`)
4. Camera listing and single fetch (`GET /api/cameras`)
5. Camera updating (`PUT /api/cameras/:id`)
6. Camera deletion and 404 validation (`DELETE /api/cameras/:id`)
7. Zone creation with polygon array (`POST /api/zones`)
8. Zone reading with camera filtering (`GET /api/zones`)
9. Event ingestion and filtered retrieval (`POST` & `GET /api/events`)
10. Alert creation and unacknowledged state check (`POST` & `GET /api/alerts`)
11. Alert acknowledgment (`POST /api/alerts/:id/acknowledge`)
12. SQLite file persistence on disk and direct SQL validation
13. WebSocket connection, acknowledgement, ping/pong, and broadcast verification

---

## 9. Known Limitations (Phase 1 Scope Boundaries)

- **AI/CV Models**: Real-time YOLO detection, ByteTrack tracking, and optical flow are scheduled for Phase 2–3.
- **RTSP Pipeline**: Cameras support `source_type: "rtsp"`, but actual hardware FFmpeg/GStreamer RTSP decoding begins in Phase 2.
- **Frontend Integration**: The React dashboard continues using its verified simulation data in Phase 1 to prevent visual regressions; `src/services/api.ts` is provided for Phase 2 consumption.
