import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  Send,
  CheckCircle2,
  MoreHorizontal,
  Flame,
  Moon,
  Eye,
  Radio,
  Clock,
  UserCheck,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  Crosshair,
  Download,
  Share2,
  FileText,
  AlertCircle,
  Siren,
  Sparkles,
} from 'lucide-react';
import { AlertItem } from '../types';
import { fetchIncidents, acknowledgeIncident, IncidentRecord } from '../services/api';
import { webSocketService } from '../services/websocketService';

interface IncidentEvidence {
  id: string;
  logId: string;
  cameraName: string;
  cameraCode: string;
  timestamp: string;
  date: string;
  targetId: string;
  targetLabel: string;
  totalDurationSeconds: number;
  incidentTimeSeconds: number;
  imageUrl: string;
  altText: string;
  riskScore: number;
  riskSeverity: 'CRITICAL EVENT' | 'HIGH RISK' | 'ELEVATED RISK';
  inferenceWeights: {
    label: string;
    valueText: string;
    weight: number;
    weightPercent: number;
    isViolation?: boolean;
    color?: string;
  }[];
  notes: string;
  status: 'pending' | 'dispatched' | 'acknowledged' | 'resolved';
  hasRealVideo?: boolean;
  evidenceUrl?: string;
  downloadUrl?: string;
  sha256?: string;
  verificationStatus?: string;
  evidenceStatus?: 'capturing' | 'ready' | 'failed';
  fileSize?: number;
  duration?: number;
}

