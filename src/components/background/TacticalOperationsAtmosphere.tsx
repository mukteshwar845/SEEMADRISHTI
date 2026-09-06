import React, { useRef, useEffect, useState, useMemo } from 'react';
import { tacticalAlertDispatcher } from '../../utils/tacticalAlertDispatcher';
import { useTheme } from '../../context/ThemeContext';

interface TacticalOperationsAtmosphereProps {
  className?: string;
  intensity?: 'subtle' | 'standard' | 'focused';
}

interface SentryNode {
  id: string;
  code: string;
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

export const TacticalOperationsAtmosphere: React.FC<TacticalOperationsAtmosphereProps> = ({
  className = '',
  intensity = 'subtle',
}) => {
  const { isDaylight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeThreatState, setActiveThreatState] = useState<boolean>(false);

  // Sentry camera nodes plotted geospatially across the tactical border terrain
  const sentryNodes: SentryNode[] = useMemo(() => [
    { id: 'cam-1', code: 'CAM-01', x: 0.14, y: 0.22, fovAngle: 135, range: 70 },
    { id: 'cam-2', code: 'CAM-02', x: 0.32, y: 0.18, fovAngle: 160, range: 65 },
    { id: 'cam-3', code: 'CAM-03', x: 0.52, y: 0.25, fovAngle: 180, range: 75 },
    { id: 'cam-4', code: 'CAM-04', x: 0.72, y: 0.20, fovAngle: 210, range: 60 },
    { id: 'cam-5', code: 'CAM-05', x: 0.88, y: 0.28, fovAngle: 225, range: 70 },
    { id: 'cam-6', code: 'CAM-06', x: 0.20, y: 0.75, fovAngle: 45, range: 65 },
    { id: 'cam-7', code: 'CAM-07', x: 0.42, y: 0.82, fovAngle: 20, range: 80 },
    { id: 'cam-8', code: 'CAM-08', x: 0.65, y: 0.78, fovAngle: 345, range: 75 },
    { id: 'cam-9', code: 'CAM-09', x: 0.85, y: 0.72, fovAngle: 315, range: 65 },
  ], []);

  // Listen to live tactical alerts for ambient command-center lighting shift
  useEffect(() => {
    const unsub = tacticalAlertDispatcher.subscribe(() => {
      setActiveThreatState(true);
      const timer = setTimeout(() => {
        setActiveThreatState(false);
      }, 4000);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isDaylight) return;

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
      { fromNode: 0, toNode: 1, progress: 0.2, speed: 0.003 },
      { fromNode: 1, toNode: 2, progress: 0.6, speed: 0.0025 },
      { fromNode: 2, toNode: 3, progress: 0.8, speed: 0.0035 },
      { fromNode: 3, toNode: 4, progress: 0.1, speed: 0.0028 },
      { fromNode: 5, toNode: 6, progress: 0.4, speed: 0.0032 },
      { fromNode: 6, toNode: 7, progress: 0.7, speed: 0.0027 },
      { fromNode: 7, toNode: 8, progress: 0.3, speed: 0.0034 },
      { fromNode: 1, toNode: 6, progress: 0.5, speed: 0.0022 },
      { fromNode: 3, toNode: 7, progress: 0.9, speed: 0.0026 },
    ];

    let tick = 0;

    const render = () => {
      tick += 0.015;
      ctx.clearRect(0, 0, width, height);

      // 1. Base Command-Center Atmospheric Gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.85
      );
      if (activeThreatState) {
        bgGrad.addColorStop(0, '#0f0a14');
        bgGrad.addColorStop(0.5, '#0a0812');
        bgGrad.addColorStop(1, '#050409');
      } else {
        bgGrad.addColorStop(0, '#090e1c');
        bgGrad.addColorStop(0.5, '#070b16');
        bgGrad.addColorStop(1, '#04070f');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. 3D Topographic Terrain Elevation Contour Curves
      const numContours = 9;
      const baseAlpha = activeThreatState ? 0.05 : 0.04;

      for (let c = 0; c < numContours; c++) {
        ctx.save();
        ctx.beginPath();
        const yOffset = height * (0.15 + (c / numContours) * 0.75);
        const amp = 35 + c * 8;
        const freq = 0.0018 + c * 0.0003;
        const speed = tick * (0.08 + c * 0.01);

        ctx.strokeStyle = activeThreatState
          ? `rgba(244, 63, 94, ${baseAlpha + c * 0.004})`
          : `rgba(6, 182, 212, ${baseAlpha + c * 0.004})`;
        ctx.lineWidth = 1;
        ctx.setLineDash(c % 2 === 0 ? [] : [4, 6]);

        for (let x = 0; x <= width; x += 25) {
          const elev =
            Math.sin(x * freq + speed) * amp +
            Math.cos(x * freq * 1.8 - speed * 0.6) * (amp * 0.45) +
            Math.sin((x + c * 100) * 0.0008) * 20;

          const y = yOffset + elev;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Faint Geospatial Sector Grid & Coordinates
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
      ctx.lineWidth = 1;
      const gridSize = 120;
      for (let gx = 0; gx < width; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Subtle Coordinate Watermarks
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
      ctx.fillText('SECTOR FOXTROT-04 // ELEV: 1,840M MSL', 36, height - 32);
      ctx.fillText('GIS LAT: 34°08\'42.1"N · LNG: 74°48\'18.5"E', 36, height - 20);
      ctx.fillText('DEFENSE TELEMETRY // 256-BIT SEC_LINK', width - 260, height - 20);
      ctx.restore();

      // 4. Ambient Radar Scanning Geometry (Slow 360° sweep in top-right or center)
      const radarCenterX = width * 0.88;
      const radarCenterY = height * 0.22;
      const radarRadius = 140;
      const sweepAngle = (tick * 0.25) % (Math.PI * 2);

      ctx.save();
      // Concentric range rings
      ctx.strokeStyle = activeThreatState ? 'rgba(244, 63, 94, 0.08)' : 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      [0.33, 0.66, 1.0].forEach((rRatio) => {
        ctx.beginPath();
        ctx.arc(radarCenterX, radarCenterY, radarRadius * rRatio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis crosshairs
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
      sweepGrad.addColorStop(0, activeThreatState ? 'rgba(244, 63, 94, 0.15)' : 'rgba(6, 182, 212, 0.12)');
      sweepGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(radarCenterX, radarCenterY);
      ctx.arc(radarCenterX, radarCenterY, radarRadius, sweepAngle - 0.4, sweepAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 5. Holographic Sentry Nodes & Communication Lines
      ctx.save();
      // Connection Vectors
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
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

      // Telemetry Data Particles
      ctx.setLineDash([]);
      particles.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1.0;
        const from = sentryNodes[p.fromNode];
        const to = sentryNodes[p.toNode];
        if (from && to) {
          const px = from.x * width + (to.x * width - from.x * width) * p.progress;
          const py = from.y * height + (to.y * height - from.y * height) * p.progress;
          ctx.fillStyle = activeThreatState ? '#fb7185' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
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
        ctx.fillStyle = activeThreatState ? 'rgba(244, 63, 94, 0.03)' : 'rgba(6, 182, 212, 0.03)';
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.arc(nx, ny, node.range, radAngle - coneSpan / 2, radAngle + coneSpan / 2);
        ctx.closePath();
        ctx.fill();

        // Node Central Dot
        ctx.fillStyle = activeThreatState ? '#f43f5e' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Node Label
        ctx.font = '7.5px monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.fillText(node.code, nx + 6, ny - 4);
      });
      ctx.restore();

      // 6. Perimeter Soft Vignette to maintain maximum CCTV focus
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        width * 0.35,
        width * 0.5,
        height * 0.5,
        width * 0.75
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(3, 6, 14, 0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDaylight, sentryNodes, activeThreatState]);

  if (isDaylight) return null;

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
