import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  Radio,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  Flame,
  Film,
  Camera,
  CheckCircle2,
  Lock,
  ChevronRight,
  Globe,
  Sliders,
  Play,
  FileText,
  BarChart3,
  Server,
  UserCheck,
} from 'lucide-react';
import { useAuth, DEMO_OPERATOR_PRESETS } from '../../context/AuthContext';
import { SeemadrishtiLogo } from '../SeemadrishtiLogo';
import { Auth3DCanvas } from '../auth/Auth3DCanvas';

interface LandingPageProps {
  onEnterAuth: () => void;
  onEnterDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterAuth, onEnterDemo }) => {
  const { enterDemoMode, setPortal } = useAuth();
  const [activeTab, setActiveTab] = useState<'features' | 'roles' | 'architecture'>('features');
  const [liveClock, setLiveClock] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setLiveClock(d.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'EDGE NODES', value: '9 ACTIVE', sub: 'RTSP 4K / RTSP-TCP' },
    { label: 'INFERENCE SPEED', value: '60 FPS', sub: 'YOLOv8 + ByteTrack' },
    { label: 'ANOMALY DETECTION', value: '< 15 ms', sub: 'Dynamic Behavioral Chains' },
    { label: 'ACCURACY RATE', value: '99.4%', sub: 'Multi-Modal Correlated' },
  ];

  const coreFeatures = [
    {
      title: 'Real-Time Perimeter Multi-Cam Matrix',
      description:
        'Tactical 3x3 low-latency RTSP grid with automated zoom-on-breach, PTZ tripwire tracking, and cross-camera handover.',
      icon: Camera,
      badge: '60 FPS INFERENCE',
      color: '#00f0ff',
    },
    {
      title: 'Threat Behavior Chains & Correlation',
      description:
        'Analyzes trajectory signatures to flag loitering, zig-zag evasive patterns, crawl infiltrations, and multi-cam coordinated breach movements.',
      icon: Flame,
      badge: 'PHASE 19 SIGNATURE',
      color: '#ec4899',
    },
    {
      title: 'Automated Forensic Video Evidence Vault',
      description:
        'Instant pre- and post-roll video packaging on critical triggers, verified with cryptographic SHA-256 integrity hashes for legal chain of custody.',
      icon: Film,
      badge: 'SHA-256 VAULT',
      color: '#10b981',
    },
    {
      title: 'Low-Light & Thermal Night Surveillance',
      description:
        'Adaptive histogram equalization and night mode enhancers that continuously adjust detection thresholds in dense fog, rain, or total blackout.',
      icon: Eye,
      badge: 'NIGHT VISION AI',
      color: '#a855f7',
    },
    {
      title: 'Panoramic Multi-Camera Edge Stitching',
      description:
        'Synthesizes non-overlapping boundary camera feeds into continuous wide-angle battlefield horizons with real-time seam equalization.',
      icon: Layers,
      badge: 'PANORAMIC HORIZON',
      color: '#38bdf8',
    },
    {
      title: 'Multi-Role Clearance & Security Hierarchy',
      description:
        'Role-based access control partitioning operational tools between Unit Commanders, Surveillance Operators, Patrol Units, and AI Analysts.',
      icon: Shield,
      badge: 'MIL-SPEC IAM',
      color: '#f59e0b',
    },
  ];

  const roleClearance = [
    {
      role: 'Commander',
      code: 'LVL-4 COMMAND',
      color: '#ec4899',
      scope: 'Strategic & Full Command',
      capabilities: [
        'Tactical alert dispatch & Defcon-1 override',
        'Model sensitivity & dynamic threshold tuning',
        'Export forensic incident dossiers with SHA-256',
        'Operator management and sector assignments',
      ],
    },
    {
      role: 'Surveillance Operator',
      code: 'LVL-3 OPERATOR',
      color: '#00f0ff',
      scope: 'Real-Time Tactical Monitoring',
      capabilities: [
        'Live 9-feed matrix supervision & manual clip captures',
        'Camera PTZ preset cycling & intrusion alarm review',
        'Direct voice command navigation & audio alarms',
        'Incident verification & response team deployment',
      ],
    },
    {
      role: 'Patrol Officer',
      code: 'LVL-2 PATROL',
      color: '#10b981',
      scope: 'Field Deployment & Ground Response',
      capabilities: [
        'Mobile responsive sector alert view',
        'On-ground breach confirmation reporting',
        'GPS coordinate verification & perimeter patrol logs',
        'Direct incident status acknowledgement',
      ],
    },
    {
      role: 'AI Analyst',
      code: 'LVL-3 ANALYST',
      color: '#a855f7',
      scope: 'Forensic Intelligence & Trajectories',
      capabilities: [
        'Neural trajectory vector & dwell time heatmaps',
        'Behavior chain correlation score analysis',
        'Edge node frame drops and latency diagnostics',
        'Historical event query & anomaly classification',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 font-mono select-none relative overflow-x-hidden">
      {/* 3D Holographic Background */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <Auth3DCanvas />
      </div>

      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/60 border-b border-cyan-500/20 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SeemadrishtiLogo className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                SEEMADRISHTI AI
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[9px] font-bold text-cyan-300">
                DEFCON-4 READY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider">
              Intelligent Autonomous Multi-Camera Border Surveillance
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            <span>UTC: {liveClock}</span>
          </div>

          <button
            onClick={() => onEnterDemo()}
            className="px-3.5 py-1.5 rounded-lg border border-purple-500/50 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.25)] active:scale-95"
          >
            1-Click Demo Mode
          </button>

          <button
            onClick={onEnterAuth}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black text-xs font-black tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.5)] active:scale-95 flex items-center gap-1.5"
          >
            <span>Access Terminal</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        {/* Top Operational Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-xs font-bold mb-6 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>AUTONOMOUS PERIMETER SURVEILLANCE &amp; THREAT INTELLIGENCE</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-none">
          DEFENDING BORDERS WITH <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            REAL-TIME COMPUTER VISION
          </span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-3xl mx-auto mt-6 leading-relaxed font-sans">
          SEEMADRISHTI transforms legacy border surveillance networks into an ultra-low latency,
          zero-blindspot tactical defense matrix. Featuring real-time intrusion trajectory tracking,
          cross-camera handover, automated video evidence vaults, and multi-tier role clearance.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8">
          <button
            onClick={onEnterAuth}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-cyan-600 hover:to-cyan-500 text-black font-black text-xs tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all cursor-pointer active:scale-95"
          >
            <Lock size={16} />
            <span>ENTER SECURE 3D TERMINAL</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => onEnterDemo()}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 backdrop-blur-md"
          >
            <Play size={15} className="text-purple-400" />
            <span>LAUNCH LIVE DEMO DASHBOARD</span>
          </button>
        </div>

        {/* Quick Demo Operator Buttons */}
        <div className="mt-8 max-w-3xl mx-auto p-3 rounded-xl bg-black/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={12} className="text-cyan-400" />
              Quick 1-Click Evaluation Accounts:
            </span>
            <span className="text-[9px] text-cyan-400 font-bold">CLICK TO LOG IN DIRECTLY</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEMO_OPERATOR_PRESETS.map((preset) => (
              <button
                key={preset.username}
                onClick={async () => {
                  await enterDemoMode(preset.role);
                  setPortal('app');
                }}
                className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 hover:bg-cyan-950/40 hover:border-cyan-500/40 text-left transition-all cursor-pointer group active:scale-95"
              >
                <span
                  className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${preset.color}20`,
                    color: preset.color,
                  }}
                >
                  {preset.tag}
                </span>
                <p className="text-xs font-black text-white mt-1 group-hover:text-cyan-300">
                  {preset.name}
                </p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">{preset.sector}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Telemetry Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mt-12">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-cyan-500/20 bg-slate-950/60 backdrop-blur-md text-left"
            >
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                {stat.label}
              </p>
              <p className="text-xl sm:text-2xl font-black text-cyan-400 mt-1 tracking-wider">
                {stat.value}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature / Role Matrix Tab Navigation */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-cyan-500/20">
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            TACTICAL CAPABILITIES
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ROLE CLEARANCE MATRIX
          </button>
        </div>

        {/* Tab 1: Features */}
        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coreFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-slate-800 bg-[#040813]/80 backdrop-blur-md hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: `${feat.color}15`,
                        color: feat.color,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span
                      className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border"
                      style={{
                        borderColor: `${feat.color}40`,
                        color: feat.color,
                      }}
                    >
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-cyan-400 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Role Clearance Matrix */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleClearance.map((rc, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border bg-[#040813]/80 backdrop-blur-md flex flex-col justify-between"
                style={{ borderColor: `${rc.color}40` }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${rc.color}20`, color: rc.color }}
                    >
                      {rc.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{rc.role}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{rc.scope}</p>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                    {rc.capabilities.map((cap, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={13} className="shrink-0 text-cyan-400 mt-0.5" />
                        <span className="font-sans leading-tight">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await enterDemoMode(rc.role);
                    setPortal('app');
                  }}
                  className="mt-6 w-full py-2 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer"
                  style={{
                    backgroundColor: `${rc.color}20`,
                    color: rc.color,
                    border: `1px solid ${rc.color}50`,
                  }}
                >
                  LOG IN AS {rc.role.toUpperCase()}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer Banner */}
      <footer className="relative z-10 border-t border-cyan-500/20 bg-black/80 py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <SeemadrishtiLogo className="w-6 h-6 text-cyan-400" />
            <span>&copy; 2026 SEEMADRISHTI AI DEFENSE TECHNOLOGIES &bull; ALL RIGHTS RESERVED</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>NODE_LATENCY: 14MS</span>
            <span>ENCRYPTION: AES-256</span>
            <span>BUILD: v4.2.0-TACTICAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
