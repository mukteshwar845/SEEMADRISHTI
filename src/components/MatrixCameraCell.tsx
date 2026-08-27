import React, { useRef, useEffect, useState } from 'react';
import { MatrixCameraFeed } from '../types';
import {
  Edit3,
  Check,
  X,
  Maximize2,
  Minimize2,
  Video,
  Eye,
  Disc,
  Volume2,
  VolumeX,
  Sparkles,
  Camera,
  Layers,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Bookmark,
  Clock,
  Move,
  EyeOff,
  Shield,
  Battery, 
  BatteryFull, 
  BatteryMedium, 
  BatteryLow, 
  BatteryWarning,
} from 'lucide-react';
import { recordingEngine } from '../utils/recordingManager';
import { webSocketService, RealYoloDetection, TrackItem } from '../services/websocketService';
import { fetchZones } from '../services/api';

interface MatrixCameraCellProps {
  camera: MatrixCameraFeed;
  isSpotlight?: boolean;
  isCompact?: boolean;
  liveTimestamp: string;
  onUpdateCameraName: (id: number, newName: string) => void;
  onUpdateCameraSource?: (id: number, newSrc: string, customName?: string) => void;
  onSelectSpotlight?: (cam: MatrixCameraFeed) => void;
  onTriggerAlert?: (cam: MatrixCameraFeed) => void;
  heatmapIntensity?: number;
}

