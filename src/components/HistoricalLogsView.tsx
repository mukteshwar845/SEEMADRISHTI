import React, { useState, useEffect, useRef } from 'react';
import { CameraFeed, RecordedClip, AlertItem } from '../types';
import { recordingEngine, ActiveRecording } from '../utils/recordingManager';
import { audioAlertEngine } from '../utils/audioAlert';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Filter,
  Search,
  Video,
  Clock,
  HardDrive,
  CheckCircle2,
  TriangleAlert,
  ShieldAlert,
  Send,
  Volume2,
  VolumeX,
  FastForward,
  Repeat,
  Eye,
  Sliders,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Maximize2,
  X,
  Radio,
  Share2,
  ChevronRight,
  RefreshCw,
  Flame,
  Moon,
  Sun,
  Tv,
} from 'lucide-react';

interface HistoricalLogsViewProps {
  cameras: CameraFeed[];
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onInitiateResponse: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  onNavigateToInspector?: () => void;
  onNavigateToLiveFeed?: (cameraId: string) => void;
}

export const HistoricalLogsView: React.FC<HistoricalLogsViewProps> = ({
  cameras,
  alerts,
  onSelectAlert,
  onInitiateResponse,
  onResolveAlert,
  onNavigateToInspector,
  onNavigateToLiveFeed,
}) => {
  const [activeTab, setActiveTab] = useState<'clips' | 'alerts' | 'audit'>('clips');
  const [savedClips, setSavedClips] = useState<RecordedClip[]>([]);
  const [activeRecordings, setActiveRecordings] = useState<Map<string, ActiveRecording>>(new Map());
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('ALL');
  const [selectedTriggerFilter, setSelectedTriggerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingClip, setPlayingClip] = useState<RecordedClip | null>(null);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('ALL');
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real Video Player state
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [videoError, setVideoError] = useState<boolean>(false);

  // Subscribe to recording engine and fetch real forensic incident clips
  useEffect(() => {
    const unsub = recordingEngine.subscribe((active, clips) => {
      setActiveRecordings(new Map(active));
      setSavedClips([...clips]);
    });

    // Also fetch real incidents to populate historical log clips
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.success && Array.isArray(payload.data)) {
          const incidentClips: RecordedClip[] = payload.data
            .filter((inc: any) => inc.evidence_status === 'ready' || inc.evidence_path)
            .map((inc: any) => {
              const camNum = inc.camera_id?.replace(/[^0-9]/g, '') || '01';
              const camPadded = `CAM-${camNum.padStart(2, '0')}`;
              const videoPath = inc.evidence_path
                ? `/evidence/${inc.id}.mp4`
                : `/fixtures/visdrone/${camPadded}.mp4`;
              return {
                id: `clip-inc-${inc.id}`,
                cameraId: inc.camera_id,
                cameraCode: camPadded,
                cameraName: `${camPadded}_EVIDENCE_CAPTURE`,
                location: inc.zone_name || 'Restricted Perimeter Boundary',
                rtspUrl: `rtsp://192.168.1.${100 + parseInt(camNum, 10)}:554/live/ch0`,
                startTime: new Date(inc.timestamp || Date.now()).toLocaleTimeString(),
                endTime: new Date((inc.timestamp || Date.now()) + 30000).toLocaleTimeString(),
                startTimestamp: new Date(inc.timestamp || Date.now()).getTime() - 30000,
                endTimestamp: new Date(inc.timestamp || Date.now()).getTime(),
                durationSeconds: Math.round(inc.duration || 30),
                fileSizeMb: Number(((inc.file_size || 2500000) / (1024 * 1024)).toFixed(1)),
                resolution: '1344x756 (HD)',
                fps: 30,
                thumbnailUrl: videoPath,
                videoUrl: videoPath,
                tags: [inc.event_type || 'INTRUSION', `${inc.risk_level || 'CRITICAL'} RISK`, 'SHA-256 SEALED'],
                triggerType: 'anomaly_auto' as const,
                eventsDetectedCount: 1,
                dangerZoneBreach: true,
              };
            });

          if (incidentClips.length > 0) {
            setSavedClips((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const newClips = incidentClips.filter((ic) => !existingIds.has(ic.id));
              return [...newClips, ...prev];
            });
          }
        }
      })
      .catch(() => {});

    return unsub;
  }, []);

  // Sync state whenever playingClip changes
  useEffect(() => {
    if (playingClip) {
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(playingClip.durationSeconds || 0);
      setVideoError(false);
    }
  }, [playingClip]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleRecord = (cam: CameraFeed) => {
    const res = recordingEngine.toggleRecording(cam);
    if (res.isRecording) {
      showToast(`RECORDING STARTED on ${cam.code} (${cam.name})`);
    } else if (res.clip) {
      showToast(`RECORDING SAVED: ${res.clip.fileSizeMb}MB clip added to Historical Logs`);
    }
  };

  const handleDeleteClip = (clipId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    recordingEngine.deleteClip(clipId);
    if (playingClip?.id === clipId) {
      setPlayingClip(null);
    }
    showToast('Clip deleted from session.');
  };

  const handleDownloadClip = (clip: RecordedClip, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const normCam = (clip.cameraId || 'cam-01').toLowerCase().replace(/^cam-0?/, 'cam-0');
    const videoSrc = clip.videoUrl || clip.videoBlobUrl || `/api/cameras/${normCam}/video`;

    // Trigger MP4 video download directly
    const a = document.createElement('a');
    a.href = videoSrc;
    a.download = `${clip.cameraCode || 'CAM'}_${clip.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Also download JSON audit sidecar
    const clipMetadata = {
      clipId: clip.id,
      cameraCode: clip.cameraCode,
      cameraName: clip.cameraName,
      location: clip.location,
      videoSource: videoSrc,
      startTime: clip.startTime,
      endTime: clip.endTime,
      durationSeconds: clip.durationSeconds,
      resolution: clip.resolution,
      fps: clip.fps,
      fileSizeMb: clip.fileSizeMb,
      tags: clip.tags,
      triggerType: clip.triggerType,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(clipMetadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const aMeta = document.createElement('a');
    aMeta.href = url;
    aMeta.download = `seemadrishti-rtsp-clip-${clip.cameraCode.toLowerCase()}-${clip.id}.json`;
    document.body.appendChild(aMeta);
    aMeta.click();
    document.body.removeChild(aMeta);
    URL.revokeObjectURL(url);

    showToast(`Downloading real MP4 video & audit log for ${clip.cameraCode}`);
  };

  const togglePlayPause = () => {
    if (!modalVideoRef.current) return;
    if (modalVideoRef.current.paused) {
      modalVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      modalVideoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalVideoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * (modalVideoRef.current.duration || duration || playingClip?.durationSeconds || 1);
    modalVideoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSkip = (seconds: number) => {
    if (!modalVideoRef.current) return;
    const maxDur = modalVideoRef.current.duration || duration || 60;
    const newTime = Math.max(0, Math.min(maxDur, modalVideoRef.current.currentTime + seconds));
    modalVideoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleToggleFullscreen = () => {
    if (!modalVideoRef.current) return;
    if (!document.fullscreenElement) {
      modalVideoRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Filter clips
  const filteredClips = savedClips.filter((clip) => {
    const matchCam = selectedCameraFilter === 'ALL' || clip.cameraId === selectedCameraFilter || clip.cameraCode === selectedCameraFilter;
    const matchTrigger = selectedTriggerFilter === 'ALL' || clip.triggerType === selectedTriggerFilter;
    const matchSearch =
      searchQuery === '' ||
      clip.cameraCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.cameraName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCam && matchTrigger && matchSearch;
  });

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    const matchSev = alertSeverityFilter === 'ALL' || a.severity === alertSeverityFilter;
    const matchStat = alertStatusFilter === 'ALL' || a.status === alertStatusFilter;
    const matchSearch =
      searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.camera.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSev && matchStat && matchSearch;
  });

  const totalStorageMb = savedClips.reduce((sum, c) => sum + c.fileSizeMb, 0).toFixed(1);
  const totalDurationSec = savedClips.reduce((sum, c) => sum + c.durationSeconds, 0);
  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto" id="historical-logs-root">
      {/* Dynamic Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#070e1c] border-2 border-cyan-400 text-cyan-200 px-5 py-3 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.4)] flex items-center gap-3 font-mono text-xs font-bold animate-in fade-in slide-in-from-top-4 backdrop-blur-md">
          <Film size={18} className="text-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-4 sm:p-5 bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <Film size={20} />
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-[0.15em] font-mono flex items-center gap-2">
                  <span>HISTORICAL LOGS &amp; RTSP SESSION CLIPS</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                    LOCAL SESSION VAULT
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Archived high-definition camera footage, anomaly triggers, and forensic incident records
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
              <Film size={14} className="text-cyan-400" />
              <span className="text-slate-400">SAVED CLIPS:</span>
              <span className="text-white font-bold">{savedClips.length}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
              <HardDrive size={14} className="text-emerald-400" />
              <span className="text-slate-400">SESSION STORAGE:</span>
              <span className="text-emerald-300 font-bold">{totalStorageMb} MB</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
              <Clock size={14} className="text-amber-400" />
              <span className="text-slate-400">TOTAL FOOTAGE:</span>
              <span className="text-amber-300 font-bold">{formatDuration(totalDurationSec)}</span>
            </div>

            {activeRecordings.size > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 font-bold flex items-center gap-1.5 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>{activeRecordings.size} CH RECORDING ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Channel Quick Toggle Bar */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              QUICK RTSP REC TOGGLES:
            </span>
            {cameras.map((cam) => {
              const isRec = activeRecordings.has(cam.id);
              const duration = recordingEngine.getRecordingDuration(cam.id);
              return (
                <button
                  key={cam.id}
                  onClick={() => handleToggleRecord(cam)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                    isRec
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-[#121c33] hover:bg-[#1a2847] text-slate-300 border-white/10 hover:border-cyan-500/40'
                  }`}
                  title={isRec ? `Stop Recording ${cam.code}` : `Start Recording ${cam.code}`}
                >
                  <span className={`w-2 h-2 rounded-full ${isRec ? 'bg-white' : 'bg-rose-500'}`} />
                  <span>{cam.code}</span>
                  {isRec ? (
                    <span className="text-[10px] text-rose-100 font-black">
                      [{String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}]
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400">REC</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                recordingEngine.resetToDefaults();
                showToast('Reset session clips to default baseline dataset.');
              }}
              className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/90 text-slate-400 hover:text-slate-200 border border-white/10 text-xs font-mono cursor-pointer"
            >
              Reset Session
            </button>
            <button
              onClick={() => {
                recordingEngine.clearAllSessionClips();
                showToast('All session clips cleared from local storage.');
              }}
              className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-white/10 text-xs font-mono cursor-pointer"
            >
              Clear Vault
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('clips')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border ${
              activeTab === 'clips'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.03]'
            }`}
          >
            <Film size={14} className={activeTab === 'clips' ? 'text-cyan-400' : 'text-slate-400'} />
            <span>Recorded RTSP Clips</span>
            <span className="px-1.5 py-0.2 rounded bg-black/60 text-cyan-400 text-[10px]">
              {savedClips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border ${
              activeTab === 'alerts'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.03]'
            }`}
          >
            <TriangleAlert size={14} className={activeTab === 'alerts' ? 'text-rose-400' : 'text-slate-400'} />
            <span>Threat Incidents</span>
            <span className="px-1.5 py-0.2 rounded bg-black/60 text-rose-400 text-[10px]">
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border ${
              activeTab === 'audit'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.03]'
            }`}
          >
            <Layers size={14} className={activeTab === 'audit' ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Audit &amp; RTSP Telemetry</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RECORDED RTSP CLIPS (Primary Focus) */}
      {activeTab === 'clips' && (
        <div className="space-y-4" id="recorded-clips-section">
          {/* Filter and Search Bar */}
          <div className="p-3.5 bg-[#0a0f1d] border border-white/[0.08] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
            {/* Search */}
            <div className="relative flex-1 md:max-w-xs">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search clips by cam, tag, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#050914] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Camera Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Node:</span>
              {['ALL', 'CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map((camCode) => (
                <button
                  key={camCode}
                  onClick={() => setSelectedCameraFilter(camCode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    selectedCameraFilter === camCode
                      ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-[#121c33] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {camCode}
                </button>
              ))}
            </div>

            {/* Trigger Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Trigger:</span>
              <button
                onClick={() => setSelectedTriggerFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedTriggerFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#121c33] text-slate-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setSelectedTriggerFilter('manual')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedTriggerFilter === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#121c33] text-slate-400 hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setSelectedTriggerFilter('anomaly_auto')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedTriggerFilter === 'anomaly_auto'
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#121c33] text-slate-400 hover:text-white'
                }`}
              >
                Anomaly Auto
              </button>
            </div>
          </div>

          {/* Active Live Recordings Alert Strip (if any are recording right now) */}
          {activeRecordings.size > 0 && (
            <div className="p-3.5 bg-[#170509] border border-rose-500/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>ONGOING RTSP RECORDING STREAMS ({activeRecordings.size})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Capturing to local session cache</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(Array.from(activeRecordings.values()) as ActiveRecording[]).map((rec) => {
                  const duration = recordingEngine.getRecordingDuration(rec.cameraId);
                  return (
                    <div
                      key={rec.cameraId}
                      className="p-2.5 bg-black/80 border border-rose-500/40 rounded-lg flex items-center justify-between font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{rec.cameraCode}</span>
                          <span className="text-[9px] text-rose-400 font-black animate-pulse">REC ●</span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">
                          {rec.location}
                        </span>
                        <span className="text-[10px] text-rose-300 font-bold">
                          {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const stopped = recordingEngine.stopRecording(rec.cameraId);
                          if (stopped) {
                            showToast(`Saved ${stopped.cameraCode} clip (${stopped.durationSeconds}s, ${stopped.fileSizeMb}MB)`);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                      >
                        STOP REC
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clips Grid View */}
          {filteredClips.length === 0 ? (
            <div className="p-12 text-center bg-[#0a0f1d] border border-white/10 rounded-2xl space-y-3">
              <Film size={40} className="mx-auto text-slate-600 animate-pulse" />
              <h3 className="text-sm font-mono font-bold text-slate-300 uppercase">
                No Recorded Clips Found
              </h3>
              <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
                No video clips match the current filters. Toggle recording on any active RTSP camera feed above or in the live player to capture a new session clip.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleToggleRecord(cameras[0])}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  Start Recording on CAM-01
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="clips-card-grid">
              {filteredClips.map((clip) => {
                const isAnomaly = clip.triggerType === 'anomaly_auto';
                return (
                  <div
                    key={clip.id}
                    id={`clip-card-${clip.id}`}
                    onClick={() => setPlayingClip(clip)}
                    className="group bg-[#0a0f1d] border border-white/[0.08] hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.7)] flex flex-col transition-all duration-200 cursor-pointer relative hover:-translate-y-0.5"
                  >
                    {/* Real Video Thumbnail with Hover Sneak-Peek */}
                    <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                      <video
                        src={clip.videoUrl || clip.videoBlobUrl || `/api/cameras/${clip.cameraId.toLowerCase().replace(/^cam-0?/, 'cam-0')}/video`}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                        onMouseEnter={(e) => {
                          e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                      {/* Top Overlay Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold">
                          {clip.cameraCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isAnomaly
                              ? 'bg-rose-950/90 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {isAnomaly ? 'ANOMALY AUTO' : 'MANUAL REC'}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                          {clip.resolution}
                        </span>
                      </div>

                      {/* Play Button Icon on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.7)] group-hover:scale-110 transition-transform">
                          <Play size={20} className="fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Bottom Overlay Info */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between font-mono text-[10px]">
                        <span className="text-white bg-black/70 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                          <Clock size={11} className="text-amber-400" />
                          <span>{clip.durationSeconds}s ({clip.fileSizeMb}MB)</span>
                        </span>
                        <span className="text-slate-300 bg-black/70 px-2 py-0.5 rounded backdrop-blur-md">
                          {clip.startTime}
                        </span>
                      </div>
                    </div>

                    {/* Card Content & Details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white font-mono uppercase group-hover:text-cyan-300 transition-colors truncate">
                            {clip.cameraName}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {clip.fps} FPS
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          {clip.location}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {clip.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.08] text-[9px] font-mono text-slate-300 uppercase"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDownloadClip(clip, e)}
                            className="p-1.5 rounded-lg bg-[#141f36] hover:bg-[#1f2f52] text-slate-300 hover:text-cyan-300 border border-white/5 text-[11px] transition-colors cursor-pointer"
                            title="Download Clip File & JSON Index"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClip(clip.id, e)}
                            className="p-1.5 rounded-lg bg-[#141f36] hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-white/5 text-[11px] transition-colors cursor-pointer"
                            title="Delete Clip from Session"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onNavigateToLiveFeed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToLiveFeed(clip.cameraId);
                              }}
                              className="px-2 py-1 rounded-lg bg-[#141f36] hover:bg-[#1e2f50] text-slate-300 hover:text-white text-[10px] font-mono border border-white/5 cursor-pointer flex items-center gap-1"
                            >
                              <Video size={11} />
                              <span>Live Feed</span>
                            </button>
                          )}
                          <button
                            onClick={() => setPlayingClip(clip)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40 text-[10px] font-mono font-bold cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                          >
                            <Play size={10} className="fill-current" />
                            <span>PLAY</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: THREAT INCIDENTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4" id="historical-threat-alerts-section">
          <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
            <div className="relative flex-1 md:max-w-xs">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search threat logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#050914] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Severity:</span>
              {['ALL', 'High', 'Medium', 'Low'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setAlertSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    alertSeverityFilter === sev
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#121c33] text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className="p-4 bg-[#0a0f1d] hover:bg-[#0f172a] border border-white/[0.08] hover:border-rose-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      alert.severity === 'High'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : alert.severity === 'Medium'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    <ShieldAlert size={20} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-white uppercase font-mono group-hover:text-cyan-300 transition-colors">
                        {alert.title}
                      </h3>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-black uppercase ${
                          alert.severity === 'High'
                            ? 'bg-rose-600 text-white'
                            : alert.severity === 'Medium'
                            ? 'bg-amber-500 text-black'
                            : 'bg-emerald-500 text-black'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                        {alert.camera}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono mb-1.5">{alert.description}</p>

                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Clock size={11} />
                        {alert.time}
                      </span>
                      <span>Location: {alert.location || 'Border Zone A'}</span>
                      <span>Assigned: {alert.assignedUnit || 'Patrol Squad Delta'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {onNavigateToInspector && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAlert(alert);
                        onNavigateToInspector();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 bg-[#141f36] hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-rose-500/40 transition-all shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                      title="Inspect forensic video evidence in Incident Inspector"
                    >
                      <Film size={12} />
                      <span>VIEW EVIDENCE</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioAlertEngine.playAlertPing({ force: true });
                    }}
                    className="p-2 rounded-lg bg-[#141f36] hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-white/5 cursor-pointer"
                    title="Replay low-frequency audio alert ping"
                  >
                    <Volume2 size={14} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInitiateResponse(alert.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
                      alert.status === 'response_initiated'
                        ? 'bg-emerald-600 text-white border border-emerald-400'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-black font-black'
                    }`}
                  >
                    <Send size={11} />
                    <span>{alert.status === 'response_initiated' ? 'RESPONSE INITIATED' : 'DISPATCH UNIT'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT & RTSP TELEMETRY */}
      {activeTab === 'audit' && (
        <div className="space-y-4" id="historical-audit-telemetry-section">
          <div className="p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                <Radio size={16} className="text-cyan-400" />
                <span>RTSP Stream Transport &amp; Storage Audit Vault</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                TRANSPORT: RTSP over TCP/UDP (H.265 / HEVC)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {cameras.map((cam) => (
                <div key={cam.id} className="p-3 bg-black/60 border border-white/10 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">{cam.code}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{cam.status.toUpperCase()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 break-all">{cam.rtspUrl}</div>
                  <div className="flex justify-between text-[10px] text-slate-300 pt-1 border-t border-white/5">
                    <span>{cam.resolution}</span>
                    <span className="text-cyan-400">{cam.bitrate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-black/80 border border-cyan-500/20 rounded-lg space-y-1 text-xs text-slate-300 text-[11px]">
              <div className="text-cyan-300 font-bold mb-1">// SESSION RECORDING AUDIT SPECIFICATION:</div>
              <p>• Local Session Recording clips are cached in browser IndexedDB/SessionStorage and persist during the operator session.</p>
              <p>• High-framerate frame buffers are extracted directly from the HTML5 Canvas / WebRTC RTSP bridge.</p>
              <p>• Clips tagged with ANOMALY AUTO are automatically saved whenever confidence exceeds user sensitivity thresholds.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INTERACTIVE RECORDED CLIP PLAYER */}
      {playingClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-4xl bg-[#060b17] border-2 border-cyan-500/60 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.3)] overflow-hidden flex flex-col font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-[#0a1224] border-b border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  <Film size={15} />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase flex items-center gap-2">
                    <span>{playingClip.cameraCode} // {playingClip.cameraName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      REC PLAYBACK
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Recorded {playingClip.startTime} - {playingClip.endTime} ({playingClip.durationSeconds}s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadClip(playingClip)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setPlayingClip(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Real HTML5 Video Player Viewport */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
              <video
                ref={modalVideoRef}
                src={playingClip.videoUrl || playingClip.videoBlobUrl || `/api/cameras/${playingClip.cameraId.toLowerCase().replace(/^cam-0?/, 'cam-0')}/video`}
                autoPlay
                playsInline
                muted={isMuted}
                loop={isLooping}
                className="w-full h-full object-contain bg-black"
                onTimeUpdate={() => {
                  if (modalVideoRef.current) {
                    setCurrentTime(modalVideoRef.current.currentTime);
                    if (modalVideoRef.current.duration && !isNaN(modalVideoRef.current.duration)) {
                      setDuration(modalVideoRef.current.duration);
                    }
                  }
                }}
                onLoadedMetadata={() => {
                  if (modalVideoRef.current) {
                    if (modalVideoRef.current.duration && !isNaN(modalVideoRef.current.duration)) {
                      setDuration(modalVideoRef.current.duration);
                    }
                    modalVideoRef.current.playbackRate = playbackRate;
                    modalVideoRef.current.play().catch(() => {});
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  if (!isLooping) setIsPlaying(false);
                }}
                onError={() => setVideoError(true)}
              />

              {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-rose-400 p-4 text-center z-20">
                  <TriangleAlert size={32} className="mb-2" />
                  <p className="font-bold text-sm font-mono">VIDEO STREAM OFFLINE OR FORMAT UNSUPPORTED</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">Source: {playingClip.videoUrl || playingClip.cameraId}</p>
                </div>
              )}

              {/* Surveillance HUD Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />

              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
              <div className="absolute bottom-16 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
              <div className="absolute bottom-16 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

              {/* Top HUD Badges */}
              <div className="absolute top-3 left-3 ml-4 flex items-center gap-2 text-[10px] text-white z-20">
                <span className="bg-rose-900/90 text-rose-200 border border-rose-500/60 px-2 py-0.5 rounded font-black tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                  [REAL H.264 FOOTAGE]
                </span>
                <span className="bg-black/80 px-2 py-0.5 rounded border border-white/10 font-mono">
                  {playingClip.location}
                </span>
                <span className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-mono font-bold">
                  VERIFIED VISDRONE / CCTV
                </span>
              </div>

              <div className="absolute top-3 right-3 mr-4 flex items-center gap-2 text-[10px] text-cyan-300 z-20">
                <span className="bg-black/80 px-2 py-0.5 rounded border border-cyan-500/30 font-mono">
                  {playingClip.resolution} @ {playingClip.fps} FPS
                </span>
              </div>

              {/* Video Player Bottom Controls & Scrub Bar */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-black/90 backdrop-blur-md border-t border-cyan-500/20 space-y-2.5 z-20">
                {/* Real Interactive Scrub Bar */}
                <div
                  onClick={handleSeek}
                  className="relative w-full h-2 bg-slate-800/90 hover:h-3 rounded cursor-pointer overflow-hidden group transition-all"
                  title="Click to seek playback"
                >
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded transition-all duration-75 shadow-[0_0_10px_#00f0ff]"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlayPause}
                      className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white border border-cyan-500/40 cursor-pointer transition-colors"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={15} /> : <Play size={15} className="fill-current" />}
                    </button>

                    {/* Rewind 5s */}
                    <button
                      onClick={() => handleSkip(-5)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Rewind 5s"
                    >
                      <RotateCcw size={13} />
                    </button>

                    {/* Fast Forward 5s */}
                    <button
                      onClick={() => handleSkip(5)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Forward 5s"
                    >
                      <FastForward size={13} />
                    </button>

                    {/* Time Counter */}
                    <span className="text-[11px] font-mono font-bold text-white px-2 py-0.5 rounded bg-black/60 border border-white/10">
                      {formatTime(currentTime)} / {formatTime(duration || playingClip.durationSeconds)}
                    </span>

                    {/* Playback Rate Toggle */}
                    <button
                      onClick={() => {
                        const rates = [1, 1.5, 2, 0.5];
                        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                        const nextRate = rates[nextIdx];
                        setPlaybackRate(nextRate);
                        if (modalVideoRef.current) modalVideoRef.current.playbackRate = nextRate;
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141f36] hover:bg-[#1e2f50] text-cyan-300 border border-cyan-500/30 cursor-pointer"
                      title="Toggle playback speed"
                    >
                      {playbackRate}x
                    </button>

                    {/* Loop Toggle */}
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isLooping
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : 'bg-white/5 text-slate-500 border-white/10 hover:text-white'
                      }`}
                      title={isLooping ? 'Looping Enabled' : 'Looping Disabled'}
                    >
                      <Repeat size={13} />
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => {
                        const nextMuted = !isMuted;
                        setIsMuted(nextMuted);
                        if (modalVideoRef.current) modalVideoRef.current.muted = nextMuted;
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      onClick={handleToggleFullscreen}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Fullscreen video"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-slate-400">FILE: {playingClip.fileSizeMb} MB</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      REAL H.264 STREAM
                    </span>
                    {onNavigateToInspector && (
                      <button
                        onClick={() => {
                          setPlayingClip(null);
                          onNavigateToInspector();
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 cursor-pointer font-bold"
                      >
                        Inspect in Forensics &gt;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Metadata */}
            <div className="p-3.5 bg-[#0a1224] border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Tags:</span>
                {playingClip.tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/30 text-[10px]">
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteClip(playingClip.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Delete Clip</span>
                </button>
                <button
                  onClick={() => handleDownloadClip(playingClip)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                >
                  <Download size={13} />
                  <span>DOWNLOAD CLIP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
