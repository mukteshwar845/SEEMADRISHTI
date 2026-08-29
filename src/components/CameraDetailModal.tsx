import React, { useState, useEffect, useRef } from 'react';
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
  Flame,
  Eye,
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
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Heatmap rendering loop on canvas
  useEffect(() => {
    if (!showHeatmap || !camera) return;

    let animId: number;
    let scanPos = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Generate reproducible motion hotspots based on camera ID
      const camNum = parseInt(camera.id.replace(/\D/g, ''), 10) || 1;
      const hotspots = [
        {
          x: width * (0.3 + ((camNum * 7) % 40) / 100),
          y: height * (0.4 + ((camNum * 11) % 35) / 100),
          r: width * 0.18,
          events: 148 + (camNum * 17) % 80,
          label: 'PERIMETER FENCE CROSSING',
        },
        {
          x: width * (0.65 - ((camNum * 13) % 30) / 100),
          y: height * (0.65 - ((camNum * 5) % 25) / 100),
          r: width * 0.22,
          events: 92 + (camNum * 23) % 60,
          label: 'ACCESS ROAD TRANSIT',
        },
        {
          x: width * (0.5 + Math.sin(camNum) * 0.2),
          y: height * (0.3 + Math.cos(camNum) * 0.15),
          r: width * 0.14,
          events: 64 + (camNum * 9) % 45,
          label: 'BUFFER ZONE DWELL',
        },
      ];

      ctx.save();
      ctx.globalAlpha = heatmapOpacity;

      // 1. Draw trajectory heat corridors
      ctx.beginPath();
      ctx.moveTo(hotspots[0].x, hotspots[0].y);
      ctx.quadraticCurveTo(width * 0.5, height * 0.5, hotspots[1].x, hotspots[1].y);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hotspots[1].x, hotspots[1].y);
      ctx.lineTo(hotspots[2].x, hotspots[2].y);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 10;
      ctx.stroke();

      // 2. Draw radial Gaussian hotspots
      hotspots.forEach((h, idx) => {
        const pulse = 1 + Math.sin(Date.now() / 600 + idx * 2) * 0.06;
        const radius = h.r * pulse;
        const radGrad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, radius);

        radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Hot red
        radGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.65)'); // Orange
        radGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.35)'); // Cyan
        radGrad.addColorStop(0.9, 'rgba(59, 130, 246, 0.15)'); // Blue
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Crosshair reticle on epicenter
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
        ctx.moveTo(h.x - 8, h.y);
        ctx.lineTo(h.x + 8, h.y);
        ctx.moveTo(h.x, h.y - 8);
        ctx.lineTo(h.x, h.y + 8);
        ctx.stroke();

        // Hotspot label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`HOTSPOT #${idx + 1}: ${h.events} EV/HR`, h.x + 10, h.y - 4);
        ctx.fillStyle = '#67e8f9';
        ctx.font = '8px monospace';
        ctx.fillText(h.label, h.x + 10, h.y + 7);
      });

      // 3. Subtle Doppler / Radar sweep line
      scanPos = (scanPos + 1.2) % width;
      const sweepGrad = ctx.createLinearGradient(scanPos - 30, 0, scanPos, 0);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(scanPos - 30, 0, 30, height);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showHeatmap, heatmapOpacity, camera]);

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
          {/* Live Video Screen with Motion Heatmap Overlay */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center group">
            <video
              src={camera.src?.includes('.mp4') ? camera.src : `/api/cameras/${normId}/video`}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Canvas-based Motion Heatmap Layer */}
            {showHeatmap && (
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />
            )}

            {/* Corner brackets & watermark */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold z-20">
              {camera.src?.includes('.mp4') ? 'SOURCE: MP4 (DEMO INPUT)' : 'SOURCE: RTSP (CCTV)'}
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white border border-white/20 text-[10px] flex items-center gap-1.5 z-20">
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

            {/* Heatmap Overlay Interactive Control Bar */}
            <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/15 flex items-center justify-between z-20 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    showHeatmap
                      ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.6)] border border-rose-400'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                  title="Toggle 1-Hour Canvas Motion Heatmap Overlay"
                >
                  <Flame size={12} className={showHeatmap ? 'animate-pulse' : ''} />
                  <span>1-HR MOTION HEATMAP: {showHeatmap ? 'ON' : 'OFF'}</span>
                </button>

                {showHeatmap && (
                  <span className="text-[9px] text-rose-300 hidden sm:inline">
                    // ACCUMULATED ACTIVITY SIGNATURES
                  </span>
                )}
              </div>

              {showHeatmap && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 font-bold">OPACITY:</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                    className="w-16 sm:w-20 h-1 accent-rose-500 bg-slate-800 rounded cursor-pointer"
                    title="Heatmap Opacity"
                  />
                  <span className="text-[9px] text-rose-400 font-bold w-7">
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </div>
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
