import { TacticalAgentInfo, MultiAgentPlan, AgentDeliberationMessage } from '../../src/types';

// The 4 Autonomous Tactical Agents + Master Orchestrator
export const TACTICAL_AGENTS: TacticalAgentInfo[] = [
  {
    id: 'sentinel',
    name: 'Sentinel Vision',
    codename: 'SENTINEL-AI // AGENT-01',
    role: 'Perception & Threat Triage',
    specialization: 'Spatial bounding boxes, thermal IR extraction, false-alarm elimination, dwell timing',
    status: 'ANALYZING',
    confidence: 99.2,
    neuralLoad: 44,
    latencyMs: 8,
    color: '#00f0ff',
    avatarIcon: 'Eye',
    lastAction: 'Filtered wildlife false-positive in Sector Bravo buffer zone',
    actionCount: 1428,
  },
  {
    id: 'pathfinder',
    name: 'Pathfinder Re-ID',
    codename: 'PATHFINDER-AI // AGENT-02',
    role: 'Spatial Trajectory & Homography',
    specialization: 'Cross-camera handover, ground-plane homography projection, velocity vectoring, evasive pathing',
    status: 'DELIBERATING',
    confidence: 98.6,
    neuralLoad: 62,
    latencyMs: 12,
    color: '#ec4899',
    avatarIcon: 'Footprints',
    lastAction: 'Projected intercept vector for TRK-992 across CAM-02 -> CAM-03',
    actionCount: 994,
  },
  {
    id: 'commander',
    name: 'Tactical Commander',
    codename: 'COMMANDER-AI // AGENT-03',
    role: 'Engagement Rules & Field Dispatch',
    specialization: 'Defcon posture arbitration, Rapid QRT vector routing, spotlight lock-on, siren arming',
    status: 'DISPATCHING',
    confidence: 97.8,
    neuralLoad: 38,
    latencyMs: 14,
    color: '#10b981',
    avatarIcon: 'ShieldAlert',
    lastAction: 'Dispatched Sector 4 QRT Patrol Unit to NW-04 coordinate perimeter',
    actionCount: 662,
  },
  {
    id: 'forensic',
    name: 'Lex Forensic',
    codename: 'LEX-AUDIT-AI // AGENT-04',
    role: 'Cryptographic Chain-of-Custody',
    specialization: 'SHA-256 evidence hashing, millisecond UTC audit trails, tamper validation, courtroom dossiers',
    status: 'IDLE',
    confidence: 100.0,
    neuralLoad: 24,
    latencyMs: 5,
    color: '#a855f7',
    avatarIcon: 'Film',
    lastAction: 'Generated immutable cryptographic SHA-256 dossier for INC-001',
    actionCount: 435,
  },
];

