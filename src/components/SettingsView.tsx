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
} from 'lucide-react';
import { audioAlertEngine } from '../utils/audioAlert';

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
  const [intrusionConfidenceThreshold, setIntrusionConfidenceThreshold] = useState(90);
  const [localAudioMuted, setLocalAudioMuted] = useState(isAudioMuted);
  const [localAudioVolume, setLocalAudioVolume] = useState(audioVolume);
  const [isTestSoundPlaying, setIsTestSoundPlaying] = useState(false);
  const [autoRecordBreach, setAutoRecordBreach] = useState(true);
  const [hardwareAcceleration, setHardwareAcceleration] = useState('NVIDIA TensorRT-LLM (CUDA)');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Subscribe to audio engine state
  useEffect(() => {
    const unsub = audioAlertEngine.subscribe((isPlaying) => {
      setIsTestSoundPlaying(isPlaying);
    });
    return unsub;
  }, []);

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

  const handlePlayTestPing = () => {
    audioAlertEngine.playAlertPing({ force: true });
  };

  const handleSave = () => {
    if (onAnomalySensitivityChange) onAnomalySensitivityChange(localSensitivity);
    if (onTrajectoryDatasetChange) onTrajectoryDatasetChange(localDataset);
    if (onAudioVolumeChange) onAudioVolumeChange(localAudioVolume);
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
            Tune anomaly movement threshold, pedestrian trajectory datasets, and RTSP stream parameters
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
          <span>Surveillance parameters successfully saved and applied to edge runtime & LiveStreamPlayer.</span>
        </div>
      )}

      {/* PRIMARY FEATURE: Anomaly Movement Detection Sensitivity Threshold Slider */}
      <div className="p-5 bg-[#131b2e] border-2 border-cyan-500/40 rounded-xl space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-[#1c273c]">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
            <Activity size={18} className="text-cyan-400 animate-pulse" />
            <span>Anomaly Movement Detection System — Sensitivity Threshold</span>
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

      {/* PRIMARY FEATURE: Web Audio API Intrusion Audio Alert System */}
      <div className="p-5 bg-[#0e1628] border-2 border-cyan-500/40 rounded-xl space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden" id="web-audio-alert-system-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
            <Volume2 size={18} className={`text-cyan-400 ${isTestSoundPlaying ? 'animate-bounce' : ''}`} />
            <span>Web Audio API — Low-Frequency Intrusion Alert System</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PING THRESHOLD:</span>
            <span className="px-3 py-1 bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-black rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              &gt; {intrusionConfidenceThreshold}% CONFIDENCE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Controls & Threshold */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="p-3 bg-black/60 border border-cyan-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMuteToggle}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    localAudioMuted
                      ? 'bg-slate-900 text-slate-500 border-slate-700'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  }`}
                  title={localAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {localAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    {localAudioMuted ? 'AUDIO ALERT STATUS: MUTED' : 'AUDIO ALERT STATUS: ARMED'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Synthesizes short low-frequency ping (195Hz → 80Hz) on intrusions with &gt;90% confidence
                  </span>
                </div>
              </div>

              {/* Live Test Ping Button */}
              <button
                onClick={handlePlayTestPing}
                disabled={localAudioMuted}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  isTestSoundPlaying
                    ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                    : localAudioMuted
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                }`}
                title="Play test alert ping sound using Web Audio API"
              >
                <Play size={12} className={isTestSoundPlaying ? 'fill-current animate-spin' : 'fill-current'} />
                <span>{isTestSoundPlaying ? 'PLAYING...' : 'TEST PING'}</span>
              </button>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between text-slate-300 text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Music size={13} className="text-cyan-400" />
                  <span>Synthesizer Master Volume</span>
                </span>
                <span className="text-cyan-400 font-mono font-bold">{localAudioVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={localAudioVolume}
                onChange={(e) => handleVolumeSlider(Number(e.target.value))}
                className="w-full h-2 bg-[#0a0f1d] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-500/30"
              />
            </div>

            {/* Intrusion Threshold Setting */}
            <div>
              <div className="flex justify-between text-slate-300 text-xs font-semibold mb-1">
                <span>Intrusion Audio Trigger Confidence Threshold</span>
                <span className="text-rose-400 font-mono font-bold">&gt; {intrusionConfidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={99}
                value={intrusionConfidenceThreshold}
                onChange={(e) => setIntrusionConfidenceThreshold(Number(e.target.value))}
                className="w-full h-2 bg-[#0a0f1d] rounded-lg appearance-none cursor-pointer accent-rose-500 border border-rose-500/30"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>50% (Permissive)</span>
                <span className="text-emerald-400 font-bold">90% (Standard Intrusion Spec)</span>
                <span>99% (Strict)</span>
              </div>
            </div>
          </div>

          {/* Web Audio Technical Synthesizer Specs */}
          <div className="lg:col-span-5 p-3 bg-black/80 border border-cyan-500/20 rounded-lg flex flex-col justify-between text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1">
                <Zap size={13} className="text-cyan-400" />
                <span>Web Audio Node Graph</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Oscillator 1 (Sub-bass):</span>
                <span className="text-cyan-300 font-bold">195 Hz → 80 Hz Sine Sweep</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Oscillator 2 (Harmonic):</span>
                <span className="text-amber-300">260 Hz Triangle Ping</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biquad Filter:</span>
                <span className="text-emerald-300">Low-Pass @ 420 Hz (Q=3.8)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Envelope Attack / Decay:</span>
                <span className="text-slate-200">8ms Linear / 280ms Exponential</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trigger Rule:</span>
                <span className="text-rose-400 font-bold">Intrusion &amp; Confidence &gt; 90%</span>
              </div>
            </div>

            {/* Visual Waveform Animation during sound */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Live Waveform Monitor:</span>
              <div className="flex items-end gap-1 h-5">
                {[4, 12, 18, 22, 16, 8, 3].map((h, idx) => (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isTestSoundPlaying
                        ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
                        : 'bg-slate-700'
                    }`}
                    style={{
                      height: isTestSoundPlaying ? `${h}px` : '4px',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Confidence Settings */}
      <div className="p-5 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1c273c] text-sm font-bold text-white uppercase">
          <Sparkles size={16} className="text-emerald-400" />
          <span>AI Detection Confidence Thresholds</span>
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
