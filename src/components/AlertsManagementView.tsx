import React, { useState } from 'react';
import { AlertItem } from '../types';
import {
  TriangleAlert,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Siren,
  FileSpreadsheet,
  Volume2,
} from 'lucide-react';
import { audioAlertEngine, triggerIntrusionAudioAlert } from '../utils/audioAlert';

interface AlertsManagementViewProps {
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onInitiateResponse: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
}

export const AlertsManagementView: React.FC<AlertsManagementViewProps> = ({
  alerts,
  onSelectAlert,
  onInitiateResponse,
  onResolveAlert,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAlertId, setPlayingAlertId] = useState<string | null>(null);

  const handlePlayAudio = (alert: AlertItem) => {
    setPlayingAlertId(alert.id);
    audioAlertEngine.playAlertPing({ force: true });
    setTimeout(() => setPlayingAlertId(null), 300);
  };

  const filtered = alerts.filter((a) => {
    const matchSev = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const matchStat = filterStatus === 'ALL' || a.status === filterStatus;
    const matchSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.camera.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSev && matchStat && matchSearch;
  });

  return (
    <div className="space-y-4" id="alerts-view-root">
      {/* Header Info */}
      <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
              <TriangleAlert size={18} />
            </span>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              REAL-TIME INCIDENT & ANOMALY LOG
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Border perimeter security triage, automatic siren triggers, and patrol unit dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Generating Incident Dossier Report PDF...')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182338] hover:bg-[#202f4a] text-slate-200 border border-[#233555] text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Generate Security Dossier</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident, camera, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0e1626] border border-[#21304d] text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-mono">Severity:</span>
            {['ALL', 'High', 'Medium', 'Low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterSeverity === sev
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#182338] text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Cards List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            id={`manage-alert-${alert.id}`}
            className="p-4 bg-[#131b2e] hover:bg-[#162238] border border-[#1e293b] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  alert.severity === 'High'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : alert.severity === 'Medium'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                <ShieldAlert size={20} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white uppercase">{alert.title}</h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      alert.severity === 'High'
                        ? 'bg-red-500 text-white'
                        : alert.severity === 'Medium'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-[11px] font-mono text-blue-400 font-semibold">
                    {alert.camera}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-1.5">{alert.description}</p>

                <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-amber-400" />
                    {alert.time}
                  </span>
                  <span>Location: {alert.location || 'Border Zone A'}</span>
                  <span>Unit: {alert.assignedUnit || 'Patrol Squad 1'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {/* Play Audio Alert Ping */}
              <button
                onClick={() => handlePlayAudio(alert)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  playingAlertId === alert.id
                    ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.8)] animate-pulse'
                    : 'bg-[#182338] text-slate-300 hover:text-cyan-300 border-[#233555]'
                }`}
                title="Play Web Audio low-frequency alert ping"
              >
                <Volume2 size={15} />
              </button>

              <button
                onClick={() => onSelectAlert(alert)}
                className="px-3 py-1.5 rounded-lg bg-[#182338] hover:bg-[#223352] text-slate-200 border border-[#233555] text-xs font-semibold cursor-pointer"
              >
                View Details
              </button>

              <button
                onClick={() => onInitiateResponse(alert.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
                  alert.status === 'response_initiated'
                    ? 'bg-emerald-600 text-white border border-emerald-400'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                }`}
              >
                <Send size={12} />
                <span>
                  {alert.status === 'response_initiated' ? 'RESPONSE INITIATED' : 'DISPATCH UNIT'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
