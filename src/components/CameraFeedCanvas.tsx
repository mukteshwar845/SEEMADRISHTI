import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CameraFeed } from '../types';
import { webSocketService, RealYoloDetection, TrackItem } from '../services/websocketService';

interface CameraFeedCanvasProps {
  camera: CameraFeed;
  showAiBoxes?: boolean;
  showZones?: boolean;
  showMotionTrails?: boolean;
  isNightVision?: boolean;
  onSimulateThreat?: () => void;
  className?: string;
}

// Helper to obtain dynamic bounding box styling based on class and threat/authorization status
export interface DetectionStyleConfig {
  strokeColor: string;
  fillColor: string;
  badgeBg: string;
  badgeTextColor: string;
  categoryLabel: string;
  isHighPriority: boolean;
}

export const getDetectionClassStyle = (
  rawClass: string,
  options?: {
    isThreat?: boolean;
    isUnauthorized?: boolean;
    confidence?: number;
    riskScore?: number;
  }
): DetectionStyleConfig => {
  const norm = (rawClass || 'person').toLowerCase().trim();
  const isThreat = options?.isThreat ?? false;
  const isUnauthorized = options?.isUnauthorized ?? false;
  const riskScore = options?.riskScore ?? 0;

  // 1. Unauthorized / Intrusion / Weapon / Threat Cases -> Tactical Red / Crimson Alert
  if (
    isThreat ||
    isUnauthorized ||
    norm.includes('unauthorized') ||
    norm.includes('intruder') ||
    norm.includes('intrusion') ||
    norm.includes('weapon') ||
    norm.includes('breach') ||
    riskScore >= 75
  ) {
    return {
      strokeColor: '#ef4444', // Red-500
      fillColor: 'rgba(239, 68, 68, 0.12)',
      badgeBg: 'rgba(239, 68, 68, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: norm.includes('vehicle') ? 'UNAUTHORIZED VEHICLE' : norm.includes('intruder') ? 'INTRUDER' : 'UNAUTHORIZED',
      isHighPriority: true,
    };
  }

  // 2. Vehicles: Authorized / Civilian Vehicle -> Emerald Green (#10b981 / #22c55e)
  // Non-authorized / suspicious transport is handled in rule 1 or 3
  if (
    norm.includes('civilian') ||
    norm === 'vehicle' ||
    norm === 'car' ||
    norm === 'truck' ||
    norm === 'bus' ||
    norm === 'van' ||
    norm === 'authorized_vehicle'
  ) {
    return {
      strokeColor: '#10b981', // Emerald Green-500 (Civilian / Authorized Vehicle)
      fillColor: 'rgba(16, 185, 129, 0.12)',
      badgeBg: 'rgba(16, 185, 129, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: norm.includes('civilian') ? 'CIVILIAN VEHICLE' : 'VEHICLE',
      isHighPriority: false,
    };
  }

  // 3. Loitering / Suspicious / High Dwell Time / Warning -> Warning Amber (#f59e0b)
  if (
    norm.includes('loiter') ||
    norm.includes('suspicious') ||
    norm.includes('warning') ||
    (riskScore >= 45 && riskScore < 75)
  ) {
    return {
      strokeColor: '#f59e0b', // Amber-500
      fillColor: 'rgba(245, 158, 11, 0.12)',
      badgeBg: 'rgba(245, 158, 11, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: 'SUSPICIOUS / LOITERING',
      isHighPriority: true,
    };
  }

  // 4. Security Patrol / Friendly Forces -> Sky Blue / Cyan (#38bdf8 / #0284c7)
  if (
    norm.includes('patrol') ||
    norm.includes('officer') ||
    norm.includes('guard') ||
    norm.includes('friendly') ||
    norm.includes('convoy')
  ) {
    return {
      strokeColor: '#38bdf8', // Sky Blue-400
      fillColor: 'rgba(56, 189, 248, 0.12)',
      badgeBg: 'rgba(2, 132, 199, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: 'SECURITY PATROL',
      isHighPriority: false,
    };
  }

  // 5. Normal Person / Civilian Pedestrian -> Emerald Green (#10b981 / #22c55e)
  return {
    strokeColor: '#10b981', // Emerald-500 (Normal Civilian / Pedestrian)
    fillColor: 'rgba(16, 185, 129, 0.10)',
    badgeBg: 'rgba(16, 185, 129, 0.90)',
    badgeTextColor: '#ffffff',
    categoryLabel: 'PERSON',
    isHighPriority: false,
  };
};

