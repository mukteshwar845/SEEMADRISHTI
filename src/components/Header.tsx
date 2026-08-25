import React, { useState, useEffect } from 'react';
import { Menu, RefreshCw, Radio, Shield, Zap, Bell, Activity, Lock } from 'lucide-react';

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
  const [dateString, setDateString] = useState('MON, SEP 16, 2026');
  const [timeString, setTimeString] = useState('10:45:22 AM');
  const [utcString, setUtcString] = useState('17:45:22 UTC');

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
      className="h-16 border-b border-cyan-500/20 bg-[#020409]/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.95)]"
    >
      {/* Left: Hamburger & App Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          id="btn-toggle-menu"
          onClick={onToggleSidebarMobile}
          aria-label="Toggle Navigation Menu"
          className="p-2 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-950/50 border border-cyan-500/20 hover:border-cyan-500/50 transition-all lg:hidden cursor-pointer"
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
                className="text-xs sm:text-sm font-black tracking-[0.18em] text-cyan-300 uppercase font-mono drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
              >
                SEEMADRISHTI AI DASHBOARD
              </h2>
              <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                [SIH26187 - MHA]
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono hidden sm:block tracking-wider uppercase">
              9-Camera Border Surveillance Matrix
            </p>
          </div>
        </div>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* 9/9 Active Feeds Pill */}
        <div
          id="active-feeds-pill"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-cyan-500/40 bg-cyan-950/50 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)] font-mono text-[10px] font-bold"
        >
          <Radio size={12} className="text-cyan-400 animate-pulse" />
          <span>9/9 Active Feeds</span>
        </div>

        {/* System Online Pill */}
        <div
          id="system-status-pill"
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-md border border-emerald-500/50 bg-emerald-950/40 shadow-[0_0_15px_rgba(0,255,102,0.2)]"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00ff66]"></div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
            ● ONLINE (14ms inference)
          </span>
        </div>

        {/* Real-time Clock HUD */}
        <div id="header-live-clock" className="hidden sm:block text-right pl-3 border-l border-cyan-500/20">
          <div className="flex items-center justify-end gap-1.5 text-[9px] font-mono text-slate-400">
            <span>{dateString}</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400">{utcString}</span>
          </div>
          <p className="text-[12px] font-mono text-emerald-400 font-black tracking-widest leading-none mt-0.5 drop-shadow-[0_0_6px_rgba(0,255,102,0.5)]">
            {timeString}
          </p>
        </div>

        {/* Refresh Data Button */}
        <button
          id="btn-refresh-data"
          onClick={onRefresh}
          title="Refresh Feed Telemetry"
          className="p-2 bg-[#050b14] hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-cyan-400 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.8)] active:scale-95"
        >
          <RefreshCw
            size={14}
            className={`text-cyan-400 ${isRefreshing ? 'animate-spin text-cyan-200' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};


