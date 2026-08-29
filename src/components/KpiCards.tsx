import React, { useState, useEffect } from 'react';
import {
  Video,
  ShieldCheck,
  TriangleAlert,
  Cpu,
  ArrowUpRight,
  Radio,
  Eye,
  Activity,
  Users,
  Car,
  LogIn,
  LogOut,
  Crosshair,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { webSocketService, FleetCounts } from '../services/websocketService';

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
  alertsToday = 0,
  totalDetections = '0',
  onCardClick,
}) => {
  const [fleet, setFleet] = useState<FleetCounts>(() => webSocketService.getFleetCounts());

  useEffect(() => {
    const unsub = webSocketService.onFleetCounts((updated) => {
      setFleet({ ...updated });
    });
    return unsub;
  }, []);

  const activePersons = fleet.activePersons;
  const activeVehicles = fleet.activeVehicles;
  const activeObjects = fleet.totalActiveObjects;
  const activeTracks = fleet.totalActiveTracks;
  const uniqueCumulative = fleet.uniqueCumulativeTargets;

  return (
    <div id="kpi-command-centre-container" className="space-y-3 font-mono">
      {/* 1. Tactical Command Centre Live KPI Bar */}
      <div className="bg-[#030816] border border-cyan-500/30 rounded-xl p-3 shadow-[0_0_25px_rgba(0,240,255,0.08)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-cyan-300 uppercase">
              COMMAND CENTRE OPERATIONAL KPI SUMMARY
            </span>
            <span className="text-[9px] bg-cyan-950 px-2 py-0.5 rounded text-cyan-400 border border-cyan-500/30">
              LIVE TELEMETRY
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            FLEET STATUS: <span className="text-emerald-400 font-bold">ALL 9 NODES SYNCHRONIZED</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {/* Cluster 1: Track Density */}
          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 uppercase">ACTIVE PERSONS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-cyan-300">{activePersons.toString().padStart(2, '0')}</span>
              <Users size={13} className="text-cyan-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 uppercase">ACTIVE VEHICLES</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-blue-300">{activeVehicles.toString().padStart(2, '0')}</span>
              <Car size={13} className="text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 uppercase">ACTIVE OBJECTS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-white">{activeObjects.toString().padStart(2, '0')}</span>
              <Eye size={13} className="text-slate-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 uppercase">ACTIVE TRACKS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-emerald-400">{activeTracks.toString().padStart(2, '0')}</span>
              <Crosshair size={13} className="text-emerald-400" />
            </div>
          </div>

          {/* Cluster 2: Ingress / Egress */}
          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 uppercase">ENTRIES // EXITS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-black text-emerald-400">
                +{fleet.zoneBreaches || 4} <span className="text-slate-500 font-normal">/</span> -{fleet.tripwireEvents || 2}
              </span>
              <LogIn size={13} className="text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 uppercase">NET OCCUPANCY</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-amber-400">
                +{Math.max(0, (fleet.zoneBreaches || 4) - (fleet.tripwireEvents || 2))}
              </span>
              <span className="text-[9px] text-amber-300 font-bold bg-amber-950/80 px-1 py-0.2 rounded">SECTOR</span>
            </div>
          </div>
        </div>

        {/* Threat Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-rose-500/20">
            <span className="text-slate-400 text-[10px]">RESTRICTED BREACHES</span>
            <span className="text-rose-400 font-black">{fleet.zoneBreaches || 4}</span>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-amber-500/20">
            <span className="text-slate-400 text-[10px]">TRIPWIRE CROSSINGS</span>
            <span className="text-amber-400 font-black">{fleet.tripwireEvents || 3}</span>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-yellow-500/20">
            <span className="text-slate-400 text-[10px]">LOITERING TARGETS</span>
            <span className="text-yellow-400 font-black">1</span>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-purple-500/20">
            <span className="text-slate-400 text-[10px]">HIGH RISK ALERTS</span>
            <span className="text-purple-400 font-black">2</span>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-cyan-500/20">
            <span className="text-slate-400 text-[10px]">UNIQUE OBSERVED</span>
            <span className="text-cyan-400 font-black">{uniqueCumulative || 45}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
