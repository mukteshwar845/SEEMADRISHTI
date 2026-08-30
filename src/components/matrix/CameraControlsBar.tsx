import React from 'react';
import {
  EyeOff,
  Sliders,
  Move,
  ZoomIn,
  ZoomOut,
  Disc,
  Camera,
  Play,
  Pause,
} from 'lucide-react';

interface CameraControlsBarProps {
  isBlackout: boolean;
  setIsBlackout: (val: boolean | ((prev: boolean) => boolean)) => void;
  nightVision: boolean;
  setNightVision: (val: boolean | ((prev: boolean) => boolean)) => void;
  thermalMode: boolean;
  setThermalMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  showAiHud: boolean;
  setShowAiHud: (val: boolean | ((prev: boolean) => boolean)) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  isAutoRotate: boolean;
  setIsAutoRotate: (val: boolean | ((prev: boolean) => boolean)) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  isRecording: boolean;
  handleToggleRecord: () => void;
  handleCaptureSnapshot: () => void;
  playbackMode: 'LIVE' | 'RECORDED';
  isPlayingRecorded: boolean;
  setIsPlayingRecorded: (val: boolean) => void;
  playbackTimeOffset: number;
  setPlaybackTimeOffset: (val: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: React.Dispatch<React.SetStateAction<number>>;
}

export const CameraControlsBar: React.FC<CameraControlsBarProps> = ({
  isBlackout,
  setIsBlackout,
  nightVision,
  setNightVision,
  thermalMode,
  setThermalMode,
  showAiHud,
  setShowAiHud,
  confidenceThreshold,
  setConfidenceThreshold,
  isAutoRotate,
  setIsAutoRotate,
  zoomLevel,
  setZoomLevel,
  isRecording,
  handleToggleRecord,
  handleCaptureSnapshot,
  playbackMode,
  isPlayingRecorded,
  setIsPlayingRecorded,
  playbackTimeOffset,
  setPlaybackTimeOffset,
  playbackSpeed,
  setPlaybackSpeed,
}) => {
  return (
    <>
      {/* Recorded Timeline Scrubber (When in RECORDED Mode) */}
      {playbackMode === 'RECORDED' && (
        <div className="absolute bottom-10 inset-x-2 px-2.5 py-1.5 bg-slate-950/90 border border-amber-500/40 rounded-lg backdrop-blur-md z-30 flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setIsPlayingRecorded(!isPlayingRecorded)}
            className="p-1 text-amber-300 hover:text-white bg-amber-950 rounded cursor-pointer"
          >
            {isPlayingRecorded ? <Pause size={11} /> : <Play size={11} />}
          </button>

          <input
            type="range"
            min={0}
            max={60}
            step={0.5}
            value={playbackTimeOffset}
            onChange={(e) => setPlaybackTimeOffset(parseFloat(e.target.value))}
            className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
          />

          <button
            onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
            className="px-1.5 py-0.5 bg-slate-800 text-amber-300 text-[9px] font-bold rounded hover:bg-slate-700 cursor-pointer"
          >
            {playbackSpeed}x
          </button>
        </div>
      )}

      {/* Floating Tactical Action Bar (Appears on Hover) */}
      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2 py-1 bg-slate-950/90 border border-slate-700/60 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center gap-1">
          {/* Blackout Mode Toggle */}
          <button
            onClick={() => setIsBlackout(!isBlackout)}
            title="Toggle Blackout (Mask Signal)"
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isBlackout
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <EyeOff size={9} />
            MASK
          </button>

          {/* Night Vision */}
          <button
            onClick={() => {
              setNightVision(!nightVision);
              if (thermalMode) setThermalMode(false);
            }}
            title="Toggle Night Vision IR Mode"
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
              nightVision
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            NV-IR
          </button>

          {/* Thermal Mode */}
          <button
            onClick={() => {
              setThermalMode(!thermalMode);
              if (nightVision) setNightVision(false);
            }}
            title="Toggle Thermal Imaging Mode"
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
              thermalMode
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            THERMAL
          </button>

          {/* AI HUD Overlay Toggle */}
          <button
            onClick={() => setShowAiHud(!showAiHud)}
            title="Toggle 60FPS AI Bounding Box HUD"
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
              showAiHud
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            HUD: {showAiHud ? 'ON' : 'OFF'}
          </button>

          {/* Individual Camera Confidence Threshold Slider */}
          <div
            className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 px-1.5 py-0.5 rounded"
            title={`Camera Zone Confidence Sensitivity: ${confidenceThreshold}% (Filters out detections below this threshold)`}
          >
            <Sliders size={9} className="text-cyan-400" />
            <span className="text-[8px] font-mono text-cyan-300 font-bold whitespace-nowrap">
              CONF:{confidenceThreshold}%
            </span>
            <input
              type="range"
              min="30"
              max="95"
              step="5"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-10 sm:w-12 h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* PTZ Auto Rotate Toggle */}
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            title={isAutoRotate ? 'Stop PTZ Auto-Rotate' : 'Start PTZ Auto-Rotate'}
            className={`p-1 rounded cursor-pointer transition-all ${
              isAutoRotate
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Move size={11} className={isAutoRotate ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''} />
          </button>

          {/* Digital Zoom Controls */}
          <button
            onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
            disabled={zoomLevel <= 1}
            title="Zoom Out"
            className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut size={11} />
          </button>
          <span className="text-[8px] font-mono text-cyan-400 font-bold px-1">
            {zoomLevel.toFixed(1)}x
          </span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
            disabled={zoomLevel >= 3}
            title="Zoom In"
            className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn size={11} />
          </button>

          {/* Record RTSP Toggle */}
          <button
            onClick={handleToggleRecord}
            title={isRecording ? 'Stop Recording RTSP Stream' : 'Record RTSP Stream'}
            className={`p-1 rounded cursor-pointer transition-all ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 text-rose-400 hover:bg-rose-950 hover:text-white'
            }`}
          >
            <Disc size={11} />
          </button>

          {/* Snapshot */}
          <button
            onClick={handleCaptureSnapshot}
            title="Capture High-Res Snapshot"
            className="p-1 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
          >
            <Camera size={11} />
          </button>
        </div>
      </div>
    </>
  );
};
