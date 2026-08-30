import React, { useState, useEffect } from 'react';
import {
  Menu,
  RefreshCw,
  Radio,
  Shield,
  Zap,
  Bell,
  Activity,
  Lock,
  Sun,
  Moon,
  Terminal,
  Compass,
  Mic,
  MicOff,
  Volume2,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { webSocketService, WebSocketServiceState } from '../services/websocketService';
import { voiceCommandService, VoiceServiceState } from '../services/voiceCommandService';

interface HeaderProps {
  onToggleSidebarMobile: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  activeAlertCount?: number;
  onOpenDemoMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebarMobile,
  onRefresh,
  isRefreshing = false,
  activeAlertCount = 12,
  onOpenDemoMode,
}) => {
  const { theme, toggleTheme, isDaylight } = useTheme();
  const [dateString, setDateString] = useState('MON, SEP 16, 2026');
  const [timeString, setTimeString] = useState('10:45:22 AM');
  const [utcString, setUtcString] = useState('17:45:22 UTC');
  const [wsState, setWsState] = useState<WebSocketServiceState>(() =>
    webSocketService.getState()
  );
  const [voiceState, setVoiceState] = useState<VoiceServiceState>(() =>
    voiceCommandService.getState()
  );
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  useEffect(() => {
    const unsubWs = webSocketService.onStateChange((st) => setWsState(st));
    const unsubVoice = voiceCommandService.onStateChange((st) => setVoiceState(st));
    return () => {
      unsubWs();
      unsubVoice();
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const dateNum = now.getDate();
      const year = now.getFullYear();
      
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours < 10 ? `0${hours}` : hours;
      const minutesStr = now.getMinutes() < 10 ? `0${now.getMinutes()}` : now.getMinutes();
      const secondsStr = now.getSeconds() < 10 ? `0${now.getSeconds()}` : now.getSeconds();

      const utcHours = String(now.getUTCHours()).padStart(2, '0');
      const utcMins = String(now.getUTCMinutes()).padStart(2, '0');
      const utcSecs = String(now.getUTCSeconds()).padStart(2, '0');

      setDateString(`${dayName}, ${monthName} ${dateNum}, ${year}`);
      setTimeString(`${hoursStr}:${minutesStr}:${secondsStr} ${ampm}`);
      setUtcString(`${utcHours}:${utcMins}:${utcSecs} Z`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleVoice = () => {
    voiceCommandService.toggle();
  };

  return (
    <header
      id="executive-header"
      className={`h-16 border-b flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 transition-colors backdrop-blur-md ${
        isDaylight
          ? 'bg-white/95 border-slate-300 shadow-sm text-slate-900'
          : 'bg-[#020409]/95 border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.95)] text-slate-200'
      }`}
    >
      {/* Left: Hamburger & App Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          id="btn-toggle-menu"
          onClick={onToggleSidebarMobile}
          aria-label="Toggle Navigation Menu"
          className={`p-2 rounded-lg border transition-all lg:hidden cursor-pointer ${
            isDaylight
              ? 'text-slate-700 hover:text-black hover:bg-slate-100 border-slate-300'
              : 'text-cyan-400 hover:text-white hover:bg-cyan-950/50 border-cyan-500/20 hover:border-cyan-500/50'
          }`}
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 relative shadow-[0_0_8px_#00ff66]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="dashboard-title-heading"
                className={`text-xs sm:text-sm font-black tracking-[0.18em] uppercase font-mono ${
                  isDaylight
                    ? 'text-cyan-900'
                    : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                }`}
              >
                SEEMADRISHTI AI DASHBOARD
              </h2>
              <span
                className={`hidden md:inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-widest ${
                  isDaylight
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                    : 'bg-cyan-950 text-cyan-400 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                }`}
              >
                [SIH26187 - MHA]
              </span>
            </div>
            <p
              className={`text-[9px] font-mono hidden sm:block tracking-wider uppercase ${
                isDaylight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              9-Camera Border Surveillance Matrix
            </p>
          </div>
        </div>
      </div>

      {/* Center Feedback HUD (When Voice Command is actively heard or executed) */}
      {voiceState.feedbackText && (
        <div
          id="voice-feedback-banner"
          className="hidden lg:flex items-center gap-2 px-3 py-1 bg-cyan-950/90 border border-cyan-400 text-cyan-300 rounded-full font-mono text-xs font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] animate-pulse"
        >
          <Mic size={12} className="text-cyan-400 animate-bounce" />
          <span className="truncate max-w-[280px]">{voiceState.feedbackText}</span>
        </div>
      )}

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Voice-to-Text Command Listener Toggle Button */}
        <div className="relative">
          <button
            id="btn-toggle-voice-commands"
            onClick={handleToggleVoice}
            onMouseEnter={() => setShowVoiceHelp(true)}
            onMouseLeave={() => setShowVoiceHelp(false)}
            title="Voice Commands: Speak 'Switch to quad view', 'Show alerts', 'Simulate intrusion'..."
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              voiceState.isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.6)] animate-pulse'
                : isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-[#050b14] hover:bg-cyan-950/60 border-cyan-500/30 hover:border-cyan-400 text-cyan-400'
            }`}
          >
            {voiceState.isListening ? (
              <>
                <Mic size={14} className="animate-bounce" />
                <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-mono font-black">
                  LISTENING...
                </span>
              </>
            ) : (
              <>
                <MicOff size={14} className="opacity-70" />
                <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-mono">
                  VOICE CMD
                </span>
              </>
            )}
          </button>

          {/* Voice Command Tooltip on Hover */}
          {showVoiceHelp && !voiceState.isListening && (
            <div className="absolute right-0 top-11 w-64 p-2.5 bg-slate-950/95 border border-cyan-500/40 rounded-xl shadow-2xl z-50 text-[10px] font-mono pointer-events-none space-y-1.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold border-b border-white/10 pb-1">
                <Mic size={11} />
                <span>Web Speech API Voice Commands</span>
              </div>
              <p className="text-slate-400 text-[9px]">
                Click mic to speak surveillance controls:
              </p>
              <ul className="text-slate-300 space-y-0.5 list-disc list-inside text-[9.5px]">
                <li><span className="text-cyan-400">&ldquo;Switch to quad view&rdquo;</span></li>
                <li><span className="text-cyan-400">&ldquo;Switch to 3x3 matrix&rdquo;</span></li>
                <li><span className="text-cyan-400">&ldquo;Show alerts&rdquo;</span></li>
                <li><span className="text-cyan-400">&ldquo;Show dashboard&rdquo;</span></li>
                <li><span className="text-cyan-400">&ldquo;Simulate intrusion&rdquo;</span></li>
                <li><span className="text-cyan-400">&ldquo;Mute audio&rdquo;</span> / <span className="text-cyan-400">&ldquo;Unmute&rdquo;</span></li>
                <li><span className="text-cyan-400">&ldquo;Calibrate feeds&rdquo;</span></li>
              </ul>
            </div>
          )}
        </div>

        {/* WebSocket Real-time Status Pill */}
        <div
          id="ws-status-hud-pill"
          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold transition-all ${
            wsState.status === 'CONNECTED'
              ? isDaylight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(0,255,102,0.2)]'
              : wsState.status === 'EMULATED'
              ? isDaylight
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
              : isDaylight
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
          }`}
        >
          <Radio size={11} className={wsState.status === 'CONNECTED' ? 'animate-pulse text-emerald-400' : 'text-cyan-400'} />
          <span>{wsState.status === 'CONNECTED' ? `WS: LIVE (${wsState.latencyMs}ms)` : `WS: ${wsState.status}`}</span>
        </div>

        {/* 9/9 Active Feeds Pill */}
        <div
          id="active-feeds-pill"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold ${
            isDaylight
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
          }`}
        >
          <Radio size={12} className={isDaylight ? 'text-cyan-600' : 'text-cyan-400 animate-pulse'} />
          <span>9/9 Active Feeds</span>
        </div>

        {/* System Online Pill */}
        <div
          id="system-status-pill"
          className={`flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-md border ${
            isDaylight
              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
              : 'border-emerald-500/50 bg-emerald-950/40 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
          }`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#00ff66]"></div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
              isDaylight ? 'text-emerald-800' : 'text-emerald-400'
            }`}
          >
            ● ONLINE (14ms inference)
          </span>
        </div>

        {/* Theme Toggle Button (Military Matrix vs Daylight Field) */}
        <button
          id="btn-toggle-theme"
          onClick={toggleTheme}
          title={
            isDaylight
              ? 'Switch to Military Matrix Dark Theme'
              : 'Switch to Standard High-Visibility Daylight Field Theme'
          }
          className={`p-2 rounded-lg border flex items-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer ${
            isDaylight
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-sm'
              : 'bg-[#050b14] hover:bg-cyan-950/60 border-cyan-500/30 hover:border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,0,0,0.8)]'
          }`}
        >
          {isDaylight ? (
            <>
              <Sun size={14} className="text-amber-600 animate-spin-slow" />
              <span className="hidden sm:inline text-[10px]">DAYLIGHT</span>
            </>
          ) : (
            <>
              <Moon size={14} className="text-cyan-400" />
              <span className="hidden sm:inline text-[10px]">MATRIX</span>
            </>
          )}
        </button>

        {/* SIH 21-Point Judge Demo Flow Guide */}
        {onOpenDemoMode && (
          <button
            id="btn-sih-demo-flow"
            onClick={onOpenDemoMode}
            title="Open SIH Judge 21-Point Live Demo Sequence"
            className="p-1.5 px-2.5 rounded-lg border border-purple-500/40 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all cursor-pointer active:scale-95"
          >
            <Compass size={13} className="text-purple-400 animate-spin-slow" />
            <span className="hidden sm:inline">SIH DEMO FLOW</span>
          </button>
        )}

        {/* Real-time Clock HUD */}
        <div
          id="header-live-clock"
          className={`hidden sm:block text-right pl-3 border-l ${
            isDaylight ? 'border-slate-300' : 'border-cyan-500/20'
          }`}
        >
          <div
            className={`flex items-center justify-end gap-1.5 text-[9px] font-mono ${
              isDaylight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            <span>{dateString}</span>
            <span className={isDaylight ? 'text-slate-400' : 'text-slate-600'}>|</span>
            <span className={isDaylight ? 'text-cyan-800 font-bold' : 'text-cyan-400'}>
              {utcString}
            </span>
          </div>
          <p
            className={`text-[12px] font-mono font-black tracking-widest leading-none mt-0.5 ${
              isDaylight
                ? 'text-emerald-700'
                : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(0,255,102,0.5)]'
            }`}
          >
            {timeString}
          </p>
        </div>

        {/* Refresh Data Button */}
        <button
          id="btn-refresh-data"
          onClick={onRefresh}
          title="Refresh Feed Telemetry"
          className={`p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
            isDaylight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-[#050b14] hover:bg-cyan-950/60 border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-white shadow-[0_0_10px_rgba(0,0,0,0.8)]'
          }`}
        >
          <RefreshCw
            size={14}
            className={`${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};
