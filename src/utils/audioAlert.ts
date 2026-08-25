/**
 * Seemadrishti Defense Surveillance - Web Audio API Alert Engine
 * Synthesizes short, low-frequency 'alert ping' sounds for high-confidence (>90%) intrusion events.
 */

class AudioAlertEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.85; // 0.0 to 1.0
  private lastPingTime: number = 0;
  private listeners: Set<(isPlaying: boolean, confidence?: number) => void> = new Set();

  constructor() {
    // Lazy AudioContext initialization on first user interaction or trigger
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // User gesture may be required
      });
    }

    return this.ctx;
  }

  /**
   * Set mute state
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.notifyListeners(false);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set volume level (0 to 100 or 0 to 1)
   */
  public setVolume(val: number): void {
    if (val > 1) {
      this.volume = Math.max(0, Math.min(1, val / 100));
    } else {
      this.volume = Math.max(0, Math.min(1, val));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Subscribe to audio alert playing events for UI animations
   */
  public subscribe(listener: (isPlaying: boolean, confidence?: number) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(isPlaying: boolean, confidence?: number): void {
    this.listeners.forEach((fn) => {
      try {
        fn(isPlaying, confidence);
      } catch (err) {
        console.error('Audio alert listener error:', err);
      }
    });
  }

  /**
   * Plays a short, low-frequency 'alert ping' sound.
   * Uses Web Audio API oscillator synthesis with resonant low-pass biquad filter.
   *
   * @param options.confidence - Detection confidence score (0..100 or 0..1). Sound plays only if > 90%.
   * @param options.force - If true, bypasses confidence > 90% check (useful for audio test buttons).
   * @returns boolean indicating if the sound was played.
   */
  public playAlertPing(options?: { confidence?: number; force?: boolean }): boolean {
    if (this.isMuted) return false;

    const confidence = options?.confidence;
    const force = options?.force ?? false;

    // Confidence validation: Must be > 90% (unless forced for preview/test)
    if (!force) {
      if (confidence === undefined || confidence === null) return false;
      const normalizedConfidence = confidence <= 1 ? confidence * 100 : confidence;
      if (normalizedConfidence <= 90) {
        return false;
      }
    }

    // Rate limit to prevent acoustic distortion if multiple detections fire simultaneously within 120ms
    const now = Date.now();
    if (now - this.lastPingTime < 120 && !force) {
      return false;
    }
    this.lastPingTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const t = ctx.currentTime;
      const duration = 0.28; // 280ms duration (short tactical ping)

      // 1. Primary Low-Frequency Tone (Sub-bass / Sonar Radar ping)
      // Sweeps smoothly from 195Hz down to 80Hz for authoritative low-frequency presence
      const primaryOsc = ctx.createOscillator();
      primaryOsc.type = 'sine';
      primaryOsc.frequency.setValueAtTime(195, t);
      primaryOsc.frequency.exponentialRampToValueAtTime(80, t + duration);

      // 2. Secondary Harmonic Layer (Fast 260Hz resonant transient for acoustic 'ping' definition)
      const harmonicOsc = ctx.createOscillator();
      harmonicOsc.type = 'triangle';
      harmonicOsc.frequency.setValueAtTime(260, t);
      harmonicOsc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

      // 3. Low-Pass Biquad Filter to keep the sound deeply resonant and eliminate harsh high frequencies
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, t);
      filter.Q.setValueAtTime(3.8, t); // Slight tactical resonance peak

      // 4. Primary Gain Envelope (Fast 8ms attack to avoid clicks, exponential decay)
      const primaryGain = ctx.createGain();
      const masterVol = this.volume;
      primaryGain.gain.setValueAtTime(0.0001, t);
      primaryGain.gain.linearRampToValueAtTime(0.75 * masterVol, t + 0.008);
      primaryGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      // 5. Harmonic Gain Envelope (Short 90ms punch)
      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.0001, t);
      harmonicGain.gain.linearRampToValueAtTime(0.35 * masterVol, t + 0.005);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      // Connect graph:
      // primaryOsc -> primaryGain -> filter -> master
      // harmonicOsc -> harmonicGain -> filter -> master
      primaryOsc.connect(primaryGain);
      harmonicOsc.connect(harmonicGain);

      primaryGain.connect(filter);
      harmonicGain.connect(filter);

      filter.connect(ctx.destination);

      // Start & Stop
      primaryOsc.start(t);
      harmonicOsc.start(t);

      primaryOsc.stop(t + duration);
      harmonicOsc.stop(t + 0.12);

      // Notify UI listeners for visual wave animation / HUD audio feedback
      this.notifyListeners(true, confidence);
      setTimeout(() => {
        this.notifyListeners(false, confidence);
      }, duration * 1000 + 50);

      return true;
    } catch (err) {
      console.warn('Audio alert Web Audio API play error:', err);
      return false;
    }
  }
}

// Global Singleton Instance
export const audioAlertEngine = new AudioAlertEngine();

/**
 * Helper to play alert ping if condition (Intrusion + Confidence > 90%) is met
 */
export function triggerIntrusionAudioAlert(alert: {
  title?: string;
  type?: string;
  confidence?: number;
}): boolean {
  const title = alert.title || '';
  const type = alert.type || '';
  const confidence = alert.confidence;

  const isIntrusion =
    /intrusion|breach|perimeter|unauthorized|trespass/i.test(title) ||
    /intrusion|breach|perimeter|unauthorized|trespass/i.test(type);

  if (isIntrusion && confidence !== undefined) {
    return audioAlertEngine.playAlertPing({ confidence });
  }
  return false;
}
