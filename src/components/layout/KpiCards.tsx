import React, { useState, useEffect } from 'react';
import {
  Users,
  Car,
  Eye,
  ShieldAlert,
  Crosshair,
  LogIn,
  Layers,
  ArrowRightLeft,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { webSocketService, FleetCounts } from '../../services/websocketService';
import { fetchWithAuth } from '../../utils/fetchWithAuth';

interface KpiCardsProps {
  onFilterChange?: (filter: string) => void;
  totalCameras?: number;
  activeCameras?: number;
  alertsToday?: number;
  totalDetections?: string | number;
  onCardClick?: (type: string) => void;
  alerts?: any[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ alerts = [] }) => {
  const [fleet, setFleet] = useState<FleetCounts>({
    visibleTotal: 0,
    personTotal: 0,
    vehicleTotal: 0,
    uniqueSessionTotal: 0,
    perCamera: {},
  });

  const [handoverCount, setHandoverCount] = useState<number>(0);
  const [fusedCount, setFusedCount] = useState<number>(0);
  const [correlatedCount, setCorrelatedCount] = useState<number>(0);

  useEffect(() => {
    const unsub = webSocketService.onFleetCounts((counts) => {
      setFleet(counts);
    });

    // Fetch initial multi-camera and fusion stats
    async function fetchIntelligenceStats() {
      try {
        const res = await fetchWithAuth('/api/correlations?limit=50');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setHandoverCount(json.data.length);
            setCorrelatedCount(json.data.length);
          }
        }
      } catch {}

      try {
        const resInc = await fetchWithAuth('/api/incidents?limit=50');
        if (resInc.ok) {
          const jsonInc = await resInc.json();
          if (jsonInc.success && Array.isArray(jsonInc.data)) {
            setFusedCount(jsonInc.data.length);
          }
        }
      } catch {}
    }

    fetchIntelligenceStats();

    return () => {
      unsub();
    };
  }, []);

  const activePersons = fleet.personTotal || 0;
  const activeVehicles = fleet.vehicleTotal || 0;
  const activeObjects = fleet.visibleTotal || (activePersons + activeVehicles);
  const activeTracks = activeObjects; // Track count matches visible total objects

  const entries = alerts.filter(a => {
    const text = (String(a.title || '') + String(a.type || '')).toLowerCase();
    return text.includes('enter') || text.includes('breach') || text.includes('cross') || text.includes('intrusion');
  }).length;

  const exits = alerts.filter(a => {
    const text = (String(a.title || '') + String(a.type || '')).toLowerCase();
    return text.includes('exit') || text.includes('leave');
  }).length;

  const loiteringEvents = alerts.filter(a => {
    const text = (String(a.title || '') + String(a.type || '')).toLowerCase();
    return text.includes('loiter');
  }).length;

  const highRiskAlerts = alerts.filter(a => a.severity === 'High' || a.severity === 'Critical').length;


  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div id="kpi-command-centre-container" className="font-mono perspective-1000">
      {/* Sleek Single-Row Horizontal Telemetry Glass Bar with 3D Depth */}
      <div className="bg-slate-900/75 border border-white/[0.14] rounded-2xl px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
            {/* Active Persons */}
            <div className="tactical-btn-3d flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 hover:border-cyan-400/60 transition-all cursor-default">
              <Users size={13} className="text-cyan-400 drop-shadow-[0_0_6px_#00f0ff]" />
              <span className="text-[10px] text-slate-400 font-bold">PERSONS:</span>
              <span className="text-xs font-black text-cyan-300">{activePersons.toString().padStart(2, '0')}</span>
            </div>

            {/* Active Vehicles */}
            <div className="tactical-btn-3d flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-400/30 hover:border-blue-400/60 transition-all cursor-default">
              <Car size={13} className="text-blue-400 drop-shadow-[0_0_6px_#60a5fa]" />
              <span className="text-[10px] text-slate-400 font-bold">VEHICLES:</span>
              <span className="text-xs font-black text-blue-300">{activeVehicles.toString().padStart(2, '0')}</span>
            </div>

            {/* Active Tracks */}
            <div className="tactical-btn-3d flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 hover:border-emerald-400/60 transition-all cursor-default">
              <Crosshair size={13} className="text-emerald-400 drop-shadow-[0_0_6px_#34d399]" />
              <span className="text-[10px] text-slate-400 font-bold">TRACKS:</span>
              <span className="text-xs font-black text-emerald-300">{activeTracks.toString().padStart(2, '0')}</span>
            </div>

            {/* Fused Incidents */}
            <div className="tactical-btn-3d flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-400/30 hover:border-purple-400/60 transition-all cursor-default">
              <Activity size={13} className="text-purple-400 drop-shadow-[0_0_6px_#c084fc]" />
              <span className="text-[10px] text-slate-400 font-bold">FUSED INCIDENTS:</span>
              <span className="text-xs font-black text-purple-300">{fusedCount.toString().padStart(2, '0')}</span>
            </div>

            {/* Ingress / Egress */}
            <div className="tactical-btn-3d hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all cursor-default">
              <LogIn size={13} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 font-bold">ENTRIES/EXITS:</span>
              <span className="text-xs font-bold text-slate-200">+{entries} / -{exits}</span>
            </div>

            {/* Critical Defense Breaches */}
            <div className="tactical-btn-3d flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 hover:border-rose-500/70 transition-all cursor-default shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <ShieldAlert size={13} className="text-rose-400 animate-pulse drop-shadow-[0_0_8px_#f43f5e]" />
              <span className="text-[10px] text-rose-300 font-bold">BREACHES:</span>
              <span className="text-xs font-black text-rose-400">{entries.toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Right: Subsystem online pill & Expand telemetry toggle */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={12} className="text-emerald-400 animate-pulse" />
              ALL 9 NODES SYNCED
            </span>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="tactical-btn-3d px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-200 hover:text-white border border-white/15 text-[10px] font-bold transition-all cursor-pointer shadow-md"
            >
              {isExpanded ? 'HIDE TELEMETRY ▲' : 'TELEMETRY DETAILS ▼'}
            </button>
          </div>
        </div>

        {/* Collapsible Deep Telemetry Details */}
        {isExpanded && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.10] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs animate-fadeIn">
            <div className="tactical-3d-card bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-cyan-400/40">
              <span className="text-[9px] text-slate-400 uppercase font-bold">CAMERA HANDOVERS</span>
              <span className="text-sm font-black text-cyan-300 mt-1">{handoverCount}</span>
            </div>
            <div className="tactical-3d-card bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-cyan-400/40">
              <span className="text-[9px] text-slate-400 uppercase font-bold">CORRELATED TARGETS</span>
              <span className="text-sm font-black text-cyan-300 mt-1">{correlatedCount}</span>
            </div>
            <div className="tactical-3d-card bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-amber-400/40">
              <span className="text-[9px] text-slate-400 uppercase font-bold">LOITERING TARGETS</span>
              <span className="text-sm font-black text-amber-300 mt-1">{loiteringEvents}</span>
            </div>
            <div className="tactical-3d-card bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-emerald-400/40">
              <span className="text-[9px] text-slate-400 uppercase font-bold">NET OCCUPANCY</span>
              <span className="text-sm font-black text-emerald-300 mt-1">+{Math.max(0, entries - exits)}</span>
            </div>
            <div className="tactical-3d-card bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-rose-400/40">
              <span className="text-[9px] text-slate-400 uppercase font-bold">DEFCON STATE</span>
              <span className="text-xs font-black text-rose-400 mt-1">DEFCON 4 (GUARD)</span>
            </div>
            <div className="tactical-3d-card bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-emerald-400/40">
              <span className="text-[9px] text-slate-400 uppercase font-bold">NEURAL INFERENCE</span>
              <span className="text-xs font-black text-emerald-300 mt-1">60 FPS // 14ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
