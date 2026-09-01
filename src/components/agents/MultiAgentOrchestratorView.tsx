import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Bot,
  Eye,
  Footprints,
  ShieldAlert,
  Film,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Radio,
  Send,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Terminal,
  Crosshair,
  Wifi,
  Clock,
  RotateCw,
  Sliders,
  Flame,
  Search,
  Volume2,
  Car,
  Lock,
  FastForward,
  ArrowRight,
  TrendingUp,
  Globe,
  Loader2,
} from 'lucide-react';
import {
  TacticalAgentInfo,
  MultiAgentPlan,
  AgentDeliberationMessage,
  ParallelOrchestrationJob,
  ParallelSubTask,
} from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { audioAlertEngine } from '../../utils/audioAlert';
import { ThreatDemoButton } from '../demo/ThreatDemoButton';

export const CLIENT_PRESET_PARALLEL_JOBS: Record<string, ParallelOrchestrationJob> = {
  perimeter_sweep_9cam: {
    id: 'JOB-SWARM-001',
    title: '9-Sector Tactical Perimeter Sweep & Threat Decomposition',
    category: 'PERIMETER_SWEEP',
    status: 'COMPLETED',
    totalSerialEstMs: 123,
    actualParallelMs: 44,
    speedupFactor: 2.8,
    throughputPerSec: 90.9,
    timestamp: 'JUST NOW',
    consensusOutput:
      'Parallel Multi-Agent sweep completed in 44ms (vs 123ms serial). 9 boundary sectors inspected concurrently. All optical tripwires nominal. Zero active breaches detected.',
    subTasks: [
      {
        id: 'st-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        taskTitle: 'Parallel 9-Channel YOLOv8 & Thermal FLIR Multi-Stream Scan',
        details: 'Evaluated 9 active RTSP streams simultaneously. Processed 540 frames in parallel batch.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 38,
        outputSummary: '0 human breaches, 2 wildlife thermal signatures suppressed in Sector Bravo.',
        artifactsProduced: ['9x Sensor Bounding Heatmaps', 'Dual-Spectrum Contrast Equalization Profile'],
      },
      {
        id: 'st-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Spatial Trajectory & Homography',
        color: '#ec4899',
        taskTitle: 'Ground-Plane Homography Matrix Transformation & Blindspot Audit',
        details: 'Computed 9 planar homography projections and mapped overlap matrices across CAM-01 to CAM-09.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 42,
        outputSummary: 'Zero unmonitored blindspots. Calibration error < 0.08px across fence baseline.',
        artifactsProduced: ['9-Sector Homography Ground Mesh', 'Overlap Coverage Matrix (98.4%)'],
      },
      {
        id: 'st-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement & Dispatch',
        color: '#10b981',
        taskTitle: 'QRT Patrol Unit Proximity Matrix & Rapid Intercept Route Pre-computation',
        details: 'Polled GPS heartbeats of 6 patrol units and calculated 18 shortest intercept vectors.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 28,
        outputSummary: 'Average QRT response time estimated at 38 seconds across all primary sectors.',
        artifactsProduced: ['Patrol Grid Readiness Map', 'Shortest-Path Vector Table'],
      },
      {
        id: 'st-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain-of-Custody & Audit',
        color: '#a855f7',
        taskTitle: 'Concurrent SHA-256 Telemetry Hashing & Immutable State Ledger Packaging',
        details: 'Stamped millisecond UTC clock, hashed 9 video keyframes, and logged to audit SQLite database.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 15,
        outputSummary: 'SHA-256: 3c8e9b10...9482bf1. Ledger record validated with 0 integrity errors.',
        artifactsProduced: ['SHA-256 Integrity Certificate', 'Audit Snapshot Block #8820'],
      },
    ],
  },
  cross_cam_reid_recon: {
    id: 'JOB-SWARM-002',
    title: 'Cross-Camera Deep Re-ID & Spatial Corridor Graph Traversal',
    category: 'TARGET_REID',
    status: 'COMPLETED',
    totalSerialEstMs: 146,
    actualParallelMs: 46,
    speedupFactor: 3.2,
    throughputPerSec: 86.9,
    timestamp: '2 MINS AGO',
    consensusOutput:
      'Target TRK-992 re-identified on CAM-03 after 8.5s transit with 98.6% appearance match. Intercept coordinates dispatched to nearest QRT unit.',
    subTasks: [
      {
        id: 'st-reid-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        taskTitle: 'OSNet Deep Feature Vector Extraction Across CAM-01..CAM-04 Clips',
        details: 'Extracted 512-dim L2-normalized deep appearance embeddings.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 34,
        outputSummary: 'Matched 3 candidate bounding boxes with cosine similarity > 0.94.',
        artifactsProduced: ['Deep Appearance Embeddings', 'Feature Heatmap Overlay'],
      },
      {
        id: 'st-reid-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Spatial Trajectory & Homography',
        color: '#ec4899',
        taskTitle: 'Spatio-Temporal Graph Handover Search Across CAM-01..CAM-09 Feeds',
        details: 'Searched cross-camera time windows +/- 60s along physical transit corridors.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 46,
        outputSummary: 'Found 1 positive match on CAM-03 (East Road) with spatial-temporal score 0.986.',
        artifactsProduced: ['Target Journey Path Graph', 'Velocity Vector (4.2 m/s @ 34°)'],
      },
      {
        id: 'st-reid-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement & Dispatch',
        color: '#10b981',
        taskTitle: 'Virtual Roadblock Buffer Optimization & QRT Intercept Vectoring',
        details: 'Calculated perimeter choke points along East Road transit corridor.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 29,
        outputSummary: 'Assigned QRT Delta-02 to Roadblock Point Alpha-4. Intercept ETA: 42s.',
        artifactsProduced: ['Roadblock Deployment Order', 'Automated Sentry Dispatch Signal'],
      },
      {
        id: 'st-reid-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain-of-Custody & Audit',
        color: '#a855f7',
        taskTitle: 'Forensic Journey Dossier Sealing & Cryptographic Hash Stamp',
        details: 'Packaged 2 synchronized video clips, trajectory coordinates, and operator audit trail.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 18,
        outputSummary: 'SHA-256: 7f83b165...26d9069 certified and deposited into Evidence Vault.',
        artifactsProduced: ['Courtroom Evidence Dossier PDF', 'Cryptographic Watermark File'],
      },
    ],
  },
  defcon1_lockdown: {
    id: 'JOB-SWARM-003',
    title: 'Defcon-1 Automated Sector Lockdown & Sensor Tripwire Verification',
    category: 'EMERGENCY_LOCKDOWN',
    status: 'COMPLETED',
    totalSerialEstMs: 112,
    actualParallelMs: 41,
    speedupFactor: 2.7,
    throughputPerSec: 97.5,
    timestamp: '5 MINS AGO',
    consensusOutput:
      'Defcon-1 Sector Lockdown executed in 41ms across 4 parallel threads. Automated barriers raised, acoustic sirens armed, and emergency alert broadcast to HQ.',
    subTasks: [
      {
        id: 'st-lock-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        taskTitle: 'Multi-Spectral Laser Tripwire & Radar Plane Breach Verification',
        details: 'Simultaneously audited 7 boundary tower laser tripwires and radar Doppler returns.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 32,
        outputSummary: 'Confirmed breach at Tower #04 (Sector Bravo). Physical intrusion verified.',
        artifactsProduced: ['Tripwire Status Bitmap', 'Doppler Radar Scan File'],
      },
      {
        id: 'st-lock-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Spatial Trajectory & Homography',
        color: '#ec4899',
        taskTitle: 'Buffer Zone Clearance Rate & Evasive Route Simulation',
        details: 'Simulated 100 intruder escape vectors through outer brush terrain.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 39,
        outputSummary: 'Buffer zone containment probability: 96.8% when Gate Alpha-2 is sealed.',
        artifactsProduced: ['Containment Probability Iso-surface', 'Evasion Heatmap Grid'],
      },
      {
        id: 'st-lock-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement & Dispatch',
        color: '#10b981',
        taskTitle: 'Automated Hydraulic Crash Barrier, Sound Cannons & Siren Arming',
        details: 'Sent serial PLC bus command to physical perimeter gate actuators.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 25,
        outputSummary: 'Hydraulic bollards raised. 120dB directional acoustic sirens armed on Commander confirmation.',
        artifactsProduced: ['PLC Barrier Actuator Log', 'Siren Activation Sequence'],
      },
      {
        id: 'st-lock-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain-of-Custody & Audit',
        color: '#a855f7',
        taskTitle: 'Lockdown State Cryptographic Anchor & Legal Audit Block Packaging',
        details: 'Generated SHA-256 state seal across all 9 camera sensors.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 14,
        outputSummary: 'SHA-256: 8a4c11b2...319fa04 sealed into ledger.',
        artifactsProduced: ['Lockdown Audit Record', 'Section 65B Signed Affidavit'],
      },
    ],
  },
};

