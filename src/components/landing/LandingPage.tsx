import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Eye,
  Radio,
  Cpu,
  Layers,
  ArrowRight,
  ArrowDown,
  ChevronDown,
  ChevronUp,
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
  Radar,
  AlertTriangle,
  Siren,
  Terminal,
  Crosshair,
  Wifi,
  Navigation,
  HardDrive,
  Compass,
  FileSpreadsheet,
  Check,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SeemadrishtiLogo } from '../SeemadrishtiLogo';
import { Border3DCanvas } from './Border3DCanvas';

interface LandingPageProps {
  onEnterAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterAuth }) => {
  const { setPortal } = useAuth();
  const [activeTab, setActiveTab] = useState<'capabilities' | 'sectors' | 'architecture' | 'roles'>('capabilities');
  const [liveUtcTime, setLiveUtcTime] = useState('');
  const [liveIstTime, setLiveIstTime] = useState('');

  const pageRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToSection = (id: string, tab?: 'capabilities' | 'sectors' | 'architecture' | 'roles') => {
    if (tab) setActiveTab(tab);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    if (pageRef.current) {
      pageRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageScroll = () => {
    if (pageRef.current) {
      setShowScrollTop(pageRef.current.scrollTop > 350);
    }
  };

  const threatLevel = 'nominal' as const;

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setLiveUtcTime(d.toUTCString().replace('GMT', 'UTC'));
      setLiveIstTime(
        d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const defenseMetrics = [
    { label: 'CROSS-CAM RE-ID', value: '99.4%', sub: 'Homography & Color Invariant Matching' },
    { label: 'INFERENCE SPEED', value: '60 FPS', sub: 'YOLOv8 + ByteTrack Edge Pipeline' },
    { label: 'DETECTION LATENCY', value: '< 15 ms', sub: 'Autonomous Tripwire Trajectory Intercept' },
    { label: 'EVIDENCE INTEGRITY', value: 'SHA-256', sub: 'Cryptographic Legal Chain of Custody' },
  ];

  const borderSectors = [
    {
      id: 'north',
      name: 'Sector Alpha — Mountain Pass',
      terrain: 'High-Altitude Glacier Ridge',
      elevation: '4,200m ASL',
      cameras: '12 4K Thermal Nodes',
      status: 'OPERATIONAL',
      risk: 'LOW RISK',
      color: '#10b981',
      temp: '-14°C // Snow Blizzard',
      radar: '360° Solid State Radar Live',
    },
    {
      id: 'west',
      name: 'Sector Bravo — Desert Fence',
      terrain: 'Thar Sand Dune Buffer Line',
      elevation: '210m ASL',
      cameras: '16 PTZ Infrared Trackers',
      status: 'HIGH ALERT',
      risk: 'ELEVATED (VEHICLE PROBE)',
      color: '#f59e0b',
      temp: '44°C // Sandstorm Wind 32kt',
      radar: 'Doppler Ground Movement Sweeper',
    },
    {
      id: 'river',
      name: 'Sector Delta — Riverine Marshlands',
      terrain: 'Sundarbans Estuary Waterway',
      elevation: '12m ASL',
      cameras: '8 Marine PTZ + Sonar',
      status: 'SURVEILLANCE ACTIVE',
      risk: 'NOMINAL',
      color: '#00f0ff',
      temp: '29°C // Dense Fog 75%',
      radar: 'Sonar Echo Hydro-Sensors',
    },
    {
      id: 'east',
      name: 'Sector Echo — Jungle Valley',
      terrain: 'Dense Canopy Forest Perimeter',
      elevation: '680m ASL',
      cameras: '14 Micro-Drones + Tripwires',
      status: 'OPERATIONAL',
      risk: 'MODERATE DWELL ALERT',
      color: '#a855f7',
      temp: '22°C // Monsoon Rain',
      radar: 'Acoustic Gunfire & Footstep Array',
    },
  ];

  const tacticalCapabilities = [
    {
      title: 'Homography Cross-Camera Re-ID Handover',
      description:
        'Computes ground-plane homography matrix transformations to continuously track targets across non-overlapping camera feeds without losing identity tokens.',
      icon: Layers,
      badge: 'HOMOGRAPHY CORRELATION',
      color: '#00f0ff',
      metrics: 'Over 99.4% target identity retention across 16+ border perimeter sectors',
    },
    {
      title: 'Multi-Modal Threat Behavior Signature Chains',
      description:
        'Analyzes velocity vectors, loitering dwell times, crawl postures, and zig-zag evasive pathing to detect deliberate perimeter scaling and coordinated infiltrations.',
      icon: Flame,
      badge: 'BEHAVIORAL INFERENCE',
      color: '#ec4899',
      metrics: 'Sub-15 millisecond intrusion classification with automated risk scoring',
    },
    {
      title: 'Cryptographic SHA-256 Video Evidence Vault',
      description:
        'Instantly seals pre- and post-breach video recordings into legally admissible forensic dossiers stamped with millisecond UTC clocks and cryptographic hashes.',
      icon: Film,
      badge: 'LEGAL CHAIN OF CUSTODY',
      color: '#10b981',
      metrics: 'Zero-tamper digital forensic packages ready for intelligence and court submission',
    },
    {
      title: 'Low-Light, Infrared & Thermal Night Vision',
      description:
        'Adaptive dynamic histogram equalization and dual-spectrum thermal sensor fusion that penetrates blackout darkness, dense monsoon rain, and blinding sandstorms.',
      icon: Eye,
      badge: 'ALL-WEATHER 24/7',
      color: '#a855f7',
      metrics: 'Continuous target visibility down to 0.0005 Lux ambient starlight illumination',
    },
    {
      title: '360° Rotating Radar & Sensor Tower Fusion',
      description:
        'Integrates pulsed Doppler ground radar, acoustic footstep microphones, and laser perimeter fences into a single real-time tactical holographic HUD.',
      icon: Radar,
      badge: 'RADAR-OPTICAL FUSION',
      color: '#38bdf8',
      metrics: 'Unified situational horizon fusing electronic radar contacts with optical video streams',
    },
    {
      title: 'Tiered Military Role Clearance & Zero-Trust IAM',
      description:
        'Hardened access controls isolating mission command powers: Unit Commanders, Tactical Operators, Rapid Patrol Units, and Forensic AI Analysts.',
      icon: Shield,
      badge: 'ZERO-TRUST RBAC',
      color: '#f59e0b',
      metrics: 'Complete audit logging, biometric sessions, and Defcon-1 override safeguards',
    },
  ];

  const architecturePipeline = [
    {
      step: '01',
      title: 'Edge Ingestion & 4K RTSP-TCP Feeds',
      description: 'Zero-frame-drop hardware decoding from ruggedized border cameras, FLIR thermals, and aerial patrol drones.',
      tech: 'FFmpeg H.264 / RTSP-TCP / Low Latency WebSockets',
    },
    {
      step: '02',
      title: 'Neural Detection & Trajectory Tracking',
      description: 'High-speed YOLOv8 spatial inference synchronized with ByteTrack trajectory state Kalman filtering.',
      tech: 'YOLOv8 Real-time Weights / ByteTrack / GPU TensorRT',
    },
    {
      step: '03',
      title: 'Behavioral Signature & Anomaly Scoring',
      description: 'Kinematic analysis identifying loitering, fence scaling, evasive zig-zagging, and boundary perimeter crossing.',
      tech: 'Spatial Trajectory Vectors / Dwell Heatmaps / Risk Matrix',
    },
    {
      step: '04',
      title: 'Cross-Camera Re-ID & Spatial Handover',
      description: 'Ground-plane homography project maps target coordinates to adjacent cameras before visual sight is lost.',
      tech: 'Homography Matrices / Color Invariant Feature Embeddings',
    },
    {
      step: '05',
      title: 'Forensic Video Packaging & Tactical Dispatch',
      description: 'Automated 60-second video vault creation with SHA-256 verification and instantaneous Patrol QRT notification.',
      tech: 'MP4 Container Vault / SHA-256 Stamping / Web Push & Radio Alerts',
    },
  ];

  return (
    <div
      ref={pageRef}
      onScroll={handlePageScroll}
      id="landing-page-root"
      className="h-screen h-[100dvh] w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-[#02040a] text-slate-100 font-mono relative selection:bg-cyan-500 selection:text-black"
    >
      {/* 1. Tactical Defense Telemetry Ribbon */}
      <div className="h-7 px-4 bg-[#010307] border-b border-cyan-500/20 text-cyan-400 flex items-center justify-between text-[10px] select-none overflow-hidden z-50 relative">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff66]" />
            [DEFENSE_GRID: LEVEL-4 TACTICAL ACTIVE]
          </span>
          <span className="text-slate-600">|</span>
          <span className="hidden md:inline text-slate-400">
            SATELLITE CONSTEL: NavIC-1B / GPS L5 LOCKED (12 BARS)
          </span>
          <span className="hidden lg:inline text-slate-600">|</span>
          <span className="hidden lg:inline text-cyan-300">
            AES-256 MILITARY HARDWARE ENCRYPTION
          </span>
        </div>

        <div className="flex items-center gap-3 font-bold">
          <span className="text-slate-400 hidden sm:inline">IST: {liveIstTime}</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-cyan-300">UTC: {liveUtcTime}</span>
        </div>
      </div>

      {/* 2. Professional Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/85 border-b border-cyan-500/20 px-4 sm:px-8 py-3 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <SeemadrishtiLogo className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                SEEMADRISHTI AI
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                BORDER COMMAND
              </span>
            </div>
            <p className="text-[9px] text-slate-400 tracking-widest uppercase">
              Autonomous Real-Time Border Surveillance &amp; Perimeter Defense
            </p>
          </div>
        </div>

        {/* Tactical Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-slate-300">
          <button
            onClick={() => scrollToSection('simulator')}
            className="px-2.5 py-1 rounded-lg hover:bg-cyan-950/50 hover:text-cyan-300 transition-all cursor-pointer"
          >
            SIMULATOR
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'capabilities')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'capabilities' ? 'text-cyan-300 bg-cyan-950/50 border border-cyan-500/30' : 'hover:bg-cyan-950/50 hover:text-cyan-300'
            }`}
          >
            CAPABILITIES
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'sectors')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'sectors' ? 'text-cyan-300 bg-cyan-950/50 border border-cyan-500/30' : 'hover:bg-cyan-950/50 hover:text-cyan-300'
            }`}
          >
            SECTORS
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'architecture')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'architecture' ? 'text-cyan-300 bg-cyan-950/50 border border-cyan-500/30' : 'hover:bg-cyan-950/50 hover:text-cyan-300'
            }`}
          >
            ARCHITECTURE
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'roles')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'roles' ? 'text-cyan-300 bg-cyan-950/50 border border-cyan-500/30' : 'hover:bg-cyan-950/50 hover:text-cyan-300'
            }`}
          >
            ROLES
          </button>
        </nav>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onEnterAuth}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-teal-400 hover:to-teal-300 text-black text-xs font-black tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-95 flex items-center gap-1.5"
          >
            <Lock size={14} />
            <span>Terminal Login</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* 3. Hero Section with Interactive 3D Tactical Border Canvas */}
      <section id="hero" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Column: Tactical Headlines & Direct CTAs */}
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-xs font-bold backdrop-blur-md">
              <Crosshair size={13} className="text-cyan-400 animate-spin-slow" />
              <span>DEFENSE COMPUTER VISION PLATFORM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
              AUTONOMOUS BORDER <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                PERIMETER INTELLIGENCE
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-xl">
              SEEMADRISHTI synthesizes high-density multi-camera video feeds, thermal FLIR imaging, and radar telemetry into an ultra-low latency border defense matrix. Built for military perimeter defense with instant automated threat classification, cross-camera Re-ID handover, and cryptographic forensic verification.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onEnterAuth}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-cyan-600 text-black font-black text-xs tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all cursor-pointer active:scale-95"
              >
                <Lock size={15} />
                <span>ACCESS DEFENSE TERMINAL</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => scrollToSection('matrix-section')}
                className="px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 backdrop-blur-md"
              >
                <Layers size={15} className="text-cyan-400" />
                <span>EXPLORE DEFENSE MATRIX</span>
              </button>
            </div>

            {/* Live Telemetry Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {defenseMetrics.map((dm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-cyan-500/20 bg-slate-950/70 backdrop-blur-md"
                >
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{dm.label}</p>
                  <p className="text-lg sm:text-xl font-black text-cyan-400 mt-0.5">{dm.value}</p>
                  <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{dm.sub}</p>
                </div>
              ))}
            </div>

            {/* Scroll Explore Indicator */}
            <div className="pt-3">
              <button
                onClick={() => scrollToSection('matrix-section')}
                className="inline-flex items-center gap-2 text-[11px] font-bold text-cyan-400 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 px-4 py-2 rounded-full cursor-pointer transition-all group shadow-[0_0_15px_rgba(0,240,255,0.25)] active:scale-95"
              >
                <span>EXPLORE DEFENSE CAPABILITIES &amp; ARCHITECTURE</span>
                <ArrowDown size={14} className="animate-bounce text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Hero Column: Interactive 3D Border Security Hologram Canvas */}
          <div className="lg:col-span-6 relative">
            <div className="w-full h-[420px] sm:h-[480px] rounded-3xl border border-cyan-500/30 bg-[#030914]/90 shadow-[0_0_40px_rgba(0,240,255,0.15)] relative overflow-hidden backdrop-blur-md">
              {/* Top HUD Frame Overlays */}
              <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-bold text-cyan-300 font-mono tracking-widest">
                  LIVE 3D TACTICAL PERIMETER VIEW
                </span>
              </div>
              <div className="absolute top-3 right-4 z-20 text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                INTERACTIVE 360° RADAR / SENSOR TOWERS
              </div>

              {/* Three.js 3D Canvas */}
              <Border3DCanvas threatLevel={threatLevel} />

              {/* Bottom Interactive Notice */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[9px] text-slate-400 font-mono bg-black/70 backdrop-blur-md p-2 rounded-xl border border-white/10">
                <span className="flex items-center gap-1.5">
                  <Navigation size={11} className="text-cyan-400" />
                  DRAG OR HOVER CURSOR TO ROTATE TACTICAL 3D ELEVATION
                </span>
                <span className="text-emerald-400 font-bold hidden sm:inline">
                  7 SENSOR TOWERS ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* 5. Feature & Sector Matrix Tab Navigation */}
      <section id="matrix-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-cyan-500/20 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: 'capabilities' as const, label: 'TACTICAL CAPABILITIES' },
            { id: 'sectors' as const, label: 'BORDER SECTORS & READINESS' },
            { id: 'architecture' as const, label: 'PIPELINE ARCHITECTURE' },
            { id: 'roles' as const, label: 'ROLE CLEARANCE MATRIX' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)] font-black'
                  : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Tactical AI Capabilities */}
        {activeTab === 'capabilities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tacticalCapabilities.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl border border-slate-800 bg-[#040813]/85 backdrop-blur-md hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="p-3 rounded-2xl"
                        style={{ backgroundColor: `${feat.color}15`, color: feat.color }}
                      >
                        <Icon size={24} />
                      </div>
                      <span
                        className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border"
                        style={{ borderColor: `${feat.color}40`, color: feat.color }}
                      >
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                      {feat.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80">
                    <p className="text-[10px] text-cyan-400 font-mono flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      <span>{feat.metrics}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Border Sectors & Operational Readiness */}
        {activeTab === 'sectors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {borderSectors.map((sec) => (
              <div
                key={sec.id}
                className="p-6 rounded-3xl border bg-[#040813]/90 backdrop-blur-md space-y-4"
                style={{ borderColor: `${sec.color}40` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                    <h3 className="text-base font-black text-white tracking-wider">{sec.name}</h3>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2.5 py-1 rounded"
                    style={{ backgroundColor: `${sec.color}20`, color: sec.color }}
                  >
                    {sec.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/50 border border-slate-800">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">TERRAIN &amp; CLIMATE</p>
                    <p className="text-slate-200 font-bold mt-0.5">{sec.terrain}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sec.temp}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/50 border border-slate-800">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">OPTICAL SENSORS</p>
                    <p className="text-cyan-400 font-bold mt-0.5">{sec.cameras}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sec.elevation}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-300 font-mono text-[11px]">{sec.radar}</span>
                  <span className="text-[10px] font-bold text-rose-400 font-mono">{sec.risk}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: End-to-End Pipeline Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-4">
            {architecturePipeline.map((pipe) => (
              <div
                key={pipe.step}
                className="p-5 rounded-2xl border border-slate-800 bg-[#040813]/85 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl font-black text-cyan-400 font-mono bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
                    {pipe.step}
                  </span>
                  <div>
                    <h4 className="text-base font-black text-white">{pipe.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-sans max-w-2xl">{pipe.description}</p>
                  </div>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <span className="text-[10px] font-mono font-bold text-slate-300 bg-black/70 px-3 py-1.5 rounded-lg border border-slate-700 inline-block">
                    {pipe.tech}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Role Clearance Matrix */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                role: 'Commander',
                code: 'LVL-4 STRATEGIC',
                color: '#ec4899',
                scope: 'Supreme Command & Policy',
                capabilities: [
                  'Tactical alert dispatch & Defcon override',
                  'Model sensitivity & threshold calibration',
                  'Export forensic incident dossiers (SHA-256)',
                  'Operator management and sector assignments',
                ],
              },
              {
                role: 'Surveillance Operator',
                code: 'LVL-3 OPERATOR',
                color: '#00f0ff',
                scope: 'Real-Time Perimeter Guard',
                capabilities: [
                  'Live camera matrix supervision & recording',
                  'PTZ preset cycling & intrusion alarm review',
                  'Direct voice command navigation & siren alarm',
                  'Incident verification & QRT team deployment',
                ],
              },
              {
                role: 'Patrol Officer',
                code: 'LVL-2 GROUND',
                color: '#10b981',
                scope: 'Field Deployment & Intercept',
                capabilities: [
                  'Mobile responsive sector alert feed',
                  'On-ground breach confirmation reporting',
                  'GPS coordinate verification & perimeter patrol logs',
                  'Instant incident status acknowledgement',
                ],
              },
              {
                role: 'AI Analyst',
                code: 'LVL-3 FORENSIC',
                color: '#a855f7',
                scope: 'Neural Trajectory & Heatmaps',
                capabilities: [
                  'Neural trajectory vectors & dwell heatmaps',
                  'Behavior chain correlation score analysis',
                  'Edge node frame drops and latency telemetry',
                  'Historical event query & anomaly classification',
                ],
              },
            ].map((rc, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl border bg-[#040813]/90 backdrop-blur-md flex flex-col justify-between"
                style={{ borderColor: `${rc.color}40` }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded"
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
                  onClick={onEnterAuth}
                  className="mt-6 w-full py-2.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: `${rc.color}20`,
                    color: rc.color,
                    border: `1px solid ${rc.color}50`,
                  }}
                >
                  <Lock size={12} />
                  <span>AUTHENTICATE AS {rc.role.toUpperCase()}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Professional Footer */}
      <footer id="footer" className="relative z-10 border-t border-cyan-500/20 bg-black/90 py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <SeemadrishtiLogo className="w-6 h-6 text-cyan-400" />
            <span className="tracking-widest font-bold text-slate-400">
              &copy; 2026 SEEMADRISHTI AI DEFENSE TECHNOLOGIES
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span>EDGE LATENCY: 14MS</span>
            <span>&bull;</span>
            <span>RTSP 4K ZERO-FRAME-DROP</span>
            <span>&bull;</span>
            <span>FIPS 140-3 COMPLIANT</span>
            <span>&bull;</span>
            <button
              onClick={onEnterAuth}
              className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
            >
              AUTHENTICATE OPERATOR &rarr;
            </button>
          </div>
        </div>
      </footer>

      {/* 7. Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-cyan-950/95 border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-900 shadow-[0_0_25px_rgba(0,240,255,0.6)] cursor-pointer transition-all active:scale-90 animate-in fade-in slide-in-from-bottom-3 flex items-center justify-center group"
          title="Scroll to Top"
        >
          <ChevronUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
