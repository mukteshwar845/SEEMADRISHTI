import React, { useRef, useEffect, useState, useMemo } from 'react';
import { tacticalAlertDispatcher } from '../../utils/tacticalAlertDispatcher';
import { useTheme, AppTheme, AccentColor, ACCENT_COLOR_MAP } from '../../context/ThemeContext';

interface TacticalOperationsAtmosphereProps {
  className?: string;
  intensity?: 'subtle' | 'standard' | 'focused';
}

interface SentryNode {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  fovAngle: number;
  range: number;
}

interface TelemetryParticle {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
}

interface ThemePalette {
  bgGradient: [string, string, string];
  threatBgGradient: [string, string, string];
  gridStroke: string;
  threatGridStroke: string;
  contourStroke: (alpha: number) => string;
  threatContourStroke: (alpha: number) => string;
  contourLabelFill: string;
  threatContourLabelFill: string;
  watermarkFill: string;
  threatWatermarkFill: string;
  crosshairStroke: string;
  radarRingStroke: string;
  threatRadarRingStroke: string;
  radarAxisStroke: string;
  radarSweepGradient: [string, string];
  threatRadarSweepGradient: [string, string];
  vectorDashStroke: string;
  threatVectorDashStroke: string;
  particleFill: string;
  threatParticleFill: string;
  coneFill: string;
  threatConeFill: string;
  nodeOuterRing: string;
  threatNodeOuterRing: string;
  nodeDot: string;
  threatNodeDot: string;
  nodeLabel: string;
  threatNodeLabel: string;
  vignetteEnd: string;
}

