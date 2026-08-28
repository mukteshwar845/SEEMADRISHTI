import React, { useState } from 'react';
import { AlertItem } from '../types';
import { ChevronRight, ShieldAlert, AlertTriangle, Radio, Shield, Filter, Search, Download } from 'lucide-react';

interface AlertsLogProps {
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onViewAllAlerts?: () => void;
}

export const AlertsLog: React.FC<AlertsLogProps> = ({
  alerts,
  onSelectAlert,
  onViewAllAlerts,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleExportCSV = () => {
    if (alerts.length === 0) return;
    const headers = ['ID', 'Title', 'Camera', 'Severity', 'Time', 'Type', 'Status', 'Confidence'];
    const csvContent = [
      headers.join(','),
      ...alerts.map(a => 
        `"${a.id}","${a.title}","${a.camera}","${a.severity}","${a.time}","${a.type}","${a.status}","${a.confidence || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tactical_alerts_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.camera.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.description && alert.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return {
          box: 'border-l-2 border-rose-500 bg-rose-950/20 hover:bg-rose-950/40 border-y border-r border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.1)]',
          badge: 'text-rose-400 bg-rose-950/80 border-rose-500/40',
          dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
        };
      case 'medium':
        return {
          box: 'border-l-2 border-amber-500 bg-amber-950/20 hover:bg-amber-950/40 border-y border-r border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]',
          badge: 'text-amber-400 bg-amber-950/80 border-amber-500/40',
          dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
        };
      case 'low':
      default:
        return {
          box: 'border-l-2 border-emerald-500 bg-emerald-950/20 hover:bg-emerald-950/40 border-y border-r border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
          badge: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40',
          dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
        };
    }
  };

  return (
    <div
      id="alerts-log-panel"
      className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden h-full shadow-xl"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/90 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-widest font-mono">
            REAL-TIME ALERT FEED
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-[9px] text-cyan-400 font-mono font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 hover:bg-cyan-900/60 transition-colors"
            title="Export to CSV"
          >
            <Download size={10} />
            EXPORT
          </button>
          <span className="text-[9px] text-rose-400 font-mono font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
            LIVE STREAM
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/50 space-y-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
              severityFilter === 'ALL'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setSeverityFilter('High')}
            className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
              severityFilter === 'High'
                ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            HIGH
          </button>
          <button
            onClick={() => setSeverityFilter('Medium')}
            className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
              severityFilter === 'Medium'
                ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            MED
          </button>
          <button
            onClick={() => setSeverityFilter('Low')}
            className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
              severityFilter === 'Low'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            LOW
          </button>
        </div>
      </div>

      {/* Vertical Alert Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[480px]" id="alerts-list-container">
        {filteredAlerts.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-slate-500">
            No alerts match current filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            const shortSeverity =
              alert.severity.toLowerCase() === 'medium'
                ? 'MED PRIORITY'
                : `${alert.severity.toUpperCase()} THREAT`;

            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                onClick={() => onSelectAlert(alert)}
                className={`${style.box} p-2.5 rounded-lg transition-all duration-200 cursor-pointer group hover:translate-x-1`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-100 leading-snug group-hover:text-cyan-300 transition-colors font-mono">
                    {alert.title}
                  </p>
                  <div className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0 mt-1 animate-ping`} />
                </div>

                {alert.description && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono line-clamp-2">
                    {alert.description}
                  </p>
                )}

                {/* Rich Badges Line */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5 font-mono text-[8px]">
                  {alert.trackId && (
                    <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                      #{alert.trackId} {alert.className || ''}
                    </span>
                  )}
                  {alert.riskScore !== undefined && (
                    <span className={`px-1 py-0.2 rounded font-bold border ${
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
                    <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                      EVIDENCE
                    </span>
                  )}
                  {alert.cameraSequence && alert.cameraSequence.length > 0 && (
                    <span className="px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-bold">
                      CORRIDOR
                    </span>
                  )}
                  {alert.dwellSeconds && (
                    <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30 font-bold">
                      {Math.round(alert.dwellSeconds)}s DWELL
                    </span>
                  )}
                </div>

                {/* Subtitle / Meta Line */}
                <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-800/80">
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${style.badge} tracking-wider`}>
                    {alert.camera} // {shortSeverity}
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono font-bold">
                    {alert.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer link to full alerts log */}
      {onViewAllAlerts && (
        <div className="p-2.5 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onViewAllAlerts}
            className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 hover:text-white transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
          >
            <span>VIEW ALL INCIDENTS ({alerts.length})</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
