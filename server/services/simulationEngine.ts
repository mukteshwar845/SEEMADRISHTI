/**
 * SEEMADRISHTI — Autonomous Threat Simulation Engine
 * Broadcasts a timed 8-step border-intrusion scenario via WebSocket
 * so the frontend demo shows the full AI pipeline end-to-end.
 */

import { broadcastWebSocketMessage } from './websocket';
import { agentOrchestrator } from './agentOrchestrator';

export interface SimulationStatus {
  running: boolean;
  scenarioName: string;
  currentStep: number;
  totalSteps: number;
  startedAt: string | null;
  loopCount: number;
}

const SCENARIO_STEPS: Array<{
  delayMs: number;
  label: string;
  agent: string;
  fn: () => void;
}> = [
  {
    delayMs: 0,
    label: 'SENTINEL: Humanoid bio-signature detected on CAM-03',
    agent: 'SENTINEL-AI',
    fn: () => {
      // Raw detection event on CAM-03
      broadcastWebSocketMessage('detection' as any, {
        camera_id: 'cam-3',
        timestamp: new Date().toISOString(),
        frame_width: 1000,
        frame_height: 600,
        inference_ms: 18,
        detection_count: 1,
        detections: [
          {
            class_id: 0,
            class_name: 'person',
            category: 'HUMAN',
            confidence: 0.973,
            bbox: { x1: 420, y1: 180, x2: 490, y2: 360 },
          },
        ],
      });
      // Bump agent load
      agentOrchestrator.deliberateScenario('perimeter_scaling');
    },
  },
  {
    delayMs: 2000,
    label: 'SENTINEL: Confirmed intruder — initiating cross-camera tracking',
    agent: 'SENTINEL-AI',
    fn: () => {
      broadcastWebSocketMessage('tracking' as any, {
        camera_id: 'cam-3',
        timestamp: new Date().toISOString(),
        frame_width: 1000,
        frame_height: 600,
        inference_ms: 21,
        track_count: 1,
        tracks: [
          {
            track_id: 9921,
            class_id: 0,
            class_name: 'person',
            category: 'HUMAN',
            confidence: 0.97,
            state: 'TRACKED',
            bbox: { x1: 430, y1: 175, x2: 498, y2: 358 },
          },
        ],
      });
    },
  },
  {
    delayMs: 4000,
    label: 'SENTINEL: TRIPWIRE NW-04 breached — HIGH ALERT triggered',
    agent: 'SENTINEL-AI',
    fn: () => {
      broadcastWebSocketMessage('alert_created' as any, {
        id: `sim-alert-${Date.now()}`,
        camera_id: 'cam-3',
        track_id: 9921,
        class_name: 'person',
        event_type: 'TRIPWIRE_CROSSING',
        title: 'TRIPWIRE BREACH // NW-04 PERIMETER',
        severity: 'critical',
        risk_score: 94,
        risk_level: 'CRITICAL',
        confidence: 0.973,
        reason: 'Track #9921 crossed virtual tripwire NW-04 at 1.8 m/s. Thermal core: 36.8°C. Classified HUMAN with 97.3% confidence.',
        timestamp: new Date().toISOString(),
        zone_name: 'Perimeter Buffer Zone NW',
        metadata: {
          track_id: 9921,
          class_name: 'person',
          risk_score: 94,
          risk_level: 'CRITICAL',
          reasons: [
            { code: 'TRIPWIRE_CROSS', points: 40, description: 'Crossed virtual tripwire NW-04' },
            { code: 'THERMAL_HUMAN', points: 30, description: 'Thermal gradient 36.8°C — confirmed human' },
            { code: 'VELOCITY_BREACH', points: 24, description: 'Approach velocity 1.8 m/s — running' },
          ],
        },
      });
    },
  },
  {
    delayMs: 6000,
    label: 'PATHFINDER: Homography handover — target projected onto CAM-06',
    agent: 'PATHFINDER-AI',
    fn: () => {
      broadcastWebSocketMessage('tracking' as any, {
        camera_id: 'cam-6',
        timestamp: new Date().toISOString(),
        frame_width: 1000,
        frame_height: 600,
        inference_ms: 19,
        track_count: 1,
        tracks: [
          {
            track_id: 9921,
            class_id: 0,
            class_name: 'person',
            category: 'HUMAN',
            confidence: 0.961,
            state: 'TRACKED',
            bbox: { x1: 78, y1: 210, x2: 142, y2: 388 },
          },
        ],
      });
      // Alert about cross-camera handover
      broadcastWebSocketMessage('alert_created' as any, {
        id: `sim-handover-${Date.now()}`,
        camera_id: 'cam-6',
        event_type: 'CROSS_CAMERA_HANDOVER',
        title: 'PATHFINDER: Cross-Camera Handover CAM-03 → CAM-06',
        severity: 'high',
        risk_score: 88,
        risk_level: 'HIGH',
        confidence: 0.961,
        reason: 'Track #9921 predicted via ground-plane homography (H·[u,v,1]ᵀ). Arrival at CAM-06 within ±1.2s of projection. UTM coordinates: X:142.4, Y:88.1.',
        timestamp: new Date().toISOString(),
        zone_name: 'Mountain Pass Sector F',
      });
    },
  },
  {
    delayMs: 8000,
    label: 'PATHFINDER: Multi-camera correlation — target corridor locked',
    agent: 'PATHFINDER-AI',
    fn: () => {
      broadcastWebSocketMessage('correlation_created' as any, {
        id: `corr-sim-${Date.now()}`,
        status: 'ACTIVE',
        correlation_score: 96,
        correlation_level: 'CRITICAL',
        started_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        camera_sequence: ['cam-3', 'cam-6', 'cam-9'],
        linked_incidents: [`sim-alert-${Date.now() - 4000}`],
        observations: [
          { camera_id: 'cam-3', track_id: '9921', class_name: 'person', event_type: 'TRIPWIRE_CROSSING', risk_score: 94, risk_level: 'CRITICAL', timestamp: new Date(Date.now() - 8000).toISOString() },
          { camera_id: 'cam-6', track_id: '9921', class_name: 'person', event_type: 'CROSS_CAMERA_HANDOVER', risk_score: 88, risk_level: 'HIGH', timestamp: new Date(Date.now() - 2000).toISOString() },
        ],
        reasons: [
          { code: 'CROSS_CAM_VELOCITY', points: 50, message: 'Consistent 1.8 m/s motion vector across 3 cameras' },
          { code: 'APPEARANCE_MATCH', points: 30, message: 'OSNet 512-dim feature cosine similarity: 0.94' },
          { code: 'SPATIAL_HANDOVER', points: 16, message: 'Ground-plane trajectory matches predicted handover within ±1.2s' },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
  },
  {
    delayMs: 10000,
    label: 'COMMANDER: Dispatching QRT Delta-02 — ETA 42 seconds',
    agent: 'COMMANDER-AI',
    fn: () => {
      broadcastWebSocketMessage('alert_created' as any, {
        id: `sim-qrt-${Date.now()}`,
        camera_id: 'cam-9',
        event_type: 'QRT_DISPATCH',
        title: 'COMMANDER: QRT Delta-02 Dispatched → Intercept Vector',
        severity: 'high',
        risk_score: 91,
        risk_level: 'HIGH',
        confidence: 0.988,
        reason: 'SOP 14-B authorized. Dijkstra shortest-path intercept calculated. QRT Delta-02 is 340m from intercept point (X:215, Y:114). ETA: 42 seconds. Non-lethal spotlight pre-armed. Hydraulic crash bollards engaged.',
        timestamp: new Date().toISOString(),
        zone_name: 'Coastal Line Sector I',
        metadata: {
          qrt_unit: 'Delta-02',
          eta_seconds: 42,
          intercept_utm: { x: 215.4, y: 114.8 },
        },
      });
      agentOrchestrator.deliberateScenario('perimeter_scaling');
    },
  },
  {
    delayMs: 14000,
    label: 'AWARENESS-05: Environmental scan — fog density 61%, wind NW 14km/h',
    agent: 'AWARENESS-AI',
    fn: () => {
      broadcastWebSocketMessage('environment_update' as any, {
        camera_id: 'cam-3',
        mode: 'NIGHT',
        brightness: 0.18,
        contrast: 0.42,
        visibility_score: 39,
        low_light: true,
        confidence: 0.91,
        adaptive_skip: 2,
        enhancement_enabled: true,
        updated_at: new Date().toISOString(),
      });
      broadcastWebSocketMessage('alert_created' as any, {
        id: `sim-env-${Date.now()}`,
        camera_id: 'cam-3',
        event_type: 'ENVIRONMENT_ALERT',
        title: 'AWARENESS-05: Dense Fog Advisory — FLIR Active',
        severity: 'medium',
        risk_score: 62,
        risk_level: 'MEDIUM',
        confidence: 0.91,
        reason: 'Fog density 61%, visibility 39%. LWIR Thermal FLIR (8–14µm) auto-activated on CAM-03, CAM-06. Wind NW at 14 km/h — target trajectory adjusted.',
        timestamp: new Date().toISOString(),
        zone_name: 'NW Perimeter Environmental Zone',
      });
    },
  },
  {
    delayMs: 18000,
    label: 'LEX FORENSIC: SHA-256 evidence container sealed — admissible',
    agent: 'LEX-AUDIT-AI',
    fn: () => {
      const hash = `7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d90${Math.floor(Math.random() * 90 + 10)}`;
      broadcastWebSocketMessage('alert_created' as any, {
        id: `sim-evidence-${Date.now()}`,
        camera_id: 'cam-3',
        event_type: 'EVIDENCE_SEALED',
        title: `LEX FORENSIC: Evidence Container Sealed // SHA-256 Certified`,
        severity: 'medium',
        risk_score: 100,
        risk_level: 'SEALED',
        confidence: 1.0,
        reason: `60-second pre-roll + 30-second post-roll video container for Track #9921 cryptographically sealed. SHA-256: ${hash}. UTC timestamp: ${new Date().toISOString()}. Admissible in military tribunal under IHL Chain-of-Custody Protocol.`,
        timestamp: new Date().toISOString(),
        zone_name: 'Forensic Vault — Evidence Node 01',
        metadata: {
          sha256: hash,
          track_id: 9921,
          duration_seconds: 90,
          verification_status: 'VERIFIED',
        },
      });
    },
  },
];

class SimulationEngineService {
  private running = false;
  private currentStep = 0;
  private startedAt: string | null = null;
  private loopCount = 0;
  private loopTimer: NodeJS.Timeout | null = null;
  private stepTimers: NodeJS.Timeout[] = [];

  public getStatus(): SimulationStatus {
    return {
      running: this.running,
      scenarioName: 'fence_breach_northwest',
      currentStep: this.currentStep,
      totalSteps: SCENARIO_STEPS.length,
      startedAt: this.startedAt,
      loopCount: this.loopCount,
    };
  }

  public startScenario(): SimulationStatus {
    this.stopScenario(); // clear any running scenario first
    this.running = true;
    this.startedAt = new Date().toISOString();
    this.loopCount++;
    this.executeLoop();
    return this.getStatus();
  }

  private executeLoop() {
    this.currentStep = 0;
    this.stepTimers = [];

    SCENARIO_STEPS.forEach((step, idx) => {
      const timer = setTimeout(() => {
        if (!this.running) return;
        this.currentStep = idx + 1;
        try {
          step.fn();
        } catch (e) {
          console.error(`[SimEngine] Step ${idx} error:`, e);
        }
      }, step.delayMs);
      this.stepTimers.push(timer);
    });

    // Auto-loop after all steps + buffer
    const totalDuration = Math.max(...SCENARIO_STEPS.map((s) => s.delayMs)) + 17000; // 17s buffer
    this.loopTimer = setTimeout(() => {
      if (!this.running) return;
      this.loopCount++;
      this.executeLoop();
    }, totalDuration);
  }

  public stopScenario(): SimulationStatus {
    this.running = false;
    this.stepTimers.forEach((t) => clearTimeout(t));
    this.stepTimers = [];
    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.loopTimer = null;
    this.currentStep = 0;
    return this.getStatus();
  }
}

export const simulationEngine = new SimulationEngineService();
