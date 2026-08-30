import React, { useState, useEffect } from 'react';
import { SystemTelemetry } from '../types';
import { Cpu, HardDrive, Network, Layers, Activity, ShieldAlert, AlertTriangle } from 'lucide-react';
import { fetchBehaviorChains } from '../services/api';
import { webSocketService } from '../services/websocketService';

interface SystemGaugesProps {
  telemetry?: SystemTelemetry;
}

export const SystemGauges: React.FC<SystemGaugesProps> = ({
  telemetry = {
    cpuUsage: 45,
    cpuLoad: '45%',
    memoryUsedGb: 6.2,
    memoryTotalGb: 16,
    storageUsedPercent: 78,
    storageUsedTb: 2.34,
    storageTotalTb: 3.0,
    networkMbps: 250,
    networkStatus: '(Stable 250Mbps)',
  },
}) => {
  const [chainKpis, setChainKpis] = useState<{
    active_chains: number;
    suspicious_patterns: number;
    critical_chains: number;
    insufficient_data: boolean;
  }>({
    active_chains: 0,
    suspicious_patterns: 0,
    critical_chains: 0,
    insufficient_data: false,
  });

  useEffect(() => {
    fetchBehaviorChains()
      .then((res) => {
        if (res.kpis) {
          setChainKpis({
            ...res.kpis,
            insufficient_data: res.data?.length === 0,
          });
        }
      })
      .catch(() => {});

    const unsub = webSocketService.onBehaviorChain((chain) => {
      if (chain) {
        setChainKpis((prev) => ({
          active_chains: Math.max(prev.active_chains, 1),
          suspicious_patterns:
            chain.behavior_pattern && chain.behavior_pattern !== 'NORMAL_MOVEMENT'
              ? Math.max(prev.suspicious_patterns, 1)
              : prev.suspicious_patterns,
          critical_chains:
            chain.risk_level === 'CRITICAL' ? Math.max(prev.critical_chains, 1) : prev.critical_chains,
          insufficient_data: false,
        }));
      }
    });

    return () => {
      unsub();
    };
  }, []);

  const cpuPercent = Math.min(100, Math.max(0, Math.round(telemetry?.cpuUsage ?? 45)));
  const memUsed = telemetry?.memoryUsedGb ?? 6.2;
  const memTotal = telemetry?.memoryTotalGb ?? 16;
  const memPercent = Math.min(100, Math.max(0, Math.round((memUsed / (memTotal || 1)) * 100)));
  const storPercent = Math.min(100, Math.max(0, Math.round(telemetry?.storageUsedPercent ?? 78)));
  const storUsed = telemetry?.storageUsedTb ?? 2.34;
  const storTotal = telemetry?.storageTotalTb ?? 3.0;
  const netMbps = telemetry?.networkMbps ?? 250;
  const netPercent = Math.min(100, Math.max(0, Math.round((netMbps / 1000) * 100)));

  return (
    <div
      id="system-status-section"
      className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 sm:p-4 shadow-xl"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#00f0ff]"></span>
          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-widest font-mono">
            HARDWARE TELEMETRY &amp; AI INFERENCE ENGINE
          </h3>
        </div>
        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
          EDGE AI NODE // REAL-TIME METRICS
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" id="telemetry-gauges-grid">
        {/* 1. CPU Load */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/90" id="gauge-cpu">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
              <path
                className="stroke-slate-800"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-emerald-400"
                strokeWidth="3.5"
                strokeDasharray={`${cpuPercent}, 100`}
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-emerald-300 font-mono">
              {cpuPercent}%
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <Cpu size={12} className="text-emerald-400" />
              <span>CPU LOAD</span>
            </div>
            <p className="text-[12px] font-mono text-emerald-400 font-bold mt-0.5">
              {cpuPercent}% Capacity
            </p>
          </div>
        </div>

        {/* 2. GPU / System Memory */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/90" id="gauge-memory">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
              <path
                className="stroke-slate-800"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-cyan-400"
                strokeWidth="3.5"
                strokeDasharray={`${memPercent}, 100`}
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-300 font-mono">
              {memUsed.toFixed(1)}G
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <Layers size={12} className="text-cyan-400" />
              <span>MEMORY</span>
            </div>
            <p className="text-[12px] font-mono text-cyan-300 font-bold mt-0.5">
              {memUsed.toFixed(1)} GB / {memTotal} GB
            </p>
          </div>
        </div>

        {/* 3. Storage */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/90" id="gauge-storage">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
              <path
                className="stroke-slate-800"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-amber-400"
                strokeWidth="3.5"
                strokeDasharray={`${storPercent}, 100`}
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-amber-300 font-mono">
              {storPercent}%
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <HardDrive size={12} className="text-amber-400" />
              <span>STORAGE</span>
            </div>
            <p className="text-[12px] font-mono text-amber-400 font-bold mt-0.5">
              {storPercent}% ({storUsed.toFixed(2)} / {storTotal} TB)
            </p>
          </div>
        </div>

        {/* 4. Network Link */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/90" id="gauge-network">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
              <path
                className="stroke-slate-800"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-purple-400"
                strokeWidth="3.5"
                strokeDasharray={`${netPercent}, 100`}
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(192,132,252,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-purple-300 font-mono">
              {netMbps}M
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <Network size={12} className="text-purple-400" />
              <span>NETWORK</span>
            </div>
            <p className="text-[12px] font-mono text-purple-400 font-bold mt-0.5">
              {netMbps} Mbps (Active)
            </p>
          </div>
        </div>
      </div>

      {/* Phase 19: Threat Behavior Chain Operational Intelligence KPIs */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-rose-400" />
          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
            THREAT BEHAVIOR CHAINS:
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">ACTIVE CHAINS:</span>
            <span className="font-bold text-cyan-400">
              {chainKpis.insufficient_data ? '0' : String(chainKpis.active_chains).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">SUSPICIOUS:</span>
            <span className="font-bold text-amber-400">
              {chainKpis.insufficient_data ? '0' : String(chainKpis.suspicious_patterns).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">CRITICAL:</span>
            <span className="font-bold text-rose-400">
              {chainKpis.insufficient_data ? '0' : String(chainKpis.critical_chains).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


