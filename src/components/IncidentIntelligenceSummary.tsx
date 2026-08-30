import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Camera,
  Activity,
  FileCheck,
  TrendingUp,
  Clock,
  MapPin,
  Check,
  Lock,
  Loader2,
} from 'lucide-react';
import { fetchIncidentSummary, IncidentIntelligenceSummary as SummaryType } from '../services/api';

interface IncidentIntelligenceSummaryProps {
  incidentId: string;
  initialSummary?: SummaryType | null;
  onOpenBehaviorChain?: () => void;
  compact?: boolean;
}

export const IncidentIntelligenceSummary: React.FC<IncidentIntelligenceSummaryProps> = ({
  incidentId,
  initialSummary,
  onOpenBehaviorChain,
  compact = false,
}) => {
  const [summary, setSummary] = useState<SummaryType | null>(initialSummary || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSummary);

  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary);
      return;
    }
    if (incidentId) {
      setIsLoading(true);
      fetchIncidentSummary(incidentId)
        .then((res) => {
          if (res.data) setSummary(res.data);
        })
        .catch((err) => {
          console.warn('[IncidentIntelligenceSummary] Fetch error:', err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [incidentId, initialSummary]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mb-2" />
        <span className="text-xs font-mono uppercase tracking-wider">GENERATING INCIDENT INTELLIGENCE SUMMARY...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg text-center text-xs text-slate-500 font-mono">
        NO INCIDENT INTELLIGENCE RECORD FOUND
      </div>
    );
  }

  const isCritical = summary.risk_level === 'CRITICAL' || summary.risk_score >= 80;
  const isHigh = summary.risk_level === 'HIGH' || (summary.risk_score >= 50 && summary.risk_score < 80);

  return (
    <div className={`bg-slate-950 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md ${compact ? 'p-3' : 'p-4'} space-y-3.5 font-sans`}>
      {/* Dossier Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/90">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${isCritical ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
              INCIDENT INTELLIGENCE SUMMARY
            </div>
            <div className="text-sm font-mono font-bold text-white flex items-center gap-2 mt-0.5">
              <span>{summary.incident_id}</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-slate-300">
                {summary.target.label}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-[9px] text-slate-500 block uppercase">THREAT LEVEL</span>
          <div className="flex items-center gap-1.5 justify-end">
            <span className={`text-sm font-bold ${isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'}`}>
              {summary.risk_score} / 100
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${isCritical ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}`}>
              {summary.risk_level}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Classification & Camera Path */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">CLASSIFICATION</span>
          <span className="text-white font-bold mt-0.5 block truncate">
            {summary.classification}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">CAMERA PATH</span>
          <span className="text-cyan-300 font-bold mt-0.5 block truncate">
            {summary.camera_path.join(' ➔ ')}
          </span>
        </div>
      </div>

      {/* Observed Behavior Checklist */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
            OBSERVED BEHAVIOUR ({summary.observed_behaviors.length})
          </span>
          {summary.behavior_pattern && summary.behavior_pattern !== 'UNKNOWN' && (
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30">
              {summary.behavior_pattern.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        <div className="space-y-1 pt-1 text-xs">
          {summary.observed_behaviors.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-slate-200">
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3] shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Contribution Factors (Authoritative) */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold block">
          WHY? THREAT FACTOR BREAKDOWN
        </span>

        <div className="space-y-1 pt-0.5 text-xs font-mono">
          {summary.risk_reasons.map((r, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-300">
              <span>+ {r.factor}</span>
              <span className="font-bold text-amber-400">+{r.points}</span>
            </div>
          ))}
          <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between font-bold">
            <span className="text-slate-400 uppercase">TOTAL SYSTEM RISK</span>
            <span className={isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'}>
              {summary.risk_score} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Forensic Evidence Status */}
      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">FORENSIC EVIDENCE:</span>
          <span className="text-emerald-400 font-bold uppercase">{summary.forensic_evidence.status}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Lock className="w-3 h-3 text-cyan-400" />
          <span className="truncate max-w-[120px]" title={summary.forensic_evidence.sha256}>
            SHA-256: {summary.forensic_evidence.sha256?.slice(0, 10)}...
          </span>
          <span className="text-emerald-400 font-bold">[VERIFIED]</span>
        </div>
      </div>
    </div>
  );
};
