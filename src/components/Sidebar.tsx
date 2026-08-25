import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Video,
  ScanEye,
  TriangleAlert,
  Tv,
  Settings,
  Users,
  LogOut,
  Layers,
  Radio,
  Cpu,
  BarChart3,
  ShieldAlert,
  Film,
  Disc,
} from 'lucide-react';
import { ViewMode } from '../types';
import { SeemadrishtiLogo } from './SeemadrishtiLogo';
import { recordingEngine } from '../utils/recordingManager';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  unreadAlertsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  unreadAlertsCount = 12,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [activeRecCount, setActiveRecCount] = useState(0);
  const [savedClipsCount, setSavedClipsCount] = useState(() => recordingEngine.getSavedClips().length);

  useEffect(() => {
    const unsub = recordingEngine.subscribe((active, clips) => {
      setActiveRecCount(active.size);
      setSavedClipsCount(clips.length);
    });
    return unsub;
  }, []);

  const navItems = [
    { id: 'dashboard' as ViewMode, label: 'Tactical Matrix', icon: LayoutGrid, code: '[SEC-01]' },
    { id: 'inspector' as ViewMode, label: 'Incident Inspector', icon: ShieldAlert, badge: 'CRITICAL', isAlert: true, code: '[FORENSIC]' },
    { id: 'historical-logs' as ViewMode, label: 'Historical Logs', icon: Film, isRecTab: true, badge: activeRecCount > 0 ? `${activeRecCount} REC` : `${savedClipsCount} CLIPS`, code: '[NVR_VAULT]' },
    { id: 'analytics' as ViewMode, label: 'Analytics Engine', icon: BarChart3, badge: '24H AI', code: '[TELEMETRY]' },
    { id: 'cameras' as ViewMode, label: 'Camera Nodes', icon: Video, badge: '4 CH', code: '[RTSP_4K]' },
    { id: 'detections' as ViewMode, label: 'Neural Detections', icon: ScanEye, code: '[YOLOv8]' },
    { id: 'alerts' as ViewMode, label: 'Threat Alerts', icon: TriangleAlert, alertBadge: unreadAlertsCount, isAlert: true, code: '[DEFCON]' },
    { id: 'livestream' as ViewMode, label: 'Quad Live Stream', icon: Tv, code: '[4-WAY]' },
    { id: 'stitching' as ViewMode, label: 'Panoramic Stitching', icon: Layers, isNew: true, code: '[PANORAMA]' },
    { id: 'settings' as ViewMode, label: 'System Config', icon: Settings, code: '[SYS_CONF]' },
    { id: 'users' as ViewMode, label: 'Access Control', icon: Users, code: '[IAM_SEC]' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="seemadrishti-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#010307] border-r border-cyan-500/20 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-[10px_0_40px_rgba(0,0,0,0.95)] ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-4 flex items-center gap-3 border-b border-cyan-500/20 bg-[#040812]/80">
            <div className="w-9 h-9 flex items-center justify-center bg-cyan-950 border border-cyan-400/60 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.4)] shrink-0 text-cyan-300">
              <SeemadrishtiLogo size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white tracking-widest font-mono">SEEMADRISHTI</h1>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[8px] font-bold font-mono">
                  MIL-SPEC v2.8
                </span>
              </div>
              <p className="text-[8px] text-emerald-400 uppercase tracking-widest font-mono font-bold">
                [TACTICAL DEFENSE AI]
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-4 pt-3.5 pb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-slate-500 uppercase">
              SECTOR CHANNELS
            </span>
            <span className="text-[8px] font-mono text-cyan-500 animate-pulse font-bold">LIVE</span>
          </div>

          <nav className="flex-1 px-2.5 py-1 space-y-1" id="sidebar-nav-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    onSelectView(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer group relative ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-200 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:bg-cyan-950/20 hover:text-cyan-300 border border-transparent'
                  }`}
                >
                  {/* Left Active Glow Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1 bottom-1 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_8px_#00f0ff]"></span>
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={15}
                      className={`transition-colors shrink-0 ${
                        isActive
                          ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(0,240,255,0.7)]'
                          : item.isAlert
                          ? 'text-rose-500 group-hover:text-rose-400'
                          : 'text-slate-400 group-hover:text-cyan-400'
                      }`}
                    />
                    <span className="font-mono text-[11px] truncate">{item.label}</span>
                  </div>

                  {item.alertBadge !== undefined && item.alertBadge > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(255,0,85,0.6)]'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/50 animate-pulse'
                      }`}
                    >
                      {item.alertBadge}
                    </span>
                  )}

                  {item.badge && !item.alertBadge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 ${
                        item.id === 'historical-logs' && activeRecCount > 0
                          ? 'bg-rose-600 text-white border border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-pulse'
                          : isActive
                          ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-400/40'
                          : 'bg-black/60 text-slate-500 border border-white/[0.06]'
                      }`}
                    >
                      {item.id === 'historical-logs' && activeRecCount > 0 && <Disc size={8} className="animate-spin" />}
                      <span>{item.badge}</span>
                    </span>
                  )}

                  {item.isNew && (
                    <span className="text-[8px] uppercase font-bold tracking-widest px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(0,255,102,0.3)]">
                      360° AI
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Hardware & Security Info */}
        <div className="p-3 border-t border-cyan-500/20 bg-[#03060c] space-y-2">
          <div className="px-2.5 py-1.5 rounded-lg bg-black/80 border border-cyan-500/20 flex items-center justify-between text-[9px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Cpu size={12} className="text-emerald-400" />
              <span>JETSON ORIN AGX</span>
            </div>
            <span className="text-emerald-400 font-bold">41°C / OK</span>
          </div>

          <button
            id="nav-logout"
            onClick={() => alert('Surveillance session locked. Military cipher keys verified.')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 hover:border-rose-500/40 border border-transparent rounded-lg transition-all cursor-pointer text-[11px] font-mono font-bold"
          >
            <LogOut size={13} />
            <span className="uppercase tracking-wider">Lock Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};