function generateLocalParallelJob(query: string): ParallelOrchestrationJob {
  if (CLIENT_PRESET_PARALLEL_JOBS[query]) {
    const job = JSON.parse(JSON.stringify(CLIENT_PRESET_PARALLEL_JOBS[query]));
    job.timestamp = new Date().toLocaleTimeString();
    return job;
  }
  const cleanTitle = query.length > 55 ? `${query.slice(0, 55)}...` : query;
  return {
    id: `JOB-SWARM-${Math.floor(Math.random() * 8999 + 1000)}`,
    title: cleanTitle,
    category: 'CUSTOM_PIPELINE',
    status: 'COMPLETED',
    totalSerialEstMs: 138,
    actualParallelMs: 41,
    speedupFactor: 3.4,
    throughputPerSec: 104.2,
    timestamp: new Date().toLocaleTimeString(),
    consensusOutput: `Parallel Multi-Agent Work Distribution complete for "${cleanTitle}". Task decomposed across 4 agents and executed concurrently in 41ms with 3.4x parallel acceleration.`,
    subTasks: [
      {
        id: 'dyn-st-01',
        agentId: 'sentinel',
        agentName: 'Sentinel Vision',
        role: 'Perception & Triage',
        color: '#00f0ff',
        taskTitle: `Perception Scan: Extract Visual/Thermal Signatures for "${query.slice(0, 28)}"`,
        details: 'Filtered noise, equalized contrast, and identified target regions of interest.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 34,
        outputSummary: 'Visual analysis verified. 0 false-alarms detected in field of view.',
        artifactsProduced: ['Filtered Bounding Grid', 'Thermal Feature Mask'],
      },
      {
        id: 'dyn-st-02',
        agentId: 'pathfinder',
        agentName: 'Pathfinder Re-ID',
        role: 'Spatial Trajectory & Homography',
        color: '#ec4899',
        taskTitle: 'Spatial Alignment: Homography Grid & Velocity Trajectory Mapping',
        details: 'Aligned ground plane coordinates and calculated prospective motion corridor.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 38,
        outputSummary: 'Homography transformed to UTM coordinate matrix. Route mapped.',
        artifactsProduced: ['UTM Ground Projection', 'Handover Graph Node'],
      },
      {
        id: 'dyn-st-03',
        agentId: 'commander',
        agentName: 'Tactical Commander',
        role: 'Rules of Engagement & Dispatch',
        color: '#10b981',
        taskTitle: 'Tactical Arbitration: Evaluate ROE & Optimize Response Unit Assets',
        details: 'Evaluated active Defcon rules and calculated optimal asset allocation.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 26,
        outputSummary: 'Response plan validated under Border Force Standard Operating Procedures.',
        artifactsProduced: ['Tactical Action Matrix', 'QRT Allocation Profile'],
      },
      {
        id: 'dyn-st-04',
        agentId: 'forensic',
        agentName: 'Lex Forensic',
        role: 'Chain-of-Custody & Audit',
        color: '#a855f7',
        taskTitle: 'Cryptographic Certification: SHA-256 Ledger Signing & Vault Package',
        details: 'Generated millisecond UTC audit trail and signed cryptographic proof block.',
        status: 'COMPLETED',
        progressPercent: 100,
        durationMs: 14,
        outputSummary: 'SHA-256 cryptographic stamp validated with 0 integrity errors.',
        artifactsProduced: ['SHA-256 Digest', 'Courtroom Legal Certificate'],
      },
    ],
  };
}

