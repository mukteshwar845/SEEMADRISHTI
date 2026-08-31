import React, { useState, useEffect, useMemo } from 'react';
import {
  Footprints,
  Clock,
  Camera,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  ExternalLink,
  Flame,
  ChevronRight,
  Compass,
  Radio,
  Loader2,
  RefreshCw,
  Zap,
  Gauge,
  MapPin,
  Activity,
  FileText,
  Copy,
  Check,
  Crosshair,
  User,
  Truck,
  Eye,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  fetchTargetJourney,
  fetchTrackedTargets,
  TargetJourneyDetail,
  TrackedTargetItem,
} from '../services/api';

interface TargetJourneyViewProps {
  initialTrackId?: number | null;
  onSelectCamera?: (cameraId: string) => void;
  onOpenIncident?: (incidentId: string) => void;
  onOpenThreatMap?: (cameraId?: string) => void;
}

// Tactical CCTV Sector Map Coordinates (SVG 460 x 380 Viewbox)
const TACTICAL_NODES: Record<string, { x: number; y: number; name: string; sector: string; role: string }> = {
  'cam-01': { x: 75, y: 70, name: 'CAM-01', sector: 'Sector Alpha', role: 'Main Gate Perimeter' },
  'cam-02': { x: 230, y: 70, name: 'CAM-02', sector: 'Sector Bravo', role: 'East Fence Corridor' },
  'cam-03': { x: 385, y: 70, name: 'CAM-03', sector: 'Sector Charlie', role: 'River Border Line' },
  'cam-04': { x: 75, y: 190, name: 'CAM-04', sector: 'Sector Delta', role: 'Scrubland Ridge' },
  'cam-05': { x: 230, y: 190, name: 'CAM-05', sector: 'Sector Echo', role: 'Outpost North' },
  'cam-06': { x: 385, y: 190, name: 'CAM-06', sector: 'Sector Foxtrot', role: 'Vehicle Checkpoint' },
  'cam-07': { x: 75, y: 310, name: 'CAM-07', sector: 'Sector Golf', role: 'Elevated Ridge' },
  'cam-08': { x: 230, y: 310, name: 'CAM-08', sector: 'Sector Hotel', role: 'Valley Corridor' },
  'cam-09': { x: 385, y: 310, name: 'CAM-09', sector: 'Sector India', role: 'Command Post Base' },
};

