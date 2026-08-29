import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  UserCheck,
  Server,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { fetchSystemTimeline, logOperatorAction, TimelineItem } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const SystemTimelineView: React.FC = () => {
  const { isDaylight } = useTheme();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'SYSTEM' | 'OPERATOR'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>('Commander IQ100');
  const [actionText, setActionText] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('SECTOR-01');

  const loadTimeline = useCallback(async () => {
    try {
      const res = await fetchSystemTimeline(100);
      if (res && res.data) {
        setTimeline(res.data);
      }
    } catch {
      // safe fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline();
    const interval = setInterval(loadTimeline, 5000);
    return () => clearInterval(interval);
  }, [loadTimeline]);

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionText.trim()) return;

    try {
      await logOperatorAction(actionText.trim(), 'SECTOR', targetId, operatorName, { note: 'Manual log from timeline' });
      setActionText('');
      setIsAddingNote(false);
      await loadTimeline();
    } catch (err: any) {
      alert(`Failed to log action: ${err.message}`);
    }
  };

  const filteredTimeline = timeline.filter((item) => {
    if (filter === 'ALL') return true;
    return item.event_category === filter;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div
        className={`p-5 rounded-lg border backdrop-blur-md relative overflow-hidden ${
          isDaylight
            ? 'bg-slate-50 border-slate-300 shadow-sm'
            : 'bg-[#030712]/90 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider font-mono text-white flex items-center gap-3">
                SYSTEM & OPERATOR AUDIT TIMELINE
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {timeline.length} EVENTS LOGGED
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Immutable chronological log of system state transitions, camera disconnects, threat acknowledgments & operator commands
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="px-3 py-1.5 text-xs font-mono rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              LOG OPERATOR ACTION
            </button>
            <button
              onClick={loadTimeline}
              className="px-3 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              SYNC
            </button>
          </div>
        </div>

        {/* Action Insertion Form */}
        {isAddingNote && (
          <form onSubmit={handleCreateAction} className="mt-4 pt-4 border-t border-slate-800 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">OPERATOR NAME</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">TARGET NODE / SECTOR</label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">ACTION / OBSERVATION</label>
                <input
                  type="text"
                  placeholder="e.g. PATROL DISPATCHED TO NORTH PERIMETER"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="px-3 py-1 rounded bg-slate-800 text-slate-400"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-amber-500 text-black font-bold hover:bg-amber-400"
              >
                COMMIT AUDIT RECORD
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          {(['ALL', 'SYSTEM', 'OPERATOR'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-mono rounded transition ${
                filter === f
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f} ({f === 'ALL' ? timeline.length : timeline.filter((i) => i.event_category === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* 2. Chronological Timeline Feed */}
      <div className="space-y-2.5">
        {filteredTimeline.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 font-mono text-xs">
            [ NO AUDIT EVENTS LOGGED YET ]
          </div>
        ) : (
          filteredTimeline.map((evt) => {
            const isOperator = evt.event_category === 'OPERATOR';

            return (
              <div
                key={evt.id}
                className={`p-3.5 rounded-lg border backdrop-blur-md transition flex items-start justify-between gap-4 font-mono text-xs ${
                  isOperator
                    ? 'bg-[#0a0f1d]/80 border-cyan-500/20 hover:border-cyan-500/40'
                    : isDaylight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#040814]/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-1.5 rounded mt-0.5 ${
                      isOperator ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isOperator ? <UserCheck className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                          isOperator
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {evt.event_category} // {evt.type}
                      </span>
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-slate-200 font-semibold">{evt.message}</div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 shrink-0 font-mono">{evt.id}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
