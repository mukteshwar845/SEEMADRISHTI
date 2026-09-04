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
  Sliders,
} from 'lucide-react';
import { recordingEngine } from '../utils/recordingManager';
import { webSocketService, RealYoloDetection, TrackItem, ObjectCountsPayload } from '../services/websocketService';
import { fetchZones, getAuthToken } from '../services/api';
import { CameraHudHeader } from './matrix/CameraHudHeader';
import { CameraControlsBar } from './matrix/CameraControlsBar';
import { CameraCanvasOverlay } from './matrix/CameraCanvasOverlay';
import { PhoneCameraModal } from './matrix/PhoneCameraModal';

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
  onUpdateCameraSource,
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

  // Mobile Phone Camera Ingestion State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneFrameUrl, setPhoneFrameUrl] = useState<string | null>(null);
  const [phoneStreamingActive, setPhoneStreamingActive] = useState(false);
  const [phoneDeviceName, setPhoneDeviceName] = useState<string>('Mobile Phone');

  // Video & View Controls
  const [nightVision, setNightVision] = useState(camera.id === 1 || camera.id === 7);
  const [thermalMode, setThermalMode] = useState(camera.id === 9);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAiHud, setShowAiHud] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);

  // Live Physical Webcam Stream & Genuine Edge CV Ingestion
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [useCvStream, setUseCvStream] = useState(false);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [webcamCvStatus, setWebcamCvStatus] = useState<'IDLE' | 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'DISCONNECTED' | 'BACKEND_OFFLINE'>('IDLE');
  const [webcamTelemetry, setWebcamTelemetry] = useState<{
    fps: number;
    latencyMs: number;
    inferenceMs: number;
    detectionsCount: number;
    tracksCount: number;
  } | null>(null);
  const grabCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inFlightRef = useRef(false);

  const handleToggleWebcam = async () => {
    if (isWebcamActive || useCvStream) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = camera.src || `/api/cameras/cam-0${camera.id}/video`;
        videoRef.current.play().catch(() => {});
      }
      setIsWebcamActive(false);
      setUseCvStream(false);
      setWebcamCvStatus('IDLE');
      setWebcamTelemetry(null);
      realTracksRef.current = null;
      realDetectionsRef.current = null;
      inFlightRef.current = false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        // Listen for hardware disconnect or permission revocation
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            console.warn('[MatrixCameraCell] Webcam track ended / camera disconnected');
            setIsWebcamActive(false);
            setWebcamCvStatus('DISCONNECTED');
            setWebcamTelemetry(null);
            realTracksRef.current = null;
            realDetectionsRef.current = null;
            if (webcamStreamRef.current) {
              webcamStreamRef.current = null;
            }
          };
        });

        webcamStreamRef.current = stream;
        setIsWebcamActive(true);
        setUseCvStream(false);
        setVideoLoaded(true);
        setVideoError(false);
        setWebcamCvStatus('CONNECTING');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[MatrixCameraCell] Browser webcam unavailable or permission denied:', err);
        setIsWebcamActive(false);
        setUseCvStream(false);
        setWebcamCvStatus('DISCONNECTED');
        setWebcamTelemetry(null);
        realTracksRef.current = null;
        realDetectionsRef.current = null;
      }
    }
  };

  // Synchronize webcam stream to video element on state change
  useEffect(() => {
    if (isWebcamActive && webcamStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = webcamStreamRef.current;
      videoRef.current.play().catch(() => {});
      setVideoLoaded(true);
      setVideoError(false);
    }
  }, [isWebcamActive]);

  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, []);

  // Ingest live browser webcam frames directly to Python CV (YOLOv8 + ByteTrack)
  useEffect(() => {
    if (!isWebcamActive) {
      setWebcamCvStatus('IDLE');
      setWebcamTelemetry(null);
      return;
    }

    setWebcamCvStatus('CONNECTING');
    if (!grabCanvasRef.current) {
      grabCanvasRef.current = document.createElement('canvas');
    }

    const camTag = (camera.tag || `cam-0${camera.id}`).toLowerCase().trim();

    const captureInterval = setInterval(() => {
      const video = videoRef.current;
      const grabCanvas = grabCanvasRef.current;
      if (!video || !grabCanvas || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }

      if (inFlightRef.current) {
        // Backpressure control: skip tick if previous frame inference is still in-flight
        return;
      }

      const targetW = 640;
      const targetH = Math.round((targetW * video.videoHeight) / video.videoWidth) || 360;

      if (grabCanvas.width !== targetW || grabCanvas.height !== targetH) {
        grabCanvas.width = targetW;
        grabCanvas.height = targetH;
      }

      const ctx = grabCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, targetW, targetH);
      const base64Data = grabCanvas.toDataURL('image/jpeg', 0.65);

      inFlightRef.current = true;
      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('seemadrishti_auth_token') : null);

      fetch('/api/webcam/frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          camera_id: camTag,
          frame: base64Data,
          timestamp: Date.now(),
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setWebcamCvStatus('ONLINE');
            if (data.telemetry) {
              setWebcamTelemetry({
                fps: typeof data.telemetry.measured_fps === 'number' ? data.telemetry.measured_fps : 0,
                latencyMs: typeof data.telemetry.total_latency_ms === 'number' ? data.telemetry.total_latency_ms : 0,
                inferenceMs: typeof data.telemetry.inference_time_ms === 'number' ? data.telemetry.inference_time_ms : 0,
                detectionsCount: data.detections?.length || 0,
                tracksCount: data.tracks?.length || 0,
              });
            }
            if (data.tracks) {
              realTracksRef.current = {
                timestamp: Date.now(),
                tracks: data.tracks,
                frameWidth: data.frame_width || targetW,
                frameHeight: data.frame_height || targetH,
              };
            }
            if (data.detections) {
              realDetectionsRef.current = {
                timestamp: Date.now(),
                detections: data.detections,
                frameWidth: data.frame_width || targetW,
                frameHeight: data.frame_height || targetH,
              };
            }
            if (data.counts) {
              setLiveCounts(data.counts);
            }
            if (data.risk) {
              setRiskState({
                risk_score: data.risk.score,
                risk_level: data.risk.level,
                reasons: data.risk.reasons,
              });
            }
          } else if (res.status === 503) {
            setWebcamCvStatus('OFFLINE');
            setWebcamTelemetry(null);
            realTracksRef.current = null;
            realDetectionsRef.current = null;
          } else {
            setWebcamCvStatus('OFFLINE');
            setWebcamTelemetry(null);
            realTracksRef.current = null;
            realDetectionsRef.current = null;
          }
        })
        .catch(() => {
          setWebcamCvStatus('BACKEND_OFFLINE');
          setWebcamTelemetry(null);
          realTracksRef.current = null;
          realDetectionsRef.current = null;
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    }, 120); // ~8 FPS edge transmission rate

    return () => {
      clearInterval(captureInterval);
      inFlightRef.current = false;
    };
  }, [isWebcamActive, camera.id, camera.tag]);

  // Playback Mode (LIVE vs RECORDED FOOTAGE)
  const [playbackMode, setPlaybackMode] = useState<'LIVE' | 'RECORDED'>('LIVE');
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(true);
  const [playbackTimeOffset, setPlaybackTimeOffset] = useState(42); // Seconds into archive
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [freshness, setFreshness] = useState<{
    status: 'LIVE' | 'STALE' | 'OFFLINE' | 'CONNECTING';
    lastFrameAgeSec: number;
    measuredFps: number;
  }>({ status: 'LIVE', lastFrameAgeSec: 0.1, measuredFps: camera.fps || 25 });

  useEffect(() => {
    const rawTag = (camera.tag || camera.code || `cam-0${camera.id}`).toLowerCase().trim();
    const camKey = rawTag.replace(/^cam-0?/, 'cam-0');
    const interval = setInterval(() => {
      const f = webSocketService.getCameraFreshness(camKey);
      if (f.status === 'LIVE' || videoLoaded || isWebcamActive) {
        setFreshness({ status: 'LIVE', lastFrameAgeSec: 0.1, measuredFps: camera.fps || 25 });
      } else {
        setFreshness(f);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [camera, videoError, videoLoaded, isWebcamActive]);

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

  // Phase 14 Stream Synchronization Telemetry
  const [syncTelemetry, setSyncTelemetry] = useState<{
    frameId: number;
    frameSequence: number;
    sourceType: string;
    latencyMs: number;
    fps: number;
    timestamp: number;
  }>({
    frameId: 0,
    frameSequence: 0,
    sourceType: camera.src?.includes('.mp4') ? 'MP4' : 'RTSP',
    latencyMs: 12,
    fps: camera.fps || 30,
    timestamp: Date.now(),
  });

  const [showSyncDebug, setShowSyncDebug] = useState(false);

  // Listen for Ctrl+Shift+D to toggle developer sync HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setShowSyncDebug((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real Phase 9 environmental illumination and scene visibility state
  const [envState, setEnvState] = useState<{
    mode: string;
    visibility_score: number;
    low_light: boolean;
    brightness: number;
  } | null>(null);

  // Real Phase 6 Threat Risk Assessment state
  const [riskState, setRiskState] = useState<{
    risk_score: number;
    risk_level: string;
    reasons?: any[];
  } | null>(null);

  // Real Phase 10 Occupancy, Movement, Anomaly and Group states
  const [occupancyState, setOccupancyState] = useState<{
    occupants: number;
    peak: number;
    classes: Record<string, number>;
  } | null>(null);

  const [activeAnomaly, setActiveAnomaly] = useState<{
    type: string;
    reason: string;
    severity: string;
    timestamp: number;
  } | null>(null);

  const [groupCount, setGroupCount] = useState<number>(0);
  const [liveCounts, setLiveCounts] = useState<ObjectCountsPayload | null>(null);

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
        if (payload.counts) {
          setLiveCounts(payload.counts);
        }
      }
    });

    const unsubFrameState = webSocketService.onFrameState((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        setSyncTelemetry({
          frameId: payload.frame_id || 0,
          frameSequence: payload.frame_sequence || 0,
          sourceType: payload.source_type || 'MP4',
          latencyMs: payload.processing_latency_ms || 12,
          fps: payload.measured_fps || 30,
          timestamp: payload.timestamp || Date.now(),
        });
        if (payload.tracks && payload.tracks.length > 0) {
          realTracksRef.current = {
            timestamp: Date.now(),
            tracks: payload.tracks,
            frameWidth: 1920,
            frameHeight: 1080,
          };
        }
        if (payload.counts) {
          setLiveCounts(payload.counts);
        }
      }
    });

    const unsubRisk = webSocketService.onRiskAssessment((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        setRiskState({
          risk_score: payload.score,
          risk_level: payload.level,
          reasons: payload.reasons,
        });
      }
    });

    const unsubOcc = webSocketService.onOccupancyUpdate((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        setOccupancyState({
          occupants: payload.current_occupants,
          peak: payload.peak_occupants,
          classes: payload.class_breakdown || {},
        });
      }
    });

    const unsubAnom = webSocketService.onAnalyticsAnomaly((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        setActiveAnomaly({
          type: payload.anomaly_type,
          reason: payload.reason,
          severity: payload.severity,
          timestamp: Date.now(),
        });
        setTimeout(() => setActiveAnomaly(null), 8000);
      }
    });

    const unsubGroup = webSocketService.onGroupMovement((payload) => {
      const targetId = String(payload.camera_id).toLowerCase().trim();
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded) {
        setGroupCount((prev) => prev + 1);
        setTimeout(() => setGroupCount((prev) => Math.max(0, prev - 1)), 6000);
      }
    });

    const unsubPhoneFrame = webSocketService.onPhoneStreamFrame((data) => {
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();
      const targetId = String(data?.camera_id || '').toLowerCase().trim();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded || (camera.id === 2 && (!targetId || targetId === 'cam-02'))) {
        if (data?.frame) {
          setPhoneFrameUrl(data.frame);
          setPhoneStreamingActive(true);
          setVideoLoaded(true);
          setVideoError(false);
          webSocketService.recordCameraFrame(camera.tag || `cam-0${camera.id}`, 20.0);
        }
      }
    });

    const unsubPhoneStatus = webSocketService.onPhoneStreamStatus((data) => {
      const myTag = camera.tag.toLowerCase().trim();
      const myId = String(camera.id).toLowerCase().trim();
      const myTagPadded = `cam-0${camera.id}`.toLowerCase();
      const targetId = String(data?.camera_id || '').toLowerCase().trim();

      if (targetId === myTag || targetId === myId || targetId === myTagPadded || (camera.id === 2 && (!targetId || targetId === 'cam-02'))) {
        setPhoneStreamingActive(Boolean(data?.connected));
        if (data?.device) setPhoneDeviceName(data.device);
        if (!data?.connected) setPhoneFrameUrl(null);
      }
    });

    return () => {
      unsubDet();
      unsubTrack();
      unsubFrameState();
      unsubRisk();
      unsubOcc();
      unsubAnom();
      unsubGroup();
      unsubPhoneFrame();
      unsubPhoneStatus();
    };
  }, [camera.id, camera.tag]);

  // Active virtual zones and intrusion state for this camera
  const DEFAULT_CAMERA_ZONES: Record<string, Array<{ id: string; name: string; polygon: [number, number][]; zone_type?: string }>> = {
    'cam-01': [
      { id: 'zone-cam-01-main', name: 'Sector Alpha Main Gate Restricted Zone', polygon: [[0.20, 0.55], [0.85, 0.55], [0.85, 0.95], [0.20, 0.95]], zone_type: 'RESTRICTED_ZONE' },
      { id: 'line-cam-01-tripwire', name: 'Alpha Entry Tripwire', polygon: [[0.20, 0.72], [0.85, 0.72]], zone_type: 'TRIPWIRE' },
    ],
    'cam-02': [
      { id: 'zone-cam-02-main', name: 'Sector Alpha East Perimeter Zone', polygon: [[0.15, 0.20], [0.85, 0.20], [0.85, 0.80], [0.15, 0.80]], zone_type: 'RESTRICTED_ZONE' },
      { id: 'line-cam-02-tripwire', name: 'East Perimeter Crossing Line', polygon: [[0.10, 0.50], [0.90, 0.50]], zone_type: 'TRIPWIRE' },
    ],
    'cam-03': [
      { id: 'zone-cam-03-main', name: 'Sector Bravo Access Road Monitored Zone', polygon: [[0.20, 0.25], [0.80, 0.25], [0.80, 0.75], [0.20, 0.75]], zone_type: 'RESTRICTED_ZONE' },
      { id: 'line-cam-03-tripwire', name: 'Bravo Access Ingress Line', polygon: [[0.15, 0.45], [0.85, 0.45]], zone_type: 'TRIPWIRE' },
    ],
    'cam-04': [
      { id: 'zone-cam-04-main', name: 'Sector Bravo Outer Fence Exclusion Area', polygon: [[0.10, 0.20], [0.90, 0.20], [0.90, 0.85], [0.10, 0.85]], zone_type: 'RESTRICTED_ZONE' },
    ],
    'cam-05': [
      { id: 'zone-cam-05-main', name: 'Sector Charlie Checkpoint Transit Zone', polygon: [[0.15, 0.25], [0.85, 0.25], [0.85, 0.80], [0.15, 0.80]], zone_type: 'RESTRICTED_ZONE' },
      { id: 'line-cam-05-tripwire', name: 'Charlie Gate Barrier Line', polygon: [[0.20, 0.55], [0.80, 0.55]], zone_type: 'TRIPWIRE' },
    ],
    'cam-06': [
      { id: 'zone-cam-06-main', name: 'Sector Charlie Transit Corridor', polygon: [[0.20, 0.30], [0.80, 0.30], [0.80, 0.85], [0.20, 0.85]], zone_type: 'RESTRICTED_ZONE' },
    ],
    'cam-07': [
      { id: 'zone-cam-07-main', name: 'Sector Delta Approach Monitored Sector', polygon: [[0.20, 0.30], [0.80, 0.30], [0.80, 0.85], [0.20, 0.85]], zone_type: 'RESTRICTED_ZONE' },
    ],
    'cam-08': [
      { id: 'zone-cam-08-main', name: 'Sector Delta Observation Zone', polygon: [[0.15, 0.25], [0.85, 0.25], [0.85, 0.85], [0.15, 0.85]], zone_type: 'RESTRICTED_ZONE' },
    ],
    'cam-09': [
      { id: 'zone-cam-09-main', name: 'Sector Echo Border Patrol Corridor', polygon: [[0.15, 0.20], [0.85, 0.20], [0.85, 0.80], [0.15, 0.80]], zone_type: 'RESTRICTED_ZONE' },
    ],
  };

  const [activeZones, setActiveZones] = useState<Array<{ id: string; name: string; polygon: [number, number][]; zone_type?: string }>>([]);
  const activeIntrusionRef = useRef<{ timestamp: number; zoneName?: string; trackId?: number; eventType?: string; direction?: string } | null>(null);

  useEffect(() => {
    const myId = String(camera.id);
    const myTag = camera.tag?.toLowerCase() || `cam-0${camera.id}`;
    const fallbackKey = `cam-0${camera.id}`;

    fetchZones(myId)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setActiveZones(res.data.map((z) => ({ id: z.id, name: z.name, polygon: z.polygon, zone_type: (z as any).zone_type })));
        } else {
          fetchZones(myTag)
            .then((res2) => {
              if (res2.success && res2.data && res2.data.length > 0) {
                setActiveZones(res2.data.map((z) => ({ id: z.id, name: z.name, polygon: z.polygon, zone_type: (z as any).zone_type })));
              } else if (DEFAULT_CAMERA_ZONES[fallbackKey]) {
                setActiveZones(DEFAULT_CAMERA_ZONES[fallbackKey]);
              }
            })
            .catch(() => {
              if (DEFAULT_CAMERA_ZONES[fallbackKey]) {
                setActiveZones(DEFAULT_CAMERA_ZONES[fallbackKey]);
              }
            });
        }
      })
      .catch(() => {
        if (DEFAULT_CAMERA_ZONES[fallbackKey]) {
          setActiveZones(DEFAULT_CAMERA_ZONES[fallbackKey]);
        }
      });

    const unsubAlert = webSocketService.onAlert((alert) => {
      const alertCam = (alert.camera || (alert as any).camera_id || (alert as any).cameraId || (alert as any).sector || '').toLowerCase();
      if (alertCam.includes(myId) || alertCam.includes(myTag) || alertCam.includes(fallbackKey)) {
        activeIntrusionRef.current = {
          timestamp: Date.now(),
          zoneName: (alert as any).zone_name || (alert as any).metadata?.zone_name || alert.type || 'RESTRICTED PERIMETER',
          trackId: (alert as any).track_id || (alert as any).metadata?.track_id || 1,
          eventType: (alert as any).event_type || (alert as any).metadata?.event_type || ((alert.title || '').includes('Tripwire') ? 'TRIPWIRE_CROSSING' : 'RESTRICTED_ZONE_ENTRY'),
          direction: (alert as any).direction || (alert as any).metadata?.direction || 'IN',
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

      const width = canvas.clientWidth > 0 ? canvas.clientWidth : (container.clientWidth > 0 ? container.clientWidth : 640);
      const height = canvas.clientHeight > 0 ? canvas.clientHeight : Math.round(width * 9 / 16);

      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
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
      // DRAW HIGH FIDELITY CCTV FOOTAGE BACKGROUND (Fallback only when video loading/not live)
      // -------------------------------------------------------------
      const isLiveFeed = isWebcamActive || useCvStream || phoneStreamingActive || camera.src?.includes('/stream');
      if (!isLiveFeed && (!videoLoaded || videoError)) {
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
      }

      // -------------------------------------------------------------
      // DRAW 60 FPS AI BOUNDING BOXES & OPTICAL FLOW TRACKING
      // -------------------------------------------------------------
      if (showAiHud) {
        // Draw Virtual Perimeter Geofence Zones and Virtual Tripwires
        if (activeZones.length > 0) {
          ctx.save();
          const isIntrusion =
            activeIntrusionRef.current && Date.now() - activeIntrusionRef.current.timestamp < 7000;
          const pulse = 0.5 + Math.sin(time * 8) * 0.5;

          activeZones.forEach((z) => {
            if (!z.polygon || z.polygon.length < 2) return;
            const isNorm = z.polygon.every((pt) => pt[0] <= 1.0 && pt[1] <= 1.0);
            const fw = realTracksRef.current?.frameWidth || 1920;
            const fh = realTracksRef.current?.frameHeight || 1080;

            if (z.polygon.length === 2 || (z as any).zone_type === 'TRIPWIRE') {
              // VIRTUAL TRIPWIRE LINE
              const p1 = z.polygon[0];
              const p2 = z.polygon[1];
              const x1 = isNorm ? p1[0] * width : (p1[0] / fw) * width;
              const y1 = isNorm ? p1[1] * height : (p1[1] / fh) * height;
              const x2 = isNorm ? p2[0] * width : (p2[0] / fw) * width;
              const y2 = isNorm ? p2[1] * height : (p2[1] / fh) * height;

              const isTripwireBreach = isIntrusion && activeIntrusionRef.current?.eventType === 'TRIPWIRE_CROSSING';

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = isTripwireBreach ? `rgba(239, 68, 68, ${0.85 + pulse * 0.15})` : 'rgba(56, 189, 248, 0.85)';
              ctx.lineWidth = isTripwireBreach ? 3.5 : 2;
              ctx.setLineDash([8, 4]);
              ctx.stroke();
              ctx.setLineDash([]);

              // End points
              ctx.fillStyle = isTripwireBreach ? '#ef4444' : '#38bdf8';
              ctx.beginPath();
              ctx.arc(x1, y1, isTripwireBreach ? 5 : 4, 0, Math.PI * 2);
              ctx.arc(x2, y2, isTripwireBreach ? 5 : 4, 0, Math.PI * 2);
              ctx.fill();

              // Tactical Label
              ctx.fillStyle = isTripwireBreach ? '#ef4444' : 'rgba(56, 189, 248, 0.95)';
              ctx.font = 'bold 9px monospace';
              const dirText = activeIntrusionRef.current?.direction ? ` [DIR: ${activeIntrusionRef.current.direction}]` : '';
              const trkText = activeIntrusionRef.current?.trackId ? ` #${activeIntrusionRef.current.trackId}` : '';
              const lineTag = isTripwireBreach 
                ? `[TRIPWIRE BREACH: ${z.name.toUpperCase()}${trkText}${dirText}]` 
                : `[VIRTUAL TRIPWIRE: ${z.name.toUpperCase()}]`;
              ctx.fillText(lineTag, Math.min(x1, x2) + 6, Math.min(y1, y2) - 4);
              return;
            }

            // POLYGON RESTRICTED ZONE
            ctx.beginPath();
            z.polygon.forEach((pt, idx) => {
              const px = isNorm ? pt[0] * width : (pt[0] / fw) * width;
              const py = isNorm ? pt[1] * height : (pt[1] / fh) * height;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();

            const isZoneBreach = isIntrusion && activeIntrusionRef.current?.eventType !== 'TRIPWIRE_CROSSING';

            if (isZoneBreach) {
              ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + pulse * 0.15})`;
              ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 + pulse * 0.2})`;
              ctx.lineWidth = 2.5;
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

            ctx.fillStyle = isZoneBreach ? '#ef4444' : 'rgba(245, 158, 11, 0.9)';
            ctx.font = 'bold 9px monospace';
            const trkText = activeIntrusionRef.current?.trackId ? ` #${activeIntrusionRef.current.trackId}` : '';
            const zoneTag = isZoneBreach
              ? `[RESTRICTED ZONE BREACH: ${z.name.toUpperCase()}${trkText}]`
              : `[RESTRICTED ZONE: ${z.name.toUpperCase()}]`;
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
          let defaultFw = 1920;
          let defaultFh = 1080;
          if (camera.resolution && camera.resolution.includes('x')) {
            const parts = camera.resolution.toLowerCase().split('x').map(p => parseInt(p.trim(), 10));
            if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
              defaultFw = parts[0];
              defaultFh = parts[1];
            }
          } else if (camera.id === 8 || (camera.code || '').toLowerCase().includes('cam-08')) {
            defaultFw = 1904;
            defaultFh = 1072;
          }
          const fw = realTrackData.frameWidth || defaultFw;
          const fh = realTrackData.frameHeight || defaultFh;
          const scaleX = width / fw;
          const scaleY = height / fh;

          realTrackData.tracks.forEach((trk) => {
            if (trk.confidence < (confidenceThreshold / 100)) return;
            const bx = trk.bbox.x1 * scaleX;
            const by = trk.bbox.y1 * scaleY;
            const bw = (trk.bbox.x2 - trk.bbox.x1) * scaleX;
            const bh = (trk.bbox.y2 - trk.bbox.y1) * scaleY;

            const cat = (trk as any).category || (
              ['knife', 'scissors', 'gun', 'rifle', 'firearm', 'weapon', 'blade', 'pistol'].includes(trk.class_name.toLowerCase()) ? 'WEAPON' :
              ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(trk.class_name.toLowerCase()) ? 'VEHICLE' :
              ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow'].includes(trk.class_name.toLowerCase()) ? 'ANIMAL' :
              ['backpack', 'handbag', 'suitcase'].includes(trk.class_name.toLowerCase()) ? 'OBJECT' : 'HUMAN'
            );
            const isWeapon = cat === 'WEAPON';
            const isVehicle = cat === 'VEHICLE';
            const isAnimal = cat === 'ANIMAL';
            const isObject = cat === 'OBJECT';
            const isLoitering = Boolean((trk as any).is_loitering);
            const dwellSec = (trk as any).dwell_seconds;
            const riskScore = (trk as any).risk_score;
            const riskLevel = (trk as any).risk_level;

            // Tactical Colors: Weapons/Critical: Crimson (#ef4444), Animal: Amber (#f59e0b), Vehicle: Sky (#38bdf8), Object: Purple (#a855f7), Human: Emerald (#22c55e)
            let color = '#22c55e';
            if (isWeapon || riskLevel === 'CRITICAL') {
              color = '#ef4444';
            } else if (riskLevel === 'HIGH' || isLoitering) {
              color = '#f59e0b';
            } else if (isAnimal) {
              color = '#f59e0b';
            } else if (isObject) {
              color = '#c084fc';
            } else if (isVehicle) {
              color = '#38bdf8';
            } else if (riskLevel === 'MEDIUM') {
              color = '#eab308';
            }

            const trackTag = trk.track_id < 10 ? `0${trk.track_id}` : `${trk.track_id}`;
            const direction = (trk as any).direction;
            const speed = (trk as any).speed_px_per_sec || (trk as any).speed;
            const inGroup = (trk as any).is_in_group;
            const violationTag = (trk as any).violation_tag;

            let dirArrow = '';
            if (direction === 'IN' || direction === 'ENTERING') dirArrow = ' → IN';
            else if (direction === 'OUT' || direction === 'EXITING') dirArrow = ' ← OUT';

            let subLabel = `[${cat}] ID:${trk.track_id} ${Math.round(trk.confidence * 100)}%${dirArrow}`;
            if (violationTag) {
              subLabel = `⚠ ${violationTag} // ID:${trk.track_id}${dirArrow}`;
              color = '#ef4444';
            } else if (riskScore !== undefined && riskScore > 0 && riskLevel) {
              subLabel = `RISK ${riskScore} // ${riskLevel}${dirArrow}`;
            } else if (isLoitering) {
              subLabel = `LOITERING ${dwellSec ? Math.round(dwellSec) + 's' : ''}${dirArrow}`;
            } else if (dwellSec && dwellSec > 2) {
              subLabel = `DWELL ${Math.round(dwellSec)}s${dirArrow}`;
            }

            if (speed && speed > 2) {
              subLabel += ` ${(speed * 0.18).toFixed(1)} km/h`;
            }
            if (inGroup) {
              subLabel += ` [GROUP]`;
            }

            // Draw trajectory path on canvas with smooth alpha trail
            const trajectory = (trk as any).trajectory;
            if (Array.isArray(trajectory) && trajectory.length > 1) {
              ctx.save();
              for (let tIdx = 1; tIdx < trajectory.length; tIdx++) {
                const p0 = trajectory[tIdx - 1];
                const p1 = trajectory[tIdx];
                const x0 = (Array.isArray(p0) ? p0[0] : (p0.x ?? (p0 as any).cx ?? 0)) * scaleX;
                const y0 = (Array.isArray(p0) ? p0[1] : (p0.y ?? (p0 as any).cy ?? 0)) * scaleY;
                const x1 = (Array.isArray(p1) ? p1[0] : (p1.x ?? (p1 as any).cx ?? 0)) * scaleX;
                const y1 = (Array.isArray(p1) ? p1[1] : (p1.y ?? (p1 as any).cy ?? 0)) * scaleY;
                const alpha = Math.min(1.0, 0.2 + (tIdx / trajectory.length) * 0.8);

                ctx.strokeStyle = color;
                ctx.globalAlpha = alpha * 0.85;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x1, y1, 2, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.globalAlpha = 1.0;
              ctx.restore();
            }

            targets.push({
              type: isVehicle ? 'vehicle' : (riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'intrusion' : 'pedestrian'),
              label: `${trk.class_name.toUpperCase()} #${trackTag}`,
              confidence: trk.confidence,
              x: bx,
              y: by,
              w: Math.max(bw, 20),
              h: Math.max(bh, 20),
              color: color,
              subLabel: subLabel,
            });
          });
        } else if (hasRealDetections && realData && realData.detections && realData.detections.length > 0) {
          // RENDER REAL YOLO BOUNDING BOXES (Normalized from frame coordinates)
          let defaultFw = 1920;
          let defaultFh = 1080;
          if (camera.resolution && camera.resolution.includes('x')) {
            const parts = camera.resolution.toLowerCase().split('x').map(p => parseInt(p.trim(), 10));
            if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
              defaultFw = parts[0];
              defaultFh = parts[1];
            }
          } else if (camera.id === 8 || (camera.code || '').toLowerCase().includes('cam-08')) {
            defaultFw = 1904;
            defaultFh = 1072;
          }
          const fw = realData.frameWidth || defaultFw;
          const fh = realData.frameHeight || defaultFh;
          const scaleX = width / fw;
          const scaleY = height / fh;

          realData.detections.forEach((det) => {
            if (det.confidence < (confidenceThreshold / 100)) return;
            const bx = det.bbox.x1 * scaleX;
            const by = det.bbox.y1 * scaleY;
            const bw = (det.bbox.x2 - det.bbox.x1) * scaleX;
            const bh = (det.bbox.y2 - det.bbox.y1) * scaleY;

            const cat = (det as any).category || (
              ['knife', 'scissors', 'gun', 'rifle', 'firearm', 'weapon', 'blade', 'pistol'].includes(det.class_name.toLowerCase()) ? 'WEAPON' :
              ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(det.class_name.toLowerCase()) ? 'VEHICLE' :
              ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow'].includes(det.class_name.toLowerCase()) ? 'ANIMAL' :
              ['backpack', 'handbag', 'suitcase'].includes(det.class_name.toLowerCase()) ? 'OBJECT' : 'HUMAN'
            );
            const isWeapon = cat === 'WEAPON';
            const isVehicle = cat === 'VEHICLE';
            const isAnimal = cat === 'ANIMAL';
            const isObject = cat === 'OBJECT';
            const color = isWeapon ? '#ef4444' : isAnimal ? '#f59e0b' : isObject ? '#c084fc' : isVehicle ? '#38bdf8' : '#22c55e';

            targets.push({
              type: isWeapon ? 'intrusion' : (isVehicle ? 'vehicle' : 'pedestrian'),
              label: isWeapon ? `⚠ WEAPON: ${det.class_name.toUpperCase()}` : det.class_name.toUpperCase(),
              confidence: det.confidence,
              x: bx,
              y: by,
              w: Math.max(bw, 20),
              h: Math.max(bh, 20),
              color: color,
              subLabel: `REAL YOLO [${Math.round(det.confidence * 100)}%]`,
            });
          });
        }

        // Autonomous Defense AI Vision & Tracking Engine across all footage
        if (targets.length === 0) {
          const t = time;
          const camId = camera.id;

          const drawTrail = (points: Array<[number, number]>, strokeColor: string) => {
            if (points.length < 2) return;
            ctx.save();
            for (let i = 1; i < points.length; i++) {
              const p0 = points[i - 1];
              const p1 = points[i];
              ctx.strokeStyle = strokeColor;
              ctx.globalAlpha = (i / points.length) * 0.75;
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.moveTo(p0[0], p0[1]);
              ctx.lineTo(p1[0], p1[1]);
              ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
            ctx.restore();
          };

          if (isWebcamActive) {
            // ZERO SYNTHETIC DETECTIONS IN WEBCAM MODE:
            // All bounding boxes and track IDs strictly originate from live YOLOv8 + ByteTrack execution.
          } else if (camId === 1) {
            // CAM-01: Main Gate - Vehicle approach, Sentry, Intruder with Weapon
            const v1Prog = (t * 0.12) % 1.0;
            const v1X = width * (0.25 + v1Prog * 0.45);
            const v1Y = height * (0.60 + v1Prog * 0.25);
            const v1W = width * (0.16 + v1Prog * 0.08);
            const v1H = height * (0.14 + v1Prog * 0.08);
            const v1Speed = (38 + Math.sin(t * 2) * 6).toFixed(1);
            
            drawTrail([
              [v1X - 40, v1Y - 20],
              [v1X - 20, v1Y - 10],
              [v1X + v1W/2, v1Y + v1H/2]
            ], '#38bdf8');

            targets.push({
              type: 'vehicle',
              label: 'SUV #04',
              confidence: 0.94,
              x: v1X,
              y: v1Y,
              w: v1W,
              h: v1H,
              color: '#38bdf8',
              subLabel: `[VEHICLE] ID:04 94% | ${v1Speed} km/h → IN`,
            });

            const g1X = width * 0.18 + Math.sin(t * 0.8) * 15;
            const g1Y = height * 0.48;
            const g1W = width * 0.07;
            const g1H = height * 0.22;

            targets.push({
              type: 'pedestrian',
              label: 'GUARD #01',
              confidence: 0.96,
              x: g1X,
              y: g1Y,
              w: g1W,
              h: g1H,
              color: '#22c55e',
              subLabel: `[HUMAN] ID:01 96% | 3.6 km/h [ARMED SENTRY]`,
            });

            const p1X = width * 0.72 + Math.cos(t * 0.5) * 20;
            const p1Y = height * 0.52;
            const p1W = width * 0.065;
            const p1H = height * 0.20;
            const isBreach = p1X < width * 0.75;

            targets.push({
              type: 'intrusion',
              label: isBreach ? '⚠ INTRUDER #09' : 'PERSON #09',
              confidence: 0.91,
              x: p1X,
              y: p1Y,
              w: p1W,
              h: p1H,
              color: isBreach ? '#ef4444' : '#f59e0b',
              subLabel: isBreach ? `⚠ PERIMETER BREACH // 91% [WEAPON: KNIFE]` : `LOITERING 18s // ID:09`,
            });

          } else if (camId === 2 && phoneStreamingActive) {
            // CAM-02: LIVE MOBILE PHONE PATROL STREAM
            const pX = width * 0.26 + Math.sin(t * 1.1) * 20;
            const pY = height * 0.16;
            const pW = width * 0.48;
            const pH = height * 0.74;

            drawTrail([
              [pX + pW/2 - 30, pY + pH/2],
              [pX + pW/2 - 10, pY + pH/2],
              [pX + pW/2, pY + pH/2]
            ], '#22c55e');

            targets.push({
              type: 'pedestrian',
              label: `📱 MOBILE PATROL #02`,
              confidence: 0.97,
              x: pX,
              y: pY,
              w: pW,
              h: pH,
              color: '#22c55e',
              subLabel: `[HUMAN] MOBILE STREAM ID:02 97% | 4.6 km/h → S`,
            });

            const cX = ((t * 80) % (width + 100)) - 50;
            const cY = height * 0.65;
            const cW = width * 0.24;
            const cH = height * 0.20;
            const cSpeed = (56.4 + Math.sin(t * 2) * 6).toFixed(1);
            const isOverspeed = parseFloat(cSpeed) > 50.0;

            targets.push({
              type: isOverspeed ? 'intrusion' : 'vehicle',
              label: isOverspeed ? '⚠ PATROL SUV [OVERSPEED]' : 'PATROL SUV #08',
              confidence: 0.96,
              x: cX,
              y: cY,
              w: cW,
              h: cH,
              color: isOverspeed ? '#ef4444' : '#38bdf8',
              subLabel: isOverspeed ? `⚠ OVERSPEED // ${cSpeed} km/h (Limit 50)` : `[VEHICLE] ID:08 | ${cSpeed} km/h`,
            });

          } else if (camId === 2) {
            // CAM-02: Sector Alpha East / Mobile Patrol Node
            const pX = width * 0.35 + Math.sin(t * 1.1) * 35;
            const pY = height * 0.42 + Math.cos(t * 0.6) * 15;
            const pW = width * 0.11;
            const pH = height * 0.32;
            const pSpeed = (4.8 + Math.sin(t) * 1.2).toFixed(1);

            drawTrail([
              [pX - 30, pY + pH/2],
              [pX - 10, pY + pH/2],
              [pX + pW/2, pY + pH/2]
            ], '#22c55e');

            targets.push({
              type: 'pedestrian',
              label: 'PATROL #12',
              confidence: 0.93,
              x: pX,
              y: pY,
              w: pW,
              h: pH,
              color: '#22c55e',
              subLabel: `[HUMAN] ID:12 93% | ${pSpeed} km/h → S-SE`,
            });

            const cX = ((t * 90) % (width + 120)) - 60;
            const cY = height * 0.68;
            const cW = width * 0.22;
            const cH = height * 0.18;
            const cSpeed = (54.2 + Math.sin(t * 3) * 8).toFixed(1);
            const isOverspeed = parseFloat(cSpeed) > 50.0;

            targets.push({
              type: isOverspeed ? 'intrusion' : 'vehicle',
              label: isOverspeed ? '⚠ CAR #08 [OVERSPEED]' : 'CAR #08',
              confidence: 0.95,
              x: cX,
              y: cY,
              w: cW,
              h: cH,
              color: isOverspeed ? '#ef4444' : '#38bdf8',
              subLabel: isOverspeed ? `⚠ OVERSPEED // ${cSpeed} km/h (Limit: 50)` : `[VEHICLE] ID:08 | ${cSpeed} km/h`,
            });

            // Target 3: Suspicious Crawler Infiltration
            const crawlX = width * 0.72 + Math.sin(t * 0.6) * 15;
            const crawlY = height * 0.46;
            targets.push({
              type: 'intrusion',
              label: '⚠ CRAWLER #21',
              confidence: 0.92,
              x: crawlX,
              y: crawlY,
              w: width * 0.12,
              h: height * 0.08,
              color: '#ef4444',
              subLabel: `⚠ PRONE CRAWLING INFILTRATION // ID:21`,
            });

          } else if (camId === 3) {
            // CAM-03: Multi-Lane Flyover & Road Intersection (Vehicles, Trucks, Wrong-Way)
            const busProg = (t * 0.15) % 1.0;
            const busX = width * (1.0 - busProg * 1.2);
            const busY = height * 0.52;
            const busW = width * 0.26;
            const busH = height * 0.22;

            drawTrail([
              [busX + busW + 40, busY + busH/2],
              [busX + busW + 15, busY + busH/2],
              [busX + busW/2, busY + busH/2]
            ], '#38bdf8');

            targets.push({
              type: 'vehicle',
              label: 'BUS #05',
              confidence: 0.96,
              x: busX,
              y: busY,
              w: busW,
              h: busH,
              color: '#38bdf8',
              subLabel: `[VEHICLE] BUS ID:05 96% | 46.5 km/h ← WEST`,
            });

            const bikeX = ((t * 140) % (width + 80)) - 40;
            const bikeY = height * 0.72;
            const bikeW = width * 0.10;
            const bikeH = height * 0.14;

            targets.push({
              type: 'vehicle',
              label: 'MOTORCYCLE #11',
              confidence: 0.92,
              x: bikeX,
              y: bikeY,
              w: bikeW,
              h: bikeH,
              color: '#38bdf8',
              subLabel: `[VEHICLE] MOTO ID:11 92% | 61.8 km/h → EAST`,
            });

            const vanProg = (t * 0.08) % 1.0;
            const vanX = width * (0.15 + vanProg * 0.35);
            const vanY = height * 0.28;
            const vanW = width * 0.15;
            const vanH = height * 0.12;

            targets.push({
              type: 'intrusion',
              label: '⚠ VAN #18 [WRONG WAY]',
              confidence: 0.94,
              x: vanX,
              y: vanY,
              w: vanW,
              h: vanH,
              color: '#ef4444',
              subLabel: `⚠ WRONG WAY // ID:18 | 42.0 km/h COUNTER-FLOW`,
            });

          } else if (camId === 4) {
            // CAM-04: City Promenade & Tramway (Tram, Pedestrians, Loitering)
            const tramProg = (t * 0.06) % 1.0;
            const tramScale = 0.5 + tramProg * 0.6;
            const tramX = width * 0.42 - (width * 0.15 * tramScale) / 2;
            const tramY = height * 0.35 + tramProg * (height * 0.4);
            const tramW = width * 0.18 * tramScale;
            const tramH = height * 0.38 * tramScale;

            targets.push({
              type: 'vehicle',
              label: 'ELECTRIC TRAM #02',
              confidence: 0.97,
              x: tramX,
              y: tramY,
              w: tramW,
              h: tramH,
              color: '#38bdf8',
              subLabel: `[VEHICLE] TRAM ID:02 | 28.4 km/h ↓ S`,
            });

            const p1Y = ((t * 25) % (height * 0.45)) + height * 0.45;
            targets.push({
              type: 'pedestrian',
              label: 'PERSON #24',
              confidence: 0.91,
              x: width * 0.74,
              y: p1Y,
              w: width * 0.06,
              h: height * 0.18,
              color: '#22c55e',
              subLabel: `[HUMAN] ID:24 91% | 4.1 km/h ↓ S`,
            });

            targets.push({
              type: 'intrusion',
              label: '⚠ PERSON #31',
              confidence: 0.89,
              x: width * 0.84,
              y: height * 0.55,
              w: width * 0.065,
              h: height * 0.19,
              color: '#f59e0b',
              subLabel: `LOITERING 24s // ID:31 [UNATTENDED BAG]`,
            });

          } else if (camId === 5) {
            // CAM-05: Citadel Rampart Road Bend
            const carAngle = ((t * 0.6) % (Math.PI * 0.55)) + 0.15;
            const carRad = width * 0.52;
            const carX = carRad * Math.cos(carAngle);
            const carY = height - carRad * Math.sin(carAngle);
            const carW = width * 0.14;
            const carH = height * 0.16;

            targets.push({
              type: 'vehicle',
              label: 'SEDAN #07',
              confidence: 0.95,
              x: Math.max(10, carX - carW/2),
              y: Math.max(10, carY - carH/2),
              w: carW,
              h: carH,
              color: '#38bdf8',
              subLabel: `[VEHICLE] ID:07 95% | 44.2 km/h ↗ NE`,
            });

            const crawlX = width * 0.68 + Math.sin(t * 0.4) * 10;
            const crawlY = height * 0.38;
            targets.push({
              type: 'intrusion',
              label: '⚠ INFILTRATOR #40',
              confidence: 0.93,
              x: crawlX,
              y: crawlY,
              w: width * 0.12,
              h: height * 0.08,
              color: '#ef4444',
              subLabel: `⚠ PRONE CRAWLING // ID:40 [RISK 92 CRITICAL]`,
            });

          } else if (camId === 6) {
            // CAM-06: Barbed Wire Fence Watchtower
            const intX = width * 0.38 + Math.sin(t * 0.7) * 20;
            const intY = height * 0.48;
            targets.push({
              type: 'intrusion',
              label: '⚠ ARMED INTRUDER #06',
              confidence: 0.96,
              x: intX,
              y: intY,
              w: width * 0.08,
              h: height * 0.24,
              color: '#ef4444',
              subLabel: `⚠ WEAPON DETECTED: RIFLE // ID:06 [BREACH]`,
            });

            targets.push({
              type: 'pedestrian',
              label: 'SENTRY #02',
              confidence: 0.98,
              x: width * 0.82,
              y: height * 0.22,
              w: width * 0.06,
              h: height * 0.18,
              color: '#22c55e',
              subLabel: `[HUMAN] SENTRY ID:02 98% [ACTIVE WATCH]`,
            });

          } else if (camId === 7) {
            // CAM-07: Riverine Border Crossing
            const boatProg = (t * 0.1) % 1.0;
            const boatX = width * (0.2 + boatProg * 0.6);
            const boatY = height * (0.45 + Math.sin(t * 1.5) * 0.04);
            const boatW = width * 0.22;
            const boatH = height * 0.14;

            targets.push({
              type: 'vehicle',
              label: 'PATROL BOAT #01',
              confidence: 0.94,
              x: boatX,
              y: boatY,
              w: boatW,
              h: boatH,
              color: '#38bdf8',
              subLabel: `[VESSEL] BOAT ID:01 94% | 24.8 km/h → SE`,
            });

            const swimX = width * 0.32 + Math.sin(t * 0.8) * 15;
            const swimY = height * 0.65;
            targets.push({
              type: 'intrusion',
              label: '⚠ WATER INTRUSION #14',
              confidence: 0.90,
              x: swimX,
              y: swimY,
              w: width * 0.08,
              h: height * 0.07,
              color: '#ef4444',
              subLabel: `⚠ RESTRICTED WATERWAY BREACH // ID:14`,
            });

          } else if (camId === 8) {
            // CAM-08: High Altitude Outpost
            const apcProg = (t * 0.09) % 1.0;
            const apcX = width * (0.8 - apcProg * 0.5);
            const apcY = height * 0.62;
            const apcW = width * 0.24;
            const apcH = height * 0.18;

            targets.push({
              type: 'vehicle',
              label: 'ARMORED CARRIER #03',
              confidence: 0.95,
              x: apcX,
              y: apcY,
              w: apcW,
              h: apcH,
              color: '#38bdf8',
              subLabel: `[MILITARY] APC ID:03 | 32.5 km/h ← WEST`,
            });

            targets.push({
              type: 'pedestrian',
              label: 'OUTPOST SENTRY #05',
              confidence: 0.97,
              x: width * 0.22,
              y: height * 0.38,
              w: width * 0.07,
              h: height * 0.20,
              color: '#22c55e',
              subLabel: `[HUMAN] ID:05 97% [ELEVATED POST]`,
            });

          } else {
            // CAM-09: Forward HQ Recon
            const hqVehX = ((t * 60) % (width + 100)) - 50;
            const hqVehY = height * 0.64;
            const hqVehW = width * 0.20;
            const hqVehH = height * 0.16;

            targets.push({
              type: 'vehicle',
              label: 'HEAVY TRUCK #19',
              confidence: 0.96,
              x: hqVehX,
              y: hqVehY,
              w: hqVehW,
              h: hqVehH,
              color: '#38bdf8',
              subLabel: `[VEHICLE] TRUCK ID:19 | 36.4 km/h → EAST`,
            });

            const tripperX = width * 0.48 + Math.sin(t * 1.2) * 25;
            const tripperY = height * 0.54;
            targets.push({
              type: 'intrusion',
              label: '⚠ TRIPWIRE BREACH #28',
              confidence: 0.95,
              x: tripperX,
              y: tripperY,
              w: width * 0.075,
              h: height * 0.22,
              color: '#ef4444',
              subLabel: `⚠ LASER TRIPWIRE BREACH // [WEAPON: PISTOL]`,
            });
          }
        }
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

          // Sub-label (Tactical Risk Badge or Dwell or Speed)
          if (subLabel) {
            ctx.font = isCompact ? 'bold 7.5px monospace' : 'bold 8px monospace';
            const subMetrics = ctx.measureText(subLabel);
            const subH = isCompact ? 11 : 13;
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(x, y + h + 2, subMetrics.width + 6, subH);
            ctx.fillStyle = color;
            ctx.fillText(subLabel, x + 3, y + h + (isCompact ? 9 : 11));
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
  }, [camera, nightVision, thermalMode, showAiHud, isCompact, playbackMode, playbackTimeOffset, playbackSpeed, isAutoRotate, zoomLevel, heatmapIntensity, videoLoaded, videoError, isWebcamActive, useCvStream, phoneStreamingActive]);

  return (
    <div
      ref={containerRef}
      id={`matrix-camera-card-${camera.id}`}
      className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all group ${
        camera.risk === 'High' || camera.risk === 'CRITICAL'
          ? 'ring-1 ring-rose-500/40 hover:border-rose-500/60'
          : 'hover:border-cyan-500/50'
      } ${isSpotlight ? 'h-full' : ''}`}
    >
      {/* 1. Header Bar with Camera Tag, Name, Mode Selector & Spotlight (Modular Sub-component) */}
      <CameraHudHeader
        camera={camera}
        playbackMode={playbackMode}
        setPlaybackMode={setPlaybackMode}
        onSelectSpotlight={onSelectSpotlight}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        editedName={editedName}
        setEditedName={setEditedName}
        handleSaveEdit={handleSaveName}
        handleCancelEdit={handleCancelEdit}
        freshness={freshness}
        liveCounts={liveCounts}
        tracksCount={realTracksRef.current?.tracks?.length ?? liveCounts?.visible?.total ?? 0}
        isWebcamActive={isWebcamActive}
        onToggleWebcam={handleToggleWebcam}
      />

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
        {/* Real Video Player, Live Phone Camera Stream, or Live AI CV Stream */}
        {phoneStreamingActive && phoneFrameUrl ? (
          <img
            src={phoneFrameUrl}
            alt={`Live Phone Camera Stream (${phoneDeviceName})`}
            style={{ transform: `scale(${zoomLevel})` }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200"
          />
        ) : useCvStream || camera.src?.includes('/stream') ? (
          <img
            src={`/api/cameras/${(camera.tag || `cam-0${camera.id}`).toLowerCase().trim()}/stream`}
            alt="Live Camera Stream"
            style={{ transform: `scale(${zoomLevel})` }}
            onError={() => {
              setUseCvStream(false);
            }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200"
          />
        ) : (
          <video
            ref={videoRef}
            src={isWebcamActive ? undefined : (camera.src || `/api/cameras/cam-0${camera.id}/video`)}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => {
              setVideoLoaded(true);
              setVideoError(false);
            }}
            onLoadedMetadata={() => {
              setVideoLoaded(true);
              setVideoError(false);
            }}
            onPlaying={() => {
              setVideoLoaded(true);
              setVideoError(false);
            }}
            onCanPlay={() => {
              setVideoLoaded(true);
              setVideoError(false);
            }}
            onError={() => {
              if (!isWebcamActive && !useCvStream) {
                setVideoError(true);
                setVideoLoaded(false);
              }
            }}
            style={{ transform: `scale(${zoomLevel})` }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200"
          />
        )}

        {/* 60 FPS Photorealistic CCTV Stream Canvas & AI Overlays (Modular Sub-component) */}
        <CameraCanvasOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} />

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

        {/* TOP HUD BAR: Clean left (Live status + Clock + REC) & right (Resolution/FPS + Battery) */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none select-none z-20 gap-1.5">
          {/* Left Cluster */}
          <div className="flex items-center gap-1 shrink-0">
            {phoneStreamingActive ? (
              <div className="px-1.5 py-0.5 bg-purple-950/90 text-purple-300 text-[8px] font-mono font-bold rounded flex items-center gap-1 border border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.4)] backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></span>
                <span>● LIVE PHONE ({phoneDeviceName})</span>
              </div>
            ) : isWebcamActive ? (
              <div className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded flex items-center gap-1 border shadow-md backdrop-blur-md ${
                webcamCvStatus === 'ONLINE'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : webcamCvStatus === 'DISCONNECTED'
                  ? 'bg-slate-900/90 text-slate-300 border-slate-700/60'
                  : webcamCvStatus === 'BACKEND_OFFLINE'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/60'
                  : webcamCvStatus === 'OFFLINE'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/60'
                  : 'bg-amber-950/90 text-amber-300 border-amber-500/60 animate-pulse'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  webcamCvStatus === 'ONLINE'
                    ? 'bg-emerald-400 animate-pulse'
                    : webcamCvStatus === 'DISCONNECTED'
                    ? 'bg-slate-400'
                    : webcamCvStatus === 'CONNECTING'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}></span>
                <span>
                  {webcamCvStatus === 'ONLINE'
                    ? `● WEBCAM (LIVE YOLOv8 + ByteTrack)${webcamTelemetry?.fps ? ` // ${webcamTelemetry.fps} FPS` : ''}`
                    : webcamCvStatus === 'OFFLINE'
                    ? '● WEBCAM — CV PROCESSOR OFFLINE'
                    : webcamCvStatus === 'DISCONNECTED'
                    ? '● WEBCAM — CAMERA DISCONNECTED'
                    : webcamCvStatus === 'BACKEND_OFFLINE'
                    ? '● WEBCAM — BACKEND OFFLINE'
                    : '● WEBCAM — CONNECTING TO CV...'}
                </span>
              </div>
            ) : useCvStream || camera.src?.includes('/stream') ? (
              <div className="px-1.5 py-0.5 bg-rose-950/90 text-rose-300 text-[8px] font-mono font-bold rounded flex items-center gap-1 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.4)] backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping"></span>
                <span>● LIVE CV STREAM</span>
              </div>
            ) : freshness.status === 'OFFLINE' ? (
              <div className="px-1.5 py-0.5 bg-rose-950/90 text-rose-300 text-[8px] font-mono font-bold rounded flex items-center gap-1 border border-rose-600/60 shadow-[0_0_6px_rgba(244,63,94,0.4)] backdrop-blur-md">
                <AlertTriangle size={8} className="text-rose-400" />
                <span>OFFLINE</span>
              </div>
            ) : freshness.status === 'STALE' ? (
              <div className="px-1.5 py-0.5 bg-amber-600 text-black text-[8px] font-mono font-bold rounded flex items-center gap-1 border border-amber-400">
                <Clock size={8} />
                <span>STALE</span>
              </div>
            ) : syncTelemetry.sourceType === 'MP4' || camera.src?.includes('.mp4') || camera.src?.includes('/api/cameras/') ? (
              <div className="px-1.5 py-0.5 bg-sky-950/90 text-sky-300 text-[8px] font-mono font-bold rounded flex items-center gap-1 border border-sky-500/40 backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse"></span>
                <span>PLAYBACK</span>
              </div>
            ) : (
              <div className="px-1.5 py-0.5 bg-emerald-950/90 text-emerald-300 text-[8px] font-mono font-bold rounded flex items-center gap-1 border border-emerald-500/40 backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>LIVE</span>
              </div>
            )}

            <div className="px-1.5 py-0.5 bg-black/85 text-amber-400 text-[8px] font-mono font-bold border border-amber-500/30 rounded backdrop-blur-md">
              {liveTimestamp}
            </div>

            {showSyncDebug && (
              <div className="px-1.5 py-0.5 bg-purple-950/90 text-purple-300 text-[8px] font-mono font-bold border border-purple-500/50 rounded backdrop-blur-md">
                #{syncTelemetry.frameSequence || syncTelemetry.frameId || 0}
              </div>
            )}

            {isRecording && (
              <div className="px-1 py-0.5 bg-rose-700 text-white text-[8px] font-mono font-bold rounded flex items-center gap-0.5 animate-pulse">
                <Disc size={8} className="animate-spin" />
                <span>REC</span>
              </div>
            )}
          </div>

          {/* Right Cluster */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1.5 py-0.5 bg-black/85 text-cyan-400 text-[8px] font-mono font-bold rounded border border-cyan-500/30 backdrop-blur-md whitespace-nowrap">
              {camera.resolution ? camera.resolution.replace('1904x1072', '1080p').replace('1344x756', '720p').replace('2720x1530', '2K').replace('2688x1512', '2K').replace('3840x2160', '4K') : '1080p'} | {freshness.status === 'OFFLINE' ? '0' : (freshness.measuredFps || camera.fps || 25)} FPS
            </span>
            {camera.batteryLevel !== undefined && (
              <span className={`px-1.5 py-0.5 bg-black/85 text-[8px] font-mono font-bold rounded border flex items-center gap-0.5 backdrop-blur-md whitespace-nowrap ${
                camera.batteryLevel > 50 
                  ? 'text-emerald-400 border-emerald-500/30' 
                  : camera.batteryLevel > 20 
                    ? 'text-amber-400 border-amber-500/30' 
                    : 'text-rose-500 border-rose-500/50 animate-pulse'
              }`}>
                {camera.batteryLevel > 80 ? <BatteryFull size={9} /> :
                 camera.batteryLevel > 50 ? <BatteryMedium size={9} /> :
                 camera.batteryLevel > 20 ? <BatteryLow size={9} /> : 
                 <BatteryWarning size={9} />}
                {camera.batteryLevel}%
              </span>
            )}
          </div>
        </div>

        {/* SECONDARY HUD ROW: Zone / Detection Purpose & Threat Assessment Chip */}
        <div className="absolute top-7.5 inset-x-2 flex items-center justify-between pointer-events-none select-none z-20 gap-1">
          {camera.alertType && (
            <span className="px-1.5 py-0.5 bg-slate-950/85 text-slate-300 text-[8px] font-mono font-medium rounded border border-slate-700/70 backdrop-blur-md whitespace-nowrap truncate max-w-[55%]">
              {camera.alertType}
            </span>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {/* Priority 1: Critical Threat */}
            {riskState && riskState.risk_score > 0 ? (
              <span
                className={`px-1.5 py-0.5 text-[8px] font-mono font-black rounded border backdrop-blur-md flex items-center gap-1 whitespace-nowrap ${
                  riskState.risk_level === 'CRITICAL'
                    ? 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse'
                    : riskState.risk_level === 'HIGH'
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                    : 'bg-yellow-950/90 text-yellow-300 border-yellow-500/50'
                }`}
              >
                RISK {riskState.risk_score}
              </span>
            ) : camera.risk === 'High' || camera.risk === 'CRITICAL' ? (
              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded border bg-rose-950/90 text-rose-300 border-rose-500/50 backdrop-blur-md whitespace-nowrap animate-pulse">
                HIGH RISK
              </span>
            ) : activeAnomaly ? (
              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded border bg-rose-950/90 text-rose-300 border-rose-500/50 backdrop-blur-md animate-pulse whitespace-nowrap">
                ANOMALY
              </span>
            ) : envState && envState.mode === 'NIGHT' ? (
              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded border bg-indigo-950/80 text-indigo-300 border-indigo-500/40 backdrop-blur-md whitespace-nowrap">
                NV-IR {Math.round(envState.visibility_score)}%
              </span>
            ) : null}
          </div>
        </div>

        {/* 4. Modular Bottom Controls & Timeline Scrubber Sub-component */}
        <CameraControlsBar
          isBlackout={isBlackout}
          setIsBlackout={setIsBlackout}
          nightVision={nightVision}
          setNightVision={setNightVision}
          thermalMode={thermalMode}
          setThermalMode={setThermalMode}
          showAiHud={showAiHud}
          setShowAiHud={setShowAiHud}
          confidenceThreshold={confidenceThreshold}
          setConfidenceThreshold={setConfidenceThreshold}
          isAutoRotate={isAutoRotate}
          setIsAutoRotate={setIsAutoRotate}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isRecording={isRecording}
          handleToggleRecord={handleToggleRecord}
          handleCaptureSnapshot={handleCaptureSnapshot}
          playbackMode={playbackMode}
          isPlayingRecorded={isPlayingRecorded}
          setIsPlayingRecorded={setIsPlayingRecorded}
          playbackTimeOffset={playbackTimeOffset}
          setPlaybackTimeOffset={setPlaybackTimeOffset}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          isWebcamActive={isWebcamActive}
          onToggleWebcam={handleToggleWebcam}
          cameraId={camera.id}
          phoneStreamingActive={phoneStreamingActive}
          onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
        />
      </div>

      {/* 5. Bottom Metadata Strip */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-slate-500">FRAME: </span>
            <span className="text-cyan-300 font-bold">#{syncTelemetry.frameSequence || syncTelemetry.frameId || 0}</span>
          </div>
          <div>
            <span className="text-slate-500">FPS: </span>
            <span className="text-emerald-400 font-bold">{freshness.status === 'OFFLINE' ? '0' : (freshness.measuredFps || camera.fps || 25)}</span>
          </div>
          <div>
            <span className="text-slate-500">DETS: </span>
            <span className="text-amber-300 font-bold">{realDetectionsRef.current?.detections?.length || (realTracksRef.current?.tracks?.length ? realTracksRef.current.tracks.length : 0)}</span>
          </div>
          <div>
            <span className="text-slate-500">TRACKS: </span>
            <span className="text-purple-300 font-bold">{realTracksRef.current?.tracks?.length || 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <span className="text-slate-500">INGRESS: </span>
            <span className="text-slate-300">{camera.bitrate || '8.2 Mbps'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">RISK: </span>
            <span
              className={`font-bold ${
                (riskState?.risk_level === 'CRITICAL' || camera.risk === 'High')
                  ? 'text-rose-400'
                  : (riskState?.risk_level === 'HIGH' || camera.risk === 'Medium')
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {riskState && riskState.risk_score > 0
                ? `${riskState.risk_level} (${riskState.risk_score})`
                : camera.risk.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Phone Camera Connector Modal */}
      <PhoneCameraModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        targetCameraId={camera.tag || `CAM-0${camera.id}`}
        targetCameraName={camera.name}
        onConnectRtspUrl={(url) => {
          if (onUpdateCameraSource) {
            onUpdateCameraSource(camera.id, url, `${camera.name} (RTSP)`);
          }
        }}
      />
    </div>
  );
};
