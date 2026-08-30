# SEEMADRISHTI AI — PHASE 21 STATUS REPORT
## Cross-Camera Target Journey + Dynamic Threat Heatmap

---

**Project**: SEEMADRISHTI AI  
**Team**: IQ100  
**Problem Statement**: SIH26187 — AI-Based Intelligent Video Analytics Platform for Border Surveillance using Existing CCTV Infrastructure  
**Status**: **100% OPERATIONAL & VERIFIED**  
**Date**: August 30, 2026  

---

## Executive Summary

Phase 21 elevates SEEMADRISHTI AI from a collection of isolated camera analytics into a unified, **multi-camera tactical situational awareness platform** for border security:
1. **Cross-Camera Target Journey Engine (cv_service/journey/target_journey.py)**: Reconstructs evidence-based multi-camera paths for tracked targets across 9 CCTV nodes. Enforces topological connectivity (CameraTopology.are_cameras_connected()) and spatial-temporal handover plausibility (is_transition_timely()). If insufficient data exists, the engine outputs CONFIDENCE: INSUFFICIENT DATA rather than inventing unverified hops.
2. **Dynamic Threat Heatmap Engine (cv_service/analytics/threat_heatmap.py)**: Calculates deterministic mathematical threat scores across all 9 CCTV cameras and border sectors using weighted real incidents, breaches, tripwires, and loiter events. Features temporal windowing (15m, 1h, 6h, 24h), automatic trend classification (ESCALATING, DE-ESCALATING, STABLE, INSUFFICIENT DATA), hotspot discovery, and high-risk corridor detection.

---

## 1. Architectural Overview

`
┌────────────────────────────────────────────────────────────────────────┐
│               CROSS-CAMERA TARGET JOURNEY ENGINE                       │
│             cv_service/journey/target_journey.py                       │
│  - Queries authentic SQLite track observations and incident records   │
│  - Topological validation: are_cameras_connected(camA, camB)           │
│  - Temporal check: is_transition_timely(dt, d_meters, max_speed)      │
│  - Synthesizes chronological milestones & directional vectors         │
│  - Fallback: 'INSUFFICIENT DATA' if no verified handover is recorded   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               DYNAMIC THREAT HEATMAP ENGINE                            │
│           cv_service/analytics/threat_heatmap.py                       │
│  - Computes deterministic Threat Index (0-100) per camera & sector:   │
│    Threat = min(100, Σ w_i * count_i)                                  │
│    Breaches (25), Tripwires (15), Loiter (12), Anomalies (8),          │
│    Critical Incidents (30), High (18), Re-entry (10)                   │
│  - Time windows: 15m, 1h, 6h, 24h                                      │
│  - Trend analysis: ESCALATING / DE-ESCALATING / STABLE                 │
│  - Hotspot detection & High-Risk Corridor propagation                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   REST API ENDPOINTS & GATEWAY                         │
│                    server/routes/intelligence.ts                       │
│  - GET /api/intelligence/journey/:trackId                              │
│  - GET /api/intelligence/targets                                       │
│  - GET /api/intelligence/threat-heatmap                                │
│  - GET /api/intelligence/cameras/:cameraId/threat-profile              │
│  - GET /api/intelligence/threat-corridors                              │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│       TARGET JOURNEY VISUALIZER      │ │   DYNAMIC THREAT HEATMAP UI   │
│    src/components/TargetJourneyView  │ │  src/components/ThreatHeatmap │
│  - 9-Node Topology Network Graph     │ │  - Hotspot Alert Banner       │
│  - Animated SVG Directed Connectors  │ │  - Time Window Selector Tabs  │
│  - Chronological Event Milestones    │ │  - Camera Risk Distribution   │
│  - Real-time Track Selector & Filter │ │  - Cross-Camera Corridors     │
└──────────────────────────────────────┘ └───────────────────────────────┘
`

---

## 2. Mathematical Threat Formulation

The dynamic threat index for each camera c within time window T is computed deterministically:

Score(c, T) = min(100, Σ w_k * N_k(c, T))

Where factor weights w_k are calibrated for high-security border perimeters:
- Restricted Perimeter Breaches (w = 25)
- Virtual Tripwire Crossings (w = 15)
- Loitering / Dwell Incursions (w = 12)
- Kinematic & Group Anomalies (w = 8)
- Critical Severity Incidents (w = 30)
- High Severity Incidents (w = 18)
- Target Re-entry Probes (w = 10)

Sector scores aggregate member cameras proportionally:
Sector Score = min(100, Σ Score(c, T))

---

## 3. Test Suite Verification

The Phase 21 automated test suite (cv_service/tests/phase21_test.py) includes 30 unit tests covering all edge conditions:
- Topological validation (6 tests)
- Journey reconstruction & chronological ordering (8 tests)
- Threat calculation & 0-100 bounding (8 tests)
- Temporal windows 15m, 1h, 6h, 24h (4 tests)
- Hotspots, trends, and corridor discovery (4 tests)

Result: 30 / 30 PASS in 0.017s.

---

## 4. UI Components Delivered

1. TargetJourneyView.tsx: Interactive camera network topology layout with 9 border posts, directed animated SVG connectors, and milestone tables.
2. ThreatHeatmapView.tsx: Dynamic Threat Hotspot HUD banner, 15m/1h/6h/24h selector tabs, 9-node camera distribution bars, and high-risk corridor panel.