const INCIDENTS_DATA: IncidentEvidence[] = [
  {
    id: 'inc-001',
    logId: 'LOG: #SIH-26187-001',
    cameraName: 'PERIMETER_NW_04',
    cameraCode: 'CAM-02-PERIMETER',
    timestamp: '02:14:03 AM',
    date: '2026.08.24',
    targetId: 'ID: UNKN-992',
    targetLabel: 'Person [Bipedal]',
    totalDurationSeconds: 75,
    incidentTimeSeconds: 42,
    imageUrl: '/evidence/INC-000001.mp4',
    altText:
      'Tactical night-vision surveillance camera feed showing a chain-link fence line at night with an unidentified human figure climbing the perimeter.',
    riskScore: 98,
    riskSeverity: 'CRITICAL EVENT',
    inferenceWeights: [
      {
        label: 'OBJECT IDENTIFICATION',
        valueText: 'Person [Bipedal]',
        weight: 0.35,
        weightPercent: 35,
      },
      {
        label: 'ZONE CLASSIFICATION',
        valueText: 'Restricted Fence Line',
        weight: 0.3,
        weightPercent: 30,
      },
      {
        label: 'DWELL TIME (THRESHOLD 15s)',
        valueText: '42s (Violation)',
        weight: 0.25,
        weightPercent: 70,
        isViolation: true,
      },
      {
        label: 'TIME OF DAY',
        valueText: 'Night (02:14 AM)',
        weight: 0.1,
        weightPercent: 10,
      },
    ],
    notes: 'Perimeter scaling detected at North-West sector fence line. Subject wearing dark clothing, carrying unidentified rucksack.',
    status: 'pending',
    hasRealVideo: true,
    evidenceUrl: '/evidence/INC-000001.mp4',
    downloadUrl: '/api/incidents/inc-001/download',
    sha256: 'b634706cc8b10b7ab87988e50c20e78ce4589258df9a5621415174577884d8a2',
    verificationStatus: 'VERIFIED',
    evidenceStatus: 'ready',
  },
  {
    id: 'inc-002',
    logId: 'LOG: #SIH-26187-002',
    cameraName: 'ARMORY_BAY_A_02',
    cameraCode: 'CAM-03-ARMORY',
    timestamp: '03:41:18 AM',
    date: '2026.08.24',
    targetId: 'ID: UNKN-408',
    targetLabel: 'Unattended Heavy Payload',
    totalDurationSeconds: 90,
    incidentTimeSeconds: 58,
    imageUrl: '/evidence/INC-000002.mp4',
    altText: 'Logistics storage bay surveillance camera footage of an abandoned container left in a restricted corridor.',
    riskScore: 89,
    riskSeverity: 'CRITICAL EVENT',
    inferenceWeights: [
      {
        label: 'OBJECT IDENTIFICATION',
        valueText: 'Abandoned Pelican Crate',
        weight: 0.35,
        weightPercent: 35,
        isViolation: true,
      },
      {
        label: 'ZONE CLASSIFICATION',
        valueText: 'Ammunition Airlock Level 2',
        weight: 0.3,
        weightPercent: 30,
      },
      {
        label: 'DWELL TIME (THRESHOLD 30s)',
        valueText: '58s (Violation)',
        weight: 0.25,
        weightPercent: 85,
        isViolation: true,
      },
      {
        label: 'TIME OF DAY',
        valueText: 'Zero Shift (03:41 AM)',
        weight: 0.1,
        weightPercent: 10,
      },
    ],
    notes: 'Unattended cargo crate deposited at armory ingress. No authorized personnel badge verified in sector.',
    status: 'pending',
    hasRealVideo: true,
    evidenceUrl: '/evidence/INC-000002.mp4',
    downloadUrl: '/api/incidents/inc-002/download',
    sha256: '7c89f1d0b3456a89cde9123456789abcdef0123456789abcdef0123456789abc',
    verificationStatus: 'VERIFIED',
    evidenceStatus: 'ready',
  },
  {
    id: 'inc-003',
    logId: 'LOG: #SIH-26187-003',
    cameraName: 'MAIN_GATE_ALPHA_01',
    cameraCode: 'CAM-01-CHECKPOINT',
    timestamp: '04:12:55 AM',
    date: '2026.08.24',
    targetId: 'ID: VEH-7819',
    targetLabel: 'Black SUV (Unregistered)',
    totalDurationSeconds: 60,
    incidentTimeSeconds: 24,
    imageUrl: '/evidence/INC-000003.mp4',
    altText: 'Vehicle checkpoint surveillance camera footage of an unflagged vehicle idling at the entrance barrier.',
    riskScore: 78,
    riskSeverity: 'HIGH RISK',
    inferenceWeights: [
      {
        label: 'OBJECT IDENTIFICATION',
        valueText: 'Motor Vehicle (SUV)',
        weight: 0.3,
        weightPercent: 30,
      },
      {
        label: 'ZONE CLASSIFICATION',
        valueText: 'Barrier Gate Buffer',
        weight: 0.25,
        weightPercent: 25,
      },
      {
        label: 'ANOMALOUS TRAJECTORY',
        valueText: 'Reverse Acceleration',
        weight: 0.35,
        weightPercent: 75,
        isViolation: true,
      },
      {
        label: 'LICENSE ANPR STATUS',
        valueText: 'Unmatched In Database',
        weight: 0.1,
        weightPercent: 40,
        isViolation: true,
      },
    ],
    notes: 'Vehicle reversed away upon automated gate beam sensor engagement without presenting electronic pass.',
    status: 'pending',
    hasRealVideo: true,
    evidenceUrl: '/evidence/INC-000003.mp4',
    downloadUrl: '/api/incidents/inc-003/download',
    sha256: '9f8e7d6c5b4a39281701f2e3d4c5b6a7890123456789abcdef0123456789abcd',
    verificationStatus: 'VERIFIED',
    evidenceStatus: 'ready',
  },
];

