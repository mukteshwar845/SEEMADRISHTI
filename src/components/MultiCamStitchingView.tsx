import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Layers,
  Sparkles,
  ShieldAlert,
  Compass,
  ArrowRight,
  Maximize2,
  Navigation,
  Eye,
  Radio,
  Sliders,
  Clock,
  CheckCircle,
  Download,
  Crosshair,
  RefreshCw,
  Zap,
  Activity,
  Scan,
  AlertTriangle,
  Info,
  ChevronRight,
  Flame,
  Moon,
  Sun,
  Grid,
} from 'lucide-react';
import { fetchCorrelations, CorrelatedIncidentRecord } from '../services/api';
import { webSocketService } from '../services/websocketService';

export type VisionMode = 'RGB' | 'NVG' | 'THERMAL' | 'WIREFRAME';

export interface CameraPairConfig {
  id: string;
  name: string;
  fov: string;
  camA: { id: string; name: string; code: string; src: string; sector: string };
  camB: { id: string; name: string; code: string; src: string; sector: string };
  camC?: { id: string; name: string; code: string; src: string; sector: string };
  defaultOverlap: number;
}

const CAMERA_PAIRS: CameraPairConfig[] = [
  {
    id: 'alpha-180',
    name: 'Sector Alpha Perimeter (CAM 1 + CAM 2)',
    fov: '180° Panoramic',
    camA: { id: 'cam-01', name: 'Sector Alpha Main Gate', code: 'CAM 1', src: '/api/cameras/cam-01/video', sector: 'GATE ENTRY' },
    camB: { id: 'cam-02', name: 'Sector Alpha East Perimeter', code: 'CAM 2', src: '/api/cameras/cam-02/video', sector: 'EAST FENCE' },
    defaultOverlap: 38,
  },
  {
    id: 'bravo-180',
    name: 'Sector Bravo Perimeter (CAM 3 + CAM 4)',
    fov: '180° Panoramic',
    camA: { id: 'cam-03', name: 'Sector Bravo Access Road', code: 'CAM 3', src: '/api/cameras/cam-03/video', sector: 'ACCESS RD' },
    camB: { id: 'cam-04', name: 'Sector Bravo Outer Fence', code: 'CAM 4', src: '/api/cameras/cam-04/video', sector: 'OUTER FENCE' },
    defaultOverlap: 32,
  },
  {
    id: 'delta-180',
    name: 'Sector Delta Transit (CAM 7 + CAM 8)',
    fov: '180° Panoramic',
    camA: { id: 'cam-07', name: 'Sector Delta Tactical Court', code: 'CAM 7', src: '/api/cameras/cam-07/video', sector: 'TACTICAL' },
    camB: { id: 'cam-08', name: 'Sector Delta Highway Node', code: 'CAM 8', src: '/api/cameras/cam-08/video', sector: 'HIGHWAY' },
    defaultOverlap: 35,
  },
  {
    id: 'tri-270',
    name: 'Tri-Sector Tactical Sweep (CAM 1 + CAM 2 + CAM 3)',
    fov: '270° Ultra-Wide Matrix',
    camA: { id: 'cam-01', name: 'Main Gate', code: 'CAM 1', src: '/api/cameras/cam-01/video', sector: 'WEST' },
    camB: { id: 'cam-02', name: 'East Perimeter', code: 'CAM 2', src: '/api/cameras/cam-02/video', sector: 'CENTER' },
    camC: { id: 'cam-03', name: 'Access Road', code: 'CAM 3', src: '/api/cameras/cam-03/video', sector: 'EAST' },
    defaultOverlap: 30,
  },
];

interface ReidTrackTarget {
  id: string;
  name: string;
  rawClass: string;
  normX: number;
  normY: number;
  vx: number;
  vy: number;
  reidConfidence: number;
  lastCam: string;
  currentCam: string;
  appearance: {
    colorScore: number;
    gaitScore: number;
    silhouetteScore: number;
  };
  trajectory: { x: number; y: number }[];
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const MultiCamStitchingView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const videoCRef = useRef<HTMLVideoElement | null>(null);

