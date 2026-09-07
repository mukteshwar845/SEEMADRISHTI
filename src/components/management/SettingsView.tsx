import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Palette,
  Key,
  HelpCircle,
  Lock,
  Unlock,
  Fingerprint,
  EyeOff,
  Monitor,
  CheckCircle,
  AlertCircle,
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Music,
  User,
  LogOut,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  Clock,
  ShieldAlert,
  Terminal,
  Type,
  Radio,
  Activity,
  Cpu,
  Check,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  Zap,
  Layers,
  Flame,
  Crosshair,
} from 'lucide-react';
import {
  useTheme,
  AppTheme,
  AccentColor,
  FontFamily,
  TextColorCombo,
  FontScale,
  ACCENT_COLOR_MAP,
  FONT_FAMILY_MAP,
  TEXT_COMBO_MAP,
} from '../../context/ThemeContext';
import { useSecurity } from '../../context/SecurityContext';
import { useAuth } from '../../context/AuthContext';
import {
  audioAlertEngine,
  AVAILABLE_ALERT_TONES,
  AlertToneType,
} from '../../utils/audioAlert';
import { DefconLevel } from '../../types';
import { TacticalTerminalView } from '../terminal/TacticalTerminalView';
import { Tactical3DCard } from '../common/Tactical3DCard';

export interface SettingsViewProps {
  anomalySensitivity?: number;
  onAnomalySensitivityChange?: (val: number) => void;
  trajectoryDataset?: string;
  onTrajectoryDatasetChange?: (val: string) => void;
  showTrajectoryVectors?: boolean;
  onToggleTrajectoryVectors?: (val: boolean) => void;
  isAudioMuted?: boolean;
  onToggleAudioMute?: () => void;
  audioVolume?: number;
  onAudioVolumeChange?: (val: number) => void;
  onSetDefcon?: (level: DefconLevel) => void;
  currentDefcon?: DefconLevel;
}

type SettingsTab = 'security' | 'appearance' | 'account' | 'surveillance' | 'help';

