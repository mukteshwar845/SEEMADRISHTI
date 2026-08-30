import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Camera,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Loader2,
  Filter,
  MapPin,
  Radio,
  Footprints,
} from 'lucide-react';
import {
  fetchThreatHeatmap,
  fetchCameraThreatProfile,
  ThreatHeatmapResponse,
  HeatmapCameraStat,
  ThreatHotspot,
  ThreatCorridorItem,
  CameraThreatProfile,
} from '../services/api';
import { webSocketService } from '../services/websocketService';

interface ThreatHeatmapViewProps {
  initialCameraId?: string | null;
  targetHighlightCameras?: string[];
  onSelectCamera?: (cameraId: string) => void;
  onOpenIncident?: (incidentId: string) => void;
  onOpenTargetJourney?: (trackId?: number) => void;
  onNavigateToAnalytics?: () => void;
}

export const ThreatHeatmapView: React.FC<ThreatHeatmapViewProps> = ({
  initialCameraId,
  targetHighlightCameras = [],
  onSelectCamera,
  onOpenIncident,
  onOpenTargetJourney,
  onNavigateToAnalytics,
}) => {
  const [timeWindow, setTimeWindow] = useState<string>('24h');
  const [heatmapData, setHeatmapData] = useState<ThreatHeatmapResponse | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(initialCameraId || null);
  const [cameraProfile, setCameraProfile] = useState<CameraThreatProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  const loadHeatmap = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchThreatHeatmap(timeWindow);
      const data = res?.data || (res?.cameras ? res : null);
      if (data) {
        setHeatmapData(data);
        if (!selectedCameraId && data.hotspot) {
          setSelectedCameraId(data.hotspot.camera_id);
        }
      }
    } catch (err) {
      console.warn('[ThreatHeatmapView] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeWindow]);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  // WebSocket Live Updates
  useEffect(() => {
    const unsubAlert = webSocketService.subscribe('alert', () => {
      loadHeatmap();
    });
    const unsubInc = webSocketService.subscribe('incident_created', () => {
      loadHeatmap();
    });
    const unsubCorr = webSocketService.subscribe('correlation_created', () => {
      loadHeatmap();
    });

    return () => {
      unsubAlert();
      unsubInc();
      unsubCorr();
    };
  }, [loadHeatmap]);

  // Load camera profile when selected
  useEffect(() => {
    if (selectedCameraId) {
      setIsLoadingProfile(true);
      fetchCameraThreatProfile(selectedCameraId, timeWindow)
        .then((res: any) => {
          const pData = res?.data || (res?.camera_id ? res : null);
          if (pData) setCameraProfile(pData);
        })
        .catch((err) => {
          console.warn('[ThreatHeatmapView] Camera profile error:', err);
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [selectedCameraId, timeWindow]);

  const hotspot = heatmapData?.hotspot;

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">
              EVENT-DRIVEN SPATIAL THREAT INTELLIGENCE // PHASE 21
            </div>
            <h1 className="text-lg font-mono font-black text-white flex items-center gap-2">
              DYNAMIC THREAT HEATMAP &amp; HOTSPOTS
            </h1>
          </div>
        </div>

        {/* Time Window Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <span className="text-slate-500 text-[10px] uppercase px-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            WINDOW:
          </span>
          {['15m', '1h', '6h', '24h'].map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-2.5 py-1 rounded cursor-pointer uppercase transition-colors ${
                timeWindow === w
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {w}
            </button>
          ))}
          <button
            onClick={loadHeatmap}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Recalculate Heatmap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target Journey Highlight Note if active */}
      {targetHighlightCameras.length > 0 && (
        <div className="p-2.5 bg-cyan-950/50 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              TARGET JOURNEY ACTIVE: Highlighting nodes traversed by target: {targetHighlightCameras.map((c) => c.toUpperCase()).join(' ➔ ')}
            </span>
          </div>
          <button
            onClick={() => onOpenTargetJourney && onOpenTargetJourney()}
            className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] cursor-pointer"
          >
            VIEW JOURNEY
          </button>
        </div>
      )}

      {/* 2. Hotspot HUD Banner */}
      {hotspot && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border border-rose-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-900/40 border border-rose-500/60 text-center min-w-[90px]">
              <span className="text-[9px] text-rose-300 uppercase block font-bold">THREAT INDEX</span>
              <span className="text-2xl font-black text-rose-400 block mt-0.5">
                {hotspot.threat_index}
              </span>
              <span className="text-[9px] text-slate-400 block">/ 100</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase">CURRENT THREAT HOTSPOT:</span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${hotspot.threat_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/50'}`}>
                  {hotspot.threat_level}
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  TREND: {hotspot.trend}
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-1">
                {hotspot.camera_id.toUpperCase()} // {hotspot.camera_name} ({hotspot.sector})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase block">PRIMARY CONTRIBUTORS</span>
              <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                <span>Breaches: <strong className="text-rose-400">{hotspot.primary_contributors.restricted_breaches || 0}</strong></span>
                <span>Tripwires: <strong className="text-amber-400">{hotspot.primary_contributors.tripwire_crossings || 0}</strong></span>
                <span>Loitering: <strong className="text-cyan-400">{hotspot.primary_contributors.loitering || 0}</strong></span>
                <span>Critical: <strong className="text-rose-400">{hotspot.primary_contributors.critical_incidents || 0}</strong></span>
              </div>
            </div>

            <button
              onClick={() => setSelectedCameraId(hotspot.camera_id)}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-950 transition-colors"
            >
              DRILL DOWN
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Body: Camera Heatmap Grid (8 cols) & Camera Threat Profile (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 9 Camera Nodes Heatmap Matrix */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                CCTV NODE THREAT DISTRIBUTION ({heatmapData?.cameras?.length || 0} NODES)
              </span>

              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-700" /> LOW (0-24)
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" /> MED (25-49)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> HIGH (50-74)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> CRIT (75-100)
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
                <Loader2 className="w-6 h-6 text-rose-400 animate-spin mb-2" />
                AGGREGATING EVENT DENSITY &amp; THREAT INDICES...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {heatmapData?.cameras.map((cam) => {
                  const isSelected = selectedCameraId === cam.camera_id;
                  const isTargetVisited = targetHighlightCameras.some((c) => c.toLowerCase() === cam.camera_id.toLowerCase());
                  const isCrit = cam.threat_level === 'CRITICAL';
                  const isHi = cam.threat_level === 'HIGH';
                  const isMed = cam.threat_level === 'MEDIUM';

                  return (
                    <div
                      key={cam.camera_id}
                      onClick={() => setSelectedCameraId(cam.camera_id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-rose-950/40 border-rose-500 shadow-xl shadow-rose-950/50'
                          : isTargetVisited
                          ? 'bg-cyan-950/30 border-cyan-500/70 shadow-lg shadow-cyan-950/40'
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {cam.camera_id.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[130px]">
                            {cam.sector}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-base font-black ${isCrit ? 'text-rose-400' : isHi ? 'text-amber-400' : isMed ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {cam.threat_index}
                          </span>
                          <span className="text-[9px] text-slate-500 block">/ 100</span>
                        </div>
                      </div>

                      {/* Threat Bar */}
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-2.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCrit
                              ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                              : isHi
                              ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                              : isMed
                              ? 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                              : 'bg-slate-700'
                          }`}
                          style={{ width: `${Math.max(4, cam.threat_index)}%` }}
                        />
                      </div>

                      {/* Event Counters */}
                      <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900">
                        <div>
                          <span className="text-slate-600 block">ZONE</span>
                          <span className={cam.event_counts.restricted_breaches > 0 ? 'text-rose-400 font-bold' : ''}>
                            {cam.event_counts.restricted_breaches}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">WIRE</span>
                          <span className={cam.event_counts.tripwire_crossings > 0 ? 'text-amber-400 font-bold' : ''}>
                            {cam.event_counts.tripwire_crossings}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">DWELL</span>
                          <span className={cam.event_counts.loitering > 0 ? 'text-cyan-400 font-bold' : ''}>
                            {cam.event_counts.loitering}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sector Aggregation Matrix */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              SECTOR-LEVEL THREAT AGGREGATION
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {heatmapData?.sectors.map((sec, i) => {
                const isCrit = sec.threat_level === 'CRITICAL';
                const isHi = sec.threat_level === 'HIGH';
                return (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{sec.sector_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${isCrit ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : isHi ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {sec.threat_level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>THREAT INDEX:</span>
                      <span className="font-bold text-white">{sec.threat_index}/100</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {sec.cameras.map((c) => c.toUpperCase()).join(', ')} ({sec.total_events} events)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-Risk Corridors Panel */}
          {heatmapData?.corridors && heatmapData.corridors.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  HIGH-RISK PROPAGATION CORRIDORS ({heatmapData.corridors.length})
                </span>
                <span className="text-[10px] text-slate-500">CORRELATED PROPAGATION AUDIT</span>
              </div>

              <div className="space-y-2">
                {heatmapData.corridors.map((corr, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                        {corr.event_density} DENSITY
                      </span>
                      <span className="font-bold text-white">
                        {corr.path.join(' ➔ ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                      <span>Correlated Incidents: <strong className="text-white">{corr.correlated_incidents}</strong></span>
                      <span>Breaches: <strong className="text-rose-400">{corr.restricted_breaches}</strong></span>
                      <span>Tripwires: <strong className="text-amber-400">{corr.tripwire_crossings}</strong></span>
                      <span className="text-amber-400 font-bold">Score: {corr.threat_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Camera Threat Drill-Down Details Panel */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              NODE THREAT PROFILE
            </span>
            <span className="text-xs text-cyan-400 font-bold">
              {selectedCameraId ? selectedCameraId.toUpperCase() : 'SELECT NODE'}
            </span>
          </div>

          {isLoadingProfile ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mb-2" />
              LOADING PROFILE...
            </div>
          ) : !cameraProfile ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a camera node on the heatmap to view its threat breakdown.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {cameraProfile.camera_name}
                </h3>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {cameraProfile.sector} // Monitored Node
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase">THREAT INDEX</span>
                <span className={`text-base font-bold ${cameraProfile.threat_level === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {cameraProfile.threat_index} / 100 [{cameraProfile.threat_level}]
                </span>
              </div>

              {/* Event Breakdown */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">EVENT BREAKDOWN</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Restricted Zone Breaches:</span>
                    <strong className="text-rose-400">{cameraProfile.event_counts.restricted_breaches || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tripwire Crossings:</span>
                    <strong className="text-amber-400">{cameraProfile.event_counts.tripwire_crossings || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Persistent Loitering:</span>
                    <strong className="text-cyan-400">{cameraProfile.event_counts.loitering || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical Incidents:</span>
                    <strong className="text-rose-400">{cameraProfile.event_counts.critical_incidents || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk Incidents:</span>
                    <strong className="text-amber-400">{cameraProfile.event_counts.high_incidents || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Boundary Re-entries:</span>
                    <strong className="text-slate-200">{cameraProfile.event_counts.reentry_count || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {onSelectCamera && (
                  <button
                    onClick={() => onSelectCamera(cameraProfile.camera_id)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>VIEW CAMERA FEED</span>
                  </button>
                )}

                {onOpenTargetJourney && (
                  <button
                    onClick={() => onOpenTargetJourney()}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>VIEW TARGET JOURNEY</span>
                  </button>
                )}

                {onNavigateToAnalytics && (
                  <button
                    onClick={onNavigateToAnalytics}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>VIEW ANALYTICS</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
