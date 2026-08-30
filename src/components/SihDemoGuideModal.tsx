import React, { useState } from 'react';
import {
  X,
  Compass,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  Camera,
  ShieldAlert,
  Radio,
  FileText,
  Activity,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ViewMode } from '../types';

export interface SihDemoStep {
  stepNumber: number;
  title: string;
  category: string;
  targetView: ViewMode;
  actionHint: string;
  description: string;
  bulletPoints: string[];
}

export const SIH_MISSION_DEMO_STEPS: SihDemoStep[] = [
  {
    stepNumber: 1,
    title: 'STEP 01: SHOW REAL 9-CAMERA MATRIX',
    category: 'Tactical Matrix',
    targetView: 'dashboard',
    actionHint: 'Observe 9-camera operational matrix with synchronized feeds.',
    description: 'High-density 9-camera operational matrix providing instantaneous wide-area situational awareness across Sectors Alpha through India.',
    bulletPoints: [
      'Synchronized video frames and neural detections via WebSocket.',
      'Developer Sync Overlay toggled via [Ctrl+Shift+D] showing real-time frame ID.',
      'Zero synthetic fallback targets; strictly authoritative CV telemetry.',
    ],
  },
  {
    stepNumber: 2,
    title: 'STEP 02: SELECT CAM-01 (SECTOR ALPHA)',
    category: 'Target Camera',
    targetView: 'dashboard',
    actionHint: 'Focus on CAM-01 Sector Alpha Main Gate for end-to-end verification.',
    description: 'Direct operator selection of CAM-01 to demonstrate full edge inference pipeline on VisDrone fixture.',
    bulletPoints: [
      'Isolated camera state with dedicated zone geometry.',
      'Deterministic video playback fixture CAM-01.mp4 (1344x756).',
      'Real CCTV footage without artificial simulated elements.',
    ],
  },
  {
    stepNumber: 3,
    title: 'STEP 03: SHOW REAL VIDEO INGESTION',
    category: 'Live Stream',
    targetView: 'livestream',
    actionHint: 'View genuine source video ingestion in quad stream view.',
    description: 'Truthfully labeled video stream playback with measured frame rate and sub-second ingestion latency.',
    bulletPoints: [
      'Labeled: SOURCE: VISDRONE PLAYBACK (MP4).',
      'Real-time frame ingestion with circular buffer caching.',
      'Truthful status without fake RTSP/Satellite claims.',
    ],
  },
  {
    stepNumber: 4,
    title: 'STEP 04: SHOW YOLOv8 NEURAL DETECTIONS',
    category: 'Neural Inference',
    targetView: 'detections',
    actionHint: 'Examine live bounding boxes with class labels and confidence.',
    description: 'YOLOv8 edge neural detection running inference directly on CCTV video frames at 30+ FPS.',
    bulletPoints: [
      'Real bounding boxes with normalized coordinates [ymin, xmin, ymax, xmax].',
      'Class classification: person, car, truck, bus, motorcycle, bicycle.',
      'Confidence scoring directly from PyTorch model output.',
    ],
  },
  {
    stepNumber: 5,
    title: 'STEP 05: SHOW PERSON & OBJECT COUNTING',
    category: 'Object Counting',
    targetView: 'dashboard',
    actionHint: 'Inspect Active Persons vs Cumulative Unique Session Targets.',
    description: 'Real ByteTrack active object counts separated cleanly from cumulative unique tracks.',
    bulletPoints: [
      'Active Persons, Active Vehicles, and Total Active Tracks.',
      'Cumulative session unique IDs without duplicate multi-counting.',
      'Direct WebSocket telemetry from cv_service/main.py.',
    ],
  },
  {
    stepNumber: 6,
    title: 'STEP 06: SHOW BYTE TRACK ID PERSISTENCE',
    category: 'Tracking',
    targetView: 'detections',
    actionHint: 'Observe persistent track IDs (e.g. TRK-33) through movement.',
    description: 'ByteTrack association using Kalman filtering and Hungarian matching to maintain persistent IDs through occlusions.',
    bulletPoints: [
      'Track ID persistence across frames without identity switching.',
      'Clean state lifecycle: active, lost, and removed tracks.',
      'Per-camera isolated tracking indices.',
    ],
  },
  {
    stepNumber: 7,
    title: 'STEP 07: SHOW CENTROID TRAJECTORIES',
    category: 'Trajectory Analysis',
    targetView: 'detections',
    actionHint: 'Review historical centroid trajectory trail vectors.',
    description: 'Real 2D centroid history recording spatial displacement and movement heading over time.',
    bulletPoints: [
      'Centroid pathing vectors drawn from normalized coordinates.',
      'Instantaneous movement vector calculation for tripwire math.',
      'Trajectory buffer resets cleanly upon session restart.',
    ],
  },
  {
    stepNumber: 8,
    title: 'STEP 08: SHOW RESTRICTED ZONE GEOMETRY',
    category: 'Geofencing',
    targetView: 'calibration',
    actionHint: 'Inspect polygonal perimeter zones in Camera Calibration Tool.',
    description: 'Polygonal virtual restricted zones calibrated around genuine object trajectories.',
    bulletPoints: [
      'Interactive polygon vertex editor with normalized coordinates.',
      'Ray-casting point-in-polygon algorithm in cv_service/geometry/polygon.py.',
      'Direct persistence to config/camera_zones.json.',
    ],
  },
  {
    stepNumber: 9,
    title: 'STEP 09: SHOW REAL ZONE ENTRY',
    category: 'Perimeter Intrusion',
    targetView: 'dashboard',
    actionHint: 'Observe RESTRICTED_ZONE_ENTRY event upon crossing boundary.',
    description: 'State transition gating: OUTSIDE -> INSIDE emits immediate intrusion alert; remaining INSIDE produces zero duplicates.',
    bulletPoints: [
      'Real entry event triggered by Track #33 / #6 / #11.',
      'No duplicate spam while target lingers inside zone.',
      'Subsequent re-entry correctly generates re-alert.',
    ],
  },
  {
    stepNumber: 10,
    title: 'STEP 10: SHOW VIRTUAL TRIPWIRE',
    category: 'Tripwire Line',
    targetView: 'calibration',
    actionHint: 'Examine 2-point virtual tripwire line segment.',
    description: 'Line segment tripwire placed strategically across natural movement corridor.',
    bulletPoints: [
      'Configured line endpoints P1 and P2 in normalized space.',
      'Normal vector calculation determining direction of crossing.',
      'Editable via interactive calibration canvas.',
    ],
  },
  {
    stepNumber: 11,
    title: 'STEP 11: SHOW REAL TRIPWIRE CROSSING',
    category: 'Line Crossing',
    targetView: 'dashboard',
    actionHint: 'Observe TRIPWIRE_CROSSING event as trajectory intersects line.',
    description: 'Trajectory segment intersection algorithm detecting real crossing in mathematical sub-millisecond time.',
    bulletPoints: [
      'Segments intersect math: prev_pos -> curr_pos crossed with P1 -> P2.',
      'Cooldown suppresses jitter and multi-triggers.',
      'Real crossing observed on CAM-01 footage.',
    ],
  },
  {
    stepNumber: 12,
    title: 'STEP 12: SHOW CROSSING DIRECTION (IN / OUT)',
    category: 'Directional Math',
    targetView: 'dashboard',
    actionHint: 'Verify 2D vector dot product normal math (IN vs OUT).',
    description: 'Movement vector dot product with normal vector determining if crossing is INBOUND or OUTBOUND.',
    bulletPoints: [
      'Dot product > 0: Direction IN (increments Entry Count).',
      'Dot product < 0: Direction OUT (increments Exit Count).',
      'Calculates Net Occupancy = Entries - Exits.',
    ],
  },
  {
    stepNumber: 13,
    title: 'STEP 13: SHOW EXPLAINABLE RISK SCORE',
    category: 'Risk Engine',
    targetView: 'alerts',
    actionHint: 'Examine explainable threat point breakdown (0-100 score).',
    description: 'Multi-factor risk assessment combining zone intrusion (+40), tripwire (+25), and loitering (+25).',
    bulletPoints: [
      'Explainable points: zero arbitrary scoring.',
      'Severity mapping: LOW, MEDIUM, HIGH, CRITICAL.',
      'Audit trail recorded into database.',
    ],
  },
  {
    stepNumber: 14,
    title: 'STEP 14: SHOW ALERT DISPATCH',
    category: 'Threat Alert',
    targetView: 'alerts',
    actionHint: 'Observe real-time threat alert cards with tactical badges.',
    description: 'Instantaneous WebSocket broadcast of alert to command centre with audio ping and defcon escalation.',
    bulletPoints: [
      'Alert cards with TRIPWIRE and RESTRICTED ZONE badges.',
      'Deduplicated alerts: no redundant alerts for single breach.',
      'Clickable card opens full incident dossier.',
    ],
  },
  {
    stepNumber: 15,
    title: 'STEP 15: OPEN INCIDENT DOSSIER',
    category: 'Incident Dossier',
    targetView: 'inspector',
    actionHint: 'Open complete incident dossier with target parameters.',
    description: 'Full forensic dossier displaying Incident ID, Camera ID, Track ID, Class, Confidence, Zone, and Risk.',
    bulletPoints: [
      'Comprehensive metadata: first seen, last seen, coordinates.',
      'Direct link from alert to incident record.',
      'Zero synthetic placeholder values.',
    ],
  },
  {
    stepNumber: 16,
    title: 'STEP 16: SHOW CHRONOLOGICAL TIMELINE',
    category: 'Incident Timeline',
    targetView: 'inspector',
    actionHint: 'Review chronological event sequence with real timestamps.',
    description: 'Major Phase 18 feature: ordered chronological timeline from detection to cryptographic seal.',
    bulletPoints: [
      'Real timestamps for every lifecycle transition.',
      'Track established -> Zone entered -> Tripwire crossed -> Risk escalated.',
      'Forensic evidence finalized -> SHA-256 verified.',
    ],
  },
  {
    stepNumber: 17,
    title: 'STEP 17: PLAY FORENSIC EVIDENCE VIDEO',
    category: 'Forensic Video',
    targetView: 'inspector',
    actionHint: 'Play native H.264 MP4 clip with non-black source imagery.',
    description: 'Verified Phase 16/17 evidence pipeline preserving actual CCTV frames in pre/post event circular buffer.',
    bulletPoints: [
      'Native ffmpeg libx264 encoding with YUV420p pixel format.',
      'Verified non-black frames with tactical HUD overlay.',
      'Truthful status: READY, PROCESSING, or UNAVAILABLE.',
    ],
  },
  {
    stepNumber: 18,
    title: 'STEP 18: VERIFY SHA-256 CRYPTOGRAPHIC HASH',
    category: 'Cryptographic Seal',
    targetView: 'evidence-queue',
    actionHint: 'Verify SHA-256 cryptographic seal and tamper detection.',
    description: 'Court-admissible SHA-256 digital fingerprint ensuring evidence video has not been altered or tampered.',
    bulletPoints: [
      'SHA-256 computed on raw file bytes matches stored database hash.',
      'Tamper detection: any byte change triggers immediate security alarm.',
      'Downloadable evidence package with cryptographic certificate.',
    ],
  },
  {
    stepNumber: 19,
    title: 'STEP 19: SHOW HISTORICAL ANALYTICS',
    category: 'Analytics Engine',
    targetView: 'analytics',
    actionHint: 'Examine movement flow, occupancy, and most active areas.',
    description: 'Historical movement analytics over 15m, 1h, 6h, 24h ranges with truthful INSUFFICIENT DATA handling.',
    bulletPoints: [
      'People and vehicle count trends over time.',
      'Most active camera, most active zone, and most common class.',
      'Zero fake placeholder numbers: pure database records.',
    ],
  },
  {
    stepNumber: 20,
    title: 'STEP 20: SHOW CROSS-CAMERA CORRELATION',
    category: 'Multi-Cam Stitching',
    targetView: 'stitching',
    actionHint: 'Review target handover chain across adjacent camera sectors.',
    description: 'Correlation engine tracking targets moving across CAM-01 -> CAM-02 -> CAM-04.',
    bulletPoints: [
      'Corridor traversal time and handover direction.',
      'Truthful display: shows CORRELATION INCONCLUSIVE when data is insufficient.',
      'Multi-camera situational awareness without blind spots.',
    ],
  },
  {
    stepNumber: 21,
    title: 'STEP 21: SHOW SYSTEM INTEGRITY & MISSION CONTROL',
    category: 'System Integrity',
    targetView: 'mission-control',
    actionHint: 'Inspect CV heartbeat, SQLite WAL, and operational health.',
    description: 'Overall system health matrix validating complete platform readiness for border deployment.',
    bulletPoints: [
      'CV engine heartbeat and processing latency telemetry.',
      'SQLite WAL database integrity with foreign key constraints.',
      'Full judge demonstration complete and verified.',
    ],
  },
];