export const SettingsView: React.FC<SettingsViewProps> = ({
  anomalySensitivity = 78,
  onAnomalySensitivityChange,
  trajectoryDataset = 'TU Clausthal Pedestrian Trajectory Dataset (ETH/UCY Stream)',
  onTrajectoryDatasetChange,
  showTrajectoryVectors = true,
  onToggleTrajectoryVectors,
  isAudioMuted = false,
  onToggleAudioMute,
  audioVolume = 85,
  onAudioVolumeChange,
  onSetDefcon,
  currentDefcon = 4,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  const [helpSubTab, setHelpSubTab] = useState<'defcon' | 'terminal' | 'manuals'>('defcon');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    thermal_calib: true,
    homography_locked: true,
    radio_silence: false,
    siren_test: true,
    drone_standby: false,
    qrf_vector_cleared: true,
  });

  // Theme & Appearance Context
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    fontFamily,
    setFontFamily,
    textColorCombo,
    setTextColorCombo,
    fontScale,
    setFontScale,
    resetAppearanceDefaults,
    isDaylight,
  } = useTheme();

  // Security Context
  const {
    pinLockEnabled,
    setPinLockEnabled,
    hasPinSet,
    biometricEnabled,
    setBiometricEnabled,
    hideSensitiveData,
    setHideSensitiveData,
    screenshotProtection,
    setScreenshotProtection,
    twoStepVerification,
    setTwoStepVerification,
    autoLockMinutes,
    setAutoLockMinutes,
    lockNow,
    setIsPinModalOpen,
  } = useSecurity();

  // Auth Context
  const { user, updateProfile, logout } = useAuth();

  // Account Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileShift, setProfileShift] = useState(user?.shift || 'Day Shift (0600 - 1800)');
  const [profileSector, setProfileSector] = useState(user?.assigned_sector || 'Sector Alpha - Main Gate');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Surveillance & Audio Alert States
  const [localSensitivity, setLocalSensitivity] = useState(anomalySensitivity);
  const [localDataset, setLocalDataset] = useState(trajectoryDataset);
  const [selectedTone, setSelectedTone] = useState<AlertToneType>(() => audioAlertEngine.getActiveTone());
  const [minSeverity, setMinSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>(() => audioAlertEngine.getMinimumSeverity());
  const [intrusionConfidenceThreshold, setIntrusionConfidenceThreshold] = useState(() => audioAlertEngine.getConfidenceThreshold());
  const [repeatCount, setRepeatCount] = useState<number>(() => audioAlertEngine.getRepeatCount());
  const [localAudioMuted, setLocalAudioMuted] = useState(isAudioMuted || audioAlertEngine.getIsMuted());
  const [localAudioVolume, setLocalAudioVolume] = useState(Math.round(audioAlertEngine.getVolume() * 100));
  const [activePlayingTone, setActivePlayingTone] = useState<AlertToneType | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Subscribe to audio engine preview status
  useEffect(() => {
    const unsub = audioAlertEngine.subscribe((isPlaying, _conf, tone) => {
      setActivePlayingTone(isPlaying ? tone || selectedTone : null);
    });
    return unsub;
  }, [selectedTone]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      await updateProfile({
        name: profileName,
        email: profileEmail,
        shift: profileShift,
        assigned_sector: profileSector,
        password: profilePassword ? profilePassword : undefined,
      });
      setProfileSuccess(true);
      setProfilePassword('');
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  const handleSurveillanceSave = () => {
    if (onAnomalySensitivityChange) onAnomalySensitivityChange(localSensitivity);
    if (onTrajectoryDatasetChange) onTrajectoryDatasetChange(localDataset);
    if (onAudioVolumeChange) onAudioVolumeChange(localAudioVolume);
    audioAlertEngine.setActiveTone(selectedTone);
    audioAlertEngine.setMinimumSeverity(minSeverity);
    audioAlertEngine.setConfidenceThreshold(intrusionConfidenceThreshold);
    audioAlertEngine.setRepeatCount(repeatCount);
    audioAlertEngine.setVolume(localAudioVolume);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.cyan;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono pb-14 select-none relative" id="settings-view-root">
      {/* Dynamic Background Volumetric Glow Orbs & Grid to Maximize Glass Refraction */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-cyan-500/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[110px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#00f0ff12_1px,transparent_1px)] [background-size:28px_28px] opacity-75" />
      </div>

      {/* Top Translucent Glass Header Banner */}
      <div className="tactical-glass-card rounded-3xl p-6 sm:p-7 relative overflow-hidden">
        {/* Specular Light Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.08] via-transparent to-white/[0.14] pointer-events-none" />
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_#00f0ff] absolute top-0 left-0" />

        {/* Tactical Corner Reticles */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none drop-shadow-[0_0_8px_#00f0ff]" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.4)] backdrop-blur-xl shrink-0">
              <Settings size={26} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-widest font-mono drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                  SYSTEM CONFIGURATION & OPERATIONAL ROE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 text-[9px] font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                  CYBERNETIC GLASS
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed">
                Cryptographic device lockdown &bull; 5 Command HUD themes &bull; Web audio synthesizer &bull; DEFCON protocols
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl tactical-glass-subpanel text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>CLEARANCE: LEVEL 5 (HQ COMMAND)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Translucent Glass Navigation Pill Matrix */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl tactical-glass-subpanel shadow-2xl relative z-10">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-gradient-to-r from-cyan-500/35 to-blue-500/30 text-cyan-300 border border-cyan-400/70 shadow-[0_0_25px_rgba(0,240,255,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Shield size={15} className={activeTab === 'security' ? 'text-cyan-300 drop-shadow-[0_0_8px_#00f0ff]' : 'text-cyan-400'} />
          <span>Privacy & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-gradient-to-r from-pink-500/35 to-purple-500/30 text-pink-300 border border-pink-400/70 shadow-[0_0_25px_rgba(244,63,94,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Palette size={15} className={activeTab === 'appearance' ? 'text-pink-300 drop-shadow-[0_0_8px_#f43f5e]' : 'text-pink-400'} />
          <span>Appearance & Themes</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'account'
              ? 'bg-gradient-to-r from-amber-500/35 to-orange-500/30 text-amber-300 border border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Key size={15} className={activeTab === 'account' ? 'text-amber-300 drop-shadow-[0_0_8px_#f59e0b]' : 'text-amber-400'} />
          <span>Account & Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('surveillance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'surveillance'
              ? 'bg-gradient-to-r from-emerald-500/35 to-teal-500/30 text-emerald-300 border border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Sliders size={15} className={activeTab === 'surveillance' ? 'text-emerald-300 drop-shadow-[0_0_8px_#10b981]' : 'text-emerald-400'} />
          <span>Surveillance & Audio</span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'help'
              ? 'bg-gradient-to-r from-blue-500/35 to-indigo-500/30 text-blue-300 border border-blue-400/70 shadow-[0_0_25px_rgba(59,130,246,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <HelpCircle size={15} className={activeTab === 'help' ? 'text-blue-300 drop-shadow-[0_0_8px_#3b82f6]' : 'text-blue-400'} />
          <span>Help & Support</span>
        </button>
      </div>

      {/* TAB 1: PRIVACY & SECURITY (TRANSLUCENT GLASS) */}
      {activeTab === 'security' && (
        <div className="tactical-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-white/[0.12] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Shield size={18} className="text-cyan-400" />
                <span>Device Lockdown & Data Protection Protocols</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                Cryptographic 6-digit PIN enforcement, biometric gates, and screen-sharing intelligence redaction
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl tactical-glass-subpanel text-[10px] text-cyan-300 font-bold">
              ARMED
            </span>
          </div>

          <div className="divide-y divide-white/[0.08]">
            {/* 1. App PIN Lock */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.2)] shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">App PIN Lock (Military 6-Digit)</h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    {hasPinSet
                      ? "A 6-digit military PIN is active. Encrypted locally with salted cryptographic hashing."
                      : 'Set a 6-digit military clearance security PIN to lock unauthorized operators.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {pinLockEnabled && (
                  <button
                    onClick={() => setIsPinModalOpen(true)}
                    className="text-xs font-bold text-cyan-300 hover:text-white hover:underline transition-colors cursor-pointer"
                  >
                    Change PIN
                  </button>
                )}
                {/* Frosted Glass Toggle */}
                <button
                  type="button"
                  onClick={() => setPinLockEnabled(!pinLockEnabled)}
                  className={`w-14 h-8 rounded-full p-1 transition-all relative cursor-pointer ${
                    pinLockEnabled ? 'tactical-glass-toggle-active' : 'tactical-glass-toggle-inactive'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white transition-transform transform shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                      pinLockEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 2. Biometric Unlock */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)] shrink-0">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Biometric Clearance</h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    Fast fingerprint or optical facial sensor authentication bypass for rapid incident response
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBiometricEnabled(!biometricEnabled)}
                className={`w-14 h-8 rounded-full p-1 transition-all relative cursor-pointer ${
                  biometricEnabled ? 'tactical-glass-toggle-active' : 'tactical-glass-toggle-inactive'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-transform transform shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                    biometricEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Hide Sensitive Data */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                  <EyeOff size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Redact GPS & Classified Telemetry</h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    Blur exact GPS border coordinates, suspect identity hashes and trajectory angles during briefings
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHideSensitiveData(!hideSensitiveData)}
                className={`w-14 h-8 rounded-full p-1 transition-all relative cursor-pointer ${
                  hideSensitiveData ? 'tactical-glass-toggle-active' : 'tactical-glass-toggle-inactive'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-transform transform shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                    hideSensitiveData ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Screenshot Protection */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)] shrink-0">
                  <Monitor size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">Screen Capture Anti-Leak Cloak</h3>
                    <Info size={13} className="text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    Obscure tactical video feeds when the window is minimized, screen-shared or recorded
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScreenshotProtection(!screenshotProtection)}
                className={`w-14 h-8 rounded-full p-1 transition-all relative cursor-pointer ${
                  screenshotProtection ? 'tactical-glass-toggle-active' : 'tactical-glass-toggle-inactive'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-transform transform shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                    screenshotProtection ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 5. Two-Step Verification */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Two-Step Cryptographic Token</h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    Require physical hardware YubiKey or TOTP authenticator code on new browser login
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTwoStepVerification(!twoStepVerification)}
                className={`w-14 h-8 rounded-full p-1 transition-all relative cursor-pointer ${
                  twoStepVerification ? 'tactical-glass-toggle-active' : 'tactical-glass-toggle-inactive'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-transform transform shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                    twoStepVerification ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className="pt-6 border-t border-white/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-200 font-bold">Auto-lock Terminal After:</span>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className="tactical-glass-input text-cyan-300 text-xs rounded-xl px-3.5 py-2 font-bold outline-none cursor-pointer focus:border-cyan-400"
              >
                <option value={1}>1 Minute</option>
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={0}>Never (Armed Standby)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={lockNow}
              className="tactical-btn-3d flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-800/90 hover:from-slate-800 hover:to-slate-700 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 text-xs font-black transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              <Lock size={15} className="text-cyan-400" />
              <span>ENGAGE LOCK NOW</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: APPEARANCE & THEMES (3D GLASS OVERHAUL) */}
      {activeTab === 'appearance' && (
        <div className="tactical-glass-card rounded-3xl p-6 sm:p-8 space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.12]">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Palette size={18} className="text-pink-400" />
                <span>Tactical Interface Cybernetics & Themes</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                5 Specialized combat HUD styles, phosphor color combinations, and military monospace typography
              </p>
            </div>

            <button
              onClick={resetAppearanceDefaults}
              className="tactical-btn-3d flex items-center gap-1.5 px-4 py-2 rounded-xl tactical-glass-subpanel hover:border-white/40 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* 1. Base App Theme Profiles */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} />
              <span>1. Base Command HUD Profiles (5 Profiles)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                { id: 'military-matrix', name: 'Military Matrix', desc: 'Tactical cyan zero-line grid & radar HUD', bg: '#02040a', border: '#00f0ff' },
                { id: 'daylight-field', name: 'Daylight Field', desc: 'Sunlight readable high-contrast field display', bg: '#f8fafc', border: '#0284c7' },
                { id: 'midnight-cyber', name: 'Midnight Cyber', desc: 'Deep indigo sci-fi reconnaissance mood', bg: '#030712', border: '#6366f1' },
                { id: 'obsidian-stealth', name: 'Obsidian Stealth', desc: 'Pure OLED black for night stealth operations', bg: '#000000', border: '#ffffff' },
                { id: 'emerald-ops', name: 'Emerald Ops', desc: 'Night-vision phosphor HUD aesthetic', bg: '#021009', border: '#10b981' },
              ].map((t) => {
                const isSelected = theme === t.id;
                return (
                  <Tactical3DCard
                    key={t.id}
                    maxTilt={12}
                    scale={1.025}
                    onClick={() => setTheme(t.id as AppTheme)}
                    className={`p-4 rounded-2xl cursor-pointer ${
                      isSelected
                        ? 'tactical-glass-card border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.4)] ring-1 ring-cyan-400'
                        : 'tactical-glass-subpanel hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        {t.name}
                      </span>
                      <div
                        className="w-4 h-4 rounded-full border border-white/50 shadow-sm"
                        style={{ backgroundColor: t.border }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono leading-relaxed">{t.desc}</p>
                  </Tactical3DCard>
                );
              })}
            </div>
          </div>

          {/* 2. Tactical Accent Color Palette */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
              <span>2. Tactical Accent Lighting</span>
              <span className="text-xs text-slate-300 font-mono">
                Active: <span style={{ color: activeAccent.hex }} className="font-black">{activeAccent.label}</span>
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(Object.keys(ACCENT_COLOR_MAP) as AccentColor[]).map((key) => {
                const item = ACCENT_COLOR_MAP[key];
                const isSelected = accentColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAccentColor(key)}
                    className={`p-3.5 rounded-2xl flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'tactical-glass-card border-white shadow-[0_0_25px_rgba(255,255,255,0.35)] scale-105'
                        : 'tactical-glass-subpanel hover:border-white/30'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl shadow-md flex items-center justify-center transition-transform"
                      style={{ backgroundColor: item.hex, boxShadow: item.glow }}
                    >
                      {isSelected && <CheckCircle size={17} className="text-black stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-bold text-slate-200">{item.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Typography & Font Family */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Type size={14} className="text-cyan-400" />
              <span>3. Telemetry Monospace Typography</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(FONT_FAMILY_MAP) as FontFamily[]).map((fontKey) => {
                const font = FONT_FAMILY_MAP[fontKey];
                const isSelected = fontFamily === fontKey;
                return (
                  <div
                    key={fontKey}
                    onClick={() => setFontFamily(fontKey)}
                    className={`p-4 rounded-2xl cursor-pointer flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'tactical-glass-card border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.35)]'
                        : 'tactical-glass-subpanel hover:border-white/30'
                    }`}
                    style={{ fontFamily: font.css }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{font.label}</span>
                      <span className="text-[10px] text-cyan-300/70">{font.category}</span>
                    </div>
                    <p className="text-[11px] text-cyan-300/90 mt-2">
                      SYS:// 108.45.19 &bull; LAT 32.7157° N &bull; LON 74.8560° E
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Font Scaling */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider">
              4. Global Interface Scaling
            </label>
            <div className="flex items-center gap-3">
              {[
                { id: 'compact', label: 'Compact (92%)' },
                { id: 'standard', label: 'Standard (100%)' },
                { id: 'large', label: 'Enhanced Field (108%)' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFontScale(s.id as FontScale)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    fontScale === s.id
                      ? 'tactical-glass-card border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.35)]'
                      : 'tactical-glass-subpanel text-slate-300 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT & PROFILE SETUP (TRANSLUCENT GLASS) */}
      {activeTab === 'account' && (
        <div className="tactical-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-white/[0.12]">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Key size={18} className="text-amber-400" />
              <span>Operator Clearance & Credentials Configuration</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              Manage operator ID, command email, border sector clearance and session encryption keys
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3.5 bg-emerald-950/70 border border-emerald-400/60 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-xl">
              <CheckCircle size={16} />
              <span>Operator credentials and tactical sector profile successfully encrypted and saved.</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-400/60 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold shadow-[0_0_20px_rgba(244,63,94,0.35)] backdrop-blur-xl">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Operator Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl tactical-glass-input text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Official Defense / Gov Email
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl tactical-glass-input text-white text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Assigned Border Sector Clearance
                </label>
                <select
                  value={profileSector}
                  onChange={(e) => setProfileSector(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl tactical-glass-input text-cyan-300 text-xs font-mono outline-none cursor-pointer"
                >
                  <option value="All Border Sectors (HQ)">All Border Sectors (HQ Command)</option>
                  <option value="Sector Alpha - Main Gate">Sector Alpha - Main Gate</option>
                  <option value="Sector Bravo - Exclusion Fence">Sector Bravo - Exclusion Fence</option>
                  <option value="Sector Charlie - Vehicle Checkpoint">Sector Charlie - Vehicle Checkpoint</option>
                  <option value="Sector Delta - Tactical Outpost 4">Sector Delta - Tactical Outpost 4</option>
                  <option value="Sector Echo - Dense Forest Canopy">Sector Echo - Dense Forest Canopy</option>
                  <option value="Sector Foxtrot - Mountain Ridge Pass">Sector Foxtrot - Mountain Ridge Pass</option>
                  <option value="Sector Golf - Desert Perimeter">Sector Golf - Desert Perimeter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Operational Watch Shift
                </label>
                <select
                  value={profileShift}
                  onChange={(e) => setProfileShift(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl tactical-glass-input text-cyan-300 text-xs font-mono outline-none cursor-pointer"
                >
                  <option value="Day Shift (0600 - 1800)">Day Shift (0600 - 1800)</option>
                  <option value="Night Shift (1800 - 0600)">Night Shift (1800 - 0600)</option>
                  <option value="24/7 Command Standby">24/7 Command Standby</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Update Tactical Master Passphrase (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to maintain existing passphrase"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl tactical-glass-input text-white text-xs font-mono outline-none"
              />
            </div>

            <div className="pt-4 border-t border-white/[0.12] flex items-center justify-between">
              <button
                type="button"
                id="settings-logout-btn"
                onClick={logout}
                className="tactical-btn-3d flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/50 text-rose-300 hover:bg-rose-950/50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <LogOut size={14} />
                <span>TERMINATE SESSION</span>
              </button>

              <button
                type="submit"
                className="tactical-btn-3d flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all cursor-pointer"
              >
                <Save size={14} />
                <span>SAVE CREDENTIALS</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SURVEILLANCE AI & AUDIO SYNTHESIZER (TRANSLUCENT GLASS) */}
      {activeTab === 'surveillance' && (
        <div className="space-y-6">
          {/* Glass Audio Synthesizer Deck */}
          <div className="tactical-glass-card rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2.5 text-sm font-bold text-white uppercase">
                <Volume2 size={20} className={`text-cyan-400 ${activePlayingTone ? 'animate-bounce' : ''}`} />
                <span>Real-Time Web Audio Synthesizer Engine</span>
                <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                  LOW-LATENCY OSCILLATOR
                </span>
              </div>

              {/* Animated Waveform Equalizer when playing */}
              {activePlayingTone && (
                <div className="flex items-center gap-1.5 px-3 py-1 tactical-glass-subpanel rounded-xl">
                  {[4, 14, 8, 18, 12, 16, 6, 20, 14, 10, 16, 8].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_6px_#00f0ff]"
                      style={{ height: `${h}px`, animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                  <span className="text-[10px] text-cyan-300 font-bold ml-1">PLAYING</span>
                </div>
              )}
            </div>

            {/* Master Audio Toolbar */}
            <div className="p-4 rounded-2xl tactical-glass-subpanel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => {
                    const next = !localAudioMuted;
                    setLocalAudioMuted(next);
                    audioAlertEngine.setMuted(next);
                    if (onToggleAudioMute) onToggleAudioMute();
                  }}
                  className={`p-3 rounded-2xl transition-all cursor-pointer ${
                    localAudioMuted
                      ? 'tactical-glass-subpanel text-slate-500'
                      : 'tactical-glass-card border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                  }`}
                  title={localAudioMuted ? 'Unmute Audio Alert System' : 'Mute Audio Alert System'}
                >
                  {localAudioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    {localAudioMuted ? 'ACOUSTIC ALARMS: MUTED (SILENT OPERATOR MODE)' : 'ACOUSTIC ALARMS: ARMED & ACTIVE'}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    Synthesizes immediate acoustic alert beacons on critical perimeter breaches
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-40">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={localAudioVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLocalAudioVolume(val);
                      audioAlertEngine.setVolume(val);
                      if (onAudioVolumeChange) onAudioVolumeChange(val);
                    }}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-500/40"
                  />
                  <span className="text-xs font-mono font-black text-cyan-300 w-10 text-right">
                    {localAudioVolume}%
                  </span>
                </div>

                <button
                  onClick={() => audioAlertEngine.playTonePreview(selectedTone)}
                  className="tactical-btn-3d flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_20px_rgba(0,240,255,0.5)] cursor-pointer"
                >
                  <Play size={13} className="fill-current" />
                  <span>TEST TONE</span>
                </button>
              </div>
            </div>

            {/* Tone Selection 3D Glass Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_ALERT_TONES.map((tone) => {
                const isSelected = selectedTone === tone.id;
                return (
                  <Tactical3DCard
                    key={tone.id}
                    maxTilt={10}
                    scale={1.02}
                    onClick={() => {
                      setSelectedTone(tone.id);
                      audioAlertEngine.setActiveTone(tone.id);
                    }}
                    className={`p-4 rounded-2xl cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'tactical-glass-card border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)] ring-1 ring-cyan-400'
                        : 'tactical-glass-subpanel hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-100'}`}>
                        {tone.name}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full tactical-glass-subpanel text-slate-300 font-bold">
                        {tone.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">{tone.description}</p>
                  </Tactical3DCard>
                );
              })}
            </div>
          </div>

          {/* Anomaly Detection Sensitivity Glass Slider */}
          <div className="tactical-glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Neural Anomaly Detection & Trajectory Sensitivity
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Threshold: <span className="text-cyan-400 font-black">{localSensitivity}%</span> (Higher = flags subtle kinematics deviations)
                </p>
              </div>
              <button
                onClick={handleSurveillanceSave}
                className="tactical-btn-3d px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer"
              >
                {savedSuccess ? 'SAVED ✓' : 'SAVE THRESHOLDS'}
              </button>
            </div>

            <input
              type="range"
              min={10}
              max={100}
              value={localSensitivity}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLocalSensitivity(val);
                if (onAnomalySensitivityChange) onAnomalySensitivityChange(val);
              }}
              className="w-full h-3 bg-slate-950/80 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/15 shadow-inner"
            />
          </div>
        </div>
      )}

      {/* TAB 5: HELP, DEFCON PROTOCOLS & CLI (TRANSLUCENT GLASS) */}
      {activeTab === 'help' && (
        <div className="tactical-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/[0.12] gap-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <HelpCircle size={18} className="text-cyan-400" />
                <span>Operational Protocols & Embedded Tactical Node CLI</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                DEFCON Rules of Engagement (ROE), border verification checklists, and edge node CLI
              </p>
            </div>

            {/* Sub-tab Glass Switcher */}
            <div className="flex items-center gap-1.5 p-1 tactical-glass-subpanel rounded-2xl">
              <button
                type="button"
                onClick={() => setHelpSubTab('defcon')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  helpSubTab === 'defcon'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldAlert size={14} />
                <span>DEFCON ROE</span>
              </button>
              <button
                type="button"
                onClick={() => setHelpSubTab('terminal')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  helpSubTab === 'terminal'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Terminal size={14} />
                <span>Edge CLI</span>
              </button>
              <button
                type="button"
                onClick={() => setHelpSubTab('manuals')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  helpSubTab === 'manuals'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookOpen size={14} />
                <span>Field SOP</span>
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: DEFCON PROTOCOLS & ROE */}
          {helpSubTab === 'defcon' && (
            <div className="space-y-6">
              {/* DEFCON Level 3D Glass Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  {
                    level: 5 as DefconLevel,
                    title: 'DEFCON 5',
                    tag: 'PEACETIME NORMAL',
                    color: 'border-emerald-400/40 text-emerald-400',
                    activeRing: 'ring-2 ring-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]',
                    desc: 'Standard peacetime monitoring. 15 FPS neural inference.',
                  },
                  {
                    level: 4 as DefconLevel,
                    title: 'DEFCON 4',
                    tag: 'ACTIVE DEFENSE',
                    color: 'border-cyan-400/40 text-cyan-400',
                    activeRing: 'ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.5)]',
                    desc: 'Active defense posture. Cross-camera ReID and multi-agent consensus active.',
                  },
                  {
                    level: 3 as DefconLevel,
                    title: 'DEFCON 3',
                    tag: 'INCREASED READINESS',
                    color: 'border-amber-400/40 text-amber-400',
                    activeRing: 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]',
                    desc: 'Perimeter anomaly flagged. QRF units on 3-min standby.',
                  },
                  {
                    level: 2 as DefconLevel,
                    title: 'DEFCON 2',
                    tag: 'INCURSION IMMINENT',
                    color: 'border-orange-400/40 text-orange-400',
                    activeRing: 'ring-2 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]',
                    desc: 'Zero-line proximity warning (<50m). Automated sirens primed.',
                  },
                  {
                    level: 1 as DefconLevel,
                    title: 'DEFCON 1',
                    tag: 'MAXIMUM READINESS',
                    color: 'border-rose-400/50 text-rose-400 animate-pulse',
                    activeRing: 'ring-2 ring-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.7)]',
                    desc: 'Critical wire breach detected. Immediate QRF dispatch & acoustic alarm.',
                  },
                ].map((def) => {
                  const isActive = currentDefcon === def.level;
                  return (
                    <Tactical3DCard
                      key={def.level}
                      maxTilt={10}
                      scale={1.025}
                      onClick={() => onSetDefcon?.(def.level)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all tactical-glass-subpanel ${
                        isActive ? `${def.activeRing} ${def.color}` : `${def.color} opacity-75 hover:opacity-100`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black tracking-wider uppercase">{def.title}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono font-bold tracking-tight text-white mb-2">
                        {def.tag}
                      </div>
                      <p className="text-[11px] text-slate-200 leading-snug font-mono">
                        {def.desc}
                      </p>
                    </Tactical3DCard>
                  );
                })}
              </div>

              {/* ROE & Operational Readiness Glass Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl tactical-glass-subpanel space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Rules of Engagement (ROE) Protocols
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 uppercase bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-400/50 font-bold">
                      DEFCON {currentDefcon} ACTIVE
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between p-2.5 rounded-xl tactical-glass-card">
                      <span className="text-slate-300">Zero-Line Crossing:</span>
                      <span className="font-bold text-rose-400">
                        {currentDefcon <= 2 ? 'Auto-Interdict / Siren Engage' : 'Real-time Vector Tracking & Flag'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl tactical-glass-card">
                      <span className="text-slate-300">Edge Inference Rate:</span>
                      <span className="font-bold text-emerald-400">
                        {currentDefcon === 1 ? 'Continuous 60 FPS / Deep ReID' : 'Standard 30 FPS Adaptive Loop'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl tactical-glass-card">
                      <span className="text-slate-300">QRF Response Vector:</span>
                      <span className="font-bold text-amber-400">
                        {currentDefcon === 1
                          ? 'Immediate Airborne / Tactical Intercept'
                          : currentDefcon <= 3
                          ? 'Perimeter Standby (Vector BP-103)'
                          : 'Standard Base Patrol Rotation'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => audioAlertEngine.playTone('klaxon_pulse')}
                      className="tactical-btn-3d flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/50 text-rose-300 text-xs font-bold cursor-pointer transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    >
                      <Zap size={14} className="text-rose-400" />
                      <span>TEST TACTICAL SIREN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetDefcon?.(1)}
                      className="tactical-btn-3d flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/50 text-amber-300 text-xs font-bold cursor-pointer transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span>ENGAGE DEFCON 1</span>
                    </button>
                  </div>
                </div>

                {/* Operational Readiness Checklist */}
                <div className="p-5 rounded-2xl tactical-glass-subpanel space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-amber-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Operational Readiness Checklist
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 font-bold">
                      {Object.values(checklist).filter(Boolean).length}/6 VERIFIED
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'thermal_calib', label: 'Thermal Sensor Calibration (FLIR MWIR Locked)' },
                      { id: 'homography_locked', label: 'Zero-Line Homography Matrix (Cam 01-09)' },
                      { id: 'radio_silence', label: 'Mesh Encryption Active (ChaCha20-Poly1305)' },
                      { id: 'siren_test', label: 'High-Decibel Perimeter Siren Array Operational' },
                      { id: 'drone_standby', label: 'Autonomous Aerial Sentry Drone on Launch Rail' },
                      { id: 'qrf_vector_cleared', label: 'QRF Rapid Ingress Route BP-104 Cleared' },
                    ].map((item) => {
                      const checked = checklist[item.id] ?? false;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setChecklist((prev) => ({ ...prev, [item.id]: !checked }))}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            checked
                              ? 'tactical-glass-card border-cyan-400/60 text-slate-100 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                              : 'tactical-glass-subpanel text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              checked ? 'bg-cyan-400 border-cyan-300 text-black shadow-[0_0_10px_#00f0ff]' : 'border-slate-700 bg-black/40'
                            }`}
                          >
                            {checked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-xs font-medium font-mono">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: EMBEDDED TACTICAL TERMINAL */}
          {helpSubTab === 'terminal' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
                  <Terminal size={14} />
                  <span>EMBEDDED EDGE INFERENCE NODE CLI (PORT 8000)</span>
                </span>
                <span className="text-slate-400">Type <code className="text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40">help</code> to list commands</span>
              </div>
              <div className="rounded-3xl overflow-hidden border border-white/20 shadow-2xl tactical-glass-card">
                <TacticalTerminalView embedded={true} onSetDefcon={onSetDefcon} currentDefcon={currentDefcon} />
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: FIELD SOP & DIRECTORY */}
          {helpSubTab === 'manuals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl tactical-glass-subpanel space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={14} />
                  <span>Edge Node IP & Gateway Directory</span>
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between p-2.5 rounded-xl tactical-glass-card">
                    <span className="text-slate-300">Node API Gateway:</span>
                    <span className="text-white font-bold">http://localhost:3000</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl tactical-glass-card">
                    <span className="text-slate-300">Python CV Worker (YOLOv11):</span>
                    <span className="text-cyan-300 font-bold">Internal IPC / Port 8000</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl tactical-glass-card">
                    <span className="text-slate-300">Tactical Ingress Socket:</span>
                    <span className="text-emerald-300 font-bold">ws://localhost:3000/ws/alerts</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl tactical-glass-card">
                    <span className="text-slate-300">RTSP Video Proxy:</span>
                    <span className="text-amber-300 font-bold">rtsp://edge-node:8554/live/cam01</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl tactical-glass-subpanel space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Radio size={14} />
                  <span>3D Homography Ground-Plane Projection</span>
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed font-mono">
                  SEEMADRISHTI calculates 3D ground coordinates using direct planar homography ($H$) mapped to GPS zero-line coordinates.
                </p>
                <div className="p-3.5 rounded-xl tactical-glass-card font-mono text-[11px] text-cyan-300 space-y-1 shadow-inner">
                  <div>[X_geo, Y_geo, 1]^T = H * [u_px, v_px, 1]^T</div>
                  <div className="text-slate-400 text-[10px] mt-1">
                    Calibrated across 9 edge sectors with 4-point survey markers along border fence.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
