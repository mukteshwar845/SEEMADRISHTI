/**
 * Seemadrishti Defense Surveillance - Web Speech API Voice Command Service
 * Provides hands-free voice-to-text navigation and tactical system controls.
 */

import { ViewMode } from '../types';
import { MatrixLayoutMode } from '../components/TacticalMatrixView';

export type VoiceAction =
  | { type: 'NAVIGATE'; view: ViewMode }
  | { type: 'SET_MATRIX_LAYOUT'; layout: MatrixLayoutMode }
  | { type: 'SIMULATE_INTRUSION' }
  | { type: 'MUTE_AUDIO'; muted: boolean }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_PATROL' }
  | { type: 'AUTO_FOCUS_ALL' }
  | { type: 'OPEN_DEMO_GUIDE' }
  | { type: 'OPEN_REPORTS' }
  | { type: 'REFRESH' };

export interface VoiceCommandMatch {
  rawTranscript: string;
  recognizedCommand: string;
  action: VoiceAction;
  confidence: number;
}

export interface VoiceServiceState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  lastMatch: VoiceCommandMatch | null;
  feedbackText: string | null;
  error: string | null;
}

type CommandListener = (match: VoiceCommandMatch) => void;
type StateListener = (state: VoiceServiceState) => void;

class VoiceCommandService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private transcript: string = '';
  private interimTranscript: string = '';
  private lastMatch: VoiceCommandMatch | null = null;
  private feedbackText: string | null = null;
  private error: string | null = null;
  private commandListeners: Set<CommandListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private feedbackTimeout: any = null;
  private shouldRestart: boolean = false;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.isSupported = false;
      this.error = 'Web Speech API is not supported in this browser environment.';
      return;
    }

    this.isSupported = true;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.error = null;
        this.notifyState();
      };

      this.recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            finalStr += text;
            this.processTranscript(text, res[0].confidence || 0.9);
          } else {
            interimStr += text;
          }
        }

        this.transcript = finalStr.trim();
        this.interimTranscript = interimStr.trim();
        this.notifyState();
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal timeout waiting for voice, continue
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        this.error = `Speech error: ${event.error}`;
        this.notifyState();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.notifyState();

        // Auto restart if continuous listening was armed
        if (this.shouldRestart) {
          setTimeout(() => {
            if (this.shouldRestart) {
              try {
                this.recognition.start();
              } catch {}
            }
          }, 300);
        }
      };
    } catch (e: any) {
      this.isSupported = false;
      this.error = e.message;
    }
  }

  public getState(): VoiceServiceState {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening,
      transcript: this.transcript,
      interimTranscript: this.interimTranscript,
      lastMatch: this.lastMatch,
      feedbackText: this.feedbackText,
      error: this.error,
    };
  }

  public start(): boolean {
    if (!this.isSupported) return false;
    if (this.isListening) return true;

    try {
      this.shouldRestart = true;
      this.recognition.start();
      this.showFeedback('Tactical Voice Command Listener Active. Speak command...');
      return true;
    } catch (err: any) {
      console.warn('Recognition start error:', err);
      return false;
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
    this.showFeedback('Voice Listener Standby');
    this.notifyState();
  }

  public toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  public onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState() {
    const st = this.getState();
    this.stateListeners.forEach((fn) => {
      try {
        fn(st);
      } catch (err) {
        console.error('Voice state listener error:', err);
      }
    });
  }

  private showFeedback(text: string, durationMs: number = 3500) {
    this.feedbackText = text;
    this.notifyState();

    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      this.feedbackText = null;
      this.notifyState();
    }, durationMs);
  }

  /**
   * Evaluates natural speech phrases into deterministic surveillance commands.
   */
  public processTranscript(transcript: string, confidence: number = 0.9): VoiceCommandMatch | null {
    const raw = transcript.toLowerCase().trim();
    if (!raw) return null;

    let match: { recognizedCommand: string; action: VoiceAction } | null = null;

    // 1. Quad View & Matrix Layout Commands
    if (
      raw.includes('quad view') ||
      raw.includes('switch to quad') ||
      raw.includes('quad mode') ||
      raw.includes('show quad') ||
      raw.includes('2 by 2') ||
      raw.includes('two by two')
    ) {
      match = {
        recognizedCommand: 'Switch to Quad View',
        action: { type: 'SET_MATRIX_LAYOUT', layout: 'quad-2x2' },
      };
    } else if (
      raw.includes('3 by 3') ||
      raw.includes('three by three') ||
      raw.includes('matrix view') ||
      raw.includes('switch to matrix') ||
      raw.includes('show all cameras') ||
      raw.includes('all feeds') ||
      raw.includes('9 camera') ||
      raw.includes('nine camera')
    ) {
      match = {
        recognizedCommand: 'Switch to 3x3 Matrix',
        action: { type: 'SET_MATRIX_LAYOUT', layout: 'matrix-3x3' },
      };
    } else if (
      raw.includes('spotlight') ||
      raw.includes('switch to spotlight') ||
      raw.includes('focus camera') ||
      raw.includes('single camera')
    ) {
      match = {
        recognizedCommand: 'Switch to Spotlight View',
        action: { type: 'SET_MATRIX_LAYOUT', layout: 'spotlight' },
      };
    } else if (raw.includes('patrol mode') || raw.includes('start patrol') || raw.includes('patrol cameras')) {
      match = {
        recognizedCommand: 'Toggle Patrol Mode',
        action: { type: 'TOGGLE_PATROL' },
      };
    }

    // 2. Navigation Commands
    else if (
      raw.includes('show alerts') ||
      raw.includes('view alerts') ||
      raw.includes('open alerts') ||
      raw.includes('go to alerts') ||
      raw === 'alerts'
    ) {
      match = {
        recognizedCommand: 'Show Alerts View',
        action: { type: 'NAVIGATE', view: 'alerts' },
      };
    } else if (
      raw.includes('show dashboard') ||
      raw.includes('go to dashboard') ||
      raw.includes('main dashboard') ||
      raw.includes('home') ||
      raw === 'dashboard'
    ) {
      match = {
        recognizedCommand: 'Show Main Dashboard',
        action: { type: 'NAVIGATE', view: 'dashboard' },
      };
    } else if (
      raw.includes('mission control') ||
      raw.includes('show mission') ||
      raw.includes('control center')
    ) {
      match = {
        recognizedCommand: 'Show Mission Control',
        action: { type: 'NAVIGATE', view: 'mission-control' },
      };
    } else if (
      raw.includes('camera fleet') ||
      raw.includes('show cameras') ||
      raw.includes('camera grid') ||
      raw.includes('fleet management')
    ) {
      match = {
        recognizedCommand: 'Show Camera Fleet',
        action: { type: 'NAVIGATE', view: 'camera-fleet' },
      };
    } else if (
      raw.includes('evidence') ||
      raw.includes('evidence queue') ||
      raw.includes('forensic evidence') ||
      raw.includes('recorded clips')
    ) {
      match = {
        recognizedCommand: 'Show Forensic Evidence Queue',
        action: { type: 'NAVIGATE', view: 'evidence-queue' },
      };
    } else if (
      raw.includes('diagnostics') ||
      raw.includes('system health') ||
      raw.includes('hardware health')
    ) {
      match = {
        recognizedCommand: 'Show Camera Health Diagnostics',
        action: { type: 'NAVIGATE', view: 'diagnostics' },
      };
    } else if (
      raw.includes('analytics') ||
      raw.includes('show charts') ||
      raw.includes('statistics')
    ) {
      match = {
        recognizedCommand: 'Show Analytics Dashboard',
        action: { type: 'NAVIGATE', view: 'analytics' },
      };
    } else if (
      raw.includes('historical logs') ||
      raw.includes('history') ||
      raw.includes('incident logs')
    ) {
      match = {
        recognizedCommand: 'Show Historical Logs',
        action: { type: 'NAVIGATE', view: 'historical-logs' },
      };
    } else if (
      raw.includes('stitching') ||
      raw.includes('multi camera stitching') ||
      raw.includes('panoramic')
    ) {
      match = {
        recognizedCommand: 'Show Multi-Cam Stitching View',
        action: { type: 'NAVIGATE', view: 'stitching' },
      };
    } else if (
      raw.includes('live stream') ||
      raw.includes('quad stream') ||
      raw.includes('streaming')
    ) {
      match = {
        recognizedCommand: 'Show Quad Live Stream',
        action: { type: 'NAVIGATE', view: 'livestream' },
      };
    } else if (
      raw.includes('settings') ||
      raw.includes('configuration') ||
      raw.includes('preferences')
    ) {
      match = {
        recognizedCommand: 'Show Settings & Audio Configuration',
        action: { type: 'NAVIGATE', view: 'settings' },
      };
    }

    // 3. System & Tactical Operations
    else if (
      raw.includes('simulate intrusion') ||
      raw.includes('simulate breach') ||
      raw.includes('trigger alarm') ||
      raw.includes('test breach') ||
      raw.includes('simulate alert')
    ) {
      match = {
        recognizedCommand: 'Simulate Perimeter Breach Alert',
        action: { type: 'SIMULATE_INTRUSION' },
      };
    } else if (
      raw.includes('mute audio') ||
      raw.includes('mute alerts') ||
      raw.includes('silence alarm') ||
      raw.includes('mute sound')
    ) {
      match = {
        recognizedCommand: 'Mute Audio Alerts',
        action: { type: 'MUTE_AUDIO', muted: true },
      };
    } else if (
      raw.includes('unmute audio') ||
      raw.includes('unmute alerts') ||
      raw.includes('enable sound') ||
      raw.includes('enable audio')
    ) {
      match = {
        recognizedCommand: 'Unmute Audio Alerts',
        action: { type: 'MUTE_AUDIO', muted: false },
      };
    } else if (
      raw.includes('dark mode') ||
      raw.includes('daylight mode') ||
      raw.includes('toggle theme') ||
      raw.includes('matrix theme')
    ) {
      match = {
        recognizedCommand: 'Toggle Visual Theme',
        action: { type: 'TOGGLE_THEME' },
      };
    } else if (
      raw.includes('auto focus') ||
      raw.includes('calibrate feeds') ||
      raw.includes('recalibrate') ||
      raw.includes('calibrate camera')
    ) {
      match = {
        recognizedCommand: 'Calibrate Camera Feeds (Auto-Focus)',
        action: { type: 'AUTO_FOCUS_ALL' },
      };
    } else if (
      raw.includes('demo guide') ||
      raw.includes('sih demo') ||
      raw.includes('presentation')
    ) {
      match = {
        recognizedCommand: 'Open SIH 23-Point Live Demo Guide',
        action: { type: 'OPEN_DEMO_GUIDE' },
      };
    } else if (
      raw.includes('generate report') ||
      raw.includes('open reports') ||
      raw.includes('export pdf')
    ) {
      match = {
        recognizedCommand: 'Open Forensic Reports Modal',
        action: { type: 'OPEN_REPORTS' },
      };
    } else if (raw.includes('refresh') || raw.includes('reload telemetry')) {
      match = {
        recognizedCommand: 'Refresh Feed Telemetry',
        action: { type: 'REFRESH' },
      };
    }

    if (match) {
      const fullMatch: VoiceCommandMatch = {
        rawTranscript: transcript,
        recognizedCommand: match.recognizedCommand,
        action: match.action,
        confidence,
      };

      this.lastMatch = fullMatch;
      this.showFeedback(`✓ Executed: "${match.recognizedCommand}"`);
      this.notifyState();

      // Dispatch to all registered action listeners
      this.commandListeners.forEach((fn) => {
        try {
          fn(fullMatch);
        } catch (err) {
          console.error('Command listener execution error:', err);
        }
      });

      return fullMatch;
    } else {
      this.showFeedback(`Heard: "${transcript}" (Say "Help" or "Switch to quad view")`, 2500);
      return null;
    }
  }
}

export const voiceCommandService = new VoiceCommandService();
