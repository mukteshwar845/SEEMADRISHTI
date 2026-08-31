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
} from 'lucide-react';
import { TacticalAgentInfo, MultiAgentPlan, AgentDeliberationMessage } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export const MultiAgentOrchestratorView: React.FC = () => {
  const { isDaylight, theme } = useTheme();

  const [agents, setAgents] = useState<TacticalAgentInfo[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MultiAgentPlan | null>(null);
  const [orchestratorInfo, setOrchestratorInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('perimeter_scaling');

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
      text: 'Lead Orchestrator (SEEMA-ORCHESTRATOR-v4) online. 4 Specialized AI Agents (Sentinel, Pathfinder, Commander, Lex Forensic) are actively monitoring 9 perimeter feeds. Enter an inquiry or select a scenario to initiate swarm deliberation.',
      consensus: 99.2,
      timestamp: 'ONLINE',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/v1/agents/status');
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
        setCurrentPlan(data.plan || data.currentPlan);
        setOrchestratorInfo(data.orchestrator);
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    } finally {
      setIsLoading(false);
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
      if (data.success) {
        setCurrentPlan(data.plan);
        setAgents(data.agents);
      }
    } catch (err) {
      console.error('Failed to trigger deliberation:', err);
    } finally {
      setTimeout(() => setIsDeliberating(false), 600);
    }
  };

  // Execute countermeasure
  const handleExecuteCountermeasure = async (actionId: string) => {
    try {
      const res = await fetch('/api/v1/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPlan(data.plan);
      }
    } catch (err) {
      console.error('Failed to execute countermeasure:', err);
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
          text: 'Orchestrator Swarm timeout. All 4 edge nodes are currently operating in local deterministic consensus.',
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Cpu size={24} className="animate-spin-slow text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black tracking-widest text-white uppercase">
                  MULTI-AI AGENT SWARM &amp; AUTONOMOUS ORCHESTRATION
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  4 ACTIVE AGENTS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Centralized Multi-Agent Consensus: Real-Time Perception &bull; Homography Trajectory Vectors &bull; Tactical ROE Dispatch &bull; SHA-256 Chain of Custody
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500 text-[10px]">CONSENSUS: </span>
              <span className="text-emerald-400 font-bold">
                {currentPlan ? `${currentPlan.consensusScore}%` : '98.6%'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500 text-[10px]">AVG LATENCY: </span>
              <span className="text-cyan-400 font-bold">11ms</span>
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
                    className="text-[8px] font-bold px-2 py-0.5 rounded border flex items-center gap-1"
                    style={{ borderColor: `${agent.color}40`, color: agent.color }}
                  >
                    {isWorking && <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: agent.color }} />}
                    {agent.status}
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed mb-3">
                  {agent.specialization}
                </p>
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
        {/* Left Column: Deliberation Timeline (7 cols) */}
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
                  Target: <span className="text-cyan-400 font-mono font-bold">{currentPlan?.targetTrackId || 'TRK-992'}</span> // {currentPlan?.sector}
                </p>
              </div>

              {/* Scenario Switchers */}
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'perimeter_scaling', label: 'NW FENCE CLIMB' },
                  { key: 'thermal_night', label: 'RIVERINE FOG' },
                ].map((sc) => (
                  <button
                    key={sc.key}
                    onClick={() => handleTriggerDeliberation(sc.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
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
                          className="p-1 rounded"
                          style={{ backgroundColor: `${msg.color}20`, color: msg.color }}
                        >
                          <Icon size={14} />
                        </div>
                        <span className="font-bold text-white">{msg.agentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">[{msg.role}]</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded"
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
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
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
            <div className="space-y-2.5 pt-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                AUTONOMOUS COUNTERMEASURES:
              </p>
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
                          className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 ${
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
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
              <Bot size={16} className="text-cyan-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                SWARM COPILOT CONSOLE
              </h3>
            </div>

            {/* Chat message stream */}
            <div className="space-y-3 min-h-[160px] max-h-[220px] overflow-y-auto pr-1 text-xs">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl ${
                    m.sender === 'user'
                      ? 'bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 ml-6'
                      : 'bg-black/60 border border-slate-800 text-slate-300 mr-2'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                    <span>{m.sender === 'user' ? 'OPERATOR' : 'ORCHESTRATOR SWARM'}</span>
                    <span>{m.timestamp}</span>
                  </div>
                  <p className="font-sans leading-relaxed text-xs">{m.text}</p>
                </div>
              ))}
              {isCopilotThinking && (
                <div className="p-3 rounded-xl bg-black/60 border border-slate-800 text-cyan-400 flex items-center gap-2 text-xs animate-pulse">
                  <Activity size={13} className="animate-spin" />
                  <span>Aggregating 4 agent perspectives &amp; consensus...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Query Input Box */}
            <form onSubmit={handleSendCopilotQuery} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask swarm: 'Assess breach risk at NW-04' or 'Check fog penetration'..."
                className="flex-1 px-3 py-2 rounded-xl bg-black/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
              />
              <button
                type="submit"
                disabled={isCopilotThinking || !copilotQuery.trim()}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer transition-all disabled:opacity-50"
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
