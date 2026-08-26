import React from 'react';
import { AlertItem } from '../types';
import { BellRing, BellOff, Filter, Search, ChevronRight } from 'lucide-react';

interface NotificationHistoryProps {
  alerts: AlertItem[];
}

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ alerts }) => {
  // Only track audio alerts or show the distinction
  const audioAlerts = alerts.filter(a => a.audioTriggered);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-950/30 rounded-lg border border-purple-500/20">
            <BellRing size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">
              Notification History
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Historical log of triggered audio alerts and threshold metrics
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-purple-400 font-mono">{audioAlerts.length}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Total Audio Triggers</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {audioAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <BellOff size={48} className="opacity-20" />
            <p className="font-mono text-sm">No audio alerts triggered yet.</p>
          </div>
        ) : (
          audioAlerts.map(alert => (
            <div key={alert.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 flex items-center justify-between hover:bg-slate-900/80 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-full ${alert.severity === 'High' ? 'bg-rose-950/50 text-rose-400 border border-rose-500/30' : alert.severity === 'Medium' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/30' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'}`}>
                  <BellRing size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm font-mono">{alert.camera}</span>
                    <span className="text-xs text-slate-400 font-mono">- {alert.title}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
                    <span className="text-slate-500">{alert.time}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-purple-400 flex items-center gap-1">
                      <span className="text-slate-500">CONFIDENCE:</span> {alert.confidence}%
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="text-slate-500">THRESHOLD MET:</span> &gt;={alert.thresholdAtTime}%
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
