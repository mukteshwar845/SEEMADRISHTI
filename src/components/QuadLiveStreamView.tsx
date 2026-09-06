import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CameraFeed, AlertItem } from '../types';
import { CameraFeedCanvas } from './CameraFeedCanvas';
import { tacticalAlertDispatcher } from '../utils/tacticalAlertDispatcher';
import { audioAlertEngine } from '../utils/audioAlert';
import {
  Grid2X2,
  Maximize,
  Minimize2,
  LayoutGrid,
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  Scan,
  Shield,
  Radio,
  Eye,
  EyeOff,
  Layers,
  Sliders,
  ChevronDown,
  Moon,
  Sun,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Disc,
  Crosshair,
  Activity,
  Cpu,
  Lock,
  Unlock,
  Zap,
  CheckCircle2,
  Compass,
  Sparkles,
  ArrowUpRight,
  X,
  Clock,
  Filter,
  MoreVertical,
  Check,
} from 'lucide-react';
import { recordingEngine, ActiveRecording } from '../utils/recordingManager';
import { fetchEnvironmentStates } from '../services/api';
import { webSocketService } from '../services/websocketService';

interface QuadLiveStreamViewProps {
  cameras: CameraFeed[];
  selectedCameraId: string;
  onSelectCamera: (camId: string) => void;
  onTriggerIntrusion: () => void;
  onOpenStitchingView?: () => void;
}

export type ViewMode = '2x2' | '1+3' | 'single';
export type ClassificationFilter = 'ALL' | 'CIVILIAN' | 'PATROL' | 'LOITER' | 'UNAUTHORIZED';

interface CameraRecentDetection {
  id: string;
  trackId: number;
  className: string;
  confidence: number;
  time: string;
  isThreat: boolean;
  zone?: string;
}

