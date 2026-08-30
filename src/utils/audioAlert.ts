/**
 * Seemadrishti Defense Surveillance - Web Audio API Alert Engine
 * Synthesizes customizable alarm tones for perimeter intrusions and high-severity breaches.
 */

export type AlertToneType =
  | 'tactical_sonar'
  | 'klaxon_pulse'
  | 'warble_siren'
  | 'electronic_chirp'
  | 'sub_bass_pulse';

export interface AlertToneDefinition {
  id: AlertToneType;
  name: string;
  description: string;
  primaryFrequency: string;
  category: 'LOW_FREQ' | 'HIGH_SEV' | 'TACTICAL' | 'PULSE';
}

export const AVAILABLE_ALERT_TONES: AlertToneDefinition[] = [
  {
    id: 'tactical_sonar',
    name: 'Tactical Sonar Radar Ping',
    description: 'Authoritative sub-bass resonant sweep (195Hz → 80Hz) with resonant low-pass filtering.',
    primaryFrequency: '195 Hz → 80 Hz',
    category: 'LOW_FREQ',
  },
  {
    id: 'klaxon_pulse',
    name: 'Klaxon Pulse (High Defcon Alarm)',
    description: 'Rapid two-stage alarm burst (440Hz / 880Hz square-sine modulation) for critical breaches.',
    primaryFrequency: '440 Hz / 880 Hz',
    category: 'HIGH_SEV',
  },
  {
    id: 'warble_siren',
    name: 'Warble Siren (Two-Tone Alert)',
    description: 'Oscillating tactical frequency modulation (350Hz ↔ 620Hz) for rapid perimeter breach notification.',
    primaryFrequency: '350 Hz ↔ 620 Hz',
    category: 'TACTICAL',
  },
  {
    id: 'electronic_chirp',
    name: 'Electronic Radar Chirp',
    description: 'High-definition fast transient frequency rise (300Hz → 1200Hz) with exponential decay.',
    primaryFrequency: '300 Hz → 1.2 kHz',
    category: 'PULSE',
  },
  {
    id: 'sub_bass_pulse',
    name: 'Deep Sub-Bass Seismic Thud',
    description: 'Heavy 60Hz tactile sub-bass punch with resonant low-pass filter (300ms impact).',
    primaryFrequency: '60 Hz Sub-Impact',
    category: 'LOW_FREQ',
  },
];

export interface AudioAlertConfig {
  activeTone: AlertToneType;
  minimumSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  confidenceThreshold: number; // 0 - 100
  repeatCount: number; // 1, 2, 3
  isMuted: boolean;
  volume: number; // 0.0 - 1.0
}

class AudioAlertEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.85; // 0.0 to 1.0
  private lastPingTime: number = 0;
  private activeTone: AlertToneType = 'tactical_sonar';
  private minimumSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'HIGH';
  private confidenceThreshold: number = 90;
  private repeatCount: number = 1;
  private listeners: Set<(isPlaying: boolean, confidence?: number, tone?: AlertToneType) => void> = new Set();

  constructor() {
    // Load persisted settings from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedTone = localStorage.getItem('seemadrishti_alert_tone');
        if (savedTone && AVAILABLE_ALERT_TONES.some((t) => t.id === savedTone)) {
          this.activeTone = savedTone as AlertToneType;
        }
        const savedMute = localStorage.getItem('seemadrishti_audio_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
        const savedVol = localStorage.getItem('seemadrishti_audio_volume');
        if (savedVol !== null) {
          this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
        }
        const savedMinSev = localStorage.getItem('seemadrishti_min_severity');
        if (savedMinSev === 'CRITICAL' || savedMinSev === 'HIGH' || savedMinSev === 'MEDIUM') {
          this.minimumSeverity = savedMinSev;
        }
        const savedConf = localStorage.getItem('seemadrishti_confidence_threshold');
        if (savedConf !== null) {
          this.confidenceThreshold = Math.max(50, Math.min(99, parseInt(savedConf, 10)));
        }
      } catch {
        // Fallback to defaults
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // User gesture required
      });
    }

    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('seemadrishti_audio_muted', String(muted));
    } catch {}
    this.notifyListeners(false);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(val: number): void {
    if (val > 1) {
      this.volume = Math.max(0, Math.min(1, val / 100));
    } else {
      this.volume = Math.max(0, Math.min(1, val));
    }
    try {
      localStorage.setItem('seemadrishti_audio_volume', String(this.volume));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setActiveTone(tone: AlertToneType): void {
    this.activeTone = tone;
    try {
      localStorage.setItem('seemadrishti_alert_tone', tone);
    } catch {}
  }

  public getActiveTone(): AlertToneType {
    return this.activeTone;
  }

  public setMinimumSeverity(sev: 'CRITICAL' | 'HIGH' | 'MEDIUM'): void {
    this.minimumSeverity = sev;
    try {
      localStorage.setItem('seemadrishti_min_severity', sev);
    } catch {}
  }

  public getMinimumSeverity(): 'CRITICAL' | 'HIGH' | 'MEDIUM' {
    return this.minimumSeverity;
  }

  public setConfidenceThreshold(conf: number): void {
    this.confidenceThreshold = Math.max(50, Math.min(99, conf));
    try {
      localStorage.setItem('seemadrishti_confidence_threshold', String(this.confidenceThreshold));
    } catch {}
  }

  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  public setRepeatCount(count: number): void {
    this.repeatCount = Math.max(1, Math.min(3, count));
  }

  public getRepeatCount(): number {
    return this.repeatCount;
  }

  public getConfig(): AudioAlertConfig {
    return {
      activeTone: this.activeTone,
      minimumSeverity: this.minimumSeverity,
      confidenceThreshold: this.confidenceThreshold,
      repeatCount: this.repeatCount,
      isMuted: this.isMuted,
      volume: this.volume,
    };
  }

  public subscribe(listener: (isPlaying: boolean, confidence?: number, tone?: AlertToneType) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(isPlaying: boolean, confidence?: number, tone?: AlertToneType): void {
    this.listeners.forEach((fn) => {
      try {
        fn(isPlaying, confidence, tone);
      } catch (err) {
        console.error('Audio alert listener error:', err);
      }
    });
  }

  /**
   * Synthesizes and plays a specified alarm tone directly.
   */
  public playTone(toneType: AlertToneType = this.activeTone, options?: { force?: boolean; volumeOverride?: number }): boolean {
    if (this.isMuted && !options?.force) return false;

    const ctx = this.getAudioContext();
    if (!ctx) return false;

    const masterVol = options?.volumeOverride ?? this.volume;
    const t = ctx.currentTime;

    try {
      let totalDuration = 0.3;

      switch (toneType) {
        case 'tactical_sonar': {
          totalDuration = 0.28;
          // Primary Sub-bass sweep
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(195, t);
          osc1.frequency.exponentialRampToValueAtTime(80, t + totalDuration);

          // Harmonic transient
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(260, t);
          osc2.frequency.exponentialRampToValueAtTime(110, t + 0.12);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(420, t);
          filter.Q.setValueAtTime(3.8, t);

          const gain1 = ctx.createGain();
          gain1.gain.setValueAtTime(0.0001, t);
          gain1.gain.linearRampToValueAtTime(0.75 * masterVol, t + 0.008);
          gain1.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);

          const gain2 = ctx.createGain();
          gain2.gain.setValueAtTime(0.0001, t);
          gain2.gain.linearRampToValueAtTime(0.35 * masterVol, t + 0.005);
          gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

          osc1.connect(gain1);
          osc2.connect(gain2);
          gain1.connect(filter);
          gain2.connect(filter);
          filter.connect(ctx.destination);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + totalDuration);
          osc2.stop(t + 0.12);
          break;
        }

        case 'klaxon_pulse': {
          totalDuration = 0.45;
          // Pulse 1 (440Hz) then Pulse 2 (880Hz)
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, t);
          osc.frequency.setValueAtTime(880, t + 0.15);
          osc.frequency.setValueAtTime(660, t + 0.3);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(750, t);
          filter.Q.setValueAtTime(2.0, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.55 * masterVol, t + 0.02);
          gain.gain.setValueAtTime(0.1 * masterVol, t + 0.14);
          gain.gain.linearRampToValueAtTime(0.65 * masterVol, t + 0.16);
          gain.gain.setValueAtTime(0.1 * masterVol, t + 0.29);
          gain.gain.linearRampToValueAtTime(0.5 * masterVol, t + 0.31);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + totalDuration);
          break;
        }

        case 'warble_siren': {
          totalDuration = 0.5;
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          
          // LFO Warble modulation
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(14, t); // 14 Hz warble rate
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(160, t); // +/- 160 Hz modulation

          osc.frequency.setValueAtTime(480, t);
          lfo.connect(osc.frequency);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(950, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.6 * masterVol, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          lfo.start(t);
          osc.start(t);
          lfo.stop(t + totalDuration);
          osc.stop(t + totalDuration);
          break;
        }

        case 'electronic_chirp': {
          totalDuration = 0.22;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, t);
          osc.frequency.exponentialRampToValueAtTime(1350, t + 0.08);
          osc.frequency.exponentialRampToValueAtTime(400, t + totalDuration);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.65 * masterVol, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + totalDuration);
          break;
        }

        case 'sub_bass_pulse': {
          totalDuration = 0.35;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(90, t);
          osc.frequency.exponentialRampToValueAtTime(45, t + totalDuration);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(220, t);
          filter.Q.setValueAtTime(4.0, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.9 * masterVol, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + totalDuration);
          break;
        }
      }

      this.notifyListeners(true, 95, toneType);
      setTimeout(() => {
        this.notifyListeners(false, 95, toneType);
      }, totalDuration * 1000 + 40);

      return true;
    } catch (err) {
      console.warn('Audio tone synthesis error:', err);
      return false;
    }
  }

  /**
   * Preview a specific tone on demand (ignores mute unless volume is 0).
   */
  public playTonePreview(toneType: AlertToneType): boolean {
    return this.playTone(toneType, { force: true });
  }

  /**
   * Main intrusion trigger check
   */
  public playAlertPing(options?: { confidence?: number; severity?: string; force?: boolean }): boolean {
    if (this.isMuted && !options?.force) return false;

    const confidence = options?.confidence;
    const force = options?.force ?? false;
    const severity = (options?.severity || 'HIGH').toUpperCase();

    if (!force) {
      // Check confidence
      if (confidence === undefined || confidence === null) return false;
      const normalizedConfidence = confidence <= 1 ? confidence * 100 : confidence;
      if (normalizedConfidence < this.confidenceThreshold) {
        return false;
      }

      // Check severity threshold
      if (this.minimumSeverity === 'CRITICAL' && severity !== 'CRITICAL' && severity !== 'HIGH') {
        return false;
      }
      if (this.minimumSeverity === 'HIGH' && severity === 'LOW') {
        return false;
      }
    }

    const now = Date.now();
    if (now - this.lastPingTime < 150 && !force) {
      return false;
    }
    this.lastPingTime = now;

    // Play active tone according to repeatCount
    const success = this.playTone(this.activeTone, { force });

    if (this.repeatCount > 1 && success) {
      setTimeout(() => {
        this.playTone(this.activeTone, { force });
      }, 320);

      if (this.repeatCount > 2) {
        setTimeout(() => {
          this.playTone(this.activeTone, { force });
        }, 640);
      }
    }

    return success;
  }
}

// Global Singleton Instance
export const audioAlertEngine = new AudioAlertEngine();

/**
 * Helper to play alert sound if intrusion conditions are satisfied
 */
export function triggerIntrusionAudioAlert(alert: {
  title?: string;
  type?: string;
  confidence?: number;
  severity?: string;
}): boolean {
  const title = alert.title || '';
  const type = alert.type || '';
  const confidence = alert.confidence;
  const severity = alert.severity || 'High';

  const isIntrusion =
    /intrusion|breach|perimeter|unauthorized|trespass|barrier/i.test(title) ||
    /intrusion|breach|perimeter|unauthorized|trespass|barrier/i.test(type);

  if (isIntrusion && confidence !== undefined) {
    return audioAlertEngine.playAlertPing({ confidence, severity });
  }
  return false;
}
