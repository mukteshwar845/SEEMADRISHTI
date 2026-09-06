import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Radio,
  Building2,
  Clock,
  ArrowLeft,
  KeyRound,
  Fingerprint,
  ShieldAlert,
  Cpu,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth, DEMO_OPERATOR_PRESETS } from '../../context/AuthContext';
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
  const { login, register, enterDemoMode, setPortal } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Form states with default credentials pre-populated
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
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
      setLiveUtcTime(
        now.toISOString().substring(11, 19) + ' UTC'
      );
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

  const handleAutofillDefaultAdmin = () => {
    setUsername('admin');
    setPassword('Admin@123');
    setErrorMessage(null);
    setSuccessMessage('Default Commander credentials filled (admin / Admin@123)');
    setTimeout(() => setSuccessMessage(null), 3000);
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
          throw new Error('Please enter both operator username and password.');
        }
        await login(username.trim(), password);
        setSuccessMessage('Credentials authenticated. Initializing Tactical Matrix...');
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
        setSuccessMessage('Personnel successfully registered and clearance granted.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPreset = async (preset: (typeof DEMO_OPERATOR_PRESETS)[0]) => {
    setUsername(preset.username);
    setPassword(preset.password);
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await enterDemoMode(preset.role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick demo login failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen h-[100dvh] w-full bg-[#02040a] text-slate-200 flex flex-col justify-between overflow-y-auto overflow-x-hidden font-mono select-none">
      {/* 3D Holographic Canvas Background */}
      <Auth3DCanvas />

      {/* Cyberpunk Scanline Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02040a]/40 via-transparent to-[#02040a]/80 pointer-events-none z-[1]" />

      {/* Top Header Bar with Transparent Defense Glass */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-cyan-500/20 backdrop-blur-xl bg-[#020611]/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <SeemadrishtiLogo className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                SEEMADRISHTI AI
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-[9px] font-bold text-cyan-300">
                AES-256 GCM
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-pink-950/60 border border-pink-500/30 text-[9px] font-bold text-pink-300">
                DEFCON 1 READY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider">
              Tactical Border Surveillance Access Terminal // Node IN-NORTH-01
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Real-time UTC / IST Telemetry */}
          <div className="hidden md:flex flex-col text-right font-mono text-[10px]">
            <span className="text-cyan-400 font-bold tracking-wider">{liveIstTime}</span>
            <span className="text-slate-500">{liveUtcTime}</span>
          </div>

          <button
            onClick={() => {
              if (onNavigateLanding) onNavigateLanding();
              else setPortal('landing');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Back to Portal</span>
          </button>
        </div>
      </header>

      {/* Main Center Auth Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl">
          {/* Main Transparent Defense Glassmorphism Card */}
          <div className="relative rounded-2xl border border-cyan-500/35 bg-[#020612]/65 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,240,255,0.12),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden transition-all duration-300">
            {/* Corner Tactical HUD Crosshairs */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

            {/* Top Scanning Laser Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_15px_#00f0ff]" />

            {/* Terminal Header */}
            <div className="p-6 sm:p-8 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                    <Fingerprint className="text-cyan-400 animate-pulse" size={16} />
                  </div>
                  <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
                    [SEC-AUTH-GATEWAY // VER 4.5]
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GATEWAY ONLINE
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {mode === 'login' ? 'OPERATOR AUTHENTICATION' : 'PERSONNEL ENROLLMENT'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Enter classified credentials or select an evaluation chip for instant tactical access.'
                  : 'Register a surveillance operator profile to gain tactical sector clearance.'}
              </p>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-xl bg-black/40 border border-cyan-500/25 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-black tracking-wider rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SIGN IN [TERMINAL]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-black tracking-wider rounded-lg transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ENROLL NEW OPERATOR
                </button>
              </div>
            </div>

            {/* Default Credentials Tactical Banner (In Login Mode) */}
            {mode === 'login' && (
              <div className="mx-6 sm:mx-8 mb-4 p-3 rounded-xl bg-cyan-950/25 border border-cyan-500/30 backdrop-blur-md flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                    <ShieldAlert size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Default Access:
                      </span>
                      <code className="text-[11px] font-black text-cyan-300 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        admin
                      </code>
                      <span className="text-slate-600">/</span>
                      <code className="text-[11px] font-black text-cyan-300 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        Admin@123
                      </code>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Major Vikram Sen &bull; Commander Level-4 Strategic Clearance
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutofillDefaultAdmin}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[10px] font-black text-cyan-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="Autofill default admin credentials"
                >
                  AUTOFILL
                </button>
              </div>
            )}

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="mx-6 sm:mx-8 mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-md shadow-xs animate-shake">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mx-6 sm:mx-8 mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 backdrop-blur-md shadow-xs">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form Body with Transparent Defense Glass Inputs */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-5 space-y-3.5">
              {mode === 'signup' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Personnel Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 w-6 h-6 rounded bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center">
                        <User size={13} className="text-cyan-400" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Inspector Rajesh Verma"
                        required
                        className="w-full pl-11 pr-3 py-2.5 bg-black/35 hover:bg-black/50 focus:bg-cyan-950/20 border border-slate-700/60 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none backdrop-blur-md transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Official Email */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Surveillance Department Email
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 w-6 h-6 rounded bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center">
                        <Mail size={13} className="text-cyan-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@seemadrishti.gov.in"
                        required
                        className="w-full pl-11 pr-3 py-2.5 bg-black/35 hover:bg-black/50 focus:bg-cyan-950/20 border border-slate-700/60 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none backdrop-blur-md transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Role Clearance Selection */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                      Designated Tactical Role & Clearance
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableRoles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer backdrop-blur-md ${
                            role === r.id
                              ? `${r.border} ${r.bg} shadow-[0_0_15px_rgba(0,240,255,0.2)]`
                              : 'border-slate-800/80 bg-black/30 hover:border-slate-700 hover:bg-black/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold ${r.text}`}>{r.code}</span>
                            {role === r.id && (
                              <CheckCircle2 size={12} className="text-cyan-400" />
                            )}
                          </div>
                          <p className="text-xs font-black text-white mt-0.5">{r.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sector & Shift Dual Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                        Assigned Sector
                      </label>
                      <div className="relative">
                        <Building2 size={13} className="absolute left-3 top-2.5 text-cyan-400" />
                        <select
                          value={assignedSector}
                          onChange={(e) => setAssignedSector(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-black/40 border border-slate-700/70 rounded-xl text-[11px] text-slate-200 outline-none focus:border-cyan-400 backdrop-blur-md"
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
                      <div className="relative">
                        <Clock size={13} className="absolute left-3 top-2.5 text-cyan-400" />
                        <select
                          value={shift}
                          onChange={(e) => setShift(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-black/40 border border-slate-700/70 rounded-xl text-[11px] text-slate-200 outline-none focus:border-cyan-400 backdrop-blur-md"
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

              {/* Username Input with Transparent Glass */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                    Operator Call-Sign / Username
                  </label>
                  {mode === 'login' && username === 'admin' && (
                    <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                      LVL-4 COMMANDER
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 w-6 h-6 rounded bg-cyan-950/50 border border-cyan-500/25 flex items-center justify-center">
                    <User size={13} className="text-cyan-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or operator"
                    required
                    autoCapitalize="none"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-2.5 bg-black/35 hover:bg-black/50 focus:bg-cyan-950/20 border border-slate-700/60 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none backdrop-blur-md transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Input with Transparent Glass */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                    Security Passphrase
                  </label>
                  {isCapsLockOn && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded animate-pulse">
                      CAPS LOCK ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 w-6 h-6 rounded bg-cyan-950/50 border border-cyan-500/25 flex items-center justify-center">
                    <Lock size={13} className="text-cyan-400" />
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
                    className="w-full pl-11 pr-11 py-2.5 bg-black/35 hover:bg-black/50 focus:bg-cyan-950/20 border border-slate-700/60 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none backdrop-blur-md transition-all font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 rounded hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-black text-xs tracking-widest flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>AUTHENTICATING SECURE NODE...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'VERIFY CREDENTIALS & ENTER'
                        : 'REGISTER PERSONNEL & ACCESS'}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Operator Preset Chips */}
            <div className="px-6 sm:px-8 py-3.5 bg-black/40 border-t border-cyan-500/20 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <KeyRound size={12} className="text-cyan-400" />
                  1-Click Demo Evaluation Chips:
                </span>
                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                  INSTANT ACCESS
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_OPERATOR_PRESETS.map((preset) => (
                  <button
                    key={preset.username}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-cyan-950/30 hover:border-cyan-500/50 text-left transition-all cursor-pointer group active:scale-95 backdrop-blur-md shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: `${preset.color}15`,
                          borderColor: `${preset.color}40`,
                          color: preset.color,
                        }}
                      >
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-slate-200 mt-1 truncate group-hover:text-white">
                      {preset.name.split(' ')[0]} {preset.name.split(' ')[1]?.[0]}.
                    </p>
                    <p className="text-[9px] text-slate-500 truncate font-mono">
                      {preset.username}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status with Modern Defense Metrics */}
      <footer className="relative z-10 py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 border-t border-cyan-500/20 backdrop-blur-xl bg-[#020611]/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>SEEMADRISHTI AI DEFENSE NETWORK &bull; CLASSIFIED DEFENSE SURVEILLANCE</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 font-mono">
          <span>LATENCY: &lt;14MS</span>
          <span>INTEGRITY: SHA-256</span>
          <span className="text-cyan-400 font-bold">VERSION 4.5.0</span>
        </div>
      </footer>
    </div>
  );
};
