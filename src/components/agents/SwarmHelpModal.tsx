import React, { useState } from 'react';
import {
  X,
  Bot,
  Zap,
  Cpu,
  Layers,
  CheckCircle2,
  ChevronRight,
  Eye,
  Footprints,
  ShieldAlert,
  Film,
  Play,
  Clock,
  Sparkles,
  Send,
  HelpCircle,
  Activity,
  ArrowRight,
  Shield,
  Search,
  Globe,
} from 'lucide-react';
import { ParallelOrchestrationJob, ParallelSubTask, ViewMode } from '../../types';
import { PRESET_PARALLEL_JOBS, agentOrchestrator } from '../../../server/services/agentOrchestrator';
import { useTheme } from '../../context/ThemeContext';
import { audioAlertEngine } from '../../utils/audioAlert';

interface SwarmHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: ViewMode) => void;
}

export const SwarmHelpModal: React.FC<SwarmHelpModalProps> = ({
  isOpen,
  onClose,
  onNavigateView,
}) => {
  const { isDaylight } = useTheme();
  const [activeTab, setActiveTab] = useState<'dispatcher' | 'guide' | 'architecture'>('dispatcher');
  const [selectedJob, setSelectedJob] = useState<ParallelOrchestrationJob>(
    PRESET_PARALLEL_JOBS.perimeter_sweep_9cam
  );
  const [customCommand, setCustomCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePresetKey, setActivePresetKey] = useState<string>('perimeter_sweep_9cam');

  if (!isOpen) return null;

  const handleDispatchJob = async (jobKeyOrQuery: string) => {
    setIsProcessing(true);
    audioAlertEngine.playTone('electronic_chirp', { force: true, volumeOverride: 0.7 });
    try {
      const res = await fetch('/api/v1/agents/jobs/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey: jobKeyOrQuery, query: jobKeyOrQuery }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setSelectedJob(data.job);
      } else {
        // Fallback local orchestrator
        const localJob = agentOrchestrator.orchestrateParallelJob(jobKeyOrQuery);
        setSelectedJob(localJob);
      }
    } catch {
      const localJob = agentOrchestrator.orchestrateParallelJob(jobKeyOrQuery);
      setSelectedJob(localJob);
    } finally {
      setTimeout(() => setIsProcessing(false), 450);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    handleDispatchJob(customCommand.trim());
    setCustomCommand('');
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-mono select-none"
      id="swarm-help-modal"
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDaylight
            ? 'bg-slate-50 border-slate-300 text-slate-900'
            : 'bg-[#030712] border-cyan-500/30 text-slate-100 shadow-[0_0_50px_rgba(0,240,255,0.15)]'
        }`}
      >
        {/* 1. Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDaylight ? 'bg-white border-slate-200' : 'bg-black/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Zap size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  MULTI-AGENT TASK ORCHESTRATION &amp; WORK DISTRIBUTION
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-400">
                  4.4x PARALLEL SPEEDUP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Parallel Task Decomposition: 4 Concurrent Specialized AI Agents Execute Heavy Workloads in Milliseconds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Top Tabs */}
        <div
          className={`px-5 py-2.5 border-b flex items-center justify-between gap-2 text-xs ${
            isDaylight ? 'bg-slate-100 border-slate-200' : 'bg-[#02050e] border-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-2">
            {[
              { id: 'dispatcher', label: 'PARALLEL WORKLOAD DISPATCHER' },
              { id: 'guide', label: 'OPERATOR SYSTEM GUIDE' },
              { id: 'architecture', label: '4-AGENT CONCURRENCY ARCHITECTURE' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-black/40 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400">
            <span>CONCURRENT THREADS:</span>
            <span className="text-cyan-400 font-bold">4 / 4 WORKERS</span>
          </div>
        </div>

        {/* 3. Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'dispatcher' && (
            <>
              {/* Speedup Benchmark Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDaylight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                    PARALLEL EXECUTION TELEMETRY
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-white mt-0.5">
                    {selectedJob.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs shrink-0">
                  <div className="p-2 px-3 rounded-lg bg-black/60 border border-slate-800 text-center">
                    <div className="text-[9px] text-slate-500">SERIAL EST.</div>
                    <div className="text-slate-300 font-bold line-through">
                      {selectedJob.totalSerialEstMs} ms
                    </div>
                  </div>
                  <div className="p-2 px-3 rounded-lg bg-black/60 border border-emerald-500/40 text-center">
                    <div className="text-[9px] text-emerald-400 font-bold">PARALLEL</div>
                    <div className="text-emerald-400 font-bold text-sm">
                      {selectedJob.actualParallelMs} ms
                    </div>
                  </div>
                  <div className="p-2 px-3 rounded-lg bg-cyan-950 border border-cyan-500/40 text-center">
                    <div className="text-[9px] text-cyan-300 font-bold">SPEEDUP</div>
                    <div className="text-cyan-300 font-bold text-sm">
                      {selectedJob.speedupFactor}x FASTER
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Click Parallel Preset Buttons */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>DISPATCH PARALLEL BORDER WORKLOAD:</span>
                  <span className="text-slate-500">1-CLICK DISTRIBUTE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      key: 'perimeter_sweep_9cam',
                      title: '9-Sector Perimeter Sweep',
                      desc: 'Parallel 9-cam YOLOv8 + Homography + QRT readiness',
                    },
                    {
                      key: 'suspect_reid_multicam',
                      title: 'Cross-Cam Target Re-ID',
                      desc: 'Deep OSNet embedding + transit graph handover',
                    },
                    {
                      key: 'defcon1_lockdown',
                      title: 'Defcon-1 Sector Lockdown',
                      desc: 'Tripwire laser audit + physical crash gate seals',
                    },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => {
                        setActivePresetKey(btn.key);
                        handleDispatchJob(btn.key);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        activePresetKey === btn.key
                          ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                          : 'bg-black/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{btn.title}</span>
                        <Play size={12} className="text-cyan-400 fill-current" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans">{btn.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parallel Subtasks Pipeline Breakdown */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={13} className="text-cyan-400" />
                  <span>PARALLEL WORKER SUBTASK DECOMPOSITION (EXECUTED SIMULTANEOUSLY):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedJob.subTasks.map((st) => {
                    const Icon = getAgentIcon(st.agentId);
                    return (
                      <div
                        key={st.id}
                        className="p-3.5 rounded-xl border bg-black/50 text-xs transition-all relative overflow-hidden"
                        style={{ borderColor: `${st.color}35` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="p-1 rounded"
                              style={{ backgroundColor: `${st.color}20`, color: st.color }}
                            >
                              <Icon size={14} />
                            </div>
                            <span className="font-bold text-white text-[11px]">{st.agentName}</span>
                            <span className="text-[9px] text-slate-500">[{st.role}]</span>
                          </div>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono"
                            style={{ borderColor: `${st.color}40`, color: st.color }}
                          >
                            {st.durationMs} ms
                          </span>
                        </div>

                        <p className="font-bold text-white text-xs mb-1">{st.taskTitle}</p>
                        <p className="text-[10.5px] text-slate-300 font-sans mb-2 leading-tight">
                          {st.details}
                        </p>

                        <div className="p-2 rounded bg-black/60 border border-white/5 text-[9.5px] text-slate-400 space-y-1">
                          <div className="flex items-center gap-1 text-slate-300 font-sans">
                            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                            <span>{st.outputSummary}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                            <span>ARTIFACTS:</span>
                            <span className="text-cyan-400 truncate">{st.artifactsProduced.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Consensus Output Box */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>MASTER ORCHESTRATOR SYNTHESIS</span>
                </div>
                <p className="text-slate-200 font-sans text-xs leading-relaxed">
                  {selectedJob.consensusOutput}
                </p>
              </div>

              {/* Custom Command Dispatch Bar */}
              <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="Enter custom task: 'Audit sector Charlie, calculate blindspots, and alert patrol'..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !customCommand.trim()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Zap size={14} />
                  <span>DECOMPOSE &amp; RUN</span>
                </button>
              </form>
            </>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs font-sans leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                {[
                  {
                    title: 'Tactical Matrix [SEC-01]',
                    view: 'dashboard',
                    desc: 'Real-time 9-camera operational matrix. Click any camera for instant full telemetry.',
                  },
                  {
                    title: 'Autonomous AI Swarm [AI_SWARM]',
                    view: 'agents',
                    desc: '4 specialized AI agents that continuously deliberate and score perimeter threats.',
                  },
                  {
                    title: 'Incident Inspector [FORENSIC]',
                    view: 'inspector',
                    desc: 'Forensic frame scrubber, multi-modal behavior timeline, and SHA-256 evidence seals.',
                  },
                  {
                    title: 'Target Journey [JOURNEY]',
                    view: 'target-journey',
                    desc: 'Cross-camera homography handover tracking target trajectories across boundary sectors.',
                  },
                  {
                    title: 'Threat Heatmap [HEATMAP]',
                    view: 'threat-map',
                    desc: 'Dynamic spatial density heatmap highlighting frequent breach corridors.',
                  },
                  {
                    title: 'Evidence Vault [FORENSIC_REC]',
                    view: 'evidence-queue',
                    desc: 'Cryptographic SHA-256 sealed video files with immutable chain-of-custody.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-800 bg-black/50 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs font-mono">{item.title}</h4>
                      <p className="text-slate-400 text-[11px] mt-1 font-sans">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        onNavigateView(item.view as ViewMode);
                        onClose();
                      }}
                      className="mt-3 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <span>OPEN VIEW</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl border border-slate-800 bg-black/60 space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400">
                  PARALLEL MULTI-AGENT WORKLOAD EXECUTION GRAPH
                </h4>
                <div className="space-y-2 text-[11px] text-slate-300 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <strong>1. Task Ingestion:</strong> Lead Orchestrator receives high-level operator request.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <strong>2. Task Decomposition:</strong> Breaks job into 4 independent subtasks (Vision, Homography, Dispatch, Audit).
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <strong>3. Concurrent Execution:</strong> All 4 agents execute subtasks concurrently in parallel worker threads.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <strong>4. Consensus Synthesis:</strong> Aggregates subtask outputs and calculates joint consensus in &lt; 45ms.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
