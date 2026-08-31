import React, { useState, useMemo } from 'react';
import { AlertItem } from '../types';
import {
  BellRing,
  BellOff,
  Filter,
  Search,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  Sliders,
} from 'lucide-react';
import { audioAlertEngine, AVAILABLE_ALERT_TONES, AlertToneType } from '../utils/audioAlert';
import { useTheme } from '../context/ThemeContext';

interface NotificationHistoryProps {
  alerts: AlertItem[];
}

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ alerts }) => {
  const { isDaylight, theme } = useTheme();
  const [filterMode, setFilterMode] = useState<'all' | 'audio_only' | 'high_sev'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingTone, setPlayingTone] = useState<string | null>(null);

  // If none explicitly marked audioTriggered yet, treat High severity as audio qualified
  const displayAlerts = useMemo(() => {
    return alerts.map((a) => ({
      ...a,
      isAudioQualified: a.audioTriggered || a.severity === 'High' || (a.confidence && a.confidence >= 90),
    }));
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return displayAlerts.filter((a) => {
      if (filterMode === 'audio_only' && !a.isAudioQualified) return false;
      if (filterMode === 'high_sev' && a.severity !== 'High') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          a.camera.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [displayAlerts, filterMode, searchTerm]);

  const audioCount = displayAlerts.filter((a) => a.isAudioQualified).length;

  const handleTestTone = (toneId: AlertToneType) => {
    setPlayingTone(toneId);
    audioAlertEngine.playTone(toneId, { force: true, volumeOverride: 0.9 });
    setTimeout(() => setPlayingTone(null), 600);
  };

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border transition-all overflow-hidden font-mono select-none ${
        isDaylight
          ? 'bg-slate-50 border-slate-300 shadow-sm'
          : 'bg-[#030712]/95 border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.08)]'
      }`}
    >
      {/* 1. Header Bar */}
      <div
        className={`px-5 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDaylight ? 'bg-white border-slate-200' : 'bg-black/60 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 rounded-xl border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <BellRing size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              NOTIFICATION &amp; AUDIO ALERT LOGS
            </h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Historical log of synthesized sound alarms, Defcon perimeter thresholds, and acoustic sirens
            </p>
          </div>
        </div>

        {/* Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-right">
            <div className="text-base font-black text-cyan-400 font-mono leading-none">
              {audioCount}
            </div>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">
              Audio Qualified
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-right">
            <div className="text-base font-black text-emerald-400 font-mono leading-none">
              {alerts.length}
            </div>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">
              Total Notifications
            </div>
          </div>
        </div>
      </div>

      {/* 2. Audio Tone Tester Strip */}
      <div
        className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDaylight ? 'bg-slate-100 border-slate-200' : 'bg-[#02050e] border-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-wider">
          <Volume2 size={13} className="text-cyan-400" />
          <span>INSTANT TONE PREVIEW:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {AVAILABLE_ALERT_TONES.map((tone) => {
            const isPlaying = playingTone === tone.id;
            return (
              <button
                key={tone.id}
                onClick={() => handleTestTone(tone.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  isPlaying
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.6)]'
                    : 'bg-black/60 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <Play size={10} className={isPlaying ? 'fill-current' : ''} />
                <span>{tone.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Filter Ribbon */}
      <div
        className={`px-5 py-3 border-b flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
          isDaylight ? 'bg-white border-slate-200' : 'bg-black/40 border-slate-800'
        }`}
      >
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by camera, title..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { key: 'all', label: `ALL (${alerts.length})` },
            { key: 'audio_only', label: `AUDIO QUALIFIED (${audioCount})` },
            {
              key: 'high_sev',
              label: `HIGH DEFCON (${alerts.filter((a) => a.severity === 'High').length})`,
            },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilterMode(btn.key as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                filterMode === btn.key
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'bg-black/40 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Alert List Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-16">
            <BellOff size={44} className="opacity-25" />
            <p className="font-mono text-xs">No notifications match your current filter.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isHigh = alert.severity === 'High';
            const isMed = alert.severity === 'Medium';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDaylight
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    : 'bg-black/50 border-slate-800/90 hover:border-cyan-500/40 hover:bg-black/70'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isHigh
                        ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                        : isMed
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    <BellRing size={15} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-cyan-400 text-xs font-mono">
                        {alert.camera}
                      </span>
                      <span className="text-slate-500 text-xs">&bull;</span>
                      <span className="text-white text-xs font-bold font-sans truncate">
                        {alert.title}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                          isHigh
                            ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                            : isMed
                            ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {alert.severity}
                      </span>

                      {alert.isAudioQualified && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <Volume2 size={9} />
                          AUDIO ARMED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono flex-wrap">
                      <span>{alert.time}</span>
                      <span>|</span>
                      <span>
                        CONFIDENCE: <strong className="text-white">{alert.confidence || 95}%</strong>
                      </span>
                      {alert.location && (
                        <>
                          <span>|</span>
                          <span className="text-slate-400">{alert.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleTestTone('klaxon_pulse')}
                    title="Play Alert Audio"
                    className="p-2 rounded-lg bg-black/60 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
