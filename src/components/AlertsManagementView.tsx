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
  Download,
  FileSpreadsheet,
  Volume2,
  Check,
} from 'lucide-react';
import { audioAlertEngine, triggerIntrusionAudioAlert } from '../utils/audioAlert';
import { useTheme } from '../context/ThemeContext';

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
  const { isDaylight } = useTheme();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAlertId, setPlayingAlertId] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);

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

  // CSV Serialization & Download Handler
  const handleDownloadCSV = () => {
    const headers = [
      'Alert ID',
      'Timestamp (ms)',
      'ISO Date Time',
      'Time String',
      'Camera Node',
      'Location',
      'Alert Title',
      'Threat Category',
      'Severity',
      'AI Confidence (%)',
      'Status',
      'Assigned Tactical Unit',
      'Audio Triggered',
      'Confidence Threshold At Trigger (%)',
      'Incident Description',
    ];

    const dataToExport = filtered.length > 0 ? filtered : alerts;

    const rows = dataToExport.map((a) => {
      const isoTime = new Date(a.timestamp || Date.now()).toISOString();
      const cleanDesc = (a.description || '').replace(/"/g, '""');
      const cleanTitle = (a.title || '').replace(/"/g, '""');
      const cleanLoc = (a.location || 'Border Zone').replace(/"/g, '""');
      const cleanUnit = (a.assignedUnit || 'Unassigned').replace(/"/g, '""');

      return [
        a.id,
        a.timestamp || Date.now(),
        isoTime,
        `"${a.time}"`,
        `"${a.camera}"`,
        `"${cleanLoc}"`,
        `"${cleanTitle}"`,
        `"${a.type}"`,
        a.severity,
        a.confidence !== undefined ? a.confidence : 'N/A',
        a.status,
        `"${cleanUnit}"`,
        a.audioTriggered ? 'YES' : 'NO',
        a.thresholdAtTime || 85,
        `"${cleanDesc}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_');
    link.setAttribute('download', `seemadrishti_alerts_incident_report_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2500);
  };

  return (
    <div className="space-y-4 font-mono select-none" id="alerts-view-root">
      {/* Header Info */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isDaylight
            ? 'bg-white border-slate-300 shadow-sm'
            : 'bg-[#131b2e] border-[#1e293b]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <TriangleAlert size={18} />
            </span>
            <h2
              className={`text-base font-bold uppercase tracking-wider ${
                isDaylight ? 'text-slate-900' : 'text-white'
              }`}
            >
              REAL-TIME INCIDENT & ANOMALY LOG
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
            Border perimeter security triage, automatic siren triggers, and patrol unit dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-download-alerts-csv"
            onClick={handleDownloadCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
              isDownloaded
                ? 'bg-emerald-600 text-white'
                : isDaylight
                ? 'bg-cyan-700 hover:bg-cyan-800 text-white'
                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(0,255,102,0.2)]'
            }`}
          >
            {isDownloaded ? (
              <>
                <Check size={14} className="text-white" />
                <span>Report Downloaded!</span>
              </>
            ) : (
              <>
                <Download size={14} className="text-emerald-400" />
                <span>Download Report (CSV)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
          isDaylight
            ? 'bg-white border-slate-300 shadow-sm'
            : 'bg-[#131b2e] border-[#1e293b]'
        }`}
      >
        <div className="relative flex-1 sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident, camera, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none ${
              isDaylight
                ? 'bg-slate-100 text-slate-900 border border-slate-300 focus:border-cyan-600'
                : 'bg-[#0e1626] border border-[#21304d] text-slate-200 focus:border-blue-500'
            }`}
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
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  filterSeverity === sev
                    ? 'bg-blue-600 text-white'
                    : isDaylight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#182338] text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[11px] text-slate-400 font-mono">Status:</span>
            {['ALL', 'active', 'response_initiated', 'resolved'].map((stat) => (
              <button
                key={stat}
                onClick={() => setFilterStatus(stat)}
                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer uppercase transition-all ${
                  filterStatus === stat
                    ? 'bg-cyan-600 text-white'
                    : isDaylight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#182338] text-slate-400 hover:text-white'
                }`}
              >
                {stat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Cards List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.length === 0 ? (
          <div
            className={`p-8 text-center rounded-xl border ${
              isDaylight ? 'bg-white border-slate-300 text-slate-500' : 'bg-[#131b2e] border-[#1e293b] text-slate-400'
            }`}
          >
            <p className="text-sm">No incidents match the active filters.</p>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              id={`manage-alert-${alert.id}`}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isDaylight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
                  : 'bg-[#131b2e] hover:bg-[#162238] border-[#1e293b]'
              }`}
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className={`text-sm font-bold uppercase ${
                        isDaylight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {alert.title}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        alert.severity === 'High'
                          ? 'bg-rose-600 text-white'
                          : alert.severity === 'Medium'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      {alert.camera}
                    </span>
                    {alert.confidence !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-cyan-500/30">
                        {alert.confidence}% CONF
                      </span>
                    )}
                    {alert.trackId && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                        TRK #{alert.trackId}
                      </span>
                    )}
                    {alert.riskScore !== undefined && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                        alert.riskScore >= 70
                          ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                          : alert.riskScore >= 40
                          ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                          : 'bg-yellow-950 text-yellow-300 border-yellow-500/40'
                      }`}>
                        RISK {alert.riskScore}
                      </span>
                    )}
                    {alert.hasEvidence && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                        EVIDENCE
                      </span>
                    )}
                    {alert.cameraSequence && alert.cameraSequence.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                        CORRIDOR
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs mb-1.5 ${
                      isDaylight ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    {alert.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-amber-400" />
                      {alert.time}
                    </span>
                    <span>Location: {alert.location || 'Border Zone A'}</span>
                    <span>Unit: {alert.assignedUnit || 'Patrol Squad 1'}</span>
                    {alert.dwellSeconds && (
                      <span className="text-amber-400 font-bold">
                        Dwell: {Math.round(alert.dwellSeconds)}s
                      </span>
                    )}
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
                      : isDaylight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-[#182338] text-slate-300 hover:text-cyan-300 border-[#233555]'
                  }`}
                  title="Play Web Audio low-frequency alert ping"
                >
                  <Volume2 size={15} />
                </button>

                <button
                  onClick={() => onSelectAlert(alert)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    isDaylight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-[#182338] hover:bg-[#223352] text-slate-200 border-[#233555]'
                  }`}
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
          ))
        )}
      </div>
    </div>
  );
};

