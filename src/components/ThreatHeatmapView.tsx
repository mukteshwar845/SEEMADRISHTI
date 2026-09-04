import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Eye,
  Sliders,
  Maximize2,
  Volume2,
  VolumeX,
  Target,
  Zap,
  Navigation,
} from 'lucide-react';
import {
  fetchThreatHeatmap,
  fetchCameraThreatProfile,
  ThreatHeatmapResponse,
  HeatmapCameraStat,
  ThreatHotspot,
  ThreatCorridorItem,
  CameraThreatProfile,
  SpatialHeatPoint,
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
  const [viewMode, setViewMode] = useState<'map' | 'grid' | 'corridors'>('map');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [heatmapData, setHeatmapData] = useState<ThreatHeatmapResponse | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(initialCameraId || null);
  const [cameraProfile, setCameraProfile] = useState<CameraThreatProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [highlightProfile, setHighlightProfile] = useState<boolean>(false);
  const [hoveredCameraId, setHoveredCameraId] = useState<string | null>(null);
  const [radarAngle, setRadarAngle] = useState<number>(0);
  const [actionAlertMsg, setActionAlertMsg] = useState<string | null>(null);

  // Layer Toggles
  const [showHeatShaders, setShowHeatShaders] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showSectorLabels, setShowSectorLabels] = useState<boolean>(true);
  const [showParticles, setShowParticles] = useState<boolean>(true);

  // Canvas ref for interactive 2D Tactical Map
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particleOffsetRef = useRef<number>(0);

  const handleDrillDown = useCallback((camId: string) => {
    setSelectedCameraId(camId);
    setHighlightProfile(true);
    setTimeout(() => setHighlightProfile(false), 2200);

    const profileEl = document.getElementById('node-threat-profile-panel');
    if (profileEl) {
      profileEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

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
  }, [timeWindow, selectedCameraId]);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  // WebSocket Live Event Subscriptions
  useEffect(() => {
    const unsubAlert = webSocketService.subscribe('alert', () => loadHeatmap());
    const unsubInc = webSocketService.subscribe('incident_created', () => loadHeatmap());
    const unsubCorr = webSocketService.subscribe('correlation_created', () => loadHeatmap());
    const unsubMv = webSocketService.subscribe('movement_update', () => loadHeatmap());
    const unsubAnom = webSocketService.subscribe('analytics_anomaly', () => loadHeatmap());

    return () => {
      unsubAlert();
      unsubInc();
      unsubCorr();
      unsubMv();
      unsubAnom();
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

  // --------------------------------------------------------------------------
  // Interactive HTML5 Tactical Canvas Rendering Engine
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas with tactical dark background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Tactical Grid & Coordinate Crosshairs
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;

      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Tactical Concentric Radar Range Rings (Centered)
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const maxRadius = Math.min(width, height) * 0.45;

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      [0.25, 0.5, 0.75, 1.0].forEach((ratio, idx) => {
        const r = maxRadius * ratio;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`${(idx + 1) * 500}m`, centerX + 6, centerY - r + 12);
      });

      // Cardinal axes
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Rotating Radar Sweep Beam
      if (showRadarSweep) {
        particleOffsetRef.current = (particleOffsetRef.current + 0.015) % (Math.PI * 2);
        const currentAngle = particleOffsetRef.current;

        const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
        sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, currentAngle - 0.45, currentAngle);
        ctx.closePath();
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Leading bright sweep line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(currentAngle) * maxRadius, centerY + Math.sin(currentAngle) * maxRadius);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw High-Risk Propagation Corridors
      if (showCorridors && heatmapData?.corridors) {
        heatmapData.corridors.forEach((corr) => {
          const fromNode = heatmapData.cameras.find((c) => c.camera_id.toLowerCase() === corr.from_camera.toLowerCase());
          const toNode = heatmapData.cameras.find((c) => c.camera_id.toLowerCase() === corr.to_camera.toLowerCase());

          if (!fromNode || !toNode) return;

          const fx = (fromNode.x || 0.5) * width;
          const fy = (fromNode.y || 0.5) * height;
          const tx = (toNode.x || 0.5) * width;
          const ty = (toNode.y || 0.5) * height;

          const isHigh = corr.event_density === 'HIGH' || corr.threat_score >= 85;

          // Corridor line
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = isHigh ? 'rgba(244, 63, 94, 0.55)' : 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = isHigh ? 2.5 : 1.5;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated particle pulse along corridor
          if (showParticles) {
            const timeT = ((Date.now() / 1200) % 1);
            const px = fx + (tx - fx) * timeT;
            const py = fy + (ty - fy) * timeT;

            ctx.beginPath();
            ctx.arc(px, py, isHigh ? 4 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isHigh ? '#ff3366' : '#ffaa00';
            ctx.shadowColor = isHigh ? '#ff3366' : '#ffaa00';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      }

      // 5. Draw Dynamic Radial Heat Shaders
      if (showHeatShaders && heatmapData?.cameras) {
        heatmapData.cameras.forEach((cam) => {
          const cx = (cam.x || 0.5) * width;
          const cy = (cam.y || 0.5) * height;
          const threat = cam.threat_index;
          const radius = 45 + (threat / 100) * 55;

          const heatGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

          if (cam.threat_level === 'CRITICAL') {
            heatGrad.addColorStop(0, 'rgba(244, 63, 94, 0.55)');
            heatGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.25)');
            heatGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
          } else if (cam.threat_level === 'HIGH') {
            heatGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
            heatGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.20)');
            heatGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          } else if (cam.threat_level === 'MEDIUM') {
            heatGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
            heatGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
            heatGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          } else {
            heatGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
            heatGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
            heatGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
          }

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = heatGrad;
          ctx.fill();
        });
      }

      // 6. Draw Camera Surveillance Nodes
      if (heatmapData?.cameras) {
        heatmapData.cameras.forEach((cam) => {
          const cx = (cam.x || 0.5) * width;
          const cy = (cam.y || 0.5) * height;
          const isSelected = selectedCameraId?.toLowerCase() === cam.camera_id.toLowerCase();
          const isHovered = hoveredCameraId?.toLowerCase() === cam.camera_id.toLowerCase();
          const isHotspot = heatmapData.hotspot?.camera_id.toLowerCase() === cam.camera_id.toLowerCase();
          const isCrit = cam.threat_level === 'CRITICAL';
          const isHigh = cam.threat_level === 'HIGH';

          const nodeColor = isCrit ? '#f43f5e' : isHigh ? '#f59e0b' : '#06b6d4';

          // Outer Ripple for Hotspot / Selected
          if (isSelected || isHotspot) {
            const rippleRadius = 18 + Math.sin(Date.now() / 250) * 4;
            ctx.beginPath();
            ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = isSelected ? 'rgba(244, 63, 94, 0.8)' : 'rgba(245, 158, 11, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Node Base Circle
          ctx.beginPath();
          ctx.arc(cx, cy, isHovered || isSelected ? 12 : 9, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#ffffff' : '#0f172a';
          ctx.strokeStyle = nodeColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = isCrit || isSelected ? 12 : 6;
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Inner Dot
          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          // Camera Tag & Threat Badge
          if (showSectorLabels) {
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
            ctx.fillText(cam.camera_id.toUpperCase(), cx + 15, cy - 2);

            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillStyle = nodeColor;
            ctx.fillText(`[${cam.threat_index}/100]`, cx + 15, cy + 10);
          }
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [heatmapData, selectedCameraId, hoveredCameraId, showHeatShaders, showRadarSweep, showCorridors, showSectorLabels, showParticles]);

  // Canvas Click Handler to select camera node
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmapData?.cameras) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    for (const cam of heatmapData.cameras) {
      const cx = (cam.x || 0.5) * canvas.width;
      const cy = (cam.y || 0.5) * canvas.height;
      const dist = Math.hypot(clickX - cx, clickY - cy);

      if (dist <= 25) {
        handleDrillDown(cam.camera_id);
        break;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmapData?.cameras) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    let foundCam: string | null = null;
    for (const cam of heatmapData.cameras) {
      const cx = (cam.x || 0.5) * canvas.width;
      const cy = (cam.y || 0.5) * canvas.height;
      const dist = Math.hypot(mouseX - cx, mouseY - cy);
      if (dist <= 25) {
        foundCam = cam.camera_id;
        break;
      }
    }
    setHoveredCameraId(foundCam);
  };

  const hotspot = heatmapData?.hotspot;

  const filteredCameras = heatmapData?.cameras.filter((c) => {
    if (selectedSectorFilter === 'all') return true;
    return c.sector.toLowerCase() === selectedSectorFilter.toLowerCase();
  }) || [];

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* 1. Header Tactical HUD Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <span>TACTICAL GEOINTELLIGENCE &amp; SPATIAL THREAT RADAR</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <h1 className="text-lg font-mono font-black text-white flex items-center gap-2">
              DYNAMIC THREAT HEATMAP &amp; HOTSPOTS
            </h1>
          </div>
        </div>

        {/* View Switcher, Filter & Time Window */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Modes */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded cursor-pointer uppercase transition-colors ${
                viewMode === 'map' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              2D RADAR MAP
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded cursor-pointer uppercase transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              NODE MATRIX
            </button>
            <button
              onClick={() => setViewMode('corridors')}
              className={`px-3 py-1 rounded cursor-pointer uppercase transition-colors ${
                viewMode === 'corridors' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              CORRIDORS
            </button>
          </div>

          {/* Time Window Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
            <span className="text-slate-500 text-[10px] uppercase px-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
            </span>
            {['15m', '1h', '6h', '24h'].map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2 py-1 rounded cursor-pointer uppercase transition-colors ${
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

      {/* Action Notification Toast */}
      {actionAlertMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-mono text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionAlertMsg}</span>
          </div>
          <button onClick={() => setActionAlertMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Primary Hotspot Command Card */}
      {hotspot && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/50 shadow-2xl flex flex-wrap items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-900/50 border border-rose-500/70 text-center min-w-[95px] shadow-lg shadow-rose-950/80">
              <span className="text-[9px] text-rose-300 uppercase block font-bold tracking-wider">THREAT INDEX</span>
              <span className="text-3xl font-black text-rose-400 block mt-0.5">
                {hotspot.threat_index}
              </span>
              <span className="text-[9px] text-slate-400 block">/ 100</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase font-bold">CURRENT PRIMARY HOTSPOT:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${hotspot.threat_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/60' : 'bg-amber-500/20 text-amber-300 border-amber-500/60'}`}>
                  {hotspot.threat_level}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  TREND: {hotspot.trend}
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-1">
                {hotspot.camera_id.toUpperCase()} // {hotspot.camera_name} ({hotspot.sector})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">PRIMARY CONTRIBUTING FACTORS</span>
              <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                <span>Breaches: <strong className="text-rose-400">{hotspot.primary_contributors.restricted_breaches || 0}</strong></span>
                <span>Tripwires: <strong className="text-amber-400">{hotspot.primary_contributors.tripwire_crossings || 0}</strong></span>
                <span>Loitering: <strong className="text-cyan-400">{hotspot.primary_contributors.loitering || 0}</strong></span>
                <span>Critical: <strong className="text-rose-400">{hotspot.primary_contributors.critical_incidents || 0}</strong></span>
                <span>Anomalies: <strong className="text-purple-400">{hotspot.primary_contributors.anomalies || 0}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDrillDown(hotspot.camera_id)}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-950 transition-all flex items-center gap-1.5 active:scale-95"
                title="Inspect Hotspot Node Details"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>DRILL DOWN</span>
              </button>

              {onSelectCamera && (
                <button
                  onClick={() => onSelectCamera(hotspot.camera_id)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                  title="View Live Stream for this Hotspot"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">LIVE FEED</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Body: 2D Interactive Radar Map / Matrix Grid (8 cols) & Camera Threat Profile (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Canvas or Matrix Grid */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === 'map' && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-300 uppercase tracking-wider font-bold flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  2D TACTICAL BORDER RADAR &amp; SPATIAL HEATMAP
                </span>

                {/* Canvas Layer Toggles */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHeatShaders}
                      onChange={(e) => setShowHeatShaders(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                    <span>Heat Shaders</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRadarSweep}
                      onChange={(e) => setShowRadarSweep(e.target.checked)}
                      className="accent-cyan-500 rounded"
                    />
                    <span>Radar Sweep</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCorridors}
                      onChange={(e) => setShowCorridors(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>Corridors</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSectorLabels}
                      onChange={(e) => setShowSectorLabels(e.target.checked)}
                      className="accent-slate-400 rounded"
                    />
                    <span>Labels</span>
                  </label>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#060a12] shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={580}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setHoveredCameraId(null)}
                  className="w-full h-[480px] block cursor-crosshair"
                />

                {/* Canvas Overlay Legend */}
                <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[10px] space-y-1 font-mono">
                  <div className="text-slate-400 font-bold uppercase">THREAT DENSITY LEVELS</div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-600" /> LOW (0-24)</span>
                    <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-500" /> MED (25-49)</span>
                    <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> HIGH (50-74)</span>
                    <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500" /> CRIT (75-100)</span>
                  </div>
                </div>

                {/* Canvas Status Watermark */}
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-cyan-400 font-mono">
                  ● REAL-TIME SPATIAL MESH // 9 SECTORS
                </div>
              </div>
            </div>
          )}

          {/* Grid View Mode */}
          {viewMode === 'grid' && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  CCTV NODE THREAT DISTRIBUTION ({filteredCameras.length} NODES)
                </span>

                {/* Sector Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[10px] uppercase">FILTER SECTOR:</span>
                  <select
                    value={selectedSectorFilter}
                    onChange={(e) => setSelectedSectorFilter(e.target.value)}
                    className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2 py-1 text-xs cursor-pointer"
                  >
                    <option value="all">ALL SECTORS</option>
                    <option value="Sector Alpha">Sector Alpha</option>
                    <option value="Sector Bravo">Sector Bravo</option>
                    <option value="Sector Charlie">Sector Charlie</option>
                    <option value="Sector Delta">Sector Delta</option>
                    <option value="Sector Echo">Sector Echo</option>
                    <option value="Sector Foxtrot">Sector Foxtrot</option>
                    <option value="Sector Golf">Sector Golf</option>
                    <option value="Sector Hotel">Sector Hotel</option>
                    <option value="Sector India">Sector India (Coastal)</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="p-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
                  <Loader2 className="w-6 h-6 text-rose-400 animate-spin mb-2" />
                  AGGREGATING MULTI-SOURCE EVENT DENSITY &amp; THREAT INDICES...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredCameras.map((cam) => {
                    const isSelected = selectedCameraId?.toLowerCase() === cam.camera_id.toLowerCase();
                    const isTargetVisited = targetHighlightCameras.some((c) => c.toLowerCase() === cam.camera_id.toLowerCase());
                    const isCrit = cam.threat_level === 'CRITICAL';
                    const isHi = cam.threat_level === 'HIGH';
                    const isMed = cam.threat_level === 'MEDIUM';

                    return (
                      <div
                        key={cam.camera_id}
                        onClick={() => handleDrillDown(cam.camera_id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-rose-950/40 border-rose-500 shadow-xl shadow-rose-950/50 ring-1 ring-rose-500/40'
                            : isTargetVisited
                            ? 'bg-cyan-950/30 border-cyan-500/70 shadow-lg shadow-cyan-950/40'
                            : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
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
                            {isSelected && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[8.5px] font-bold">
                                ACTIVE PROFILE
                              </span>
                            )}
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
                            style={{ width: `${Math.max(6, cam.threat_index)}%` }}
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
          )}

          {/* Sector Aggregation Matrix */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              BORDER SECTOR THREAT AGGREGATION
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
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
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
                <span className="text-[10px] text-slate-500">CORRELATED TRANSIT AUDIT</span>
              </div>

              <div className="space-y-2">
                {heatmapData.corridors.map((corr, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${corr.event_density === 'HIGH' ? 'bg-rose-950 text-rose-300 border-rose-500/40' : 'bg-amber-950 text-amber-300 border-amber-500/40'}`}>
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
        <div
          id="node-threat-profile-panel"
          className={`lg:col-span-4 bg-slate-900/60 border rounded-xl p-4 space-y-4 font-mono transition-all duration-300 ${
            highlightProfile
              ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)] ring-2 ring-rose-500/60 scale-[1.01]'
              : 'border-slate-800'
          }`}
        >
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
              LOADING NODE THREAT PROFILE...
            </div>
          ) : !cameraProfile ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a camera node on the 2D radar map or matrix grid to view its complete telemetry breakdown.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {cameraProfile.camera_name}
                </h3>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {cameraProfile.sector} // Elevation: {cameraProfile.elevation || '120m'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-bold">THREAT INDEX</span>
                <span className={`text-base font-bold ${cameraProfile.threat_level === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {cameraProfile.threat_index} / 100 [{cameraProfile.threat_level}]
                </span>
              </div>

              {/* Event Breakdown */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">EVENT AUDIT BREAKDOWN</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Restricted Zone Incursions:</span>
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
                    <span>High-Risk Incidents:</span>
                    <strong className="text-amber-400">{cameraProfile.event_counts.high_incidents || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Movement Anomalies:</span>
                    <strong className="text-purple-400">{cameraProfile.event_counts.anomalies || cameraProfile.total_anomalies || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Boundary Re-entries:</span>
                    <strong className="text-slate-200">{cameraProfile.event_counts.reentry_count || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Active Zones if any */}
              {cameraProfile.active_zones && cameraProfile.active_zones.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">ACTIVE GEOFENCE ZONES</span>
                  <div className="space-y-1">
                    {cameraProfile.active_zones.map((z, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                        <span className="truncate max-w-[180px]">{z.name}</span>
                        <span className={z.is_occupied ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {z.current_occupants} active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {onSelectCamera && (
                  <button
                    onClick={() => onSelectCamera(cameraProfile.camera_id)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>VIEW LIVE CAMERA FEED</span>
                  </button>
                )}

                {onOpenTargetJourney && (
                  <button
                    onClick={() => onOpenTargetJourney()}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                    <span>VIEW CROSS-CAM TARGET JOURNEY</span>
                  </button>
                )}

                {onNavigateToAnalytics && (
                  <button
                    onClick={onNavigateToAnalytics}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>VIEW SECTOR ANALYTICS</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActionAlertMsg(`[DEFCON ALERT] Quick Reaction Team dispatched to ${cameraProfile.camera_id.toUpperCase()} (${cameraProfile.sector}).`);
                    setTimeout(() => setActionAlertMsg(null), 5000);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>DISPATCH QRT RESPONSE UNIT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
