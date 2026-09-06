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
  ShieldCheck,
  Radio,
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

  // Live Defense Clock Telemetry
  const [liveUtcTime, setLiveUtcTime] = useState('');
  const [liveIstTime, setLiveIstTime] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setLiveUtcTime(now.toISOString().substring(11, 19) + ' UTC');
      setLiveIstTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="relative min-h-screen h-[100dvh] w-full bg-[#02050e] text-slate-100 flex flex-col justify-between overflow-y-auto overflow-x-hidden font-mono select-none">
      {/* 3D Holographic Globe & Radar Canvas Background */}
      <Auth3DCanvas />

      {/* Cyber Defense Scanline Pattern & Dynamic Gradient Mask */}
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff0c_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02050e]/40 via-transparent to-[#02050e]/80 pointer-events-none z-[1]" />

      {/* Top Header Bar with Ultra-Transparent Frosted Glass */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-3 flex items-center justify-between border-b border-white/[0.08] backdrop-blur-2xl bg-black/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3.5">
          <div
            className="relative group cursor-pointer"
            onClick={() => (onNavigateLanding ? onNavigateLanding() : setPortal('landing'))}
          >
            <SeemadrishtiLogo className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.7)] transition-transform group-hover:scale-105" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
                SEEMADRISHTI AI
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-[9px] font-bold text-cyan-300 tracking-wider shadow-[0_0_10px_rgba(0,240,255,0.15)]">
                AES-256 GCM
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-400/30 text-[9px] font-bold text-emerald-300">
                <ShieldCheck size={10} className="text-emerald-400" />
                SECURE NODE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider flex items-center gap-1.5 mt-0.5">
              <Radio size={10} className="text-cyan-400 animate-pulse" />
              Tactical Border Edge Terminal // Node IN-NORTH-01
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Live UTC / IST Clocks */}
          <div className="hidden md:flex flex-col text-right font-mono text-[10px] border-r border-white/10 pr-3.5">
            <span className="text-cyan-400 font-bold tracking-wider">{liveIstTime}</span>
            <span className="text-slate-500">{liveUtcTime}</span>
          </div>

          <button
            onClick={() => {
              if (onNavigateLanding) onNavigateLanding();
              else setPortal('landing');
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-cyan-500/[0.1] hover:border-cyan-400/40 text-slate-300 hover:text-cyan-300 text-xs font-semibold backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-lg active:scale-95 group"
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Portal Overview</span>
          </button>
        </div>
      </header>

      {/* Main Center Auth Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 my-auto">
        <div className={`w-full ${mode === 'signup' ? 'max-w-lg' : 'max-w-[440px]'} transition-all duration-300`}>
          {/* Ambient Glowing Aura Behind Card */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-teal-500/20 rounded-3xl blur-2xl opacity-75 -z-10 animate-pulse pointer-events-none" />

          {/* Main Ultra-Transparent Frosted Glass Terminal Card */}
          <div className="relative rounded-2xl border border-white/[0.16] border-t-white/[0.32] bg-gradient-to-b from-white/[0.08] via-slate-950/[0.5] to-[#020512]/[0.7] backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.55),0_0_80px_rgba(0,240,255,0.12),inset_0_1px_1px_rgba(255,255,255,0.25)] overflow-hidden transition-all duration-300">
            {/* Tactical Corner HUD Reticles */}
            <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

            {/* Glowing Laser Top Accent */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f0ff]" />

            {/* Card Header */}
            <div className="p-6 sm:p-7 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.25)] backdrop-blur-md">
                    <Fingerprint className="text-cyan-400 animate-pulse" size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">
                    [MANDATORY OPERATOR AUTHENTICATION]
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30 backdrop-blur-md shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GATEWAY ACTIVE
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                {mode === 'login' ? 'OPERATOR AUTHENTICATION' : 'PERSONNEL ENROLLMENT'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Operator authentication is mandatory to establish defense telemetry uplink.'
                  : 'Register a verified operator profile for border sector clearance.'}
              </p>

              {/* Mode Switcher Tabs with Smooth Glass Pill Container */}
              <div className="grid grid-cols-2 gap-1.5 mt-4 p-1 rounded-xl bg-black/40 border border-white/[0.1] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-black tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
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
                  className={`py-2 text-xs font-black tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  ENROLL NEW
                </button>
              </div>
            </div>

            {/* Error / Success Glass Banners */}
            {errorMessage && (
              <div className="mx-6 sm:mx-7 mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-xl shadow-lg animate-shake">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mx-6 sm:mx-7 mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 backdrop-blur-xl shadow-lg">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* Main Lightweight Form with Sleek Glass Inputs */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-7 pb-6 space-y-3.5">
              {mode === 'signup' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Personnel Full Name
                    </label>
                    <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/[0.12] hover:border-cyan-400/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-xl transition-all duration-200 backdrop-blur-md">
                      <div className="pl-3 pr-2 py-2.5 text-cyan-400">
                        <User size={14} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Major Vikram Sen"
                        required
                        className="w-full pr-3 py-2.5 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Official Email */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Department Email
                    </label>
                    <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/[0.12] hover:border-cyan-400/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-xl transition-all duration-200 backdrop-blur-md">
                      <div className="pl-3 pr-2 py-2.5 text-cyan-400">
                        <Mail size={14} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@seemadrishti.gov.in"
                        required
                        className="w-full pr-3 py-2.5 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-mono"
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
                          className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer backdrop-blur-md ${
                            role === r.id
                              ? `${r.border} ${r.bg} shadow-[0_0_15px_rgba(0,240,255,0.2)]`
                              : 'border-white/[0.08] bg-black/25 hover:border-white/20 hover:bg-white/[0.04]'
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
                      <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/[0.12] hover:border-cyan-400/40 focus-within:border-cyan-400 rounded-xl transition-all duration-200 backdrop-blur-md">
                        <div className="pl-3 pr-2 py-2 text-cyan-400">
                          <Building2 size={13} />
                        </div>
                        <select
                          value={assignedSector}
                          onChange={(e) => setAssignedSector(e.target.value)}
                          className="w-full pr-3 py-2 bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer"
                        >
                          {borderSectors.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">
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
                      <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/[0.12] hover:border-cyan-400/40 focus-within:border-cyan-400 rounded-xl transition-all duration-200 backdrop-blur-md">
                        <div className="pl-3 pr-2 py-2 text-cyan-400">
                          <Clock size={13} />
                        </div>
                        <select
                          value={shift}
                          onChange={(e) => setShift(e.target.value)}
                          className="w-full pr-3 py-2 bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer"
                        >
                          {shiftOptions.map((sh) => (
                            <option key={sh} value={sh} className="bg-slate-900 text-white">
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
                <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/[0.12] hover:border-cyan-400/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-xl transition-all duration-200 backdrop-blur-md">
                  <div className="pl-3 pr-2 py-2.5 text-cyan-400">
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
                    className="w-full pr-3 py-2.5 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-mono"
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
                <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] focus-within:bg-cyan-500/[0.06] border border-white/[0.12] hover:border-cyan-400/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-xl transition-all duration-200 backdrop-blur-md">
                  <div className="pl-3 pr-2 py-2.5 text-cyan-400">
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
                    className="w-full pr-10 py-2.5 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/[0.06] transition-all cursor-pointer"
                    title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-black font-black text-xs tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.65)] transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Status with Minimal Defense Telemetry */}
      <footer className="relative z-10 py-2.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-white/[0.08] backdrop-blur-2xl bg-black/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          <span>SEEMADRISHTI AI DEFENSE MATRIX &bull; BORDER CCTV INTELLIGENCE PLATFORM</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 font-mono">
          <span>LATENCY: &lt;12MS</span>
          <span>CIPHER: AES-256 GCM</span>
          <span className="text-cyan-400 font-bold">NODE 01 ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};