// Pre-computed Orchestration Scenarios for instant real-time deliberation
export const PRESET_SCENARIOS: Record<string, MultiAgentPlan> = {
  perimeter_scaling: {
    incidentId: 'INC-AG-001',
    scenarioTitle: 'Sector Northwest Fence Scaling Infiltration',
    consensusScore: 98.6,
    threatLevel: 'CRITICAL',
    targetTrackId: 'TRK-992',
    sector: 'Sector Bravo (Northwest Perimeter)',
    summary:
      'Multi-Agent Consensus reached with 98.6% agreement. Target TRK-992 confirmed human intruder climbing restricted fence at CAM-02. Cross-camera homography handover to CAM-03 calculated. QRT Unit #4 dispatched to intercept coordinates.',
    deliberationLog: [
      {
        id: 'msg-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        timestamp: '14:22:01.102',
        thoughtTrace:
          'Thermal signature confirms bipedal humanoid with height 1.78m. Aspect ratio and velocity exclude local wildlife (boar/nilgai). Target has gripped upper chainlink wire at elevation +2.1m.',
        evidencePoints: [
          'Bounding Box confidence: 99.4%',
          'Thermal IR heat gradient: 36.8°C core body heat',
          'Tripwire plane breach confirmed on CAM-02',
        ],
        recommendedAction: 'Trigger Tier-1 Immediate Intrusion Alarm and hand over to Pathfinder for vectoring.',
        confidence: 99.2,
      },
      {
        id: 'msg-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Trajectory & Homography',
        color: '#ec4899',
        timestamp: '14:22:01.320',
        thoughtTrace:
          'Analyzing trajectory state vector. Target executed rapid 4.2 m/s sprint from low-scrub vegetation to fence line. Homography ground projection predicts landing point in Sector Bravo inner compound at (X: 142.4, Y: 88.1). Cross-cam overlap with CAM-03 is 92.4%.',
        evidencePoints: [
          'Calculated approach angle: 34° relative to fence line',
          'Projected arrival time in inner zone: 8.5 seconds',
          'CAM-03 blindspot duration: 1.4 seconds before re-acquisition',
        ],
        recommendedAction: 'Pre-steer CAM-03 PTZ to Preset-04; alert QRT Patrol on Vector West.',
        confidence: 98.6,
      },
      {
        id: 'msg-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement',
        color: '#10b981',
        timestamp: '14:22:01.512',
        thoughtTrace:
          'Assessing Rules of Engagement under Sector Bravo SOP v4. Hostile intrusion in active military buffer zone permits non-lethal deterrent escalation. QRT Patrol Delta-02 is currently 240m south on routine sweep.',
        evidencePoints: [
          'SOP 14-B Compliance Verified',
          'QRT Delta-02 ETA: 42 seconds to intercept point',
          'High-intensity spotlight array #02 available for target illumination',
        ],
        recommendedAction: 'Deploy QRT Delta-02; lock spotlight on target; prepare audible perimeter warning siren.',
        confidence: 97.8,
      },
      {
        id: 'msg-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain of Custody',
        color: '#a855f7',
        timestamp: '14:22:01.710',
        thoughtTrace:
          'Sealing 30-second pre-roll video and 30-second post-roll video into tamper-evident legal forensic container. Stamping millisecond hardware clock and generating cryptographic SHA-256 validation proof.',
        evidencePoints: [
          'Pre-Roll Frames: 1,800 frames at 60 FPS verified',
          'SHA-256 Digest: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
          'Zero-tamper digital watermark embedded',
        ],
        recommendedAction: 'Deposit evidence package into Immutable Evidence Vault and sign audit trail.',
        confidence: 100.0,
      },
    ],
    countermeasures: [
      {
        id: 'cm-01',
        label: 'Dispatch QRT Patrol Unit Delta-02',
        status: 'READY',
        assignedTo: 'Commander AI',
        priority: 'CRITICAL',
        actionPayload: 'Intercept Coordinates: X: 142.4, Y: 88.1 // ETA: 42s',
      },
      {
        id: 'cm-02',
        label: 'Lock High-Intensity Spotlight on Sector NW-04',
        status: 'READY',
        assignedTo: 'Sentinel AI',
        priority: 'HIGH',
        actionPayload: 'PTZ Preset 04 // 5000-Lumen Xenon Array Engaged',
      },
      {
        id: 'cm-03',
        label: 'Seal Forensic SHA-256 Evidence Vault Package',
        status: 'READY',
        assignedTo: 'Lex Forensic AI',
        priority: 'HIGH',
        actionPayload: 'SHA-256: 7f83b165...26d9069 // Legal Stamp Stored',
      },
      {
        id: 'cm-04',
        label: 'Pre-arm Perimeter Sound Cannons & Sirens',
        status: 'STANDBY',
        assignedTo: 'Commander AI',
        priority: 'URGENT',
        actionPayload: '120dB Audible Warning Ready on Commander Confirmation',
      },
    ],
  },

  thermal_night: {
    incidentId: 'INC-AG-002',
    scenarioTitle: 'Concealed Riverine Infiltration in Dense Fog',
    consensusScore: 95.2,
    threatLevel: 'ELEVATED',
    targetTrackId: 'TRK-1044',
    sector: 'Sector Delta (Riverine Marshlands)',
    summary:
      'Multi-Agent Consensus reached with 95.2% agreement. Thermal FLIR sensor fusion identified 2 low-crawling human targets moving along mudbanks in 82% dense fog. Marine Patrol QRT notified; infrared illuminators armed.',
    deliberationLog: [
      {
        id: 'msg-th-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        timestamp: '03:11:45.020',
        thoughtTrace:
          'Optical camera blocked by thick river mist. Thermal FLIR dual-spectrum sensor detects two distinct 37.1°C thermal blooms crawling in prone posture through marsh reeds. Dwell time > 90 seconds.',
        evidencePoints: [
          'FLIR thermal contrast boosted 4.2x',
          'Dwell time in buffer mudbank: 104 seconds',
          'Target posture: Prone stealth crawl',
        ],
        recommendedAction: 'Classify as deliberate covert infiltration; track movement path.',
        confidence: 96.4,
      },
      {
        id: 'msg-th-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Trajectory & Homography',
        color: '#ec4899',
        timestamp: '03:11:45.240',
        thoughtTrace:
          'Target movement rate is 0.4 m/s (creeping velocity). Sonar hydrophone sensor corroborates synchronized water ripple harmonics. Projected shoreline breach point is 45m upstream near boat jetty.',
        evidencePoints: [
          'Sonar contact corroboration: 88.2% acoustic correlation',
          'Projected shoreline intercept: Boat Jetty North-2',
        ],
        recommendedAction: 'Position Marine Intercept Boat-03 at river bend.',
        confidence: 94.8,
      },
      {
        id: 'msg-th-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement',
        color: '#10b981',
        timestamp: '03:11:45.410',
        thoughtTrace:
          'Sector Delta Waterways protocol mandates silent interception to prevent target discarding of contraband. Ordering Marine Unit to intercept without sirens.',
        evidencePoints: [
          'Silent Intercept Protocol Approved',
          'Thermal Night-Vision Goggles active on Patrol Boat-03',
        ],
        recommendedAction: 'Execute silent tactical intercept; activate thermal shoreline trackers.',
        confidence: 95.0,
      },
      {
        id: 'msg-th-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain of Custody',
        color: '#a855f7',
        timestamp: '03:11:45.620',
        thoughtTrace:
          'Packaging combined FLIR thermal telemetry, sonar acoustic logs, and optical baseline video into unified multi-spectral forensic dossier.',
        evidencePoints: [
          'Multi-spectral container verified',
          'SHA-256: 4e99f1a28cb619280ef11b089ac1204859a2bc1d88190248cbf128a1928031fe',
        ],
        recommendedAction: 'Commit multi-modal legal package to audit database.',
        confidence: 100.0,
      },
    ],
    countermeasures: [
      {
        id: 'cm-th-01',
        label: 'Dispatch Marine Patrol Boat-03 (Silent Mode)',
        status: 'READY',
        assignedTo: 'Commander AI',
        priority: 'CRITICAL',
        actionPayload: 'Vector: River Bend Shoreline // Silent Electric Motor Active',
      },
      {
        id: 'cm-th-02',
        label: 'Activate Shoreline Infrared Thermal Illuminators',
        status: 'READY',
        assignedTo: 'Sentinel AI',
        priority: 'HIGH',
        actionPayload: 'IR Array 850nm (Invisible to naked human eye)',
      },
    ],
  },

  vehicle_checkpoint: {
    incidentId: 'INC-AG-003',
    scenarioTitle: 'High-Speed Vehicle Checkpoint Buffer Probe',
    consensusScore: 97.4,
    threatLevel: 'DEFCON-1',
    targetTrackId: 'VEH-4820',
    sector: 'Sector Charlie (Highway Checkpoint)',
    summary:
      'Multi-Agent Consensus reached with 97.4% agreement. Armored SUV ignored checkpoint deceleration barriers at 82 km/h. Automated spike strips armed, hydraulic tire bollards deployed, and ANPR flagged stolen plates.',
    deliberationLog: [
      {
        id: 'msg-vc-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        timestamp: '19:48:12.450',
        thoughtTrace:
          'High-speed optical flow vector detected on CAM-07. Dark utility SUV approaching checkpoint lane #2 at 82 km/h in 20 km/h restricted zone. Brake lights unilluminated.',
        evidencePoints: [
          'Approach velocity: 82.4 km/h (Violation +62 km/h)',
          'ANPR Match: DL-04-TX-9982 (Stolen vehicle blacklist tag)',
          'Target mass: ~2,400 kg',
        ],
        recommendedAction: 'Trigger Defcon-1 Checkpoint Lockdown and deploy road barriers.',
        confidence: 99.8,
      },
      {
        id: 'msg-vc-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Trajectory & Homography',
        color: '#ec4899',
        timestamp: '19:48:12.620',
        thoughtTrace:
          'Impact corridor calculation: vehicle will breach barrier gate in 3.8 seconds without deceleration. Emergency escape turnout road open on Right Vector.',
        evidencePoints: [
          'Time-to-Collision: 3.82 seconds',
          'Vehicle trajectory vector straight on Gate Alpha-3',
        ],
        recommendedAction: 'Engage hydraulic wedge barrier and automated tire deflation spikes.',
        confidence: 98.2,
      },
      {
        id: 'msg-vc-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement',
        color: '#10b981',
        timestamp: '19:48:12.800',
        thoughtTrace:
          'Authorizing immediate activation of crash bollards and anti-ram wedge under Sector Charlie Force Protection Matrix.',
        evidencePoints: [
          'Level-3 Force Protection Protocol Active',
          'Checkpost Sentries notified to take armored cover',
        ],
        recommendedAction: 'Deploy Hydraulic Bollards; alert Quick Reaction QRT Alpha.',
        confidence: 99.0,
      },
      {
        id: 'msg-vc-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain of Custody',
        color: '#a855f7',
        timestamp: '19:48:12.980',
        thoughtTrace:
          'ANPR camera snapshot, radar speed Doppler log, and multi-cam video evidence locked into emergency encrypted legal ledger.',
        evidencePoints: [
          'Radar Doppler velocity telemetry certified',
          'SHA-256: 9b23f87c12586a...88310bc9',
        ],
        recommendedAction: 'Seal forensic incident report for Ministry of Home Affairs.',
        confidence: 100.0,
      },
    ],
    countermeasures: [
      {
        id: 'cm-vc-01',
        label: 'Deploy Hydraulic Anti-Ram Wedge & Spike Strip',
        status: 'READY',
        assignedTo: 'Commander AI',
        priority: 'CRITICAL',
        actionPayload: 'Barrier Gate #3 Raised // Spikes Engaged',
      },
      {
        id: 'cm-vc-02',
        label: 'Trigger 130dB Perimeter Horn & Strobe Flasher',
        status: 'READY',
        assignedTo: 'Sentinel AI',
        priority: 'HIGH',
        actionPayload: 'Dual Xenon Red/Blue Strobe Pulse Active',
      },
    ],
  },
};

