import React from 'react';
import { Video, ShieldCheck, TriangleAlert, Cpu, ArrowUpRight, Radio, Eye, Activity } from 'lucide-react';

interface KpiCardsProps {
  totalCameras?: number;
  activeCameras?: number;
  alertsToday?: number;
  totalDetections?: number | string;
  onCardClick?: (metric: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalCameras = 9,
  activeCameras = 9,
  alertsToday = 19,
  totalDetections = '4,892',
  onCardClick,
}) => {
  return (
    <div
      id="kpi-metrics-grid"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {/* 1. Total Cameras: 9 */}
      <div
        id="kpi-total-cameras"
        onClick={() => onCardClick && onCardClick('cameras')}
        className="hud-corner-brackets bg-slate-900 border border-slate-800 hover:border-cyan-400 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 shadow-xl relative overflow-hidden group hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-sky-400 to-transparent opacity-80 group-hover:opacity-100 shadow-[0_0_8px_#00f0ff]" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-mono font-bold tracking-[0.2em] text-cyan-400">
            TOTAL CAMERAS
          </span>
          <div className="p-1.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
            <Video size={13} />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">{totalCameras}</p>
          <span className="text-[9px] font-mono text-cyan-300 font-bold bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/30">
            SECTORS A-I
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span className="text-emerald-400">{totalCameras} ALLOCATED NODES</span>
          <ArrowUpRight size={12} className="text-cyan-400 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* 2. Active Feeds */}
      <div
        id="kpi-active-cameras"
        onClick={() => onCardClick && onCardClick('active')}
        className="hud-corner-green bg-slate-900 border border-slate-800 hover:border-emerald-400 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 shadow-xl relative overflow-hidden group hover:shadow-[0_0_20px_rgba(0,255,102,0.15)]"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-300 to-transparent opacity-80 group-hover:opacity-100 shadow-[0_0_8px_#00ff66]" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-mono font-bold tracking-[0.2em] text-emerald-400">
            ACTIVE FEEDS
          </span>
          <div className="p-1.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <Radio size={13} className="animate-pulse" />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]">
            {activeCameras}
          </p>
          <span className="text-[9px] font-mono text-emerald-300 font-bold bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${activeCameras === totalCameras ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            {Math.round(((activeCameras || 0) / (totalCameras || 1)) * 100)}% ONLINE
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span>{activeCameras === totalCameras ? 'ALL CHANNELS SYNCHRONIZED' : `${totalCameras - activeCameras} NODES REQUIRE ATTENTION`}</span>
          <ArrowUpRight size={12} className="text-emerald-400 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* 3. Alerts Today */}
      <div
        id="kpi-alerts-today"
        onClick={() => onCardClick && onCardClick('alerts')}
        className="hud-corner-red bg-slate-900 border border-slate-800 hover:border-rose-400 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 shadow-xl relative overflow-hidden group hover:shadow-[0_0_25px_rgba(255,0,85,0.2)]"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-pink-400 to-transparent opacity-90 group-hover:opacity-100 shadow-[0_0_10px_#ff0055]" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-mono font-bold tracking-[0.2em] text-rose-400">
            ALERTS TODAY
          </span>
          <div className="p-1.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <TriangleAlert size={13} className="animate-pulse text-rose-400" />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,0,85,0.6)]">
            {alertsToday}
          </p>
          <span className="text-[9px] font-mono text-rose-300 font-bold bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/50">
            {alertsToday > 0 ? `${alertsToday} LOGGED` : 'ZERO THREATS'}
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-rose-400">
          <span>{alertsToday > 0 ? 'REAL-TIME BREACHES' : 'PERIMETER SECURE'}</span>
          <ArrowUpRight size={12} className="text-rose-400 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* 4. Total Detections */}
      <div
        id="kpi-total-detections"
        onClick={() => onCardClick && onCardClick('detections')}
        className="hud-corner-brackets bg-slate-900 border border-slate-800 hover:border-purple-400 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 shadow-xl relative overflow-hidden group hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-400 to-transparent opacity-80 group-hover:opacity-100 shadow-[0_0_8px_#a855f7]" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-mono font-bold tracking-[0.2em] text-purple-400">
            TOTAL DETECTIONS
          </span>
          <div className="p-1.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40">
            <Cpu size={13} />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-purple-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]">
            {totalDetections}
          </p>
          <span className="text-[9px] font-mono text-purple-300 font-bold bg-purple-950/90 px-1.5 py-0.5 rounded border border-purple-500/30">
            YOLOv8 EDGE INFERENCE
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span>EVENT STREAM ACTIVE</span>
          <ArrowUpRight size={12} className="text-purple-400 group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
};


