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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { webSocketService, WebSocketServiceState } from '../services/websocketService';

interface HeaderProps {
  onToggleSidebarMobile: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  activeAlertCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebarMobile,
  onRefresh,
  isRefreshing = false,
  activeAlertCount = 12,
}) => {
  const { theme, toggleTheme, isDaylight } = useTheme();
  const [dateString, setDateString] = useState('MON, SEP 16, 2026');
  const [timeString, setTimeString] = useState('10:45:22 AM');
  const [utcString, setUtcString] = useState('17:45:22 UTC');
  const [wsState, setWsState] = useState<WebSocketServiceState>(() =>
    webSocketService.getState()
  );

  useEffect(() => {
    const unsubWs = webSocketService.onStateChange((st) => setWsState(st));
    return unsubWs;
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

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
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



