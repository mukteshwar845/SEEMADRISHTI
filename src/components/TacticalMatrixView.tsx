import React, { useState, useEffect } from 'react';
import { MatrixCameraFeed, AlertItem } from '../types';
import { MatrixCameraCell } from './MatrixCameraCell';
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
} from 'lucide-react';
import { recordingEngine } from '../utils/recordingManager';
import { voiceCommandService } from '../services/voiceCommandService';

export type MatrixLayoutMode = 'matrix-3x3' | 'quad-2x2' | 'spotlight';

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
}) => {
  const [layoutMode, setLayoutMode] = useState<MatrixLayoutMode>('matrix-3x3');
  const [spotlightCameraId, setSpotlightCameraId] = useState<number>(1);
  const [quadPageIndex, setQuadPageIndex] = useState<number>(0);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'NORMAL'>('ALL');
  const [liveTimestamp, setLiveTimestamp] = useState('10:45:22 AM');
  const [globalRecording, setGlobalRecording] = useState(false);
  const [isPatrolMode, setIsPatrolMode] = useState(false);
  const [patrolInterval, setPatrolInterval] = useState(5);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);

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

  // Filter cameras
  const filteredCameras = cameras.filter((cam) => {
    if (filterRisk === 'HIGH') return cam.risk === 'High';
    if (filterRisk === 'NORMAL') return cam.risk === 'Normal' || cam.risk === 'Low';
    return true;
  });

  // Spotlight active camera & side thumbnails
  const spotlightCamera = cameras.find((c) => c.id === spotlightCameraId) || cameras[0];
  const sideThumbnails = cameras.filter((c) => c.id !== spotlightCamera.id);

  // 2x2 Quad View pagination (4 cameras per page)
  const quadPages = [
    cameras.slice(0, 4), // Feeds 1-4
    cameras.slice(4, 8), // Feeds 5-8
    cameras.slice(8, 9), // Feed 9
  ];
  const currentQuadFeeds = quadPages[quadPageIndex] || quadPages[0];

  return (
    <div className="space-y-4" id="tactical-matrix-view-root">
      {/* 1. Control Header Bar with Dynamic Layout View Buttons */}
      <div className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center p-1 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-400">
              <Grid size={15} />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-widest font-mono">
              CAMERA LIVE CCTV & RECORDED TRACKING MATRIX
            </h2>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold font-mono animate-pulse">
              9/9 LIVE FEEDS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time multi-angle surveillance feeds with synchronized AI object detection, ANPR, & velocity tracking
          </p>
        </div>

        {/* Dynamic Layout Mode Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Global Record All Toggle */}
          <button
            id="btn-global-record-all"
            onClick={handleToggleRecordAll}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              globalRecording
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-slate-950 text-rose-400 hover:text-white border-slate-800 hover:bg-rose-950/50'
            }`}
          >
            <Disc size={13} className={globalRecording ? 'animate-spin' : ''} />
            <span>{globalRecording ? 'REC ACTIVE (ALL 9)' : 'REC ALL 9'}</span>
          </button>

          {/* Button 1: 3x3 Tactical Matrix */}
          <button
            id="btn-layout-3x3"
            onClick={() => { setLayoutMode('matrix-3x3'); setIsPatrolMode(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              layoutMode === 'matrix-3x3'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Grid size={13} />
            <span>3x3 Matrix (All 9)</span>
          </button>

          {/* Button 2: 2x2 Quad View */}
          <button
            id="btn-layout-2x2"
            onClick={() => { setLayoutMode('quad-2x2'); setIsPatrolMode(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              layoutMode === 'quad-2x2'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Layers size={13} />
            <span>2x2 Quad View</span>
          </button>

          {/* Button 3: Spotlight Mode */}
          <button
            id="btn-layout-spotlight"
            onClick={() => { setLayoutMode('spotlight'); setIsPatrolMode(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              layoutMode === 'spotlight' && !isPatrolMode
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Maximize2 size={13} />
            <span>Spotlight (1+8)</span>
          </button>

          {/* Button 4: Patrol Mode */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              id="btn-layout-patrol"
              onClick={() => setIsPatrolMode(!isPatrolMode)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isPatrolMode
                  ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(251,191,36,0.4)] font-bold'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
            >
              <RefreshCcw size={13} className={isPatrolMode ? 'animate-[spin_4s_linear_infinite]' : ''} />
              <span>PATROL MODE</span>
            </button>
            
            {isPatrolMode && (
              <select
                value={patrolInterval}
                onChange={(e) => setPatrolInterval(Number(e.target.value))}
                className="bg-transparent text-amber-400 border-l border-amber-500/30 text-xs font-mono px-2 py-1 outline-none cursor-pointer appearance-none text-center hover:bg-amber-950/50 transition-colors"
                title="Patrol Interval"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
              </select>
            )}
          </div>
          
          {/* Button 5: Threat Heatmap */}
          <button
            id="btn-layout-heatmap"
            onClick={() => setIsHeatmapActive(!isHeatmapActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              isHeatmapActive
                ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.6)]'
                : 'bg-slate-950 text-rose-400 hover:text-rose-300 border-slate-800 hover:bg-rose-950/30'
            }`}
          >
            <Flame size={13} className={isHeatmapActive ? 'animate-pulse' : ''} />
            <span>THREAT HEATMAP</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Toolbar: Risk Filters & Quick Metadata Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter size={12} className="text-cyan-400" />
              FILTER SECTOR:
            </span>
            <button
              onClick={() => setFilterRisk('ALL')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                filterRisk === 'ALL'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL (9)
            </button>
            <button
              onClick={() => setFilterRisk('HIGH')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                filterRisk === 'HIGH'
                  ? 'bg-rose-950 text-rose-300 border border-rose-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HIGH RISK ONLY
            </button>
            <button
              onClick={() => setFilterRisk('NORMAL')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                filterRisk === 'NORMAL'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NORMAL
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>

          {/* AI Confidence Threshold Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles size={12} className="text-purple-400" />
              AI CONFIDENCE FILTER:
            </span>
            <input
              type="range"
              min="50"
              max="99"
              value={confidenceThreshold}
              onChange={(e) => onConfidenceThresholdChange?.(Number(e.target.value))}
              className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-purple-300 font-bold text-[10px] w-8">
              {confidenceThreshold}%+
            </span>
          </div>
        </div>

        {layoutMode === 'quad-2x2' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">
              QUAD PAGE {quadPageIndex + 1} OF {quadPages.length}
            </span>
            <button
              onClick={() => setQuadPageIndex((p) => Math.max(0, p - 1))}
              disabled={quadPageIndex === 0}
              className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setQuadPageIndex((p) => Math.min(quadPages.length - 1, p + 1))}
              disabled={quadPageIndex === quadPages.length - 1}
              className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        <div className="text-[10px] text-slate-400 hidden sm:block">
          Click &ldquo;LIVE / RECORDED&rdquo; on any camera feed to scrub archived footage & telemetry bookmarks.
        </div>
      </div>

      {/* 3. DYNAMIC LAYOUT CONTAINER */}

      {/* MODE 1: 3x3 Tactical Matrix (All 9 Feeds Visible Simultaneously) */}
      {layoutMode === 'matrix-3x3' && (
        <div
          id="tactical-grid-3x3-container"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        >
          {filteredCameras.map((cam) => {
            const isHighlighted = highlightedCameraIds?.some(
              (cid) => cid.toLowerCase() === cam.tag.toLowerCase() || cid.toLowerCase() === `cam-0${cam.id}` || cid.toLowerCase() === `cam-${cam.id}`
            );
            return (
              <div key={cam.id} className={isHighlighted ? 'ring-2 ring-rose-500 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse' : ''}>
                <MatrixCameraCell
                  camera={cam}
                  liveTimestamp={liveTimestamp}
                  onUpdateCameraName={onUpdateCameraName}
                  onSelectSpotlight={(c) => {
                    setSpotlightCameraId(c.id);
                    setLayoutMode('spotlight');
                  }}
                  onTriggerAlert={onTriggerAlert}
                  heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: 2x2 Quad View (High-Res 4-Feed Focus) */}
      {layoutMode === 'quad-2x2' && (
        <div
          id="tactical-quad-2x2-container"
          className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
        >
          {currentQuadFeeds.map((cam) => (
            <MatrixCameraCell
              key={cam.id}
              camera={cam}
              liveTimestamp={liveTimestamp}
              onUpdateCameraName={onUpdateCameraName}
              onSelectSpotlight={(c) => {
                setSpotlightCameraId(c.id);
                setLayoutMode('spotlight');
              }}
              onTriggerAlert={onTriggerAlert}
              heatmapIntensity={isHeatmapActive ? heatmapData[cam.tag] || 0 : undefined}
            />
          ))}
        </div>
      )}

      {/* MODE 3: Spotlight View (1 Dominant Feed + 8 Side Thumbnails) */}
      {layoutMode === 'spotlight' && (
        <div
          id="tactical-spotlight-container"
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
        >
          {/* Main Large Spotlight Camera (3 columns wide) */}
          <div className="lg:col-span-3 min-h-[480px]">
            <MatrixCameraCell
              camera={spotlightCamera}
              isSpotlight={true}
              liveTimestamp={liveTimestamp}
              onUpdateCameraName={onUpdateCameraName}
              onTriggerAlert={onTriggerAlert}
              heatmapIntensity={isHeatmapActive ? heatmapData[spotlightCamera.tag] || 0 : undefined}
            />
          </div>

          {/* Side Thumbnail Feeds (1 column wide scrollable) */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
              Select Sector Feed to Spotlight:
            </div>
            {sideThumbnails.map((cam) => (
              <div
                key={cam.id}
                onClick={() => setSpotlightCameraId(cam.id)}
                className="cursor-pointer transition-all hover:scale-[1.02] relative group rounded-xl overflow-hidden"
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
    </div>
  );
};
