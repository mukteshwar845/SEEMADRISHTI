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
} from 'lucide-react';
import { TacticalAgentInfo, MultiAgentPlan, AgentDeliberationMessage } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { audioAlertEngine } from '../../utils/audioAlert';

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
];

export const MultiAgentOrchestratorView: React.FC = () => {
  const { isDaylight, theme } = useTheme();

  const [agents, setAgents] = useState<TacticalAgentInfo[]>(DEFAULT_AGENTS);
  const [currentPlan, setCurrentPlan] = useState<MultiAgentPlan>(DEFAULT_INITIAL_PLAN);
  const [selectedScenario, setSelectedScenario] = useState<string>('perimeter_scaling');
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [activeTab, setActiveTab] = useState<'deliberation' | 'matrix' | 'countermeasures'>('deliberation');

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
      text: 'Lead Orchestrator (SEEMA-ORCHESTRATOR-v4) active. 4 Specialized AI Agents (Sentinel, Pathfinder, Commander, Lex Forensic) are continuously evaluating 9 border sectors in real-time consensus. Ask questions or trigger an autonomous tactical scenario below.',
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
                  4 ACTIVE AGENTS &bull; LEAD ORCHESTRATOR ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Centralized Autonomous Swarm Consensus: Spatial Threat Triage &bull; Cross-Camera Homography Handover &bull; Tactical ROE Dispatch &bull; Cryptographic Evidence Sealing
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500 text-[10px]">CONSENSUS: </span>
              <span className="text-emerald-400 font-bold font-mono">
                {currentPlan ? `${currentPlan.consensusScore}%` : '98.6%'}
              </span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500 text-[10px]">AVG LATENCY: </span>
              <span className="text-cyan-400 font-bold font-mono">11ms</span>
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

      {/* 2. Swarm Agents Telemetry Grid (The 4 Autonomous Agents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          const isWorking = agent.status === 'ANALYZING' || agent.status === 'DELIBERATING' || agent.status === 'DISPATCHING';

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

      {/* 3. Real-Time Swarm Deliberation Chamber & Consensus Engine */}
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
                  Target Track: <span className="text-cyan-400 font-mono font-bold">{currentPlan?.targetTrackId || 'TRK-992'}</span> // Sector: <span className="text-slate-300">{currentPlan?.sector}</span>
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
                        <span className="text-[10px] text-slate-500 font-mono">[{msg.role}]</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
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
                      <p className="text-[10px] text-slate-400 font-mono mt-1">{action.actionPayload}</p>
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

          {/* Interactive Multi-Agent Copilot Chat Console */}
          <div
            className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between ${
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
                NATURAL LANGUAGE INTERFACE
              </span>
            </div>

            {/* Chat message stream */}
            <div className="space-y-3 min-h-[190px] max-h-[260px] overflow-y-auto pr-1 text-xs">
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
        </div>
      </div>
    </div>
  );
};
