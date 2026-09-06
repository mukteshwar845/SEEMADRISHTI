import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Eye,
  Radio,
  Cpu,
  Layers,
  ArrowRight,
  ArrowDown,
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
  Check,
  Sparkles,
  Target,
  Scan,
  ShieldCheck,
  RadioTower,
  Network,
  Video,
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
      setShowScrollTop(pageRef.current.scrollTop > 300);
    }
  };

  const threatLevel = 'nominal' as const;

  const defenseMetrics = [
    { label: 'CROSS-CAM RE-ID', value: '99.4%', sub: 'Homography Handover', icon: Target, badge: 'ACTIVE' },
    { label: 'EDGE INFERENCE', value: '60 FPS', sub: 'YOLOv8 + ByteTrack', icon: Cpu, badge: 'REAL-TIME' },
    { label: 'BREACH LATENCY', value: '< 15 ms', sub: 'Automated Tripwires', icon: Zap, badge: 'ULTRA-LOW' },
    { label: 'EVIDENCE INTEGRITY', value: 'SHA-256', sub: 'Forensic Video Custody', icon: Shield, badge: 'SEALED' },
  ];

  const borderSectors = [
    {
      id: 'north',
      name: 'Sector Alpha — Mountain Pass',
      terrain: 'High-Altitude Glacier Ridge',
      elevation: '4,200m ASL',
      cameras: '12 Thermal 4K Nodes',
      status: 'OPERATIONAL',
      risk: 'NOMINAL // SECURE',
      color: '#10b981',
      temp: '-14°C // Alpine Snow',
      radar: '360° Solid State Radar Active',
    },
    {
      id: 'west',
      name: 'Sector Bravo — Desert Fence',
      terrain: 'Thar Sand Dune Buffer Line',
      elevation: '210m ASL',
      cameras: '16 PTZ Infrared Trackers',
      status: 'HIGH ALERT',
      risk: 'ELEVATED MONITORING',
      color: '#f59e0b',
      temp: '42°C // Dust Storm 28kt',
      radar: 'Doppler Ground Movement Sweeper',
    },
    {
      id: 'river',
      name: 'Sector Delta — Riverine Estuary',
      terrain: 'Sundarbans Waterway Corridor',
      elevation: '12m ASL',
      cameras: '8 Marine PTZ + Sonar',
      status: 'OPERATIONAL',
      risk: 'NOMINAL // CLEAR',
      color: '#00f0ff',
      temp: '29°C // High Fog Density',
      radar: 'Sonar Echo Hydro-Sensors',
    },
    {
      id: 'east',
      name: 'Sector Echo — Forest Perimeter',
      terrain: 'Dense Canopy Valley Boundary',
      elevation: '680m ASL',
      cameras: '14 Micro-Nodes & Tripwires',
      status: 'OPERATIONAL',
      risk: 'ACTIVE PATROL',
      color: '#a855f7',
      temp: '24°C // Moderate Humidity',
      radar: 'Acoustic Footstep Seismic Array',
    },
  ];

  const tacticalCapabilities = [
    {
      title: 'Homography Cross-Camera Re-ID Handover',
      description:
        'Calculates ground-plane spatial transformations to continuously track suspicious targets across adjacent cameras without losing track ID identity.',
      icon: Layers,
      badge: 'SPATIAL RE-ID',
      color: '#00f0ff',
      metrics: '99.4% identity retention across multi-camera blind zones',
    },
    {
      title: 'AI Threat Behavior Signature Chains',
      description:
        'Detects complex perimeter breaches including fence climbing, low crawling, evasive zig-zagging, and prolonged loitering near restricted geofences.',
      icon: Flame,
      badge: 'BEHAVIORAL INFERENCE',
      color: '#ec4899',
      metrics: 'Sub-15ms automated classification with real-time risk scoring',
    },
    {
      title: 'Cryptographic SHA-256 Evidence Vault',
      description:
        'Automatically seals incident video recordings with millisecond UTC timestamps and cryptographic SHA-256 hashes for legally admissible forensic custody.',
      icon: Film,
      badge: 'FORENSIC INTEGRITY',
      color: '#10b981',
      metrics: 'Tamper-proof digital video dossiers for intelligence review',
    },
    {
      title: 'All-Weather Infrared & Thermal Night Vision',
      description:
        'Dynamic histogram equalization and thermal sensor fusion penetrating complete blackout darkness, heavy fog, and blinding sandstorms 24/7.',
      icon: Eye,
      badge: 'THERMAL FLIR',
      color: '#a855f7',
      metrics: 'Continuous visibility down to 0.0005 Lux ambient starlight',
    },
    {
      title: '360° Radar & Optical Sensor Fusion',
      description:
        'Combines pulsed Doppler ground radar, acoustic seismic sensors, and PTZ optical cameras into a unified real-time perimeter defense horizon.',
      icon: Radar,
      badge: 'SENSOR FUSION',
      color: '#38bdf8',
      metrics: 'Unified situational radar overlay synchronized with live CCTV',
    },
    {
      title: 'Military Role Clearance & Zero-Trust IAM',
      description:
        'Granular role-based security isolating operational capabilities across Unit Commanders, Surveillance Operators, Rapid Patrols, and AI Analysts.',
      icon: Shield,
      badge: 'ZERO-TRUST RBAC',
      color: '#f59e0b',
      metrics: 'Encrypted JWT sessions, complete audit trails, and Defcon controls',
    },
  ];

  const architecturePipeline = [
    {
      step: '01',
      title: 'Edge Ingestion & 4K RTSP Video Streams',
      description: 'Zero-frame-drop hardware decoding from border cameras, FLIR thermals, and aerial patrol drones.',
      tech: 'FFmpeg H.264 / RTSP-TCP / Low Latency WebSockets',
      icon: Video,
    },
    {
      step: '02',
      title: 'Neural Detection & Trajectory Tracking',
      description: 'YOLOv8 spatial inference synchronized with ByteTrack trajectory state Kalman filtering at 60 FPS.',
      tech: 'YOLOv8 Weights / ByteTrack / TensorRT Acceleration',
      icon: Target,
    },
    {
      step: '03',
      title: 'Behavioral Signature & Anomaly Scoring',
      description: 'Kinematic analysis identifying loitering, scaling, crawling, and geofence perimeter violations.',
      tech: 'Spatial Trajectory Vectors / Dwell Heatmaps / Risk Engine',
      icon: Activity,
    },
    {
      step: '04',
      title: 'Cross-Camera Re-ID & Spatial Handover',
      description: 'Homography matrices project target coordinates to neighboring cameras before visual contact is lost.',
      tech: 'Homography Transforms / Color Invariant Feature Embeddings',
      icon: Network,
    },
    {
      step: '05',
      title: 'Forensic Video Packaging & Tactical Dispatch',
      description: 'Automated video vault creation with SHA-256 verification and instant Quick Reaction Team dispatch.',
      tech: 'MP4 Incident Packaging / SHA-256 Digests / Real-time Alerts',
      icon: ShieldCheck,
    },
  ];

  const operationalRoles = [
    {
      role: 'Commander',
      code: 'LVL-4 STRATEGIC',
      color: '#ec4899',
      scope: 'Supreme Command & Tactical Policy',
      capabilities: [
        'Tactical alert dispatch & Defcon-1 override',
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
        'Live 9-camera matrix supervision & recording',
        'PTZ preset cycling & intrusion alarm review',
        'Direct voice command navigation & siren alerts',
        'Incident verification & QRT team deployment',
      ],
    },
    {
      role: 'Patrol Officer',
      code: 'LVL-2 GROUND',
      color: '#10b981',
      scope: 'Field Intercept & Confirmation',
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
      scope: 'Neural Trajectory & Model Diagnostics',
      capabilities: [
        'Neural trajectory vectors & dwell heatmaps',
        'Behavior chain correlation score analysis',
        'Edge node frame drops and latency telemetry',
        'Historical event query & anomaly classification',
      ],
    },
  ];

  return (
    <div
      ref={pageRef}
      onScroll={handlePageScroll}
      id="landing-page-root"
      className="h-screen h-[100dvh] w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-[#02050e] text-slate-100 font-mono relative selection:bg-cyan-500 selection:text-black"
    >
      {/* Background Cyber Mesh & Radial Glows */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-10 right-1/4 w-[500px] h-[350px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 1. Sleek Floating Tactical Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#020512]/90 border-b border-cyan-500/20 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.3)] group cursor-pointer" onClick={scrollToTop}>
            <SeemadrishtiLogo className="w-7 h-7 text-cyan-400 transition-transform group-hover:scale-105" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                SEEMADRISHTI AI
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-400/30 text-[9px] font-bold text-emerald-400 hidden sm:inline-flex items-center gap-1">
                <ShieldCheck size={10} className="text-emerald-400" />
                BORDER DEFENSE PLATFORM
              </span>
            </div>
            <p className="text-[9px] text-slate-400 tracking-wider uppercase">
              Autonomous Real-Time Perimeter Surveillance &amp; Threat Interception
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-xl text-[11px] font-bold text-slate-300">
          <button
            onClick={() => scrollToSection('matrix-section', 'capabilities')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'capabilities'
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-black'
                : 'hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            CAPABILITIES
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'sectors')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'sectors'
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-black'
                : 'hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            BORDER SECTORS
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'architecture')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'architecture'
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-black'
                : 'hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            ARCHITECTURE
          </button>
          <button
            onClick={() => scrollToSection('matrix-section', 'roles')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-black'
                : 'hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            CLEARANCE MATRIX
          </button>
        </nav>

        {/* Primary Header CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={onEnterAuth}
            className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-black text-xs font-black tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.45)] hover:shadow-[0_0_30px_rgba(0,240,255,0.65)] active:scale-95 flex items-center gap-1.5 group"
          >
            <Lock size={13} className="transition-transform group-hover:rotate-12" />
            <span>Access</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section with 3D Tactical Border Canvas */}
      <section id="hero" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 text-xs font-bold backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Crosshair size={13} className="text-cyan-400 animate-spin-slow" />
              <span>DEFENSE COMPUTER VISION PLATFORM // C4ISR</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
              AUTONOMOUS BORDER <br />
              <span className="bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                PERIMETER DEFENSE
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-xl">
              SEEMADRISHTI transforms high-density multi-camera CCTV feeds, thermal infrared optics, and Doppler radar telemetry into an ultra-low latency border defense matrix. Built for military perimeter protection with automated intrusion classification, cross-camera Re-ID handover, and cryptographic forensic verification.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={onEnterAuth}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-black font-black text-xs tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.65)] transition-all cursor-pointer active:scale-95 group"
              >
                <Lock size={15} className="transition-transform group-hover:rotate-12" />
                <span>ACCESS</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => scrollToSection('matrix-section')}
                className="px-5 py-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-500/10 hover:border-cyan-400/50 text-slate-200 font-bold text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 backdrop-blur-xl group"
              >
                <Layers size={15} className="text-cyan-400 transition-transform group-hover:scale-110" />
                <span>EXPLORE CAPABILITIES</span>
              </button>
            </div>

            {/* Key Defense Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {defenseMetrics.map((dm, idx) => {
                const Icon = dm.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-black/70 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{dm.label}</p>
                      <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-400/30">
                        {dm.badge}
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl font-black text-cyan-400 mt-1">{dm.value}</p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{dm.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Scroll Indicator */}
            <div className="pt-2">
              <button
                onClick={() => scrollToSection('matrix-section')}
                className="inline-flex items-center gap-2 text-[11px] font-bold text-cyan-400 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 px-4 py-2 rounded-full cursor-pointer transition-all group shadow-[0_0_15px_rgba(0,240,255,0.2)] active:scale-95"
              >
                <span>EXPLORE DEFENSE CAPABILITIES &amp; ARCHITECTURE</span>
                <ArrowDown size={14} className="animate-bounce text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Hero Column: Interactive 3D Hologram Radar Canvas */}
          <div className="lg:col-span-6 relative">
            <div className="w-full h-[430px] sm:h-[490px] rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 via-black/80 to-[#020614]/90 shadow-[0_0_50px_rgba(0,240,255,0.18)] relative overflow-hidden backdrop-blur-2xl">
              
              {/* Tactical Corner HUD Reticles */}
              <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none z-30" />
              <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none z-30" />
              <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none z-30" />
              <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none z-30" />

              {/* Top HUD Badges */}
              <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-bold text-cyan-300 font-mono tracking-widest">
                  LIVE 3D TACTICAL PERIMETER RADAR
                </span>
              </div>
              <div className="absolute top-3 right-4 z-20 text-[9px] font-mono text-slate-300 bg-black/70 px-2.5 py-1 rounded-lg border border-cyan-500/30 backdrop-blur-md">
                360° SENSOR TOWERS
              </div>

              {/* Three.js 3D Canvas */}
              <Border3DCanvas threatLevel={threatLevel} />

              {/* Bottom Interactive Notice */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[9px] text-slate-300 font-mono bg-black/80 backdrop-blur-xl p-2.5 rounded-xl border border-cyan-500/30">
                <span className="flex items-center gap-1.5">
                  <Navigation size={11} className="text-cyan-400" />
                  HOVER OR DRAG CURSOR TO ROTATE 3D TACTICAL ELEVATION
                </span>
                <span className="text-emerald-400 font-bold hidden sm:inline">
                  7 SENSOR NODES ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tabbed Capabilities, Sectors, Architecture & Roles Matrix */}
      <section id="matrix-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 border-t border-cyan-500/20 scroll-mt-20">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles size={11} className="text-cyan-400" />
            <span>TACTICAL OVERVIEW &amp; SPECIFICATIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            INTELLIGENT PERIMETER DEFENSE SYSTEM
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
            Select an operational dimension below to explore edge computer vision capabilities, border sector readiness, neural pipeline architecture, and role-based clearance protocols.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {[
            { id: 'capabilities' as const, label: 'TACTICAL CAPABILITIES', icon: Layers },
            { id: 'sectors' as const, label: 'BORDER SECTORS & READINESS', icon: Globe },
            { id: 'architecture' as const, label: 'PIPELINE ARCHITECTURE', icon: Cpu },
            { id: 'roles' as const, label: 'ROLE CLEARANCE MATRIX', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)] font-black'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.08] hover:border-cyan-400/30'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-black' : 'text-cyan-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Tactical AI Capabilities */}
        {activeTab === 'capabilities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {tacticalCapabilities.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-black/70 backdrop-blur-xl hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="p-3 rounded-2xl shadow-inner"
                        style={{ backgroundColor: `${feat.color}15`, color: feat.color }}
                      >
                        <Icon size={22} />
                      </div>
                      <span
                        className="text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-md border"
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

                  <div className="mt-5 pt-4 border-t border-white/[0.08]">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
            {borderSectors.map((sec) => (
              <div
                key={sec.id}
                className="p-6 rounded-3xl border bg-gradient-to-b from-white/[0.04] to-black/80 backdrop-blur-xl space-y-4"
                style={{ borderColor: `${sec.color}40` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: sec.color, color: sec.color }} />
                    <h3 className="text-base font-black text-white tracking-wider">{sec.name}</h3>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: `${sec.color}20`, color: sec.color }}
                  >
                    {sec.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08]">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">TERRAIN &amp; CLIMATE</p>
                    <p className="text-slate-200 font-bold mt-0.5">{sec.terrain}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sec.temp}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08]">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">OPTICAL SENSORS</p>
                    <p className="text-cyan-400 font-bold mt-0.5">{sec.cameras}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sec.elevation}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs flex items-center justify-between">
                  <span className="text-slate-300 font-mono text-[11px]">{sec.radar}</span>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">{sec.risk}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: End-to-End Pipeline Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {architecturePipeline.map((pipe) => {
              const PipeIcon = pipe.icon;
              return (
                <div
                  key={pipe.step}
                  className="p-5 rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.03] to-black/70 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-cyan-400/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-cyan-400 font-mono bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-400/30">
                        {pipe.step}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <PipeIcon size={15} className="text-cyan-400" />
                        <h4 className="text-base font-black text-white">{pipe.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-sans max-w-2xl">{pipe.description}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left md:text-right">
                    <span className="text-[10px] font-mono font-bold text-slate-300 bg-black/70 px-3 py-1.5 rounded-lg border border-white/10 inline-block">
                      {pipe.tech}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 4: Role Clearance Matrix */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {operationalRoles.map((rc, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl border bg-gradient-to-b from-white/[0.04] to-black/80 backdrop-blur-xl flex flex-col justify-between"
                style={{ borderColor: `${rc.color}40` }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-md"
                      style={{ backgroundColor: `${rc.color}20`, color: rc.color }}
                    >
                      {rc.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{rc.role}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{rc.scope}</p>

                  <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-2">
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
                  className="mt-6 w-full py-2.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                  style={{
                    backgroundColor: `${rc.color}20`,
                    color: rc.color,
                    border: `1px solid ${rc.color}50`,
                  }}
                >
                  <Lock size={12} />
                  <span>ACCESS</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Bottom Access CTA Card */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="relative p-8 sm:p-10 rounded-3xl border border-cyan-500/30 border-t-cyan-400/40 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-[#020614]/90 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_80px_rgba(0,240,255,0.15)] overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-[10px] text-cyan-300 font-bold mb-1">
              <Shield size={11} className="text-cyan-400" />
              RESTRICTED DEFENSE TERMINAL
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              READY TO ACCESS THE DEFENSE MATRIX?
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Authenticate your operator credentials to unlock live 9-camera CCTV streams, AI bounding boxes, neural behavior logs, and tactical alert dispatch.
            </p>
          </div>

          <button
            onClick={onEnterAuth}
            className="shrink-0 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-black font-black text-xs tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.65)] transition-all cursor-pointer active:scale-95 group"
          >
            <Lock size={15} className="transition-transform group-hover:rotate-12" />
            <span>ACCESS</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* 5. Clean Classified Defense Footer */}
      <footer id="footer" className="relative z-10 border-t border-cyan-500/20 bg-black/95 py-6 px-4 sm:px-8 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <SeemadrishtiLogo className="w-6 h-6 text-cyan-400" />
            <span className="tracking-widest font-bold text-slate-400">
              &copy; 2026 SEEMADRISHTI AI DEFENSE TECHNOLOGIES
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-500 tracking-wider">
            <span>RESTRICTED // MIL-STD-810H COMPLIANT</span>
            <span className="text-slate-700">|</span>
            <span className="text-cyan-400/80 font-bold">DEFENSE NETWORK ONLY</span>
          </div>
        </div>
      </footer>

      {/* 6. Floating Back to Top Button */}
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


