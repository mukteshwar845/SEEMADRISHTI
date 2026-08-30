# SEEMADRISHTI AI — PHASE 20 VERIFICATION & STATUS REPORT
## AI Surveillance Search Across Cameras + Automatic Incident Intelligence Summary

---

**Project**: SEEMADRISHTI AI  
**Team**: IQ100  
**Problem Statement**: SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Status**: **100% OPERATIONAL & VERIFIED**  
**Date**: August 30, 2026  

---

## Executive Summary

Phase 20 introduces two major intelligence-grade operational features to the SEEMADRISHTI AI border surveillance platform:
1. **AI Surveillance Search Across Cameras**: A natural-language query interface powered by a deterministic query understanding parser and search engine. Operators can search across all cameras for incidents, events, targets, chronological journeys, camera breach breakdowns, directions, and behaviors. The system strictly queries authentic SQLite records and telemetry, never fabricating events or hallucinating results.
2. **Automatic Incident Intelligence Summary**: An explainable summary generator integrated into the Incident Dossier that computes deterministic neutral classifications, a dynamic observed behaviors checklist reflecting verified events only, authoritative risk factor breakdowns, camera transit paths, and forensic SHA-256 evidence verification.

---

## 1. Feature Architecture & Implementations

```
┌────────────────────────────────────────────────────────────────────────┐
│                   OPERATOR NATURAL LANGUAGE QUERY                      │
│      "Show critical incidents in CAM-01" | "Show person #27 journey"   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             DETERMINISTIC QUERY PARSER (QueryParser)                   │
│   cv_service/search/query_parser.py & server/routes/search.ts          │
│   - Entity: incident | event | target | journey | camera               │
│   - Filters: camera_ids, track_id, risk_level, time_range, status      │
│   - Intent: behavior_pattern, direction, event_type                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│           AUTHENTIC DATABASE & TELEMETRY SEARCH ENGINE                 │
│   cv_service/search/intelligence_search.py & server/routes/search.ts   │
│   - Queries SQLite: incidents, events, alerts, behavior_chains         │
│   - Target Journey Reconstructor: Chronological multi-cam timeline     │
│   - Camera Breach Breakdown: Real CCTV node counts (includes 0s)       │
│   - Reports INSUFFICIENT DATA when cross-camera records are missing    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│     COMMAND CENTRE SEARCH UI         │ │  INCIDENT INTELLIGENCE DOSSIER│
│  src/components/IntelligenceSearch   │ │  IncidentIntelligenceSummary  │
│  - Filter badge chips                │ │  - Neutral Classification     │
│  - Journey milestone timeline        │ │  - Verified Behaviors Check   │
│  - Node breach matrix                │ │  - Risk Points Breakdown      │
│  - [OPEN INCIDENT] / [VIEW CAMERA]   │ │  - Forensic SHA-256 Hash      │
└──────────────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Supported Natural Language Search Intents

| Intent | Example Operator Query | Extracted Structured Filters | Executed Data Layer |
|---|---|---|---|
| **Incident Search** | *"Show critical incidents in the last 10 minutes"* | `{ entity: 'incident', risk_level: 'CRITICAL', time_range: { value: 10, unit: 'minutes' } }` | `SELECT * FROM incidents WHERE risk_level='CRITICAL' AND started_at >= cutoff` |
| **Target Journey** | *"Show person #27 journey"* | `{ entity: 'journey', track_id: 27, class_name: 'person' }` | Aggregates all events & handovers across `cam-01..cam-09` chronologically |
| **Camera Breakdown** | *"Which cameras had restricted breaches?"* | `{ entity: 'camera', event_type: 'RESTRICTED_ZONE_ENTRY' }` | Counts restricted breaches per camera; preserves 0 count for quiet nodes |
| **Event Search** | *"Show all tripwire crossings"* | `{ entity: 'event', event_type: 'TRIPWIRE_CROSSING' }` | `SELECT * FROM events WHERE event_type LIKE '%TRIPWIRE%'` |
| **Status Filter** | *"Show unresolved incidents"* | `{ entity: 'incident', status: 'unresolved' }` | `SELECT * FROM incidents WHERE acknowledged = 0` |
| **Target Filter** | *"Show all vehicles"* | `{ entity: 'all', class_name: 'vehicle' }` | Filters incidents/events where `class_name IN ('vehicle', 'car', 'truck')` |
| **Behavior Query**| *"Show possible reconnaissance"* | `{ behavior_pattern: 'POSSIBLE_RECONNAISSANCE' }` | Matches behavior chains with reconnaissance pattern |

---

## 3. Automatic Incident Intelligence Summary Specification

When an incident is inspected, the system generates an authoritative dossier:
- **Classification**: Neutral, deterministic security terminology based on observed facts:
  - Restricted Zone Entry $\rightarrow$ `"Restricted Area Intrusion"`
  - Tripwire Crossing $\rightarrow$ `"Perimeter Crossing"`
  - Loitering $\rightarrow$ `"Suspicious Prolonged Presence"`
  - Re-entry $\rightarrow$ `"Repeated Perimeter Interaction"`
  - Zone + Tripwire + Loitering $\rightarrow$ `"Suspicious Perimeter Intrusion"`
  - Multi-Event Chain $\rightarrow$ `"Multi-Event Security Breach"`
  - Reconnaissance Pattern $\rightarrow$ `"Possible Reconnaissance Pattern"`
  - *(Strictly avoids biased or unsupported terms like "confirmed infiltrator" or "criminal")*
- **Observed Behaviors Checklist**:
  - `✓ Entered restricted zone` (only if zone entry occurred)
  - `✓ Crossed perimeter tripwire` (only if tripwire crossing occurred)
  - `✓ Loitered {dwell}s` (only if loitering occurred)
  - `✓ Re-entered monitored area` (only if reentry occurred)
  - `✓ Continued toward adjacent sector` (only if handover occurred)
- **Authoritative Threat Factors**:
  - Exact breakdown from `RiskEngine` summing to total risk score (e.g. `+40 Restricted Intrusion`, `+25 Loitering`, `+10 Re-entry`, `+8 Movement Anomaly`, `+8 Multi-Event Escalation` = `91/100`).
- **Forensic Evidence**:
  - Status (`ready`), video path, and cryptographic SHA-256 checksum with `[VERIFIED]` badge.

---

## 4. Verification Suite Results

### Automated Test Suites

1. **Phase 20 Verification Suite (`cv_service/tests/phase20_test.py`)**:
   - Total Tests: **28**
   - Result: **28 / 28 PASSED** (in 2.037s)
   - Covered Tests:
     - `test_search_schema` (PASS)
     - `test_parse_critical_incident_query` (PASS)
     - `test_parse_time_range` (PASS)
     - `test_parse_tripwire_query` (PASS)
     - `test_parse_restricted_zone_query` (PASS)
     - `test_parse_track_query` (PASS)
     - `test_parse_camera_query` (PASS)
     - `test_parse_unresolved_incident_query` (PASS)
     - `test_real_database_search` (PASS)
     - `test_search_returns_real_incident_ids` (PASS)
     - `test_search_does_not_fabricate_results` (PASS)
     - `test_track_journey_ordering` (PASS)
     - `test_cross_camera_journey_uses_real_handover` (PASS)
     - `test_insufficient_journey_data` (PASS)
     - `test_incident_summary_schema` (PASS)
     - `test_summary_uses_real_events` (PASS)
     - `test_summary_does_not_show_missing_events` (PASS)
     - `test_risk_summary_matches_existing_risk_engine` (PASS)
     - `test_behavior_pattern_matches_behavior_chain` (PASS)
     - `test_camera_path_matches_real_data` (PASS)
     - `test_no_random_search_results` (PASS)
     - `test_no_hardcoded_search_counts` (PASS)
     - `test_no_fake_incident_summary` (PASS)
     - `test_search_incident_linkage` (PASS)
     - `test_search_behavior_chain_linkage` (PASS)
     - `test_phase19_compatibility` (PASS)
     - `test_phase18_compatibility` (PASS)
     - `test_real_cam01_search_and_summary` (PASS)

2. **Phase 19 Regression Suite (`cv_service/tests/phase19_test.py`)**:
   - Total Tests: **67**
   - Result: **67 / 67 PASSED** (in 0.006s)

3. **Phase 18 Regression Suite (`cv_service/tests/phase18_test.py`)**:
   - Total Tests: **34**
   - Result: **34 / 34 PASSED** (in 61.58s)

4. **Phase 17 Regression Suite (`cv_service/tests/phase17_test.py`)**:
   - Total Tests: **38**
   - Result: **38 / 38 PASSED** (in 153.62s)

5. **Phases 10–16 Regression Suite (`phase10_test` through `phase16_test`)**:
   - Total Tests: **141**
   - Result: **141 / 141 PASSED** (in 119.51s, 5 skipped)

6. **Full Pipeline Run on VisDrone `CAM-01.mp4`**:
   - Processed video frames through YOLOv8 + ByteTrack + Intrusion + Loitering + Behavior Chain + Risk Engine.
   - Result: **Exited with code 0**, generated real tripwire alert on track #8, restricted zone intrusion on track #6, incident `INC-000001` with evidence clip and benchmark report.

7. **Static Type & Build Verification**:
   - `cmd /c npx tsc --noEmit`: **0 errors** (Code 0).
   - `cmd /c npm run build`: **Built cleanly** (Code 0, Vite + esbuild bundle created).

---

## 5. Summary of Modified & Created Files

- `cv_service/search/query_parser.py`: Query parser converting natural language into structured filters.
- `cv_service/search/intelligence_search.py`: Structured search engine with journey assembly and CCTV node breach audit.
- `cv_service/search/__init__.py`: Search module exports.
- `cv_service/intelligence/incident_summary.py`: Automatic incident intelligence summary generator.
- `cv_service/intelligence/__init__.py`: Intelligence module exports.
- `cv_service/tests/phase20_test.py`: 28 unit tests covering Phase 20 capabilities.
- `cv_service/main.py`: Updated video source FPS fallback handling.
- `cv_service/correlation/correlation_engine.py`: Optimized backend timeout to prevent offline pipeline stalling.
- `server/routes/search.ts`: Search router (`/api/intelligence/search`, `/history`).
- `server/routes/incidents.ts`: Added `GET /api/incidents/:id/summary` endpoint.
- `server/app.ts`: Mounted search routes.
- `src/services/api.ts`: Added frontend client methods & interfaces for Phase 20.
- `src/components/IntelligenceSearch.tsx`: Command Centre HUD search component with prompt chips, filter badges, and action buttons.
- `src/components/IncidentIntelligenceSummary.tsx`: Incident dossier intelligence summary card.
- `src/components/IncidentInspectorView.tsx`: Integrated intelligence summary into the incident dossier.
- `src/components/TacticalMatrixView.tsx`: Added camera node highlight ring for search-matched cameras.
- `src/App.tsx`: Mounted search at top of Command Centre and connected camera highlighting.
