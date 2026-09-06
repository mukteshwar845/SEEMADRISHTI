import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Building2,
  Clock,
  ArrowLeft,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Auth3DCanvas } from './Auth3DCanvas';
import { SeemadrishtiLogo } from '../SeemadrishtiLogo';

interface Auth3DViewProps {
  initialMode?: 'login' | 'signup';
  onNavigateLanding?: () => void;
}

export const Auth3DView: React.FC<Auth3DViewProps> = ({
  initialMode = 'login',
  onNavigateLanding,
}) => {
  const { login, register, setPortal } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Surveillance Operator');
  const [assignedSector, setAssignedSector] = useState('Sector Alpha - Main Gate');
  const [shift, setShift] = useState('Day Shift (0600 - 1800)');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // UI status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const availableRoles = [
    {
      id: 'Commander',
      title: 'Commander / Unit Chief',
      code: 'LVL-4 COMMAND',
      color: '#ec4899',
      border: 'border-pink-500/40',
      bg: 'bg-pink-500/10',
      text: 'text-pink-400',
    },
    {
      id: 'Surveillance Operator',
      title: 'Surveillance Operator',
      code: 'LVL-3 OPERATOR',
      color: '#00f0ff',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
    },
    {
      id: 'Patrol Officer',
      title: 'Patrol Officer',
      code: 'LVL-2 PATROL',
      color: '#10b981',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
    },
    {
      id: 'AI Analyst',
      title: 'Surveillance AI Analyst',
      code: 'LVL-3 ANALYST',
      color: '#a855f7',
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
    },
  ];

  const borderSectors = [
    'Sector Alpha - Main Gate',
    'Sector Bravo - Inner Perimeter',
    'Sector Charlie - Vehicle Checkpoint',
    'Sector Delta - High Altitude Pass',
    'Sector Echo - Riverine Boundary',
    'All Border Sectors (HQ Operational Command)',
  ];

  const shiftOptions = [
    'Day Shift (0600 - 1800)',
    'Night Tactical Shift (1800 - 0600)',
    'Rotational 24/7 Rapid Response',
    'Standard HQ Hours (0900 - 1700)',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!username.trim() || !password) {
          throw new Error('Please enter operator callsign and security passphrase.');
        }
        await login(username.trim(), password);
        setSuccessMessage('Authentication verified. Connecting to Tactical Defense Matrix...');
      } else {
        if (!username.trim() || !password || !name.trim() || !email.trim()) {
          throw new Error('All registration fields are required.');
        }
        if (password.length < 6) {
          throw new Error('Security passphrase must contain at least 6 characters.');
        }
        await register({
          username: username.trim(),
          password,
          name: name.trim(),
          email: email.trim(),
          role,
          assigned_sector: assignedSector,
          shift,
        });
        setSuccessMessage('Personnel successfully enrolled. Sector clearance granted.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen h-[100dvh] w-full bg-[#020510] text-slate-100 flex flex-col justify-between overflow-y-auto overflow-x-hidden font-mono select-none">
      {/* 3D Holographic Globe & Radar Canvas Background */}
      <Auth3DCanvas />

      {/* Cyber Defense Scanline Pattern & Dynamic Subtle Gradient Masks */}
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff15_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#020510]/30 via-transparent to-[#020510]/50 pointer-events-none z-[1]" />

      {/* Top Header Bar with Ultra-Transparent Frosted Glass */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-white/[0.10] backdrop-blur-xl bg-slate-950/20 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => (onNavigateLanding ? onNavigateLanding() : setPortal('landing'))}
        >
          <SeemadrishtiLogo className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.7)] transition-transform group-hover:scale-105" />
          <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
            SEEMADRISHTI
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              if (onNavigateLanding) onNavigateLanding();
              else setPortal('landing');
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.14] bg-white/[0.04] hover:bg-cyan-500/[0.12] hover:border-cyan-400/50 text-slate-200 hover:text-cyan-300 text-xs font-semibold backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-lg active:scale-95 group"
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Portal Overview</span>
          </button>
        </div>
      </header>

      {/* Main Center Auth Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 my-auto">
        <div className={`w-full ${mode === 'signup' ? 'max-w-lg' : 'max-w-[450px]'} transition-all duration-300 relative`}>
          
          {/* Volumetric Glowing Ambient Aura Behind Card */}
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-purple-500/15 rounded-[32px] blur-3xl opacity-75 -z-10 animate-pulse pointer-events-none" />
          
          {/* Faint Cybernetic Outer Energy Field Ring */}
          <div className="absolute -inset-1 rounded-[26px] border border-cyan-400/25 pointer-events-none -z-10 shadow-[0_0_30px_rgba(0,240,255,0.15)]" />

          {/* Main Ultra-Transparent Frosted Glass Terminal Card with 3D Depth */}
          <div className="relative rounded-3xl border border-white/25 border-t-white/60 border-b-cyan-400/40 bg-slate-900/[0.10] backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_60px_rgba(0,240,255,0.18),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,240,255,0.25)] overflow-hidden transition-all duration-300">
            
            {/* Glass Light Reflection Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.06] via-transparent to-white/[0.12] pointer-events-none" />

            {/* Tactical Corner HUD Reticles */}
            <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />
            <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />
            <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />
            <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />

            {/* Glowing Laser Top Specular Rim */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_#00f0ff]" />

            {/* Card Header Section */}
            <div className="p-6 sm:p-7 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.35)] backdrop-blur-md">
                    <Fingerprint className="text-cyan-400 animate-pulse" size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-300 tracking-widest uppercase">
                    [MANDATORY OPERATOR AUTHENTICATION]
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/40 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GATEWAY ACTIVE
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                {mode === 'login' ? 'OPERATOR AUTHENTICATION' : 'PERSONNEL ENROLLMENT'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {mode === 'login'
                  ? 'Operator authentication is mandatory to establish defense telemetry uplink.'
                  : 'Register a verified operator profile for border sector clearance.'}
              </p>

              {/* Floating Segmented Glass Control Toggle */}
              <div className="grid grid-cols-2 gap-2 mt-5 p-1.5 rounded-2xl bg-black/25 border border-white/[0.14] backdrop-blur-xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2.5 text-xs font-black tracking-wider rounded-xl transition-all duration-200 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 text-black shadow-[0_0_25px_rgba(0,240,255,0.5),0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2.5 text-xs font-black tracking-wider rounded-xl transition-all duration-200 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 text-black shadow-[0_0_25px_rgba(0,240,255,0.5),0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  ENROLL NEW
                </button>
              </div>
            </div>

            {/* Error / Success Glass Banners */}
            {errorMessage && (
              <div className="mx-6 sm:mx-7 mb-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-xl shadow-lg animate-shake">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mx-6 sm:mx-7 mb-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 backdrop-blur-xl shadow-lg">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* Main Lightweight Form with Semi-Transparent Recessed Glass Inputs */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-7 pb-6 space-y-4">
              {mode === 'signup' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Personnel Full Name
                    </label>
                    <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/20 hover:border-cyan-400/50 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/25 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.3)] rounded-xl transition-all duration-200 backdrop-blur-sm">
                      <div className="pl-3.5 pr-2.5 py-3 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                        <User size={14} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Major Vikram Sen"
                        required
                        className="w-full pr-3.5 py-3 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none font-mono tracking-wide selection:bg-cyan-500 selection:text-black [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgba(5,15,30,0.2)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                      />
                    </div>
                  </div>

                  {/* Official Email */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Department Email
                    </label>
                    <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/20 hover:border-cyan-400/50 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/25 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.3)] rounded-xl transition-all duration-200 backdrop-blur-sm">
                      <div className="pl-3.5 pr-2.5 py-3 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                        <Mail size={14} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@seemadrishti.gov.in"
                        required
                        className="w-full pr-3.5 py-3 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none font-mono tracking-wide selection:bg-cyan-500 selection:text-black [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgba(5,15,30,0.2)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                      />
                    </div>
                  </div>

                  {/* Tactical Role Selection */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Tactical Role & Clearance
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableRoles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer backdrop-blur-sm ${
                            role === r.id
                              ? `${r.border} ${r.bg} shadow-[0_0_20px_rgba(0,240,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]`
                              : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-bold ${r.text}`}>{r.code}</span>
                            {role === r.id && <CheckCircle2 size={11} className="text-cyan-400" />}
                          </div>
                          <p className="text-[11px] font-bold text-white mt-0.5 truncate">{r.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sector & Shift Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                        Assigned Sector
                      </label>
                      <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/20 hover:border-cyan-400/50 focus-within:border-cyan-400 rounded-xl transition-all duration-200 backdrop-blur-sm">
                        <div className="pl-3 pr-2 py-2 text-cyan-400">
                          <Building2 size={13} />
                        </div>
                        <select
                          value={assignedSector}
                          onChange={(e) => setAssignedSector(e.target.value)}
                          className="w-full pr-3 py-2 bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer font-mono"
                        >
                          {borderSectors.map((s) => (
                            <option key={s} value={s} className="bg-slate-950 text-white">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                        Operational Shift
                      </label>
                      <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/20 hover:border-cyan-400/50 focus-within:border-cyan-400 rounded-xl transition-all duration-200 backdrop-blur-sm">
                        <div className="pl-3 pr-2 py-2 text-cyan-400">
                          <Clock size={13} />
                        </div>
                        <select
                          value={shift}
                          onChange={(e) => setShift(e.target.value)}
                          className="w-full pr-3 py-2 bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer font-mono"
                        >
                          {shiftOptions.map((sh) => (
                            <option key={sh} value={sh} className="bg-slate-950 text-white">
                              {sh}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Callsign / Username Input */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                  Operator Callsign / ID
                </label>
                <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/20 hover:border-cyan-400/50 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/25 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.3)] rounded-xl transition-all duration-200 backdrop-blur-sm">
                  <div className="pl-3.5 pr-2.5 py-3 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                    <User size={14} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter operator callsign..."
                    required
                    autoCapitalize="none"
                    autoComplete="username"
                    className="w-full pr-3.5 py-3 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none font-mono tracking-wide selection:bg-cyan-500 selection:text-black [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgba(5,15,30,0.2)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                  />
                </div>
              </div>

              {/* Password Input with Sleek Show/Hide and CapsLock Detector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase">
                    Security Passphrase
                  </label>
                  {isCapsLockOn && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded animate-pulse">
                      CAPS LOCK ON
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/20 hover:border-cyan-400/50 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/25 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.3)] rounded-xl transition-all duration-200 backdrop-blur-sm">
                  <div className="pl-3.5 pr-2.5 py-3 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                    <Lock size={14} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyDown}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full pr-10 py-3 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none font-mono tracking-wider selection:bg-cyan-500 selection:text-black [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgba(5,15,30,0.2)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08] transition-all cursor-pointer"
                    title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Tactile 3D Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-black font-black text-xs tracking-widest flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,240,255,0.5),0_4px_15px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.7)] hover:shadow-[0_0_40px_rgba(0,240,255,0.7),0_6px_20px_rgba(0,0,0,0.6)] transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>AUTHENTICATING NODE...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'AUTHENTICATE & ENTER DASHBOARD'
                        : 'REGISTER PERSONNEL & ACCESS'}
                    </span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Clean Classified Defense Footer */}
      <footer className="relative z-10 py-2.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-white/[0.10] backdrop-blur-xl bg-slate-950/20">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          <span>&copy; 2026 SEEMADRISHTI DEFENSE TECHNOLOGIES</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 tracking-wider">
          <span>RESTRICTED // MIL-STD-810H COMPLIANT</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 font-bold">DEFENSE NETWORK ONLY</span>
        </div>
      </footer>
    </div>
  );
};

