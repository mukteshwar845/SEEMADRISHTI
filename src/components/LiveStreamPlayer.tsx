import React, { useRef, useEffect, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  Scan,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Radio,
  Grid2X2,
  Maximize,
  Flame,
  Activity,
  TrendingUp,
  GitBranch,
  Play,
  Film,
  Disc,
} from 'lucide-react';
import { CameraFeed } from '../types';
import { initialCameras } from '../data/mockData';
import { CameraFeedCanvas } from './CameraFeedCanvas';
import { audioAlertEngine } from '../utils/audioAlert';
import { recordingEngine, ActiveRecording } from '../utils/recordingManager';

interface LiveStreamPlayerProps {
  currentCamera?: CameraFeed;
  cameras?: CameraFeed[];
  onCameraChange?: (camId: string) => void;
  onTriggerIntrusion?: () => void;
  onOpenStitchingView?: () => void;
  onNavigateToHistoricalLogs?: () => void;
  anomalySensitivity?: number;
  trajectoryDataset?: string;
  showTrajectoryVectors?: boolean;
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  currentCamera,
  cameras = initialCameras,
  onCameraChange,
  onTriggerIntrusion,
  onOpenStitchingView,
  onNavigateToHistoricalLogs,
  anomalySensitivity = 78,
  trajectoryDataset = 'TU Clausthal Pedestrian Trajectory Dataset (ETH/UCY Stream)',
  showTrajectoryVectors = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [layoutMode, setLayoutMode] = useState<'single' | '2x2'>('single');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMotionTrails, setShowMotionTrails] = useState(true);
  const [showTrajectoryOverlay, setShowTrajectoryOverlay] = useState(showTrajectoryVectors);
  const [isThermalVision, setIsThermalVision] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(audioAlertEngine.getIsMuted());
  const [isAudioPingActive, setIsAudioPingActive] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [liveTimestamp, setLiveTimestamp] = useState('10:45:22');
  const [lastAnomalyTriggered, setLastAnomalyTriggered] = useState<string | null>(null);
  const [activeRecordings, setActiveRecordings] = useState<Map<string, ActiveRecording>>(new Map());
  const [playerToast, setPlayerToast] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);

  // Subscribe to recording engine
  useEffect(() => {
    const unsub = recordingEngine.subscribe((active) => {
      setActiveRecordings(new Map(active));
    });
    return unsub;
  }, []);

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) => {
    setPlayerToast({ message, actionLabel, onAction });
    setTimeout(() => {
      setPlayerToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const handleToggleCurrentRecord = (targetCam?: CameraFeed) => {
    const cam = targetCam || currentCamera || cameras[0];
    if (!cam) return;
    const res = recordingEngine.toggleRecording(cam);
    if (res.isRecording) {
      showToast(`RECORDING STARTED: ${cam.code} (${cam.name})`, 'VIEW LOGS', onNavigateToHistoricalLogs);
    } else if (res.clip) {
      showToast(
        `RECORDING SAVED: ${res.clip.fileSizeMb}MB clip saved for ${cam.code}`,
        'VIEW IN HISTORICAL LOGS',
        onNavigateToHistoricalLogs
      );
    }
  };

  // Subscribe to audio alert engine events
  useEffect(() => {
    const unsub = audioAlertEngine.subscribe((isPlaying) => {
      setIsAudioPingActive(isPlaying);
    });
    return unsub;
  }, []);

  const handleToggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    audioAlertEngine.setMuted(next);
  };

  const handleTriggerBreach = () => {
    // Play Web Audio API low-frequency alert ping (confidence 97.8% > 90%)
    audioAlertEngine.playAlertPing({ confidence: 97.8 });
    if (onTriggerIntrusion) {
      onTriggerIntrusion();
    }
  };

  // Synchronize showTrajectoryVectors prop changes
  useEffect(() => {
    setShowTrajectoryOverlay(showTrajectoryVectors);
  }, [showTrajectoryVectors]);

  // Animation frame state for moving pedestrians and car
  const simState = useRef({
    person1: { x: 305, y: 275, vx: 0.25, vy: 0.1, score: 0.95, anomalyScore: 0.32 },
    person2: { x: 365, y: 285, vx: 0.22, vy: 0.1, score: 0.98, anomalyScore: 0.18 },
    car: { x: 575, y: 310, vx: -0.15, vy: 0.05, score: 0.92 },
    scanlineY: 0,
    intrusionFlash: 0,
    trailP1: [] as { x: number; y: number }[],
    trailP2: [] as { x: number; y: number }[],
    tick: 0,
  });

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      setLiveTimestamp(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update canvas animation loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load / render realistic surveillance scene
    const renderScene = () => {
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      const state = simState.current;

      // 1. CLEAR & DRAW BACKGROUND SCENERY (Security Checkpoint / Gate)
      ctx.fillStyle = '#1e2633';
      ctx.fillRect(0, 0, width, height);

      // Sky & Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
      skyGrad.addColorStop(0, '#5f758d');
      skyGrad.addColorStop(1, '#94a8bd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.35);

      // Distant Trees / Perimeter Foliage
      ctx.fillStyle = '#2d4531';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.35);
      for (let x = 0; x <= width; x += 30) {
        const hOffset = Math.sin(x * 0.03) * 12 + 10;
        ctx.lineTo(x, height * 0.35 - hOffset);
      }
      ctx.lineTo(width, height * 0.35);
      ctx.closePath();
      ctx.fill();

      // Parking Lot Ground (Grey Asphalt)
      const asphaltGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
      asphaltGrad.addColorStop(0, '#434d5b');
      asphaltGrad.addColorStop(0.5, '#303948');
      asphaltGrad.addColorStop(1, '#232b38');
      ctx.fillStyle = asphaltGrad;
      ctx.fillRect(0, height * 0.35, width, height * 0.65);

      // Distant Parked Cars (Row in background)
      const carColors = ['#f8fafc', '#94a3b8', '#334155', '#e2e8f0', '#0f172a', '#cbd5e1'];
      for (let i = 0; i < 7; i++) {
        const cx = width * 0.32 + i * 42;
        const cy = height * 0.35 + 10;
        ctx.fillStyle = carColors[i % carColors.length];
        ctx.fillRect(cx, cy, 32, 14);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx + 4, cy - 6, 22, 7);
        // wheels
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 14, 3, 0, Math.PI * 2);
        ctx.arc(cx + 26, cy + 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Security Fence on the left
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width * 0.3; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, height * 0.3);
        ctx.lineTo(x, height * 0.7);
        ctx.stroke();
      }
      // Fence rails
      ctx.beginPath();
      ctx.moveTo(0, height * 0.38);
      ctx.lineTo(width * 0.3, height * 0.45);
      ctx.moveTo(0, height * 0.55);
      ctx.lineTo(width * 0.3, height * 0.62);
      ctx.stroke();

      // Guard House Structure (Right side)
      const ghX = width * 0.58;
      const ghY = height * 0.32;
      const ghW = width * 0.34;
      const ghH = height * 0.42;

      // Guard house roof overhang
      ctx.fillStyle = '#64748b';
      ctx.fillRect(ghX - 10, ghY - 14, ghW + 20, 16);

      // Guard house walls (Brick / beige / dark brown)
      ctx.fillStyle = '#5a3d36';
      ctx.fillRect(ghX, ghY, ghW, ghH);

      // Windows (reflective glass)
      const winGrad = ctx.createLinearGradient(ghX + 15, ghY + 15, ghX + 65, ghY + 70);
      winGrad.addColorStop(0, '#38bdf8');
      winGrad.addColorStop(0.5, '#1e293b');
      winGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = winGrad;
      ctx.fillRect(ghX + 12, ghY + 18, ghW * 0.4, ghH * 0.5);
      ctx.fillRect(ghX + ghW * 0.52, ghY + 18, ghW * 0.4, ghH * 0.5);

      // Guard Barrier Arm (Orange / White stripes)
      const barX = ghX - 50;
      const barY = ghY + ghH * 0.65;
      // Barrier post
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(barX - 8, barY - 10, 16, 45);
      // Arm
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX - width * 0.22, barY - 8);
      ctx.stroke();

      // Arm red stripes
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX - width * 0.22, barY - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zebra Crossing Footpath (Diagonal stripes)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const zStartX = width * 0.22;
      const zStartY = height * 0.52;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        const ox = zStartX + i * 26;
        const oy = zStartY + i * 16;
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + 75, oy + 42);
        ctx.lineTo(ox + 55, oy + 48);
        ctx.lineTo(ox - 20, oy + 6);
        ctx.closePath();
        ctx.fill();
      }

      // Parking stalls white lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * 0.45, height * 0.7);
      ctx.lineTo(width * 0.42, height * 0.95);
      ctx.moveTo(width * 0.62, height * 0.72);
      ctx.lineTo(width * 0.6, height * 0.98);
      ctx.stroke();

      // 2. SIMULATE MOVEMENT & TRAJECTORY PREDICTION
      state.tick += 1;
      
      // Pedestrian 1 movement (walking across frame with dynamic trajectory velocities)
      state.person1.x += state.person1.vx;
      state.person1.y += state.person1.vy;
      
      // Boundary checks & periodic trajectory shifts
      if (state.person1.y > height * 0.78 || state.person1.x > width * 0.4) {
        state.person1.vx = -0.25;
        state.person1.vy = -0.1;
      } else if (state.person1.y < height * 0.52 || state.person1.x < width * 0.28) {
        state.person1.vx = 0.25;
        state.person1.vy = 0.1;
      }

      // Pedestrian 2 follows correlated path
      state.person2.x = state.person1.x + 65;
      state.person2.y = state.person1.y + 12;

      // Dynamic Anomaly Score Computation based on Pedestrian Trajectory Prediction
      // Calculated as instantaneous velocity deviation + angular variance
      const currentSpeed1 = Math.sqrt(state.person1.vx * state.person1.vx + state.person1.vy * state.person1.vy);
      const simulatedVariance1 = 0.25 + 0.35 * Math.sin(state.tick * 0.04) * Math.sin(state.tick * 0.04);
      state.person1.anomalyScore = Math.min(0.99, simulatedVariance1);

      // Compare anomaly score against threshold: Higher sensitivity (e.g. 85%) means lower tolerance
      // Effective threshold: normalized to [0..1]
      const anomalyThresholdNorm = (100 - anomalySensitivity) / 100;
      const isPerson1Anomalous = state.person1.anomalyScore >= anomalyThresholdNorm;

      // Car movement (subtle engine idle vibration & slow forward)
      state.car.x += state.car.vx * 0.3;
      if (state.car.x < width * 0.54) state.car.vx = 0.15;
      if (state.car.x > width * 0.64) state.car.vx = -0.15;

      // Record observed motion history (T_obs = 8 past frames)
      if (state.tick % 4 === 0) {
        if (state.trailP1.length > 20) state.trailP1.shift();
        state.trailP1.push({ x: state.person1.x + 22, y: state.person1.y + 70 });

        if (state.trailP2.length > 20) state.trailP2.shift();
        state.trailP2.push({ x: state.person2.x + 20, y: state.person2.y + 68 });
      }

      // 3. DRAW DANGER ZONE (Intrusion Zone Polygon)
      if (showZones) {
        const izX = width * 0.56;
        const izY = height * 0.34;
        const izW = width * 0.36;
        const izH = height * 0.36;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(izX, izY, izW, izH);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(izX, izY, izW, izH);

        // Intrusion Zone Red Tag Badge
        const tagW = 120;
        const tagH = 22;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(izX, izY, tagW, tagH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('INTRUSION ZONE', izX + 8, izY + 15);

        // Warning Triangle in Zone Center
        const cx = izX + izW * 0.45;
        const cy = izY + izH * 0.5;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 14);
        ctx.lineTo(cx + 12, cy + 10);
        ctx.lineTo(cx - 12, cy + 10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('!', cx - 2, cy + 8);
      }

      // 4. DRAW MOTION TRAILS & PEDESTRIAN TRAJECTORY PREDICTION (TU CLAUSTHAL DATASET MODEL)
      const p1FeetX = state.person1.x + 22;
      const p1FeetY = state.person1.y + 70;

      if (showMotionTrails && state.trailP1.length > 1) {
        ctx.strokeStyle = isPerson1Anomalous ? 'rgba(244, 63, 94, 0.7)' : 'rgba(16, 185, 129, 0.45)';
        ctx.lineWidth = isPerson1Anomalous ? 2.5 : 1.8;
        ctx.beginPath();
        for (let i = 0; i < state.trailP1.length; i++) {
          const pt = state.trailP1[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Draw Predicted Future Trajectory Waypoints (ETH/UCY Horizon: T_pred = 12 steps)
      if (showTrajectoryOverlay) {
        const waypoints = [
          { x: p1FeetX + state.person1.vx * 35, y: p1FeetY + state.person1.vy * 35, step: 'T+1 (1.2s)' },
          { x: p1FeetX + state.person1.vx * 70, y: p1FeetY + state.person1.vy * 70, step: 'T+2 (2.4s)' },
          { x: p1FeetX + state.person1.vx * 105, y: p1FeetY + state.person1.vy * 105, step: 'T+3 (3.6s)' },
          { x: p1FeetX + state.person1.vx * 140, y: p1FeetY + state.person1.vy * 140, step: 'T+4 (4.8s)' },
        ];

        // Future Trajectory Dashed Line
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isPerson1Anomalous ? '#f43f5e' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1FeetX, p1FeetY);
        waypoints.forEach((wp) => ctx.lineTo(wp.x, wp.y));
        ctx.stroke();
        ctx.setLineDash([]);

        // Uncertainty ellipse cone around final waypoint
        const lastWp = waypoints[waypoints.length - 1];
        ctx.fillStyle = isPerson1Anomalous ? 'rgba(244, 63, 94, 0.18)' : 'rgba(56, 189, 248, 0.14)';
        ctx.beginPath();
        ctx.ellipse(lastWp.x, lastWp.y, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Waypoint nodes
        waypoints.forEach((wp, idx) => {
          ctx.fillStyle = isPerson1Anomalous ? '#f43f5e' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, idx === 3 ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Direction Vector Tag
        ctx.fillStyle = isPerson1Anomalous ? '#f43f5e' : '#0284c7';
        ctx.fillRect(lastWp.x + 6, lastWp.y - 10, 85, 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`PRED: ${(currentSpeed1 * 4.2).toFixed(1)}m/s (ADE)`, lastWp.x + 9, lastWp.y + 1);
      }

      // 5. DRAW ACTUAL CHARACTERS / CARS
      // Pedestrian 1: Man in teal shirt & jeans
      const p1x = state.person1.x;
      const p1y = state.person1.y;
      // Head
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.arc(p1x + 22, p1y + 12, 7, 0, Math.PI * 2);
      ctx.fill();
      // Torso / Teal shirt
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(p1x + 14, p1y + 20, 16, 28);
      // Legs / Jeans
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(p1x + 14, p1y + 48, 7, 30);
      ctx.fillRect(p1x + 23, p1y + 48, 7, 30);

      // Pedestrian 2: Woman in dark jacket with backpack
      const p2x = state.person2.x;
      const p2y = state.person2.y;
      // Head
      ctx.fillStyle = '#e2b596';
      ctx.beginPath();
      ctx.arc(p2x + 20, p2y + 12, 6, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = '#334155';
      ctx.fillRect(p2x + 13, p2y + 18, 14, 26);
      // Backpack
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p2x + 8, p2y + 20, 6, 16);
      // Pants
      ctx.fillStyle = '#475569';
      ctx.fillRect(p2x + 13, p2y + 44, 6, 28);
      ctx.fillRect(p2x + 21, p2y + 44, 6, 28);

      // Car: Black Luxury Sedan
      const carX = state.car.x;
      const carY = state.car.y;
      const carW = 210;
      const carH = 95;

      // Car shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(carX + carW * 0.45, carY + carH * 0.85, carW * 0.48, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Car Body (Black metallic finish)
      const carGrad = ctx.createLinearGradient(carX, carY, carX + carW, carY + carH);
      carGrad.addColorStop(0, '#1e293b');
      carGrad.addColorStop(0.3, '#0f172a');
      carGrad.addColorStop(0.7, '#090d16');
      carGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = carGrad;
      ctx.beginPath();
      ctx.roundRect(carX, carY + 25, carW, carH - 35, 12);
      ctx.fill();

      // Car Cabin / Roof
      ctx.fillStyle = '#0a0e17';
      ctx.beginPath();
      ctx.moveTo(carX + 35, carY + 25);
      ctx.lineTo(carX + 65, carY);
      ctx.lineTo(carX + 160, carY);
      ctx.lineTo(carX + 195, carY + 25);
      ctx.closePath();
      ctx.fill();

      // Car Windows (Tinted)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(carX + 45, carY + 22);
      ctx.lineTo(carX + 70, carY + 4);
      ctx.lineTo(carX + 155, carY + 4);
      ctx.lineTo(carX + 185, carY + 22);
      ctx.closePath();
      ctx.fill();

      // Car Rear Lights (Red LED strip)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(carX + carW - 8, carY + 36, 6, 12);
      ctx.fillRect(carX + 4, carY + 36, 6, 12);

      // License Plate
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(carX + carW * 0.42, carY + carH * 0.52, 35, 10);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('TR-09-AX', carX + carW * 0.43, carY + carH * 0.6);

      // 6. AI BOUNDING BOXES & ANOMALY SENSITIVITY HIGHLIGHTS
      if (showAiBoxes) {
        // Helper to draw clean AI Bounding Box with corner notches
        const drawAiBBox = (
          x: number,
          y: number,
          w: number,
          h: number,
          color: string,
          label: string,
          score: number,
          extraTag?: string
        ) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.8;
          ctx.strokeRect(x, y, w, h);

          // Top label tag
          const text = extraTag ? `${label} ${score.toFixed(2)} | ${extraTag}` : `${label} ${score.toFixed(2)}`;
          ctx.font = 'bold 10px Inter, monospace, sans-serif';
          const textW = ctx.measureText(text).width;

          ctx.fillStyle = color;
          ctx.fillRect(x - 1, y - 18, textW + 12, 18);

          ctx.fillStyle = '#000000';
          ctx.fillText(text, x + 5, y - 5);

          // Corner bracket accents
          const cLen = 8;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(x, y + cLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cLen, y);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(x + w - cLen, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w, y + cLen);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(x, y + h - cLen);
          ctx.lineTo(x, y + h);
          ctx.lineTo(x + cLen, y + h);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(x + w - cLen, y + h);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x + w, y + h - cLen);
          ctx.stroke();
        };

        // Box 1: Person 1 with Anomaly Status based on Sensitivity Slider
        const p1BoxColor = isPerson1Anomalous ? '#f43f5e' : '#10b981';
        const p1AnomalyTag = isPerson1Anomalous
          ? `DEV: ${(state.person1.anomalyScore * 100).toFixed(0)}% [ANOMALY BREACH]`
          : `DEV: ${(state.person1.anomalyScore * 100).toFixed(0)}% (NOMINAL)`;

        drawAiBBox(p1x - 12, p1y - 8, 62, 92, p1BoxColor, 'PERSON', state.person1.score, p1AnomalyTag);

        // Box 2: Person 2
        drawAiBBox(p2x - 12, p2y - 8, 56, 88, '#10b981', 'PERSON', state.person2.score, 'NOMINAL');

        // Yellow Box: VEHICLE 0.92
        drawAiBBox(carX - 5, carY - 6, carW + 10, carH + 10, '#f59e0b', 'VEHICLE', state.car.score);
      }

      // 7. AI SCANLINE EFFECT
      state.scanlineY = (state.scanlineY + 1.2) % height;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, state.scanlineY);
      ctx.lineTo(width, state.scanlineY);
      ctx.stroke();

      // Loop frame
      animId = requestAnimationFrame(renderScene);
    };

    animId = requestAnimationFrame(renderScene);
    return () => cancelAnimationFrame(animId);
  }, [showAiBoxes, showZones, showHeatmap, showMotionTrails, showTrajectoryOverlay, anomalySensitivity]);

  // Handle Snapshot Capture
  const handleCaptureSnapshot = () => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 200);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `SEEMADRISHTI_CAM1_SNAPSHOT_${Date.now()}.png`;
    a.click();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      id="live-rtsp-player-card"
      className="hud-corner-brackets flex flex-col bg-[#010307] rounded-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.95)]"
    >
      {/* Toast popup */}
      {playerToast && (
        <div className="absolute top-14 right-4 z-50 bg-[#070e1c]/95 border-2 border-cyan-400 text-white px-4 py-2.5 rounded-xl shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center gap-3 font-mono text-xs font-bold animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
          <Film size={16} className="text-cyan-400 animate-pulse" />
          <span>{playerToast.message}</span>
          {playerToast.actionLabel && playerToast.onAction && (
            <button
              onClick={playerToast.onAction}
              className="ml-2 px-2 py-0.5 rounded bg-cyan-500 text-black hover:bg-cyan-400 transition-colors font-black cursor-pointer"
            >
              {playerToast.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Top Card Header */}
      <div className="px-3.5 py-2.5 border-b border-cyan-500/20 flex flex-wrap justify-between items-center bg-[#030713]/90 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-cyan-300 uppercase tracking-[0.2em] font-mono drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]">
            // RTSP STREAM // {layoutMode === '2x2' ? 'QUAD MATRIX [2x2]' : currentCamera?.code || 'CAM-01'}
          </span>
          <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono border-l border-cyan-500/20 pl-3">
            {layoutMode === '2x2' ? '4 Synchronized 4K Feeds' : currentCamera?.name || 'Main Checkpoint Gate'}
          </span>
        </div>

        {/* Right Status & Layout Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Thermal Vision Toggle Button in Header */}
          <button
            id="header-thermal-toggle-btn"
            onClick={() => setIsThermalVision(!isThermalVision)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              isThermalVision
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] ring-1 ring-amber-500/40'
                : 'bg-black/60 text-slate-400 border-cyan-500/20 hover:text-cyan-200 hover:bg-cyan-950/40'
            }`}
            title="Toggle Thermal Camera Vision Mode (FLIR IR Filter)"
          >
            <Flame size={12} className={isThermalVision ? 'text-amber-400 animate-pulse' : 'text-slate-400'} />
            <span>{isThermalVision ? 'THERMAL IR: ON' : 'THERMAL IR'}</span>
          </button>

          {/* Quick Layout Mode Buttons */}
          <div className="flex items-center bg-black/80 border border-cyan-500/30 rounded-lg p-0.5">
            <button
              onClick={() => setLayoutMode('single')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                layoutMode === 'single'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Single Focused Stream"
            >
              <Maximize size={11} />
              <span>SINGLE</span>
            </button>
            <button
              onClick={() => setLayoutMode('2x2')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                layoutMode === '2x2'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="2x2 Quad Grid"
            >
              <Grid2X2 size={11} />
              <span>2x2 QUAD</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-md">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Video Viewport & Canvas (Single or 2x2 Grid) */}
      {layoutMode === 'single' ? (
        <div className="relative w-full aspect-[16/9] bg-black overflow-hidden flex items-center justify-center group">
          {/* Flash Effect on Snapshot */}
          {snapshotFlash && (
            <div className="absolute inset-0 bg-white z-50 transition-opacity duration-200 pointer-events-none" />
          )}

          {/* Real-time HTML5 AI Canvas with Thermal Filter Effect */}
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full object-cover block transition-all duration-300"
            style={{
              filter: isThermalVision
                ? 'grayscale(35%) sepia(100%) invert(85%) hue-rotate(190deg) saturate(380%) contrast(175%)'
                : 'none',
            }}
            id="rtsp-ai-canvas"
          />

          {/* Tactical HUD Corner Crosshairs */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none z-10" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none z-10" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none z-10" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none z-10" />

          {/* Top Left Live Badge & Timestamp HUD */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-20 pointer-events-none">
            {/* Red LIVE & Session REC Badge */}
            {activeRecordings.has(currentCamera?.id || 'cam-1') ? (
              <div className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-mono font-black rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.8)] border border-rose-300 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                <span>REC ACTIVE [{String(Math.floor(recordingEngine.getRecordingDuration(currentCamera?.id || 'cam-1') / 60)).padStart(2, '0')}:{String(recordingEngine.getRecordingDuration(currentCamera?.id || 'cam-1') % 60).padStart(2, '0')}]</span>
              </div>
            ) : (
              <div className="px-2.5 py-1 bg-cyan-950/90 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                <span>LIVE FEED</span>
              </div>
            )}

            {/* Amber Monospace Time Badge */}
            <div className="px-2.5 py-1 bg-black/70 text-amber-400 text-[10px] font-mono font-bold border border-amber-500/30 rounded-lg backdrop-blur-md shadow-sm">
              {liveTimestamp}
            </div>

            {/* Thermal Vision Badge */}
            {isThermalVision && (
              <div className="px-2.5 py-1 bg-amber-950/85 text-amber-300 text-[10px] font-mono font-black border border-amber-500/60 rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.5)] backdrop-blur-md animate-pulse">
                <Flame size={12} className="text-amber-400" />
                <span>FLIR THERMAL IR (8-14µm)</span>
              </div>
            )}

            {/* Anomaly Movement Sensitivity & Trajectory Dataset HUD Badge */}
            <div className="px-2.5 py-1 bg-cyan-950/85 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/40 rounded-lg flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md">
              <Activity size={12} className="text-cyan-400" />
              <span>SENSITIVITY: {anomalySensitivity}%</span>
              <span className="text-slate-400">|</span>
              <span className="text-[9px] text-emerald-400">ETH/UCY TRAJECTORY</span>
            </div>

            {/* Audio Alert Engine Ping Indicator Badge */}
            <div
              className={`px-2.5 py-1 text-[10px] font-mono font-black rounded-lg flex items-center gap-1.5 backdrop-blur-md transition-all border ${
                isAudioPingActive
                  ? 'bg-rose-600/95 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-bounce'
                  : isAudioMuted
                  ? 'bg-black/70 text-slate-500 border-slate-700'
                  : 'bg-black/70 text-cyan-400 border-cyan-500/30'
              }`}
            >
              {isAudioMuted ? <VolumeX size={12} /> : <Volume2 size={12} className={isAudioPingActive ? 'animate-ping' : ''} />}
              <span>
                {isAudioPingActive
                  ? 'ALERT PING (195Hz-80Hz) PLAYING!'
                  : isAudioMuted
                  ? 'AUDIO MUTED'
                  : 'WEB AUDIO: >90% INTRUSION ARMED'}
              </span>
            </div>
          </div>

          {/* Thermal Vision Heat Scale Legend on Right Edge */}
          {isThermalVision && (
            <div className="absolute right-3.5 top-16 bottom-16 w-4 bg-black/85 border border-white/20 rounded-lg p-0.5 flex flex-col items-center justify-between z-20 pointer-events-none backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.8)]">
              <span className="text-[8px] font-mono font-bold text-amber-300">38°</span>
              <div className="w-full flex-1 my-1 rounded-[3px] bg-gradient-to-b from-white via-amber-400 via-rose-500 via-purple-600 to-blue-900 shadow-inner" />
              <span className="text-[8px] font-mono font-bold text-cyan-300">14°</span>
            </div>
          )}

          {/* Top Right Quick Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
            {/* Trajectory Prediction Toggle */}
            <button
              id="viewport-trajectory-toggle-btn"
              onClick={() => setShowTrajectoryOverlay(!showTrajectoryOverlay)}
              title={showTrajectoryOverlay ? "Disable Pedestrian Trajectory Prediction Vectors" : "Enable Pedestrian Trajectory Prediction Vectors (ETH/UCY Dataset)"}
              className={`p-1.5 rounded-xl backdrop-blur-md text-xs font-medium transition-all cursor-pointer ${
                showTrajectoryOverlay
                  ? 'bg-cyan-600 text-white border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] ring-1 ring-cyan-400/60'
                  : 'bg-black/70 text-slate-400 border border-white/10 hover:bg-black/90 hover:text-white'
              }`}
            >
              <TrendingUp size={15} className={showTrajectoryOverlay ? 'text-cyan-100' : ''} />
            </button>

            {/* Thermal Camera Toggle Button */}
            <button
              id="viewport-thermal-toggle-btn"
              onClick={() => setIsThermalVision(!isThermalVision)}
              title={isThermalVision ? "Disable Thermal Camera Vision" : "Enable Thermal Camera Vision (Grayscale/Sepia/Invert mix)"}
              className={`p-1.5 rounded-xl backdrop-blur-md text-xs font-medium transition-all cursor-pointer ${
                isThermalVision
                  ? 'bg-amber-600 text-white border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] ring-1 ring-amber-400/60'
                  : 'bg-black/70 text-slate-400 border border-white/10 hover:bg-black/90 hover:text-white'
              }`}
            >
              <Flame size={15} className={isThermalVision ? 'animate-pulse text-amber-200' : ''} />
            </button>

            <button
              onClick={() => setShowAiBoxes(!showAiBoxes)}
              title="Toggle AI Bounding Boxes"
              className={`p-1.5 rounded-xl backdrop-blur-md text-xs font-medium transition-all cursor-pointer ${
                showAiBoxes
                  ? 'bg-blue-600/90 text-white border border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'bg-black/70 text-slate-400 border border-white/10 hover:bg-black/90'
              }`}
            >
              <Scan size={15} />
            </button>

            <button
              onClick={() => setShowZones(!showZones)}
              title="Toggle Intrusion Danger Zones"
              className={`p-1.5 rounded-xl backdrop-blur-md text-xs font-medium transition-all cursor-pointer ${
                showZones
                  ? 'bg-rose-600/90 text-white border border-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  : 'bg-black/70 text-slate-400 border border-white/10 hover:bg-black/90'
              }`}
            >
              <Shield size={15} />
            </button>

            <button
              onClick={() => setShowMotionTrails(!showMotionTrails)}
              title="Toggle Anomaly Motion Trails"
              className={`p-1.5 rounded-xl backdrop-blur-md text-xs font-medium transition-all cursor-pointer ${
                showMotionTrails
                  ? 'bg-emerald-600/90 text-white border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-black/70 text-slate-400 border border-white/10 hover:bg-black/90'
              }`}
            >
              <Sparkles size={15} />
            </button>
          </div>

          {/* Bottom Control Bar on Hover */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAudio}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-slate-200 border border-white/10 text-xs transition-colors cursor-pointer"
                title={isAudioMuted ? 'Unmute Audio Feed / Alert Sounds' : 'Mute Audio Feed'}
              >
                {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Thermal Mode Quick Toggle in Bottom Bar */}
              <button
                onClick={() => setIsThermalVision(!isThermalVision)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isThermalVision
                    ? 'bg-amber-600 text-white border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-black/70 text-slate-300 border-white/10 hover:bg-black/90'
                }`}
                title="Toggle Thermal Camera Vision Mode"
              >
                <Flame size={12} className={isThermalVision ? 'text-amber-200 animate-pulse' : 'text-slate-400'} />
                <span>{isThermalVision ? 'THERMAL IR' : 'OPTICAL RGB'}</span>
              </button>

              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                FPS: 30.0 | 4K H.265 | 8.4 Mbps
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Individual RTSP Camera Session Recording Toggle */}
              {(() => {
                const currentCamId = currentCamera?.id || 'cam-1';
                const isRec = activeRecordings.has(currentCamId);
                const dur = isRec ? recordingEngine.getRecordingDuration(currentCamId) : 0;
                const formattedDur = `${String(Math.floor(dur / 60)).padStart(2, '0')}:${String(dur % 60).padStart(2, '0')}`;
                return (
                  <button
                    id="live-player-rec-toggle-btn"
                    onClick={() => handleToggleCurrentRecord(currentCamera)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-black tracking-wider transition-all cursor-pointer border ${
                      isRec
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                        : 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border-rose-500/50 hover:border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    }`}
                    title={isRec ? 'Stop recording & save clip to Historical Logs' : 'Start local RTSP session recording'}
                  >
                    <Disc size={13} className={isRec ? 'animate-spin text-white' : 'text-rose-400'} />
                    <span>{isRec ? `STOP REC [${formattedDur}]` : 'START REC'}</span>
                  </button>
                );
              })()}

              {/* Trigger Test Intrusion Alert with Web Audio API Ping */}
              <button
                onClick={handleTriggerBreach}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold tracking-wider border border-rose-400/40 shadow-[0_0_10px_rgba(244,63,94,0.3)] cursor-pointer transition-all active:scale-95"
                title="Simulate perimeter intrusion and play Web Audio API alert ping (>90% confidence)"
              >
                <AlertTriangle size={13} />
                <span>SIMULATE BREACH</span>
              </button>

              {/* Snapshot */}
              <button
                onClick={handleCaptureSnapshot}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-slate-200 border border-white/10 text-xs transition-colors cursor-pointer"
                title="Capture High-Res Snapshot"
              >
                <Camera size={15} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-slate-200 border border-white/10 text-xs transition-colors cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2x2 Grid View inside central player */
        <div className="p-2.5 bg-[#060911] grid grid-cols-2 gap-2.5">
          {cameras.map((cam) => {
            const isSelected = (currentCamera?.id || 'cam-1') === cam.id;
            return (
              <div
                key={cam.id}
                onClick={() => onCameraChange && onCameraChange(cam.id)}
                className={`relative aspect-[16/9] bg-black rounded-xl overflow-hidden border transition-all cursor-pointer group ${
                  isSelected ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50' : 'border-white/[0.08] hover:border-white/30'
                }`}
                style={{
                  filter: isThermalVision
                    ? 'grayscale(35%) sepia(100%) invert(85%) hue-rotate(190deg) saturate(380%) contrast(175%)'
                    : 'none',
                }}
              >
                <CameraFeedCanvas
                  camera={cam}
                  showAiBoxes={showAiBoxes}
                  showZones={showZones}
                />

                {/* Top HUD */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
                  <span className="px-2 py-0.5 bg-blue-600 text-white font-mono text-[9px] font-bold rounded">
                    {cam.code}
                  </span>
                  {activeRecordings.has(cam.id) ? (
                    <span className="px-2 py-0.5 bg-rose-600 text-white font-mono text-[9px] font-black rounded border border-rose-400 animate-pulse flex items-center gap-1">
                      <Disc size={9} className="animate-spin" />
                      <span>REC [{String(Math.floor(recordingEngine.getRecordingDuration(cam.id) / 60)).padStart(2, '0')}:{String(recordingEngine.getRecordingDuration(cam.id) % 60).padStart(2, '0')}]</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-black/80 text-emerald-400 font-mono text-[9px] font-bold rounded border border-emerald-500/40">
                      ● LIVE
                    </span>
                  )}
                </div>

                {/* Hover overlay with quick actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCameraChange) onCameraChange(cam.id);
                      setLayoutMode('single');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.5)] cursor-pointer"
                  >
                    <Maximize size={12} />
                    <span>FOCUS STREAM</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCurrentRecord(cam);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                      activeRecordings.has(cam.id)
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                        : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-500/50'
                    }`}
                  >
                    <Disc size={12} className={activeRecordings.has(cam.id) ? 'animate-spin text-white' : 'text-rose-400'} />
                    <span>{activeRecordings.has(cam.id) ? 'STOP REC' : 'REC FEED'}</span>
                  </button>
                </div>

                {/* Bottom title bar */}
                <div className="absolute bottom-0 inset-x-0 px-2.5 py-1 bg-black/90 flex items-center justify-between text-[9px] font-mono text-slate-300 border-t border-white/[0.06]">
                  <span className="truncate">{cam.name}</span>
                  <span className="text-emerald-400 font-bold">{cam.bitrate}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Camera Selector Bar */}
      <div className="px-4 py-2.5 bg-[#0a0f1d] border-t border-white/[0.06] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {['cam-1', 'cam-2', 'cam-3', 'cam-4'].map((cid, idx) => {
            const isSelected = (currentCamera?.id || 'cam-1') === cid;
            const names = ['CAM 1 Gate', 'CAM 2 Perimeter', 'CAM 3 Armory', 'CAM 4 Corridor'];
            return (
              <button
                key={cid}
                onClick={() => onCameraChange && onCameraChange(cid)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] border border-blue-400/40'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                <span>{names[idx]}</span>
              </button>
            );
          })}
        </div>

        {onOpenStitchingView && (
          <button
            onClick={onOpenStitchingView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-mono text-xs font-bold transition-all cursor-pointer shrink-0 ml-2"
          >
            <Layers size={13} />
            <span className="hidden sm:inline">PANORAMIC STITCH</span>
          </button>
        )}
      </div>
    </div>
  );
};
