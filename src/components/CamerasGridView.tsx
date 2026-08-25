import React, { useState, useEffect } from 'react';
import { CameraFeed } from '../types';
import {
  Video,
  Eye,
  CheckCircle,
  AlertTriangle,
  Play,
  Maximize2,
  Settings2,
  Sparkles,
  Disc,
} from 'lucide-react';
import { recordingEngine, ActiveRecording } from '../utils/recordingManager';

interface CamerasGridViewProps {
  cameras: CameraFeed[];
  onSelectCamera: (cam: CameraFeed) => void;
}

export const CamerasGridView: React.FC<CamerasGridViewProps> = ({
  cameras,
  onSelectCamera,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<'grid-4' | 'grid-2' | 'single'>('grid-4');
  const [activeRecordings, setActiveRecordings] = useState<Map<string, ActiveRecording>>(new Map());

  useEffect(() => {
    const unsub = recordingEngine.subscribe((active) => {
      setActiveRecordings(new Map(active));
    });
    return unsub;
  }, []);

  const handleToggleRec = (e: React.MouseEvent, cam: CameraFeed) => {
    e.stopPropagation();
    recordingEngine.toggleRecording(cam);
  };

  return (
    <div className="space-y-4" id="cameras-view-root">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
        <div>
          <h2 className="text-sm sm:text-base font-black text-white tracking-[0.15em] uppercase font-mono">
            RTSP CAMERA SENSOR MATRIX
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Synchronous border surveillance stream nodes (4 configured RTSP endpoints)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedLayout('grid-4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide cursor-pointer transition-all ${
              selectedLayout === 'grid-4'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            2X2 QUAD
          </button>
          <button
            onClick={() => setSelectedLayout('grid-2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide cursor-pointer transition-all ${
              selectedLayout === 'grid-2'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            DUAL SPLIT
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div
        className={`grid gap-4 ${
          selectedLayout === 'grid-4'
            ? 'grid-cols-1 md:grid-cols-2'
            : selectedLayout === 'grid-2'
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {cameras.map((cam, idx) => {
          const isRec = activeRecordings.has(cam.id);
          const dur = isRec ? recordingEngine.getRecordingDuration(cam.id) : 0;
          const formattedDur = `${String(Math.floor(dur / 60)).padStart(2, '0')}:${String(dur % 60).padStart(2, '0')}`;

          return (
            <div
              key={cam.id}
              id={`camera-cell-${cam.id}`}
              className="bg-[#0a0f1d] border border-white/[0.08] hover:border-blue-500/40 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.7)] flex flex-col group transition-all"
            >
              {/* Header */}
              <div className="px-3.5 py-2.5 bg-[#0d1424] border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {cam.code}
                  </span>
                  <h3 className="text-xs font-bold text-white truncate font-mono">{cam.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* REC Quick Toggle Button */}
                  <button
                    onClick={(e) => handleToggleRec(e, cam)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                      isRec
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse'
                        : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-500/40'
                    }`}
                    title={isRec ? 'Stop recording & save clip' : 'Start recording clip'}
                  >
                    <Disc size={11} className={isRec ? 'animate-spin text-white' : 'text-rose-400'} />
                    <span>{isRec ? `REC [${formattedDur}]` : 'RECORD'}</span>
                  </button>

                  {cam.status === 'online' ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      ONLINE ({cam.fps} FPS)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] text-rose-400 font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                      STANDBY
                    </span>
                  )}
                </div>
              </div>

              {/* Video Preview Canvas / Mock Viewport */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {cam.status === 'online' ? (
                  <div className="w-full h-full relative">
                    {/* Surveillance backdrop */}
                    <div
                      className={`w-full h-full bg-cover bg-center ${
                        idx === 0
                          ? 'bg-slate-900'
                          : idx === 1
                          ? 'bg-slate-950'
                          : 'bg-[#070b14]'
                      }`}
                    >
                      {/* Simulated Camera Overlay Elements */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                      {/* HUD Corner Brackets */}
                      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-cyan-400/50 pointer-events-none" />
                      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-cyan-400/50 pointer-events-none" />
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-cyan-400/50 pointer-events-none" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-cyan-400/50 pointer-events-none" />

                      {/* HUD Crosshairs */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                        <div className="w-12 h-12 border border-cyan-400/50 rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                        </div>
                      </div>

                      {/* Top HUD */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[9px] font-mono text-white bg-black/80 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md">
                        {isRec ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                            REC [{formattedDur}]
                          </span>
                        ) : (
                          <span className="text-cyan-400 font-bold">LIVE ●</span>
                        )}
                        <span>{cam.location}</span>
                      </div>

                      {/* AI Detection Label in Feed */}
                      {cam.activeDetections > 0 && (
                        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-emerald-400 bg-black/80 border border-emerald-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Sparkles size={11} />
                          <span>{cam.activeDetections} TARGETS TRACKED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <AlertTriangle size={32} className="text-amber-500/70 mb-2" />
                    <p className="text-xs font-mono font-bold text-slate-400">FEED STANDBY</p>
                    <p className="text-[10px] font-mono text-slate-500">RTSP: {cam.rtspUrl}</p>
                  </div>
                )}

                {/* Hover Overlay Button */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onSelectCamera(cam)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.5)] cursor-pointer active:scale-95 transition-all"
                  >
                    <Maximize2 size={13} />
                    <span>FOCUS PRIMARY PLAYER</span>
                  </button>

                  <button
                    onClick={(e) => handleToggleRec(e, cam)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all border ${
                      isRec
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)]'
                        : 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border-rose-500/50'
                    }`}
                  >
                    <Disc size={13} className={isRec ? 'animate-spin text-white' : 'text-rose-400'} />
                    <span>{isRec ? 'STOP RECORDING' : 'RECORD STREAM'}</span>
                  </button>
                </div>
              </div>

              {/* Footer Metadata */}
              <div className="px-3.5 py-2 bg-[#0d1424] border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-slate-300">{cam.resolution}</span>
                <span className="text-emerald-400 font-bold">{cam.bitrate}</span>
                <span className="text-blue-400">Models: {cam.aiModels.length} active</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