function mapRecordToEvidence(rec: IncidentRecord): IncidentEvidence {
  const meta = typeof rec.metadata === 'object' && rec.metadata !== null ? rec.metadata : {};
  const reasons: any[] = Array.isArray(meta.reasons) ? meta.reasons : [];
  const inferenceWeights = reasons.map((r) => ({
    label: (r.description || r.code || 'PERIMETER ANOMALY').toUpperCase(),
    valueText: `+${r.points || 15} Points`,
    weight: (r.points || 15) / 100,
    weightPercent: Math.min(100, (r.points || 15) * 2),
    isViolation: true,
    color: (r.points || 15) >= 30 ? '#ffb4ab' : '#4cd7f6',
  }));

  if (inferenceWeights.length === 0) {
    inferenceWeights.push({
      label: 'RESTRICTED PERIMETER INTRUSION',
      valueText: 'Violation Detected',
      weight: 0.4,
      weightPercent: 80,
      isViolation: true,
      color: '#ffb4ab',
    });
  }

  const d = new Date(rec.started_at);
  const timeStr = isNaN(d.getTime()) ? '02:14:03 AM' : d.toLocaleTimeString();
  const dateStr = isNaN(d.getTime()) ? '2026.08.28' : d.toISOString().slice(0, 10).replace(/-/g, '.');

  return {
    id: rec.id,
    logId: `INC: #${rec.id.slice(0, 8).toUpperCase()}`,
    cameraName: rec.camera_id.toUpperCase(),
    cameraCode: `${rec.camera_id.toUpperCase()}-NODE`,
    timestamp: timeStr,
    date: dateStr,
    targetId: rec.track_id ? `ID: TRK-${rec.track_id}` : 'ID: UNKN-PERSON',
    targetLabel: `${meta.class_name || 'person'} [${rec.event_type || 'INTRUSION'}]`,
    totalDurationSeconds: Math.round((rec.pre_event_seconds || 10) + (rec.post_event_seconds || 10)),
    incidentTimeSeconds: Math.round(rec.pre_event_seconds || 10),
    imageUrl: rec.evidence_status === 'ready' || rec.evidence_path
      ? `/api/incidents/${rec.id}/evidence`
      : 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80',
    altText: `Incident recorded on ${rec.camera_id} in ${rec.zone_name || 'Restricted Perimeter'}`,
    riskScore: rec.risk_score || 85,
    riskSeverity: rec.risk_level === 'CRITICAL' ? 'CRITICAL EVENT' : rec.risk_level === 'HIGH' ? 'HIGH RISK' : 'ELEVATED RISK',
    inferenceWeights,
    notes: `Verified security breach on ${rec.camera_id} (${rec.zone_name || 'Zone Alpha'}). Risk Score: ${rec.risk_score}/100 [${rec.risk_level}]. Status: ${rec.evidence_status}.`,
    status: rec.acknowledged ? 'acknowledged' : 'pending',
    hasRealVideo: rec.evidence_status === 'ready' || Boolean(rec.evidence_path),
    evidenceUrl: rec.evidence_status === 'ready' || Boolean(rec.evidence_path)
      ? `/api/incidents/${rec.id}/evidence`
      : undefined,
    downloadUrl: rec.evidence_status === 'ready' || Boolean(rec.evidence_path) ? `/api/incidents/${rec.id}/download` : undefined,
    sha256: rec.sha256 || meta.sha256 || undefined,
    verificationStatus: rec.verification_status || (rec.evidence_status === 'ready' ? 'VERIFIED' : 'PENDING'),
    evidenceStatus: rec.evidence_status,
    fileSize: rec.file_size || meta.file_size,
    duration: rec.duration || meta.duration,
  };
}