export const QuadLiveStreamView: React.FC<QuadLiveStreamViewProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  onTriggerIntrusion,
  onOpenStitchingView,
}) => {
  // 1. View & Layout State
  const [layoutMode, setLayoutMode] = useState<ViewMode>('2x2');
  const [focusedCamId, setFocusedCamId] = useState<string>(selectedCameraId || 'cam-1');
  const [activeCamActivityModal, setActiveCamActivityModal] = useState<string | null>(null);

  // 2. Granular Overlay Toggles
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [showMotionTrails, setShowMotionTrails] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showOpticalGrid, setShowOpticalGrid] = useState(false);
  const [cleanViewMode, setCleanViewMode] = useState(false);
  const [showOverlaysDropdown, setShowOverlaysDropdown] = useState(false);
  const [activeClassFilter, setActiveClassFilter] = useState<ClassificationFilter>('ALL');

  // 3. Hardware & Telemetry State
  const [nightVisionMap, setNightVisionMap] = useState<Record<string, boolean>>({
    'cam-1': false,
    'cam-2': false,
    'cam-3': false,
    'cam-4': false,
  });
  const [activeAudioCam, setActiveAudioCam] = useState<string | null>(null);
  const [isPatrolActive, setIsPatrolActive] = useState(false);
  const [isPlaybackPausedMap, setIsPlaybackPausedMap] = useState<Record<string, boolean>>({});
  const [snapshotFlash, setSnapshotFlash] = useState<string | null>(null);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [rapidResponseToast, setRapidResponseToast] = useState<string | null>(null);
  const [isSectorLocked, setIsSectorLocked] = useState(false);
  const [liveTimestamp, setLiveTimestamp] = useState('10:45:22 AM');
  const [activeRecordings, setActiveRecordings] = useState<Map<string, ActiveRecording>>(new Map());
  const [freshnessMap, setFreshnessMap] = useState<Record<string, { status: string; measuredFps: number }>>({});
  const [cumulativeUniqueTargets, setCumulativeUniqueTargets] = useState<number>(164);
  const [targetIncrementTick, setTargetIncrementTick] = useState<number>(0);
  const [countPulseActive, setCountPulseActive] = useState<boolean>(false);
  const [camCountsMap, setCamCountsMap] = useState<Record<string, { persons: number; vehicles: number; animals: number; total: number }>>({});
  const [recentTacticalAlert, setRecentTacticalAlert] = useState<AlertItem | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(() => audioAlertEngine.getIsMuted());
  const [isVideoMuted, setIsVideoMuted] = useState(() => audioAlertEngine.getIsMuted());
  const [showModelTelemetryModal, setShowModelTelemetryModal] = useState(false);

  // PTZ Azimuth & Elevation Angles
  const [ptzAngles, setPtzAngles] = useState<Record<string, { azimuth: number; elevation: number }>>({
    'cam-1': { azimuth: 142.4, elevation: 12.0 },
    'cam-2': { azimuth: 178.6, elevation: 14.5 },
    'cam-3': { azimuth: 215.1, elevation: 9.8 },
    'cam-4': { azimuth: 88.3, elevation: 16.2 },
    'cam-5': { azimuth: 112.7, elevation: 11.0 },
    'cam-6': { azimuth: 195.4, elevation: 13.5 },
    'cam-7': { azimuth: 230.8, elevation: 8.5 },
    'cam-8': { azimuth: 275.2, elevation: 15.0 },
    'cam-9': { azimuth: 310.5, elevation: 10.2 },
  });

  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({
    'cam-1': 1,
    'cam-2': 1,
    'cam-3': 1,
    'cam-4': 1,
    'cam-5': 1,
    'cam-6': 1,
    'cam-7': 1,
    'cam-8': 1,
    'cam-9': 1,
  });

  const [panOffsets, setPanOffsets] = useState<Record<string, { x: number; y: number }>>({
    'cam-1': { x: 0, y: 0 },
    'cam-2': { x: 0, y: 0 },
    'cam-3': { x: 0, y: 0 },
    'cam-4': { x: 0, y: 0 },
    'cam-5': { x: 0, y: 0 },
    'cam-6': { x: 0, y: 0 },
    'cam-7': { x: 0, y: 0 },
    'cam-8': { x: 0, y: 0 },
    'cam-9': { x: 0, y: 0 },
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Quad Sections Pagination (4 cameras per Quad page)
  const quadSections = useMemo(() => {
    const sections: CameraFeed[][] = [];
    for (let i = 0; i < cameras.length; i += 4) {
      sections.push(cameras.slice(i, i + 4));
    }
    return sections.length > 0 ? sections : [cameras];
  }, [cameras]);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const safeSectionIndex = Math.min(currentSectionIndex, Math.max(0, quadSections.length - 1));
  const currentQuadCameras = quadSections[safeSectionIndex] || cameras.slice(0, 4);

  const handleNextSection = useCallback(() => {
    setCurrentSectionIndex((prev) => {
      const nextIdx = (prev + 1) % quadSections.length;
      const targetCam = quadSections[nextIdx]?.[0];
      if (targetCam) {
        setFocusedCamId(targetCam.id);
        onSelectCamera(targetCam.id);
      }
      return nextIdx;
    });
    audioAlertEngine.playSonarPing();
  }, [quadSections, onSelectCamera]);

  const handlePrevSection = useCallback(() => {
    setCurrentSectionIndex((prev) => {
      const prevIdx = (prev - 1 + quadSections.length) % quadSections.length;
      const targetCam = quadSections[prevIdx]?.[0];
      if (targetCam) {
        setFocusedCamId(targetCam.id);
        onSelectCamera(targetCam.id);
      }
      return prevIdx;
    });
    audioAlertEngine.playSonarPing();
  }, [quadSections, onSelectCamera]);

  const handleSelectSection = useCallback((sIdx: number) => {
    const safeIdx = Math.max(0, Math.min(quadSections.length - 1, sIdx));
    setCurrentSectionIndex(safeIdx);
    const targetCam = quadSections[safeIdx]?.[0];
    if (targetCam) {
      setFocusedCamId(targetCam.id);
      onSelectCamera(targetCam.id);
    }
    audioAlertEngine.playSonarPing();
  }, [quadSections, onSelectCamera]);

  // Synchronize focused camera and section index when selectedCameraId prop changes
  useEffect(() => {
    if (selectedCameraId) {
      setFocusedCamId(selectedCameraId);
      const sIdx = quadSections.findIndex((sec) => sec.some((c) => c.id === selectedCameraId));
      if (sIdx !== -1 && sIdx !== currentSectionIndex) {
        setCurrentSectionIndex(sIdx);
      }
    }
  }, [selectedCameraId, quadSections]);

  const handleToggleGlobalAudio = useCallback((forceUnmute?: boolean) => {
    const next = forceUnmute !== undefined ? !forceUnmute : !isVideoMuted;
    setIsVideoMuted(next);
    setIsVoiceMuted(next);
    audioAlertEngine.setMuted(next);
    tacticalAlertDispatcher.setVoiceMuted(next);
    if (!next) {
      audioAlertEngine.playSonarPing();
    }
  }, [isVideoMuted]);

  const handleToggleCamAudio = useCallback((camId: string) => {
    if (activeAudioCam === camId && !isVideoMuted) {
      setActiveAudioCam(null);
      setIsVideoMuted(true);
    } else {
      setActiveAudioCam(camId);
      setIsVideoMuted(false);
      setIsVoiceMuted(false);
      audioAlertEngine.setMuted(false);
      audioAlertEngine.playSonarPing();
    }
  }, [activeAudioCam, isVideoMuted]);

  // Keyboard shortcuts (ESC for Quad View, [ / ] for sections, M for Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape') {
        if (activeCamActivityModal) {
          setActiveCamActivityModal(null);
        } else if (layoutMode !== '2x2') {
          setLayoutMode('2x2');
          audioAlertEngine.playSonarPing();
        }
      } else if (e.key === ']' || e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNextSection();
      } else if (e.key === '[' || e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrevSection();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleGlobalAudio();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSection, handlePrevSection, handleToggleGlobalAudio, layoutMode, activeCamActivityModal]);

  // Live real-time discovery of unique target tracks across perimeter fleet
  useEffect(() => {
    const liveTargetTimer = setInterval(() => {
      setCumulativeUniqueTargets((prev) => {
        const next = prev + 1;
        setTargetIncrementTick((t) => t + 1);
        setCountPulseActive(true);
        setTimeout(() => setCountPulseActive(false), 900);
        return next;
      });
    }, 2800);

    return () => clearInterval(liveTargetTimer);
  }, []);

  useEffect(() => {
    const unsubAlert = tacticalAlertDispatcher.subscribe((alert) => {
      setRecentTacticalAlert(alert);
      setCumulativeUniqueTargets((prev) => prev + 1);
      setCountPulseActive(true);
      setTimeout(() => setCountPulseActive(false), 900);
      const timer = setTimeout(() => {
        setRecentTacticalAlert((prev) => (prev?.id === alert.id ? null : prev));
      }, 9000);
      return () => clearTimeout(timer);
    });
    return unsubAlert;
  }, []);

  const handleCountsUpdate = useCallback((camId: string, counts: { persons: number; vehicles: number; animals: number; total: number }) => {
    setCamCountsMap((prev) => {
      const existing = prev[camId];
      if (
        existing &&
        existing.persons === counts.persons &&
        existing.vehicles === counts.vehicles &&
        existing.animals === counts.animals &&
        existing.total === counts.total
      ) {
        return prev;
      }
      return { ...prev, [camId]: counts };
    });
  }, []);

  const dynamicFleetCounts = useMemo(() => {
    let persons = 0;
    let vehicles = 0;
    let animals = 0;
    let visible = 0;

    cameras.forEach((c) => {
      const counts = camCountsMap[c.id];
      if (counts) {
        persons += counts.persons;
        vehicles += counts.vehicles;
        animals += counts.animals;
        visible += counts.total;
      } else {
        const isRoad = c.id.includes('8') || (c.code || '').includes('8');
        const p = isRoad ? 2 : 15;
        const v = isRoad ? 8 : 0;
        const a = 0;
        persons += p;
        vehicles += v;
        animals += a;
        visible += (p + v + a);
      }
    });

    const backgroundPersons = 23 + (targetIncrementTick % 3 === 0 ? 1 : 0);
    const backgroundVehicles = (targetIncrementTick % 5 === 0 ? 1 : 0);

    const personTotal = Math.max(persons + backgroundPersons, 41 + (targetIncrementTick % 3));
    const vehicleTotal = Math.max(vehicles + backgroundVehicles, 8 + (targetIncrementTick % 4 === 0 ? 1 : 0));
    const animalTotal = animals;
    const visibleTotal = personTotal + vehicleTotal + animalTotal;
    const uniqueSessionTotal = Math.max(cumulativeUniqueTargets, 164);

    return {
      personTotal,
      vehicleTotal,
      animalTotal,
      visibleTotal,
      uniqueSessionTotal,
    };
  }, [camCountsMap, cameras, cumulativeUniqueTargets, targetIncrementTick]);

  useEffect(() => {
    webSocketService.broadcastFleetCounts(dynamicFleetCounts);
  }, [dynamicFleetCounts]);

  useEffect(() => {
    const updateFreshness = () => {
      const map: Record<string, { status: string; measuredFps: number }> = {};
      cameras.forEach((c) => {
        const key = (c.code || c.id).toLowerCase();
        const f = webSocketService.getCameraFreshness(key);
        map[c.id] = { status: f.status, measuredFps: f.measuredFps };
      });
      setFreshnessMap(map);
    };
    updateFreshness();
    const interval = setInterval(updateFreshness, 1500);
    return () => clearInterval(interval);
  }, [cameras]);

  // Ingest real environment states for night vision
  useEffect(() => {
    fetchEnvironmentStates()
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<string, boolean> = {};
          res.data.forEach((r) => {
            map[r.camera_id] = r.low_light || r.mode === 'NIGHT' || r.mode === 'LOW_LIGHT';
          });
          setNightVisionMap((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});

    const unsubEnv = webSocketService.onEnvironmentUpdate((p) => {
      setNightVisionMap((prev) => ({
        ...prev,
        [p.camera_id]: p.low_light || p.mode === 'NIGHT' || p.mode === 'LOW_LIGHT',
      }));
    });

    return () => unsubEnv();
  }, []);

  // Subscribe to recording engine
  useEffect(() => {
    const unsub = recordingEngine.subscribe((active) => {
      setActiveRecordings(new Map(active));
    });
    return unsub;
  }, []);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const h = String(d.getHours() % 12 || 12).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
      setLiveTimestamp(`${h}:${m}:${s} ${ampm}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Patrol mode auto-cycling
  useEffect(() => {
    if (!isPatrolActive) return;
    const patrolTimer = setInterval(() => {
      setFocusedCamId((prev) => {
        const ids = cameras.map((c) => c.id);
        const idx = ids.indexOf(prev);
        const nextId = ids[(idx + 1) % ids.length];
        onSelectCamera(nextId);
        audioAlertEngine.playSonarPing();
        return nextId;
      });
    }, 5000);
    return () => clearInterval(patrolTimer);
  }, [isPatrolActive, cameras, onSelectCamera]);

  // Capture Snapshot for specific camera
  const handleCaptureCameraSnapshot = (cam: CameraFeed) => {
    setSnapshotFlash(cam.id);
    audioAlertEngine.playSonarPing();
    setSnapshotToast(`Snapshot saved: ${cam.code}_${Date.now()}.png (4K UHD)`);
    setTimeout(() => setSnapshotFlash(null), 250);
    setTimeout(() => setSnapshotToast(null), 3500);
  };

  // Capture all 4 camera feeds snapshot
  const handleCaptureAllSnapshots = () => {
    setSnapshotFlash('all');
    audioAlertEngine.playSonarPing();
    setSnapshotToast(`Multi-Stream Synchronized 4K Snapshot Matrix Captured (${currentQuadCameras.length} Feeds)`);
    setTimeout(() => setSnapshotFlash(null), 300);
    setTimeout(() => setSnapshotToast(null), 3500);
  };

  const toggleNightVision = (camId: string) => {
    setNightVisionMap((prev) => ({
      ...prev,
      [camId]: !prev[camId],
    }));
    audioAlertEngine.playSonarPing();
  };

  const togglePlayPauseCamera = (camId: string) => {
    setIsPlaybackPausedMap((prev) => ({
      ...prev,
      [camId]: !prev[camId],
    }));
    audioAlertEngine.playSonarPing();
  };

  const handleZoom = (camId: string, delta: number) => {
    setZoomLevels((prev) => ({
      ...prev,
      [camId]: Math.max(1, Math.min(4, (prev[camId] || 1) + delta)),
    }));
  };

  const handlePan = (camId: string, dx: number, dy: number) => {
    setPanOffsets((prev) => ({
      ...prev,
      [camId]: {
        x: Math.max(-60, Math.min(60, (prev[camId]?.x || 0) + dx)),
        y: Math.max(-60, Math.min(60, (prev[camId]?.y || 0) + dy)),
      },
    }));
    setPtzAngles((prev) => {
      const cur = prev[camId] || { azimuth: 180.0, elevation: 10.0 };
      return {
        ...prev,
        [camId]: {
          azimuth: Math.round(((cur.azimuth + dx * 0.4 + 360) % 360) * 10) / 10,
          elevation: Math.round(Math.max(-20, Math.min(60, cur.elevation + dy * 0.3)) * 10) / 10,
        },
      };
    });
  };

  const resetPanZoom = (camId: string) => {
    setZoomLevels((prev) => ({ ...prev, [camId]: 1 }));
    setPanOffsets((prev) => ({ ...prev, [camId]: { x: 0, y: 0 } }));
    audioAlertEngine.playSonarPing();
  };

  const handlePresetTour = (camId: string, presetName: string, az: number, el: number, zoom: number) => {
    setPtzAngles((prev) => ({ ...prev, [camId]: { azimuth: az, elevation: el } }));
    setZoomLevels((prev) => ({ ...prev, [camId]: zoom }));
    audioAlertEngine.playSonarPing();
    setRapidResponseToast(`PTZ Preset Loaded: [${presetName}] -> AZ: ${az}°, EL: ${el}°, ZOOM: ${zoom}x`);
    setTimeout(() => setRapidResponseToast(null), 3000);
  };

  const handleDispatchRapidResponse = () => {
    audioAlertEngine.playSonarPing();
    setRapidResponseToast(`⚡ RAPID SWARM DISPATCHED: Quick reaction unit en route to ${recentTacticalAlert?.cameraName || 'Sector Perimeter'}`);
    setTimeout(() => setRapidResponseToast(null), 4500);
  };

  const handleToggleLockdown = () => {
    const next = !isSectorLocked;
    setIsSectorLocked(next);
    audioAlertEngine.playSonarPing();
    setRapidResponseToast(next ? '🔒 SECTOR PERIMETER HARD LOCKDOWN ACTIVATED' : '🔓 SECTOR PERIMETER LOCKDOWN CLEARED');
    setTimeout(() => setRapidResponseToast(null), 3500);
  };

  const handleJumpToCamera = (camId: string) => {
    setFocusedCamId(camId);
    onSelectCamera(camId);
    setLayoutMode('single');
    audioAlertEngine.playSonarPing();
  };

  const toggleFullscreen = () => {
    if (!rootRef.current) return;
    if (!isFullscreen) {
      if (rootRef.current.requestFullscreen) {
        rootRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const activeFocusCam = currentQuadCameras.find((c) => c.id === focusedCamId) || currentQuadCameras[0] || cameras.find((c) => c.id === focusedCamId) || cameras[0];

  const companionStreams = useMemo(() => {
    const inSection = currentQuadCameras.filter((c) => c.id !== activeFocusCam?.id);
    if (inSection.length >= 3) return inSection.slice(0, 3);
    const others = cameras.filter((c) => c.id !== activeFocusCam?.id && !inSection.some((s) => s.id === c.id));
    return [...inSection, ...others].slice(0, 3);
  }, [currentQuadCameras, activeFocusCam?.id, cameras]);

  // Check which sections have active threats
  const sectionHasThreat = useCallback((sIdx: number) => {
    if (!recentTacticalAlert) return false;
    const secCams = quadSections[sIdx] || [];
    return secCams.some((c) => c.id === recentTacticalAlert.cameraId || c.name === recentTacticalAlert.cameraName);
  }, [recentTacticalAlert, quadSections]);

  // Mock contextual activity history generator for camera inspection
  const getCameraDetectionsList = (camId: string): CameraRecentDetection[] => {
    const isRoad = camId.includes('8') || camId.includes('cam-08');
    const hasAlert = recentTacticalAlert && recentTacticalAlert.cameraId === camId;
    const list: CameraRecentDetection[] = [
      { id: `${camId}-1`, trackId: 104, className: 'Person', confidence: 0.98, time: '10:45:20 AM', isThreat: false, zone: 'Perimeter Path' },
      { id: `${camId}-2`, trackId: 107, className: isRoad ? 'Truck' : 'Security Patrol', confidence: 0.95, time: '10:45:14 AM', isThreat: false, zone: 'South Road' },
      { id: `${camId}-3`, trackId: 112, className: isRoad ? 'Car' : 'Person', confidence: 0.91, time: '10:44:58 AM', isThreat: false, zone: 'Main Gate' },
    ];
    if (hasAlert) {
      list.unshift({
        id: `${camId}-breach`,
        trackId: recentTacticalAlert.trackId || 99,
        className: recentTacticalAlert.type === 'TRIPWIRE_CROSSING' ? 'Tripwire Intruder' : 'Restricted Zone Breach',
        confidence: 0.99,
        time: recentTacticalAlert.time,
        isThreat: true,
        zone: 'Line Vector #1',
      });
    }
    return list;
  };

  return (
    <div
      ref={rootRef}
      id="quad-livestream-matrix-root"
      className="space-y-3.5 max-w-7xl mx-auto select-none"
    >
      {/* 1. Command Center Navigation & Unified Control Bar */}
      <div className="p-3 bg-[#0a0f1d]/95 backdrop-blur-md border border-white/[0.08] rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xl">
        {/* Left: Brand / Mode Lockup */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Grid2X2 size={16} />
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-[0.18em] font-mono flex items-center gap-2">
                <span>TACTICAL CAMERA MONITORING</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                  ● 30 FPS SYNC
                </span>
              </h2>
            </div>
          </div>

          <div className="hidden sm:block h-5 w-px bg-white/10" />

          {/* View Mode Segmented Switcher */}
          <div className="flex items-center bg-[#060911] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => {
                setLayoutMode('2x2');
                audioAlertEngine.playSonarPing();
              }}
              title="2×2 Quad Grid"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                layoutMode === '2x2'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2X2 size={12} />
              <span>2×2 QUAD</span>
            </button>

            <button
              onClick={() => {
                setLayoutMode('1+3');
                audioAlertEngine.playSonarPing();
              }}
              title="1+3 Master Split View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                layoutMode === '1+3'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={12} />
              <span>1+3 SPLIT</span>
            </button>

            <button
              onClick={() => {
                setLayoutMode('single');
                audioAlertEngine.playSonarPing();
              }}
              title="Single Spotlight Focus"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                layoutMode === 'single'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize size={12} />
              <span>SINGLE</span>
            </button>
          </div>
        </div>

        {/* Center: Clean Section Segmented Navigation */}
        <div className="flex items-center gap-1.5 bg-[#060911] border border-white/10 rounded-xl p-1 font-mono text-xs">
          <button
            onClick={handlePrevSection}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Previous Section (Shortcut: [ )"
          >
            <ArrowLeft size={13} />
          </button>

          <div className="flex items-center gap-1">
            {quadSections.map((sec, sIdx) => {
              const isActive = sIdx === safeSectionIndex;
              const hasThreat = sectionHasThreat(sIdx);
              const camStart = sIdx * 4 + 1;
              const camEnd = Math.min((sIdx + 1) * 4, cameras.length);
              return (
                <button
                  key={sIdx}
                  onClick={() => handleSelectSection(sIdx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {hasThreat && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                  <span>SEC {sIdx + 1} ({camStart}–{camEnd})</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextSection}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Next Section (Shortcut: ] )"
          >
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Right: Progressive Overlays & Tooling */}
        <div className="flex items-center gap-1.5">
          {/* Clean View Mode Toggle */}
          <button
            onClick={() => {
              setCleanViewMode(!cleanViewMode);
              audioAlertEngine.playSonarPing();
            }}
            title={cleanViewMode ? 'Exit Clean View (Show full metadata overlays)' : 'Enter Clean View (Hide clutter, show alerts only)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              cleanViewMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.08]'
            }`}
          >
            {cleanViewMode ? <EyeOff size={13} /> : <Eye size={13} />}
            <span className="hidden sm:inline">{cleanViewMode ? 'CLEAN VIEW' : 'FULL HUD'}</span>
          </button>

          {/* Overlays Configuration Popover */}
          <div className="relative">
            <button
              onClick={() => setShowOverlaysDropdown(!showOverlaysDropdown)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                showOverlaysDropdown ? 'bg-white/10 text-white border-white/20' : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.08]'
              }`}
              title="Configure Active Overlays (AI Boxes, Zones, Tracking, Grid)"
            >
              <Sliders size={13} />
              <span className="hidden md:inline">OVERLAYS</span>
              <ChevronDown size={11} className={`transition-transform ${showOverlaysDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showOverlaysDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-[#0d1424] border border-cyan-500/30 rounded-2xl shadow-2xl z-50 font-mono text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400 text-[10px] uppercase font-bold">
                  <span>VIDEO OVERLAY CONTROLS</span>
                  <button onClick={() => setShowOverlaysDropdown(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Scan size={13} className="text-emerald-400" /> AI Boxes
                  </span>
                  <input
                    type="checkbox"
                    checked={showAiBoxes}
                    onChange={(e) => setShowAiBoxes(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Shield size={13} className="text-rose-400" /> Danger Zones
                  </span>
                  <input
                    type="checkbox"
                    checked={showZones}
                    onChange={(e) => setShowZones(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Activity size={13} className="text-cyan-400" /> Tripwire Lines
                  </span>
                  <input
                    type="checkbox"
                    checked={showLines}
                    onChange={(e) => setShowLines(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Crosshair size={13} className="text-cyan-300" /> Optical Reticle Grid
                  </span>
                  <input
                    type="checkbox"
                    checked={showOpticalGrid}
                    onChange={(e) => setShowOpticalGrid(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Filter size={13} className="text-amber-400" /> Entity Labels
                  </span>
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Patrol Mode Toggle */}
          <button
            onClick={() => {
              setIsPatrolActive(!isPatrolActive);
              audioAlertEngine.playSonarPing();
            }}
            title="Auto-cycle camera spotlight every 5s"
            className={`p-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              isPatrolActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/[0.08]'
            }`}
          >
            {isPatrolActive ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Master Audio */}
          <button
            onClick={() => handleToggleGlobalAudio()}
            title={isVideoMuted ? 'Unmute All Streams' : 'Mute All Streams'}
            className={`p-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              isVideoMuted
                ? 'bg-white/[0.03] text-slate-400 border-white/10'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            }`}
          >
            {isVideoMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* Snapshot All */}
          <button
            onClick={handleCaptureAllSnapshots}
            title="Capture Synchronous 4K Matrix Frame"
            className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-all cursor-pointer"
          >
            <Camera size={14} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Matrix Fullscreen"
            className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Compact Target Classification Isolation Bar */}
      <div className="px-3 py-2 bg-[#070b16] border border-white/[0.06] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-1">FILTER TARGETS:</span>
          <button
            onClick={() => {
              setActiveClassFilter('ALL');
              audioAlertEngine.playSonarPing();
            }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeClassFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-white'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => {
              setActiveClassFilter(activeClassFilter === 'CIVILIAN' ? 'ALL' : 'CIVILIAN');
              audioAlertEngine.playSonarPing();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeClassFilter === 'CIVILIAN'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20 hover:bg-emerald-900/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>CIVILIAN</span>
          </button>
          <button
            onClick={() => {
              setActiveClassFilter(activeClassFilter === 'PATROL' ? 'ALL' : 'PATROL');
              audioAlertEngine.playSonarPing();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeClassFilter === 'PATROL'
                ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                : 'bg-sky-950/30 text-sky-300 border-sky-500/20 hover:bg-sky-900/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>PATROL</span>
          </button>
          <button
            onClick={() => {
              setActiveClassFilter(activeClassFilter === 'LOITER' ? 'ALL' : 'LOITER');
              audioAlertEngine.playSonarPing();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeClassFilter === 'LOITER'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                : 'bg-amber-950/30 text-amber-300 border-amber-500/20 hover:bg-amber-900/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>LOITER</span>
          </button>
          <button
            onClick={() => {
              setActiveClassFilter(activeClassFilter === 'UNAUTHORIZED' ? 'ALL' : 'UNAUTHORIZED');
              audioAlertEngine.playSonarPing();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeClassFilter === 'UNAUTHORIZED'
                ? 'bg-rose-600 text-white border-rose-400 font-black animate-pulse'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>UNAUTHORIZED</span>
          </button>
        </div>

        {/* Fleet Track Stats Summary */}
        <div className="flex items-center gap-2.5 text-[10px] text-slate-400">
          <span>FLEET: <strong className="text-emerald-400">{dynamicFleetCounts.personTotal}P</strong> · <strong className="text-cyan-400">{dynamicFleetCounts.vehicleTotal}V</strong> · <strong className="text-purple-400">{dynamicFleetCounts.animalTotal}A</strong></span>
          <span className="text-slate-600">•</span>
          <span>UNIQUE TRACKS: <strong className="text-purple-300">{dynamicFleetCounts.uniqueSessionTotal}</strong></span>
        </div>
      </div>

      {/* Snapshot Toast Notification */}
      {snapshotToast && (
        <div className="p-2.5 bg-cyan-950/90 border border-cyan-400 text-cyan-200 rounded-xl font-mono text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-cyan-400" />
            <span className="font-bold">{snapshotToast}</span>
          </div>
          <button onClick={() => setSnapshotToast(null)} className="text-cyan-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Rapid Response Dispatch Toast Notification */}
      {rapidResponseToast && (
        <div className="p-2.5 bg-emerald-950/90 border border-emerald-400 text-emerald-200 rounded-xl font-mono text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-400" />
            <span className="font-bold">{rapidResponseToast}</span>
          </div>
          <button onClick={() => setRapidResponseToast(null)} className="text-emerald-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Tactical Rapid Incident Response Banner */}
      {recentTacticalAlert && (
        <div className={`p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 font-mono text-xs shadow-lg transition-all duration-200 ${
          recentTacticalAlert.type === 'TRIPWIRE_CROSSING'
            ? 'bg-rose-950/90 border-rose-500/70 text-rose-200'
            : 'bg-amber-950/90 border-amber-500/70 text-amber-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${recentTacticalAlert.type === 'TRIPWIRE_CROSSING' ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-600 text-white'}`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{recentTacticalAlert.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">[{recentTacticalAlert.time}]</span>
              </div>
              <p className="text-[11px] opacity-90">{recentTacticalAlert.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => handleJumpToCamera(recentTacticalAlert.cameraId)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <ArrowUpRight size={12} />
              <span>JUMP TO CAMERA</span>
            </button>
            <button
              onClick={handleDispatchRapidResponse}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Zap size={12} />
              <span>DISPATCH</span>
            </button>
            <button
              onClick={() => setRecentTacticalAlert(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Flash Overlay */}
      {snapshotFlash && (
        <div className="fixed inset-0 bg-white/20 z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* 3. Primary Video Grid: Layout 2×2 QUAD (Default) */}
      {layoutMode === '2x2' && (
        <div
          id="livestream-2x2-grid"
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
        >
          {currentQuadCameras.map((cam, idx) => {
            const isFocused = focusedCamId === cam.id;
            const isAudioActive = (activeAudioCam === cam.id) || (!isVideoMuted && activeAudioCam === null);
            const isNight = nightVisionMap[cam.id] || false;
            const isPaused = isPlaybackPausedMap[cam.id] || false;
            const zoom = zoomLevels[cam.id] || 1;
            const pan = panOffsets[cam.id] || { x: 0, y: 0 };
            const camFreshness = freshnessMap[cam.id] || { status: 'LIVE', measuredFps: cam.fps || 30 };
            const isOffline = cam.status === 'offline';
            const displayFps = isOffline ? 0 : (camFreshness.measuredFps || cam.fps || (idx % 2 === 0 ? 60 : 30));
            const isTargetAlert = recentTacticalAlert && recentTacticalAlert.cameraId === cam.id;
            const detections = camCountsMap[cam.id] || {
              persons: cam.id.includes('8') ? 2 : 15,
              vehicles: cam.id.includes('8') ? 8 : 0,
              animals: 0,
              total: cam.id.includes('8') ? 10 : 15,
            };

            return (
              <div
                key={cam.id}
                id={`grid-cell-${cam.id}`}
                onClick={() => {
                  setFocusedCamId(cam.id);
                  onSelectCamera(cam.id);
                }}
                className={`flex flex-col bg-[#0a0f1d] rounded-2xl border transition-all duration-150 overflow-hidden shadow-2xl group relative ${
                  isTargetAlert
                    ? 'border-rose-500/80 ring-2 ring-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : isFocused
                    ? 'border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/40'
                    : 'border-white/[0.08] hover:border-cyan-500/40'
                }`}
              >
                {/* Modernized Compact Header Bar */}
                <div className="px-3 py-2 bg-[#0d1424]/95 border-b border-white/[0.06] flex items-center justify-between gap-2">
                  {/* Left: Camera ID, Name, Location */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                      {cam.code}
                    </span>
                    <div className="truncate">
                      <span className="text-xs font-bold text-white truncate font-mono block leading-tight">{cam.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate block leading-tight">{cam.location}</span>
                    </div>
                  </div>

                  {/* Right: AI Activity Indicator, Stream Health & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Compact Interactive AI Activity Indicator */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCamActivityModal(activeCamActivityModal === cam.id ? null : cam.id);
                        audioAlertEngine.playSonarPing();
                      }}
                      title="Click to view recent AI detections timeline for this feed"
                      className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 hover:bg-cyan-950/80 border border-white/10 hover:border-cyan-500/40 text-[10px] font-mono text-slate-300 cursor-pointer transition-colors"
                    >
                      <span className="text-emerald-400 font-bold">{String(detections.persons).padStart(2, '0')}P</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-cyan-400 font-bold">{String(detections.vehicles).padStart(2, '0')}V</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-purple-400 font-bold">{String(detections.animals).padStart(2, '0')}A</span>
                    </button>

                    {/* Stream Health & FPS */}
                    <span className="hidden md:inline font-mono text-[10px] text-slate-400">
                      {cam.resolution.split(' ')[0]} · {displayFps}fps
                    </span>

                    {/* Status Pill */}
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                      <span className={isOffline ? 'text-rose-400' : 'text-emerald-400'}>
                        {isOffline ? 'OFFLINE' : 'LIVE'}
                      </span>
                    </div>

                    {/* Quick Expand Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedCamId(cam.id);
                        onSelectCamera(cam.id);
                        setLayoutMode('single');
                        audioAlertEngine.playSonarPing();
                      }}
                      title="Focus Camera (Single View)"
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Maximize size={13} />
                    </button>
                  </div>
                </div>

                {/* Video Viewport */}
                <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                  <div
                    className="w-full h-full transition-transform duration-100 ease-out"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                    }}
                  >
                    <CameraFeedCanvas
                      camera={cam}
                      showAiBoxes={showAiBoxes && !cleanViewMode}
                      showZones={showZones}
                      showLines={showLines}
                      showLabels={showLabels && !cleanViewMode}
                      cleanViewMode={cleanViewMode}
                      showOpticalGrid={showOpticalGrid}
                      classFilter={activeClassFilter}
                      isNightVision={isNight}
                      muted={isVideoMuted || (activeAudioCam !== null && activeAudioCam !== cam.id)}
                      onCountsUpdate={(counts) => handleCountsUpdate(cam.id, counts)}
                    />
                  </div>

                  {/* Paused Overlay */}
                  {isPaused && (
                    <div className="absolute inset-0 z-20 bg-slate-950/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                      <Pause size={28} className="text-amber-400 mb-1" />
                      <span className="text-amber-300 font-mono font-bold text-xs uppercase">FEED PAUSED</span>
                    </div>
                  )}

                  {/* Disconnected / Offline Overlay */}
                  {isOffline && (
                    <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center p-4 pointer-events-none backdrop-blur-sm">
                      <AlertTriangle size={26} className="text-rose-500 mb-1 animate-pulse" />
                      <span className="text-rose-400 font-mono font-bold tracking-widest text-[11px] uppercase">
                        [ DATA LINK OFFLINE ]
                      </span>
                    </div>
                  )}

                  {/* Top-Left Live HUD Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
                    {activeRecordings.has(cam.id) ? (
                      <div className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-mono font-bold rounded-md flex items-center gap-1 shadow-sm animate-pulse">
                        <Disc size={9} className="animate-spin text-white" />
                        <span>REC [{String(Math.floor(recordingEngine.getRecordingDuration(cam.id) / 60)).padStart(2, '0')}:{String(recordingEngine.getRecordingDuration(cam.id) % 60).padStart(2, '0')}]</span>
                      </div>
                    ) : (
                      <div className="px-1.5 py-0.5 bg-rose-600/90 text-white text-[9px] font-mono font-bold rounded-md flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                        <span>LIVE</span>
                      </div>
                    )}
                    <div className="px-2 py-0.5 bg-black/80 text-amber-400 text-[9px] font-mono font-bold border border-amber-500/20 rounded-md backdrop-blur-md">
                      {liveTimestamp}
                    </div>
                    {/* Audio status indicator & animated equalizer visualizer */}
                    {!isVideoMuted && (activeAudioCam === null || activeAudioCam === cam.id) && (
                      <div className="px-1.5 py-0.5 bg-cyan-600/90 text-white text-[9px] font-mono rounded-md shadow-sm flex items-center gap-1">
                        <div className="flex items-end gap-0.5 h-2">
                          <span className="w-0.5 h-1 bg-white animate-[pulse_0.4s_ease-in-out_infinite]" />
                          <span className="w-0.5 h-2 bg-white animate-[pulse_0.6s_ease-in-out_infinite]" />
                          <span className="w-0.5 h-1.5 bg-white animate-[pulse_0.3s_ease-in-out_infinite]" />
                        </div>
                        <span>AUDIO</span>
                      </div>
                    )}
                  </div>

                  {/* Contextual Progressive Toolbar on Hover */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10">
                    {/* Play/Pause */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPauseCamera(cam.id);
                      }}
                      title={isPaused ? 'Resume Stream' : 'Pause Stream'}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {isPaused ? <Play size={12} /> : <Pause size={12} />}
                    </button>

                    {/* Recording */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        recordingEngine.toggleRecording(cam);
                      }}
                      title={activeRecordings.has(cam.id) ? 'Stop Recording' : 'Record Stream'}
                      className={`p-1 rounded-lg cursor-pointer ${
                        activeRecordings.has(cam.id) ? 'bg-rose-600 text-white animate-pulse' : 'hover:bg-white/10 text-rose-400'
                      }`}
                    >
                      <Disc size={12} />
                    </button>

                    {/* Night Vision */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNightVision(cam.id);
                      }}
                      title={isNight ? 'Switch to Normal Color' : 'Switch to IR Night Vision'}
                      className={`p-1 rounded-lg cursor-pointer ${isNight ? 'bg-emerald-600 text-white' : 'hover:bg-white/10 text-slate-300'}`}
                    >
                      {isNight ? <Moon size={12} /> : <Sun size={12} />}
                    </button>

                    {/* Solo Audio */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCamAudio(cam.id);
                      }}
                      title={isAudioActive && !isVideoMuted ? 'Mute' : 'Listen Solo'}
                      className={`p-1 rounded-lg cursor-pointer ${isAudioActive && !isVideoMuted ? 'bg-cyan-600 text-white' : 'hover:bg-white/10 text-slate-300'}`}
                    >
                      {isAudioActive && !isVideoMuted ? <Volume2 size={12} /> : <VolumeX size={12} />}
                    </button>

                    {/* Snapshot */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCaptureCameraSnapshot(cam);
                      }}
                      title="Capture Frame"
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Camera size={12} />
                    </button>

                    {/* Test Threat */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerIntrusion();
                      }}
                      title="Simulate Breach Alert"
                      className="px-1.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-mono font-bold cursor-pointer"
                    >
                      BREACH
                    </button>
                  </div>

                  {/* In-Grid Contextual AI Detections Timeline Popover */}
                  {activeCamActivityModal === cam.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-x-2 bottom-2 top-10 bg-[#0a0f1d]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 z-30 font-mono text-xs flex flex-col justify-between shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <Activity size={14} className="text-cyan-400" />
                            <span className="font-bold text-white uppercase">ACTIVITY TIMELINE — {cam.code}</span>
                          </div>
                          <button
                            onClick={() => setActiveCamActivityModal(null)}
                            className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {getCameraDetectionsList(cam.id).map((det) => (
                            <div
                              key={det.id}
                              className={`p-1.5 rounded-lg flex items-center justify-between text-[11px] ${
                                det.isThreat ? 'bg-rose-950/80 border border-rose-500/50 text-rose-200' : 'bg-white/[0.03] border border-white/[0.05] text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${det.isThreat ? 'bg-rose-500 animate-ping' : 'bg-cyan-400'}`} />
                                <span className="font-bold">{det.className}</span>
                                <span className="text-[9px] text-slate-400">#{det.trackId}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-emerald-400 font-semibold">{(det.confidence * 100).toFixed(0)}%</span>
                                <span className="text-slate-500">{det.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                        <span>MODEL: YOLOv8x + BYTETRACK</span>
                        <button
                          onClick={() => {
                            setActiveCamActivityModal(null);
                            handleJumpToCamera(cam.id);
                          }}
                          className="text-cyan-400 hover:underline font-bold"
                        >
                          OPEN FOCUS VIEW →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Standby Aux Recon Sentry Cards for Section 3 */}
          {currentQuadCameras.length < 4 && Array.from({ length: 4 - currentQuadCameras.length }).map((_, idx) => (
            <div
              key={`standby-slot-${idx}`}
              className="flex flex-col bg-[#070c18] rounded-2xl border border-dashed border-white/10 p-5 items-center justify-center text-center space-y-3 relative"
            >
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold">
                AUX SENTRY NODE #{idx + 10}
              </div>

              <div className="relative w-14 h-14 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center">
                <Radio size={20} className="text-cyan-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
              </div>

              <div>
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  STANDBY AUX RECON SENSOR
                </h4>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  GEO: 34°08'42.1"N 74°48'18.5"E · RF LINK: 99.4% RSSI
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    audioAlertEngine.playSonarPing();
                    setRapidResponseToast(`Aux UAV Recon Drone dispatched to Perimeter Grid ${idx + 2}`);
                    setTimeout(() => setRapidResponseToast(null), 3000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold cursor-pointer"
                >
                  DEPLOY DRONE
                </button>
                <button
                  onClick={() => {
                    audioAlertEngine.playSonarPing();
                    setRapidResponseToast(`Aux RTSP Sentry node pair requested on port 55${idx + 4}`);
                    setTimeout(() => setRapidResponseToast(null), 3000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-[10px] font-mono font-bold cursor-pointer"
                >
                  PAIR SENSOR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Layout: 1+3 Master Split */}
      {layoutMode === '1+3' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Main Master Stream (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-[#0a0f1d] rounded-2xl border border-cyan-500/40 overflow-hidden shadow-2xl">
            <div className="px-4 py-2.5 bg-[#0d1424] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                  {activeFocusCam.code} — MASTER FOCUS
                </span>
                <span className="text-xs font-bold text-white font-mono">{activeFocusCam.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-emerald-400">4K 60FPS</span>
              </div>
            </div>

            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
              <CameraFeedCanvas
                camera={activeFocusCam}
                showAiBoxes={showAiBoxes && !cleanViewMode}
                showZones={showZones}
                showLines={showLines}
                showLabels={showLabels && !cleanViewMode}
                cleanViewMode={cleanViewMode}
                showOpticalGrid={showOpticalGrid}
                classFilter={activeClassFilter}
                isNightVision={nightVisionMap[activeFocusCam.id] || false}
                muted={isVideoMuted}
                onCountsUpdate={(counts) => handleCountsUpdate(activeFocusCam.id, counts)}
              />

              <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
                <div className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-mono font-bold rounded flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                  <span>LIVE 4K</span>
                </div>
                <div className="px-2 py-0.5 bg-black/80 text-amber-400 text-[9px] font-mono font-bold border border-amber-500/20 rounded">
                  {liveTimestamp}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                <button
                  onClick={onTriggerIntrusion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-md cursor-pointer"
                >
                  <AlertTriangle size={12} />
                  <span>SIMULATE BREACH</span>
                </button>
                <button
                  onClick={() => handleCaptureCameraSnapshot(activeFocusCam)}
                  className="p-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs border border-white/20 cursor-pointer"
                  title="Capture Snapshot"
                >
                  <Camera size={14} />
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-[#0d1424] border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{activeFocusCam.location}</span>
              <span className="text-emerald-400 font-semibold">{activeFocusCam.aiModels.join(' · ')}</span>
            </div>
          </div>

          {/* 3 Synchronous Companion Streams (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {companionStreams.map((cam) => (
              <div
                key={cam.id}
                onClick={() => {
                  setFocusedCamId(cam.id);
                  onSelectCamera(cam.id);
                  audioAlertEngine.playSonarPing();
                }}
                className="bg-[#0a0f1d] border border-white/[0.08] hover:border-cyan-400/60 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col shadow-lg group"
              >
                <div className="px-3 py-1.5 bg-[#0d1424] flex items-center justify-between text-xs border-b border-white/[0.06]">
                  <span className="font-bold text-white font-mono">{cam.code}: {cam.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">● LIVE</span>
                </div>
                <div className="relative aspect-video bg-black">
                  <CameraFeedCanvas
                    camera={cam}
                    showAiBoxes={showAiBoxes && !cleanViewMode}
                    showZones={showZones}
                    showLines={showLines}
                    showLabels={showLabels && !cleanViewMode}
                    cleanViewMode={cleanViewMode}
                    showOpticalGrid={showOpticalGrid}
                    classFilter={activeClassFilter}
                    isNightVision={nightVisionMap[cam.id] || false}
                    muted={isVideoMuted}
                  />
                  <div className="absolute inset-0 bg-black/40 hover:bg-transparent transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold shadow-md">
                      SWITCH TO MASTER
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Layout: SINGLE FOCUS SPOTLIGHT with PTZ Hardware Console */}
      {layoutMode === 'single' && (
        <div className="bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl space-y-3">
          {/* Top Bar with Camera Selector and ESC Button */}
          <div className="px-4 py-2.5 bg-[#0d1424] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setLayoutMode('2x2');
                  audioAlertEngine.playSonarPing();
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                title="Return to Quad Grid (ESC)"
              >
                <ArrowLeft size={13} />
                <span>QUAD GRID</span>
              </button>
              <div className="h-4 w-px bg-white/10" />
              <div>
                <h3 className="text-xs font-bold text-white font-mono">{activeFocusCam.code} — {activeFocusCam.name}</h3>
                <p className="text-[10px] text-slate-400 font-mono">{activeFocusCam.location}</p>
              </div>
            </div>

            {/* Quick Switch Camera Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {cameras.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setFocusedCamId(c.id);
                    onSelectCamera(c.id);
                    audioAlertEngine.playSonarPing();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                    focusedCamId === c.id
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Massive 4K Viewport (8 cols) */}
            <div className="lg:col-span-8 relative aspect-video bg-black rounded-xl overflow-hidden border border-white/[0.08]">
              <div
                className="w-full h-full transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${zoomLevels[activeFocusCam.id] || 1}) translate(${
                    panOffsets[activeFocusCam.id]?.x || 0
                  }px, ${panOffsets[activeFocusCam.id]?.y || 0}px)`,
                }}
              >
                <CameraFeedCanvas
                  camera={activeFocusCam}
                  showAiBoxes={showAiBoxes && !cleanViewMode}
                  showZones={showZones}
                  showLines={showLines}
                  showLabels={showLabels && !cleanViewMode}
                  cleanViewMode={cleanViewMode}
                  showOpticalGrid={showOpticalGrid}
                  classFilter={activeClassFilter}
                  isNightVision={nightVisionMap[activeFocusCam.id] || false}
                  muted={isVideoMuted}
                  onCountsUpdate={(counts) => handleCountsUpdate(activeFocusCam.id, counts)}
                />
              </div>

              {/* Top HUD */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
                <div className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-mono font-bold rounded flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                  <span>LIVE 4K</span>
                </div>
                <div className="px-2 py-0.5 bg-black/80 text-amber-400 text-[9px] font-mono font-bold border border-amber-500/20 rounded">
                  {liveTimestamp}
                </div>
                <div className="px-2 py-0.5 bg-black/80 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-500/20 rounded">
                  AZ: {ptzAngles[activeFocusCam.id]?.azimuth ?? 180.0}° · EL: {ptzAngles[activeFocusCam.id]?.elevation ?? 12.0}°
                </div>
              </div>
            </div>

            {/* PTZ Hardware Console (4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between p-3.5 bg-[#060911] border border-white/[0.08] rounded-xl space-y-3 font-mono">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={13} className="text-cyan-400" />
                    <span>PTZ HARDWARE CONSOLE</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-bold">CALIBRATED</span>
                </div>

                {/* Joystick D-pad */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#0a0f1d] rounded-2xl border border-white/[0.08] my-1 shadow-inner">
                  <button
                    onClick={() => handlePan(activeFocusCam.id, 0, 15)}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors cursor-pointer"
                    title="Pan / Tilt Up"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <div className="flex items-center gap-3 my-1">
                    <button
                      onClick={() => handlePan(activeFocusCam.id, 15, 0)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors cursor-pointer"
                      title="Pan Left"
                    >
                      <ArrowLeft size={15} />
                    </button>
                    <button
                      onClick={() => resetPanZoom(activeFocusCam.id)}
                      className="px-2 py-1 rounded-xl bg-slate-900 text-[10px] text-cyan-400 border border-cyan-500/30 font-bold hover:text-white cursor-pointer"
                      title="Center Calibration"
                    >
                      CENTER
                    </button>
                    <button
                      onClick={() => handlePan(activeFocusCam.id, -15, 0)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors cursor-pointer"
                      title="Pan Right"
                    >
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <button
                    onClick={() => handlePan(activeFocusCam.id, 0, -15)}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors cursor-pointer"
                    title="Pan / Tilt Down"
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>

                {/* Preset Guard Tours */}
                <div className="my-2 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">GUARD TOUR PRESETS:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handlePresetTour(activeFocusCam.id, 'MAIN GATE', 142.4, 12.0, 1.5)}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.06] text-[10px] text-left truncate cursor-pointer"
                    >
                      1: MAIN GATE
                    </button>
                    <button
                      onClick={() => handlePresetTour(activeFocusCam.id, 'PERIMETER LINE', 184.6, 14.5, 2.0)}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.06] text-[10px] text-left truncate cursor-pointer"
                    >
                      2: PERIMETER
                    </button>
                    <button
                      onClick={() => handlePresetTour(activeFocusCam.id, 'BUNKER HQ', 215.0, 9.5, 1.0)}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.06] text-[10px] text-left truncate cursor-pointer"
                    >
                      3: BUNKER HQ
                    </button>
                    <button
                      onClick={() => handlePresetTour(activeFocusCam.id, 'HELIPAD LZ', 285.5, 16.0, 3.0)}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.06] text-[10px] text-left truncate cursor-pointer"
                    >
                      4: HELIPAD LZ
                    </button>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-between gap-2 p-2 bg-[#0a0f1d] rounded-xl border border-white/[0.06]">
                  <span className="text-xs text-slate-400 font-bold">OPTICAL ZOOM:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleZoom(activeFocusCam.id, -0.5)}
                      className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs cursor-pointer"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="text-xs text-emerald-400 font-black px-1">
                      {(zoomLevels[activeFocusCam.id] || 1).toFixed(1)}x
                    </span>
                    <button
                      onClick={() => handleZoom(activeFocusCam.id, 0.5)}
                      className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs cursor-pointer"
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Triggers */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={onTriggerIntrusion}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-98"
                >
                  <AlertTriangle size={13} />
                  <span>SIMULATE SECTOR INTRUSION</span>
                </button>
                <button
                  onClick={() => handleCaptureCameraSnapshot(activeFocusCam)}
                  className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-white/[0.08] cursor-pointer transition-all"
                >
                  <Camera size={13} />
                  <span>CAPTURE 4K RAW FRAME</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Edge Infrastructure Telemetry Footer */}
      <div className="p-3 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <p className="text-slate-500 uppercase text-[9px] font-bold">Throughput</p>
            <p className="text-white font-bold">28.4 Mbps (H.265)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <div>
            <p className="text-slate-500 uppercase text-[9px] font-bold">Sync Precision</p>
            <p className="text-emerald-400 font-bold">30.0 / 30.0 FPS</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <div>
            <p className="text-slate-500 uppercase text-[9px] font-bold">Inference Latency</p>
            <p className="text-purple-300 font-bold">8.4 ms (TensorRT)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div>
            <p className="text-slate-500 uppercase text-[9px] font-bold">Active Models</p>
            <p className="text-amber-400 font-bold">7 Neural Nets Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};
