import React, { useState } from 'react';
import { AlertItem } from '../types';
import { ChevronRight, ShieldAlert, AlertTriangle, Radio, Shield, Filter, Search, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlertsLogProps {
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onViewAllAlerts?: () => void;
  onJumpToCamera?: (camCode: string) => void;
}

export const AlertsLog: React.FC<AlertsLogProps> = ({
  alerts,
  onSelectAlert,
  onViewAllAlerts,
  onJumpToCamera,
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
      case 'critical':
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
      className="flex flex-col bg-slate-900/80 rounded-2xl border border-white/[0.10] overflow-hidden h-full shadow-2xl backdrop-blur-xl"
    >
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-white/[0.08] bg-slate-950/80 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-rose-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white uppercase tracking-widest font-mono">
            LIVE ALERT FEED
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-[9px] text-cyan-300 font-mono font-bold bg-white/[0.05] hover:bg-cyan-500/20 px-2 py-1 rounded-lg border border-white/10 transition-colors"
            title="Export to CSV"
          >
            <Download size={10} />
            <span>EXPORT</span>
          </button>
          <span className="text-[9px] text-rose-300 font-mono font-bold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
            {alerts.length} ALERTS
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-2 border-b border-white/[0.06] bg-slate-950/40">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          {(['ALL', 'High', 'Medium', 'Low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`flex-1 py-1 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer ${
                severityFilter === sev
                  ? sev === 'High'
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-400/50 shadow-sm'
                    : sev === 'Medium'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-sm'
                    : sev === 'Low'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 shadow-sm'
                    : 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Alert Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[520px]" id="alerts-list-container">
        <AnimatePresence initial={false} mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <motion.div
              key="empty-alerts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 text-center text-xs font-mono text-slate-500"
            >
              No active alerts matching criteria.
            </motion.div>
          ) : (
            filteredAlerts.map((alert) => {
              const style = getSeverityStyle(alert.severity);

              return (
                <motion.div
                  key={alert.id}
                  id={`alert-card-${alert.id}`}
                  onClick={() => onSelectAlert(alert)}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.92 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`${style.box} p-2.5 rounded-xl transition-all duration-200 cursor-pointer group hover:translate-x-0.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-bold text-white leading-snug group-hover:text-cyan-300 transition-colors font-mono">
                      {alert.title}
                    </p>
                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0 mt-1 animate-ping`} />
                  </div>

                  {alert.description && (
                    <p className="text-[10px] text-slate-300 mt-1 font-mono line-clamp-2 leading-relaxed">
                      {alert.description}
                    </p>
                  )}

                  {/* Metadata line & Quick Jump */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                        {alert.camera}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {alert.time}
                      </span>
                    </div>

                    {onJumpToCamera && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpToCamera(alert.camera);
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/40 text-[9px] font-mono font-bold transition-all cursor-pointer"
                        title="Jump directly to this camera feed"
                      >
                        VIEW FEED &rarr;
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer link to full alerts log */}
      {onViewAllAlerts && (
        <div className="p-2.5 border-t border-white/[0.08] bg-slate-950/80">
          <button
            onClick={onViewAllAlerts}
            className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300 hover:text-white transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
          >
            <span>VIEW ALL INCIDENTS ({alerts.length})</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