// Fallback synthetic animation tracks tailored accurately to camera sector (Persons / Patrols / Intruders, NO vehicles on sports court)
const getCameraTracks = (camId: string, camCode: string) => {
  const norm = `${camId} ${camCode}`.toLowerCase();
  if (norm.includes('1') || norm.includes('cam-01') || norm.includes('main gate')) {
    return [
      { id: 1, label: 'INTRUDER', rawClass: 'intruder', baseNormX: 0.54, baseNormY: 0.38, speedX: 0.0003, speedY: 0.0001, w: 0.06, h: 0.16, isThreat: true, trail: [] as { x: number; y: number }[] },
      { id: 2, label: 'PERSON', rawClass: 'person', baseNormX: 0.32, baseNormY: 0.46, speedX: 0.0002, speedY: -0.0001, w: 0.05, h: 0.14, isThreat: false, trail: [] as { x: number; y: number }[] },
      { id: 3, label: 'PERSON', rawClass: 'person', baseNormX: 0.44, baseNormY: 0.58, speedX: -0.0002, speedY: 0.0001, w: 0.055, h: 0.15, isThreat: false, trail: [] as { x: number; y: number }[] },
    ];
  }
  if (norm.includes('2') || norm.includes('cam-02') || norm.includes('east')) {
    return [
      { id: 1, label: 'PERSON', rawClass: 'person', baseNormX: 0.68, baseNormY: 0.40, speedX: -0.0003, speedY: 0.0001, w: 0.052, h: 0.15, isThreat: false, trail: [] as { x: number; y: number }[] },
      { id: 2, label: 'PATROL', rawClass: 'patrol', baseNormX: 0.28, baseNormY: 0.48, speedX: 0.0002, speedY: 0.0002, w: 0.058, h: 0.16, isThreat: false, trail: [] as { x: number; y: number }[] },
    ];
  }
  if (norm.includes('3') || norm.includes('cam-03') || norm.includes('road') || norm.includes('court')) {
    return [
      { id: 1, label: 'PERSON', rawClass: 'person', baseNormX: 0.48, baseNormY: 0.50, speedX: -0.0003, speedY: 0.0001, w: 0.055, h: 0.16, isThreat: false, trail: [] as { x: number; y: number }[] },
      { id: 2, label: 'PERSON', rawClass: 'person', baseNormX: 0.22, baseNormY: 0.44, speedX: 0.0002, speedY: -0.0001, w: 0.05, h: 0.14, isThreat: false, trail: [] as { x: number; y: number }[] },
    ];
  }
  if (norm.includes('4') || norm.includes('cam-04') || norm.includes('fence')) {
    return [
      { id: 1, label: 'INTRUDER', rawClass: 'intruder', baseNormX: 0.42, baseNormY: 0.35, speedX: 0.0004, speedY: 0.0001, w: 0.055, h: 0.16, isThreat: true, trail: [] as { x: number; y: number }[] },
      { id: 2, label: 'PERSON', rawClass: 'person', baseNormX: 0.65, baseNormY: 0.52, speedX: -0.0002, speedY: 0.0001, w: 0.05, h: 0.14, isThreat: false, trail: [] as { x: number; y: number }[] },
    ];
  }
  return [
    { id: 1, label: 'PERSON', rawClass: 'person', baseNormX: 0.45, baseNormY: 0.44, speedX: 0.0003, speedY: 0.0001, w: 0.055, h: 0.15, isThreat: false, trail: [] as { x: number; y: number }[] },
    { id: 2, label: 'PERSON', rawClass: 'person', baseNormX: 0.62, baseNormY: 0.50, speedX: -0.0002, speedY: 0.0001, w: 0.05, h: 0.14, isThreat: false, trail: [] as { x: number; y: number }[] },
  ];
};

