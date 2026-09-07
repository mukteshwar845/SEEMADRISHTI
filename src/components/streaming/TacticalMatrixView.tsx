import React, { useState, useEffect, useMemo } from 'react';
import { MatrixCameraFeed, AlertItem } from '../../types';
import { MatrixCameraCell } from './MatrixCameraCell';
import { CinematicCameraFullscreenModal } from '../matrix/CinematicCameraFullscreenModal';
import { Tactical3DCard } from '../common/Tactical3DCard';
import {
  Grid,
  Layers,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Radio,
  Sliders,
  Sparkles,
  Camera,
  Disc,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  Video,
  RefreshCcw,
  Flame,
  Pin,
  LayoutGrid,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { recordingEngine } from '../../utils/recordingManager';
import { voiceCommandService } from '../../services/voiceCommandService';
import { useTheme } from '../../context/ThemeContext';

export type MatrixLayoutMode = 'spotlight-1x1' | 'spotlight' | 'quad-2x2' | 'matrix-3x3' | 'wall-4x4' | 'adaptive';

interface TacticalMatrixViewProps {
  cameras: MatrixCameraFeed[];
  alerts?: AlertItem[];
  onUpdateCameraName: (id: number, newName: string) => void;
  onUpdateCameraSource?: (id: number, newSrc: string, customName?: string) => void;
  onBatchUpdateSources?: (updates: { id: number; src: string; customName?: string }[]) => void;
  onSelectCameraForDetails?: (cam: MatrixCameraFeed) => void;
  onTriggerAlert?: (cam: MatrixCameraFeed) => void;
  confidenceThreshold?: number;
  onConfidenceThresholdChange?: (val: number) => void;
  highlightedCameraIds?: string[];
  spotlightCameraOverride?: number | null;
}

export const TacticalMatrixView: React.FC<TacticalMatrixViewProps> = ({
  cameras,
  alerts = [],
  onUpdateCameraName,
  onSelectCameraForDetails,
  onTriggerAlert,
  confidenceThreshold = 85,
  onConfidenceThresholdChange,
  highlightedCameraIds = [],
  spotlightCameraOverride,
}) => {
  const { isDaylight, theme } = useTheme();
  const [layoutMode, setLayoutMode] = useState<MatrixLayoutMode>('matrix-3x3');
  const [spotlightCameraId, setSpotlightCameraId] = useState<number>(1);
  const [quadPageIndex, setQuadPageIndex] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LIVE' | 'RECORDING' | 'ALERTS' | 'AI' | 'PINNED'>('ALL');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [pinnedCameraIds, setPinnedCameraIds] = useState<number[]>([1]);
  const [fullscreenCamera, setFullscreenCamera] = useState<MatrixCameraFeed | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState('10:45:22 AM');
  const [globalRecording, setGlobalRecording] = useState(false);
  const [isPatrolMode, setIsPatrolMode] = useState(false);
  const [patrolInterval, setPatrolInterval] = useState(5);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);

  // Sync external spotlight override (e.g. clicked alert "Jump to Cam")
  useEffect(() => {
    if (spotlightCameraOverride) {
      setSpotlightCameraId(spotlightCameraOverride);
      setLayoutMode('spotlight-1x1');
    }
  }, [spotlightCameraOverride]);

  // Calculate heatmap data
  const heatmapData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    let max = 0;
    alerts.forEach(alert => {
      counts[alert.camera] = (counts[alert.camera] || 0) + 1;
      if (counts[alert.camera] > max) {
        max = counts[alert.camera];
      }
    });
    const intensities: Record<string, number> = {};
    Object.keys(counts).forEach(camTag => {
      intensities[camTag] = max > 0 ? counts[camTag] / max : 0;
    });
    return intensities;
  }, [alerts]);

  // Patrol Mode logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isPatrolMode) {
      // Force spotlight mode when patrol starts
      setLayoutMode('spotlight');
      
      intervalId = setInterval(() => {
        setSpotlightCameraId((prev) => {
          const currentIndex = cameras.findIndex(c => c.id === prev);
          const nextIndex = (currentIndex + 1) % cameras.length;
          return cameras[nextIndex]?.id || prev;
        });
      }, patrolInterval * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPatrolMode, patrolInterval, cameras]);

  // Voice Command integration for Tactical Matrix layouts
  useEffect(() => {
    const unsub = voiceCommandService.onCommand((match) => {
      if (match.action.type === 'SET_MATRIX_LAYOUT') {
        setLayoutMode(match.action.layout);
      } else if (match.action.type === 'TOGGLE_PATROL') {
        setIsPatrolMode((p) => !p);
      }
    });
    return unsub;
  }, []);

  // Real-time live timestamp clock updater
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let h = d.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const hStr = String(h).padStart(2, '0');
      const mStr = String(d.getMinutes()).padStart(2, '0');
      const sStr = String(d.getSeconds()).padStart(2, '0');
      setLiveTimestamp(`${hStr}:${mStr}:${sStr} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to recording state
  useEffect(() => {
    const unsub = recordingEngine.subscribe((active) => {
      setGlobalRecording(active.size > 0);
    });
    return unsub;
  }, []);

  const handleToggleRecordAll = () => {
    if (globalRecording) {
      recordingEngine.stopAllRecordings();
    } else {
      cameras.forEach((cam) => {
        recordingEngine.startRecording({
          id: String(cam.id),
          code: cam.tag,
          name: cam.name,
          rtspUrl: cam.src,
          location: cam.location || cam.name,
          status: 'online',
          resolution: cam.resolution || '4K UHD',
          fps: cam.fps || 60,
          bitrate: cam.bitrate || '8.2 Mbps',
          aiModels: cam.aiModels || ['YOLOv11-Border'],
          activeDetections: cam.activeDetections || 2,
          dangerZones: [],
        });
      });
    }
  };

  // Toggle camera pin
  const handleTogglePinCamera = (camId: number) => {
    setPinnedCameraIds((prev) =>
      prev.includes(camId) ? prev.filter((id) => id !== camId) : [...prev, camId]
    );
  };

  // Filter cameras
  const filteredCameras = useMemo(() => {
    let list = [...cameras];

    // Sector Filter
    if (selectedSectorFilter !== 'ALL') {
      list = list.filter((c) => {
        const loc = (c as any).location || c.name;
        return loc.toLowerCase().includes(selectedSectorFilter.toLowerCase());
      });
    }

    // Status / Risk / Pinned Filter
    if (activeFilter === 'LIVE') {
      list = list.filter((c) => c.status === 'Online');
    } else if (activeFilter === 'RECORDING') {
      list = list.filter((c) => recordingEngine.isRecording(String(c.id)) || c.src?.includes('.mp4'));
    } else if (activeFilter === 'ALERTS') {
      list = list.filter((c) => {
        return (
          c.risk === 'High' ||
          alerts.some(
            (a) =>
              (a.severity === 'Critical' || a.severity === 'High') &&
              (a.camera.toLowerCase() === c.tag.toLowerCase() || a.camera.toLowerCase() === `cam-0${c.id}`)
          )
        );
      });
    } else if (activeFilter === 'AI') {
      list = list.filter((c) => (c.activeDetections && c.activeDetections > 0) || (c.aiModels && c.aiModels.length > 0));
    } else if (activeFilter === 'PINNED') {
      list = list.filter((c) => pinnedCameraIds.includes(c.id));
    }

    // Sort: If Adaptive Mode, pinned cameras first, then cameras with alerts, then rest
    if (layoutMode === 'adaptive') {
      list.sort((a, b) => {
        const aPinned = pinnedCameraIds.includes(a.id) ? 1 : 0;
        const bPinned = pinnedCameraIds.includes(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        const aAlerts = alerts.filter(
          (alt) => alt.camera.toLowerCase() === a.tag.toLowerCase() || alt.camera.toLowerCase() === `cam-0${a.id}`
        ).length;
        const bAlerts = alerts.filter(
          (alt) => alt.camera.toLowerCase() === b.tag.toLowerCase() || alt.camera.toLowerCase() === `cam-0${b.id}`
        ).length;
        return bAlerts - aAlerts;
      });
    }

    return list;
  }, [cameras, activeFilter, selectedSectorFilter, pinnedCameraIds, alerts, layoutMode]);

  // Spotlight active camera & side thumbnails
  const spotlightCamera = cameras.find((c) => c.id === spotlightCameraId) || cameras[0];
  const sideThumbnails = cameras.filter((c) => c.id !== spotlightCamera.id);

  // 2x2 Quad View pagination (4 cameras per page)
  const quadPages = useMemo(() => {
    const pages: MatrixCameraFeed[][] = [];
    for (let i = 0; i < filteredCameras.length; i += 4) {
      pages.push(filteredCameras.slice(i, i + 4));
    }
    return pages.length > 0 ? pages : [filteredCameras];
  }, [filteredCameras]);
  const currentQuadFeeds = quadPages[quadPageIndex] || quadPages[0] || [];

  return (
    <div className="space-y-3.5 flex flex-col w-full" id="tactical-matrix-view-root">
      {/* 1. Sleek Glass Command Toolbar */}
      <div className={`p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl flex flex-col xl:flex-row xl:items-center justify-between gap-3 border transition-colors ${
        isDaylight
          ? 'bg-white/95 border-slate-300 shadow-md text-slate-900'
          : 'bg-slate-900/80 border-white/[0.10] shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-white'
      }`}>
        {/* Left: Matrix Identity & Real-time Live Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Video size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xs sm:text-sm font-black uppercase tracking-widest font-mono ${
                isDaylight ? 'text-slate-900' : 'text-white'
              }`}>
                CCTV SURVEILLANCE MATRIX
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-400/30 text-[9px] font-bold font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                9/9 ONLINE
              </span>
            </div>
            <p className={`text-[10px] font-mono hidden sm:block ${
              isDaylight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              Synchronized border telemetry feeds &bull; 1080p @ 60 FPS &bull; Edge Neural Tracking
            </p>
          </div>
        </div>

        {/* Right: Modern Glass Layout Switchers & Tactical Modes */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Global Record All Button */}
          <button
            id="btn-global-record-all"
            onClick={handleToggleRecordAll}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              globalRecording
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : isDaylight
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                : 'bg-white/[0.04] text-rose-400 hover:text-white border-rose-500/30 hover:bg-rose-950/40'
            }`}
          >
            <Disc size={13} className={globalRecording ? 'animate-spin' : ''} />
            <span>{globalRecording ? 'REC ACTIVE' : 'REC ALL'}</span>
          </button>

          {/* Layout Mode Button Group */}
          <div className={`flex items-center rounded-xl p-1 backdrop-blur-md border ${
            isDaylight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'
          }`}>
            {/* 1x1 Spotlight */}
            <button
              id="btn-layout-1x1"
              onClick={() => { setLayoutMode('spotlight-1x1'); setIsPatrolMode(false); }}
              title="1x1 Spotlight Hero Focus (1 Dominant Feed + Thumbnails)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                layoutMode === 'spotlight-1x1' && !isPatrolMode
                  ? 'bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : isDaylight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 size={13} />
              <span>1&times;1</span>
            </button>

            {/* 2x2 Quad */}
            <button
              id="btn-layout-2x2"
              onClick={() => { setLayoutMode('quad-2x2'); setIsPatrolMode(false); }}
              title="2x2 Quad High-Resolution Grid"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                layoutMode === 'quad-2x2'
                  ? 'bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : isDaylight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>2&times;2</span>
            </button>

            {/* 3x3 Standard Matrix */}
            <button
              id="btn-layout-3x3"
              onClick={() => { setLayoutMode('matrix-3x3'); setIsPatrolMode(false); }}
              title="3x3 Synchronized Tactical Matrix (All 9 Feeds)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                layoutMode === 'matrix-3x3'
                  ? 'bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : isDaylight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid size={13} />
              <span>3&times;3</span>
            </button>

            {/* 4x4 Wall 16 */}
            <button
              id="btn-layout-4x4"
              onClick={() => { setLayoutMode('wall-4x4'); setIsPatrolMode(false); }}
              title="4x4 Extended Surveillance Wall"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                layoutMode === 'wall-4x4'
                  ? 'bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : isDaylight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>4&times;4</span>
            </button>

            {/* Adaptive Smart Wall */}
            <button
              id="btn-layout-adaptive"
              onClick={() => { setLayoutMode('adaptive'); setIsPatrolMode(false); }}
              title="Smart Adaptive Wall (Auto-Prioritizes Pinned & Alert Feeds)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                layoutMode === 'adaptive'
                  ? 'bg-purple-500/30 text-purple-600 dark:text-purple-300 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : isDaylight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>SMART WALL</span>
            </button>
          </div>

          {/* Patrol Mode Toggle */}
          <div className={`flex items-center gap-1 rounded-xl p-1 border ${
            isDaylight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'
          }`}>
            <button
              id="btn-layout-patrol"
              onClick={() => setIsPatrolMode(!isPatrolMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPatrolMode
                  ? 'bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : isDaylight ? 'text-amber-700 hover:text-amber-900' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <RefreshCcw size={13} className={isPatrolMode ? 'animate-[spin_4s_linear_infinite]' : ''} />
              <span>PATROL</span>
            </button>

            {isPatrolMode && (
              <select
                value={patrolInterval}
                onChange={(e) => setPatrolInterval(Number(e.target.value))}
                className="bg-transparent text-amber-600 dark:text-amber-300 border-l border-slate-300 dark:border-white/10 text-xs font-mono px-1.5 py-0.5 outline-none cursor-pointer"
                title="Patrol Cycle Interval"
              >
                <option value={3} className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">3s</option>
                <option value={5} className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">5s</option>
                <option value={10} className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">10s</option>
                <option value={30} className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">30s</option>
              </select>
            )}
          </div>

          {/* Threat Heatmap Toggle */}
          <button
            id="btn-layout-heatmap"
            onClick={() => setIsHeatmapActive(!isHeatmapActive)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isHeatmapActive
                ? 'bg-rose-500/30 text-rose-700 dark:text-rose-300 border-rose-400/60 shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                : isDaylight
                ? 'bg-slate-100 text-rose-700 hover:bg-slate-200 border-slate-300'
                : 'bg-white/[0.04] text-rose-400 hover:text-rose-300 border-white/10'
            }`}
          >
            <Flame size={13} className={isHeatmapActive ? 'animate-pulse' : ''} />
            <span>HEATMAP</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Multi-Filter & Sector Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-mono backdrop-blur-md border ${
        isDaylight
          ? 'bg-white/90 border-slate-300 shadow-sm text-slate-800'
          : 'bg-slate-950/60 border-white/[0.08] text-slate-300'
      }`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mr-1 ${
            isDaylight ? 'text-slate-700' : 'text-slate-400'
          }`}>
            <Filter size={11} className="text-cyan-500" />
            FILTER:
          </span>

          {[
            { id: 'ALL', label: `ALL (${cameras.length})` },
            { id: 'LIVE', label: 'LIVE' },
            { id: 'RECORDING', label: 'REC' },
            { id: 'ALERTS', label: 'CRITICAL / ALERTS' },
            { id: 'AI', label: 'AI DETECTIONS' },
            { id: 'PINNED', label: `PINNED (${pinnedCameraIds.length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : isDaylight
                  ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                  : 'text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sector Dropdown & AI Confidence */}
        <div className="flex items-center gap-3">
          {/* Sector Selector */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${isDaylight ? 'text-slate-700' : 'text-slate-400'}`}>SECTOR:</span>
            <select
              value={selectedSectorFilter}
              onChange={(e) => setSelectedSectorFilter(e.target.value)}
              className={`text-[10px] font-mono px-2 py-1 rounded-lg outline-none cursor-pointer border ${
                isDaylight
                  ? 'bg-slate-50 text-slate-800 border-slate-300'
                  : 'bg-slate-900 text-slate-200 border-white/10'
              }`}
            >
              <option value="ALL">All Sectors (HQ)</option>
              <option value="Alpha">Sector Alpha (Main Gate)</option>
              <option value="Bravo">Sector Bravo (Perimeter)</option>
              <option value="Charlie">Sector Charlie (Checkpoint)</option>
              <option value="Delta">Sector Delta (High Altitude)</option>
              <option value="Echo">Sector Echo (Riverine)</option>
            </select>
          </div>

          {/* AI Confidence Filter */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Sparkles size={11} className="text-purple-500 dark:text-purple-400" />
            <span className={`text-[10px] ${isDaylight ? 'text-slate-700' : 'text-slate-400'}`}>CONF:</span>
            <input
              type="range"
              min="50"
              max="99"
              value={confidenceThreshold}
              onChange={(e) => onConfidenceThresholdChange?.(Number(e.target.value))}
              className="w-16 h-1 bg-slate-300 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-purple-600 dark:text-purple-300 font-bold text-[10px]">{confidenceThreshold}%</span>
          </div>

          {/* 2x2 Quad Page Nav */}
          {layoutMode === 'quad-2x2' && (
            <div className="flex items-center gap-1 pl-2 border-l border-white/10">
              <span className="text-[10px] text-slate-400">PAGE {quadPageIndex + 1}/{quadPages.length}</span>
              <button
                onClick={() => setQuadPageIndex((p) => Math.max(0, p - 1))}
                disabled={quadPageIndex === 0}
                className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => setQuadPageIndex((p) => Math.min(quadPages.length - 1, p + 1))}
                disabled={quadPageIndex === quadPages.length - 1}
                className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. DYNAMIC CCTV GRID LAYOUTS */}

      {/* LAYOUT 1: 3x3 Standard Matrix Grid */}
      {layoutMode === 'matrix-3x3' && (
        <div
          id="tactical-grid-3x3-container"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 perspective-1500"
        >
          {filteredCameras.map((cam) => {
            const isPinned = pinnedCameraIds.includes(cam.id);
            const isHighlighted = highlightedCameraIds?.some(
              (cid) => cid.toLowerCase() === cam.tag.toLowerCase() || cid.toLowerCase() === `cam-0${cam.id}` || cid.toLowerCase() === `cam-${cam.id}`
            );

            return (
              <Tactical3DCard
                key={cam.id}
                maxTilt={12}
                scale={1.025}
                className={`rounded-2xl group ${
                  isHighlighted ? 'ring-2 ring-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse' : ''
                }`}
                onDoubleClick={() => setFullscreenCamera(cam)}
              >
                <MatrixCameraCell
                  camera={cam}
                  liveTimestamp={liveTimestamp}
                  onUpdateCameraName={onUpdateCameraName}
                  onSelectSpotlight={(c) => {
                    setSpotlightCameraId(c.id);
                    setLayoutMode('spotlight-1x1');
                  }}
                  onTriggerAlert={onTriggerAlert}
                  heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
                />

                {/* Pin Camera Quick Float Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePinCamera(cam.id);
                  }}
                  className={`absolute top-2 right-12 z-20 p-1 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
                    isPinned
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                      : 'bg-black/60 text-slate-400 hover:text-amber-300 opacity-0 group-hover:opacity-100'
                  }`}
                  title={isPinned ? 'Unpin from Top' : 'Pin Camera to Top'}
                >
                  <Pin size={11} className={isPinned ? 'fill-black' : ''} />
                </button>
              </Tactical3DCard>
            );
          })}
        </div>
      )}

      {/* LAYOUT 2: 2x2 Quad High-Resolution Focus */}
      {layoutMode === 'quad-2x2' && (
        <div
          id="tactical-quad-2x2-container"
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5 perspective-1500"
        >
          {currentQuadFeeds.map((cam) => (
            <Tactical3DCard
              key={cam.id}
              maxTilt={10}
              scale={1.02}
              className="rounded-2xl group"
              onDoubleClick={() => setFullscreenCamera(cam)}
            >
              <MatrixCameraCell
                camera={cam}
                liveTimestamp={liveTimestamp}
                onUpdateCameraName={onUpdateCameraName}
                onSelectSpotlight={(c) => {
                  setSpotlightCameraId(c.id);
                  setLayoutMode('spotlight-1x1');
                }}
                onTriggerAlert={onTriggerAlert}
                heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
              />
            </Tactical3DCard>
          ))}
        </div>
      )}

      {/* LAYOUT 3: 1x1 Spotlight Hero Focus + Side Thumbnail Strip */}
      {(layoutMode === 'spotlight-1x1' || layoutMode === 'spotlight') && (
        <div
          id="tactical-spotlight-container"
          className="grid grid-cols-1 lg:grid-cols-4 gap-3.5"
        >
          {/* Main Large Spotlight Camera (3 columns wide) */}
          <div
            className="lg:col-span-3 min-h-[520px] rounded-2xl overflow-hidden shadow-2xl"
            onDoubleClick={() => setFullscreenCamera(spotlightCamera)}
          >
            <MatrixCameraCell
              camera={spotlightCamera}
              isSpotlight={true}
              liveTimestamp={liveTimestamp}
              onUpdateCameraName={onUpdateCameraName}
              onTriggerAlert={onTriggerAlert}
              heatmapIntensity={isHeatmapActive ? heatmapData[spotlightCamera.tag] || 0 : undefined}
            />
          </div>

          {/* Side Thumbnail Rail (1 column wide scrollable) */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>SWITCH SPOTLIGHT FEED:</span>
              <span className="text-cyan-400">1-CLICK</span>
            </div>
            {sideThumbnails.map((cam) => (
              <div
                key={cam.id}
                onClick={() => setSpotlightCameraId(cam.id)}
                className="cursor-pointer transition-all hover:scale-[1.02] rounded-xl overflow-hidden relative group border border-white/[0.08] hover:border-cyan-400/50"
              >
                <MatrixCameraCell
                  camera={cam}
                  isCompact={true}
                  liveTimestamp={liveTimestamp}
                  onUpdateCameraName={onUpdateCameraName}
                  onTriggerAlert={onTriggerAlert}
                  heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
                />
                <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 pointer-events-none transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LAYOUT 4: 4x4 High-Density Surveillance Wall */}
      {layoutMode === 'wall-4x4' && (
        <div
          id="tactical-wall-4x4-container"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5"
        >
          {filteredCameras.map((cam) => (
            <div
              key={cam.id}
              className="relative group rounded-xl"
              onDoubleClick={() => setFullscreenCamera(cam)}
            >
              <MatrixCameraCell
                camera={cam}
                isCompact={true}
                liveTimestamp={liveTimestamp}
                onUpdateCameraName={onUpdateCameraName}
                onSelectSpotlight={(c) => {
                  setSpotlightCameraId(c.id);
                  setLayoutMode('spotlight-1x1');
                }}
                onTriggerAlert={onTriggerAlert}
                heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* LAYOUT 5: Smart Adaptive Wall */}
      {layoutMode === 'adaptive' && (
        <div
          id="tactical-adaptive-container"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
        >
          {filteredCameras.map((cam, idx) => {
            const isTopPriority = idx === 0;
            const isPinned = pinnedCameraIds.includes(cam.id);

            return (
              <div
                key={cam.id}
                className={`relative group rounded-2xl ${
                  isTopPriority ? 'md:col-span-2 md:row-span-2' : ''
                }`}
                onDoubleClick={() => setFullscreenCamera(cam)}
              >
                <MatrixCameraCell
                  camera={cam}
                  isSpotlight={isTopPriority}
                  liveTimestamp={liveTimestamp}
                  onUpdateCameraName={onUpdateCameraName}
                  onSelectSpotlight={(c) => {
                    setSpotlightCameraId(c.id);
                    setLayoutMode('spotlight-1x1');
                  }}
                  onTriggerAlert={onTriggerAlert}
                  heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
                />

                {isPinned && (
                  <div className="absolute top-2 right-12 z-20 px-2 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold font-mono flex items-center gap-1 shadow-md">
                    <Pin size={10} className="fill-black" />
                    <span>PINNED</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Cinematic Fullscreen Modal */}
      <CinematicCameraFullscreenModal
        camera={fullscreenCamera}
        allCameras={cameras}
        alerts={alerts}
        isOpen={Boolean(fullscreenCamera)}
        onClose={() => setFullscreenCamera(null)}
        onSelectCamera={(cam) => setFullscreenCamera(cam)}
        onTriggerAlert={onTriggerAlert}
      />
    </div>
  );
};

