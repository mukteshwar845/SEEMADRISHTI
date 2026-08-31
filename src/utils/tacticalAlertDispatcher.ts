import { webSocketService } from '../services/websocketService';
import { audioAlertEngine } from './audioAlert';
import { AlertItem } from '../types';

export interface AlertTriggerParams {
  cameraId: string;
  cameraName: string;
  trackId: number;
  className: 'human' | 'vehicle' | 'animal' | 'object' | string;
  type: 'SUSPICIOUS_AREA' | 'LINE_CROSSING';
  lineName?: string;
  riskScore?: number;
}

class TacticalAlertDispatcher {
  private lastAlertTimes: Map<string, number> = new Map();
  private isVoiceMuted: boolean = false;
  private onAlertListeners: Set<(alert: AlertItem) => void> = new Set();

  public setVoiceMuted(muted: boolean) {
    this.isVoiceMuted = muted;
  }

  public subscribe(cb: (alert: AlertItem) => void): () => void {
    this.onAlertListeners.add(cb);
    return () => this.onAlertListeners.delete(cb);
  }

  public trigger(params: AlertTriggerParams) {
    const { cameraId, cameraName, trackId, className, type, lineName, riskScore } = params;
    const key = `${cameraId}-${trackId}-${type}`;
    const now = Date.now();
    const last = this.lastAlertTimes.get(key) || 0;

    // Cooldown: 12 seconds per target-type event to prevent alert fatigue
    if (now - last < 12000) return;
    this.lastAlertTimes.set(key, now);

    const normClass = className.toLowerCase().trim();
    const classDisplay = normClass === 'person' || normClass === 'human' || normClass === 'intruder' || normClass === 'patrol'
      ? 'Human'
      : normClass === 'car' || normClass === 'truck' || normClass === 'bus' || normClass === 'van' || normClass === 'vehicle' || normClass === 'suv'
      ? 'Vehicle'
      : normClass === 'animal' || normClass === 'dog' || normClass === 'canine' || normClass === 'wildlife' || normClass === 'cattle'
      ? 'Animal'
      : 'Object';

    const isCrossing = type === 'LINE_CROSSING';
    const title = isCrossing
      ? `${classDisplay.toUpperCase()} CROSSING LINE // ${cameraName}`
      : `${classDisplay.toUpperCase()} IN SUSPICIOUS AREA // ${cameraName}`;

    const description = isCrossing
      ? `${classDisplay} #${trackId} crossed ${lineName || 'perimeter security line'} on ${cameraName}. Breach confirmed.`
      : `${classDisplay} #${trackId} detected in suspicious buffer zone near ${lineName || 'border line'} on ${cameraName}.`;

    const voiceMessage = isCrossing
      ? `${classDisplay} crossing line on ${cameraName}`
      : `${classDisplay} in suspicious area near ${lineName || 'border line'}`;

    const alertId = `alt-${now}-${Math.floor(Math.random() * 1000)}`;

    const alertItem: AlertItem = {
      id: alertId,
      title,
      camera: cameraId.toUpperCase(),
      severity: isCrossing ? 'High' : 'Medium',
      time: new Date().toLocaleTimeString(),
      type: isCrossing ? 'TRIPWIRE_CROSSING' : 'SUSPICIOUS_PROXIMITY',
      timestamp: now,
      status: 'active',
      description,
      location: cameraName,
      confidence: 0.95,
      className: normClass,
      riskScore: riskScore || (isCrossing ? 85 : 55),
      riskLevel: isCrossing ? 'CRITICAL' : 'HIGH',
      trackId,
    };

    // 1. Audio tone
    if (isCrossing) {
      audioAlertEngine.playTone('warble_siren');
    } else {
      audioAlertEngine.playTone('electronic_chirp');
    }

    // 2. Speech synthesis announcement
    if (!this.isVoiceMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(voiceMessage);
        utter.rate = 1.1;
        utter.pitch = 1.05;
        utter.volume = 0.95;
        window.speechSynthesis.speak(utter);
      } catch (err) {
        console.warn('[VoiceAlert] Speech synthesis warning:', err);
      }
    }

    // 3. Dispatch to local listeners and WebSocket service
    this.onAlertListeners.forEach((cb) => {
      try {
        cb(alertItem);
      } catch {}
    });

    (webSocketService as any).pushAlert?.(alertItem);

    // 4. Asynchronously persist to backend REST API
    try {
      const numOnly = cameraId.replace(/\D/g, '') || '1';
      const dbCamId = numOnly.length === 1 ? `cam-0${numOnly}` : `cam-${numOnly}`;

      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alertId,
          camera_id: dbCamId,
          severity: isCrossing ? 'High' : 'Medium',
          title,
          reason: description,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}
  }
}

export const tacticalAlertDispatcher = new TacticalAlertDispatcher();