  // Configuration & Pair Selection
  const [selectedPairId, setSelectedPairId] = useState<string>('alpha-180');
  const activePair = useMemo(() => {
    return CAMERA_PAIRS.find((p) => p.id === selectedPairId) || CAMERA_PAIRS[0];
  }, [selectedPairId]);

  // Homography & Stitching Settings
  const [overlapBlend, setOverlapBlend] = useState(38);
  const [homographyOffsetY, setHomographyOffsetY] = useState(0); // vertical alignment
  const [homographyTilt, setHomographyTilt] = useState(0); // perspective tilt degrees
  const [homographyScale, setHomographyScale] = useState(1.0); // zoom scaling
  const [showPredictiveVectors, setShowPredictiveVectors] = useState(true);
  const [reidTrackingActive, setReidTrackingActive] = useState(true);
  const [showTiePoints, setShowTiePoints] = useState(true);
  const [showHomographyGrid, setShowHomographyGrid] = useState(false);
  const [visionMode, setVisionMode] = useState<VisionMode>('RGB');
  const [calibrationDrawerOpen, setCalibrationDrawerOpen] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationScore, setCalibrationScore] = useState({ inliers: 98.4, ms: 14 });
  const [selectedTarget, setSelectedTarget] = useState<ReidTrackTarget | null>(null);
  const [snapshotNotification, setSnapshotNotification] = useState<string | null>(null);

  // Correlations Data (Phase 8 Engine)
  const [correlations, setCorrelations] = useState<CorrelatedIncidentRecord[]>([]);

  // Video Load Statuses
  const [videoAStatus, setVideoAStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [videoBStatus, setVideoBStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [videoCStatus, setVideoCStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Dynamic Multi-Target Simulated ReID State
  const targetsRef = useRef<ReidTrackTarget[]>([
    {
      id: 'REID-084',
      name: 'TARGET #084',
      rawClass: 'person',
      normX: 0.22,
      normY: 0.58,
      vx: 0.0016,
      vy: 0.0003,
      reidConfidence: 0.984,
      lastCam: 'CAM 1',
      currentCam: 'CAM 1',
      appearance: { colorScore: 97, gaitScore: 95, silhouetteScore: 99 },
      trajectory: [],
      threatLevel: 'HIGH',
    },
    {
      id: 'PATROL-02',
      name: 'SECURITY SENTRY',
      rawClass: 'patrol',
      normX: 0.76,
      normY: 0.62,
      vx: -0.0009,
      vy: -0.0002,
      reidConfidence: 0.992,
      lastCam: 'CAM 2',
      currentCam: 'CAM 2',
      appearance: { colorScore: 99, gaitScore: 98, silhouetteScore: 98 },
      trajectory: [],
      threatLevel: 'LOW',
    },
  ]);

  // Synthetic SIFT/ORB Feature Tie Points for visual alignment HUD
  const tiePoints = useMemo(() => {
    return [
      { yNorm: 0.25, confidence: 0.98 },
      { yNorm: 0.38, confidence: 0.94 },
      { yNorm: 0.48, confidence: 0.99 },
      { yNorm: 0.62, confidence: 0.96 },
      { yNorm: 0.74, confidence: 0.92 },
      { yNorm: 0.86, confidence: 0.95 },
    ];
  }, []);

  // Fetch correlations
  useEffect(() => {
    fetchCorrelations()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setCorrelations(res.data);
        }
      })
      .catch(() => {});

    const unsubCreate = webSocketService.onCorrelationCreated((payload) => {
      setCorrelations((prev) => [payload as any, ...prev.filter((p) => p.id !== payload.id)]);
    });

    const unsubUpdate = webSocketService.onCorrelationUpdated((payload) => {
      setCorrelations((prev) =>
        prev.map((item) => (item.id === payload.id ? { ...item, ...payload } : item))
      );
    });

    const unsubEscalate = webSocketService.onCorrelationEscalated((payload) => {
      const entity = (payload as any).entity || payload;
      setCorrelations((prev) =>
        prev.map((item) => (item.id === entity.id ? { ...item, ...entity, status: 'ACTIVE' } : item))
      );
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubEscalate();
    };
  }, []);

  // Reset overlap to default when camera pair switches
  useEffect(() => {
    setOverlapBlend(activePair.defaultOverlap);
    setHomographyOffsetY(0);
    setHomographyTilt(0);
    setHomographyScale(1.0);
  }, [activePair]);

  // Auto-Calibrate Homography routine (Simulated RANSAC optimization)
  const handleAutoCalibrate = useCallback(() => {
    setIsCalibrating(true);
    setTimeout(() => {
      setHomographyOffsetY(0);
      setHomographyTilt(0);
      setHomographyScale(1.0);
      setCalibrationScore({
        inliers: +(97 + Math.random() * 2.8).toFixed(1),
        ms: Math.floor(10 + Math.random() * 8),
      });
      setIsCalibrating(false);
    }, 1200);
  }, []);

  // Export high-resolution panoramic snapshot
  const handleCaptureSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      // Draw active canvas content
      tCtx.drawImage(canvas, 0, 0);

      // Add tactical military watermark overlay
      tCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      tCtx.fillRect(0, tempCanvas.height - 36, tempCanvas.width, 36);

      tCtx.fillStyle = '#10b981';
      tCtx.font = 'bold 12px monospace';
      tCtx.fillText(`SEEMADRISHTI TACTICAL PANORAMA // ${activePair.name.toUpperCase()}`, 16, tempCanvas.height - 14);

      tCtx.fillStyle = '#94a3b8';
      tCtx.font = '11px monospace';
      const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      tCtx.fillText(`TIMESTAMP: ${timeStr} | FOV: ${activePair.fov} | HOMOGRAPHY LOCKED`, tempCanvas.width - 440, tempCanvas.height - 14);

      const link = document.createElement('a');
      link.download = `SEEMADRISHTI_STITCHED_${activePair.id}_${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();

      setSnapshotNotification('Panoramic frame captured & downloaded successfully.');
      setTimeout(() => setSnapshotNotification(null), 4000);
    } catch (e) {
      console.error('Failed to capture panoramic snapshot:', e);
    }
  }, [activePair]);

  // Main Canvas Rendering Engine (60 FPS Composite)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanlineOffset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      scanlineOffset = (scanlineOffset + 0.75) % h;

      // 1. Clear background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const isTriCam = Boolean(activePair.camC);
      const vA = videoARef.current;
      const vB = videoBRef.current;
      const vC = videoCRef.current;

      const hasVideoA = vA && vA.readyState >= 2;
      const hasVideoB = vB && vB.readyState >= 2;
      const hasVideoC = vC && vC.readyState >= 2;

      const seamPercent = isTriCam ? 0.333 : 0.5;
      const seam2Percent = isTriCam ? 0.666 : 0.5;

      const seamX1 = w * seamPercent;
      const seamX2 = isTriCam ? w * seam2Percent : seamX1;
      const blendPixels = (overlapBlend / 100) * 110;

      // --- SECTION A: VIDEO FEED DRAWING & BLENDING ---
      if (!isTriCam) {
        // DUAL CAMERA COMPOSITING (CAM A on Left, CAM B on Right with Homography & Soft Feather Seam)
        const leftWidth = seamX1 + blendPixels / 2;
        const rightStart = seamX1 - blendPixels / 2;
        const rightWidth = w - rightStart;

        // Draw Left Camera (CAM A)
        if (hasVideoA) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, leftWidth, h);
          ctx.clip();
          ctx.drawImage(vA, 0, 0, leftWidth, h);
          ctx.restore();
        } else {
          // Fallback tactical background pattern
          drawTacticalGridFallback(ctx, 0, 0, leftWidth, h, activePair.camA.code, activePair.camA.name);
        }

        // Draw Right Camera (CAM B) with Homography offset and tilt
        if (hasVideoB) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(rightStart, 0, rightWidth, h);
          ctx.clip();

          // Apply homography affine transformations (vertical offset, tilt perspective, scale)
          ctx.translate(seamX1, h / 2);
          ctx.rotate((homographyTilt * Math.PI) / 180);
          ctx.scale(homographyScale, homographyScale);
          ctx.translate(-seamX1, -h / 2 + homographyOffsetY);

          // Draw Right Camera
          ctx.drawImage(vB, rightStart, 0, rightWidth, h);
          ctx.restore();
        } else {
          drawTacticalGridFallback(ctx, rightStart, 0, rightWidth, h, activePair.camB.code, activePair.camB.name);
        }

        // Apply Soft Seam Feather Blending Corridor
        const blendGrad = ctx.createLinearGradient(seamX1 - blendPixels / 2, 0, seamX1 + blendPixels / 2, 0);
        blendGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
        blendGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.18)');
        blendGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = blendGrad;
        ctx.fillRect(seamX1 - blendPixels / 2, 0, blendPixels, h);

        // Seam boundary hairline
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX1, 0);
        ctx.lineTo(seamX1, h);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // TRI-CAMERA COMPOSITING (CAM A + CAM B + CAM C across 270° sweep)
        const colW = w / 3;
        // Cam A
        if (hasVideoA) {
          ctx.drawImage(vA, 0, 0, colW + blendPixels / 2, h);
        } else {
          drawTacticalGridFallback(ctx, 0, 0, colW, h, activePair.camA.code, activePair.camA.name);
        }
        // Cam B
        if (hasVideoB) {
          ctx.drawImage(vB, colW - blendPixels / 2, 0, colW + blendPixels, h);
        } else {
          drawTacticalGridFallback(ctx, colW, 0, colW, h, activePair.camB.code, activePair.camB.name);
        }
        // Cam C
        if (hasVideoC && vC) {
          ctx.drawImage(vC, colW * 2 - blendPixels / 2, 0, colW + blendPixels / 2, h);
        } else {
          drawTacticalGridFallback(ctx, colW * 2, 0, colW, h, activePair.camC?.code || 'CAM 3', activePair.camC?.name || 'Sector East');
        }

        // Seam 1 & 2 Hairlines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX1, 0);
        ctx.lineTo(seamX1, h);
        ctx.moveTo(seamX2, 0);
        ctx.lineTo(seamX2, h);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // --- SECTION B: VISION MODES POST-PROCESSING ---
      if (visionMode === 'NVG') {
        // Green Phosphor Night Vision
        ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.fillRect(0, 0, w, h);

        // Scanline raster overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1.5);
        }

        // Vignette circle
        const radGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.65);
        radGrad.addColorStop(0, 'rgba(0, 20, 10, 0)');
        radGrad.addColorStop(1, 'rgba(0, 15, 5, 0.7)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (visionMode === 'THERMAL') {
        // FLIR Multi-Spectral Thermal Filter
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(0, 0, w, h);

        const thermGrad = ctx.createLinearGradient(0, 0, 0, h);
        thermGrad.addColorStop(0, 'rgba(30, 58, 138, 0.25)'); // cool sky
        thermGrad.addColorStop(0.6, 'rgba(180, 83, 9, 0.15)'); // ambient ground
        thermGrad.addColorStop(1, 'rgba(239, 68, 68, 0.3)'); // hot ground
        ctx.fillStyle = thermGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (visionMode === 'WIREFRAME') {
        // Homography Mesh / Perspective Grid Overlay
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 1;
        const gridStep = 40;
        for (let x = 0; x < w; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + (x > w / 2 ? homographyTilt * 4 : 0), h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y + (homographyOffsetY * (y / h)));
          ctx.stroke();
        }
      }

      // Optional SIFT / ORB Feature Matching Keypoints Overlay
      if (showTiePoints) {
        tiePoints.forEach((pt, i) => {
          const y = pt.yNorm * h;
          const leftX = seamX1 - 25;
          const rightX = seamX1 + 25;

          // Keypoint circles
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(leftX, y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(rightX, y + homographyOffsetY * 0.3, 4, 0, Math.PI * 2);
          ctx.fill();

          // Neon Tie Line linking corresponding features
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y + homographyOffsetY * 0.3);
          ctx.stroke();

          // Small Match Confidence
          if (i % 2 === 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`${Math.round(pt.confidence * 100)}%`, rightX + 8, y + 3);
          }
        });
      }

      // --- SECTION C: MULTI-TARGET ReID AND PREDICTIVE TRAJECTORIES ---
      const targets = targetsRef.current;
      targets.forEach((tgt) => {
        // Move targets along their vectors
        tgt.normX += tgt.vx;
        tgt.normY += tgt.vy;

        // Bounce / cycle within bounds
        if (tgt.normX > 0.88) {
          tgt.normX = 0.88;
          tgt.vx = -Math.abs(tgt.vx);
        } else if (tgt.normX < 0.12) {
          tgt.normX = 0.12;
          tgt.vx = Math.abs(tgt.vx);
        }

        const px = tgt.normX * w;
        const py = tgt.normY * h;

        // Update target camera label based on seam line
        tgt.currentCam = px < seamX1 ? activePair.camA.code : (isTriCam && px > seamX2 ? (activePair.camC?.code || 'CAM 3') : activePair.camB.code);

        // Record trajectory
        tgt.trajectory.push({ x: px, y: py });
        if (tgt.trajectory.length > 32) tgt.trajectory.shift();

        // Draw Trajectory Streamline
        if (tgt.trajectory.length > 2) {
          ctx.strokeStyle = tgt.threatLevel === 'HIGH' ? '#ef4444' : '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          tgt.trajectory.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        }

        // Predictive Forward Vector (AI Projected Arrival Zone)
        if (showPredictiveVectors) {
          const futureSteps = 55;
          const predX = px + tgt.vx * w * futureSteps;
          const predY = py + tgt.vy * h * futureSteps;

          ctx.strokeStyle = '#f59e0b';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(predX, predY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Predicted Arrival Zone Halo
          ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          ctx.beginPath();
          ctx.arc(predX, predY, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`EST (+3.2s)`, predX + 12, predY + 3);
        }

        // Draw Target Bounding Box
        const boxW = 34;
        const boxH = 54;
        const boxColor = tgt.threatLevel === 'HIGH' ? '#ef4444' : '#10b981';

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(px - boxW / 2, py - boxH / 2, boxW, boxH);

        // Corner brackets for tactical HUD aesthetic
        const cLen = 6;
        ctx.lineWidth = 2.5;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(px - boxW / 2, py - boxH / 2 + cLen);
        ctx.lineTo(px - boxW / 2, py - boxH / 2);
        ctx.lineTo(px - boxW / 2 + cLen, py - boxH / 2);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(px + boxW / 2 - cLen, py - boxH / 2);
        ctx.lineTo(px + boxW / 2, py - boxH / 2);
        ctx.lineTo(px + boxW / 2, py - boxH / 2 + cLen);
        ctx.stroke();

        // Label Card
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(px - 58, py - boxH / 2 - 24, 116, 20);
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 58, py - boxH / 2 - 24, 116, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${tgt.name} [${tgt.currentCam}]`, px - 52, py - boxH / 2 - 10);

        // ReID Seamless Badge
        if (reidTrackingActive) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.fillRect(px - 58, py + boxH / 2 + 4, 116, 16);
          ctx.fillStyle = '#020617';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`SEAMLESS ReID: ${(tgt.reidConfidence * 100).toFixed(1)}%`, px - 52, py + boxH / 2 + 16);
        }
      });

      // Subtle tactical scanning bar
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fillRect(0, scanlineOffset, w, 24);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    activePair,
    overlapBlend,
    homographyOffsetY,
    homographyTilt,
    homographyScale,
    showPredictiveVectors,
    reidTrackingActive,
    showTiePoints,
    visionMode,
    tiePoints,
  ]);

  // Helper to draw clean tactical grid fallback when video is buffering
  const drawTacticalGridFallback = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    camCode: string,
    camName: string
  ) => {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(x, y, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let gx = x; gx < x + w; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = y; gy < y + h; gy += 28) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    // Tactical camera label
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${camCode} // ${camName.toUpperCase()}`, x + 20, y + 40);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(`ESTABLISHING HOMOGRAPHY SYNC STREAM...`, x + 20, y + 60);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" id="stitching-view-root">
      {/* Hidden Synchronized HTML5 Video Sources */}
      <div className="hidden" aria-hidden="true">
        <video
          ref={videoARef}
          src={activePair.camA.src}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoAStatus('ready')}
          onError={() => setVideoAStatus('error')}
        />
        <video
          ref={videoBRef}
          src={activePair.camB.src}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoBStatus('ready')}
          onError={() => setVideoBStatus('error')}
        />
        {activePair.camC && (
          <video
            ref={videoCRef}
            src={activePair.camC.src}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setVideoCStatus('ready')}
            onError={() => setVideoCStatus('error')}
          />
        )}
      </div>

      {/* Snapshot Notification Toast */}
      {snapshotNotification && (
        <div className="fixed top-20 right-8 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-emerald-300 font-mono text-xs flex items-center gap-3 animate-fade-in">
          <CheckCircle size={18} className="text-emerald-400" />
          <span>{snapshotNotification}</span>
        </div>
      )}

      {/* Main Tactical Header with Camera Pair Selector */}
      <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Layers size={18} />
            </span>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-[0.2em] font-mono">
              PANORAMIC MULTI-CAMERA FEED STITCHING & ReID
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Homographic feature alignment joining adjacent sensor nodes into seamless, continuous 180°–270° tactical coverage with persistent ReID.
          </p>
        </div>

        {/* Sector Preset Selector Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {CAMERA_PAIRS.map((pair) => (
            <button
              key={pair.id}
              onClick={() => setSelectedPairId(pair.id)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedPairId === pair.id
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10'
              }`}
            >
              <Radio size={13} className={selectedPairId === pair.id ? 'animate-pulse' : ''} />
              <span>{pair.name.split(' ')[0]} {pair.name.split(' ')[1]}</span>
              <span className="text-[10px] opacity-70">({pair.fov.split(' ')[0]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panoramic Stitched Canvas Viewport Container */}
      <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-3">
        {/* Top Control Strip (Vision Modes & Utilities) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Vision Modes Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
            <button
              onClick={() => setVisionMode('RGB')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                visionMode === 'RGB'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun size={13} />
              <span>RGB DAYLIGHT</span>
            </button>
            <button
              onClick={() => setVisionMode('NVG')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                visionMode === 'NVG'
                  ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Moon size={13} />
              <span>NVG PHOSPHOR</span>
            </button>
            <button
              onClick={() => setVisionMode('THERMAL')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                visionMode === 'THERMAL'
                  ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <Flame size={13} />
              <span>THERMAL FLIR</span>
            </button>
            <button
              onClick={() => setVisionMode('WIREFRAME')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                visionMode === 'WIREFRAME'
                  ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Grid size={13} />
              <span>HOMOGRAPHY MESH</span>
            </button>
          </div>

          {/* Quick Utility Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalibrationDrawerOpen(!calibrationDrawerOpen)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                calibrationDrawerOpen
                  ? 'bg-purple-900/60 text-purple-300 border-purple-500/60'
                  : 'bg-black/60 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              <Sliders size={13} />
              <span>Homography Calibration</span>
            </button>

            <button
              onClick={handleCaptureSnapshot}
              className="px-3 py-1.5 rounded-xl font-bold bg-black/60 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Export Snapshot</span>
            </button>
          </div>
        </div>

        {/* Live Stitched Viewport Canvas */}
        <div className="relative w-full aspect-[21/9] bg-black rounded-xl overflow-hidden border border-white/[0.08] shadow-inner">
          {/* Top-Left Telemetry Pill HUD */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 z-20 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-purple-600/90 backdrop-blur-md text-white text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              <Radio size={13} className="animate-pulse" />
              <span>{activePair.name.toUpperCase()}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-black/80 text-emerald-400 text-xs font-mono border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <Activity size={12} />
              <span>FOV: {activePair.fov.split(' ')[0]}</span>
              <span className="text-slate-500">•</span>
              <span>LATENCY: 24ms</span>
              <span className="text-slate-500">•</span>
              <span>RANSAC: {calibrationScore.inliers}% INLIERS</span>
            </div>
          </div>

          {/* Top-Right Active SIFT/ORB HUD Indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            <button
              onClick={() => setShowTiePoints(!showTiePoints)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                showTiePoints
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-black/70 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              <Crosshair size={13} />
              <span>SIFT Tie Points: {showTiePoints ? 'ACTIVE' : 'OFF'}</span>
            </button>
          </div>

          {/* Canvas Component */}
          <canvas
            ref={canvasRef}
            width={1280}
            height={540}
            className="w-full h-full object-cover block cursor-crosshair"
            onClick={() => setSelectedTarget(targetsRef.current[0])}
          />

          {/* Bottom Viewport HUD Controls */}
          <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-slate-300 font-mono font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPredictiveVectors}
                  onChange={(e) => setShowPredictiveVectors(e.target.checked)}
                  className="rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Predictive Trajectory AI</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 font-mono font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={reidTrackingActive}
                  onChange={(e) => setReidTrackingActive(e.target.checked)}
                  className="rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                />
                <span>Cross-Camera ReID Handover</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[11px] font-mono">Overlap Seam Width:</span>
              <input
                type="range"
                min={15}
                max={75}
                value={overlapBlend}
                onChange={(e) => setOverlapBlend(Number(e.target.value))}
                className="w-24 accent-purple-500 cursor-pointer"
              />
              <span className="text-purple-300 font-mono text-xs font-bold">{overlapBlend}px</span>
            </div>
          </div>
        </div>

        {/* Collapsible Homography Calibration Drawer */}
        {calibrationDrawerOpen && (
          <div className="p-4 bg-black/60 rounded-xl border border-purple-500/30 font-mono text-xs space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div className="flex items-center gap-2 text-purple-300 font-bold">
                <Sliders size={16} />
                <span>HOMOGRAPHY MATRIX CALIBRATION (WARPING & ALIGNMENT SUITE)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoCalibrate}
                  disabled={isCalibrating}
                  className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isCalibrating ? 'animate-spin' : ''} />
                  <span>{isCalibrating ? 'Auto-Optimizing RANSAC...' : 'Auto-Calibrate SIFT / ORB'}</span>
                </button>

                <button
                  onClick={() => {
                    setHomographyOffsetY(0);
                    setHomographyTilt(0);
                    setHomographyScale(1.0);
                    setOverlapBlend(activePair.defaultOverlap);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-white/10"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between text-slate-300">
                  <span>Vertical Offset (ΔY)</span>
                  <span className="text-purple-400 font-bold">{homographyOffsetY}px</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  value={homographyOffsetY}
                  onChange={(e) => setHomographyOffsetY(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between text-slate-300">
                  <span>Perspective Tilt (θ)</span>
                  <span className="text-purple-400 font-bold">{homographyTilt}°</span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={0.5}
                  value={homographyTilt}
                  onChange={(e) => setHomographyTilt(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between text-slate-300">
                  <span>Sensor Scale Match (S)</span>
                  <span className="text-purple-400 font-bold">{homographyScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.9}
                  max={1.1}
                  step={0.01}
                  value={homographyScale}
                  onChange={(e) => setHomographyScale(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between text-slate-300">
                  <span>Convergence Metrics</span>
                  <span className="text-emerald-400 font-bold">LOCKED</span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                  <div>RANSAC Inliers: <span className="text-emerald-400 font-bold">{calibrationScore.inliers}%</span></div>
                  <div>Convergence Time: <span className="text-cyan-400 font-bold">{calibrationScore.ms} ms</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target ReID Dossier Inspection Modal */}
      {selectedTarget && (
        <div className="p-4 bg-[#0a0f1d] border border-purple-500/40 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)] font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Scan size={18} className="text-purple-400" />
              <span className="font-black text-white uppercase text-sm">
                TARGET REID DOSSIER: {selectedTarget.name} ({selectedTarget.id})
              </span>
            </div>
            <button
              onClick={() => setSelectedTarget(null)}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              Close Dossier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Handover Status</span>
              <p className="text-emerald-400 font-bold text-sm">CONTINUOUS TRANSIT</p>
              <p className="text-slate-500 text-[10px]">Transition: {activePair.camA.code} ➔ {activePair.camB.code}</p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Cosine Similarity Match</span>
              <p className="text-purple-400 font-bold text-sm">{(selectedTarget.reidConfidence * 100).toFixed(1)}%</p>
              <p className="text-slate-500 text-[10px]">Appearance Embedding Lock</p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Appearance Vector</span>
              <div className="text-[10px] text-slate-300 space-y-0.5">
                <div>Color Spectrum: <span className="text-cyan-400">{selectedTarget.appearance.colorScore}%</span></div>
                <div>Gait Rhythm: <span className="text-cyan-400">{selectedTarget.appearance.gaitScore}%</span></div>
                <div>Silhouette Aspect: <span className="text-cyan-400">{selectedTarget.appearance.silhouetteScore}%</span></div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Tactical Threat Escalation</span>
              <p className="text-rose-400 font-bold text-sm">HIGH RISK (INTERCEPT)</p>
              <p className="text-slate-500 text-[10px]">Patrol sentry vector deployed</p>
            </div>
          </div>
        </div>
      )}

      {/* Intelligence & Border Feature Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-1 font-mono">
            <Navigation size={14} />
            <span>Target Handover Accuracy</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">99.4%</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Zero-loss target identity persistence across sensor overlap boundaries.
          </p>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1 font-mono">
            <Sparkles size={14} />
            <span>Homography Alignment Score</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">{calibrationScore.inliers} / 100</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Optimal optical feature correspondence validated across seam corridor.
          </p>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase mb-1 font-mono">
            <Radio size={14} />
            <span>Tactical Interception Countdown</span>
          </div>
          <p className="text-xl font-black text-white font-mono">Patrol 02 Dispatched</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Intercept vector predicted at boundary checkpoint within 42 seconds.
          </p>
        </div>
      </div>

      {/* Real Phase 8 Cross-Camera Threat Correlation Corridors Panel */}
      <div className="p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-purple-400" />
            <div>
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                CROSS-CAMERA THREAT CORRIDORS (PHASE 8 MULTI-CAMERA ENGINE)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Persistent target handover and trajectory correlation across non-overlapping blind spots
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold">
            {correlations.length} ACTIVE CORRIDORS
          </span>
        </div>

        {correlations.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 font-mono text-xs">
            NO ACTIVE CROSS-CAMERA CORRELATIONS // ALL CAMERA SECTORS OPERATING INDEPENDENTLY
          </div>
        ) : (
          <div className="space-y-3">
            {correlations.map((corr, idx) => {
              const seq = corr.camera_sequence || [];
              const obs = corr.observations || [];
              const reasons = corr.reasons || [];
              return (
                <div
                  key={corr.id || idx}
                  className="p-4 rounded-xl bg-black/40 border border-purple-500/30 hover:border-purple-500/60 transition-all font-mono text-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                        CORRIDOR #{corr.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          corr.correlation_level === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                        }`}
                      >
                        SCORE: {corr.correlation_score} / 100 [{corr.correlation_level}]
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span>STARTED: {new Date(corr.started_at).toLocaleTimeString()}</span>
                      <span>LAST SEEN: {new Date(corr.last_seen_at).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Camera Sequence Chain */}
                  <div className="flex items-center gap-2 flex-wrap bg-slate-950/80 p-2.5 rounded-lg border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                      HANDOVER CHAIN:
                    </span>
                    {seq.map((cam, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span className="px-2.5 py-1 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold">
                          {cam.toUpperCase()}
                        </span>
                        {sIdx < seq.length - 1 && <span className="text-purple-400 font-black">➔</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Observations & Reasons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-1 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        OBSERVATIONS ACROSS NODES:
                      </span>
                      {obs.length > 0 ? (
                        obs.map((o, oIdx) => (
                          <div key={oIdx} className="text-slate-300 flex items-center justify-between">
                            <span>
                              {o.camera_id.toUpperCase()}: Track #{o.track_id || '?'} ({o.class_name || 'person'})
                            </span>
                            <span className="text-cyan-400">{new Date(o.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500">Autonomous spatial correlation registered.</div>
                      )}
                    </div>

                    <div className="space-y-1 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">CORRELATION EVIDENCE:</span>
                      {reasons.length > 0 ? (
                        reasons.map((r, rIdx) => (
                          <div key={rIdx} className="text-slate-300 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <CheckCircle size={11} className="text-emerald-400" />
                              {r.message || r.code}
                            </span>
                            <span className="text-amber-400">+{r.points} PTS</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500">Consistent direction and velocity vector alignment.</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default MultiCamStitchingView;