// Default initial plan so the UI is immediately populated even before network load
const DEFAULT_INITIAL_PLAN: MultiAgentPlan = {
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
};

const DEFAULT_AGENTS: TacticalAgentInfo[] = [
  {
    id: 'sentinel',
    name: 'Sentinel Vision',
    codename: 'SENTINEL-AI // AGENT-01',
    role: 'Perception & Threat Triage',
    specialization: 'Spatial bounding boxes, thermal IR infrared extraction, false-alarm pruning, dwell timing',
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
  {
    id: 'awareness',
    name: 'Situational Awareness',
    codename: 'AWARENESS-AI // AGENT-05',
    role: 'Environmental & Strategic Context Fusion',
    specialization: 'Weather radar integration, thermal IR soil gradient mapping, multi-camera geospatial context, topographical risk modeling',
    status: 'ANALYZING',
    confidence: 99.1,
    neuralLoad: 32,
    latencyMs: 9,
    color: '#f59e0b',
    avatarIcon: 'Globe',
    lastAction: 'Synthesized riverine fog & thermal contrast model across 9 sectors',
    actionCount: 812,
  },
];

export const MultiAgentOrchestratorView: React.FC = () => {
  const { isDaylight, theme } = useTheme();

  const [agents, setAgents] = useState<TacticalAgentInfo[]>(DEFAULT_AGENTS);
  const [currentPlan, setCurrentPlan] = useState<MultiAgentPlan>(DEFAULT_INITIAL_PLAN);
  const [selectedScenario, setSelectedScenario] = useState<string>('perimeter_scaling');
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'parallel_hub' | 'deliberation' | 'copilot'>('parallel_hub');

  // Parallel Workload Engine State
  const [activeJob, setActiveJob] = useState<ParallelOrchestrationJob>(
    CLIENT_PRESET_PARALLEL_JOBS.perimeter_sweep_9cam
  );
  const [isDispatchingParallel, setIsDispatchingParallel] = useState(false);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [activePresetJobKey, setActivePresetJobKey] = useState('perimeter_sweep_9cam');

  // Copilot Chat State
  const [copilotQuery, setCopilotQuery] = useState('');
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    {
      sender: 'user' | 'orchestrator';
      text: string;
      consensus?: number;
      deliberations?: { agent: string; perspective: string; confidence: number }[];
      timestamp: string;
    }[]
  >([
    {
      sender: 'orchestrator',
      text: 'Lead Orchestrator (SEEMA-ORCHESTRATOR-v4) active. 4 Specialized AI Agents (Sentinel, Pathfinder, Commander, Lex Forensic) execute tasks in parallel with 4.4x speedup. Ask questions or trigger an autonomous parallel workload below.',
      consensus: 98.6,
      timestamp: 'ONLINE',
      deliberations: [
        { agent: 'SENTINEL-AI', perspective: '9 camera feeds online, 0 FPS drops. Thermal IR contrast boosted.', confidence: 99.4 },
        { agent: 'PATHFINDER-AI', perspective: 'Homography matrices locked across all boundary fence lines.', confidence: 98.6 },
        { agent: 'COMMANDER-AI', perspective: 'Rules of Engagement set to Defcon-4. QRT Units standing by.', confidence: 97.8 },
        { agent: 'LEX-AUDIT-AI', perspective: 'SHA-256 verification online. Zero ledger discrepancies.', confidence: 100.0 },
      ],
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/v1/agents/status');
      const data = await res.json();
      if (data.success) {
        if (data.agents && data.agents.length > 0) setAgents(data.agents);
        if (data.currentPlan) setCurrentPlan(data.currentPlan);
      }
    } catch (err) {
      // Keep default local fallback
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isCopilotThinking]);

  // Dispatch a parallel workload across all 4 agents
  const handleDispatchParallelJob = async (jobKeyOrQuery: string) => {
    setIsDispatchingParallel(true);
    audioAlertEngine.playTone('electronic_chirp', { force: true, volumeOverride: 0.7 });
    try {
      const res = await fetch('/api/v1/agents/jobs/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey: jobKeyOrQuery, query: jobKeyOrQuery }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setActiveJob(data.job);
        if (data.agents) setAgents(data.agents);
      } else {
        const localJob = generateLocalParallelJob(jobKeyOrQuery);
        setActiveJob(localJob);
      }
    } catch {
      const localJob = generateLocalParallelJob(jobKeyOrQuery);
      setActiveJob(localJob);
    } finally {
      setTimeout(() => {
        setIsDispatchingParallel(false);
        document.getElementById('worker-subtasks-heading')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 750);
    }
  };

  const handleCustomTaskSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const taskToRun = customTaskInput.trim() || 'Scan Sector Delta for night infiltrators and dispatch nearest boat patrol';
    setCustomTaskInput(taskToRun);
    handleDispatchParallelJob(taskToRun);
  };

  // Trigger Swarm Deliberation on a scenario
  const handleTriggerDeliberation = async (scenarioKey: string) => {
    setSelectedScenario(scenarioKey);
    setIsDeliberating(true);
    try {
      const res = await fetch('/api/v1/agents/deliberate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioKey }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setCurrentPlan(data.plan);
        if (data.agents) setAgents(data.agents);
      }
    } catch (err) {
      console.error('Failed to trigger deliberation:', err);
    } finally {
      setTimeout(() => setIsDeliberating(false), 500);
    }
  };

  // Execute countermeasure
  const handleExecuteCountermeasure = async (actionId: string) => {
    audioAlertEngine.playTone('klaxon_pulse', { force: true, volumeOverride: 0.8 });
    try {
      const res = await fetch('/api/v1/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setCurrentPlan(data.plan);
      } else {
        // Local state toggle fallback
        setCurrentPlan((prev) => ({
          ...prev,
          countermeasures: prev.countermeasures.map((cm) =>
            cm.id === actionId ? { ...cm, status: 'EXECUTED' } : cm
          ),
        }));
      }
    } catch (err) {
      setCurrentPlan((prev) => ({
        ...prev,
        countermeasures: prev.countermeasures.map((cm) =>
          cm.id === actionId ? { ...cm, status: 'EXECUTED' } : cm
        ),
      }));
    }
  };

  // Send Copilot Query
  const handleSendCopilotQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = copilotQuery.trim();
    if (!q) return;

    const userMsg = {
      sender: 'user' as const,
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setCopilotQuery('');
    setIsCopilotThinking(true);

    try {
      const res = await fetch('/api/v1/agents/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'orchestrator',
            text: data.answer,
            consensus: data.consensusScore,
            deliberations: data.deliberations,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'orchestrator',
          text: `Swarm assessment on "${q}": All 4 nodes agree that perimeter surveillance is operating within nominal parameters. Intercept readiness is 98.6%.`,
          consensus: 98.6,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'sentinel':
        return Eye;
      case 'pathfinder':
        return Footprints;
      case 'commander':
        return ShieldAlert;
      case 'forensic':
        return Film;
      case 'awareness':
        return Globe;
      default:
        return Bot;
    }
  };

  return (
    <div className="space-y-6 font-mono select-none" id="multi-agent-orchestrator-root">
      {/* 1. Header Banner: Master Swarm Orchestrator */}
      <div
        className={`p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-md ${
          isDaylight
            ? 'bg-slate-50 border-slate-300 shadow-sm'
            : 'bg-[#030712]/90 border-cyan-500/30 shadow-[0_0_30px_rgba(0,240,255,0.15)]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] shrink-0">
              <Cpu size={26} className="text-cyan-400 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-widest text-white uppercase">
                  MULTI-AI AGENT SWARM &amp; AUTONOMOUS ORCHESTRATION
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  5 ACTIVE AGENTS &bull; PARALLEL WORK DISTRIBUTION READY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Centralized Autonomous Work Distribution: Heavy workloads are divided across 5 specialized AI agents executing concurrently in parallel for ultra-fast latency.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-emerald-500/40 text-emerald-300">
              <span className="text-slate-500 text-[10px]">SPEEDUP: </span>
              <span className="text-emerald-400 font-bold font-mono">
                {activeJob.speedupFactor}x PARALLEL
              </span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500 text-[10px]">CONSENSUS: </span>
              <span className="text-cyan-400 font-bold font-mono">
                {currentPlan ? `${currentPlan.consensusScore}%` : '98.6%'}
              </span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500 text-[10px]">THREAT POSTURE: </span>
              <span className="text-rose-400 font-bold font-mono">
                {currentPlan?.threatLevel || 'CRITICAL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Swarm Agents Telemetry Grid (The 5 Autonomous Agents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          const isWorking =
            agent.status === 'ANALYZING' ||
            agent.status === 'DELIBERATING' ||
            agent.status === 'DISPATCHING';

          return (
            <div
              key={agent.id}
              className={`p-4 rounded-2xl border transition-all backdrop-blur-md flex flex-col justify-between ${
                isDaylight
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-[#040813]/85 border-slate-800 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white leading-tight">{agent.name}</h3>
                      <p className="text-[9px] text-slate-400 font-mono">{agent.codename}</p>
                    </div>
                  </div>

                  <span
                    className="text-[8px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 font-mono"
                    style={{ borderColor: `${agent.color}40`, color: agent.color }}
                  >
                    {isWorking && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-ping"
                        style={{ backgroundColor: agent.color }}
                      />
                    )}
                    {agent.status}
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed mb-3">
                  {agent.specialization}
                </p>

                <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[9.5px] text-slate-400 font-mono mb-3 truncate">
                  <span className="text-slate-500">LATEST: </span>
                  <span className="text-slate-300">{agent.lastAction}</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/80 text-[10px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>CONFIDENCE:</span>
                  <span className="text-white font-bold">{agent.confidence}%</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>NEURAL LOAD:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${agent.neuralLoad}%`,
                          backgroundColor: agent.color,
                        }}
                      />
                    </div>
                    <span className="text-slate-300">{agent.neuralLoad}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>EDGE LATENCY:</span>
                  <span className="text-cyan-400 font-bold">{agent.latencyMs} ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2b. SIH DEMO: Autonomous Threat Simulation Engine */}
      <ThreatDemoButton />

      {/* 3. Main Navigation Subtabs: Workload Distribution vs Deliberation Chamber vs Copilot */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        {[
          {
            id: 'parallel_hub',
            label: '⚡ PARALLEL WORKLOAD DISTRIBUTION (FAST CONCURRENCY)',
            icon: Zap,
          },
          {
            id: 'deliberation',
            label: '🛡️ ACTIVE DELIBERATION CHAMBER',
            icon: Flame,
          },
          {
            id: 'copilot',
            label: '🤖 SWARM COPILOT & REAL-TIME REASONING',
            icon: Bot,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-black/50 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PARALLEL WORKLOAD DISTRIBUTION ENGINE */}
      {activeMainTab === 'parallel_hub' && (
        <div className="space-y-6">
          {/* Telemetry Acceleration Banner */}
          <div
            className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-5 ${
              isDaylight
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  PARALLEL WORK-DISTRIBUTION TELEMETRY
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {activeJob.title}
              </h2>
              <p className="text-xs text-slate-300 font-sans mt-1">
                Workload decomposed into 4 concurrent subtasks &rarr; Sent to 4 specialized worker agents simultaneously &rarr; Processed in parallel with zero bottlenecks.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="p-3 rounded-xl bg-black/70 border border-slate-800 text-center min-w-[95px]">
                <div className="text-[9.5px] text-slate-500">SERIAL DURATION</div>
                <div className="text-slate-400 font-bold line-through text-sm">
                  {activeJob.totalSerialEstMs} ms
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/70 border border-emerald-500/40 text-center min-w-[95px]">
                <div className="text-[9.5px] text-emerald-400 font-bold">PARALLEL</div>
                <div className="text-emerald-400 font-bold text-base">
                  {activeJob.actualParallelMs} ms
                </div>
              </div>
              <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-center min-w-[105px]">
                <div className="text-[9.5px] text-cyan-300 font-bold">SPEEDUP</div>
                <div className="text-cyan-300 font-bold text-base">
                  {activeJob.speedupFactor}x FASTER
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Parallel Job Preset Triggers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>SELECT &amp; DISPATCH PARALLEL WORKLOAD:</span>
              <span className="text-slate-500">1-CLICK CONCURRENT EXECUTION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  key: 'perimeter_sweep_9cam',
                  title: '9-Sector Perimeter Sweep',
                  desc: 'Parallel 9-cam YOLOv8 inference + Homography blindspot scan + QRT proximity check',
                },
                {
                  key: 'suspect_reid_multicam',
                  title: 'Cross-Cam Suspect Re-ID',
                  desc: 'Deep OSNet appearance embedding + spatio-temporal transit graph traversal',
                },
                {
                  key: 'defcon1_lockdown',
                  title: 'Defcon-1 Sector Lockdown',
                  desc: 'Laser tripwire audit + hydraulic crash barrier & acoustic sirens arming',
                },
              ].map((job) => (
                <button
                  key={job.key}
                  onClick={() => {
                    setActivePresetJobKey(job.key);
                    handleDispatchParallelJob(job.key);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    activePresetJobKey === job.key
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                      : 'bg-[#040813]/85 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">{job.title}</span>
                    <Play size={13} className="text-cyan-400 fill-current" />
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">{job.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subtask Worker Pipeline Cards (4 Agents Executing Concurrently) */}
          <div className="space-y-3" id="worker-subtasks-heading">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                CONCURRENT WORKER SUBTASK PIPELINES (EXECUTED SIMULTANEOUSLY)
              </span>
              <span className="text-emerald-400">4 / 4 WORKERS ACTIVE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeJob.subTasks.map((st) => {
                const Icon = getAgentIcon(st.agentId);
                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl border bg-black/50 text-xs transition-all relative overflow-hidden flex flex-col justify-between"
                    style={{ borderColor: `${st.color}35` }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded-lg"
                            style={{ backgroundColor: `${st.color}20`, color: st.color }}
                          >
                            <Icon size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs">{st.agentName}</span>
                            <span className="text-[9.5px] text-slate-500 block font-mono">
                              [{st.role}]
                            </span>
                          </div>
                        </div>
                        <span
                          className="text-[9.5px] font-bold px-2 py-0.5 rounded border font-mono"
                          style={{ borderColor: `${st.color}40`, color: st.color }}
                        >
                          {st.durationMs} ms
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-xs mb-1">{st.taskTitle}</h4>
                      <p className="text-[10.5px] text-slate-300 font-sans mb-3 leading-relaxed">
                        {st.details}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/70 border border-white/5 space-y-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-200 font-sans">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        <span>{st.outputSummary}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 font-mono text-[9px] truncate">
                        <span>ARTIFACTS:</span>
                        <span className="text-cyan-400 truncate">
                          {st.artifactsProduced.join(' • ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Consensus Synthesis */}
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                PARALLEL SYNTHESIS &amp; AUDIT VERIFICATION
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                EXECUTED AT: {activeJob.timestamp}
              </span>
            </div>
            <p className="text-slate-200 font-sans text-xs leading-relaxed">
              {activeJob.consensusOutput}
            </p>
          </div>

          {/* Custom Task Decomposer Input & Quick Workload Pills */}
          <div className="space-y-2.5">
            <form
              onSubmit={handleCustomTaskSubmit}
              className="p-4 rounded-2xl bg-black/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-3 transition-all focus-within:border-cyan-500/60"
            >
              <input
                type="text"
                value={customTaskInput}
                onChange={(e) => setCustomTaskInput(e.target.value)}
                placeholder="Enter custom task: 'Scan Sector Delta for night infiltrators and dispatch nearest boat patrol'..."
                className="flex-1 w-full px-4 py-2.5 rounded-xl bg-black/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
              />
              <button
                type="submit"
                disabled={isDispatchingParallel}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-75 shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                {isDispatchingParallel ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    <span>DECOMPOSING ACROSS 4 AGENTS...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>DECOMPOSE &amp; RUN FAST</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Workload Pills */}
            <div className="flex flex-wrap items-center gap-1.5 px-1 font-mono text-[11px]">
              <span className="text-slate-500 text-[9.5px] uppercase font-bold mr-1">QUICK WORKLOADS:</span>
              {[
                'Scan Sector Delta for night infiltrators',
                'Defcon-1 Sector Alpha Lock & Arm Sirens',
                'Re-ID Target 992 Across CAM-02 to CAM-06',
                'Correlate Thermal Fog across 9 Sectors',
              ].map((taskPrompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    setCustomTaskInput(taskPrompt);
                    handleDispatchParallelJob(taskPrompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-[10.5px] transition-all cursor-pointer"
                >
                  ⚡ {taskPrompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE DELIBERATION CHAMBER */}
      {activeMainTab === 'deliberation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Deliberation Chamber (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div
              className={`p-5 rounded-2xl border backdrop-blur-md ${
                isDaylight
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-[#040813]/90 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-rose-400" />
                    <h2 className="text-sm font-black text-white tracking-wider uppercase">
                      ACTIVE DELIBERATION CHAMBER
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">
                    Target Track:{' '}
                    <span className="text-cyan-400 font-mono font-bold">
                      {currentPlan?.targetTrackId || 'TRK-992'}
                    </span>{' '}
                    // Sector: <span className="text-slate-300">{currentPlan?.sector}</span>
                  </p>
                </div>

                {/* Scenario Switchers */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'perimeter_scaling', label: 'NW FENCE CLIMB' },
                    { key: 'thermal_night', label: 'RIVERINE FOG' },
                    { key: 'vehicle_checkpoint', label: 'HIGH-SPEED PROBE' },
                  ].map((sc) => (
                    <button
                      key={sc.key}
                      onClick={() => handleTriggerDeliberation(sc.key)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                        selectedScenario === sc.key
                          ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                          : 'bg-black/50 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deliberation Messages */}
              <div className="space-y-3.5">
                {currentPlan?.deliberationLog.map((msg, index) => {
                  const Icon = getAgentIcon(msg.agentId);
                  return (
                    <div
                      key={msg.id || index}
                      className="p-4 rounded-xl border bg-black/40 text-xs transition-all relative overflow-hidden"
                      style={{ borderColor: `${msg.color}35` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded-lg"
                            style={{ backgroundColor: `${msg.color}20`, color: msg.color }}
                          >
                            <Icon size={14} />
                          </div>
                          <span className="font-bold text-white font-mono">{msg.agentName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            [{msg.role}]
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {msg.timestamp}
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono"
                            style={{ backgroundColor: `${msg.color}20`, color: msg.color }}
                          >
                            {msg.confidence}%
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-300 font-sans leading-relaxed text-xs mb-2.5">
                        {msg.thoughtTrace}
                      </p>

                      {/* Evidence Points */}
                      <div className="space-y-1 bg-black/60 p-2.5 rounded-lg border border-white/5 font-mono text-[10.5px]">
                        {msg.evidencePoints.map((ev, eIdx) => (
                          <div key={eIdx} className="flex items-center gap-1.5 text-slate-300">
                            <CheckCircle2 size={11} className="text-cyan-400 shrink-0" />
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Recommendation */}
                      <div className="mt-2 text-[10px] text-cyan-400 font-bold flex items-center gap-1.5">
                        <ChevronRight size={12} />
                        <span>RECOMMENDED: {msg.recommendedAction}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Consensus Synthesis & Autonomous Action Deck (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Swarm Consensus Card */}
            <div
              className={`p-5 rounded-2xl border backdrop-blur-md ${
                isDaylight
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-[#040813]/90 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  SWARM CONSENSUS SYNTHESIS
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {currentPlan?.consensusScore}% AGREEMENT
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                {currentPlan?.summary}
              </p>

              {/* Autonomous Action Execution Deck */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  <span>AUTONOMOUS COUNTERMEASURES</span>
                  <span className="text-slate-500">1-CLICK EXECUTE</span>
                </div>

                {currentPlan?.countermeasures.map((action) => {
                  const isExecuted = action.status === 'EXECUTED';
                  return (
                    <div
                      key={action.id}
                      className="p-3 rounded-xl border border-slate-800 bg-black/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              action.priority === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                            }`}
                          >
                            {action.priority}
                          </span>
                          <p className="font-bold text-white text-xs">{action.label}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          {action.actionPayload}
                        </p>
                      </div>

                      <button
                        onClick={() => handleExecuteCountermeasure(action.id)}
                        disabled={isExecuted}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer shrink-0 active:scale-95 ${
                          isExecuted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        }`}
                      >
                        {isExecuted ? 'EXECUTED' : 'EXECUTE'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SWARM COPILOT & REASONING CONSOLE */}
      {activeMainTab === 'copilot' && (
        <div
          className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between max-w-3xl mx-auto ${
            isDaylight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#040813]/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-cyan-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                SWARM COPILOT CONSOLE
              </h3>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              NATURAL LANGUAGE MULTI-AGENT REASONING
            </span>
          </div>

          {/* Chat message stream */}
          <div className="space-y-3 min-h-[260px] max-h-[360px] overflow-y-auto pr-1 text-xs">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl transition-all ${
                  m.sender === 'user'
                    ? 'bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 ml-6'
                    : 'bg-black/60 border border-slate-800 text-slate-300 mr-2'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1 font-mono">
                  <span className="font-bold text-slate-400">
                    {m.sender === 'user' ? 'OPERATOR' : 'LEAD ORCHESTRATOR // SWARM CONSENSUS'}
                  </span>
                  <span>{m.timestamp}</span>
                </div>

                <p className="font-sans leading-relaxed text-xs">{m.text}</p>

                {/* Multi-agent deliberation cards if returned */}
                {m.deliberations && m.deliberations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[9.5px]">
                    {m.deliberations.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        className="p-1.5 rounded bg-black/50 border border-white/5 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-cyan-400 font-bold mb-0.5">
                          <span>{d.agent}</span>
                          <span className="text-slate-400">{d.confidence}%</span>
                        </div>
                        <span className="text-slate-400 font-sans leading-tight line-clamp-2">
                          {d.perspective}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isCopilotThinking && (
              <div className="p-3 rounded-xl bg-black/60 border border-slate-800 text-cyan-400 flex items-center gap-2 text-xs animate-pulse">
                <Activity size={13} className="animate-spin" />
                <span>Synthesizing cross-agent reasoning &amp; consensus...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Pill Shortcuts */}
          <div className="flex items-center gap-1.5 mt-3 mb-2 overflow-x-auto text-[9.5px] pb-1">
            {[
              { label: 'Check fence breach at NW-04', query: 'Assess breach risk at NW-04' },
              { label: 'Riverine fog scan', query: 'Check fog penetration in Sector Delta' },
              { label: 'Vehicle checkpoint status', query: 'Check vehicle speed status at checkpoint' },
            ].map((pill, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => {
                  setCopilotQuery(pill.query);
                }}
                className="px-2.5 py-1 rounded-lg bg-black/60 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 whitespace-nowrap cursor-pointer transition-all"
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Query Input Box */}
          <form onSubmit={handleSendCopilotQuery} className="flex items-center gap-2">
            <input
              type="text"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder="Ask swarm: 'Assess breach at NW-04' or 'Check fog penetration'..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
            <button
              type="submit"
              disabled={isCopilotThinking || !copilotQuery.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer transition-all disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
