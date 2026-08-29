import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Play,
  Square,
  RotateCcw,
  Radio,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Filter,
  Eye,
  Activity,
  Layers,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';
import { fetchCameraFleet, controlCamera, FleetCameraItem } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface CameraFleetViewProps {
  onSelectCamera?: (cameraId: string) => void;
}

export const CameraFleetView: React.FC<CameraFleetViewProps> = ({ onSelectCamera }) => {
  const { isDaylight } = useTheme();
  const [fleet, setFleet] = useState<FleetCameraItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'PLAYBACK' | 'OFFLINE' | 'ERROR'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadFleet = useCallback(async () => {
    try {
      const res = await fetchCameraFleet();
      if (res && res.data) {
        setFleet(res.data);
      }
    } catch {
      // safe fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleet();
    const interval = setInterval(loadFleet, 4000);
    return () => clearInterval(interval);
  }, [loadFleet]);

  const handleControl = async (cameraId: string, action: 'start' | 'stop' | 'restart' | 'reconnect' | 'simulate_failure') => {
    setActionInProgress(`${cameraId}-${action}`);
    try {
      const res = await controlCamera(cameraId, action, 'Commander IQ100');
      setNotification({
        msg: `Action '${action.toUpperCase()}' executed on ${cameraId.toUpperCase()} successfully.`,
        type: 'success',
      });
      await loadFleet();
    } catch (err: any) {
      setNotification({
        msg: `Failed to execute '${action}' on ${cameraId}: ${err.message}`,
        type: 'error',
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredFleet = fleet.filter((cam) => {
    if (filter === 'ALL') return true;
    if (filter === 'LIVE') return cam.status === 'LIVE';
    if (filter === 'PLAYBACK') return cam.status === 'PLAYBACK';
    if (filter === 'OFFLINE') return cam.status === 'OFFLINE';
    if (filter === 'ERROR') return cam.last_error !== null;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Operational Control Bar */}
      <div
        className={`p-5 rounded-lg border backdrop-blur-md relative overflow-hidden ${
          isDaylight
            ? 'bg-slate-50 border-slate-300 shadow-sm'
            : 'bg-[#030712]/90 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wider font-mono text-white flex items-center gap-3">
                  CAMERA FLEET MANAGEMENT
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {fleet.length} NODES CONFIGURED
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Real-time RTSP/MP4 ingestion health, frame telemetry, reconnection backoff & operational overrides
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFleet}
              className="px-3 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              REFRESH FLEET
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mt-4 p-2.5 rounded text-xs font-mono flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {(['ALL', 'LIVE', 'PLAYBACK', 'OFFLINE', 'ERROR'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-mono rounded transition ${
                filter === f
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f} ({f === 'ALL' ? fleet.length : fleet.filter((c) => (f === 'ERROR' ? c.last_error !== null : c.status === f)).length})
            </button>
          ))}
        </div>
      </div>

      {/* 2. Camera Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFleet.map((cam) => {
          const isOffline = cam.status === 'OFFLINE';
          const isError = cam.last_error !== null;

          return (
            <div
              key={cam.id}
              className={`rounded-lg border p-4 backdrop-blur-md relative transition flex flex-col justify-between ${
                isOffline
                  ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                  : isDaylight
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-[#040814]/90 border-cyan-500/20 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white tracking-wider">{cam.id.toUpperCase()}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {cam.source_type}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                      isOffline
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : cam.status === 'LIVE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOffline ? 'bg-rose-400' : cam.status === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
                      }`}
                    />
                    {cam.status}
                  </span>
                </div>

                {/* Location & Sector */}
                <div className="text-xs font-mono text-slate-300 mb-3 font-semibold">{cam.name} — {cam.location}</div>

                {/* Metrics Table */}
                <div className="space-y-1.5 text-xs font-mono text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 mb-3">
                  <div className="flex justify-between">
                    <span>Source Link:</span>
                    <span className="text-slate-200 truncate max-w-[160px]" title={cam.source_url}>
                      {cam.source_url}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolution / FPS:</span>
                    <span className="text-cyan-300 font-bold">
                      {cam.resolution} @ {cam.measured_fps} FPS
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Occupants:</span>
                    <span className="text-amber-300 font-semibold">{cam.active_tracks} Targets</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className="text-slate-300">{cam.environment_mode} (Vis: {cam.visibility_score}%)</span>
                  </div>
                  {cam.last_error && (
                    <div className="flex justify-between text-rose-400 pt-1 border-t border-rose-950/50">
                      <span>Error Status:</span>
                      <span className="truncate max-w-[160px]" title={cam.last_error}>{cam.last_error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Operational Control Buttons */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">
                  Operational Controls
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                  {isOffline ? (
                    <button
                      disabled={actionInProgress !== null}
                      onClick={() => handleControl(cam.id, 'restart')}
                      className="py-1.5 px-2 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-1 transition"
                    >
                      <Play className="w-3 h-3" />
                      RESTART
                    </button>
                  ) : (
                    <button
                      disabled={actionInProgress !== null}
                      onClick={() => handleControl(cam.id, 'stop')}
                      className="py-1.5 px-2 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center justify-center gap-1 transition"
                    >
                      <Square className="w-3 h-3" />
                      STOP
                    </button>
                  )}

                  <button
                    disabled={actionInProgress !== null}
                    onClick={() => handleControl(cam.id, 'reconnect')}
                    className="py-1.5 px-2 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-1 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    RECONNECT
                  </button>

                  <button
                    disabled={actionInProgress !== null}
                    onClick={() => handleControl(cam.id, 'simulate_failure')}
                    className="py-1.5 px-2 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center gap-1 transition"
                    title="Simulate signal loss for SIH demonstration"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    SIM DROP
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
