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
} from '../context/ThemeContext';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import {
  audioAlertEngine,
  AVAILABLE_ALERT_TONES,
  AlertToneType,
} from '../utils/audioAlert';

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
}) => {
  // Navigation Tabs matching reference screenshot
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');

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
    <div className="space-y-6 max-w-5xl mx-auto font-mono pb-12" id="settings-view-root">
      {/* Reference Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#090e1a] border border-slate-800 shadow-lg">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Shield size={15} className="text-cyan-400" />
          <span>Privacy & security</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Palette size={15} className="text-pink-400" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'account'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Key size={15} className="text-amber-400" />
          <span>Account & Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('surveillance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'surveillance'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Sliders size={15} className="text-emerald-400" />
          <span>Surveillance & Audio</span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'help'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <HelpCircle size={15} className="text-blue-400" />
          <span>Help & support</span>
        </button>
      </div>

      {/* TAB 1: PRIVACY & SECURITY (EXACTLY MATCHING USER SCREENSHOT) */}
      {activeTab === 'security' && (
        <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Device protection</h2>
            <p className="text-xs text-slate-400 mt-1">Applies to this browser or device</p>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* 1. App PIN Lock */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 mt-0.5">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">App PIN lock</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasPinSet
                      ? "A 6-digit PIN is set. It's stored only as a salted hash."
                      : 'Set a 6-digit military clearance security PIN to protect the terminal.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {pinLockEnabled && (
                  <button
                    onClick={() => setIsPinModalOpen(true)}
                    className="text-xs font-bold text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                )}
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setPinLockEnabled(!pinLockEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    pinLockEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                      pinLockEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 2. Biometric unlock */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 mt-0.5">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Biometric unlock</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Use fingerprint or face unlock as a faster path through the PIN lock
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBiometricEnabled(!biometricEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  biometricEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                    biometricEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 3. Hide sensitive data */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 mt-0.5">
                  <EyeOff size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hide sensitive data</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Blur GPS coordinates, target IDs, predictions and intelligence values &mdash; tap any value to reveal it for 8 seconds
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHideSensitiveData(!hideSensitiveData)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hideSensitiveData ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                    hideSensitiveData ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 4. Screenshot protection */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 mt-0.5">
                  <Monitor size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">Screenshot protection</h3>
                    <Info size={13} className="text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Obscure content when the app is backgrounded, printed or screen-shared
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScreenshotProtection(!screenshotProtection)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  screenshotProtection ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                    screenshotProtection ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 5. Two-step verification */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 mt-0.5">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Two-step verification</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ask for an authenticator code on new devices
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTwoStepVerification(!twoStepVerification)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  twoStepVerification ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                    twoStepVerification ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Bottom Controls matching screenshot */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-bold">Auto-lock after</span>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className="bg-black/60 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold outline-none cursor-pointer focus:border-cyan-400"
              >
                <option value={1}>1 minute</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={0}>Never</option>
              </select>
              <span className="text-xs text-slate-400">Applies immediately after idle time.</span>
            </div>

            <button
              type="button"
              onClick={lockNow}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:border-slate-500"
            >
              <Lock size={14} className="text-slate-300" />
              <span>Lock now</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: APPEARANCE (FULL THEMES, ACCENT COLOR, FONTS, TEXT COMBOS) */}
      {activeTab === 'appearance' && (
        <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Palette size={18} className="text-pink-400" />
                <span>Global Appearance & Tactical Theming</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize themes, military accent palettes, typography, and phosphor text combinations
              </p>
            </div>

            <button
              onClick={resetAppearanceDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* 1. Global Themes Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Base App Theme (5 Tactical Profiles)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: 'military-matrix', name: 'Military Matrix', desc: 'Tactical dark with subtle radar grid', bg: '#02040a', border: '#00f0ff' },
                { id: 'daylight-field', name: 'Daylight Field', desc: 'High-visibility contrast for sunlight', bg: '#f8fafc', border: '#0284c7' },
                { id: 'midnight-cyber', name: 'Midnight Cyber', desc: 'Deep indigo sci-fi surveillance mood', bg: '#030712', border: '#6366f1' },
                { id: 'obsidian-stealth', name: 'Obsidian Stealth', desc: 'Pure pitch black for OLED panels', bg: '#000000', border: '#e2e8f0' },
                { id: 'emerald-ops', name: 'Emerald Ops', desc: 'Military night-vision HUD aesthetic', bg: '#021009', border: '#10b981' },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id as AppTheme)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    theme === t.id
                      ? 'border-cyan-400 bg-slate-900/80 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'border-slate-800 bg-black/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{t.name}</span>
                    <div
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: t.border }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Accent Color Palette */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>2. Tactical Accent Color Palette</span>
              <span className="text-xs text-slate-400">
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
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-white bg-slate-900 shadow-lg scale-105'
                        : 'border-slate-800 bg-black/40 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl shadow-md flex items-center justify-center"
                      style={{ backgroundColor: item.hex, boxShadow: item.glow }}
                    >
                      {isSelected && <CheckCircle size={16} className="text-black stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">{item.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Typography & Font Family */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Type size={14} className="text-cyan-400" />
              <span>3. Military & Telemetry Font Family</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(FONT_FAMILY_MAP) as FontFamily[]).map((fontKey) => {
                const font = FONT_FAMILY_MAP[fontKey];
                const isSelected = fontFamily === fontKey;
                return (
                  <div
                    key={fontKey}
                    onClick={() => setFontFamily(fontKey)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-slate-900 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'border-slate-800 bg-black/40 hover:border-slate-700'
                    }`}
                    style={{ fontFamily: font.css }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{font.label}</span>
                      <span className="text-[10px] text-slate-500">{font.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      SYS:// 108.45.19 &bull; LAT 32.7157° N &bull; LON 74.8560° E
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Text Color Combination & Phosphor Glow */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              4. Text Color Combination & Phosphor Mode
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(TEXT_COMBO_MAP) as TextColorCombo[]).map((comboKey) => {
                const combo = TEXT_COMBO_MAP[comboKey];
                const isSelected = textColorCombo === comboKey;
                return (
                  <div
                    key={comboKey}
                    onClick={() => setTextColorCombo(comboKey)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-slate-900 shadow-md'
                        : 'border-slate-800 bg-black/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: combo.primary }}
                      />
                      <span className="text-xs font-bold text-white">{combo.label}</span>
                    </div>
                    <div
                      className="text-xs p-2 rounded-lg bg-black/50 border border-slate-800"
                      style={{ color: combo.primary }}
                    >
                      <span>PREVIEW: ALARM TACTICAL READY</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Font Scaling */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              5. Interface Font Sizing
            </label>
            <div className="flex items-center gap-3">
              {[
                { id: 'compact', label: 'Compact (92%)' },
                { id: 'standard', label: 'Standard (100%)' },
                { id: 'large', label: 'Enhanced Visibility (108%)' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFontScale(s.id as FontScale)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    fontScale === s.id
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-md'
                      : 'border-slate-800 bg-black/40 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT & PROFILE SETUP */}
      {activeTab === 'account' && (
        <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Key size={18} className="text-amber-400" />
              <span>Operator Profile & Credentials Setup</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Update operator identity, department email, sector clearance, and security passphrase
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle size={16} />
              <span>Operator credentials and tactical sector profile successfully saved.</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white text-xs font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Gov / Security Email
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white text-xs font-mono outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assigned Border Sector
                </label>
                <select
                  value={profileSector}
                  onChange={(e) => setProfileSector(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white text-xs font-mono outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="All Border Sectors (HQ)">All Border Sectors (HQ)</option>
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
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Operational Shift
                </label>
                <select
                  value={profileShift}
                  onChange={(e) => setProfileShift(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white text-xs font-mono outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="Day Shift (0600 - 1800)">Day Shift (0600 - 1800)</option>
                  <option value="Night Shift (1800 - 0600)">Night Shift (1800 - 0600)</option>
                  <option value="24/7 Command Standby">24/7 Command Standby</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Update Passphrase / Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep existing passphrase"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white text-xs font-mono outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/40 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Terminate Session & Exit</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                <Save size={14} />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SURVEILLANCE AI & AUDIO SYNTHESIZER */}
      {activeTab === 'surveillance' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#0e1628] border-2 border-cyan-500/40 rounded-3xl space-y-5 shadow-[0_0_25px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
                <Volume2 size={18} className={`text-cyan-400 ${activePlayingTone ? 'animate-bounce' : ''}`} />
                <span>Audio Alert Triggers & Alarm Tone Customizer</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold ml-2">
                  WEB AUDIO SYNTHESIZER
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">ACTIVE TRIGGER:</span>
                <span className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-black rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  {minSeverity}+ SEV // &gt;{intrusionConfidenceThreshold}% CONF
                </span>
              </div>
            </div>

            {/* Master Controls: Mute, Master Volume, and Main Test Button */}
            <div className="p-3.5 bg-black/60 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const next = !localAudioMuted;
                    setLocalAudioMuted(next);
                    audioAlertEngine.setMuted(next);
                    if (onToggleAudioMute) onToggleAudioMute();
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    localAudioMuted
                      ? 'bg-slate-900 text-slate-500 border-slate-700'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  }`}
                  title={localAudioMuted ? 'Unmute Audio Alert System' : 'Mute Audio Alert System'}
                >
                  {localAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    {localAudioMuted ? 'AUDIO ALERTS: MUTED (SILENT OPERATOR MODE)' : 'AUDIO ALERTS: ARMED & ACTIVE'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Synthesizes low-latency multi-oscillator alarms on high-severity perimeter intrusions
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-36">
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
                    className="w-full h-1.5 bg-[#0a0f1d] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-500/30"
                  />
                  <span className="text-[10px] font-mono font-bold text-cyan-300 w-8 text-right">
                    {localAudioVolume}%
                  </span>
                </div>

                <button
                  onClick={() => audioAlertEngine.playTonePreview(selectedTone)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-black shadow-md cursor-pointer"
                >
                  <Play size={13} className="fill-current" />
                  <span>TEST TONE</span>
                </button>
              </div>
            </div>

            {/* Tone Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AVAILABLE_ALERT_TONES.map((tone) => {
                const isSelected = selectedTone === tone.id;
                return (
                  <div
                    key={tone.id}
                    onClick={() => {
                      setSelectedTone(tone.id);
                      audioAlertEngine.setActiveTone(tone.id);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-[#080d18] border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {tone.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-400 font-bold">
                        {tone.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{tone.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anomaly Detection Sensitivity */}
          <div className="p-6 bg-[#0a0f1d] border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Anomaly Movement & Trajectory Threshold
                </h3>
                <p className="text-xs text-slate-400">
                  Current: <span className="text-cyan-400 font-black">{localSensitivity}%</span>
                </p>
              </div>
              <button
                onClick={handleSurveillanceSave}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
              >
                Save Settings
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
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      )}

      {/* TAB 5: HELP & SUPPORT */}
      {activeTab === 'help' && (
        <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <HelpCircle size={18} className="text-blue-400" />
              <span>Help & Tactical Support</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Field operational manuals, emergency overrides, and edge node diagnostic logs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-400" />
                <span>DEFCON Protocols</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Level 1-4 escalation rules for border wire breaches, unauthorized vehicle movement, and drone incursions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400" />
                <span>Edge Inference Node CLI</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect via SSH to field camera nodes on port 8000 to review raw homography matrix calibration tables.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
