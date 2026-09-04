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
  BellRing,
  Activity,
  HeartPulse,
  Sliders,
  Footprints,
  Flame,
  Lock,
  Bot,
} from 'lucide-react';
import { ViewMode } from '../types';
import { SeemadrishtiLogo } from './SeemadrishtiLogo';
import { recordingEngine } from '../utils/recordingManager';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';

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
  const { theme, isDaylight } = useTheme();
  const { user, logout, setIsProfileModalOpen } = useAuth();
  const { lockNow } = useSecurity();
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
    { id: 'mission-control' as ViewMode, label: 'Mission Control', icon: Activity, badge: 'OPERATIONAL', isHealth: true, code: '[HQ_CMD]' },
    { id: 'agents' as ViewMode, label: 'Autonomous AI Swarm', icon: Bot, badge: '5 AGENTS', isAlert: true, code: '[AI_SWARM]' },
    { id: 'camera-fleet' as ViewMode, label: 'Camera Fleet', icon: Video, badge: '9 NODES', code: '[FLEET_09]' },
    { id: 'evidence-queue' as ViewMode, label: 'Evidence Vault', icon: Film, isRecTab: true, badge: 'SHA-256', code: '[FORENSIC_REC]' },
    { id: 'system-timeline' as ViewMode, label: 'Operator Timeline', icon: Layers, code: '[AUDIT_LOG]' },
    { id: 'diagnostics' as ViewMode, label: 'Stream Diagnostics', icon: Activity, badge: '60 FPS', isHealth: true, code: '[HEALTH_NET]' },
    { id: 'inspector' as ViewMode, label: 'Incident Inspector', icon: ShieldAlert, badge: 'CRITICAL', isAlert: true, code: '[FORENSIC]' },
    { id: 'historical-logs' as ViewMode, label: 'Historical Logs', icon: Film, isRecTab: true, badge: activeRecCount > 0 ? `${activeRecCount} REC` : `${savedClipsCount} CLIPS`, code: '[NVR_VAULT]' },
    { id: 'analytics' as ViewMode, label: 'Analytics Engine', icon: BarChart3, badge: '24H AI', code: '[TELEMETRY]' },
    { id: 'target-journey' as ViewMode, label: 'Target Journey', icon: Footprints, badge: 'MULTI-CAM', code: '[JOURNEY]' },
    { id: 'threat-map' as ViewMode, label: 'Threat Heatmap', icon: Flame, badge: 'DYNAMIC', isAlert: true, code: '[HEATMAP]' },
    { id: 'cameras' as ViewMode, label: 'Camera Nodes', icon: Video, badge: '4 CH', code: '[RTSP_4K]' },
    { id: 'detections' as ViewMode, label: 'Neural Detections', icon: ScanEye, code: '[YOLOv8]' },
    { id: 'alerts' as ViewMode, label: 'Threat Alerts', icon: TriangleAlert, alertBadge: unreadAlertsCount, isAlert: true, code: '[DEFCON]' },
    { id: 'notification-history' as ViewMode, label: 'Notification History', icon: BellRing, code: '[AUDIO_LOG]' },
    { id: 'livestream' as ViewMode, label: 'Quad Live Stream', icon: Tv, code: '[4-WAY]' },
    { id: 'stitching' as ViewMode, label: 'Multi-Cam Handover', icon: Layers, isNew: true, code: '[HANDOVER]' },
    { id: 'calibration' as ViewMode, label: 'Zone Calibration', icon: Sliders, badge: 'EDITOR', code: '[GEO_CALIB]' },
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isDaylight
            ? 'bg-[#f8fafc] border-r border-slate-300 shadow-md text-slate-900'
            : theme === 'midnight-cyber'
            ? 'bg-[#030712] border-r border-indigo-500/30 text-indigo-100'
            : theme === 'obsidian-stealth'
            ? 'bg-[#000000] border-r border-slate-800 text-slate-100'
            : theme === 'emerald-ops'
            ? 'bg-[#021009] border-r border-emerald-500/30 text-emerald-100'
            : 'bg-[#010307] border-r border-cyan-500/20 shadow-[10px_0_40px_rgba(0,0,0,0.95)] text-slate-200'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div>
          <div
            className={`p-4 flex items-center gap-3 border-b ${
              isDaylight
                ? 'bg-slate-100/90 border-slate-300'
                : 'bg-[#040812]/80 border-cyan-500/20'
            }`}
          >
            <div
              className={`w-9 h-9 flex items-center justify-center rounded-lg shrink-0 ${
                isDaylight
                  ? 'bg-cyan-800 text-white shadow-sm'
                  : 'bg-cyan-950 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.4)] text-cyan-300'
              }`}
            >
              <SeemadrishtiLogo size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-sm font-black tracking-widest font-mono ${
                    isDaylight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  SEEMADRISHTI
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-4 pt-3.5 pb-1.5 flex items-center justify-between">
            <span
              className={`text-[9px] font-mono font-bold tracking-[0.2em] uppercase ${
                isDaylight ? 'text-slate-600' : 'text-slate-500'
              }`}
            >
              SECTOR CHANNELS
            </span>
            <span
              className={`text-[8px] font-mono font-bold animate-pulse ${
                isDaylight ? 'text-cyan-700' : 'text-cyan-400'
              }`}
            >
              LIVE
            </span>
          </div>

          <nav className="flex-1 px-2.5 py-1 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]" id="sidebar-nav-menu">
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
                      ? isDaylight
                        ? 'bg-cyan-700 text-white font-bold shadow-sm'
                        : 'bg-cyan-950/60 text-cyan-200 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                      : isDaylight
                      ? 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-transparent'
                      : 'text-slate-400 hover:bg-cyan-950/20 hover:text-cyan-300 border border-transparent'
                  }`}
                >
                  {/* Left Active Glow Bar */}
                  {isActive && (
                    <span
                      className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full ${
                        isDaylight ? 'bg-cyan-300' : 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
                      }`}
                    ></span>
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={15}
                      className={`transition-colors shrink-0 ${
                        isActive
                          ? isDaylight
                            ? 'text-white'
                            : 'text-cyan-300 drop-shadow-[0_0_6px_rgba(0,240,255,0.7)]'
                          : item.isAlert
                          ? 'text-rose-500 group-hover:text-rose-400'
                          : item.isHealth
                          ? 'text-emerald-500 group-hover:text-emerald-400'
                          : isDaylight
                          ? 'text-slate-600 group-hover:text-cyan-700'
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
                          : isDaylight
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
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
                          ? isDaylight
                            ? 'bg-cyan-800 text-cyan-100'
                            : 'bg-cyan-900/60 text-cyan-300 border border-cyan-400/40'
                          : isDaylight
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-black/60 text-slate-500 border border-white/[0.06]'
                      }`}
                    >
                      {item.id === 'historical-logs' && activeRecCount > 0 && <Disc size={8} className="animate-spin" />}
                      <span>{item.badge}</span>
                    </span>
                  )}

                  {item.isNew && (
                    <span
                      className={`text-[8px] uppercase font-bold tracking-widest px-1 py-0.2 rounded ${
                        isDaylight
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(0,255,102,0.3)]'
                      }`}
                    >
                      360° AI
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Operator & Hardware Info */}
        <div
          className={`p-3 border-t space-y-2 ${
            isDaylight
              ? 'bg-slate-100 border-slate-300'
              : 'bg-[#03060c] border-cyan-500/20'
          }`}
        >
          {user && (
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer hover:border-cyan-400 group ${
                isDaylight
                  ? 'bg-white border-slate-300 hover:bg-slate-50'
                  : 'bg-black/80 border-cyan-500/30 hover:bg-cyan-950/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
              }`}
              title="Click to view and edit Operator Profile"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-cyan-400 group-hover:text-cyan-300">
                  OPERATOR PROFILE &bull; EDIT
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs font-black text-white truncate mt-0.5">{user.name}</p>
              <p className="text-[9px] text-slate-400 truncate">
                [{user.role}] &bull; {user.shift}
              </p>
            </div>
          )}

          <div
            className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[9px] font-mono ${
              isDaylight
                ? 'bg-white border border-slate-300'
                : 'bg-black/80 border border-cyan-500/20'
            }`}
          >
            <div className="flex items-center gap-1.5 text-slate-400">
              <Cpu size={12} className="text-emerald-500" />
              <span className={isDaylight ? 'text-slate-700' : 'text-slate-400'}>
                JETSON ORIN AGX
              </span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">41°C / OK</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              onClick={lockNow}
              title="Lock Terminal Screen"
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all cursor-pointer text-[10px] font-mono font-bold ${
                isDaylight
                  ? 'text-slate-700 hover:bg-slate-200 bg-slate-100 border border-slate-300'
                  : 'text-slate-300 hover:bg-slate-800 bg-slate-900/80 border border-slate-700'
              }`}
            >
              <Lock size={12} className="text-amber-400" />
              <span>LOCK</span>
            </button>

            <button
              id="nav-logout"
              onClick={logout}
              title="Terminate Session & Return to Landing Page"
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all cursor-pointer text-[10px] font-mono font-bold ${
                isDaylight
                  ? 'text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-300'
                  : 'text-rose-400 hover:bg-rose-950/60 bg-rose-950/30 border border-rose-500/30 hover:border-rose-400'
              }`}
            >
              <LogOut size={12} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};