export class AgentOrchestratorService {
  private agents: TacticalAgentInfo[] = [...TACTICAL_AGENTS];
  private currentPlan: MultiAgentPlan = PRESET_SCENARIOS.perimeter_scaling;

  public getAgents(): TacticalAgentInfo[] {
    return this.agents;
  }

  public getCurrentPlan(): MultiAgentPlan {
    return this.currentPlan;
  }

  public deliberateScenario(scenarioKey: string): MultiAgentPlan {
    if (PRESET_SCENARIOS[scenarioKey]) {
      this.currentPlan = JSON.parse(JSON.stringify(PRESET_SCENARIOS[scenarioKey]));
      // Dynamically simulate neural load & latency
      this.agents.forEach((ag) => {
        ag.status = 'DELIBERATING';
        ag.neuralLoad = Math.floor(Math.random() * 25 + 50);
        ag.latencyMs = Math.floor(Math.random() * 8 + 6);
        ag.actionCount += 1;
      });
      setTimeout(() => {
        this.agents[0].status = 'ANALYZING';
        this.agents[1].status = 'DELIBERATING';
        this.agents[2].status = 'DISPATCHING';
        this.agents[3].status = 'IDLE';
      }, 500);
      return this.currentPlan;
    }
    return this.currentPlan;
  }