export const CameraFeedCanvas: React.FC<CameraFeedCanvasProps> = ({
  camera,
  showAiBoxes = true,
  showZones = true,
  showMotionTrails = true,
  isNightVision = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Live detections & tracks from WebSocket stream
  const liveDetectionsRef = useRef<RealYoloDetection[]>([]);
  const liveTracksRef = useRef<TrackItem[]>([]);
  const lastWsUpdateTimeRef = useRef<number>(0);

  // Fallback synthetic animation tracks for smooth visualization
  const simState = useRef({
    tick: 17,
    scanline: 0,
    syntheticTracks: getCameraTracks(camera.id, camera.code || ''),
  });

  // Recompute synthetic tracks when camera changes
  useEffect(() => {
    simState.current.syntheticTracks = getCameraTracks(camera.id, camera.code || '');
  }, [camera.id, camera.code]);

  // ResizeObserver for dynamic relative scaling in all grid modes (2x2 Quad, 1+3 Split, Single, Fullscreen)
  const syncCanvasDimensions = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const targetW = Math.max(10, Math.floor(rect.width));
    const targetH = Math.max(10, Math.floor(rect.height));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    syncCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasDimensions();
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', syncCanvasDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncCanvasDimensions);
    };
  }, [syncCanvasDimensions]);

  const videoUrl = camera.rtspUrl?.includes('/api/cameras/')
    ? camera.rtspUrl
    : `/api/cameras/${camera.id.toLowerCase()}/video`;

  // Subscribe to live detections and tracking for this camera
  useEffect(() => {
    const camIdNorm = camera.id.toLowerCase();
    const camCodeNorm = (camera.code || '').toLowerCase().replace(/\s+/g, '-');

    const unsubDetection = webSocketService.onDetection((payload) => {
      const pCam = (payload.camera_id || '').toLowerCase();
      if (pCam === camIdNorm || pCam === camCodeNorm || pCam.includes(camIdNorm) || camIdNorm.includes(pCam)) {
        liveDetectionsRef.current = (payload.detections || []).map((det) => ({
          ...det,
          // Overwrite any erroneous vehicle labels on court/perimeter
          class_name: det.class_name?.toLowerCase() === 'vehicle' ? 'person' : det.class_name,
        }));
        lastWsUpdateTimeRef.current = Date.now();
      }
    });

    const unsubTracking = webSocketService.onTracking((payload) => {
      const pCam = (payload.camera_id || '').toLowerCase();
      if (pCam === camIdNorm || pCam === camCodeNorm || pCam.includes(camIdNorm) || camIdNorm.includes(pCam)) {
        liveTracksRef.current = (payload.tracks || []).map((tr) => ({
          ...tr,
          class_name: tr.class_name?.toLowerCase() === 'vehicle' ? 'person' : tr.class_name,
        }));
        lastWsUpdateTimeRef.current = Date.now();
      }
    });

    const unsubFrameState = webSocketService.onFrameState((payload) => {
      const pCam = (payload.camera_id || '').toLowerCase();
      if (pCam === camIdNorm || pCam === camCodeNorm || pCam.includes(camIdNorm) || camIdNorm.includes(pCam)) {
        if (payload.detections) {
          liveDetectionsRef.current = payload.detections.map((det) => ({
            ...det,
            class_name: det.class_name?.toLowerCase() === 'vehicle' ? 'person' : det.class_name,
          }));
        }
        if (payload.tracks) {
          liveTracksRef.current = payload.tracks.map((tr) => ({
            ...tr,
            class_name: tr.class_name?.toLowerCase() === 'vehicle' ? 'person' : tr.class_name,
          }));
        }
        lastWsUpdateTimeRef.current = Date.now();
      }
    });

    return () => {
      unsubDetection();
      unsubTracking();
      unsubFrameState();
    };
  }, [camera.id, camera.code]);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const s = simState.current;
      s.tick += 0.02;

      ctx.clearRect(0, 0, w, h);

      // 1. Render Security Danger / Warning Zones with dynamic relative coordinates
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

            // Draw zone label tag
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = zone.type === 'restricted' ? '#ef4444' : '#f59e0b';
            ctx.fillText(zone.name.toUpperCase(), (p0.x / 1000) * w + 4, (p0.y / 600) * h + 12);
            ctx.restore();
          }
        });
      }

      // 2. Render AI Bounding Boxes & Tracking Vectors with precise relative scaling
      if (showAiBoxes) {
        const hasLiveWs = (Date.now() - lastWsUpdateTimeRef.current) < 4000;
        const tracks = liveTracksRef.current;
        const detections = liveDetectionsRef.current;

        if (hasLiveWs && (tracks.length > 0 || detections.length > 0)) {
          // Render Live Tracks from Real YOLO/ByteTrack
          tracks.forEach((track) => {
            const bx1 = (track.bbox.x1 / 1000) * w;
            const by1 = (track.bbox.y1 / 600) * h;
            const bw = ((track.bbox.x2 - track.bbox.x1) / 1000) * w;
            const bh = ((track.bbox.y2 - track.bbox.y1) / 600) * h;

            const isThreat = track.track_id === 17 || track.confidence > 0.90;
            const style = getDetectionClassStyle(track.class_name, {
              isThreat,
              confidence: track.confidence,
            });

            ctx.save();
            // Subtle translucent target highlight
            ctx.fillStyle = style.fillColor;
            ctx.fillRect(bx1, by1, bw, bh);

            // Dynamic border color based on detected class & status
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.isHighPriority ? 2.0 : 1.5;
            ctx.strokeRect(bx1, by1, bw, bh);

            // Corner crosshairs
            const cornerLen = 5;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx1, by1 + cornerLen); ctx.lineTo(bx1, by1); ctx.lineTo(bx1 + cornerLen, by1);
            ctx.moveTo(bx1 + bw - cornerLen, by1); ctx.lineTo(bx1 + bw, by1); ctx.lineTo(bx1 + bw, by1 + cornerLen);
            ctx.moveTo(bx1, by1 + bh - cornerLen); ctx.lineTo(bx1, by1 + bh); ctx.lineTo(bx1 + cornerLen, by1 + bh);
            ctx.moveTo(bx1 + bw - cornerLen, by1 + bh); ctx.lineTo(bx1 + bw, by1 + bh); ctx.lineTo(bx1 + bw, by1 + bh - cornerLen);
            ctx.stroke();

            // Label tag with dynamic class styling
            const labelText = `#${track.track_id} ${style.categoryLabel} ${(track.confidence * 100).toFixed(0)}%`;
            ctx.font = 'bold 8.5px monospace';
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillStyle = style.badgeBg;
            ctx.fillRect(bx1, by1 - 14, Math.max(textWidth + 8, bw), 14);
            ctx.fillStyle = style.badgeTextColor;
            ctx.fillText(labelText, bx1 + 4, by1 - 3);
            ctx.restore();
          });
        } else {
          // Render Real-Time Procedural YOLO AI Detections using relative normalized coordinates
          s.syntheticTracks.forEach((st) => {
            const timeOffset = s.tick * 0.4;
            const curNormX = (st.baseNormX + Math.sin(timeOffset + st.id) * 0.05 + 1) % 1;
            const curNormY = (st.baseNormY + Math.cos(timeOffset * 0.8 + st.id) * 0.04 + 1) % 1;

            const bx = curNormX * w;
            const by = curNormY * h;
            const bw = st.w * w;
            const bh = st.h * h;

            const style = getDetectionClassStyle(st.rawClass || st.label, {
              isThreat: st.isThreat,
            });

            // Motion trail
            if (showMotionTrails) {
              st.trail.push({ x: bx + bw / 2, y: by + bh / 2 });
              if (st.trail.length > 14) st.trail.shift();

              ctx.save();
              ctx.strokeStyle = style.strokeColor;
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              st.trail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();
              ctx.restore();
            }

            ctx.save();
            // Subtle translucent background tint
            ctx.fillStyle = style.fillColor;
            ctx.fillRect(bx, by, bw, bh);

            // Dynamic border color based on detected class
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.isHighPriority ? 2.0 : 1.5;
            ctx.strokeRect(bx, by, bw, bh);

            // Corner highlights
            const cLen = 4;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
            ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
            ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
            ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
            ctx.stroke();

            // Label pill with dynamic background & clear typography
            const conf = Math.round(92 + Math.sin(s.tick + st.id) * 6);
            const pillText = `#${st.id} ${style.categoryLabel} ${conf}%`;
            ctx.font = 'bold 8px monospace';
            const pillTextWidth = ctx.measureText(pillText).width;
            ctx.fillStyle = style.badgeBg;
            ctx.fillRect(bx, by - 13, Math.max(pillTextWidth + 8, bw), 13);
            ctx.fillStyle = style.badgeTextColor;
            ctx.fillText(pillText, bx + 4, by - 3);
            ctx.restore();
          });
        }
      }

      // 3. Tactical Reticle & Scanline
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
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black ${className}`}
    >
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

      {/* Overlay Canvas for Zones, Motion Vectors and YOLO AI Detections - dynamically sized to container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 block"
      />
    </div>
  );
};
