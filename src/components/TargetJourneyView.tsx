import React, { useState, useEffect } from 'react';
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

  // Filters
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [timeWindow, setTimeWindow] = useState<string>('24h');

  // Load target list
  const loadTargets = async () => {
    setIsLoadingTargets(true);
    try {
      const res = await fetchTrackedTargets({
        class_name: filterClass !== 'all' ? filterClass : undefined,
        risk_level: filterRisk !== 'all' ? filterRisk : undefined,
        camera_id: filterCamera !== 'all' ? filterCamera : undefined,
        time_window: timeWindow,
      });
      if (res.data && res.data.length > 0) {
        setTargets(res.data);
        if (!selectedTrackId) {
          setSelectedTrackId(res.data[0].track_id);
        }
      } else {
        setTargets([]);
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
        .then((res) => {
          if (res.data) {
            setJourney(res.data);
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

  const isCritical = journey?.risk_level === 'CRITICAL' || (journey?.risk_score && journey.risk_score >= 80);
  const isHigh = journey?.risk_level === 'HIGH' || (journey?.risk_score && journey.risk_score >= 50 && journey.risk_score < 80);

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Top Header & Tactical Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Footprints className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
              MULTI-CAMERA SITUATIONAL AWARENESS // PHASE 21
            </div>
            <h1 className="text-lg font-mono font-black text-white flex items-center gap-2">
              CROSS-CAMERA TARGET JOURNEY
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {journey?.unique_cameras && journey.unique_cameras.length > 0 && onOpenThreatMap && (
            <button
              onClick={() => onOpenThreatMap(journey.unique_cameras[0])}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>SHOW ON THREAT MAP</span>
            </button>
          )}
          <button
            onClick={loadTargets}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Targets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            TARGET CLASS:
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
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col max-h-[750px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              CORRELATED TARGETS ({targets.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-400">REAL TELEMETRY</span>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {isLoadingTargets ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mb-2" />
                LOADING RECENT TARGETS...
              </div>
            ) : targets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                NO RECENT TARGETS FOUND IN SELECTED WINDOW
              </div>
            ) : (
              targets.map((tgt) => {
                const isSelected = selectedTrackId === tgt.track_id;
                const isTgtCrit = tgt.risk_level === 'CRITICAL' || tgt.risk_score >= 80;
                const isTgtHi = tgt.risk_level === 'HIGH' || (tgt.risk_score >= 50 && tgt.risk_score < 80);

                return (
                  <div
                    key={tgt.track_id}
                    onClick={() => setSelectedTrackId(tgt.track_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/70 shadow-lg shadow-cyan-950/50'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          TARGET #{tgt.track_id}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {tgt.class_name.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
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

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3 text-cyan-400" />
                        {tgt.latest_camera.toUpperCase()}
                      </span>
                      <span>{new Date(tgt.last_seen).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Target Journey & Topology Flow */}
        <div className="lg:col-span-8 space-y-4">
          {isLoadingJourney ? (
            <div className="p-16 text-center bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              RECONSTRUCTING CHRONOLOGICAL CAMERA JOURNEY...
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
                    <span className="text-base font-bold text-white">
                      TRACK #{journey.track_id}
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

                {/* Timestamps & Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">FIRST SEEN</span>
                    <span className="text-white font-bold block mt-0.5">
                      {journey.first_seen ? new Date(journey.first_seen).toLocaleTimeString() : '--:--:--'}
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      {journey.camera_path[0]?.camera_id?.toUpperCase() || 'CAM-01'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">LAST SEEN</span>
                    <span className="text-white font-bold block mt-0.5">
                      {journey.last_seen ? new Date(journey.last_seen).toLocaleTimeString() : '--:--:--'}
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      {journey.camera_path[journey.camera_path.length - 1]?.camera_id?.toUpperCase() || 'CAM-01'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">TRANSIT TIME</span>
                    <span className="text-emerald-400 font-bold block mt-0.5">
                      {journey.duration_seconds} SECONDS
                    </span>
                    <span className="text-[10px] text-slate-500">CORRIDOR DURATION</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">HANDOVER CONFIDENCE</span>
                    <span className="text-cyan-300 font-bold block mt-0.5">
                      {journey.handovers[0]?.confidence_display || (journey.unique_cameras.length === 1 ? 'SINGLE SECTOR' : 'INSUFFICIENT DATA')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {journey.handovers.length} HANDOVER RECORD{journey.handovers.length === 1 ? '' : 'S'}
                    </span>
                  </div>
                </div>

                {/* Status Note Banner */}
                <div className="text-xs p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{journey.status_note}</span>
                </div>
              </div>

              {/* Tactical Camera Path Visualization */}
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {journey.observed_events.map((ev, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-2 text-slate-400">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 text-[10px] font-bold">
                              {ev.camera_id.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-bold text-white">
                            {ev.event}
                          </td>
                          <td className="py-2 px-2 text-slate-300">
                            {ev.description}
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
    </div>
  );
};