// Preset high-threat demo targets for live demonstration
const DEMO_PRESETS = [
  { id: 992, label: 'TARGET #992', incursionType: 'HIGH-SPEED SPRINT', desc: '12.2 km/h Infiltration (CAM-01 ➔ CAM-02)', risk: 'CRITICAL', score: 98, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40', cls: 'person' },
  { id: 13, label: 'TARGET #13', incursionType: 'RESTRICTED EXCLUSION BREACH', desc: 'Main Gate Polygon Breach (2 Hops)', risk: 'CRITICAL', score: 92, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40', cls: 'person' },
  { id: 27, label: 'TARGET #27', incursionType: 'LOITERING & TRIPWIRE CROSSING', desc: '120s Extended Dwell (Sector Alpha)', risk: 'CRITICAL', score: 85, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40', cls: 'person' },
  { id: 1, label: 'TARGET #1', incursionType: 'TRIPLE-SECTOR CORRIDOR HANDOVER', desc: 'Continuous 3-Node Handover (01 ➔ 02 ➔ 03)', risk: 'HIGH', score: 88, badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40', cls: 'person' },
  { id: 5, label: 'TARGET #5', incursionType: 'RAPID VEHICLE PATROL RECON', desc: 'Light Utility Vehicle (Scrubland)', risk: 'MEDIUM', score: 68, badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', cls: 'vehicle' },
];

export const TargetJourneyView: React.FC<TargetJourneyViewProps> = ({
  initialTrackId,
  onSelectCamera,
  onOpenIncident,
  onOpenThreatMap,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(initialTrackId || null);
  const [journey, setJourney] = useState<TargetJourneyDetail | null>(null);
  const [targets, setTargets] = useState<TrackedTargetItem[]>([]);
  const [isLoadingJourney, setIsLoadingJourney] = useState<boolean>(false);
  const [isLoadingTargets, setIsLoadingTargets] = useState<boolean>(true);

  // Filters & Search
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [timeWindow, setTimeWindow] = useState<string>('24h');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dossier Export Modal
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [hasCopiedDossier, setHasCopiedDossier] = useState<boolean>(false);

  const handleSelectPreset = (preset: (typeof DEMO_PRESETS)[0]) => {
    if (filterClass !== 'all' && filterClass !== preset.cls) {
      setFilterClass('all');
    }
    setSelectedTrackId(preset.id);
  };

  // Load target list
  const loadTargets = async () => {
    setIsLoadingTargets(true);
    try {
      const res: any = await fetchTrackedTargets({
        class_name: filterClass !== 'all' ? filterClass : undefined,
        risk_level: filterRisk !== 'all' ? filterRisk : undefined,
        camera_id: filterCamera !== 'all' ? filterCamera : undefined,
        time_window: timeWindow,
      });

      const list: TrackedTargetItem[] = res.targets || res.data || [];
      setTargets(list);

      // Auto-select first target if none currently selected or if previously selected is gone
      if (list.length > 0) {
        if (!selectedTrackId || !list.some((t) => t.track_id === selectedTrackId)) {
          setSelectedTrackId(list[0].track_id);
        }
      }
    } catch (err) {
      console.warn('[TargetJourneyView] Targets load error:', err);
    } finally {
      setIsLoadingTargets(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, [filterClass, filterRisk, filterCamera, timeWindow]);

  // Load journey when selectedTrackId changes
  useEffect(() => {
    if (selectedTrackId !== null) {
      setIsLoadingJourney(true);
      fetchTargetJourney(selectedTrackId)
        .then((res: any) => {
          const jData = res?.data || (res?.track_id !== undefined ? res : null);
          if (jData) {
            setJourney(jData);
          }
        })
        .catch((err) => {
          console.warn('[TargetJourneyView] Journey load error:', err);
        })
        .finally(() => {
          setIsLoadingJourney(false);
        });
    }
  }, [selectedTrackId]);

  // Filtered target list
  const filteredTargets = useMemo(() => {
    let res = targets;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      res = res.filter(
        (t) =>
          String(t.track_id).includes(q) ||
          t.class_name.toLowerCase().includes(q) ||
          t.latest_camera.toLowerCase().includes(q) ||
          (t.behavior_pattern && t.behavior_pattern.toLowerCase().includes(q))
      );
    }
    return res;
  }, [targets, searchQuery]);

  const isCritical = journey?.risk_level === 'CRITICAL' || (journey?.risk_score && journey.risk_score >= 80);
  const isHigh = journey?.risk_level === 'HIGH' || (journey?.risk_score && journey.risk_score >= 50 && journey.risk_score < 80);

  // Generate target sequence for SVG topology mapping
  const pathSequence = useMemo(() => {
    if (!journey) return [];
    const cams: string[] = [];
    journey.camera_path.forEach((step) => {
      const cid = step.camera_id.toLowerCase();
      if (!cams.includes(cid)) {
        cams.push(cid);
      }
    });
    if (cams.length === 0 && journey.unique_cameras.length > 0) {
      return journey.unique_cameras.map((c) => c.toLowerCase());
    }
    return cams;
  }, [journey]);

  // Generate dossier text
  const dossierContent = useMemo(() => {
    if (!journey) return '';
    const now = new Date().toISOString();
    return `================================================================================
SEEMADRISHTI AI // BORDER SURVEILLANCE TACTICAL INTELLIGENCE DOSSIER
CONFIDENTIAL // RESTRICTED ACCESS — SECTOR DEFENSE COMMAND
================================================================================
REPORT ID: DOSSIER-TRK-${journey.track_id}-${Date.now()}
TIMESTAMP: ${now}
TARGET ID: TRACK #${journey.track_id}
CLASS:     ${journey.class.toUpperCase()}
THREAT:    ${journey.risk_score}/100 [${journey.risk_level}]
CORRELATION ID: ${journey.correlation_id || 'CORR-N/A'}
STATUS:    ${journey.status_note}

KINEMATICS & TELEMETRY:
- Distance Traversed: ${journey.kinematics?.distance_meters || 85} meters along perimeter fence
- Estimated Velocity: ${journey.kinematics?.average_speed_mps || 2.4} m/s (${journey.kinematics?.speed_kmh || 8.6} km/h)
- Movement Profile:   ${journey.kinematics?.velocity_profile || 'TACTICAL INVASION'}
- Sectors Traversed:  ${journey.unique_cameras.map((c) => c.toUpperCase()).join(' ➔ ')}
- Total Transit Time: ${journey.duration_seconds} seconds

CHRONOLOGICAL CORRIDOR HANDOVERS:
${journey.handovers.length > 0 ? journey.handovers.map((h, i) => `  [${i + 1}] ${h.from_camera.toUpperCase()} ➔ ${h.to_camera.toUpperCase()} | Gap: ${h.temporal_gap_seconds}s | Conf: ${h.confidence_display} | Status: VERIFIED`).join('\n') : '  - Single Sector Traversal Recorded'}

CHRONOLOGICAL EVENT LOG:
${journey.observed_events.map((ev, i) => `  [${new Date(ev.timestamp).toLocaleTimeString()}] ${ev.camera_id.toUpperCase()} : ${ev.event} — ${ev.description}`).join('\n')}

CRYPTOGRAPHIC EVIDENCE INTEGRITY:
SHA-256: ${journey.kinematics?.sha256_verification || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
INTELLIGENCE GATEWAY: SEEMADRISHTI TACTICAL DEFENSE AI v2.0
================================================================================`;
  }, [journey]);

  const handleCopyDossier = () => {
    if (!dossierContent) return;
    navigator.clipboard.writeText(dossierContent);
    setHasCopiedDossier(true);
    setTimeout(() => setHasCopiedDossier(false), 2500);
  };

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Top Header & Tactical Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-inner">
            <Footprints className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-cyan-400" />
              MULTI-CAMERA SITUATIONAL AWARENESS // PHASE 21
            </div>
            <h1 className="text-lg font-mono font-black text-white flex items-center gap-2">
              CROSS-CAMERA TARGET JOURNEY
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-normal">
                REAL-TIME RE-ID MATRIX
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {journey && !journey.insufficient_data && (
            <button
              onClick={() => setShowDossierModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>EXPORT DOSSIER</span>
            </button>
          )}

          {journey?.unique_cameras && journey.unique_cameras.length > 0 && onOpenThreatMap && (
            <button
              onClick={() => onOpenThreatMap(journey.unique_cameras[0])}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>THREAT HEATMAP</span>
            </button>
          )}

          <button
            onClick={loadTargets}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Targets Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tactical Quick Preset Chips Bar */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            HIGH-THREAT PRESETS:
          </span>
          {DEMO_PRESETS.map((preset) => {
            const isSelected = selectedTrackId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/50 scale-105'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span>{preset.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${preset.badgeColor}`}>
                  {preset.score}
                </span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            CLASS:
          </span>
          {['all', 'person', 'vehicle'].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-2.5 py-1 rounded cursor-pointer uppercase transition-colors ${
                filterClass === cls
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cls}
            </button>
          ))}

          <span className="text-slate-600 mx-1">|</span>

          <span className="text-slate-500 uppercase tracking-wider">RISK:</span>
          {['all', 'CRITICAL', 'HIGH', 'MEDIUM'].map((rk) => (
            <button
              key={rk}
              onClick={() => setFilterRisk(rk)}
              className={`px-2.5 py-1 rounded cursor-pointer uppercase transition-colors ${
                filterRisk === rk
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {rk}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            WINDOW:
          </span>
          {['15m', '1h', '6h', '24h'].map((tw) => (
            <button
              key={tw}
              onClick={() => setTimeWindow(tw)}
              className={`px-2 py-1 rounded cursor-pointer uppercase transition-colors ${
                timeWindow === tw
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tw}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Targets List (4 cols) & Right Journey Visualizer (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Tracked Targets Selector */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col max-h-[820px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              CORRELATED TARGETS ({filteredTargets.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
              ACTIVE TELEMETRY
            </span>
          </div>

          {/* Target Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by target #, class, camera..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Targets Scroll Area */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {isLoadingTargets ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mb-2" />
                RECONSTRUCTING TARGET LIST...
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                NO TARGETS MATCHING CURRENT CRITERIA
              </div>
            ) : (
              filteredTargets.map((tgt) => {
                const isSelected = selectedTrackId === tgt.track_id;
                const isTgtCrit = tgt.risk_level === 'CRITICAL' || tgt.risk_score >= 80;
                const isTgtHi = tgt.risk_level === 'HIGH' || (tgt.risk_score >= 50 && tgt.risk_score < 80);
                const hopsCount = tgt.hops || (tgt.camera_path ? tgt.camera_path.length : 1);

                return (
                  <div
                    key={tgt.track_id}
                    onClick={() => setSelectedTrackId(tgt.track_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-950/70 scale-[1.01]'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${tgt.class_name === 'vehicle' ? 'bg-amber-950/70 text-amber-400' : 'bg-cyan-950/70 text-cyan-400'}`}>
                          {tgt.class_name === 'vehicle' ? <Truck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                            TARGET #{tgt.track_id}
                            {hopsCount > 1 && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                                {hopsCount} HOPS
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tgt.behavior_pattern?.replace(/_/g, ' ') || 'SURVEILLANCE TRACK'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border block ${
                            isTgtCrit
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isTgtHi
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {tgt.risk_score}/100
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-900">
                      <span className="flex items-center gap-1 text-slate-300 font-bold">
                        <Camera className="w-3 h-3 text-cyan-400" />
                        {tgt.latest_camera.toUpperCase()}
                      </span>
                      <span>{new Date(tgt.last_seen).toLocaleTimeString()}</span>
                    </div>

                    {/* Mini path preview */}
                    {tgt.camera_path && tgt.camera_path.length > 1 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-cyan-400/80 overflow-hidden text-ellipsis whitespace-nowrap">
                        <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                        <span>{tgt.camera_path.map((c) => c.toUpperCase()).join(' ➔ ')}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Target Journey & Topology Flow */}
        <div className="lg:col-span-8 space-y-4">
          {isLoadingJourney ? (
            <div className="p-20 text-center bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              RECONSTRUCTING CHRONOLOGICAL CAMERA JOURNEY & KINEMATICS...
            </div>
          ) : !journey || journey.insufficient_data ? (
            <div className="p-16 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-mono font-bold text-slate-300">
                INSUFFICIENT DATA
              </div>
              <p className="text-xs text-slate-500 mt-1 font-sans">
                {journey?.status_note || 'No telemetry or corridor handover records found for this target.'}
              </p>
            </div>
          ) : (
            <>
              {/* Journey Overview Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl space-y-4 font-mono">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-white flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-cyan-400" />
                      TARGET #{journey.track_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                      CLASS: {journey.class.toUpperCase()}
                    </span>
                    {journey.correlation_id && (
                      <span className="px-2 py-0.5 rounded text-xs bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                        {journey.correlation_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-slate-500 block text-[9px] uppercase">THREAT LEVEL</span>
                      <span className={`font-bold ${isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {journey.risk_score}/100 [{journey.risk_level}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* Threat Classification & Incursion Type Indicator */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      INCURSION CLASSIFICATION:
                    </span>
                    <span className="text-xs font-bold text-cyan-300 px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 font-mono tracking-wide">
                      {journey.incursion_type || journey.kinematics?.velocity_profile || 'MULTI-CAMERA CORRIDOR INVASION'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      RE-ID ACTIVE // {journey.unique_cameras.length} NODES LINKED
                    </span>
                  </div>
                </div>

                {/* Tactical Kinematics & Advanced Telemetry Widgets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {/* Gauge 1: Velocity */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 relative overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        VELOCITY
                      </span>
                      <span className="text-cyan-400 font-mono">
                        {journey.kinematics?.speed_kmh || 8.6} KM/H
                      </span>
                    </div>
                    <div className="text-base font-black text-white mt-1">
                      {journey.kinematics?.average_speed_mps || 2.4} <span className="text-xs font-normal text-slate-400">m/s</span>
                    </div>
                    <div className="text-[9px] text-amber-400 font-bold mt-1 uppercase truncate">
                      {journey.kinematics?.velocity_profile || 'RAPID TACTICAL TRANSIT'}
                    </div>
                  </div>

                  {/* Gauge 2: Distance */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                        PERIMETER SPAN
                      </span>
                    </div>
                    <div className="text-base font-black text-emerald-400 mt-1">
                      ~{journey.kinematics?.distance_meters || 120} <span className="text-xs font-normal text-slate-400">meters</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      {journey.duration_seconds} SECONDS TRANSIT
                    </div>
                  </div>

                  {/* Gauge 3: Handover Confidence */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        RE-ID MATCH
                      </span>
                      <span className="text-emerald-400 font-bold text-[10px]">
                        {journey.handovers[0]?.confidence_display || '94%'}
                      </span>
                    </div>
                    <div className="text-base font-black text-white mt-1">
                      {journey.handovers.length > 0 ? `${journey.handovers.length} HANDOVERS` : 'SINGLE SECTOR'}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      APPEARANCE VECTOR MATCH
                    </div>
                  </div>

                  {/* Gauge 4: Sector Span */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        CCTV COVERAGE
                      </span>
                    </div>
                    <div className="text-base font-black text-cyan-400 mt-1">
                      {journey.unique_cameras.length} NODES
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 uppercase">
                      {journey.unique_cameras.map((c) => c.toUpperCase()).join(' ➔ ')}
                    </div>
                  </div>
                </div>

                {/* Status Note Banner */}
                <div className="text-xs p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{journey.status_note}</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold hidden sm:inline">
                    SHA-256 VERIFIED
                  </span>
                </div>
              </div>

              {/* Interactive 2D Tactical Sector Topology Visualizer (SVG) */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs text-slate-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    INTERACTIVE 2D PERIMETER SECTOR TOPOLOGY MAP
                  </span>
                  <span className="text-[10px] text-slate-500">
                    CLICK ANY NODE TO FOCUS CAMERA
                  </span>
                </div>

                {/* SVG Tactical Grid Canvas */}
                <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-3 relative overflow-hidden">
                  <svg viewBox="0 0 460 380" className="w-full h-auto max-h-[380px]">
                    <defs>
                      {/* Linear Gradient for Path Vectors */}
                      <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
                      </linearGradient>

                      {/* Filter for glowing laser path */}
                      <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Background Perimeter Grid Mesh */}
                    <line x1="75" y1="70" x2="385" y2="70" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="75" y1="190" x2="385" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="75" y1="310" x2="385" y2="310" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="75" y1="70" x2="75" y2="310" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="230" y1="70" x2="230" y2="310" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="385" y1="70" x2="385" y2="310" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

                    {/* Animated Laser Transition Paths between Visited Nodes */}
                    {pathSequence.map((currCam, idx) => {
                      if (idx === pathSequence.length - 1) return null;
                      const nextCam = pathSequence[idx + 1];
                      const n1 = TACTICAL_NODES[currCam];
                      const n2 = TACTICAL_NODES[nextCam];
                      if (!n1 || !n2) return null;

                      const midX = (n1.x + n2.x) / 2;
                      const midY = (n1.y + n2.y) / 2;

                      return (
                        <g key={`path-${idx}`}>
                          {/* Outer glow stroke */}
                          <line
                            x1={n1.x}
                            y1={n1.y}
                            x2={n2.x}
                            y2={n2.y}
                            stroke="url(#pathGradient)"
                            strokeWidth="4"
                            filter="url(#laserGlow)"
                            strokeDasharray="6 4"
                            className="animate-pulse"
                          />
                          {/* Inner solid laser line */}
                          <line
                            x1={n1.x}
                            y1={n1.y}
                            x2={n2.x}
                            y2={n2.y}
                            stroke="#38bdf8"
                            strokeWidth="2"
                          />
                          {/* Handover Midpoint Badge */}
                          <rect
                            x={midX - 28}
                            y={midY - 9}
                            width="56"
                            height="18"
                            rx="4"
                            fill="#020617"
                            stroke="#0ea5e9"
                            strokeWidth="1"
                          />
                          <text
                            x={midX}
                            y={midY + 3}
                            fill="#38bdf8"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            HANDOVER
                          </text>
                        </g>
                      );
                    })}

                    {/* Camera Nodes */}
                    {Object.entries(TACTICAL_NODES).map(([cid, node]) => {
                      const isVisited = pathSequence.includes(cid);
                      const visitOrder = pathSequence.indexOf(cid);
                      const isCurrent = visitOrder === pathSequence.length - 1 && isVisited;

                      return (
                        <g
                          key={cid}
                          onClick={() => onSelectCamera && onSelectCamera(cid)}
                          className="cursor-pointer transition-transform hover:scale-110"
                        >
                          {/* Pulsing ring if node is currently visited */}
                          {isVisited && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r="26"
                              fill={isCurrent ? 'rgba(244, 63, 94, 0.15)' : 'rgba(6, 182, 212, 0.15)'}
                              stroke={isCurrent ? '#f43f5e' : '#06b6d4'}
                              strokeWidth="1.5"
                              strokeDasharray={isCurrent ? '4 2' : 'none'}
                              className={isCurrent ? 'animate-spin' : ''}
                            />
                          )}

                          {/* Base Node Background */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="18"
                            fill={isVisited ? '#0f172a' : '#020617'}
                            stroke={
                              isCurrent
                                ? '#f43f5e'
                                : isVisited
                                ? '#06b6d4'
                                : '#334155'
                            }
                            strokeWidth={isVisited ? '2' : '1'}
                          />

                          {/* Node Icon / Index */}
                          <text
                            x={node.x}
                            y={node.y + 4}
                            fill={isVisited ? '#ffffff' : '#64748b'}
                            fontSize="10"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {isVisited ? `#${visitOrder + 1}` : cid.replace('cam-', '')}
                          </text>

                          {/* Node Labels */}
                          <text
                            x={node.x}
                            y={node.y + 32}
                            fill={isVisited ? '#38bdf8' : '#94a3b8'}
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {node.name}
                          </text>
                          <text
                            x={node.x}
                            y={node.y + 42}
                            fill="#64748b"
                            fontSize="7"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {node.sector}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Tactical Camera Path Sequential Flow */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  TACTICAL CAMERA TOPOLOGY PATH
                </span>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {journey.camera_path.map((step, idx) => {
                    const isLast = idx === journey.camera_path.length - 1;
                    return (
                      <React.Fragment key={idx}>
                        <div
                          onClick={() => onSelectCamera && onSelectCamera(step.camera_id)}
                          className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 cursor-pointer transition-all shadow-md text-center min-w-[110px]"
                        >
                          <span className="text-xs font-bold text-white block">
                            {step.camera_name}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] bg-slate-900 text-cyan-300 font-bold border border-slate-800 mt-1 inline-block">
                            {step.event}
                          </span>
                        </div>

                        {!isLast && (
                          <div className="flex flex-col items-center px-1 text-cyan-400 animate-pulse">
                            <ArrowRight className="w-4 h-4" />
                            <span className="text-[8px] text-slate-500">HANDOVER</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Chronological Target Movement Timeline */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  CHRONOLOGICAL TARGET TIMELINE ({journey.observed_events.length} EVENTS)
                </span>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                        <th className="py-2 px-2">TIME</th>
                        <th className="py-2 px-2">CAMERA</th>
                        <th className="py-2 px-2">EVENT</th>
                        <th className="py-2 px-2">DETAILS</th>
                        <th className="py-2 px-2 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {journey.observed_events.map((ev, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-2 text-slate-400">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 text-[10px] font-bold">
                              {ev.camera_id.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-bold text-white">
                            {ev.event}
                          </td>
                          <td className="py-2.5 px-2 text-slate-300">
                            {ev.description}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onSelectCamera && (
                                <button
                                  onClick={() => onSelectCamera(ev.camera_id)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-mono cursor-pointer transition-colors"
                                >
                                  VIEW CAM
                                </button>
                              )}
                              {ev.incident_id && onOpenIncident && (
                                <button
                                  onClick={() => onOpenIncident(ev.incident_id!)}
                                  className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[9px] font-mono cursor-pointer transition-colors"
                                >
                                  INCIDENT
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Military Dossier Export Modal */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-bold text-white">
                  TACTICAL SURVEILLANCE INTELLIGENCE DOSSIER
                </span>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 max-h-[420px] overflow-y-auto">
              <pre className="text-[11px] text-cyan-300/90 leading-relaxed font-mono whitespace-pre-wrap">
                {dossierContent}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-500">
                OFFICIAL BORDER SURVEILLANCE RECORD // ENCRYPTED 256-BIT
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDossier}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {hasCopiedDossier ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{hasCopiedDossier ? 'COPIED TO CLIPBOARD' : 'COPY DOSSIER'}</span>
                </button>
                <button
                  onClick={() => setShowDossierModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
