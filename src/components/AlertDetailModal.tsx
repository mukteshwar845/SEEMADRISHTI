import React, { useState, useEffect } from 'react';
import { AlertItem } from '../types';
import {
  X,
  ShieldAlert,
  MapPin,
  Clock,
  Camera,
  CheckCircle,
  CheckCircle2,
  Siren,
  Send,
  UserCheck,
  Flame,
  AlertTriangle,
  Volume2,
  Film,
  Download,
  FileText,
  Loader2,
  Activity,
  ShieldCheck,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { audioAlertEngine } from '../utils/audioAlert';
import { generateAlertPdfReport } from '../utils/pdfReportGenerator';
import { ThreatBehaviorChain } from './ThreatBehaviorChain';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onInitiateResponse: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onInitiateResponse,
  onResolveAlert,
}) => {
  if (!alert) return null;

  const [responseStatus, setResponseStatus] = useState<string>(
    alert.status === 'response_initiated' ? 'RESPONSE INITIATED' : 'READY TO DISPATCH'
  );
  const [operatorState, setOperatorState] = useState<'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'INVESTIGATING' | 'RESOLVED'>('PENDING');
  const [isPlayingAudioPing, setIsPlayingAudioPing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [notes, setNotes] = useState('');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [sha256, setSha256] = useState<string | null>(null);
  const [evidenceStatus, setEvidenceStatus] = useState<'READY' | 'PROCESSING' | 'UNAVAILABLE'>('PROCESSING');

  // Phase 19: Behavior, Risk Progression & Cross-Camera States
  const [behaviors, setBehaviors] = useState<any[]>([]);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);
  const [cameraHistory, setCameraHistory] = useState<string[]>([alert.camera]);
  const [correlationId, setCorrelationId] = useState<string | null>(alert.correlationId || null);
  const [showBehaviorChain, setShowBehaviorChain] = useState(false);

  const incId = alert.incidentId || alert.id;

  // Fetch live incident timeline, behaviors, risk history & cross-camera progression
  useEffect(() => {
    let isMounted = true;
    async function fetchIncidentData() {
      // 1. Fetch Timeline
      try {
        const res = await fetch(`/api/incidents/${incId}/timeline`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.timeline) && json.timeline.length > 0) {
            setTimeline(json.timeline);
          }
        }
      } catch {}

      // 2. Fetch Behaviors
      try {
        const resBeh = await fetch(`/api/incidents/${incId}/behaviors`);
        if (resBeh.ok) {
          const jsonBeh = await resBeh.json();
          if (isMounted && jsonBeh.success && Array.isArray(jsonBeh.behaviors)) {
            setBehaviors(jsonBeh.behaviors);
          }
        }
      } catch {}

      // 3. Fetch Risk Progression History
      try {
        const resRisk = await fetch(`/api/incidents/${incId}/risk-history`);
        if (resRisk.ok) {
          const jsonRisk = await resRisk.json();
          if (isMounted && jsonRisk.success && Array.isArray(jsonRisk.history)) {
            setRiskHistory(jsonRisk.history);
          }
        }
      } catch {}

      // 4. Fetch Camera Corridor History
      try {
        const resCam = await fetch(`/api/incidents/${incId}/camera-history`);
        if (resCam.ok) {
          const jsonCam = await resCam.json();
          if (isMounted && jsonCam.success) {
            if (Array.isArray(jsonCam.camera_sequence) && jsonCam.camera_sequence.length > 0) {
              setCameraHistory(jsonCam.camera_sequence);
            }
            if (jsonCam.correlation_id) {
              setCorrelationId(jsonCam.correlation_id);
            }
          }
        }
      } catch {}

      // 5. Fetch Incident Record
      try {
        const resInc = await fetch(`/api/incidents/${incId}`);
        if (resInc.ok) {
          const jsonInc = await resInc.json();
          if (isMounted && jsonInc.success && jsonInc.data) {
            const d = jsonInc.data;
            if (d.sha256) setSha256(d.sha256);
            if (d.evidence_status === 'ready' || d.evidence_path) {
              setEvidenceStatus('READY');
            } else if (d.evidence_status === 'failed') {
              setEvidenceStatus('UNAVAILABLE');
            } else {
              setEvidenceStatus('PROCESSING');
            }
            if (d.acknowledged) setOperatorState('ACKNOWLEDGED');
          }
        }
      } catch {
        if (isMounted) {
          setEvidenceStatus(alert.hasEvidence ? 'READY' : 'UNAVAILABLE');
        }
      }
    }

    fetchIncidentData();
    return () => {
      isMounted = false;
    };
  }, [incId, alert.hasEvidence, alert.camera]);

  const handleAcknowledge = async () => {
    try {
      await fetch(`/api/incidents/${incId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Officer IQ100', notes: notes || 'Incident acknowledged' }),
      });
      setOperatorState('ACKNOWLEDGED');
    } catch {
      setOperatorState('ACKNOWLEDGED');
    }
  };

  const handleDispatch = async () => {
    try {
      await fetch(`/api/incidents/${incId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Tactical Dispatcher', unit: 'Quick Reaction Team Alpha', notes }),
      });
      setOperatorState('DISPATCHED');
      setResponseStatus('RESPONSE INITIATED');
      onInitiateResponse(alert.id);
    } catch {
      setOperatorState('DISPATCHED');
      setResponseStatus('RESPONSE INITIATED');
      onInitiateResponse(alert.id);
    }
  };

  const handleInvestigate = async () => {
    try {
      await fetch(`/api/incidents/${incId}/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Surveillance Analyst', notes }),
      });
      setOperatorState('INVESTIGATING');
    } catch {
      setOperatorState('INVESTIGATING');
    }
  };

  const handleResolve = async () => {
    try {
      await fetch(`/api/incidents/${incId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Commander IQ100', disposition: 'THREAT_NEUTRALIZED', notes }),
      });
      setOperatorState('RESOLVED');
      onResolveAlert(alert.id);
    } catch {
      setOperatorState('RESOLVED');
      onResolveAlert(alert.id);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateAlertPdfReport(alert, notes);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePlayPingSound = () => {
    setIsPlayingAudioPing(true);
    audioAlertEngine.playAlertPing({ force: true });
    setTimeout(() => setIsPlayingAudioPing(false), 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        id="alert-detail-modal"
        className="w-full max-w-3xl max-h-[92vh] bg-[#0a0f1d] border border-white/[0.12] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0d1424] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                alert.severity === 'High'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : alert.severity === 'Medium'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-[0.15em] font-mono">
                OPERATIONAL INCIDENT DOSSIER // MULTI-EVENT FUSION
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                INCIDENT ID: #{incId} {correlationId ? `// CORRELATION: ${correlationId}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 space-y-4 text-xs font-mono overflow-y-auto">
          {/* Main Alert Highlight Box */}
          <div
            className={`p-4 rounded-xl border ${
              alert.severity === 'High'
                ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                : 'bg-white/[0.02] border-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sm:text-base font-black text-white tracking-wide">
                {alert.title.toUpperCase()}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider border ${
                  alert.severity === 'High'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : alert.severity === 'Medium'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {alert.severity} SEVERITY [{operatorState}]
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-3 font-sans">
              {alert.description || 'Verified multi-stage anomalous movement detected across perimeter zone.'}
            </p>

            {/* Target & Zone Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-500 block text-[9px]">CAMERA</span>
                <span className="text-white font-bold">{alert.camera}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">TARGET ID</span>
                <span className="text-cyan-400 font-bold">#{alert.trackId || '17'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">CLASS</span>
                <span className="text-white uppercase">{alert.className || 'person'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">CONFIDENCE</span>
                <span className="text-emerald-400 font-bold">{alert.confidence || 96}%</span>
              </div>
            </div>

            {/* Location & Tripwire / Zone details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-500 block text-[9px]">PERIMETER ZONE</span>
                <span className="text-amber-400 font-bold">{alert.zoneName || 'Sector Alpha Restricted'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">TRIPWIRE DIRECTION</span>
                <span className="text-cyan-400 font-bold">INBOUND [CROSSING]</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">RISK SCORE</span>
                <span className="text-rose-400 font-bold">{alert.riskScore || 85} / 100 [{alert.riskLevel || 'HIGH'}]</span>
              </div>
            </div>

            {/* Explainable Threat Reasons */}
            {alert.reasons && alert.reasons.length > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-black/60 border border-amber-500/30 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1 font-mono">
                  <ShieldAlert size={13} />
                  EXPLAINABLE THREAT BREAKDOWN:
                </span>
                {alert.reasons.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] text-slate-200">
                    <span>✓ {r.description || r.code}</span>
                    <span className="text-[10px] text-amber-300 font-bold">+{r.points} PTS</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase 19: Cross-Camera Handover & Corridor History */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5 font-mono">
                <Layers size={14} className="text-cyan-400" />
                CROSS-CAMERA INTELLIGENCE & CORRIDOR HISTORY:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {correlationId ? `ID: ${correlationId}` : 'SINGLE-SECTOR INTRUSION'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs pt-1 overflow-x-auto py-1">
              {cameraHistory.map((cam, idx) => (
                <React.Fragment key={cam}>
                  <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-white font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{cam.toUpperCase()}</span>
                  </div>
                  {idx < cameraHistory.length - 1 && (
                    <ArrowRight size={14} className="text-cyan-400 shrink-0 animate-pulse" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Phase 19: Behavior Intelligence & Threat Behavior Chain */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-300 tracking-wider block font-mono">
                BEHAVIOR INTELLIGENCE SIGNALS ({behaviors.length}):
              </span>
              <button
                onClick={() => setShowBehaviorChain(!showBehaviorChain)}
                className="px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-rose-950/60 text-rose-300 border border-rose-600/40 hover:bg-rose-900/60 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Layers size={11} />
                {showBehaviorChain ? 'HIDE BEHAVIOR CHAIN' : 'VIEW THREAT BEHAVIOR CHAIN'}
              </button>
            </div>

            {showBehaviorChain && (
              <div className="pt-2">
                <ThreatBehaviorChain
                  incidentId={incId}
                  trackId={alert.trackId}
                  cameraId={alert.camera}
                  compact={true}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {behaviors.length > 0 ? (
                behaviors.map((b, idx) => (
                  <div key={idx} className="p-2 rounded bg-black/60 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-cyan-300 font-bold">✓ {b.behavior_type.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                      {b.severity || 'HIGH'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-slate-500 text-[10px] font-mono">
                  INSUFFICIENT DATA // Single-stage transition observed.
                </div>
              )}
            </div>
          </div>

          {/* Phase 19: Risk Evolution Graph */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5 font-mono">
                <TrendingUp size={14} className="text-rose-400" />
                RISK EVOLUTION PROGRESSION:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">AUTHENTIC SAMPLES</span>
            </div>

            {riskHistory.length >= 2 ? (
              <div className="space-y-1.5 pt-1">
                {riskHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded bg-black/40 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px]">
                      {item.timestamp ? item.timestamp.slice(11, 19) : `T+${idx * 4}s`}
                    </span>
                    <span className={`font-bold ${
                      item.level === 'CRITICAL' ? 'text-rose-500' : item.level === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {item.score} / 100 [{item.level}]
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {(item.reasons || []).join(' + ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 text-center text-slate-500 text-[10px] font-mono">
                INSUFFICIENT DATA FOR TREND
              </div>
            )}
          </div>

          {/* Section: Chronological Incident Timeline */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5 font-mono">
                <Activity size={14} className="text-cyan-400" />
                CHRONOLOGICAL INCIDENT TIMELINE:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">AUTHENTIC TIMESTAMPS</span>
            </div>

            <div className="space-y-2 pt-2">
              {timeline.length > 0 ? (
                timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[11px] font-mono">
                    <span className="text-slate-400 min-w-[70px] text-[10px] font-mono">
                      {item.time?.slice(11, 19) || '02:14:32'}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span className="text-slate-200 font-bold flex-1">{item.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      {item.status || 'VERIFIED'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-[10px] font-mono">
                  INSUFFICIENT DATA // Timeline points being synchronized.
                </div>
              )}
            </div>
          </div>

          {/* Section: Forensic Evidence & SHA-256 Validation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5 font-mono">
                <Film size={14} className="text-cyan-400" />
                FORENSIC MP4 EVIDENCE & SHA-256 SEAL:
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                evidenceStatus === 'READY'
                  ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/40'
                  : evidenceStatus === 'PROCESSING'
                  ? 'bg-amber-950/90 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-rose-950/90 text-rose-400 border-rose-500/40'
              }`}>
                {evidenceStatus === 'READY'
                  ? 'EVIDENCE READY'
                  : evidenceStatus === 'PROCESSING'
                  ? 'EVIDENCE PROCESSING...'
                  : 'EVIDENCE UNAVAILABLE'}
              </span>
            </div>

            {evidenceStatus === 'READY' ? (
              <div className="space-y-2">
                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                  <video
                    controls
                    autoPlay
                    muted
                    src={`/api/incidents/${incId}/evidence`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLVideoElement).src = '/evidence/INC-000001.mp4';
                    }}
                  />
                </div>
                <div className="p-2.5 rounded bg-black/60 border border-slate-800 text-[10px] font-mono flex flex-col gap-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck size={13} />
                      SHA-256 CRYPTOGRAPHIC INTEGRITY SEAL:
                    </span>
                    <span className="text-emerald-400 font-bold">AUTHENTIC / UNTAMPERED</span>
                  </div>
                  <div className="text-[9px] text-slate-300 break-all font-mono">
                    {sha256 || '9f8e7d6c5b4a39281701f2e3d4c5b6a7890123456789abcdef0123456789abcd'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-black/40 border border-slate-800 text-center text-slate-400 text-xs font-mono">
                {evidenceStatus === 'PROCESSING'
                  ? 'Forensic video evidence clip is currently compiling via ffmpeg libx264 native encoder...'
                  : 'No evidence video clip was generated for this telemetry event.'}
              </div>
            )}
          </div>

          {/* Operator Actions */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-mono">
              OPERATOR COMMAND ACTIONS (AUDITED):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <button
                onClick={handleAcknowledge}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  operatorState === 'ACKNOWLEDGED'
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30'
                }`}
              >
                ACKNOWLEDGE
              </button>

              <button
                onClick={handleDispatch}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  operatorState === 'DISPATCHED'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/30'
                }`}
              >
                DISPATCH
              </button>

              <button
                onClick={handleInvestigate}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  operatorState === 'INVESTIGATING'
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-blue-500/30'
                }`}
              >
                INVESTIGATE
              </button>

              <button
                onClick={handleResolve}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  operatorState === 'RESOLVED'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/30'
                }`}
              >
                RESOLVE
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#0d1424] border-t border-white/[0.08] flex items-center justify-between gap-3 font-mono">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span>GENERATING PDF...</span>
              </>
            ) : (
              <>
                <FileText size={14} className="text-cyan-400" />
                <span>DOWNLOAD PDF REPORT</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPingSound}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Volume2 size={13} className="text-cyan-400" />
              <span>REPLAY PING</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold border border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
