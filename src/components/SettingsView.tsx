import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  Bell,
  Cpu,
  Save,
  CheckCircle,
  Radio,
  Sparkles,
  Activity,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  Layers,
  Compass,
  Volume2,
  VolumeX,
  Play,
  Zap,
  Music,
  Disc,
  Flame,
  Volume1,
} from 'lucide-react';
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
  const [localSensitivity, setLocalSensitivity] = useState(anomalySensitivity);
  const [localDataset, setLocalDataset] = useState(trajectoryDataset);
  const [personConfidence, setPersonConfidence] = useState(85);
  const [vehicleConfidence, setVehicleConfidence] = useState(80);
  
  // Audio Alert Customization States
  const [selectedTone, setSelectedTone] = useState<AlertToneType>(() => audioAlertEngine.getActiveTone());
  const [minSeverity, setMinSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>(() => audioAlertEngine.getMinimumSeverity());
  const [intrusionConfidenceThreshold, setIntrusionConfidenceThreshold] = useState(() => audioAlertEngine.getConfidenceThreshold());
  const [repeatCount, setRepeatCount] = useState<number>(() => audioAlertEngine.getRepeatCount());
  const [localAudioMuted, setLocalAudioMuted] = useState(isAudioMuted || audioAlertEngine.getIsMuted());
  const [localAudioVolume, setLocalAudioVolume] = useState(Math.round(audioAlertEngine.getVolume() * 100));
  const [activePlayingTone, setActivePlayingTone] = useState<AlertToneType | null>(null);

  const [autoRecordBreach, setAutoRecordBreach] = useState(true);
  const [hardwareAcceleration, setHardwareAcceleration] = useState('NVIDIA TensorRT-LLM (CUDA)');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Subscribe to audio engine state
  useEffect(() => {
    const unsub = audioAlertEngine.subscribe((isPlaying, _conf, tone) => {
      setActivePlayingTone(isPlaying ? tone || selectedTone : null);
    });
    return unsub;
  }, [selectedTone]);

  const handleSensitivityChange = (newVal: number) => {
    setLocalSensitivity(newVal);
    if (onAnomalySensitivityChange) {
      onAnomalySensitivityChange(newVal);
    }
  };

  const handleDatasetChange = (newDataset: string) => {
    setLocalDataset(newDataset);
    if (onTrajectoryDatasetChange) {
      onTrajectoryDatasetChange(newDataset);
    }
  };

  const handleMuteToggle = () => {
    const next = !localAudioMuted;
    setLocalAudioMuted(next);
    audioAlertEngine.setMuted(next);
    if (onToggleAudioMute) onToggleAudioMute();
  };

  const handleVolumeSlider = (val: number) => {
    setLocalAudioVolume(val);
    audioAlertEngine.setVolume(val);
    if (onAudioVolumeChange) onAudioVolumeChange(val);
  };

  const handleToneChange = (tone: AlertToneType) => {
    setSelectedTone(tone);
    audioAlertEngine.setActiveTone(tone);
  };

  const handlePreviewTone = (tone: AlertToneType) => {
    audioAlertEngine.playTonePreview(tone);
  };

  const handleMinSeverityChange = (sev: 'CRITICAL' | 'HIGH' | 'MEDIUM') => {
    setMinSeverity(sev);
    audioAlertEngine.setMinimumSeverity(sev);
  };

  const handleIntrusionThresholdChange = (val: number) => {
    setIntrusionConfidenceThreshold(val);
    audioAlertEngine.setConfidenceThreshold(val);
  };

  const handleRepeatCountChange = (count: number) => {
    setRepeatCount(count);
    audioAlertEngine.setRepeatCount(count);
  };

  const handleSave = () => {
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

  // Helper text based on sensitivity level
  const getSensitivityDescriptor = (val: number) => {
    if (val < 40) return { label: 'LOW SENSITIVITY (Permissive)', color: 'text-blue-400', desc: 'Allows significant deviation and abrupt stops before flagging anomalies.' };
    if (val < 70) return { label: 'BALANCED OPERATIONAL (Standard)', color: 'text-emerald-400', desc: 'Standard trajectory tracking; flags erratic pedestrian velocity shifts & loitering.' };
    if (val < 85) return { label: 'TACTICAL HIGH (Border/Restricted)', color: 'text-amber-400', desc: 'Strict trajectory deviation filter; flags slight path shifts, reversals & sudden accelerations.' };
    return { label: 'ULTRA-PRECISE (Zero Tolerance)', color: 'text-rose-400', desc: 'Instant alarm on microscopic velocity anomalies, sudden clustering or erratic zigzagging.' };
  };

  const sensitivityDesc = getSensitivityDescriptor(localSensitivity);

  return (
    <div className="space-y-4 max-w-4xl" id="settings-view-root">
      {/* Header */}
      <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" />
            <span>SURVEILLANCE AI & SYSTEM CONFIGURATION</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tune anomaly movement threshold, audio alert triggers & alarm tones, pedestrian trajectory datasets, and inference parameters
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          <Save size={14} />
          <span>Save Config</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <CheckCircle size={16} />
          <span>Surveillance parameters & custom audio triggers successfully saved and applied to edge runtime.</span>
        </div>
      )}

      {/* FEATURE 1: Web Audio API Custom Audio Alert Triggers & Tone Previewer */}
      <div className="p-5 bg-[#0e1628] border-2 border-cyan-500/40 rounded-xl space-y-5 shadow-[0_0_25px_rgba(6,182,212,0.15)] relative overflow-hidden" id="web-audio-alert-system-panel">
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
        <div className="p-3.5 bg-black/60 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleMuteToggle}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
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
            {/* Quick Volume Slider */}
            <div className="flex items-center gap-2 w-36">
              <Volume1 size={14} className="text-slate-400 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={localAudioVolume}
                onChange={(e) => handleVolumeSlider(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0a0f1d] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-500/30"
              />
              <span className="text-[10px] font-mono font-bold text-cyan-300 w-8 text-right">
                {localAudioVolume}%
              </span>
            </div>

            {/* Main Preview Selected Tone Button */}
            <button
              onClick={() => handlePreviewTone(selectedTone)}
              disabled={localAudioMuted && localAudioVolume === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                activePlayingTone === selectedTone
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              }`}
              title="Test the currently selected alarm tone"
            >
              <Play size={13} className={activePlayingTone === selectedTone ? 'fill-current animate-spin' : 'fill-current'} />
              <span>{activePlayingTone === selectedTone ? 'PLAYING...' : 'TEST SELECTED TONE'}</span>
            </button>
          </div>
        </div>

        {/* Tone Selection Grid with Interactive Preview Buttons */}
        <div className="space-y-2">
          <label className="block text-slate-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Music size={14} className="text-cyan-400" />
              <span>Select Alarm Tone for High-Severity Intrusions</span>
            </span>
            <span className="text-[10px] text-slate-400">
              5 Precision Synthesizer Profiles Available
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {AVAILABLE_ALERT_TONES.map((tone) => {
              const isSelected = selectedTone === tone.id;
              const isPlayingThis = activePlayingTone === tone.id;

              return (
                <div
                  key={tone.id}
                  onClick={() => handleToneChange(tone.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'bg-[#080d18] border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {tone.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                          tone.category === 'HIGH_SEV'
                            ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                            : tone.category === 'LOW_FREQ'
                            ? 'bg-blue-950 text-blue-400 border-blue-500/40'
                            : tone.category === 'TACTICAL'
                            ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                            : 'bg-purple-950 text-purple-400 border-purple-500/40'
                        }`}
                      >
                        {tone.primaryFrequency}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-tight">
                      {tone.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 shadow-[0_0_6px_#00f0ff]' : 'bg-slate-700'}`} />
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {isSelected ? 'ACTIVE TONE' : 'SELECT'}
                      </span>
                    </div>

                    {/* Preview Button for this tone */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewTone(tone.id);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                        isPlayingThis
                          ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                          : 'bg-slate-900 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-200 border-cyan-500/30'
                      }`}
                      title={`Preview ${tone.name}`}
                    >
                      <Play size={10} className="fill-current" />
                      <span>{isPlayingThis ? 'PLAYING' : 'TEST TONE'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trigger Criteria Customization (Severity, Confidence, Repeat) */}
        <div className="p-4 bg-black/50 border border-slate-800 rounded-xl space-y-4">
          <div className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2 border-b border-white/10 pb-2">
            <Sliders size={14} className="text-cyan-400" />
            <span>Audio Alert Trigger Conditions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Condition 1: Minimum Severity Gating */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Minimum Alert Severity</span>
                <span className="text-rose-400 font-bold">{minSeverity}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => handleMinSeverityChange(sev)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      minSeverity === sev
                        ? sev === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                          : sev === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'bg-blue-950 text-blue-300 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
              <span className="text-[9.5px] text-slate-400 block mt-1">
                {minSeverity === 'CRITICAL'
                  ? 'Only Defcon-1 and Critical breach events trigger audio.'
                  : minSeverity === 'HIGH'
                  ? 'Standard setup: High and Critical intrusions trigger audio.'
                  : 'Permissive: Medium, High, and Critical intrusions trigger audio.'}
              </span>
            </div>

            {/* Condition 2: Confidence Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Confidence Threshold</span>
                <span className="text-cyan-400 font-bold">&gt; {intrusionConfidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={99}
                value={intrusionConfidenceThreshold}
                onChange={(e) => handleIntrusionThresholdChange(Number(e.target.value))}
                className="w-full h-2 bg-[#0a0f1d] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-500/30"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>50% (Permissive)</span>
                <span className="text-emerald-400 font-bold">90% (SIH Benchmark)</span>
                <span>99% (Strict)</span>
              </div>
            </div>

            {/* Condition 3: Repeat / Pulse Chime Count */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Alert Chime Pattern</span>
                <span className="text-cyan-400 font-bold">{repeatCount}x Pulse</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { count: 1, label: 'Single' },
                  { count: 2, label: 'Double' },
                  { count: 3, label: 'Triple' },
                ].map(({ count, label }) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleRepeatCountChange(count)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      repeatCount === count
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {label} ({count}x)
                  </button>
                ))}
              </div>
              <span className="text-[9.5px] text-slate-400 block mt-1">
                Controls pulse count per intrusion event to alert dispatch officers.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 2: Anomaly Movement Detection Sensitivity Threshold Slider */}
      <div className="p-5 bg-[#131b2e] border-2 border-cyan-500/40 rounded-xl space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-[#1c273c]">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
            <Activity size={18} className="text-cyan-400 animate-pulse" />
            <span>Anomaly Movement Detection System — Sensitivity Threshold</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold ml-2">
              EDGE CV RUNTIME GATING
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">ACTIVE THRESHOLD:</span>
            <span className="px-3 py-1 bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono text-sm font-black rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              {localSensitivity}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className={`text-xs font-mono font-bold ${sensitivityDesc.color} block`}>
                MODE: {sensitivityDesc.label}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {sensitivityDesc.desc}
              </p>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-400 hidden sm:block">
              <span>Velocity Threshold: </span>
              <span className="text-cyan-400 font-bold">{(0.45 * (localSensitivity / 50)).toFixed(2)} m/s²</span>
            </div>
          </div>

          {/* Slider Bar */}
          <div className="relative pt-2 pb-1">
            <input
              type="range"
              min={10}
              max={99}
              step={1}
              value={localSensitivity}
              onChange={(e) => handleSensitivityChange(Number(e.target.value))}
              className="w-full h-3 bg-[#0a0f1d] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-500/30"
              id="anomaly-sensitivity-slider"
            />
            
            {/* Scale Markings */}
            <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 mt-1">
              <span>10% (Low)</span>
              <span>25%</span>
              <span>50% (Standard)</span>
              <span>75% (Tactical)</span>
              <span>99% (Ultra)</span>
            </div>
          </div>

          {/* Real-time propagation feedback */}
          <div className="p-3 bg-[#0a0f1d] border border-cyan-500/20 rounded-lg flex items-center justify-between text-[11px] font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Real-time LiveStreamPlayer Sync:</span>
              <span className="text-cyan-300 font-bold">
                {localSensitivity >= 80 ? '⚡ HIGH SENSITIVITY ACTIVE' : '✓ SYNCED WITH RUNTIME'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              ADE Anomaly Cutoff: &gt; {(1.8 - (localSensitivity / 100) * 1.2).toFixed(2)}m
            </span>
          </div>
        </div>
      </div>

      {/* Dataset Selection: TU Clausthal Pedestrian Trajectory Prediction */}
      <div className="p-5 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1c273c]">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
            <GitBranch size={16} className="text-emerald-400" />
            <span>Pedestrian Trajectory Prediction Dataset & Model</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold ml-2">
              MODEL &amp; DATASET SPECIFICATION
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
            GITLAB CLOUD SYNCHRONIZED
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Live Video Stream Prediction Dataset</span>
              <span className="text-[10px] font-mono text-slate-400">
                git@gitlab.tu-clausthal.de:pka20/Trajectory-Prediction-Pedestrian.git
              </span>
            </label>
            <select
              value={localDataset}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e1626] border border-[#21304d] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="TU Clausthal Pedestrian Trajectory Dataset (ETH/UCY Stream)">
                TU Clausthal Pedestrian Trajectory Dataset (ETH/UCY Multi-Agent Stream)
              </option>
              <option value="TU Clausthal Pedestrian Trajectory (Stanford Drone Dataset / SDD)">
                TU Clausthal Pedestrian Trajectory (Stanford Drone Dataset / SDD Overhead)
              </option>
              <option value="TU Clausthal Social-LSTM / GAN Velocity Vector Stream">
                TU Clausthal Social-LSTM / GAN Vectorized Trajectory Stream
              </option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 bg-[#0a0f1d] border border-[#1c273c] rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono block">OBSERVATION HORIZON</span>
              <span className="text-xs font-mono font-bold text-emerald-400">T_obs = 8 frames (3.2s)</span>
            </div>
            <div className="p-2.5 bg-[#0a0f1d] border border-[#1c273c] rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono block">PREDICTION HORIZON</span>
              <span className="text-xs font-mono font-bold text-cyan-400">T_pred = 12 frames (4.8s)</span>
            </div>
            <div className="p-2.5 bg-[#0a0f1d] border border-[#1c273c] rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono block">DISPLACEMENT METRIC</span>
              <span className="text-xs font-mono font-bold text-amber-400">ADE / FDE Error (m)</span>
            </div>
          </div>

          {onToggleTrajectoryVectors && (
            <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={showTrajectoryVectors}
                onChange={(e) => onToggleTrajectoryVectors(e.target.checked)}
                className="rounded text-cyan-500 h-4 w-4 accent-cyan-500"
              />
              <span>Render Predicted Future Trajectory Waypoint Vectors on LiveStreamPlayer</span>
            </label>
          )}
        </div>
      </div>

      {/* Model Confidence Settings */}
      <div className="p-5 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1c273c] text-sm font-bold text-white uppercase">
          <Sparkles size={16} className="text-emerald-400" />
          <span>AI Detection Confidence Thresholds</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold ml-2">
            EDGE CV RUNTIME GATING
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Person Detection Confidence</span>
              <span className="text-emerald-400 font-mono">{personConfidence}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              value={personConfidence}
              onChange={(e) => setPersonConfidence(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Vehicle Detection Confidence</span>
              <span className="text-amber-400 font-mono">{vehicleConfidence}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              value={vehicleConfidence}
              onChange={(e) => setVehicleConfidence(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Hardware & Acceleration */}
      <div className="p-5 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-3 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1c273c] text-sm font-bold text-white uppercase">
          <Cpu size={16} className="text-blue-400" />
          <span>Edge Compute & Inference Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Inference Backend</label>
            <select
              value={hardwareAcceleration}
              onChange={(e) => setHardwareAcceleration(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e1626] border border-[#21304d] text-slate-200 focus:outline-none"
            >
              <option value="NVIDIA TensorRT-LLM (CUDA)">NVIDIA TensorRT-LLM (CUDA 12.4)</option>
              <option value="OpenVINO Intel Iris Xe">OpenVINO (Intel Iris / CPU)</option>
              <option value="Qualcomm Neural Processing Engine">Qualcomm NPU / SNPE</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={autoRecordBreach}
                onChange={(e) => setAutoRecordBreach(e.target.checked)}
                className="rounded text-blue-600 h-4 w-4"
              />
              <span>Auto-record 30s 4K video snippet upon zone intrusion</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
