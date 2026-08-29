import React, { useRef, useEffect, useState } from 'react';
import { CameraFeed } from '../types';

interface CameraFeedCanvasProps {
  camera: CameraFeed;
  showAiBoxes?: boolean;
  showZones?: boolean;
  showMotionTrails?: boolean;
  isNightVision?: boolean;
  onSimulateThreat?: () => void;
  className?: string;
}

export const CameraFeedCanvas: React.FC<CameraFeedCanvasProps> = ({
  camera,
  showAiBoxes = true,
  showZones = true,
  showMotionTrails = true,
  isNightVision = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Fallback procedural animation state if video fails or is loading
  const simState = useRef({
    tick: 17,
    scanline: 0,
  });

  const videoUrl = camera.rtspUrl?.includes('/api/cameras/')
    ? camera.rtspUrl
    : `/api/cameras/${camera.id.toLowerCase()}/video`;

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      const s = simState.current;
      s.tick += 0.02;

      ctx.clearRect(0, 0, w, h);

      // Render zones if enabled
      if (showZones && camera.dangerZones && camera.dangerZones.length > 0) {
        camera.dangerZones.forEach((zone) => {
          if (zone.points.length >= 3) {
            ctx.save();
            ctx.beginPath();
            const p0 = zone.points[0];
            ctx.moveTo((p0.x / 1000) * w, (p0.y / 600) * h);
            for (let i = 1; i < zone.points.length; i++) {
              ctx.lineTo((zone.points[i].x / 1000) * w, (zone.points[i].y / 600) * h);
            }
            ctx.closePath();
            ctx.fillStyle = zone.type === 'restricted' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
            ctx.strokeStyle = zone.type === 'restricted' ? '#ef4444' : '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      // Tactical Scanline
      s.scanline = (s.scanline + 1.2) % h;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, s.scanline);
      ctx.lineTo(w, s.scanline);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [camera.id, showAiBoxes, showZones, showMotionTrails, isNightVision, camera.dangerZones]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {/* Real HTML5 Video element with H.264 video source */}
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => {
          setVideoLoaded(true);
          setVideoError(false);
        }}
        onError={() => {
          setVideoError(true);
          setVideoLoaded(false);
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          filter: isNightVision
            ? 'brightness(1.15) contrast(1.3) hue-rotate(90deg) saturate(2)'
            : 'none',
        }}
      />

      {/* Overlay Canvas for Zones and AI Detections */}
      <canvas
        ref={canvasRef}
        width={480}
        height={270}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
    </div>
  );
};