  public executeCountermeasure(actionId: string): MultiAgentPlan {
    this.currentPlan.countermeasures = this.currentPlan.countermeasures.map((cm) => {
      if (cm.id === actionId) {
        return { ...cm, status: 'EXECUTED' };
      }
      return cm;
    });
    return this.currentPlan;
  }

  public async processCopilotQuery(query: string): Promise<{
    answer: string;
    deliberations: { agent: string; perspective: string; confidence: number }[];
    consensusScore: number;
  }> {
    const q = query.toLowerCase();

    if (q.includes('breach') || q.includes('intruder') || q.includes('scaling') || q.includes('fence') || q.includes('nw')) {
      return {
        answer:
          'Cross-Agent Consensus (98.6%): Target TRK-992 has reached the upper chainlink of NW-04. Sentinel confirms humanoid bio-signature (99.4%), Pathfinder projects landing in Sector Bravo in 8.5s, and Commander has designated QRT Delta-02 as primary intercept vector with 42s ETA.',
        consensusScore: 98.6,
        deliberations: [
          { agent: 'SENTINEL-AI', perspective: 'Thermal IR confirms 36.8°C human core temperature. Motion classified as fence scaling with 99.4% confidence.', confidence: 99.4 },
          { agent: 'PATHFINDER-AI', perspective: 'Homography vectors indicate cross-over to CAM-03 blindspot in 1.4 seconds. Coordinates: X:142.4, Y:88.1.', confidence: 98.6 },
          { agent: 'COMMANDER-AI', perspective: 'SOP 14-B authorized non-lethal intercept. Delta-02 patrol en route with 42s ETA.', confidence: 97.8 },
          { agent: 'LEX-AUDIT-AI', perspective: '60-second evidence container sealed with SHA-256: 7f83b165...26d9069.', confidence: 100.0 },
        ],
      };
    }

    if (q.includes('fog') || q.includes('thermal') || q.includes('river') || q.includes('water')) {
      return {
        answer:
          'Cross-Agent Consensus (95.2%): Sentinel and Pathfinder report 2 stealth-crawl targets in Sector Delta Riverine Marshland under 82% dense fog. Sonar acoustic confirmation matches human water disturbance. Marine Patrol Boat-03 has been silently vectored for apprehension.',
        consensusScore: 95.2,
        deliberations: [
          { agent: 'SENTINEL-AI', perspective: 'Dual-spectrum FLIR contrast equalization penetrated dense mist; detected 2 crawling shapes with 37.1°C heat blooms.', confidence: 96.4 },
          { agent: 'PATHFINDER-AI', perspective: 'Target creeping velocity 0.4 m/s heading toward Boat Jetty North-2 in Sector Delta.', confidence: 94.8 },
          { agent: 'COMMANDER-AI', perspective: 'Silent Intercept Protocol active to preserve tactical surprise. Sirens suppressed.', confidence: 95.0 },
          { agent: 'LEX-AUDIT-AI', perspective: 'Multi-spectral video & acoustic sonar timestamps sealed under SHA-256 tamper-proof ledger.', confidence: 100.0 },
        ],
      };
    }

    if (q.includes('vehicle') || q.includes('car') || q.includes('barrier') || q.includes('checkpoint') || q.includes('speed')) {
      return {
        answer:
          'Cross-Agent Consensus (97.4%): High-speed vehicle violation at Sector Charlie Checkpoint. Vehicle VEH-4820 approaching barrier at 82 km/h. Automated hydraulic anti-ram wedge and spike strips deployed.',
        consensusScore: 97.4,
        deliberations: [
          { agent: 'SENTINEL-AI', perspective: 'Speed detected 82.4 km/h in restricted 20 km/h corridor. Stolen license plate tag flagged.', confidence: 99.8 },
          { agent: 'PATHFINDER-AI', perspective: 'Time to collision 3.8 seconds straight onto Gate Alpha-3.', confidence: 98.2 },
          { agent: 'COMMANDER-AI', perspective: 'Authorized deployment of crash bollards and anti-ram wedge.', confidence: 99.0 },
          { agent: 'LEX-AUDIT-AI', perspective: 'Radar speed Doppler and multi-cam video locked in legal ledger.', confidence: 100.0 },
        ],
      };
    }

    return {
      answer:
        `Lead Orchestrator reporting: All 4 autonomous agents are operational across 9 camera nodes. Global consensus health is 99.1%. Sentinel is processing live 60 FPS feeds, Pathfinder is updating cross-camera homography matrices, Commander has all QRT units checked in, and Lex Forensic confirms zero database tampering.`,
      consensusScore: 99.1,
      deliberations: [
        { agent: 'SENTINEL-AI', perspective: 'Perception pipeline processing 60 FPS RTSP streams with zero frame drops.', confidence: 99.5 },
        { agent: 'PATHFINDER-AI', perspective: 'Homography ground matrices calibrated for all 9 boundary cameras.', confidence: 98.9 },
        { agent: 'COMMANDER-AI', perspective: 'All patrol QRT units checked in with GPS heartbeat.', confidence: 99.0 },
        { agent: 'LEX-AUDIT-AI', perspective: 'Evidence database operating with zero cryptographic tampering detected.', confidence: 100.0 },
      ],
    };
  }
}

export const agentOrchestrator = new AgentOrchestratorService();