interface SihDemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: ViewMode) => void;
}

export const SihDemoGuideModal: React.FC<SihDemoGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  if (!isOpen) return null;

  const currentStep = SIH_MISSION_DEMO_STEPS[currentStepIdx];
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === SIH_MISSION_DEMO_STEPS.length - 1;

  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleJumpToStep = (idx: number) => {
    setCurrentStepIdx(idx);
  };

  const handleExecuteStep = () => {
    onNavigateToView(currentStep.targetView);
    onClose();
  };

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        setResetMessage('DEMO SESSION RESET EXECUTED');
        setTimeout(() => setResetMessage(null), 3000);
      }
    } catch {
      setResetMessage('RESET FAILED');
      setTimeout(() => setResetMessage(null), 3000);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        id="sih-demo-guide-modal"
        className="w-full max-w-4xl max-h-[92vh] bg-[#030816] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden flex flex-col font-mono text-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0a1226] border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Compass size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-widest uppercase">
                  SEEMADRISHTI AI // SIH JUDGE DEMONSTRATION WORKFLOW
                </h3>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                  IQ100 // SIH26187
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic 21-Step Verification Protocol from Video Ingestion to Cryptographic Evidence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Step Sequence Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {SIH_MISSION_DEMO_STEPS.map((step, idx) => {
              const isSelected = idx === currentStepIdx;
              return (
                <button
                  key={step.stepNumber}
                  onClick={() => handleJumpToStep(idx)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-black border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {step.stepNumber.toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* Current Step Detailed Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-400 font-bold tracking-wider">
                [{currentStep.category.toUpperCase()}]
              </span>
              <span className="text-xs text-slate-400">
                STEP {currentStep.stepNumber} OF {SIH_MISSION_DEMO_STEPS.length}
              </span>
            </div>

            <h4 className="text-base font-black text-white">
              {currentStep.title}
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {currentStep.description}
            </p>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-cyan-400 block uppercase">
                VERIFICATION OBJECTIVES:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {currentStep.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
              <span className="text-cyan-300 font-bold">TARGET DASHBOARD VIEW:</span>
              <span className="text-white uppercase font-bold px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-400/30">
                {currentStep.targetView}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Navigation with Reset Demo Session Button */}
        <div className="px-6 py-4 bg-[#0a1226] border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 flex items-center gap-1 text-xs cursor-pointer"
            >
              <ChevronLeft size={14} /> PREV
            </button>
            <button
              onClick={handleNext}
              disabled={isLast}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 flex items-center gap-1 text-xs cursor-pointer"
            >
              NEXT <ChevronRight size={14} />
            </button>

            {/* Reset Demo Session Button */}
            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Reset transient session state while preserving configuration and evidence"
            >
              <span>{resetMessage || (isResetting ? 'RESETTING...' : 'RESET DEMO SESSION')}</span>
            </button>
          </div>

          <button
            onClick={handleExecuteStep}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <span>OPEN TARGET VIEW ({currentStep.targetView.toUpperCase()})</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