export const IncidentInspectorView: React.FC = () => {
  const [incidentsList, setIncidentsList] = useState<IncidentEvidence[]>(INCIDENTS_DATA);
  const [selectedIncidentIndex, setSelectedIncidentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(42);
  const [realDuration, setRealDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visionFilter, setVisionFilter] = useState<'night' | 'thermal' | 'optical'>('night');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [qrtDispatched, setQrtDispatched] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [qrtCountdown, setQrtCountdown] = useState(180); // 3 minutes ETA

  useEffect(() => {
    fetchIncidents()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const realMapped = res.data.map(mapRecordToEvidence);
          setIncidentsList(realMapped);
        }
      })
      .catch(() => {});

    const unsubInc = webSocketService.onIncidentCreated((inc) => {
      const mapped = mapRecordToEvidence(inc as any);
      setIncidentsList((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)]);
    });

    const unsubEv = webSocketService.onEvidenceReady((ev) => {
      setIncidentsList((prev) =>
        prev.map((item) =>
          item.id === ev.id
            ? {
                ...item,
                hasRealVideo: true,
                evidenceUrl: `/api/incidents/${ev.id}/evidence`,
                downloadUrl: `/api/incidents/${ev.id}/download`,
              }
            : item
        )
      );
    });

    return () => {
      unsubInc();
      unsubEv();
    };
  }, []);

  const currentIncident = incidentsList[selectedIncidentIndex] || incidentsList[0] || INCIDENTS_DATA[0];

  // Playback timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= currentIncident.totalDurationSeconds) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIncident.totalDurationSeconds]);

  // Reset playback position on incident change
  useEffect(() => {
    setCurrentTimeSec(currentIncident.incidentTimeSeconds);
    setQrtDispatched(false);
    setAcknowledged(false);
  }, [selectedIncidentIndex]);

  // QRT Countdown timer when dispatched
  useEffect(() => {
    let timer: any;
    if (qrtDispatched && qrtCountdown > 0) {
      timer = setInterval(() => {
        setQrtCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [qrtDispatched, qrtCountdown]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDispatchQrt = () => {
    setQrtDispatched(true);
    setQrtCountdown(165);
    setToastMessage(`QRT UNIT PATRIOT-1 DISPATCHED TO ${currentIncident.cameraName}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    setToastMessage(`INCIDENT ${currentIncident.logId} ACKNOWLEDGED & LOGGED BY OPERATOR`);
    if (currentIncident.id && !currentIncident.id.startsWith('inc-00')) {
      acknowledgeIncident(currentIncident.id).catch(() => {});
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportDossier = () => {
    const reportData = {
      incidentLogId: currentIncident.logId,
      camera: currentIncident.cameraName,
      timestamp: currentIncident.timestamp,
      date: currentIncident.date,
      targetId: currentIncident.targetId,
      riskScore: currentIncident.riskScore,
      severity: currentIncident.riskSeverity,
      explainableWeights: currentIncident.inferenceWeights,
      notes: currentIncident.notes,
      operatorAction: qrtDispatched ? 'QRT DISPATCHED' : acknowledged ? 'ACKNOWLEDGED' : 'OPEN',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-dossier-${currentIncident.cameraName.toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setToastMessage('Tactical incident forensics dossier exported.');
    setTimeout(() => setToastMessage(null), 3000);
    setShowMoreActions(false);
  };

  return (
    <div className="flex flex-col w-full space-y-4 max-w-7xl mx-auto" id="incident-inspector-root">
      {/* Dynamic Alert Banner / Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#070d1f] border-2 border-primary text-primary px-5 py-3 rounded-xl shadow-[0_0_25px_rgba(76,215,246,0.4)] flex items-center gap-3 font-mono text-xs font-bold animate-in fade-in slide-in-from-top-4 backdrop-blur-md">
          <Siren size={18} className="text-primary animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Incident Switcher Bar */}
      <div className="bg-[#0c1324] border border-[#3d494c]/40 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-[#003640] text-[#4cd7f6] rounded-lg border border-[#4cd7f6]/40">
            <Crosshair size={18} />
          </span>
          <div>
            <h1 className="text-xs font-mono font-black text-[#dce1fb] uppercase tracking-widest flex items-center gap-2">
              <span>SEEMADRISHTI AI | SECTOR COMMAND</span>
              <span className="text-[#869397] font-normal">|</span>
              <span className="text-[#4cd7f6]">INCIDENT INSPECTOR</span>
            </h1>
            <p className="text-[11px] text-[#bcc9cd] font-mono">
              High-Precision Forensics, Frame Scrubber & Neural Risk Weight Explainability
            </p>
          </div>
        </div>

        {/* Incidents Carousel Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {incidentsList.map((inc, idx) => {
            const isSelected = selectedIncidentIndex === idx;
            return (
              <button
                key={inc.id}
                onClick={() => setSelectedIncidentIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#3f465c] text-[#dce1fb] border-[#4cd7f6] shadow-[0_0_12px_rgba(76,215,246,0.3)]'
                    : 'bg-[#191f31] text-[#bcc9cd] border-[#3d494c]/30 hover:bg-[#23293c] hover:text-[#dce1fb]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    inc.riskScore > 90 ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span>{inc.cameraName.split('_')[0]} #{idx + 1}</span>
                <span className="text-[10px] text-[#4cd7f6]">{inc.riskScore}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Evidence Loop (8 cols) + Explainable Risk (4 cols) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel: Evidence Loop / Playback (8 cols) */}
        <div className="col-span-12 lg:col-span-8 relative flex flex-col gap-3">
          {/* Top Panel Bar */}
          <div className="flex items-center justify-between border-b border-[#3d494c]/50 pb-2">
            <div className="flex items-center gap-2">
              <Film className="text-[#4cd7f6]" size={18} />
              <span className="font-mono text-xs text-[#4cd7f6] uppercase tracking-widest font-bold">
                Evidence Loop / Playback
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Vision Mode Selectors */}
              <div className="flex items-center bg-[#070d1f] border border-[#3d494c]/40 rounded-lg p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => setVisionFilter('night')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                    visionFilter === 'night'
                      ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] border border-[#4cd7f6]/50'
                      : 'text-[#bcc9cd] hover:text-white'
                  }`}
                >
                  NIGHT IR
                </button>
                <button
                  onClick={() => setVisionFilter('thermal')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                    visionFilter === 'thermal'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'text-[#bcc9cd] hover:text-white'
                  }`}
                >
                  THERMAL FLIR
                </button>
                <button
                  onClick={() => setVisionFilter('optical')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                    visionFilter === 'optical'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      : 'text-[#bcc9cd] hover:text-white'
                  }`}
                >
                  OPTICAL RGB
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${
                  currentIncident.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                }`}>
                  FORENSIC EVIDENCE // {currentIncident.verificationStatus || 'VERIFIED'}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-pulse border border-[#ffb4ab] shadow-[0_0_8px_#ffb4ab]"></div>
                  <span className="font-mono text-[11px] text-[#ffb4ab] tracking-widest font-bold">
                    {currentIncident.riskSeverity}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Feed Screen Box with HUD trim */}
          <div className="hud-trim border border-[#3d494c] bg-[#191f31]/60 backdrop-blur-md relative h-[560px] w-full p-2 group rounded-xl shadow-2xl overflow-hidden">
            <div className="relative w-full h-full border border-[#3d494c]/40 overflow-hidden bg-black flex items-center justify-center rounded-lg">
              {/* Tactical Camera Image or MP4 Video Feed */}
              {currentIncident.hasRealVideo || currentIncident.evidenceUrl ? (
                <video
                  ref={videoRef}
                  key={`${currentIncident.id}-${visionFilter}`}
                  src={currentIncident.evidenceUrl || `/evidence/INC-00000${(selectedIncidentIndex % 5) + 1}.mp4`}
                  autoPlay
                  playsInline
                  muted
                  loop
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (!isNaN(d) && d > 0) setRealDuration(d);
                    e.currentTarget.play().catch(() => {});
                  }}
                  onTimeUpdate={(e) => setCurrentTimeSec(Math.floor(e.currentTarget.currentTime))}
                  onError={(e) => {
                    // Fallback to static evidence file if dynamic API fails
                    const target = e.currentTarget;
                    const fallbackSrc = `/evidence/INC-00000${(selectedIncidentIndex % 5) + 1}.mp4`;
                    if (target.src !== fallbackSrc && !target.src.endsWith(fallbackSrc)) {
                      target.src = fallbackSrc;
                      target.play().catch(() => {});
                    }
                  }}
                  className={`absolute inset-0 w-full h-full object-contain z-10 transition-all duration-300 ${
                    visionFilter === 'thermal'
                      ? 'filter invert contrast-150 hue-rotate-180 brightness-110'
                      : visionFilter === 'night'
                      ? 'filter contrast-125 brightness-105 hue-rotate-30'
                      : 'filter contrast-105 brightness-100'
                  }`}
                />
              ) : (
                <div className="absolute inset-0 bg-[#070d1f] flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
                  <AlertTriangle size={44} className="text-amber-400 animate-pulse" />
                  <span className="font-mono text-sm font-black text-[#dce1fb] tracking-wider uppercase">
                    [ EVIDENCE NOT AVAILABLE ]
                  </span>
                  <span className="font-mono text-xs text-[#869397] max-w-md">
                    {currentIncident.evidenceStatus === 'capturing'
                      ? 'ACTIVE INCIDENT — CIRCULAR BUFFER ASSEMBLING POST-EVENT FRAMES'
                      : 'NO FORENSIC RECORDING CLIP PERSISTED FOR THIS INCIDENT RECORD'}
                  </span>
                </div>
              )}

              {/* Night Vision Tint */}
              {visionFilter === 'night' && (
                <div className="absolute inset-0 bg-[#4cd7f6]/10 pointer-events-none mix-blend-overlay" />
              )}

              {/* Tactical Crosshairs & Target Lock Box */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[320px] h-[320px] border border-[#4cd7f6]/30 rounded-full relative animate-[pulse_4s_infinite]">
                  <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#4cd7f6]/20 -translate-x-1/2"></div>
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#4cd7f6]/20 -translate-y-1/2"></div>

                  {/* Corner marks inside circle */}
                  <div className="absolute top-8 left-8 w-3 h-3 border-t-2 border-l-2 border-[#4cd7f6]/40" />
                  <div className="absolute top-8 right-8 w-3 h-3 border-t-2 border-r-2 border-[#4cd7f6]/40" />
                  <div className="absolute bottom-8 left-8 w-3 h-3 border-b-2 border-l-2 border-[#4cd7f6]/40" />
                  <div className="absolute bottom-8 right-8 w-3 h-3 border-b-2 border-r-2 border-[#4cd7f6]/40" />

                  {/* Target Lock Box */}
                  <div className="absolute top-[38%] left-[44%] w-[48px] h-[92px] border-2 border-[#ffb4ab] bg-[#93000a]/20 shadow-[0_0_15px_rgba(255,180,171,0.6)] animate-pulse">
                    <span className="absolute -top-6 -left-1 font-mono text-[10px] text-[#ffb4ab] bg-black/80 px-1.5 py-0.5 rounded border border-[#ffb4ab]/40 whitespace-nowrap font-bold">
                      {currentIncident.targetId}
                    </span>
                    <div className="absolute -bottom-5 -left-1 font-mono text-[9px] text-[#4cd7f6] bg-black/80 px-1 py-0.5 rounded whitespace-nowrap">
                      {currentIncident.riskScore}% THREAT
                    </div>
                  </div>
                </div>
              </div>

              {/* Scanline FX */}
              <div className="scanline-effect" />

              {/* Video Overlays (Top Left) */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20">
                <span className="font-mono text-[11px] text-[#dce1fb] bg-[#0c1324]/85 px-2.5 py-1 border border-[#3d494c]/60 backdrop-blur-md rounded font-bold">
                  {currentIncident.logId}
                </span>
                <span className="font-mono text-[10px] text-[#4cd7f6] bg-[#0c1324]/85 px-2.5 py-0.5 border border-[#3d494c]/60 backdrop-blur-md rounded font-semibold">
                  CAM: {currentIncident.cameraName}
                </span>
                {qrtDispatched && (
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/90 px-2.5 py-0.5 border border-emerald-500/50 backdrop-blur-md rounded font-bold animate-pulse flex items-center gap-1.5">
                    <Siren size={12} />
                    <span>QRT PATRIOT-1 EN ROUTE (ETA {Math.floor(qrtCountdown / 60)}m {qrtCountdown % 60}s)</span>
                  </span>
                )}
              </div>

              {/* Live Video Scrubber Bar & Controls (Bottom) */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between border-t border-[#3d494c]/60 pt-3 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) {
                          videoRef.current.pause();
                        } else {
                          videoRef.current.play();
                        }
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className="text-[#dce1fb] hover:text-[#4cd7f6] transition-colors cursor-pointer p-1"
                    title={isPlaying ? 'Pause Loop' : 'Play Loop'}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>

                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] text-[#bcc9cd] uppercase tracking-wider">
                      T-MINUS
                    </span>
                    <span className="font-mono text-xs text-[#dce1fb] font-bold">
                      {formatTime(currentTimeSec)} / {formatTime(Math.round(realDuration || currentIncident.totalDurationSeconds))}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Incident Mark */}
                <div
                  className="flex-1 mx-6 relative h-2 bg-[#2e3447] rounded cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, clickX / rect.width));
                    const effDuration = realDuration || currentIncident.totalDurationSeconds || 20;
                    const newTime = Math.floor(pct * effDuration);
                    setCurrentTimeSec(newTime);
                    if (videoRef.current) {
                      videoRef.current.currentTime = newTime;
                    }
                  }}
                >
                  {/* Current progress */}
                  <div
                    className="absolute left-0 top-0 h-full bg-[#4cd7f6] rounded"
                    style={{
                      width: `${(currentTimeSec / (realDuration || currentIncident.totalDurationSeconds || 20)) * 100}%`,
                    }}
                  />

                  {/* Playhead slider */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-5 bg-[#4cd7f6] rounded-sm shadow-[0_0_8px_#4cd7f6] -translate-x-1/2 pointer-events-none"
                    style={{
                      left: `${(currentTimeSec / (realDuration || currentIncident.totalDurationSeconds || 20)) * 100}%`,
                    }}
                  />

                  {/* Incident Marker Flag */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-[#ffb4ab] border border-[#ffdad6] shadow-[0_0_6px_#ffb4ab] -translate-x-1/2"
                    style={{
                      left: `${(currentIncident.incidentTimeSeconds / (realDuration || currentIncident.totalDurationSeconds || 20)) * 100}%`,
                    }}
                    title={`Incident Point: ${formatTime(currentIncident.incidentTimeSeconds)}`}
                  />
                </div>

                {/* Timestamp & REC */}
                <div className="font-mono text-[10px] text-[#bcc9cd] text-right font-medium">
                  REC: {currentIncident.date}
                  <br />
                  {currentIncident.timestamp}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Explainable Risk Breakdown (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[#3d494c]/50 pb-2">
            <span className="text-[#4cd7f6]">
              <Sparkles size={18} />
            </span>
            <span className="font-mono text-xs text-[#4cd7f6] uppercase tracking-widest font-bold">
              Explainable Risk
            </span>
          </div>

          {/* Risk Card with hud-trim and red border */}
          <div className="hud-trim border border-[#ffb4ab]/50 bg-[#93000a]/10 backdrop-blur-md relative h-[560px] flex flex-col justify-between p-4 rounded-xl shadow-2xl">
            {/* Risk Vector List */}
            <div className="flex flex-col gap-3.5">
              <div className="font-mono text-[10px] text-[#bcc9cd] uppercase tracking-widest flex items-center justify-between">
                <span>INFERENCE WEIGHTS</span>
                <span className="text-[#4cd7f6]">NEURAL v4.8</span>
              </div>

              {/* Items */}
              {currentIncident.inferenceWeights.map((weightItem, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 border-b border-[#3d494c]/30 pb-2.5 last:border-b-0"
                >
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] text-[#bcc9cd] uppercase tracking-wider font-bold">
                        {weightItem.label}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          weightItem.isViolation ? 'text-[#ffb4ab]' : 'text-[#dce1fb]'
                        }`}
                      >
                        {weightItem.valueText}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        weightItem.isViolation ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'
                      }`}
                    >
                      W: {weightItem.weight.toFixed(2)}
                    </span>
                  </div>

                  {/* Weight Progress Bar */}
                  <div className="w-full h-[3px] bg-[#2e3447] relative rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full ${
                        weightItem.isViolation ? 'bg-[#ffb4ab]' : 'bg-[#4cd7f6]'
                      }`}
                      style={{ width: `${weightItem.weightPercent}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Tactical Notes */}
              <div className="p-2 bg-[#0c1324]/80 border border-[#3d494c]/40 rounded-lg text-[10px] font-mono text-[#bcc9cd]">
                <span className="text-[#4cd7f6] font-bold block mb-0.5">TACTICAL ASSESSMENT:</span>
                {currentIncident.notes}
              </div>

              {/* Cryptographic SHA-256 Seal Box */}
              <div className="p-2 bg-[#070d1f] border border-[#3d494c]/50 rounded-lg font-mono text-[10px] flex flex-col gap-1.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[#4cd7f6] font-bold flex items-center gap-1.5 text-[10px]">
                    <ShieldAlert size={13} className="text-[#4cd7f6]" />
                    <span>FORENSIC INTEGRITY SEAL</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                    currentIncident.verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                      : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                  }`}>
                    {currentIncident.verificationStatus || 'VERIFIED'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1.5 bg-black/60 p-1.5 rounded border border-[#3d494c]/30">
                  <span className="text-[#869397] text-[9px] truncate select-all font-mono" title={currentIncident.sha256}>
                    SHA-256: {currentIncident.sha256 ? `${currentIncident.sha256.slice(0, 16)}...${currentIncident.sha256.slice(-8)}` : 'b634706cc8b10b7ab87988e50c20e78c...'}
                  </span>
                  <button
                    onClick={() => {
                      const hashToCopy = currentIncident.sha256 || 'b634706cc8b10b7ab87988e50c20e78c7a9c809af4b64a14a0a902f7e51190dc';
                      navigator.clipboard.writeText(hashToCopy);
                      setToastMessage('Cryptographic SHA-256 digest copied to clipboard');
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="text-[#4cd7f6] hover:text-white px-2 py-0.5 rounded text-[9px] font-bold bg-[#0c1324] border border-[#4cd7f6]/40 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    COPY
                  </button>
                </div>
              </div>
            </div>

            {/* Final Risk Score Box */}
            <div className="mt-4 border-2 border-[#ffb4ab] bg-[#93000a]/20 p-5 flex flex-col items-center justify-center relative overflow-hidden group rounded-xl shadow-[0_0_20px_rgba(147,0,10,0.5)]">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#ffb4ab]/20 blur-xl group-hover:bg-[#ffb4ab]/30 transition-all"></div>
              <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-[#ffb4ab]/20 blur-xl group-hover:bg-[#ffb4ab]/30 transition-all"></div>

              <span className="font-mono text-[11px] text-[#ffb4ab] tracking-widest mb-1 relative z-10 font-black">
                FINAL RISK SCORE
              </span>
              <span className="font-mono text-[52px] leading-none text-[#ffb4ab] font-black drop-shadow-[0_0_12px_#ffb4ab] relative z-10">
                {currentIncident.riskScore}%
              </span>
              <span className="font-mono text-[11px] text-[#ffdad6] bg-[#93000a] px-3 py-1 mt-3 relative z-10 rounded font-black border border-[#ffb4ab]/40">
                [{currentIncident.riskSeverity}]
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Panel: Action Bar (12 cols) */}
        <div className="col-span-12 flex flex-col sm:flex-row gap-3 pt-3 border-t border-[#3d494c]/40">
          {/* Dispatch QRT Button */}
          <button
            onClick={handleDispatchQrt}
            className={`flex-1 group relative hud-trim border border-[#ffb4ab] transition-all duration-300 py-3.5 px-6 flex items-center justify-center gap-3 overflow-hidden rounded-xl cursor-pointer ${
              qrtDispatched
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-[#93000a]/30 hover:bg-[#93000a] text-[#ffb4ab] hover:text-white shadow-[0_0_15px_rgba(147,0,10,0.4)]'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ffb4ab]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <Siren
              size={20}
              className={qrtDispatched ? 'text-emerald-400 animate-bounce' : 'text-[#ffb4ab] group-hover:text-white'}
            />
            <span className="font-mono text-sm font-black uppercase tracking-wider">
              {qrtDispatched ? 'QRT UNIT DISPATCHED (PATRIOT-1)' : 'Dispatch QRT'}
            </span>
          </button>

          {/* Acknowledge Alert Button */}
          <button
            onClick={handleAcknowledge}
            className={`flex-1 hud-trim border transition-all duration-300 py-3.5 px-6 flex items-center justify-center gap-3 rounded-xl cursor-pointer ${
              acknowledged
                ? 'bg-blue-950/80 border-blue-400 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'border-[#3d494c] bg-[#2e3447] hover:bg-[#33394c] text-[#dce1fb]'
            }`}
          >
            <CheckCircle2 size={18} className={acknowledged ? 'text-blue-400' : 'text-[#bcc9cd]'} />
            <span className="font-mono text-sm font-black uppercase tracking-wider">
              {acknowledged ? 'Incident Acknowledged' : 'Acknowledge Alert'}
            </span>
          </button>

          {/* More Actions Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="w-full sm:w-16 hud-trim border border-[#3d494c] bg-[#191f31] hover:bg-[#2e3447] transition-all duration-300 py-3.5 flex items-center justify-center text-[#bcc9cd] hover:text-white rounded-xl cursor-pointer"
              title="More Actions"
            >
              <MoreHorizontal size={20} />
            </button>

            {/* Dropdown Menu */}
            {showMoreActions && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#070d1f] border border-[#3d494c] rounded-xl shadow-2xl p-1.5 z-50 font-mono text-xs text-[#dce1fb]">
                <button
                  onClick={handleExportDossier}
                  className="w-full text-left px-3 py-2 hover:bg-[#191f31] rounded-lg flex items-center gap-2 text-cyan-400 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Export JSON Dossier</span>
                </button>
                <button
                  onClick={() => {
                    setToastMessage('Tactical feed broadcast shared to command channel.');
                    setShowMoreActions(false);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#191f31] rounded-lg flex items-center gap-2 text-slate-300 cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>Broadcast to Radios</span>
                </button>
                <button
                  onClick={() => {
                    setToastMessage('Telemetry archived to incident vault.');
                    setShowMoreActions(false);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#191f31] rounded-lg flex items-center gap-2 text-slate-300 cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Archive to SIH Vault</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
