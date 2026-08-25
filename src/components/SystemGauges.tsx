import React from 'react';
import { SystemTelemetry } from '../types';
import { Cpu, HardDrive, Network, Layers, Activity } from 'lucide-react';

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
          JETSON ORIN AGX // 60 FPS ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" id="telemetry-gauges-grid">
        {/* 1. CPU 45% */}
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
                strokeDasharray="45, 100"
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-emerald-300 font-mono">
              45%
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <Cpu size={12} className="text-emerald-400" />
              <span>CPU LOAD</span>
            </div>
            <p className="text-[12px] font-mono text-emerald-400 font-bold mt-0.5">
              45% (8-Core)
            </p>
          </div>
        </div>

        {/* 2. GPU 6.2GB */}
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
                strokeDasharray="39, 100"
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-300 font-mono">
              6.2G
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <Layers size={12} className="text-cyan-400" />
              <span>GPU MEMORY</span>
            </div>
            <p className="text-[12px] font-mono text-cyan-300 font-bold mt-0.5">
              6.2 GB / 16 GB
            </p>
          </div>
        </div>

        {/* 3. Storage 78% */}
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
                strokeDasharray="78, 100"
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-amber-300 font-mono">
              78%
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <HardDrive size={12} className="text-amber-400" />
              <span>STORAGE</span>
            </div>
            <p className="text-[12px] font-mono text-amber-400 font-bold mt-0.5">
              78% (2.34 / 3 TB)
            </p>
          </div>
        </div>

        {/* 4. Network 250Mbps */}
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
                strokeDasharray="80, 100"
                strokeLinecap="round"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 5px rgba(192,132,252,0.7))' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-purple-300 font-mono">
              250M
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 font-mono">
              <Network size={12} className="text-purple-400" />
              <span>NETWORK</span>
            </div>
            <p className="text-[12px] font-mono text-purple-400 font-bold mt-0.5">
              250 Mbps (Stable)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