export const MatrixCameraCell: React.FC<MatrixCameraCellProps> = ({
  camera,
  isSpotlight = false,
  isCompact = false,
  liveTimestamp,
  onUpdateCameraName,
  onSelectSpotlight,
  onTriggerAlert,
  heatmapIntensity,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Edit label state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(camera.name);

  // Video & View Controls
  const [nightVision, setNightVision] = useState(camera.id === 1 || camera.id === 7);
  const [thermalMode, setThermalMode] = useState(camera.id === 9);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAiHud, setShowAiHud] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);

  // Playback Mode (LIVE vs RECORDED FOOTAGE)
  const [playbackMode, setPlaybackMode] = useState<'LIVE' | 'RECORDED'>('LIVE');
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(true);
  const [playbackTimeOffset, setPlaybackTimeOffset] = useState(42); // Seconds into archive
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Real YOLO detection stream state from WebSocket
  const realDetectionsRef = useRef<{
    timestamp: number;
    detections: RealYoloDetection[];
    frameWidth: number;
    frameHeight: number;
  } | null>(null);

  // Real ByteTrack tracking stream state from WebSocket
  const realTracksRef = useRef<{
    timestamp: number;
    tracks: TrackItem[];
    frameWidth: number;
    frameHeight: number;
  } | null>(null);

  useEffect(() => {
    const unsubDet = webSocketService.onDetection((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        realDetectionsRef.current = {
          timestamp: Date.now(),
          detections: payload.detections || [],
          frameWidth: payload.frame_width || 1920,
          frameHeight: payload.frame_height || 1080,
        };
      }
    });

    const unsubTrack = webSocketService.onTracking((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        realTracksRef.current = {
          timestamp: Date.now(),
          tracks: payload.tracks || [],
          frameWidth: payload.frame_width || 1920,
          frameHeight: payload.frame_height || 1080,
        };
      }
    });

    return () => {
      unsubDet();
      unsubTrack();
    };
  }, [camera.id, camera.tag]);

  // Active virtual zones and intrusion state for this camera
  const [activeZones, setActiveZones] = useState<Array<{ id: string; name: string; polygon: [number, number][] }>>([]);
  const activeIntrusionRef = useRef<{ timestamp: number; zoneName?: string } | null>(null);

  useEffect(() => {
    const myId = String(camera.id);
    const myTag = camera.tag?.toLowerCase() || `cam-0${camera.id}`;

    fetchZones(myId)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setActiveZones(res.data.map((z) => ({ id: z.id, name: z.name, polygon: z.polygon })));
        } else {
          fetchZones(myTag)
            .then((res2) => {
              if (res2.success && res2.data && res2.data.length > 0) {
                setActiveZones(res2.data.map((z) => ({ id: z.id, name: z.name, polygon: z.polygon })));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    const unsubAlert = webSocketService.onAlert((alert) => {
      const alertCam = (alert.camera || (alert as any).sector || '').toLowerCase();
      if (alertCam.includes(myId) || alertCam.includes(myTag)) {
        activeIntrusionRef.current = {
          timestamp: Date.now(),
          zoneName: alert.type || 'RESTRICTED PERIMETER',
        };
      }
    });

    return unsubAlert;
  }, [camera.id, camera.tag]);

  // Keep editedName in sync when camera updates from props
  useEffect(() => {
    setEditedName(camera.name);
  }, [camera.name]);

  // Subscribe to recording state
  useEffect(() => {
    const unsub = recordingEngine.subscribe((active) => {
      setIsRecording(active.has(String(camera.id)));
    });
    return unsub;
  }, [camera.id]);

  // Playback timeline timer
  useEffect(() => {
    if (playbackMode !== 'RECORDED' || !isPlayingRecorded) return;
    const interval = setInterval(() => {
      setPlaybackTimeOffset((prev) => (prev + playbackSpeed * 0.2) % 60);
    }, 200);
    return () => clearInterval(interval);
  }, [playbackMode, isPlayingRecorded, playbackSpeed]);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editedName.trim()) {
      onUpdateCameraName(camera.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(camera.name);
    setIsEditingName(false);
  };

  const handleToggleRecord = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordingEngine.toggleRecording({
      id: String(camera.id),
      code: camera.tag,
      name: camera.name,
      rtspUrl: camera.src,
      location: camera.location || camera.name,
      status: 'online',
      resolution: camera.resolution || '4K UHD',
      fps: camera.fps || 60,
      bitrate: camera.bitrate || '8.2 Mbps',
      aiModels: camera.aiModels || ['YOLOv11-Border'],
      activeDetections: camera.activeDetections || 2,
      dangerZones: [],
    });
  };

  const handleCaptureSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `SEEMADRISHTI_${camera.tag}_${playbackMode}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // 60 FPS Photorealistic CCTV Background and AI Overlays Canvas Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      frame++;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Effective time calculation for animations
      const effectiveFrame = playbackMode === 'RECORDED' 
        ? Math.floor(playbackTimeOffset * 30) 
        : frame;
      const time = effectiveFrame * 0.03;

      // PTZ Auto Rotate Simulation
      let panX = 0;
      if (isAutoRotate) {
        panX = Math.sin(time * 0.2) * 5; // slow pan +/- 5%
      }
      const currentZoom = isAutoRotate ? Math.max(zoomLevel, 1.1) : zoomLevel;

      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${currentZoom}) translateX(${panX}%)`;
      }
      if (canvasRef.current) {
        canvasRef.current.style.transform = `scale(${currentZoom}) translateX(${panX}%)`;
      }

      // -------------------------------------------------------------
      // DRAW HIGH FIDELITY CCTV FOOTAGE BACKGROUND (Always crisp 60FPS)
      // -------------------------------------------------------------
      ctx.save();

      if (camera.id === 1) {
        // =========================================================
        // SCENE 1: Overhead Night Urban Corridor (Keep Clear / 20 MPH)
        // =========================================================
        // 1. Dark Asphalt Roadbed
        ctx.fillStyle = '#11151c';
        ctx.fillRect(0, 0, width, height);

        // Road Pavement & Sidewalk Kerbs
        ctx.fillStyle = '#1e2430';
        ctx.fillRect(0, 0, width * 0.15, height); // Left sidewalk
        ctx.fillRect(width * 0.85, 0, width * 0.15, height); // Right sidewalk

        // Double red kerb lines
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.16, 0);
        ctx.lineTo(width * 0.16, height);
        ctx.moveTo(width * 0.175, 0);
        ctx.lineTo(width * 0.175, height);
        ctx.moveTo(width * 0.84, 0);
        ctx.lineTo(width * 0.84, height);
        ctx.moveTo(width * 0.825, 0);
        ctx.lineTo(width * 0.825, height);
        ctx.stroke();

        // White Dashed Center Lane Dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(width * 0.42, 0);
        ctx.lineTo(width * 0.42, height);
        ctx.moveTo(width * 0.58, 0);
        ctx.lineTo(width * 0.58, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // "KEEP CLEAR" Road Stencils
        ctx.save();
        ctx.font = '900 13px sans-serif';
        ctx.fillStyle = 'rgba(230, 235, 245, 0.75)';
        ctx.textAlign = 'center';
        ctx.fillText('KEEP', width * 0.38, height * 0.28);
        ctx.fillText('CLEAR', width * 0.38, height * 0.35);
        ctx.fillText('KEEP', width * 0.52, height * 0.28);
        ctx.fillText('CLEAR', width * 0.52, height * 0.35);

        // Circular "20" Speed Limit Stencils
        ctx.strokeStyle = 'rgba(240, 245, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(width * 0.38, height * 0.14, 18, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText('20', width * 0.38, height * 0.16);

        ctx.beginPath();
        ctx.ellipse(width * 0.52, height * 0.14, 18, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText('20', width * 0.52, height * 0.16);
        ctx.restore();

        // Traffic Light Signal at Top Left
        const trafficPhase = Math.floor(time * 0.5) % 3; // 0=Red, 1=Amber, 2=Green
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(width * 0.19, height * 0.22, 10, 22);
        // Red
        ctx.fillStyle = trafficPhase === 0 ? '#ef4444' : '#450a0a';
        ctx.beginPath();
        ctx.arc(width * 0.19 + 5, height * 0.22 + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        // Green
        ctx.fillStyle = trafficPhase === 2 ? '#22c55e' : '#052e16';
        ctx.beginPath();
        ctx.arc(width * 0.19 + 5, height * 0.22 + 18, 3, 0, Math.PI * 2);
        ctx.fill();

        // Moving Vehicles in Lane with Glowing Headlights & Taillights
        // Vehicle 1: Dark Mercedes Sedan moving top to bottom
        const car1Y = ((effectiveFrame * 2.2) % (height + 120)) - 60;
        const car1X = width * 0.48;

        // Headlight Beams illuminating road
        const headGrad = ctx.createLinearGradient(car1X, car1Y + 30, car1X, car1Y + 110);
        headGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        headGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.moveTo(car1X - 8, car1Y + 30);
        ctx.lineTo(car1X - 24, car1Y + 110);
        ctx.lineTo(car1X + 24, car1Y + 110);
        ctx.lineTo(car1X + 8, car1Y + 30);
        ctx.fill();

        // Vehicle Chassis
        ctx.fillStyle = '#0a0d14';
        ctx.beginPath();
        ctx.roundRect(car1X - 14, car1Y, 28, 52, 6);
        ctx.fill();
        // Windshield
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(car1X - 10, car1Y + 12, 20, 10);
        ctx.fillRect(car1X - 10, car1Y + 32, 20, 8);
        // Taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(car1X - 12, car1Y + 2, 5, 2);
        ctx.fillRect(car1X + 7, car1Y + 2, 5, 2);

        // Vehicle 2: Silver Hatchback in Left Lane
        const car2Y = (((effectiveFrame + 90) * 1.8) % (height + 140)) - 60;
        const car2X = width * 0.35;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(car2X - 13, car2Y, 26, 44, 5);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(car2X - 9, car2Y + 10, 18, 8);
        ctx.fillRect(car2X - 9, car2Y + 26, 18, 7);

      } else if (camera.id === 2) {
        // =========================================================
        // SCENE 2: B&W Aerial Drone Box Junction (Greyscale)
        // =========================================================
        ctx.fillStyle = '#262930';
        ctx.fillRect(0, 0, width, height);

        // Road Surface Cross
        ctx.fillStyle = '#3a3e47';
        ctx.fillRect(width * 0.2, 0, width * 0.6, height);
        ctx.fillRect(0, height * 0.25, width, height * 0.5);

        // Yellow Box Junction Diagonal Crosshatching
        ctx.save();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        const boxX = width * 0.32;
        const boxY = height * 0.32;
        const boxW = width * 0.36;
        const boxH = height * 0.36;

        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.beginPath();
        for (let x = -boxH; x < boxW + boxH; x += 14) {
          ctx.moveTo(boxX + x, boxY);
          ctx.lineTo(boxX + x + boxH, boxY + boxH);
          ctx.moveTo(boxX + x, boxY + boxH);
          ctx.lineTo(boxX + x + boxH, boxY);
        }
        ctx.stroke();
        ctx.restore();

        // Aerial Cars
        const aCar1Y = ((effectiveFrame * 1.6) % (height + 80)) - 40;
        ctx.fillStyle = '#18181b';
        ctx.fillRect(width * 0.44 - 10, aCar1Y, 20, 36);
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(width * 0.44 - 7, aCar1Y + 8, 14, 18);

        const aCar2X = ((effectiveFrame * 1.4 + 100) % (width + 80)) - 40;
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(aCar2X, height * 0.48 - 10, 36, 20);

      } else if (camera.id === 3) {
        // =========================================================
        // SCENE 3: Bangkok Thai-Japanese Bridge Multi-Tier Flyover
        // =========================================================
        // Sky & Distant Highrises
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 0, width, height * 0.4);

        // Skyscraper outlines
        ctx.fillStyle = '#64748b';
        ctx.fillRect(width * 0.05, height * 0.08, width * 0.15, height * 0.3);
        ctx.fillRect(width * 0.22, height * 0.12, width * 0.12, height * 0.25);
        ctx.fillRect(width * 0.7, height * 0.05, width * 0.2, height * 0.32);

        // Massive Concrete Elevated Flyover Bridge Deck
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, height * 0.25, width, height * 0.18);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, height * 0.38, width, 12); // Bridge beam

        // "THAI - JAPANESE BRIDGE" Signboard & Flags
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(width * 0.28, height * 0.32, width * 0.44, 20);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(width * 0.28, height * 0.32, width * 0.44, 20);

        // Thai Flag
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(width * 0.3, height * 0.34, 16, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(width * 0.3, height * 0.36, 16, 8);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(width * 0.3, height * 0.38, 16, 4);

        // Japanese Flag
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(width * 0.67, height * 0.34, 16, 12);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(width * 0.67 + 8, height * 0.34 + 6, 4, 0, Math.PI * 2);
        ctx.fill();

        // Text: THAI-JAPANESE BRIDGE
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText('THAI - JAPANESE BRIDGE', width * 0.5, height * 0.38);

        // Ground Road Intersection
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, height * 0.45, width, height * 0.55);

        // Ground Vehicles (Red City Bus, Minivan, Motorbike pack)
        const busX = ((effectiveFrame * 2.5) % (width + 120)) - 80;
        ctx.fillStyle = '#ef4444'; // Red Bus
        ctx.fillRect(busX, height * 0.55, 65, 22);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(busX + 8, height * 0.58, 48, 8); // Bus Windows

        // Motorbike Pack
        const bikeX = ((effectiveFrame * 3.2 + 60) % (width + 60)) - 40;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(bikeX, height * 0.72, 5, 0, Math.PI * 2);
        ctx.arc(bikeX + 15, height * 0.76, 5, 0, Math.PI * 2);
        ctx.fill();

      } else if (camera.id === 4) {
        // =========================================================
        // SCENE 4: Monochrome City Tramway & Pedestrian Promenade
        // =========================================================
        // Cobblestone Greyscale
        ctx.fillStyle = '#181a1f';
        ctx.fillRect(0, 0, width, height);

        // Left Classical Building Facade with Windows
        ctx.fillStyle = '#32363e';
        ctx.fillRect(0, 0, width * 0.35, height);
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.fillStyle = '#1a1c21';
            ctx.fillRect(width * 0.05 + col * (width * 0.09), height * 0.1 + row * (height * 0.2), width * 0.06, height * 0.12);
          }
        }

        // Tram Tracks Rails
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.48, height * 0.3);
        ctx.lineTo(width * 0.42, height);
        ctx.moveTo(width * 0.56, height * 0.3);
        ctx.lineTo(width * 0.52, height);
        ctx.stroke();

        // Modern Electric Tram Gliding Forward
        const tramProgress = ((effectiveFrame * 0.015) % 1);
        const tramScale = 0.5 + tramProgress * 0.7;
        const tramY = height * 0.32 + tramProgress * (height * 0.45);
        const tramX = width * 0.45;
        const tramW = 34 * tramScale;
        const tramH = 65 * tramScale;

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(tramX - tramW / 2, tramY - tramH / 2, tramW, tramH, 4);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tramX - (tramW * 0.8) / 2, tramY - (tramH * 0.6) / 2, tramW * 0.8, tramH * 0.4);

        // Pedestrians walking on right sidewalk
        const pedY = ((effectiveFrame * 0.8) % (height * 0.4)) + height * 0.45;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(width * 0.75, pedY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(width * 0.75 - 3, pedY + 4, 6, 12);

      } else if (camera.id === 5) {
        // =========================================================
        // SCENE 5: Historic Stone Citadel Corner Rampart Junction
        // =========================================================
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, width, height);

        // Ancient Stone Castle Wall on Right
        ctx.fillStyle = '#44403c';
        ctx.fillRect(width * 0.65, 0, width * 0.35, height);
        // Stone Brick Lines
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 0; y < height; y += 18) {
          ctx.moveTo(width * 0.65, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Curved Road Surface
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.arc(0, height, width * 0.75, 0, Math.PI * 1.5, true);
        ctx.fill();

        // Vehicles rounding the bend
        const angle = ((effectiveFrame * 0.02) % (Math.PI * 0.6)) + 0.1;
        const radius = width * 0.52;
        const bCarX = radius * Math.cos(angle);
        const bCarY = height - radius * Math.sin(angle);

        ctx.save();
        ctx.translate(bCarX, bCarY);
        ctx.rotate(-angle + Math.PI / 2);
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.roundRect(-12, -22, 24, 44, 4);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1'; // Windshield
        ctx.fillRect(-8, -12, 16, 8);
        ctx.restore();

      } else {
        // =========================================================
        // SCENES 6-9: Tactical High-Threat Military & Border Posts
        // =========================================================
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        if (nightVision) {
          bgGrad.addColorStop(0, '#031408');
          bgGrad.addColorStop(1, '#08250f');
        } else if (thermalMode) {
          bgGrad.addColorStop(0, '#150020');
          bgGrad.addColorStop(0.5, '#400030');
          bgGrad.addColorStop(1, '#050010');
        } else {
          bgGrad.addColorStop(0, '#0a0f18');
          bgGrad.addColorStop(1, '#04070d');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Perspective fence demarcation & horizon
        ctx.strokeStyle = nightVision ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const horizonY = height * 0.42;
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        for (let i = -4; i <= 4; i++) {
          ctx.moveTo(width * 0.5, horizonY);
          ctx.lineTo(width * 0.5 + i * (width * 0.25), height);
        }
        ctx.stroke();

        // Pulsating Red Laser Tripwire on Camera 9 (Forward Recon)
        if (camera.id === 9 || camera.risk === 'High') {
          const tripPulse = 0.5 + Math.sin(time * 6) * 0.5;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + tripPulse * 0.5})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(0, height * 0.62);
          ctx.lineTo(width, height * 0.65);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.restore();

      // -------------------------------------------------------------
      // DRAW 60 FPS AI BOUNDING BOXES & OPTICAL FLOW TRACKING
      // -------------------------------------------------------------
      if (showAiHud) {
        // Draw Virtual Perimeter Geofence Zones
        if (activeZones.length > 0) {
          ctx.save();
          const isIntrusion =
            activeIntrusionRef.current && Date.now() - activeIntrusionRef.current.timestamp < 7000;
          const pulse = 0.5 + Math.sin(time * 8) * 0.5;

          activeZones.forEach((z) => {
            if (!z.polygon || z.polygon.length < 3) return;
            const isNorm = z.polygon.every((pt) => pt[0] <= 1.0 && pt[1] <= 1.0);
            const fw = realTracksRef.current?.frameWidth || 768;
            const fh = realTracksRef.current?.frameHeight || 432;

            ctx.beginPath();
            z.polygon.forEach((pt, idx) => {
              const px = isNorm ? pt[0] * width : (pt[0] / fw) * width;
              const py = isNorm ? pt[1] * height : (pt[1] / fh) * height;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();

            if (isIntrusion) {
              ctx.fillStyle = `rgba(239, 68, 68, ${0.12 + pulse * 0.14})`;
              ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 3]);
            } else {
              ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
            }
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            // Tactical Zone Name Badge
            const firstPt = z.polygon[0];
            const bx = isNorm ? firstPt[0] * width : (firstPt[0] / fw) * width;
            const by = isNorm ? firstPt[1] * height : (firstPt[1] / fh) * height;

            ctx.fillStyle = isIntrusion ? '#ef4444' : 'rgba(245, 158, 11, 0.9)';
            ctx.font = 'bold 9px monospace';
            const zoneTag = isIntrusion
              ? `[INTRUSION ACTIVE: ${z.name.toUpperCase()}]`
              : `[ZONE: ${z.name.toUpperCase()}]`;
            ctx.fillText(zoneTag, Math.max(bx + 4, 10), Math.max(by + 12, 16));
          });
          ctx.restore();
        }

        const targets: Array<{
          type: 'pedestrian' | 'vehicle' | 'intrusion';
          label: string;
          confidence: number;
          x: number;
          y: number;
          w: number;
          h: number;
          color: string;
          subLabel?: string;
          anpr?: string;
          speed?: string;
        }> = [];

        // Check if real ByteTrack tracks are actively streaming (within last 3.5s)
        const realTrackData = realTracksRef.current;
        const hasRealTracks =
          realTrackData &&
          Date.now() - realTrackData.timestamp < 3500 &&
          realTrackData.tracks &&
          realTrackData.tracks.length > 0;

        // Check if real YOLO detections are actively streaming (within last 3.5s)
        const realData = realDetectionsRef.current;
        const hasRealDetections = realData && Date.now() - realData.timestamp < 3500;

        if (hasRealTracks && realTrackData) {
          // RENDER REAL BYTETRACK PERSISTENT TRACKS
          const fw = realTrackData.frameWidth || 1920;
          const fh = realTrackData.frameHeight || 1080;
          const scaleX = width / fw;
          const scaleY = height / fh;

          realTrackData.tracks.forEach((trk) => {
            const bx = trk.bbox.x1 * scaleX;
            const by = trk.bbox.y1 * scaleY;
            const bw = (trk.bbox.x2 - trk.bbox.x1) * scaleX;
            const bh = (trk.bbox.y2 - trk.bbox.y1) * scaleY;

            const isVehicle = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(
              trk.class_name.toLowerCase()
            );
            const color = isVehicle ? '#38bdf8' : '#22c55e'; // Cyan for vehicles, Emerald for persons
            const trackTag = trk.track_id < 10 ? `0${trk.track_id}` : `${trk.track_id}`;

            targets.push({
              type: isVehicle ? 'vehicle' : 'pedestrian',
              label: `${trk.class_name.toUpperCase()} #${trackTag}`,
              confidence: trk.confidence,
              x: bx,
              y: by,
              w: Math.max(bw, 20),
              h: Math.max(bh, 20),
              color: color,
              subLabel: `TRACK ID: ${trk.track_id} [${Math.round(trk.confidence * 100)}%]`,
            });
          });
        } else if (hasRealDetections && realData && realData.detections && realData.detections.length > 0) {
          // RENDER REAL YOLO BOUNDING BOXES (Normalized from frame coordinates)
          const fw = realData.frameWidth || 1920;
          const fh = realData.frameHeight || 1080;
          const scaleX = width / fw;
          const scaleY = height / fh;

          realData.detections.forEach((det) => {
            const bx = det.bbox.x1 * scaleX;
            const by = det.bbox.y1 * scaleY;
            const bw = (det.bbox.x2 - det.bbox.x1) * scaleX;
            const bh = (det.bbox.y2 - det.bbox.y1) * scaleY;

            const isVehicle = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(
              det.class_name.toLowerCase()
            );
            const color = isVehicle ? '#38bdf8' : '#22c55e'; // Cyan for vehicles, Emerald for persons

            targets.push({
              type: isVehicle ? 'vehicle' : 'pedestrian',
              label: det.class_name.toUpperCase(),
              confidence: det.confidence,
              x: bx,
              y: by,
              w: Math.max(bw, 20),
              h: Math.max(bh, 20),
              color: color,
              subLabel: `REAL YOLO [${Math.round(det.confidence * 100)}%]`,
            });
          });
        } else if (camera.id === 1) {
          // Keep Clear Road Targets
          const car1Y = ((effectiveFrame * 2.2) % (height + 120)) - 60;
          const car1X = width * 0.48;
          targets.push({
            type: 'vehicle',
            label: 'MERCEDES E300',
            confidence: 0.98,
            x: car1X - 22,
            y: car1Y - 10,
            w: 44,
            h: 70,
            color: '#38bdf8', // Cyan
            subLabel: 'SPEED: 22 MPH [LANE: COMPLIANT]',
            anpr: 'LD19 XKV',
          });

          const car2Y = (((effectiveFrame + 90) * 1.8) % (height + 140)) - 60;
          const car2X = width * 0.35;
          targets.push({
            type: 'vehicle',
            label: 'SILVER HATCHBACK',
            confidence: 0.96,
            x: car2X - 20,
            y: car2Y - 8,
            w: 40,
            h: 60,
            color: '#eab308', // Yellow
            subLabel: 'SPEED: 19 MPH',
            anpr: 'KV67 NPF',
          });
        } else if (camera.id === 2) {
          // Aerial Crosshatch Targets
          const aCar1Y = ((effectiveFrame * 1.6) % (height + 80)) - 40;
          targets.push({
            type: 'vehicle',
            label: 'SALOON [IN-TRANSIT]',
            confidence: 0.97,
            x: width * 0.44 - 18,
            y: aCar1Y - 6,
            w: 36,
            h: 48,
            color: '#10b981',
            subLabel: 'BOX CLEARANCE: 100%',
          });
        } else if (camera.id === 3) {
          // Bangkok Flyover Multi-Tier Flow
          const busX = ((effectiveFrame * 2.5) % (width + 120)) - 80;
          targets.push({
            type: 'vehicle',
            label: 'BMTA CITY BUS',
            confidence: 0.99,
            x: busX - 4,
            y: height * 0.55 - 4,
            w: 74,
            h: 30,
            color: '#ef4444',
            subLabel: 'ROUTE 504 [CAPACITY: 42]',
          });
        } else if (camera.id === 4) {
          // Tram Promenade & Loiter Check
          const tramProgress = ((effectiveFrame * 0.015) % 1);
          const tramScale = 0.5 + tramProgress * 0.7;
          const tramY = height * 0.32 + tramProgress * (height * 0.45);
          const tramX = width * 0.45;
          targets.push({
            type: 'vehicle',
            label: 'CITADIS TRAM 04',
            confidence: 0.99,
            x: tramX - (34 * tramScale) / 2 - 4,
            y: tramY - (65 * tramScale) / 2 - 4,
            w: 34 * tramScale + 8,
            h: 65 * tramScale + 8,
            color: '#38bdf8',
            subLabel: 'LIGHT RAIL [18 KM/H]',
          });

          // Pedestrian Loitering Audit
          const pedY = ((effectiveFrame * 0.8) % (height * 0.4)) + height * 0.45;
          targets.push({
            type: 'pedestrian',
            label: 'PEDESTRIAN',
            confidence: 0.94,
            x: width * 0.75 - 10,
            y: pedY - 6,
            w: 20,
            h: 30,
            color: '#22c55e',
            subLabel: 'DWELL: 00:42',
          });
        } else if (camera.id === 5) {
          // Historic Corner ANPR
          targets.push({
            type: 'vehicle',
            label: 'TRANSIT VAN',
            confidence: 0.97,
            x: width * 0.28,
            y: height * 0.42,
            w: 52,
            h: 46,
            color: '#eab308',
            subLabel: 'SPEED: 26 KM/H [ANPR: EF18 UTY]',
          });
        } else if (camera.id === 9 || camera.risk === 'High') {
          // High Threat Breach
          const oscX = Math.sin(time + camera.id) * (width * 0.08);
          targets.push({
            type: 'intrusion',
            label: 'LASER TRIPWIRE BREACH',
            confidence: 0.99,
            x: width * 0.44 + oscX,
            y: height * 0.48,
            w: Math.max(width * 0.16, 65),
            h: Math.max(height * 0.3, 85),
            color: '#ef4444',
            subLabel: 'UNAUTHORIZED TARGET IN FORWARD POST',
          });
        } else {
          // Safe Patrol Guard
          targets.push({
            type: 'pedestrian',
            label: 'PATROL B-12',
            confidence: 0.95,
            x: width * 0.22,
            y: height * 0.44,
            w: Math.max(width * 0.12, 45),
            h: Math.max(height * 0.26, 75),
            color: '#22c55e',
            subLabel: 'STATUS: AUTHORIZED',
          });
        }

        // Draw each target box with HUD brackets and typography
        targets.forEach((tgt) => {
          const { x, y, w, h, color, label, confidence, subLabel } = tgt;
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = tgt.type === 'intrusion' ? 2 : 1.5;

          const cornerLen = Math.min(w * 0.25, 12);
          ctx.beginPath();
          // Top Left
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          // Top Right
          ctx.moveTo(x + w - cornerLen, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w, y + cornerLen);
          // Bottom Right
          ctx.moveTo(x + w, y + h - cornerLen);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x + w - cornerLen, y + h);
          // Bottom Left
          ctx.moveTo(x + cornerLen, y + h);
          ctx.lineTo(x, y + h);
          ctx.lineTo(x, y + h - cornerLen);
          ctx.stroke();

          // Fill tint
          ctx.fillStyle = `${color}18`;
          ctx.fillRect(x, y, w, h);

          // Center crosshair for intrusion
          if (tgt.type === 'intrusion') {
            const cx = x + w / 2;
            const cy = y + h / 2;
            ctx.strokeStyle = `${color}90`;
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy);
            ctx.lineTo(cx + 6, cy);
            ctx.moveTo(cx, cy - 6);
            ctx.lineTo(cx, cy + 6);
            ctx.stroke();
          }

          // Header Tag
          const tagText = `[${label} ${(confidence * 100).toFixed(0)}%]`;
          ctx.font = isCompact ? 'bold 8px monospace' : 'bold 9px monospace';
          const textMetrics = ctx.measureText(tagText);
          const tagW = textMetrics.width + 8;
          const tagH = isCompact ? 13 : 16;

          ctx.fillStyle = color;
          ctx.fillRect(x, y - tagH, tagW, tagH);
          ctx.fillStyle = '#000000';
          ctx.fillText(tagText, x + 4, y - (isCompact ? 3 : 4));

          // Sub-label
          if (subLabel && !isCompact) {
            ctx.font = 'bold 8px monospace';
            const subMetrics = ctx.measureText(subLabel);
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(x, y + h + 2, subMetrics.width + 6, 13);
            ctx.fillStyle = color;
            ctx.fillText(subLabel, x + 3, y + h + 11);
          }
          ctx.restore();
        });

        // Scanline HUD effect
        const scanY = (effectiveFrame * 2) % height;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();
      }

      // -------------------------------------------------------------
      // DRAW THREAT HEATMAP OVERLAY
      // -------------------------------------------------------------
      if (heatmapIntensity && heatmapIntensity > 0) {
        ctx.save();
        // Base red overlay scaled by intensity
        ctx.fillStyle = `rgba(225, 29, 72, ${heatmapIntensity * 0.4})`;
        ctx.fillRect(0, 0, width, height);
        
        // Render a grid-like or pulse effect based on intensity
        const pulse = Math.sin(time * 3) * 0.1 + 0.9;
        const radius = Math.min(width, height) * 0.4 * pulse * heatmapIntensity;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
        gradient.addColorStop(0, `rgba(225, 29, 72, ${heatmapIntensity * 0.6})`);
        gradient.addColorStop(1, 'rgba(225, 29, 72, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [camera, nightVision, thermalMode, showAiHud, isCompact, playbackMode, playbackTimeOffset, playbackSpeed, isAutoRotate, zoomLevel, heatmapIntensity]);

  return (
    <div
      ref={containerRef}
      id={`matrix-camera-card-${camera.id}`}
      className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all group ${
        camera.risk === 'High'
          ? 'ring-1 ring-rose-500/40 hover:border-rose-500/60'
          : 'hover:border-cyan-500/50'
      } ${isSpotlight ? 'h-full' : ''}`}
    >
      {/* 1. Header Bar with Camera Tag, Name, Mode Selector & Spotlight */}
      <div className="px-3 py-2 bg-slate-950/95 border-b border-slate-800/80 flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Camera Tag Badge */}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black tracking-wider ${
              camera.risk === 'High'
                ? 'bg-rose-950 text-rose-300 border border-rose-600/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : camera.risk === 'Medium'
                ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            {camera.tag}
          </span>

          {/* Editable Camera Location Name */}
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1 flex-1 min-w-0">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 text-cyan-300 text-xs font-mono px-2 py-0.5 rounded border border-cyan-500/70 focus:outline-none"
              />
              <button
                type="submit"
                title="Save Camera Label"
                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                title="Cancel"
                className="p-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 cursor-pointer"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-xs font-mono font-bold text-slate-100 truncate" title={camera.name}>
                {camera.name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                title="Edit Camera Location Label"
                className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors cursor-pointer"
              >
                <Edit3 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Live vs Recorded Toggle & Spotlight */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setPlaybackMode((m) => (m === 'LIVE' ? 'RECORDED' : 'LIVE'))}
            title={playbackMode === 'LIVE' ? 'Switch to Recorded Playback' : 'Switch to Live RTSP Feed'}
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              playbackMode === 'LIVE'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-amber-950/90 text-amber-300 border-amber-500/50'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                playbackMode === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span>{playbackMode}</span>
          </button>

          {onSelectSpotlight && (
            <button
              onClick={() => onSelectSpotlight(camera)}
              title="Spotlight View"
              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Video Player & 60 FPS Photorealistic Canvas AI Overlay Container */}
      <div
        className={`relative bg-black overflow-hidden flex items-center justify-center ${
          isSpotlight ? 'flex-1 min-h-[380px]' : 'aspect-video'
        }`}
        style={{
          filter: nightVision
            ? 'brightness(1.15) contrast(1.3) hue-rotate(90deg) saturate(2)'
            : thermalMode
            ? 'invert(1) hue-rotate(180deg) saturate(3)'
            : 'none',
        }}
      >
        {/* Real HTML5 Video Player */}
        <video
          ref={videoRef}
          src={camera.src}
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
          style={{ transform: `scale(${zoomLevel})` }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200"
        />

        {/* 60 FPS Photorealistic CCTV Stream Canvas & AI Overlays */}
        <canvas
          ref={canvasRef}
          style={{ transform: `scale(${zoomLevel})` }}
          className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-transform duration-200"
        />

        {/* Blackout Mode Overlay */}
        {isBlackout && (
          <div className="absolute inset-0 z-[15] bg-slate-950 flex flex-col items-center justify-center overflow-hidden pointer-events-none">
            <div className="scanline-effect opacity-20"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="w-full h-full border-2 border-dashed border-emerald-500/30 rounded-lg flex flex-col items-center justify-center bg-emerald-950/20 backdrop-blur-md">
                <Shield size={28} className="text-emerald-500 mb-2 animate-pulse" />
                <span className="text-emerald-500 font-mono font-bold tracking-widest text-base sm:text-lg">SIGNAL SECURE</span>
                <span className="text-emerald-500/60 font-mono text-[9px] tracking-widest mt-1 text-center">AREA MASKED BY OPERATOR</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Top-Left Watermark: Mode Badge + Time */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20 pointer-events-none select-none">
          {playbackMode === 'LIVE' ? (
            <div className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-mono font-bold rounded-md flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.8)] border border-rose-400">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              <span>● LIVE</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 bg-amber-600 text-black text-[9px] font-mono font-black rounded-md flex items-center gap-1 border border-amber-400">
              <Clock size={10} />
              <span>RECORDED ARCHIVE</span>
            </div>
          )}

          <div className="px-2 py-0.5 bg-black/85 text-amber-400 text-[9px] font-mono font-bold border border-amber-500/30 rounded-md backdrop-blur-md">
            {playbackMode === 'LIVE'
              ? liveTimestamp
              : `10:45:${Math.floor(playbackTimeOffset).toString().padStart(2, '0')} AM`}
          </div>

          {isRecording && (
            <div className="px-1.5 py-0.5 bg-rose-700 text-white text-[8px] font-mono font-bold rounded flex items-center gap-1 animate-pulse">
              <Disc size={8} className="animate-spin" />
              <span>REC</span>
            </div>
          )}
        </div>

        {/* Top-Right Resolution & AI Model Watermark */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20 pointer-events-none select-none">
          <span className="px-1.5 py-0.5 bg-black/80 text-cyan-400 text-[8px] font-mono font-bold rounded border border-cyan-500/30 backdrop-blur-md">
            {camera.resolution || '4K UHD'} | {camera.fps || 60} FPS
          </span>
          <span className="px-1.5 py-0.5 bg-slate-950/85 text-slate-300 text-[8px] font-mono font-bold rounded border border-slate-700">
            {camera.alertType}
          </span>
          {camera.batteryLevel !== undefined && (
            <span className={`px-1.5 py-0.5 bg-black/80 text-[8px] font-mono font-bold rounded border flex items-center gap-0.5 backdrop-blur-md ${
              camera.batteryLevel > 50 
                ? 'text-emerald-400 border-emerald-500/30' 
                : camera.batteryLevel > 20 
                  ? 'text-amber-400 border-amber-500/30' 
                  : 'text-rose-500 border-rose-500/50 animate-pulse'
            }`}>
              {camera.batteryLevel > 80 ? <BatteryFull size={10} /> :
               camera.batteryLevel > 50 ? <BatteryMedium size={10} /> :
               camera.batteryLevel > 20 ? <BatteryLow size={10} /> : 
               <BatteryWarning size={10} />}
              {camera.batteryLevel}%
            </span>
          )}
        </div>

        {/* 4. Bottom Recorded Timeline Scrubber (When in RECORDED Mode) */}
        {playbackMode === 'RECORDED' && (
          <div className="absolute bottom-10 inset-x-2 px-2.5 py-1.5 bg-slate-950/90 border border-amber-500/40 rounded-lg backdrop-blur-md z-30 flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setIsPlayingRecorded(!isPlayingRecorded)}
              className="p-1 text-amber-300 hover:text-white bg-amber-950 rounded cursor-pointer"
            >
              {isPlayingRecorded ? <Pause size={11} /> : <Play size={11} />}
            </button>

            <input
              type="range"
              min={0}
              max={60}
              step={0.5}
              value={playbackTimeOffset}
              onChange={(e) => setPlaybackTimeOffset(parseFloat(e.target.value))}
              className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
            />

            <button
              onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
              className="px-1.5 py-0.5 bg-slate-800 text-amber-300 text-[9px] font-bold rounded hover:bg-slate-700 cursor-pointer"
            >
              {playbackSpeed}x
            </button>
          </div>
        )}

        {/* Bottom Floating Tactical Action Bar (Appears on Hover) */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2 py-1 bg-slate-950/90 border border-slate-700/60 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <div className="flex items-center gap-1">
            {/* Blackout Mode Toggle */}
            <button
              onClick={() => setIsBlackout(!isBlackout)}
              title="Toggle Blackout (Mask Signal)"
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isBlackout
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <EyeOff size={9} />
              MASK
            </button>

            {/* Night Vision */}
            <button
              onClick={() => {
                setNightVision(!nightVision);
                if (thermalMode) setThermalMode(false);
              }}
              title="Toggle Night Vision IR Mode"
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                nightVision
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              NV-IR
            </button>

            {/* Thermal Mode */}
            <button
              onClick={() => {
                setThermalMode(!thermalMode);
                if (nightVision) setNightVision(false);
              }}
              title="Toggle Thermal Imaging Mode"
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                thermalMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              THERMAL
            </button>

            {/* AI HUD Overlay Toggle */}
            <button
              onClick={() => setShowAiHud(!showAiHud)}
              title="Toggle 60FPS AI Bounding Box HUD"
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                showAiHud
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              HUD: {showAiHud ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* PTZ Auto Rotate Toggle */}
            <button
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              title={isAutoRotate ? 'Stop PTZ Auto-Rotate' : 'Start PTZ Auto-Rotate'}
              className={`p-1 rounded cursor-pointer transition-all ${
                isAutoRotate
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Move size={11} className={isAutoRotate ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''} />
            </button>

            {/* Digital Zoom Controls */}
            <button
              onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
              disabled={zoomLevel <= 1}
              title="Zoom Out"
              className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut size={11} />
            </button>
            <span className="text-[8px] font-mono text-cyan-400 font-bold px-1">
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
              disabled={zoomLevel >= 3}
              title="Zoom In"
              className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn size={11} />
            </button>

            {/* Record RTSP Toggle */}
            <button
              onClick={handleToggleRecord}
              title={isRecording ? 'Stop Recording RTSP Stream' : 'Record RTSP Stream'}
              className={`p-1 rounded cursor-pointer transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-800 text-rose-400 hover:bg-rose-950 hover:text-white'
              }`}
            >
              <Disc size={11} />
            </button>

            {/* Snapshot */}
            <button
              onClick={handleCaptureSnapshot}
              title="Capture High-Res Snapshot"
              className="p-1 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
            >
              <Camera size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Metadata Strip */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">INGRESS:</span>
          <span className="text-emerald-400 font-bold">{camera.bitrate || '8.2 Mbps'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">RISK:</span>
          <span
            className={`font-bold ${
              camera.risk === 'High'
                ? 'text-rose-400'
                : camera.risk === 'Medium'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {camera.risk.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};
