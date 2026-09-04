import React from 'react';
import { MatrixCameraFeed } from '../../types';
import { Edit3, Check, X, Maximize2, Camera } from 'lucide-react';

interface CameraHudHeaderProps {
  camera: MatrixCameraFeed;
  playbackMode: 'LIVE' | 'RECORDED';
  setPlaybackMode: React.Dispatch<React.SetStateAction<'LIVE' | 'RECORDED'>>;
  onSelectSpotlight?: (cam: MatrixCameraFeed) => void;
  isEditingName: boolean;
  setIsEditingName: (val: boolean) => void;
  editedName: string;
  setEditedName: (val: string) => void;
  handleSaveEdit: (e: React.FormEvent) => void;
  handleCancelEdit: () => void;
  freshness: {
    status: 'ONLINE' | 'STALE' | 'OFFLINE';
    measuredFps: number;
    lastFrameAgeMs: number;
  };
  liveCounts?: any;
  tracksCount: number;
  batteryIcon?: React.ReactNode;
  isWebcamActive?: boolean;
  onToggleWebcam?: () => void;
}

export const CameraHudHeader: React.FC<CameraHudHeaderProps> = ({
  camera,
  playbackMode,
  setPlaybackMode,
  onSelectSpotlight,
  isEditingName,
  setIsEditingName,
  editedName,
  setEditedName,
  handleSaveEdit,
  handleCancelEdit,
  freshness,
  liveCounts,
  tracksCount,
  batteryIcon,
  isWebcamActive = false,
  onToggleWebcam,
}) => {
  return (
    <>
      {/* 1. Header Bar */}
      <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono gap-2 relative z-20">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Status Dot with Signal Quality */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                freshness.status === 'OFFLINE'
                  ? 'bg-rose-500 animate-pulse'
                  : freshness.status === 'STALE'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`}
            />
            <span className="text-[10px] font-bold text-cyan-400 shrink-0">
              CAM-0{camera.id}
            </span>
            {batteryIcon}
          </div>

          {/* Camera Name with Inline Edit */}
          {isEditingName ? (
            <form onSubmit={handleSaveEdit} className="flex items-center gap-1 min-w-0 flex-1">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 text-cyan-300 text-xs font-mono px-2 py-0.5 rounded border border-cyan-500/70 focus:outline-none"
              />
              <button
                type="submit"
                title="Save Camera Label"
                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer shrink-0"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                title="Cancel"
                className="p-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 cursor-pointer shrink-0"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden group/title">
              <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-100 truncate flex-1 min-w-0" title={camera.name}>
                {camera.name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                title="Edit Camera Location Label"
                className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors cursor-pointer shrink-0 opacity-70 group-hover/title:opacity-100"
              >
                <Edit3 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Live vs Recorded Toggle & Spotlight */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setPlaybackMode((m) => (m === 'LIVE' ? 'RECORDED' : 'LIVE'))}
            title={camera.src?.includes('.mp4') ? 'Source: VisDrone Video Playback (MP4)' : (playbackMode === 'LIVE' ? 'Switch to Recorded Playback' : 'Switch to Live RTSP Feed')}
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              camera.src?.includes('.mp4')
                ? 'bg-sky-950/80 text-sky-400 border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                : playbackMode === 'LIVE'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-amber-950/90 text-amber-300 border-amber-500/50'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                camera.src?.includes('.mp4')
                  ? 'bg-sky-400 animate-pulse'
                  : playbackMode === 'LIVE'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span>{camera.src?.includes('.mp4') && !isWebcamActive ? 'PLAYBACK (MP4)' : isWebcamActive ? 'LIVE WEBCAM' : playbackMode}</span>
          </button>

          {/* Explicit Webcam / Demo Toggle */}
          {onToggleWebcam && (
            <button
              onClick={onToggleWebcam}
              title={isWebcamActive ? "Switch back to MP4 Demo Fixture" : "Switch to Live Hardware Webcam"}
              className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                isWebcamActive
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700/60'
              }`}
            >
              <Camera size={10} className={isWebcamActive ? 'text-rose-400' : ''} />
              <span>{isWebcamActive ? 'WEBCAM ON' : 'WEBCAM'}</span>
            </button>
          )}

          {onSelectSpotlight && (
            <button
              onClick={() => onSelectSpotlight(camera)}
              title="Spotlight View"
              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
            >
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Phase 22: Multi-Class Real-Time Counting Strip */}
      <div className="px-2.5 py-1 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[8.5px] font-mono select-none flex-wrap gap-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-cyan-400 font-bold tracking-wider">ACTIVE:</span>
          <span className="text-slate-400">
            HUMAN:<span className="text-emerald-400 font-bold ml-0.5">
              {String(liveCounts?.visible?.persons ?? liveCounts?.visible?.person ?? 0).padStart(2, '0')}
            </span>
          </span>
          <span className="text-slate-400">
            VEHICLE:<span className="text-sky-400 font-bold ml-0.5">
              {String(liveCounts?.visible?.vehicles ?? ((liveCounts?.visible?.car ?? 0) + (liveCounts?.visible?.truck ?? 0) + (liveCounts?.visible?.bus ?? 0))).padStart(2, '0')}
            </span>
          </span>
          <span className="text-slate-400">
            ANIMAL:<span className="text-amber-400 font-bold ml-0.5">
              {String(liveCounts?.visible?.animals ?? 0).padStart(2, '0')}
            </span>
          </span>
          <span className="text-slate-400">
            OBJECT:<span className="text-purple-400 font-bold ml-0.5">
              {String(liveCounts?.visible?.objects ?? 0).padStart(2, '0')}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold">TOTAL</span>
          <span className="text-cyan-300 font-bold">
            {liveCounts?.visible?.total ?? tracksCount} ACTIVE
          </span>
          {liveCounts?.unique_session?.total !== undefined && liveCounts.unique_session.total > 0 && (
            <span className="text-slate-500 text-[7.5px]">
              ({liveCounts.unique_session.total} UNIQUE)
            </span>
          )}
        </div>
      </div>
    </>
  );
};
