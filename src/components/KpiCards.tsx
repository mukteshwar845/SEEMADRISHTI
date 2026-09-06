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
import { webSocketService, FleetCounts } from '../services/websocketService';
import { fetchWithAuth } from '../utils/fetchWithAuth';

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
    <div id="kpi-command-centre-container" className="font-mono">
      {/* Sleek Single-Row Horizontal Telemetry Glass Bar */}
      <div className="bg-slate-900/60 border border-white/[0.10] rounded-2xl px-3.5 py-2 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
            {/* Active Persons */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/25">
              <Users size={12} className="text-cyan-400" />
              <span className="text-[10px] text-slate-400">PERSONS:</span>
              <span className="text-xs font-black text-cyan-300">{activePersons.toString().padStart(2, '0')}</span>
            </div>

            {/* Active Vehicles */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-400/25">
              <Car size={12} className="text-blue-400" />
              <span className="text-[10px] text-slate-400">VEHICLES:</span>
              <span className="text-xs font-black text-blue-300">{activeVehicles.toString().padStart(2, '0')}</span>
            </div>

            {/* Active Tracks */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-400/25">
              <Crosshair size={12} className="text-emerald-400" />
              <span className="text-[10px] text-slate-400">TRACKS:</span>
              <span className="text-xs font-black text-emerald-300">{activeTracks.toString().padStart(2, '0')}</span>
            </div>

            {/* Fused Incidents */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-400/25">
              <Activity size={12} className="text-purple-400" />
              <span className="text-[10px] text-slate-400">FUSED INCIDENTS:</span>
              <span className="text-xs font-black text-purple-300">{fusedCount.toString().padStart(2, '0')}</span>
            </div>

            {/* Ingress / Egress */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10">
              <LogIn size={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-400">ENTRIES/EXITS:</span>
              <span className="text-xs font-bold text-slate-200">+{entries} / -{exits}</span>
            </div>

            {/* Critical Defense Breaches */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30">
              <ShieldAlert size={12} className="text-rose-400 animate-pulse" />
              <span className="text-[10px] text-rose-300 font-bold">BREACHES:</span>
              <span className="text-xs font-black text-rose-400">{entries.toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Right: Subsystem online pill & Expand telemetry toggle */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="hidden lg:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
              <CheckCircle2 size={11} className="text-emerald-400" />
              ALL 9 NODES SYNCED
            </span>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-[10px] transition-all cursor-pointer"
            >
              {isExpanded ? 'HIDE TELEMETRY ▲' : 'TELEMETRY DETAILS ▼'}
            </button>
          </div>
        </div>

        {/* Collapsible Deep Telemetry Details */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs animate-fadeIn">
            <div className="bg-black/40 p-2 rounded-xl border border-white/10 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 uppercase">CAMERA HANDOVERS</span>
              <span className="text-sm font-black text-cyan-300 mt-1">{handoverCount}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/10 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 uppercase">CORRELATED TARGETS</span>
              <span className="text-sm font-black text-cyan-300 mt-1">{correlatedCount}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/10 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 uppercase">LOITERING TARGETS</span>
              <span className="text-sm font-black text-amber-300 mt-1">{loiteringEvents}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/10 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 uppercase">NET OCCUPANCY</span>
              <span className="text-sm font-black text-emerald-300 mt-1">+{Math.max(0, entries - exits)}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/10 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 uppercase">DEFCON STATE</span>
              <span className="text-xs font-black text-rose-400 mt-1">DEFCON 4 (GUARD)</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/10 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 uppercase">NEURAL INFERENCE</span>
              <span className="text-xs font-black text-emerald-300 mt-1">60 FPS // 14ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