export const TacticalOperationsAtmosphere: React.FC<TacticalOperationsAtmosphereProps> = ({
  className = '',
}) => {
  const { theme, isDaylight, accentColor } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeThreatState, setActiveThreatState] = useState<boolean>(false);

  // Sentry camera nodes plotted geospatially across the tactical border terrain
  const sentryNodes: SentryNode[] = useMemo(() => [
    { id: 'cam-1', code: 'CAM-01', name: 'NORTH GATE', x: 0.12, y: 0.18, fovAngle: 135, range: 75 },
    { id: 'cam-2', code: 'CAM-02', name: 'EAST PERIMETER', x: 0.32, y: 0.14, fovAngle: 160, range: 70 },
    { id: 'cam-3', code: 'CAM-03', name: 'SOUTH SECTOR', x: 0.52, y: 0.20, fovAngle: 180, range: 80 },
    { id: 'cam-4', code: 'CAM-04', name: 'WEST WATCHTOWER', x: 0.72, y: 0.16, fovAngle: 210, range: 65 },
    { id: 'cam-5', code: 'CAM-05', name: 'CHECKPOINT BRAVO', x: 0.88, y: 0.24, fovAngle: 225, range: 75 },
    { id: 'cam-6', code: 'CAM-06', name: 'RIVER BORDER', x: 0.18, y: 0.78, fovAngle: 45, range: 70 },
    { id: 'cam-7', code: 'CAM-07', name: 'RADAR STATION', x: 0.42, y: 0.84, fovAngle: 20, range: 85 },
    { id: 'cam-8', code: 'CAM-08', name: 'MAIN HIGHWAY', x: 0.65, y: 0.80, fovAngle: 345, range: 80 },
    { id: 'cam-9', code: 'CAM-09', name: 'HELIPAD LZ', x: 0.86, y: 0.74, fovAngle: 315, range: 70 },
  ], []);

  // Listen to live tactical alerts for ambient command-center lighting shift
  useEffect(() => {
    const unsub = tacticalAlertDispatcher.subscribe(() => {
      setActiveThreatState(true);
      const timer = setTimeout(() => {
        setActiveThreatState(false);
      }, 4500);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  // Dynamic Theme Color Palette Generator
  const palette: ThemePalette = useMemo(() => {
    const accentHex = ACCENT_COLOR_MAP[accentColor]?.hex || '#00f0ff';

    switch (theme) {
      case 'daylight-field':
        return {
          bgGradient: ['#e2e8f0', '#edf2f7', '#f8fafc'],
          threatBgGradient: ['#fee2e2', '#fff1f2', '#ffffff'],
          gridStroke: 'rgba(51, 65, 85, 0.08)',
          threatGridStroke: 'rgba(239, 68, 68, 0.12)',
          contourStroke: (alpha) => `rgba(30, 41, 59, ${Math.min(0.35, alpha * 1.5)})`,
          threatContourStroke: (alpha) => `rgba(220, 38, 38, ${Math.min(0.4, alpha * 1.6)})`,
          contourLabelFill: 'rgba(15, 23, 42, 0.6)',
          threatContourLabelFill: 'rgba(185, 28, 28, 0.75)',
          watermarkFill: 'rgba(30, 41, 59, 0.55)',
          threatWatermarkFill: 'rgba(185, 28, 28, 0.65)',
          crosshairStroke: 'rgba(51, 65, 85, 0.35)',
          radarRingStroke: 'rgba(51, 65, 85, 0.22)',
          threatRadarRingStroke: 'rgba(220, 38, 38, 0.3)',
          radarAxisStroke: 'rgba(51, 65, 85, 0.2)',
          radarSweepGradient: ['rgba(2, 132, 199, 0.22)', 'rgba(2, 132, 199, 0)'],
          threatRadarSweepGradient: ['rgba(220, 38, 38, 0.28)', 'rgba(220, 38, 38, 0)'],
          vectorDashStroke: 'rgba(2, 132, 199, 0.25)',
          threatVectorDashStroke: 'rgba(220, 38, 38, 0.3)',
          particleFill: '#0284c7',
          threatParticleFill: '#dc2626',
          coneFill: 'rgba(2, 132, 199, 0.08)',
          threatConeFill: 'rgba(220, 38, 38, 0.12)',
          nodeOuterRing: 'rgba(2, 132, 199, 0.65)',
          threatNodeOuterRing: 'rgba(220, 38, 38, 0.75)',
          nodeDot: '#0284c7',
          threatNodeDot: '#dc2626',
          nodeLabel: 'rgba(15, 23, 42, 0.85)',
          threatNodeLabel: 'rgba(153, 27, 27, 0.9)',
          vignetteEnd: 'rgba(226, 232, 240, 0.45)',
        };

      case 'midnight-cyber':
        return {
          bgGradient: ['#160e38', '#0e0926', '#060314'],
          threatBgGradient: ['#280824', '#160515', '#0a020a'],
          gridStroke: 'rgba(129, 140, 248, 0.08)',
          threatGridStroke: 'rgba(244, 63, 94, 0.12)',
          contourStroke: (alpha) => `rgba(168, 85, 247, ${alpha * 1.1})`,
          threatContourStroke: (alpha) => `rgba(244, 63, 94, ${alpha * 1.3})`,
          contourLabelFill: 'rgba(192, 132, 252, 0.5)',
          threatContourLabelFill: 'rgba(251, 113, 133, 0.6)',
          watermarkFill: 'rgba(168, 85, 247, 0.45)',
          threatWatermarkFill: 'rgba(244, 63, 94, 0.5)',
          crosshairStroke: 'rgba(129, 140, 248, 0.35)',
          radarRingStroke: 'rgba(168, 85, 247, 0.22)',
          threatRadarRingStroke: 'rgba(244, 63, 94, 0.28)',
          radarAxisStroke: 'rgba(129, 140, 248, 0.25)',
          radarSweepGradient: ['rgba(168, 85, 247, 0.32)', 'rgba(0, 0, 0, 0)'],
          threatRadarSweepGradient: ['rgba(244, 63, 94, 0.35)', 'rgba(0, 0, 0, 0)'],
          vectorDashStroke: 'rgba(129, 140, 248, 0.25)',
          threatVectorDashStroke: 'rgba(244, 63, 94, 0.3)',
          particleFill: '#c084fc',
          threatParticleFill: '#fb7185',
          coneFill: 'rgba(168, 85, 247, 0.10)',
          threatConeFill: 'rgba(244, 63, 94, 0.14)',
          nodeOuterRing: 'rgba(168, 85, 247, 0.75)',
          threatNodeOuterRing: 'rgba(244, 63, 94, 0.8)',
          nodeDot: '#a855f7',
          threatNodeDot: '#f43f5e',
          nodeLabel: 'rgba(216, 180, 254, 0.85)',
          threatNodeLabel: 'rgba(251, 113, 133, 0.9)',
          vignetteEnd: 'rgba(4, 2, 12, 0.75)',
        };

      case 'obsidian-stealth':
        return {
          bgGradient: ['#040404', '#000000', '#000000'],
          threatBgGradient: ['#180306', '#080102', '#000000'],
          gridStroke: 'rgba(255, 255, 255, 0.05)',
          threatGridStroke: 'rgba(239, 68, 68, 0.1)',
          contourStroke: (alpha) => `rgba(148, 163, 184, ${alpha * 0.9})`,
          threatContourStroke: (alpha) => `rgba(239, 68, 68, ${alpha * 1.2})`,
          contourLabelFill: 'rgba(203, 213, 225, 0.45)',
          threatContourLabelFill: 'rgba(248, 113, 113, 0.55)',
          watermarkFill: 'rgba(148, 163, 184, 0.35)',
          threatWatermarkFill: 'rgba(239, 68, 68, 0.45)',
          crosshairStroke: 'rgba(255, 255, 255, 0.25)',
          radarRingStroke: 'rgba(255, 255, 255, 0.18)',
          threatRadarRingStroke: 'rgba(239, 68, 68, 0.24)',
          radarAxisStroke: 'rgba(255, 255, 255, 0.2)',
          radarSweepGradient: ['rgba(255, 255, 255, 0.22)', 'rgba(0, 0, 0, 0)'],
          threatRadarSweepGradient: ['rgba(239, 68, 68, 0.3)', 'rgba(0, 0, 0, 0)'],
          vectorDashStroke: 'rgba(255, 255, 255, 0.16)',
          threatVectorDashStroke: 'rgba(239, 68, 68, 0.25)',
          particleFill: '#f8fafc',
          threatParticleFill: '#f87171',
          coneFill: 'rgba(255, 255, 255, 0.06)',
          threatConeFill: 'rgba(239, 68, 68, 0.1)',
          nodeOuterRing: 'rgba(255, 255, 255, 0.65)',
          threatNodeOuterRing: 'rgba(239, 68, 68, 0.75)',
          nodeDot: '#ffffff',
          threatNodeDot: '#ef4444',
          nodeLabel: 'rgba(226, 232, 240, 0.8)',
          threatNodeLabel: 'rgba(252, 165, 165, 0.9)',
          vignetteEnd: 'rgba(0, 0, 0, 0.85)',
        };

      case 'emerald-ops':
        return {
          bgGradient: ['#032615', '#02160c', '#010a05'],
          threatBgGradient: ['#221404', '#140c02', '#080501'],
          gridStroke: 'rgba(16, 185, 129, 0.08)',
          threatGridStroke: 'rgba(245, 158, 11, 0.12)',
          contourStroke: (alpha) => `rgba(16, 185, 129, ${alpha * 1.2})`,
          threatContourStroke: (alpha) => `rgba(245, 158, 11, ${alpha * 1.3})`,
          contourLabelFill: 'rgba(52, 211, 153, 0.55)',
          threatContourLabelFill: 'rgba(251, 191, 36, 0.65)',
          watermarkFill: 'rgba(16, 185, 129, 0.45)',
          threatWatermarkFill: 'rgba(245, 158, 11, 0.55)',
          crosshairStroke: 'rgba(16, 185, 129, 0.35)',
          radarRingStroke: 'rgba(16, 185, 129, 0.22)',
          threatRadarRingStroke: 'rgba(245, 158, 11, 0.28)',
          radarAxisStroke: 'rgba(16, 185, 129, 0.25)',
          radarSweepGradient: ['rgba(0, 255, 102, 0.3)', 'rgba(0, 0, 0, 0)'],
          threatRadarSweepGradient: ['rgba(245, 158, 11, 0.32)', 'rgba(0, 0, 0, 0)'],
          vectorDashStroke: 'rgba(16, 185, 129, 0.25)',
          threatVectorDashStroke: 'rgba(245, 158, 11, 0.3)',
          particleFill: '#34d399',
          threatParticleFill: '#fbbf24',
          coneFill: 'rgba(16, 185, 129, 0.10)',
          threatConeFill: 'rgba(245, 158, 11, 0.14)',
          nodeOuterRing: 'rgba(16, 185, 129, 0.75)',
          threatNodeOuterRing: 'rgba(245, 158, 11, 0.8)',
          nodeDot: '#10b981',
          threatNodeDot: '#f59e0b',
          nodeLabel: 'rgba(110, 231, 183, 0.85)',
          threatNodeLabel: 'rgba(252, 211, 77, 0.9)',
          vignetteEnd: 'rgba(1, 9, 4, 0.75)',
        };

      case 'military-matrix':
      default:
        return {
          bgGradient: ['#0c162d', '#080e1e', '#040711'],
          threatBgGradient: ['#180814', '#0f050d', '#050205'],
          gridStroke: 'rgba(6, 182, 212, 0.07)',
          threatGridStroke: 'rgba(244, 63, 94, 0.08)',
          contourStroke: (alpha) => `rgba(6, 182, 212, ${alpha})`,
          threatContourStroke: (alpha) => `rgba(244, 63, 94, ${alpha * 1.1})`,
          contourLabelFill: 'rgba(56, 189, 248, 0.45)',
          threatContourLabelFill: 'rgba(251, 113, 133, 0.5)',
          watermarkFill: 'rgba(6, 182, 212, 0.38)',
          threatWatermarkFill: 'rgba(244, 63, 94, 0.45)',
          crosshairStroke: 'rgba(6, 182, 212, 0.28)',
          radarRingStroke: 'rgba(6, 182, 212, 0.18)',
          threatRadarRingStroke: 'rgba(244, 63, 94, 0.22)',
          radarAxisStroke: 'rgba(6, 182, 212, 0.2)',
          radarSweepGradient: ['rgba(6, 182, 212, 0.26)', 'rgba(0, 0, 0, 0)'],
          threatRadarSweepGradient: ['rgba(244, 63, 94, 0.3)', 'rgba(0, 0, 0, 0)'],
          vectorDashStroke: 'rgba(6, 182, 212, 0.2)',
          threatVectorDashStroke: 'rgba(244, 63, 94, 0.25)',
          particleFill: '#38bdf8',
          threatParticleFill: '#fb7185',
          coneFill: 'rgba(6, 182, 212, 0.08)',
          threatConeFill: 'rgba(244, 63, 94, 0.1)',
          nodeOuterRing: 'rgba(6, 182, 212, 0.65)',
          threatNodeOuterRing: 'rgba(244, 63, 94, 0.75)',
          nodeDot: '#06b6d4',
          threatNodeDot: '#f43f5e',
          nodeLabel: 'rgba(148, 163, 184, 0.85)',
          threatNodeLabel: 'rgba(251, 113, 133, 0.9)',
          vignetteEnd: 'rgba(4, 7, 15, 0.65)',
        };
    }
  }, [theme, accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Dynamic data packets traveling between nodes
    const particles: TelemetryParticle[] = [
      { fromNode: 0, toNode: 1, progress: 0.2, speed: 0.0028 },
      { fromNode: 1, toNode: 2, progress: 0.6, speed: 0.0024 },
      { fromNode: 2, toNode: 3, progress: 0.8, speed: 0.0032 },
      { fromNode: 3, toNode: 4, progress: 0.1, speed: 0.0026 },
      { fromNode: 5, toNode: 6, progress: 0.4, speed: 0.0030 },
      { fromNode: 6, toNode: 7, progress: 0.7, speed: 0.0025 },
      { fromNode: 7, toNode: 8, progress: 0.3, speed: 0.0031 },
      { fromNode: 1, toNode: 6, progress: 0.5, speed: 0.0020 },
      { fromNode: 3, toNode: 7, progress: 0.9, speed: 0.0023 },
    ];

    let tick = 0;

    const render = () => {
      tick += 0.012;
      ctx.clearRect(0, 0, width, height);

      // 1. Base Command-Center Atmospheric Gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        width * 0.05,
        width * 0.5,
        height * 0.5,
        width * 0.85
      );
      const bgColors = activeThreatState ? palette.threatBgGradient : palette.bgGradient;
      bgGrad.addColorStop(0, bgColors[0]);
      bgGrad.addColorStop(0.4, bgColors[1]);
      bgGrad.addColorStop(1, bgColors[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. 3D Isometric Perspective Ground Grid
      ctx.save();
      ctx.strokeStyle = activeThreatState ? palette.threatGridStroke : palette.gridStroke;
      ctx.lineWidth = 1;
      const hLines = 14;
      for (let i = 0; i < hLines; i++) {
        const y = height * (0.2 + Math.pow(i / hLines, 1.4) * 0.8);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const vLines = 16;
      for (let j = 0; j <= vLines; j++) {
        const x = (j / vLines) * width;
        ctx.beginPath();
        ctx.moveTo(x, height * 0.2);
        ctx.lineTo(x + (x - width * 0.5) * 0.4, height);
        ctx.stroke();
      }
      ctx.restore();

      // 3. 3D Topographic Terrain Elevation Contour Curves
      const numContours = 10;
      const contourLabels = ['2,240M', '1,980M', '1,840M', '1,650M', '1,420M', '1,280M', '1,100M', '950M', '780M', '620M'];

      for (let c = 0; c < numContours; c++) {
        ctx.save();
        ctx.beginPath();
        const yOffset = height * (0.12 + (c / numContours) * 0.82);
        const amp = 42 + c * 7;
        const freq = 0.0016 + c * 0.00025;
        const speed = tick * (0.06 + c * 0.008);

        const strokeAlpha = activeThreatState ? 0.12 + c * 0.015 : 0.14 + c * 0.015;
        ctx.strokeStyle = activeThreatState
          ? palette.threatContourStroke(strokeAlpha)
          : palette.contourStroke(strokeAlpha);
        ctx.lineWidth = c % 3 === 0 ? 1.5 : 1;
        ctx.setLineDash(c % 2 === 0 ? [] : [6, 6]);

        let labelDrawn = false;

        for (let x = 0; x <= width; x += 20) {
          const elev =
            Math.sin(x * freq + speed) * amp +
            Math.cos(x * freq * 1.7 - speed * 0.5) * (amp * 0.4) +
            Math.sin((x + c * 150) * 0.0007) * 25;

          const y = yOffset + elev;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          // Draw elevation height label on the contour line
          if (!labelDrawn && x > width * 0.72 && x < width * 0.78) {
            ctx.font = 'bold 7.5px monospace';
            ctx.fillStyle = activeThreatState ? palette.threatContourLabelFill : palette.contourLabelFill;
            ctx.fillText(contourLabels[c] || `${1800 - c * 120}M`, x + 4, y - 3);
            labelDrawn = true;
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Subtle Sector Coordinates & Technical Watermarks
      ctx.save();
      ctx.font = 'bold 8.5px monospace';
      ctx.fillStyle = activeThreatState ? palette.threatWatermarkFill : palette.watermarkFill;
      ctx.fillText('SECTOR FOXTROT-04 // ELEV: 1,840M MSL', 32, height - 36);
      ctx.fillText('GIS LAT: 34°08\'42.1"N · LNG: 74°48\'18.5"E', 32, height - 22);
      ctx.fillText('DEFENSE GRID: 884-D // SENTRY LINK 9/9 SECURE', width - 280, height - 22);

      // Technical crosshairs at sector junctions
      const crosshairs = [
        { x: width * 0.25, y: height * 0.3 },
        { x: width * 0.75, y: height * 0.35 },
        { x: width * 0.5, y: height * 0.7 },
      ];
      ctx.strokeStyle = activeThreatState ? 'rgba(244, 63, 94, 0.25)' : palette.crosshairStroke;
      ctx.lineWidth = 1;
      crosshairs.forEach((pt) => {
        ctx.beginPath();
        ctx.moveTo(pt.x - 8, pt.y); ctx.lineTo(pt.x + 8, pt.y);
        ctx.moveTo(pt.x, pt.y - 8); ctx.lineTo(pt.x, pt.y + 8);
        ctx.stroke();
      });
      ctx.restore();

      // 5. Ambient Radar Scanning Geometry (Slow 360° sweep in top right)
      const radarCenterX = width * 0.88;
      const radarCenterY = height * 0.22;
      const radarRadius = 150;
      const sweepAngle = (tick * 0.28) % (Math.PI * 2);

      ctx.save();
      // Concentric range rings
      ctx.strokeStyle = activeThreatState ? palette.threatRadarRingStroke : palette.radarRingStroke;
      ctx.lineWidth = 1;
      [0.33, 0.66, 1.0].forEach((rRatio) => {
        ctx.beginPath();
        ctx.arc(radarCenterX, radarCenterY, radarRadius * rRatio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Radar Axis Lines
      ctx.strokeStyle = palette.radarAxisStroke;
      ctx.beginPath();
      ctx.moveTo(radarCenterX - radarRadius, radarCenterY);
      ctx.lineTo(radarCenterX + radarRadius, radarCenterY);
      ctx.moveTo(radarCenterX, radarCenterY - radarRadius);
      ctx.lineTo(radarCenterX, radarCenterY + radarRadius);
      ctx.stroke();

      // Sweep Beam Sector Gradient
      const sweepGrad = ctx.createRadialGradient(
        radarCenterX,
        radarCenterY,
        0,
        radarCenterX,
        radarCenterY,
        radarRadius
      );
      const sweepColors = activeThreatState ? palette.threatRadarSweepGradient : palette.radarSweepGradient;
      sweepGrad.addColorStop(0, sweepColors[0]);
      sweepGrad.addColorStop(1, sweepColors[1]);

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(radarCenterX, radarCenterY);
      ctx.arc(radarCenterX, radarCenterY, radarRadius, sweepAngle - 0.45, sweepAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 6. Holographic Sentry Nodes & Communication Lines
      ctx.save();
      // Connection Vectors
      ctx.strokeStyle = activeThreatState ? palette.threatVectorDashStroke : palette.vectorDashStroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      particles.forEach((p) => {
        const from = sentryNodes[p.fromNode];
        const to = sentryNodes[p.toNode];
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x * width, from.y * height);
          ctx.lineTo(to.x * width, to.y * height);
          ctx.stroke();
        }
      });

      // Telemetry Data Packets
      ctx.setLineDash([]);
      particles.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1.0;
        const from = sentryNodes[p.fromNode];
        const to = sentryNodes[p.toNode];
        if (from && to) {
          const px = from.x * width + (to.x * width - from.x * width) * p.progress;
          const py = from.y * height + (to.y * height - from.y * height) * p.progress;
          ctx.fillStyle = activeThreatState ? palette.threatParticleFill : palette.particleFill;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Sentry Node Markers & Coverage Cones
      sentryNodes.forEach((node) => {
        const nx = node.x * width;
        const ny = node.y * height;

        // Coverage Sector Cone
        const radAngle = (node.fovAngle * Math.PI) / 180;
        const coneSpan = (45 * Math.PI) / 180;
        ctx.fillStyle = activeThreatState ? palette.threatConeFill : palette.coneFill;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.arc(nx, ny, node.range, radAngle - coneSpan / 2, radAngle + coneSpan / 2);
        ctx.closePath();
        ctx.fill();

        // Node Outer Ring
        ctx.strokeStyle = activeThreatState ? palette.threatNodeOuterRing : palette.nodeOuterRing;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nx, ny, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Node Central Dot
        ctx.fillStyle = activeThreatState ? palette.threatNodeDot : palette.nodeDot;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Node Label
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = activeThreatState ? palette.threatNodeLabel : palette.nodeLabel;
        ctx.fillText(`${node.code} [${node.name}]`, nx + 8, ny - 4);
      });
      ctx.restore();

      // 7. Perimeter Atmospheric Soft Vignette
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        width * 0.35,
        width * 0.5,
        height * 0.5,
        width * 0.78
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, palette.vignetteEnd);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, isDaylight, accentColor, palette, sentryNodes, activeThreatState]);

  return (
    <div
      id="tactical-operations-atmosphere-root"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-500 ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};
