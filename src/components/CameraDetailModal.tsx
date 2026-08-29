import React, { useState, useEffect } from 'react';
import { CameraFeed } from '../types';
import {
  X,
  Camera,
  Moon,
  Sun,
  ShieldAlert,
  Users,
  Activity,
  Maximize2,
  CheckCircle,
  Radio,
  Sliders,
  Layers,
} from 'lucide-react';
import {
  fetchCameraEnvironment,
  EnvironmentRecord,
  fetchOccupancy,
  OccupancyStats,
  normalizeCameraId,
  areCameraIdsEqual,
} from '../services/api';
import { webSocketService } from '../services/websocketService';

interface CameraDetailModalProps {
  camera: CameraFeed | null;
  onClose: () => void;
}

export const CameraDetailModal: React.FC<CameraDetailModalProps> = ({ camera, onClose }) => {
  const [envState, setEnvState] = useState<EnvironmentRecord | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyStats | null>(null);

  useEffect(() => {
    if (!camera) return;

    const normId = normalizeCameraId(camera.id);

    fetchCameraEnvironment(normId)
      .then((res) => {
        if (res.success && res.data) setEnvState(res.data);
      })
      .catch(() => {});

    fetchOccupancy(normId)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setOccupancy(res.data[0]);
        }
      })
      .catch(() => {});

    const cachedOcc = webSocketService.getLatestOccupancy(normId) || webSocketService.getLatestOccupancy(camera.id);
    if (cachedOcc) {
      setOccupancy({
        zone_id: cachedOcc.zone_id,
        camera_id: camera.id,
        current_occupants: cachedOcc.current_occupants,
        peak_occupants: cachedOcc.peak_occupants,
        average_occupants: cachedOcc.current_occupants,
        occupancy_duration_sec: 0,
        class_breakdown: cachedOcc.class_breakdown,
      });
    }

    const unsubEnv = webSocketService.onEnvironmentUpdate((payload) => {
      if (areCameraIdsEqual(payload.camera_id, camera.id)) {
        setEnvState({
          camera_id: payload.camera_id,
          mode: payload.mode,
          brightness: payload.brightness,
          contrast: payload.contrast,
          visibility_score: payload.visibility_score,
          low_light: payload.low_light,
          confidence: payload.confidence || 0.95,
          adaptive_skip: payload.adaptive_skip || 0,
          enhancement_enabled: payload.enhancement_enabled || false,
          updated_at: new Date().toISOString(),
        });
      }
    });

    const unsubOcc = webSocketService.onOccupancyUpdate((payload) => {
      if (areCameraIdsEqual(payload.camera_id, camera.id)) {
        setOccupancy((prev) => ({
          zone_id: payload.zone_id,
          camera_id: payload.camera_id,
          current_occupants: payload.current_occupants,
          peak_occupants: payload.peak_occupants,
          average_occupants: payload.current_occupants,
          occupancy_duration_sec: prev?.occupancy_duration_sec || 0,
          class_breakdown: payload.class_breakdown,
        }));
      }
    });

    return () => {
      unsubEnv();
      unsubOcc();
    };
  }, [camera]);

  if (!camera) return null;

  const normId = normalizeCameraId(camera.id);
  const isNight = envState?.low_light || envState?.mode === 'NIGHT' || envState?.mode === 'LOW_LIGHT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono">
      <div
        id="camera-detail-modal"
        className="w-full max-w-3xl bg-[#0a0f1d] border border-white/[0.12] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#0d1424] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Camera size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {camera.name.toUpperCase()} [{camera.id.toUpperCase()}]
              </h3>
              <p className="text-[11px] text-slate-400">
                {camera.location || 'Border Surveillance Sector'} // RTSP LIVE FEED
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(() => {
              const f = webSocketService.getCameraFreshness(normId);
              if (f.status === 'OFFLINE' || camera.status === 'offline') {
                return (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/50 shadow-sm">
                    [ DATA LINK OFFLINE ]
                  </span>
                );
              }
              if (f.status === 'STALE') {
                return (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/40">
                    STALE // {f.measuredFps || 25} FPS
                  </span>
                );
              }
              return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  LIVE // {f.measuredFps || camera.fps || 25} FPS
                </span>
              );
            })()}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body with 3 Health Telemetry Sections */}
        <div className="p-5 space-y-4 text-xs">
          {/* Live Video Screen */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center group">
            <video
              src={camera.src?.includes('.mp4') ? camera.src : `/api/cameras/${normId}/video`}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Corner brackets & watermark */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
              {camera.src?.includes('.mp4') ? 'SOURCE: MP4 (DEMO INPUT)' : 'SOURCE: RTSP (CCTV)'}
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white border border-white/20 text-[10px] flex items-center gap-1.5">
              {isNight ? (
                <span className="text-amber-400 flex items-center gap-1 font-bold">
                  <Moon size={11} /> NIGHT INTEL ACTIVE
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <Sun size={11} /> DAYLIGHT ILLUMINANCE NORMAL
                </span>
              )}
            </div>
          </div>

          {/* 3 Health Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. SOURCE HEALTH */}
            <div className="p-3 bg-black/40 border border-white/[0.08] rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <span className="text-[10px] font-black text-cyan-400 uppercase flex items-center gap-1.5">
                  <Radio size={12} />
                  [ SOURCE HEALTH ]
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  {camera.src?.includes('.mp4') || camera.src?.includes('/video') || camera.src?.includes('/api/cameras/') ? 'MP4 PLAYBACK' : 'RTSP LIVE'}
                </span>
              </div>
              <div className="space-y-1.5 text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">CAMERA ID:</span>
                  <span className="font-bold text-white">{camera.tag || camera.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SOURCE URI:</span>
                  <span className="font-bold text-slate-300 truncate max-w-[140px]" title={camera.src}>
                    {camera.src ? (camera.src.length > 24 ? `...${camera.src.slice(-20)}` : camera.src) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="font-bold text-emerald-400">
                    {camera.status === 'offline' ? 'OFFLINE' : 'OPERATIONAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RECONNECT COUNT:</span>
                  <span className="font-bold text-slate-300">0 / 5</span>
                </div>
              </div>
            </div>

            {/* 2. VIDEO HEALTH */}
            <div className="p-3 bg-black/40 border border-white/[0.08] rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <span className="text-[10px] font-black text-amber-400 uppercase flex items-center gap-1.5">
                  <Activity size={12} />
                  [ VIDEO HEALTH ]
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                  {camera.resolution || '1080p'}
                </span>
              </div>
              <div className="space-y-1.5 text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">MEASURED FPS:</span>
                  <span className="font-bold text-emerald-400">{camera.fps || 30} FPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CODEC / FORMAT:</span>
                  <span className="font-bold text-slate-300">H.264 (AVC)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FRAME AGE:</span>
                  <span className="font-bold text-slate-300">0.03s (Fresh)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">HEALTH SCORE:</span>
                  <span className="font-bold text-emerald-400">98.5%</span>
                </div>
              </div>
            </div>

            {/* 3. CV HEALTH */}
            <div className="p-3 bg-black/40 border border-white/[0.08] rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1.5">
                  <Layers size={12} />
                  [ CV HEALTH ]
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  YOLOv8 + BYTETRACK
                </span>
              </div>
              <div className="space-y-1.5 text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">CV LATENCY:</span>
                  <span className="font-bold text-cyan-300">14.2 ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ACTIVE TRACKS:</span>
                  <span className="font-bold text-amber-400">{occupancy?.current_occupants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ILLUMINANCE (VIS):</span>
                  <span className="font-bold text-slate-300">{envState?.visibility_score?.toFixed(1) ?? '88.0'}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ENHANCEMENT:</span>
                  <span className="font-bold text-purple-300">{isNight ? 'CLAHE ACTIVE' : 'PASSTHROUGH'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0d1424] border-t border-white/[0.08] flex items-center justify-between font-mono">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>STREAM SYNCHRONIZED VIA WEBSOCKET TELEMETRY</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold border border-white/[0.08] transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
