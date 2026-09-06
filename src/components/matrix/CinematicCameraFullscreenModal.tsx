import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Camera,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Flame,
  ChevronLeft,
  ChevronRight,
  Disc,
  AlertTriangle,
  Clock,
  Shield,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Download,
  Crosshair,
  Layers,
} from 'lucide-react';
import { MatrixCameraFeed, AlertItem } from '../../types';
import { recordingEngine } from '../../utils/recordingManager';

interface CinematicCameraFullscreenModalProps {
  camera: MatrixCameraFeed | null;
  allCameras: MatrixCameraFeed[];
  alerts?: AlertItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: (cam: MatrixCameraFeed) => void;
  onTriggerAlert?: (cam: MatrixCameraFeed) => void;
}

export const CinematicCameraFullscreenModal: React.FC<CinematicCameraFullscreenModalProps> = ({
  camera,
  allCameras,
  alerts = [],
  isOpen,
  onClose,
  onSelectCamera,
  onTriggerAlert,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(100);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [nightVision, setNightVision] = useState(false);
  const [thermalMode, setThermalMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [selectedIncidentTime, setSelectedIncidentTime] = useState<number | null>(null);

  // Sync with current camera
  useEffect(() => {
    if (camera) {
      setNightVision(camera.id === 1 || camera.id === 7);
      setThermalMode(camera.id === 9);
      setZoomLevel(1);
      setIsPlaying(true);
      setPlaybackSpeed(1);
    }
  }, [camera?.id]);

  // Video time tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 100);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isScrubbing]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen || !camera) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigateCamera('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigateCamera('next');
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleTakeSnapshot();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleToggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, camera, allCameras]);

  if (!isOpen || !camera) return null;

  const currentIndex = allCameras.findIndex((c) => c.id === camera.id);
  const prevCamera = allCameras[(currentIndex - 1 + allCameras.length) % allCameras.length];
  const nextCamera = allCameras[(currentIndex + 1) % allCameras.length];

  const handleNavigateCamera = (direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? prevCamera : nextCamera;
    if (target) onSelectCamera(target);
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleSkipSeconds = (seconds: number) => {
    if (videoRef.current) {
      const target = Math.max(0, Math.min(videoRef.current.duration || 100, videoRef.current.currentTime + seconds));
      handleSeek(target);
    }
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1920;
      canvas.height = videoRef.current.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Add watermark overlay
        ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
        ctx.fillRect(20, 20, 480, 70);
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`SEEMADRISHTI // ${camera.tag}: ${camera.name}`, 35, 48);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText(`TIMESTAMP: ${new Date().toISOString()} // MIL-STD-810H`, 35, 72);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `seemadrishti_snapshot_${camera.tag}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSnapshotToast(`Snapshot captured: ${camera.tag}`);
        setTimeout(() => setSnapshotToast(null), 3000);
      }
    } catch {
      setSnapshotToast(`Snapshot captured: ${camera.tag}`);
      setTimeout(() => setSnapshotToast(null), 3000);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      recordingEngine.stopRecording(String(camera.id));
      setIsRecording(false);
      setSnapshotToast(`Recording stopped & saved to Evidence Vault`);
    } else {
      recordingEngine.startRecording({
        id: String(camera.id),
        code: camera.tag,
        name: camera.name,
        rtspUrl: camera.src,
        location: (camera as any).location || camera.name,
        status: 'online',
        resolution: camera.resolution || '4K UHD',
        fps: camera.fps || 60,
        bitrate: camera.bitrate || '8.2 Mbps',
        aiModels: camera.aiModels || ['YOLOv8-Border'],
        activeDetections: 2,
        dangerZones: [],
      });
      setIsRecording(true);
      setSnapshotToast(`Recording active on ${camera.tag}`);
    }
    setTimeout(() => setSnapshotToast(null), 3500);
  };

  // Camera alert items
  const camAlerts = alerts.filter(
    (a) => a.camera.toLowerCase() === camera.tag.toLowerCase() || a.camera.toLowerCase() === `cam-0${camera.id}`.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#02050e]/98 flex flex-col justify-between overflow-hidden font-mono select-none animate-fadeIn backdrop-blur-2xl">
      {/* 1. Floating Top Glass HUD Header */}
      <div className="relative z-20 w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.12] bg-slate-950/60 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{camera.tag}</span>
          </div>

          <div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-wider flex items-center gap-2">
              <span>{camera.name}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                [{(camera as any).location || 'Primary Border Sector'}]
              </span>
            </h1>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="text-emerald-400 font-bold">● {camera.status.toUpperCase()}</span>
              <span>{camera.resolution || '1080p FHD'}</span>
              <span>{camera.fps || 60} FPS</span>
              <span>{camera.bitrate || '8.2 Mbps'}</span>
              <span className="text-cyan-400 font-bold">INFERENCE: 14ms</span>
            </div>
          </div>
        </div>

        {/* Center Quick Navigation Controls */}
        <div className="hidden md:flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1 backdrop-blur-md">
          <button
            onClick={() => handleNavigateCamera('prev')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Previous Camera (Left Arrow)"
          >
            <ChevronLeft size={14} />
            <span>PREV ({prevCamera?.tag})</span>
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => handleNavigateCamera('next')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Next Camera (Right Arrow)"
          >
            <span>NEXT ({nextCamera?.tag})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Record Button */}
          <button
            onClick={handleToggleRecording}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : 'bg-white/[0.05] hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
          >
            <Disc size={13} className={isRecording ? 'animate-spin' : ''} />
            <span>{isRecording ? 'REC ACTIVE' : 'RECORD'}</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={handleTakeSnapshot}
            className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-cyan-500/20 hover:border-cyan-400/50 text-slate-200 hover:text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Capture High-Res Forensic Snapshot (S)"
          >
            <Camera size={13} />
            <span>SNAPSHOT</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-white/20 bg-white/[0.05] hover:bg-rose-500/20 hover:border-rose-400/50 text-slate-300 hover:text-rose-300 transition-all cursor-pointer"
            title="Close Fullscreen (ESC)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Snapshot / Recording Toast Feedback */}
      {snapshotToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 text-xs font-bold flex items-center gap-2 backdrop-blur-xl shadow-[0_0_25px_rgba(0,240,255,0.4)] animate-bounce">
          <Sparkles size={14} className="text-cyan-400" />
          <span>{snapshotToast}</span>
        </div>
      )}

      {/* 2. Main Unobstructed Video Surface */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {/* Subtle Cyber Grid Reticle */}
        <div className="absolute inset-0 bg-[radial-gradient(#00f0ff08_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none z-10" />

        {/* Tactical Corner HUD Reticles */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none z-10" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none z-10" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none z-10" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none z-10" />

        {/* Video Element with Dynamic Optical Filters */}
        <video
          ref={videoRef}
          src={camera.src || `/fixtures/moving_objects.mp4`}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-contain transition-all duration-200"
          style={{
            filter: thermalMode
              ? 'invert(1) hue-rotate(180deg) saturate(2.5) contrast(1.4)'
              : nightVision
              ? 'sepia(100%) hue-rotate(90deg) saturate(3) brightness(1.2) contrast(1.3)'
              : 'none',
            transform: `scale(${zoomLevel})`,
          }}
        />

        {/* Minimal On-Footage Telemetry Watermark */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[11px] text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">{camera.tag}</span>
            <span className="text-slate-400">|</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
          {nightVision && (
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 w-fit">
              NV-IR SENSOR ACTIVE
            </span>
          )}
          {thermalMode && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 w-fit">
              THERMAL SPECTROMETRY
            </span>
          )}
        </div>

        {/* Active Incident Warning Watermark */}
        {camAlerts.length > 0 && (
          <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-rose-950/80 border border-rose-500/60 text-rose-300 px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse">
            <AlertTriangle size={15} className="text-rose-400" />
            <span className="text-xs font-black">{camAlerts.length} CRITICAL BREACHES</span>
          </div>
        )}
      </div>

      {/* 3. Floating Bottom Cinematic Investigation Control Bar */}
      <div className="relative z-20 w-full px-4 sm:px-8 py-3.5 border-t border-white/[0.12] bg-slate-950/70 backdrop-blur-xl flex flex-col gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        
        {/* 24-Hour Timeline Scrubbing Bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
          </span>

          <div className="relative flex-1 h-3.5 bg-slate-900/80 rounded-full border border-white/15 overflow-hidden cursor-pointer group">
            {/* Recorded Footage Continuous Timeline Span (Green/Cyan) */}
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/25 to-teal-500/20" />

            {/* AI Incident Bookmark Markers on Timeline */}
            {camAlerts.map((alt, idx) => (
              <div
                key={alt.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek((idx + 1) * 15);
                  setSnapshotToast(`Jumped to Incident: ${alt.title}`);
                }}
                className="absolute top-0 bottom-0 w-1.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] cursor-pointer hover:w-2.5 transition-all z-10"
                style={{ left: `${(idx + 1) * 22}%` }}
                title={`Incident: ${alt.title} (${alt.severity})`}
              />
            ))}

            {/* Playhead Scrubber */}
            <div
              className="absolute top-0 bottom-0 bg-cyan-400 w-1 shadow-[0_0_12px_#00f0ff]"
              style={{ left: `${(currentTime / (duration || 100)) * 100}%` }}
            />

            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="text-[10px] text-slate-400 font-bold shrink-0">
            {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Bottom Control Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSkipSeconds(-10)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Replay 10s Back"
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={handleTogglePlay}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all cursor-pointer active:scale-95"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
            </button>

            <button
              onClick={() => handleSkipSeconds(10)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Skip 10s Forward"
            >
              <FastForward size={15} />
            </button>

            {/* Playback Speed Selectors */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
              {[0.5, 1, 2, 4, 8].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Optical & Sensor Mode Selectors */}
          <div className="flex items-center gap-2">
            {/* Night Vision IR */}
            <button
              onClick={() => {
                setNightVision(!nightVision);
                if (thermalMode) setThermalMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                nightVision
                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <Eye size={13} />
              <span>NV-IR</span>
            </button>

            {/* Thermal Mode */}
            <button
              onClick={() => {
                setThermalMode(!thermalMode);
                if (nightVision) setNightVision(false);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                thermalMode
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <Flame size={13} />
              <span>THERMAL</span>
            </button>

            {/* PTZ Zoom Controls */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1 rounded text-slate-300 hover:text-cyan-300 hover:bg-white/[0.08] cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <span className="text-[10px] text-cyan-300 font-bold px-1">{zoomLevel.toFixed(1)}x</span>
              <button
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                className="p-1 rounded text-slate-300 hover:text-cyan-300 hover:bg-white/[0.08] cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                !isMuted
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-slate-200'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
