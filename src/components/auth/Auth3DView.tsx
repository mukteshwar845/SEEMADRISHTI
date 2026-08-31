import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  Mail,
  Compass,
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
} from 'lucide-react';
import { useAuth, DEMO_OPERATOR_PRESETS } from '../../context/AuthContext';
import { Auth3DCanvas } from './Auth3DCanvas';
import { SeemadrishtiLogo } from '../SeemadrishtiLogo';
import confetti from 'canvas-confetti';

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

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Surveillance Operator');
  const [assignedSector, setAssignedSector] = useState('Sector Alpha - Main Gate');
  const [shift, setShift] = useState('Day Shift (0600 - 1800)');
  const [showPassword, setShowPassword] = useState(false);

  // UI status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#00f0ff', '#10b981', '#ec4899', '#38bdf8'],
      });
    } catch {
      // ignore
    }
  };

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
        triggerCelebration();
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
        triggerCelebration();
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
      triggerCelebration();
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick demo login failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#02040a] text-slate-200 flex flex-col justify-between overflow-hidden font-mono select-none">
      {/* 3D Holographic Canvas Background */}
      <Auth3DCanvas />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-cyan-500/20 backdrop-blur-md bg-black/40">
        <div className="flex items-center gap-3">
          <SeemadrishtiLogo className="w-8 h-8 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-cyan-400">
                SEEMADRISHTI AI
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[9px] font-bold text-cyan-300">
                MIL-SPEC 256-BIT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider">
              Tactical Border Surveillance Access Terminal
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (onNavigateLanding) onNavigateLanding();
            else setPortal('landing');
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Portal</span>
        </button>
      </header>

      {/* Main Center Auth Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          {/* Main Glassmorphic Card */}
          <div className="relative rounded-2xl border border-cyan-500/30 bg-[#030914]/85 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden transition-all duration-300">
            {/* Top Scanning Laser Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

            {/* Terminal Header */}
            <div className="p-6 sm:p-8 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Fingerprint className="text-cyan-400 animate-pulse" size={24} />
                  <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
                    [SEC-AUTH-GATEWAY // NODE 01]
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
                {mode === 'login' ? 'OPERATOR AUTHENTICATION' : 'PERSONNEL ENROLLMENT'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Enter security credentials or tap a clearance chip for rapid verification.'
                  : 'Register a surveillance operator profile to gain sector clearance.'}
              </p>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 mt-5 p-1 rounded-xl bg-black/60 border border-cyan-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-black tracking-wider rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.5)]'
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
                      ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ENROLL NEW OPERATOR
                </button>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="mx-6 sm:mx-8 mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mx-6 sm:mx-8 mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-6 space-y-4">
              {mode === 'signup' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1.5">
                      Personnel Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-3 text-cyan-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Inspector R. K. Verma"
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Official Email */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1.5">
                      Surveillance Department Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-3 text-cyan-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@seemadrishti.gov.in"
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Clearance Selection */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1.5">
                      Designated Tactical Role & Clearance
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableRoles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            role === r.id
                              ? `${r.border} ${r.bg} shadow-[0_0_10px_rgba(0,240,255,0.2)]`
                              : 'border-slate-800 bg-black/40 hover:border-slate-700'
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
                          className="w-full pl-8 pr-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-[11px] text-slate-200 outline-none focus:border-cyan-400"
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
                          className="w-full pl-8 pr-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-[11px] text-slate-200 outline-none focus:border-cyan-400"
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

              {/* Username Input */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1.5">
                  Operator Call-Sign / Username
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-cyan-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or operator"
                    required
                    autoCapitalize="none"
                    className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1.5">
                  Security Passphrase
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-cyan-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-black/50 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-cyan-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-cyan-600 hover:to-cyan-500 text-black font-black text-xs tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
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
                        ? 'VERIFY CREDENTIALS & ENTER'
                        : 'REGISTER PERSONNEL & ACCESS'}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Operator Preset Chips */}
            <div className="px-6 sm:px-8 py-4 bg-black/50 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <KeyRound size={12} className="text-cyan-400" />
                  1-Click Demo Evaluation Chips:
                </span>
                <span className="text-[9px] text-cyan-400">INSTANT ACCESS</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_OPERATOR_PRESETS.map((preset) => (
                  <button
                    key={preset.username}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-cyan-950/40 hover:border-cyan-500/40 text-left transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded"
                        style={{
                          backgroundColor: `${preset.color}20`,
                          color: preset.color,
                        }}
                      >
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 mt-1 truncate group-hover:text-white">
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

      {/* Footer Status */}
      <footer className="relative z-10 py-3 px-6 text-center text-[10px] text-slate-500 border-t border-slate-900 backdrop-blur-md bg-black/40">
        SEEMADRISHTI AI DEFENSE NETWORK &bull; CLASSIFIED DEFENSE SURVEILLANCE &bull; VERSION 4.2.0
      </footer>
    </div>
  );
};
