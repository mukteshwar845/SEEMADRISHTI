import React, { useState } from 'react';
import { AlertItem } from '../types';
import {
  X,
  ShieldAlert,
  MapPin,
  Clock,
  Camera,
  CheckCircle,
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
} from 'lucide-react';
import { audioAlertEngine } from '../utils/audioAlert';
import { generateAlertPdfReport } from '../utils/pdfReportGenerator';

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
  const [sirenActive, setSirenActive] = useState(false);
  const [isPlayingAudioPing, setIsPlayingAudioPing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [notes, setNotes] = useState('');

  const handleDispatch = () => {
    setResponseStatus('RESPONSE INITIATED');
    onInitiateResponse(alert.id);
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

  const isIntrusionAlert = 
    /intrusion|breach|trespass|restricted/i.test(alert.title) || 
    /intrusion|breach|trespass/i.test(alert.type || '');
  const hasHighConfidence = (alert.confidence ?? 0) > 90;

  const isThreatAssessment = /threat assessment|risk/i.test(alert.title) || /threat assessment|risk/i.test(alert.type || '');
  const threatReasons = isThreatAssessment && alert.description && alert.description.includes(': ')
    ? alert.description.split(': ')[1]?.split(', ').map((r) => {
        const match = r.match(/^(.*?)(?:\s*\(\+(\d+)\))?$/);
        return { text: match ? match[1] : r, points: match ? match[2] : null };
      }) || []
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        id="alert-detail-modal"
        className="w-full max-w-lg bg-[#0a0f1d] border border-white/[0.12] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
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
                CRITICAL THREAT INCIDENT REPORT
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">INCIDENT UUID: #{alert.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
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
                {alert.severity} SEVERITY
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-3 font-sans">
              {alert.description || 'Anomalous movement pattern detected across perimeter zone.'}
            </p>

            {/* Target & Zone Details */}
            {(alert.trackId || alert.zoneName || alert.dwellSeconds) && (
              <div className="mb-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center gap-3 text-[11px] font-mono">
                {alert.trackId && (
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    TARGET: #{alert.trackId} {alert.className ? `(${alert.className})` : ''}
                  </span>
                )}
                {alert.zoneName && (
                  <span className="text-amber-400 flex items-center gap-1">
                    ZONE: {alert.zoneName}
                  </span>
                )}
                {alert.dwellSeconds && (
                  <span className="text-rose-400 flex items-center gap-1">
                    DWELL: {Math.round(alert.dwellSeconds)}s
                  </span>
                )}
              </div>
            )}

            {/* Explainable Threat Reasons Breakdown */}
            {(alert.riskScore !== undefined || (isThreatAssessment && threatReasons.length > 0) || (alert.reasons && alert.reasons.length > 0)) && (
              <div className="mb-3 p-3 rounded-xl bg-black/60 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5 font-mono">
                    <ShieldAlert size={14} className="text-amber-400" />
                    EXPLAINABLE THREAT ASSESSMENT:
                  </span>
                  {alert.riskScore !== undefined && (
                    <span className={`px-2 py-0.5 rounded font-mono font-black text-xs border ${
                      (alert.riskScore || 0) >= 70
                        ? 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                        : (alert.riskScore || 0) >= 40
                        ? 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                        : 'bg-yellow-950/90 text-yellow-300 border-yellow-500/50'
                    }`}>
                      SCORE: {alert.riskScore} / 100 [{alert.riskLevel || (alert.riskScore >= 80 ? 'CRITICAL' : alert.riskScore >= 60 ? 'HIGH' : 'MEDIUM')}]
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  {alert.reasons && alert.reasons.length > 0 ? (
                    alert.reasons.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">✓</span> {r.description || r.code}
                        </span>
                        {r.points !== undefined ? (
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                            +{r.points} PTS
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : threatReasons.length > 0 ? (
                    threatReasons.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">✓</span> {r.text}
                        </span>
                        {r.points ? (
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                            +{r.points} PTS
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-slate-400">
                      Standard perimeter security rules evaluation applied.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cross-Camera Corridor Chain (If Correlated) */}
            {alert.cameraSequence && alert.cameraSequence.length > 0 && (
              <div className="mb-3 p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 space-y-1">
                <span className="text-[10px] font-bold text-purple-300 tracking-wider flex items-center gap-1 font-mono uppercase">
                  CORRELATED MULTI-CAMERA CORRIDOR:
                </span>
                <div className="flex items-center gap-2 pt-1 font-mono text-xs text-white">
                  {alert.cameraSequence.map((c, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold">
                        {c.toUpperCase()}
                      </span>
                      {idx < alert.cameraSequence!.length - 1 && (
                        <span className="text-purple-400 font-bold">➔</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Forensic MP4 Evidence Player or Availability Notice */}
            <div className="mb-3 p-3 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5 font-mono">
                  <Film size={13} className="text-cyan-400" />
                  FORENSIC INCIDENT EVIDENCE (PHASE 7):
                </span>
                {alert.hasEvidence || alert.incidentId ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-500/40">
                    EVIDENCE AVAILABLE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800">
                    EVIDENCE NOT AVAILABLE
                  </span>
                )}
              </div>

              {alert.hasEvidence || alert.incidentId ? (
                <div className="space-y-2 pt-1">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    <video
                      controls
                      src={`/api/incidents/${alert.incidentId || alert.id}/evidence`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>BUFFER: 10s PRE-EVENT // 10s POST-EVENT</span>
                    <a
                      href={`/api/incidents/${alert.incidentId || alert.id}/download`}
                      download
                      className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={11} />
                      DOWNLOAD CLIP
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-mono">
                  Standard real-time telemetry alert. Dedicated MP4 buffer clips are recorded automatically during genuine high/critical perimeter breaches.
                </p>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Camera size={13} className="text-blue-400" />
                <span>Node: {alert.camera}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-amber-400" />
                <span>Time: {alert.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-400" />
                <span>Loc: {alert.location || 'North Gate'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-purple-400" />
                <span>Conf: {alert.confidence || 95.8}%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Audio Alert Ping Test / Replay */}
            <button
              onClick={handlePlayPingSound}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                isPlayingAudioPing
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.7)] animate-pulse'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/90'
              }`}
              title="Play synthesized low-frequency alert ping via Web Audio API"
            >
              <Volume2 size={15} className={isPlayingAudioPing ? 'animate-spin' : ''} />
              <span>{isPlayingAudioPing ? 'PLAYING PING...' : 'REPLAY AUDIO PING'}</span>
            </button>

            <button
              onClick={() => setSirenActive(!sirenActive)}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                sirenActive
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                  : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:bg-white/[0.06]'
              }`}
            >
              <Siren size={15} />
              <span>{sirenActive ? 'SIREN ACTIVE' : 'BROADCAST SIREN'}</span>
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-emerald-400" />
              <span>Assigned: {alert.assignedUnit || 'Patrol Squad Delta'}</span>
            </div>
            {hasHighConfidence && isIntrusionAlert && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/30">
                &gt;90% AUDIO TRIGGER VERIFIED
              </span>
            )}
          </div>

          {/* Security Personnel Dispatch Note */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
              TACTICAL DISPATCH NOTES / OPERATOR LOG
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent Delta team to intercept vehicle at Gate 1..."
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.08] focus:border-blue-500 text-slate-200 text-xs focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#0d1424] border-t border-white/[0.08] flex items-center justify-between gap-3 font-mono">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Generate and download a high-definition PDF intelligence report with snapshots and metadata"
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-bold border border-white/[0.08] transition-colors cursor-pointer"
            >
              DISMISS
            </button>

            <button
              onClick={handleDispatch}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Send size={13} />
              <span>{responseStatus}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
