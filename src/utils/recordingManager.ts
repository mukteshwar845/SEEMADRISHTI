import { CameraFeed, RecordedClip } from '../types';

export interface ActiveRecording {
  cameraId: string;
  cameraCode: string;
  cameraName: string;
  location: string;
  rtspUrl: string;
  resolution: string;
  fps: number;
  startTimestamp: number;
  startTimeFormatted: string;
  framesCaptured: number;
  triggerType: 'manual' | 'anomaly_auto';
  tags: string[];
}

type RecordingListener = (activeRecordings: Map<string, ActiveRecording>, savedClips: RecordedClip[]) => void;

const SESSION_STORAGE_KEY = 'seemadrishti_session_recorded_clips_v1';

// Initial baseline mock recordings for the session
const INITIAL_SESSION_CLIPS: RecordedClip[] = [
  {
    id: 'clip-rec-20260824-001',
    cameraId: 'cam-2',
    cameraCode: 'CAM-02',
    cameraName: 'PERIMETER_NW_04',
    location: 'Perimeter Sector Alpha-North',
    rtspUrl: 'rtsp://192.168.1.102:554/live/ch0',
    startTime: '10:14:02 AM',
    endTime: '10:14:48 AM',
    startTimestamp: Date.now() - 42 * 60 * 1000,
    endTimestamp: Date.now() - 41 * 60 * 1000,
    durationSeconds: 46,
    fileSizeMb: 18.4,
    resolution: '3840x2160 (4K)',
    fps: 30,
    thumbnailUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
    tags: ['INTRUSION', 'PERIMETER BREACH', 'NIGHT IR'],
    triggerType: 'anomaly_auto',
    eventsDetectedCount: 3,
    dangerZoneBreach: true,
  },
  {
    id: 'clip-rec-20260824-002',
    cameraId: 'cam-1',
    cameraCode: 'CAM-01',
    cameraName: 'MAIN_GATE_ALPHA_01',
    location: 'Vehicle Checkpoint Alpha',
    rtspUrl: 'rtsp://192.168.1.101:554/live/ch0',
    startTime: '09:32:15 AM',
    endTime: '09:33:35 AM',
    startTimestamp: Date.now() - 85 * 60 * 1000,
    endTimestamp: Date.now() - 83 * 60 * 1000,
    durationSeconds: 80,
    fileSizeMb: 24.2,
    resolution: '1920x1080 (FHD)',
    fps: 60,
    thumbnailUrl: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80',
    tags: ['VEHICLE ANPR', 'BARRIER CROSSING', 'ROUTINE CHECK'],
    triggerType: 'manual',
    eventsDetectedCount: 5,
    dangerZoneBreach: false,
  },
  {
    id: 'clip-rec-20260824-003',
    cameraId: 'cam-3',
    cameraCode: 'CAM-03',
    cameraName: 'ARMORY_BAY_A_02',
    location: 'Munitions Storage Airlock',
    rtspUrl: 'rtsp://192.168.1.103:554/live/ch0',
    startTime: '08:45:00 AM',
    endTime: '08:46:12 AM',
    startTimestamp: Date.now() - 140 * 60 * 1000,
    endTimestamp: Date.now() - 138 * 60 * 1000,
    durationSeconds: 72,
    fileSizeMb: 21.8,
    resolution: '2560x1440 (2K)',
    fps: 30,
    thumbnailUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
    tags: ['AIRLOCK SEAL', 'THERMAL SCAN', 'AUTHORIZED PATROL'],
    triggerType: 'manual',
    eventsDetectedCount: 2,
    dangerZoneBreach: false,
  },
];

class RecordingSessionEngine {
  private activeRecordings: Map<string, ActiveRecording> = new Map();
  private savedClips: RecordedClip[] = [];
  private listeners: Set<RecordingListener> = new Set();
  private tickerInterval: any = null;

  constructor() {
    this.loadFromSession();
    this.startTicker();
  }

