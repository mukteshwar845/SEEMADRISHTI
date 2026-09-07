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
  Minimize2,
  Volume2,
  VolumeX,
  Target,
  Zap,
  Navigation,
  Palette,
  Sparkles,
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
} from '../../services/api';
import { webSocketService } from '../../services/websocketService';

export type HeatmapPalette = 'crimson' | 'thermal' | 'cyber' | 'plasma';
export type SensitivityPreset = 'balanced' | 'perimeter_strict' | 'loitering_focus' | 'high_alert';

const PALETTE_CONFIGS: Record<HeatmapPalette, {
  name: string;
  badgeLabel: string;
  buttonBg: string;
  gridColor: string;
  radarColor: string;
  radarFill: string;
  corridorHigh: string;
  corridorMed: string;
  nodeCrit: string;
  nodeHigh: string;
  nodeMed: string;
  nodeLow: string;
  stops: {
    critical: [number, string][];
    high: [number, string][];
    medium: [number, string][];
    low: [number, string][];
  };
}> = {
  crimson: {
    name: 'Tactical Crimson',
    badgeLabel: 'CRIMSON',
    buttonBg: 'bg-rose-600 border-rose-400 text-white',
    gridColor: 'rgba(30, 41, 59, 0.45)',
    radarColor: 'rgba(34, 211, 238, 0.75)',
    radarFill: 'rgba(6, 182, 212, 0.22)',
    corridorHigh: '#ff2255',
    corridorMed: '#f59e0b',
    nodeCrit: '#f43f5e',
    nodeHigh: '#f59e0b',
    nodeMed: '#06b6d4',
    nodeLow: '#10b981',
    stops: {
      critical: [[0, 'rgba(244, 63, 94, 0.75)'], [0.4, 'rgba(225, 29, 72, 0.38)'], [1, 'rgba(244, 63, 94, 0)']],
      high: [[0, 'rgba(245, 158, 11, 0.65)'], [0.45, 'rgba(217, 119, 6, 0.28)'], [1, 'rgba(245, 158, 11, 0)']],
      medium: [[0, 'rgba(6, 182, 212, 0.55)'], [0.5, 'rgba(8, 145, 178, 0.22)'], [1, 'rgba(6, 182, 212, 0)']],
      low: [[0, 'rgba(16, 185, 129, 0.42)'], [0.5, 'rgba(5, 150, 105, 0.14)'], [1, 'rgba(16, 185, 129, 0)']],
    },
  },
  thermal: {
    name: 'FLIR Thermal IR',
    badgeLabel: 'THERMAL',
    buttonBg: 'bg-amber-600 border-amber-400 text-white',
    gridColor: 'rgba(49, 46, 129, 0.45)',
    radarColor: 'rgba(251, 191, 36, 0.85)',
    radarFill: 'rgba(245, 158, 11, 0.22)',
    corridorHigh: '#ff4400',
    corridorMed: '#facc15',
    nodeCrit: '#ffffff',
    nodeHigh: '#facc15',
    nodeMed: '#ec4899',
    nodeLow: '#6366f1',
    stops: {
      critical: [[0, 'rgba(255, 255, 255, 0.95)'], [0.25, 'rgba(254, 240, 138, 0.75)'], [0.6, 'rgba(239, 68, 68, 0.45)'], [1, 'rgba(88, 28, 135, 0)']],
      high: [[0, 'rgba(254, 240, 138, 0.85)'], [0.35, 'rgba(249, 115, 22, 0.55)'], [0.75, 'rgba(192, 38, 211, 0.3)'], [1, 'rgba(49, 46, 129, 0)']],
      medium: [[0, 'rgba(244, 114, 182, 0.7)'], [0.45, 'rgba(147, 51, 234, 0.35)'], [1, 'rgba(30, 58, 138, 0)']],
      low: [[0, 'rgba(96, 165, 250, 0.5)'], [0.5, 'rgba(59, 130, 246, 0.2)'], [1, 'rgba(15, 23, 42, 0)']],
    },
  },
  cyber: {
    name: 'Night Cyber Emerald',
    badgeLabel: 'CYBER',
    buttonBg: 'bg-emerald-600 border-emerald-400 text-white',
    gridColor: 'rgba(6, 78, 59, 0.5)',
    radarColor: 'rgba(52, 211, 153, 0.85)',
    radarFill: 'rgba(16, 185, 129, 0.25)',
    corridorHigh: '#10b981',
    corridorMed: '#2dd4bf',
    nodeCrit: '#34d399',
    nodeHigh: '#10b981',
    nodeMed: '#06b6d4',
    nodeLow: '#047857',
    stops: {
      critical: [[0, 'rgba(52, 211, 153, 0.9)'], [0.35, 'rgba(16, 185, 129, 0.5)'], [1, 'rgba(4, 120, 87, 0)']],
      high: [[0, 'rgba(16, 185, 129, 0.75)'], [0.45, 'rgba(5, 150, 105, 0.35)'], [1, 'rgba(6, 78, 59, 0)']],
      medium: [[0, 'rgba(20, 184, 166, 0.6)'], [0.5, 'rgba(13, 148, 136, 0.25)'], [1, 'rgba(15, 118, 110, 0)']],
      low: [[0, 'rgba(6, 182, 212, 0.45)'], [0.5, 'rgba(8, 145, 178, 0.15)'], [1, 'rgba(12, 74, 96, 0)']],
    },
  },
  plasma: {
    name: 'Scientific Plasma',
    badgeLabel: 'PLASMA',
    buttonBg: 'bg-purple-600 border-purple-400 text-white',
    gridColor: 'rgba(88, 28, 135, 0.45)',
    radarColor: 'rgba(244, 114, 182, 0.85)',
    radarFill: 'rgba(217, 70, 239, 0.25)',
    corridorHigh: '#f43f5e',
    corridorMed: '#a855f7',
    nodeCrit: '#facc15',
    nodeHigh: '#f43f5e',
    nodeMed: '#a855f7',
    nodeLow: '#4338ca',
    stops: {
      critical: [[0, 'rgba(250, 204, 21, 0.95)'], [0.35, 'rgba(244, 63, 94, 0.6)'], [0.75, 'rgba(168, 85, 247, 0.35)'], [1, 'rgba(67, 56, 202, 0)']],
      high: [[0, 'rgba(244, 63, 94, 0.85)'], [0.4, 'rgba(192, 38, 211, 0.45)'], [1, 'rgba(49, 46, 129, 0)']],
      medium: [[0, 'rgba(168, 85, 247, 0.65)'], [0.5, 'rgba(99, 102, 241, 0.3)'], [1, 'rgba(30, 27, 75, 0)']],
      low: [[0, 'rgba(99, 102, 241, 0.45)'], [0.5, 'rgba(67, 56, 202, 0.15)'], [1, 'rgba(15, 23, 42, 0)']],
    },
  },
};

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
  const [actionAlertMsg, setActionAlertMsg] = useState<string | null>(null);

  // Heatmap Enhancements State
  const [colorPalette, setColorPalette] = useState<HeatmapPalette>('crimson');
  const [sensitivityPreset, setSensitivityPreset] = useState<SensitivityPreset>('balanced');
  const [corridorMinScore, setCorridorMinScore] = useState<number>(40);
  const [heatOpacity, setHeatOpacity] = useState<number>(0.75);
  const [heatRadiusScale, setHeatRadiusScale] = useState<number>(1.0);
  const [threatFilter, setThreatFilter] = useState<'all' | 'critical' | 'high_critical'>('all');
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layer Toggles
  const [showHeatShaders, setShowHeatShaders] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showSectorLabels, setShowSectorLabels] = useState<boolean>(true);
  const [showParticles, setShowParticles] = useState<boolean>(true);

  // Canvas ref for interactive 2D Tactical Map
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
      const res: any = await fetchThreatHeatmap({
        window: timeWindow,
        sensitivity: sensitivityPreset,
        corridor_threshold: corridorMinScore,
      });
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
  }, [timeWindow, sensitivityPreset, corridorMinScore, selectedCameraId]);

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

  // Load camera profile when selected or when sensitivity changes
  useEffect(() => {
    if (selectedCameraId) {
      setIsLoadingProfile(true);
      fetchCameraThreatProfile(selectedCameraId, timeWindow, sensitivityPreset)
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
  }, [selectedCameraId, timeWindow, sensitivityPreset]);

  // --------------------------------------------------------------------------
  // Interactive HTML5 Tactical Canvas Rendering Engine
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;
    const pal = PALETTE_CONFIGS[colorPalette];

    const render = () => {
      if (!isSubscribed) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas with tactical dark background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Tactical Grid & Coordinate Crosshairs
      ctx.strokeStyle = pal.gridColor;
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

      ctx.strokeStyle = pal.radarColor.replace('0.75', '0.18').replace('0.85', '0.2');
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      [0.25, 0.5, 0.75, 1.0].forEach((ratio, idx) => {
        const r = maxRadius * ratio;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = pal.radarColor.replace('0.75', '0.45').replace('0.85', '0.45');
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
        sweepGrad.addColorStop(0, pal.radarFill);
        sweepGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

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
        ctx.strokeStyle = pal.radarColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Filter cameras by threat level if chosen
      const eligibleCameras = (heatmapData?.cameras || []).filter((cam) => {
        if (threatFilter === 'critical') return cam.threat_level === 'CRITICAL';
        if (threatFilter === 'high_critical') return cam.threat_level === 'CRITICAL' || cam.threat_level === 'HIGH';
        return true;
      });

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
          ctx.strokeStyle = isHigh ? pal.corridorHigh : pal.corridorMed;
          ctx.lineWidth = isHigh ? 2.5 : 1.5;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Directional Chevron Arrow along corridor
          const midX = fx + (tx - fx) * 0.55;
          const midY = fy + (ty - fy) * 0.55;
          const angle = Math.atan2(ty - fy, tx - fx);
          const arrowLen = 8;

          ctx.beginPath();
          ctx.moveTo(midX - arrowLen * Math.cos(angle - Math.PI / 6), midY - arrowLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(midX, midY);
          ctx.lineTo(midX - arrowLen * Math.cos(angle + Math.PI / 6), midY - arrowLen * Math.sin(angle + Math.PI / 6));
          ctx.strokeStyle = isHigh ? pal.corridorHigh : pal.corridorMed;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Animated particle pulse along corridor
          if (showParticles) {
            const timeT = ((Date.now() / 1100) % 1);
            const px = fx + (tx - fx) * timeT;
            const py = fy + (ty - fy) * timeT;

            ctx.beginPath();
            ctx.arc(px, py, isHigh ? 4.5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = isHigh ? pal.corridorHigh : pal.corridorMed;
            ctx.shadowColor = isHigh ? pal.corridorHigh : pal.corridorMed;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      }

      // 5. Draw Dynamic Radial Heat Shaders
      if (showHeatShaders && eligibleCameras.length > 0) {
        ctx.save();
        ctx.globalAlpha = heatOpacity;

        eligibleCameras.forEach((cam) => {
          const cx = (cam.x || 0.5) * width;
          const cy = (cam.y || 0.5) * height;
          const threat = cam.threat_index;
          const radius = (45 + (threat / 100) * 60) * heatRadiusScale;

          const heatGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

          const stops =
            cam.threat_level === 'CRITICAL'
              ? pal.stops.critical
              : cam.threat_level === 'HIGH'
              ? pal.stops.high
              : cam.threat_level === 'MEDIUM'
              ? pal.stops.medium
              : pal.stops.low;

          stops.forEach(([offset, color]) => {
            heatGrad.addColorStop(offset, color);
          });

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = heatGrad;
          ctx.fill();
        });

        ctx.restore();
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

          const nodeColor = isCrit ? pal.nodeCrit : isHigh ? pal.nodeHigh : pal.nodeMed;

          // Outer Ripple for Hotspot / Selected
          if (isSelected || isHotspot) {
            const rippleRadius = 18 + Math.sin(Date.now() / 250) * 4;
            ctx.beginPath();
            ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = isSelected ? pal.corridorHigh : pal.corridorMed;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Node Base Circle
          ctx.beginPath();
          ctx.arc(cx, cy, isHovered || isSelected ? 13 : 9.5, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#ffffff' : '#0f172a';
          ctx.strokeStyle = nodeColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = isCrit || isSelected ? 14 : 7;
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Inner Dot
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          // Camera Tag & Threat Badge
          if (showSectorLabels) {
            ctx.font = isSelected ? 'bold 11px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace';
            ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText(cam.camera_id.toUpperCase(), cx, cy + 22);

            // Small threat pill tag
            const tagY = cy - 14;
            ctx.fillStyle = isCrit ? 'rgba(244, 63, 94, 0.85)' : isHigh ? 'rgba(245, 158, 11, 0.85)' : 'rgba(15, 23, 42, 0.85)';
            const tagText = `${cam.threat_index}`;
            const tagWidth = ctx.measureText(tagText).width + 8;
            ctx.fillRect(cx - tagWidth / 2, tagY - 9, tagWidth, 12);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillText(tagText, cx, tagY);
          }
        });
      }

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => {
      isSubscribed = false;
      cancelAnimationFrame(animId);
    };
  }, [
    heatmapData,
    selectedCameraId,
    hoveredCameraId,
    showHeatShaders,
    showRadarSweep,
    showCorridors,
    showSectorLabels,
    showParticles,
    colorPalette,
    heatOpacity,
    heatRadiusScale,
    threatFilter,
  ]);

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

      if (dist <= 26) {
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
      if (dist <= 26) {
        foundCam = cam.camera_id;
        break;
      }
    }
    setHoveredCameraId(foundCam);
  };

  const hotspot = heatmapData?.hotspot;

  const filteredCameras = (heatmapData?.cameras || []).filter((c) => {
    if (selectedSectorFilter !== 'all' && c.sector.toLowerCase() !== selectedSectorFilter.toLowerCase()) {
      return false;
    }
    if (threatFilter === 'critical') return c.threat_level === 'CRITICAL';
    if (threatFilter === 'high_critical') return c.threat_level === 'CRITICAL' || c.threat_level === 'HIGH';
    return true;
  });

  const hoveredCameraObj = hoveredCameraId
    ? (heatmapData?.cameras || []).find((c) => c.camera_id.toLowerCase() === hoveredCameraId.toLowerCase())
    : null;

  return (
    <div ref={containerRef} className={`space-y-4 font-sans text-slate-200 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#060a12] p-6 overflow-y-auto' : ''}`}>
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

        {/* View Switcher, Filter & Quick Options */}
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
          </div>

          {/* Advanced Sliders Toggle */}
          <button
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
              showAdvancedControls
                ? 'bg-rose-900/60 border-rose-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Configure Heatmap Sensitivity & Visual Controls"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">CONTROLS</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={loadHeatmap}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-950 border border-slate-800 transition-colors"
            title="Recalculate Heatmap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-950 border border-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Palette & Sensitivity Quick Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Color Palette Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase font-bold mr-1">
            <Palette className="w-3.5 h-3.5 text-rose-400" />
            <span>PALETTE:</span>
          </div>
          {(['crimson', 'thermal', 'cyber', 'plasma'] as HeatmapPalette[]).map((pal) => (
            <button
              key={pal}
              onClick={() => setColorPalette(pal)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer border ${
                colorPalette === pal
                  ? PALETTE_CONFIGS[pal].buttonBg
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {PALETTE_CONFIGS[pal].badgeLabel}
            </button>
          ))}
        </div>

        {/* Sensitivity Preset Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase font-bold mr-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>SENSITIVITY:</span>
          </div>
          <select
            value={sensitivityPreset}
            onChange={(e) => setSensitivityPreset(e.target.value as SensitivityPreset)}
            className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs font-mono cursor-pointer font-bold focus:outline-none focus:border-rose-500"
          >
            <option value="balanced">BALANCED (STANDARD WEIGHTS)</option>
            <option value="perimeter_strict">PERIMETER STRICT (FENCE &amp; BREACH FOCUS)</option>
            <option value="loitering_focus">LOITERING FOCUS (DWELL &amp; RECON FOCUS)</option>
            <option value="high_alert">HIGH ALERT (MAXIMUM SENSITIVITY)</option>
          </select>
        </div>
      </div>

      {/* Advanced Fine-Tuning Drawer */}
      {showAdvancedControls && (
        <div className="p-4 rounded-xl bg-slate-950/95 border border-rose-500/30 font-mono text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              TACTICAL HEATMAP CALIBRATION &amp; SHADER PARAMETERS
            </span>
            <span className="text-[10px] text-slate-500">REAL-TIME CLIENT-SIDE RE-RENDERING</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            {/* Shader Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>SHADER OPACITY</span>
                <span className="text-white font-bold">{Math.round(heatOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={heatOpacity}
                onChange={(e) => setHeatOpacity(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Shader Radius Scale */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>GAUSSIAN RADIUS</span>
                <span className="text-white font-bold">{heatRadiusScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={heatRadiusScale}
                onChange={(e) => setHeatRadiusScale(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Corridor Min Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>CORRIDOR THRESHOLD</span>
                <span className="text-amber-400 font-bold">&gt;= {corridorMinScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={corridorMinScore}
                onChange={(e) => setCorridorMinScore(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Threat Filter */}
            <div className="space-y-1.5">
              <div className="text-slate-400 text-[11px]">THREAT LEVEL FILTER</div>
              <select
                value={threatFilter}
                onChange={(e) => setThreatFilter(e.target.value as any)}
                className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded px-2 py-1 text-xs cursor-pointer font-bold"
              >
                <option value="all">ALL NODES (SHOW ALL)</option>
                <option value="high_critical">ELEVATED ONLY (HIGH &amp; CRITICAL)</option>
                <option value="critical">CRITICAL HOTZONES ONLY (&gt;=75)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Target Journey Highlight Note if active */}
      {targetHighlightCameras.length > 0 && (
        <div className="p-2.5 bg-cyan-950/50 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              TARGET JOURNEY ACTIVE: Highlighting nodes traversed by target: {targetHighlightCameras.map((c) => String(c || '').toUpperCase()).join(' ➔ ')}
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
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold uppercase">
                  {sensitivityPreset.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-1">
                {String(hotspot.camera_id || '').toUpperCase()} // {hotspot.camera_name} ({hotspot.sector})
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
                  2D TACTICAL BORDER RADAR &amp; SPATIAL HEATMAP // {PALETTE_CONFIGS[colorPalette].name.toUpperCase()}
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
                    <span>Shaders</span>
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
                  className="w-full h-[500px] block cursor-crosshair"
                />

                {/* Floating Interactive Hover Card */}
                {hoveredCameraObj && (
                  <div
                    className="absolute z-20 pointer-events-none p-3 rounded-xl bg-slate-950/95 border border-cyan-500/60 shadow-2xl backdrop-blur-md text-xs font-mono space-y-1.5 min-w-[220px]"
                    style={{
                      left: `${Math.min(80, Math.max(10, (hoveredCameraObj.x || 0.5) * 100))}%`,
                      top: `${Math.min(75, Math.max(12, (hoveredCameraObj.y || 0.5) * 100))}%`,
                      transform: 'translate(-50%, -115%)',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="font-black text-white">{hoveredCameraObj.camera_id.toUpperCase()}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        hoveredCameraObj.threat_level === 'CRITICAL' ? 'bg-rose-500/30 text-rose-300' :
                        hoveredCameraObj.threat_level === 'HIGH' ? 'bg-amber-500/30 text-amber-300' : 'bg-cyan-500/30 text-cyan-300'
                      }`}>
                        {hoveredCameraObj.threat_level} [{hoveredCameraObj.threat_index}]
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <div>{hoveredCameraObj.camera_name}</div>
                      <div className="text-slate-400 text-[10px]">{hoveredCameraObj.sector} // {hoveredCameraObj.elevation || '120m'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>Breaches: <strong className="text-rose-400">{hoveredCameraObj.event_counts.restricted_breaches}</strong></span>
                      <span>Tripwires: <strong className="text-amber-400">{hoveredCameraObj.event_counts.tripwire_crossings}</strong></span>
                      <span>Loiter: <strong className="text-cyan-400">{hoveredCameraObj.event_counts.loitering}</strong></span>
                      <span>Incidents: <strong className="text-rose-400">{hoveredCameraObj.event_counts.critical_incidents}</strong></span>
                    </div>
                    <div className="text-[9px] text-cyan-400 text-center pt-0.5">CLICK TO INSPECT NODE PROFILE</div>
                  </div>
                )}

                {/* Canvas Overlay Legend */}
                <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[10px] space-y-1 font-mono">
                  <div className="text-slate-400 font-bold uppercase">
                    THREAT DENSITY LEVELS // {PALETTE_CONFIGS[colorPalette].name.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE_CONFIGS[colorPalette].nodeLow }} /> LOW (0-24)</span>
                    <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE_CONFIGS[colorPalette].nodeMed }} /> MED (25-49)</span>
                    <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE_CONFIGS[colorPalette].nodeHigh }} /> HIGH (50-74)</span>
                    <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE_CONFIGS[colorPalette].nodeCrit }} /> CRIT (75-100)</span>
                  </div>
                </div>

                {/* Canvas Status Watermark */}
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-cyan-400 font-mono">
                  ● REAL-TIME SPATIAL MESH // 9 SECTORS // OPACITY: {Math.round(heatOpacity * 100)}%
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
                            ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/40 shadow-lg'
                            : isTargetVisited
                            ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-bold text-white text-xs">{cam.camera_id.toUpperCase()}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : isHi
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : isMed
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {cam.threat_index} / 100
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 truncate">{cam.camera_name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{cam.sector}</div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isCrit ? 'bg-rose-500' : isHi ? 'bg-amber-500' : isMed ? 'bg-cyan-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, cam.threat_index))}%` }}
                          />
                        </div>

                        {/* Event Tally */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-900">
                          <span>Breaches: <strong className="text-rose-400">{cam.event_counts.restricted_breaches}</strong></span>
                          <span>Tripwires: <strong className="text-amber-400">{cam.event_counts.tripwire_crossings}</strong></span>
                          <span>Loitering: <strong className="text-cyan-400">{cam.event_counts.loitering}</strong></span>
                          <span>Incidents: <strong className="text-rose-400">{cam.event_counts.critical_incidents}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Corridors View Mode */}
          {viewMode === 'corridors' && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  HIGH-RISK INVASION CORRIDORS ({heatmapData?.corridors?.length || 0} IDENTIFIED)
                </span>
                <span className="text-[11px] text-slate-500">FILTER SCORE: &gt;= {corridorMinScore}</span>
              </div>

              <div className="space-y-2">
                {heatmapData?.corridors?.map((corr) => (
                  <div
                    key={corr.corridor_id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-wrap items-center justify-between gap-2"
                  >
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
              {selectedCameraId ? String(selectedCameraId).toUpperCase() : 'SELECT NODE'}
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

              {/* Contributing Points Breakdown if available */}
              {cameraProfile.factor_contributions && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    WEIGHTED CONTRIBUTIONS ({sensitivityPreset.replace('_', ' ').toUpperCase()})
                  </span>
                  <div className="space-y-1.5">
                    {Object.entries(cameraProfile.factor_contributions).map(([factor, pts]) => {
                      const maxPts = 60;
                      const numericPts = Number(pts) || 0;
                      const pct = Math.min(100, Math.round((numericPts / maxPts) * 100));
                      return (
                        <div key={factor} className="space-y-0.5">
                          <div className="flex justify-between text-[11px] text-slate-300">
                            <span className="capitalize">{factor.replace('_', ' ')}</span>
                            <span className="font-bold text-amber-400">+{numericPts} pts</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    setActionAlertMsg(`[DEFCON ALERT] Quick Reaction Team dispatched to ${String(cameraProfile.camera_id || '').toUpperCase()} (${cameraProfile.sector}).`);
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