  private loadFromSession() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.savedClips = parsed;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read session storage for clips', e);
    }
    this.savedClips = [...INITIAL_SESSION_CLIPS];
    this.saveToSession();
  }

  private saveToSession() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.savedClips));
      }
    } catch (e) {
      console.warn('Could not save clips to session storage', e);
    }
  }

  private startTicker() {
    if (typeof window !== 'undefined' && !this.tickerInterval) {
      this.tickerInterval = setInterval(() => {
        if (this.activeRecordings.size > 0) {
          // Increment frame count and notify listeners for live timer update
          this.activeRecordings.forEach((rec) => {
            rec.framesCaptured += Math.round(rec.fps / 2);
          });
          this.notify();
        }
      }, 500);
    }
  }

  public subscribe(listener: RecordingListener): () => void {
    this.listeners.add(listener);
    listener(new Map(this.activeRecordings), [...this.savedClips]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const activeCopy = new Map(this.activeRecordings);
    const clipsCopy = [...this.savedClips];
    this.listeners.forEach((listener) => {
      try {
        listener(activeCopy, clipsCopy);
      } catch (err) {
        console.error('Error in recording listener', err);
      }
    });
  }

  public isRecording(cameraId: string): boolean {
    return this.activeRecordings.has(cameraId);
  }

  public getActiveRecording(cameraId: string): ActiveRecording | undefined {
    return this.activeRecordings.get(cameraId);
  }

  public getRecordingDuration(cameraId: string): number {
    const rec = this.activeRecordings.get(cameraId);
    if (!rec) return 0;
    return Math.max(0, Math.floor((Date.now() - rec.startTimestamp) / 1000));
  }

  public startRecording(
    camera: CameraFeed,
    triggerType: 'manual' | 'anomaly_auto' = 'manual',
    customTags?: string[]
  ): ActiveRecording {
    if (this.activeRecordings.has(camera.id)) {
      return this.activeRecordings.get(camera.id)!;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    const newActive: ActiveRecording = {
      cameraId: camera.id,
      cameraCode: camera.code || 'CAM',
      cameraName: camera.name || 'RTSP Feed',
      location: camera.location || 'Surveillance Sector',
      rtspUrl: camera.rtspUrl || '',
      resolution: camera.resolution || '1080p',
      fps: camera.fps || 30,
      startTimestamp: Date.now(),
      startTimeFormatted: timeStr,
      framesCaptured: 0,
      triggerType,
      tags: customTags || (triggerType === 'anomaly_auto' ? ['ANOMALY TRIGGER', 'RTSP CAPTURE'] : ['MANUAL REC', 'RTSP STREAM']),
    };

    this.activeRecordings.set(camera.id, newActive);
    this.notify();
    return newActive;
  }

  public stopRecording(cameraId: string): RecordedClip | null {
    const active = this.activeRecordings.get(cameraId);
    if (!active) return null;

    const endTimestamp = Date.now();
    const durationSeconds = Math.max(1, Math.floor((endTimestamp - active.startTimestamp) / 1000));
    const now = new Date();
    const endTime = now.toLocaleTimeString();

    // Calculate simulated file size based on bitrate / resolution and duration
    const bitrateMbps = active.resolution.includes('4K') ? 16 : active.resolution.includes('2K') ? 8 : 4;
    const fileSizeMb = Number(((durationSeconds * (bitrateMbps / 8)) * 0.85).toFixed(1));

    // Thumbnail selection based on camera ID
    let thumbnail = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80';
    if (cameraId === 'cam-1') {
      thumbnail = 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80';
    } else if (cameraId === 'cam-3') {
      thumbnail = 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80';
    } else if (cameraId === 'cam-4') {
      thumbnail = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
    }

    const newClip: RecordedClip = {
      id: `clip-rec-${Date.now()}-${active.cameraCode.toLowerCase()}`,
      cameraId: active.cameraId,
      cameraCode: active.cameraCode,
      cameraName: active.cameraName,
      location: active.location,
      rtspUrl: active.rtspUrl,
      startTime: active.startTimeFormatted,
      endTime,
      startTimestamp: active.startTimestamp,
      endTimestamp,
      durationSeconds,
      fileSizeMb: Math.max(0.5, fileSizeMb),
      resolution: active.resolution,
      fps: active.fps,
      thumbnailUrl: thumbnail,
      tags: active.tags,
      triggerType: active.triggerType,
      eventsDetectedCount: Math.floor(Math.random() * 4) + 1,
      dangerZoneBreach: active.triggerType === 'anomaly_auto',
    };

    // Remove from active
    this.activeRecordings.delete(cameraId);

    // Prepend to saved session clips
    this.savedClips = [newClip, ...this.savedClips];
    this.saveToSession();
    this.notify();

    return newClip;
  }

  public stopAllRecordings(): RecordedClip[] {
    const stoppedClips: RecordedClip[] = [];
    const activeIds = Array.from(this.activeRecordings.keys());
    activeIds.forEach((id) => {
      const clip = this.stopRecording(id);
      if (clip) stoppedClips.push(clip);
    });
    return stoppedClips;
  }

  public toggleRecording(camera: CameraFeed): { isRecording: boolean; clip?: RecordedClip } {
    if (this.isRecording(camera.id)) {
      const clip = this.stopRecording(camera.id);
      return { isRecording: false, clip: clip || undefined };
    } else {
      this.startRecording(camera);
      return { isRecording: true };
    }
  }

  public getSavedClips(): RecordedClip[] {
    return [...this.savedClips];
  }

  public deleteClip(clipId: string) {
    this.savedClips = this.savedClips.filter((c) => c.id !== clipId);
    this.saveToSession();
    this.notify();
  }

  public clearAllSessionClips() {
    this.savedClips = [];
    this.saveToSession();
    this.notify();
  }

  public resetToDefaults() {
    this.savedClips = [...INITIAL_SESSION_CLIPS];
    this.saveToSession();
    this.notify();
  }
}

export const recordingEngine = new RecordingSessionEngine();
