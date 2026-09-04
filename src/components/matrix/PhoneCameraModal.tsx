import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  QrCode,
  Radio,
  Video,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Shield,
  Wifi,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
} from 'lucide-react';
import { webSocketService } from '../../services/websocketService';
import { getAuthToken } from '../../services/api';

export type SensorModalState =
  | 'IDLE'
  | 'GENERATING_KEY'
  | 'KEY_READY'
  | 'QR_READY'
  | 'WAITING_FOR_SENSOR'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'KEY_GENERATION_FAILED'
  | 'QR_GENERATION_FAILED'
  | 'PAIRING_EXPIRED'
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'SENSOR_DISCONNECTED';

interface PhoneCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCameraId?: string;
  targetCameraName?: string;
  onConnectRtspUrl?: (url: string) => void;
}

export const PhoneCameraModal: React.FC<PhoneCameraModalProps> = ({
  isOpen,
  onClose,
  targetCameraId = 'cam-02',
  targetCameraName = 'Sector Alpha East Perimeter (CAM-02)',
  onConnectRtspUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'rtsp' | 'usb'>('qr');
  const [fsmState, setFsmState] = useState<SensorModalState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Pairing session details
  const [pairingId, setPairingId] = useState<string>('');
  const [directUrl, setDirectUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Runtime connection status
  const [sensorDetails, setSensorDetails] = useState<{
    sensorId?: string;
    camera_id: string;
    connected: boolean;
    transport?: string;
    device?: string;
    lastSeen?: number;
    lastHeartbeatAgo?: number;
  }>({
    camera_id: targetCameraId,
    connected: false,
  });

  // Tab 2: RTSP state
  const [rtspUrl, setRtspUrl] = useState<string>('http://192.168.1.50:8080/video');
  const [rtspTesting, setRtspTesting] = useState(false);
  const [rtspStatus, setRtspStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Tab 3: USB / Hardware Devices state
  const [usbDevices, setUsbDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedUsbId, setSelectedUsbId] = useState<string>('');

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTickerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic transport claim based on actual runtime protocol
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const transportLabel = isHttps ? 'WSS Binary Relay (TLS)' : 'WS Binary Relay (DEV)';

  /**
   * Cancel pending pairing on cleanup or close
   */
  const cancelCurrentPairing = useCallback((pId: string) => {
    if (!pId) return;
    const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('seemadrishti_auth_token') : null);
    fetch(`/api/sensors/pairing/${pId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => {});
  }, []);

  /**
   * Clean up all active timers
   */
  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (heartbeatTickerRef.current) {
      clearInterval(heartbeatTickerRef.current);
      heartbeatTickerRef.current = null;
    }
  }, []);

  /**
   * Generate cryptographically secure pairing session
   */
  const generatePairingSession = useCallback(async () => {
    clearTimers();
    setFsmState('GENERATING_KEY');
    setErrorMessage('');
    setQrDataUrl('');
    setDirectUrl('');
    setPairingId('');

    try {
      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('seemadrishti_auth_token') : null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/sensors/pairing', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          camera_id: targetCameraId.toLowerCase(),
          ttl_seconds: 300,
        }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setFsmState('AUTH_FAILED');
          setErrorMessage('Operator authentication required to issue tactical sensor pairings.');
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to generate cryptographic pairing token');
      }

      const { pairing_id, direct_url, qr_payload, expires_at } = json.data;

      setPairingId(pairing_id);
      setDirectUrl(direct_url);
      setExpiresAt(expires_at);
      setFsmState('KEY_READY');

      // Calculate initial remaining seconds
      const secondsLeft = Math.max(0, Math.round((new Date(expires_at).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      // Render actual QR code from payload
      try {
        const qrUrl = await QRCode.toDataURL(qr_payload || direct_url, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#0284c7',
            light: '#030712',
          },
        });
        setQrDataUrl(qrUrl);
        setFsmState('QR_READY');

        // Transition to WAITING_FOR_SENSOR once QR is displayed
        setTimeout(() => {
          setFsmState((prev) => (prev === 'QR_READY' ? 'WAITING_FOR_SENSOR' : prev));
        }, 300);
      } catch (qrErr: any) {
        console.error('QR code rendering failed:', qrErr);
        setFsmState('QR_GENERATION_FAILED');
        setErrorMessage('Failed to encode QR payload into matrix graphic.');
        return;
      }

      // Start countdown timer
      countdownTimerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            setFsmState('PAIRING_EXPIRED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Key generation error:', err);
      setFsmState('KEY_GENERATION_FAILED');
      setErrorMessage(err.message || 'Cryptographic RNG service unreachable');
    }
  }, [clearTimers, targetCameraId]);

  /**
   * Modal lifecycle management
   */
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      setFsmState('IDLE');
      return;
    }

    generatePairingSession();

    // Query hardware video inputs
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setUsbDevices(videoDevs);
        if (videoDevs.length > 0) setSelectedUsbId(videoDevs[0].deviceId);
      }).catch(() => {});
    }

    // Subscribe to WebSocket phone stream events
    const unsubscribe = webSocketService.onPhoneStreamStatus((data) => {
      if (data && (data.camera_id?.toLowerCase() === targetCameraId.toLowerCase() || data.cam?.toLowerCase() === targetCameraId.toLowerCase())) {
        const isConnected = data.connected || data.status === 'CONNECTED';
        const now = Date.now();

        if (isConnected) {
          setFsmState('CONNECTED');
          setSensorDetails({
            sensorId: data.sensor_id,
            camera_id: targetCameraId,
            connected: true,
            transport: data.transport || (isHttps ? 'WSS' : 'WS'),
            device: data.device,
            lastSeen: now,
            lastHeartbeatAgo: 0,
          });
        } else if (data.status === 'HEARTBEAT_TIMEOUT' || data.status === 'DISCONNECTED') {
          setFsmState('SENSOR_DISCONNECTED');
          setSensorDetails((prev) => ({
            ...prev,
            connected: false,
          }));
        }
      }
    });

    // Background heartbeat ticker for live time calculation
    heartbeatTickerRef.current = setInterval(() => {
      setSensorDetails((prev) => {
        if (!prev.connected || !prev.lastSeen) return prev;
        const diffSec = Math.round((Date.now() - prev.lastSeen) / 1000);
        if (diffSec > 12) {
          setFsmState('SENSOR_DISCONNECTED');
          return { ...prev, connected: false, lastHeartbeatAgo: diffSec };
        }
        return { ...prev, lastHeartbeatAgo: diffSec };
      });
    }, 1000);

    return () => {
      unsubscribe();
      clearTimers();
    };
  }, [isOpen, targetCameraId, clearTimers, generatePairingSession, isHttps]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (pairingId && (fsmState === 'WAITING_FOR_SENSOR' || fsmState === 'KEY_READY' || fsmState === 'QR_READY')) {
      cancelCurrentPairing(pairingId);
    }
    clearTimers();
    onClose();
  };

  const handleCopy = () => {
    if (!directUrl) return;
    navigator.clipboard.writeText(directUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestRtsp = async () => {
    setRtspTesting(true);
    setRtspStatus(null);
    try {
      const res = await fetch('/api/sensors/test-rtsp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rtspUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setRtspStatus({ success: true, message: json.data?.message || 'RTSP Stream verified successfully' });
      } else {
        setRtspStatus({ success: false, message: json.error || 'Connection failed' });
      }
    } catch (err: any) {
      setRtspStatus({ success: false, message: err.message || 'Stream test request failed' });
    } finally {
      setRtspTesting(false);
    }
  };

  const handleApplyRtsp = () => {
    if (onConnectRtspUrl) {
      onConnectRtspUrl(rtspUrl);
    }
    setTimeout(() => {
      handleClose();
    }, 1200);
  };

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-400">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
                TACTICAL EDGE SENSOR INGESTION
                <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 text-[10px] rounded border border-cyan-500/40 font-mono">
                  {targetCameraId.toUpperCase()}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Assigned Target: <span className="text-cyan-300">{targetCameraName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tactical Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-5 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 font-bold cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode size={14} />
            1. QR Sensor Pairing
          </button>
          <button
            onClick={() => setActiveTab('rtsp')}
            className={`pb-2.5 px-3 font-bold cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'rtsp'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={14} />
            2. RTSP / IP Sensor Ingress
          </button>
          <button
            onClick={() => setActiveTab('usb')}
            className={`pb-2.5 px-3 font-bold cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'usb'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video size={14} />
            3. Direct Hardware Ingress
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'qr' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: QR Code Display / FSM Status */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl min-h-[290px]">
                <div className="p-2 bg-slate-950 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                  {fsmState === 'GENERATING_KEY' && (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-cyan-400 text-xs font-mono space-y-2">
                      <RefreshCw className="animate-spin text-cyan-400" size={24} />
                      <span>Generating Cryptographic Key...</span>
                    </div>
                  )}

                  {(fsmState === 'KEY_READY' || fsmState === 'QR_READY' || fsmState === 'WAITING_FOR_SENSOR' || fsmState === 'CONNECTING') && (
                    qrDataUrl ? (
                      <img src={qrDataUrl} alt="Mobile Camera QR Code" className="w-48 h-48 rounded" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
                        Rendering Secure QR...
                      </div>
                    )
                  )}

                  {fsmState === 'CONNECTED' && (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-emerald-400 text-xs font-mono p-3 text-center space-y-2">
                      <CheckCircle2 size={36} className="text-emerald-400" />
                      <span className="font-bold text-sm">SENSOR LINK ACTIVE</span>
                      <span className="text-[10px] text-slate-400">Streaming frames to {targetCameraId.toUpperCase()}</span>
                    </div>
                  )}

                  {fsmState === 'PAIRING_EXPIRED' && (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-amber-400 text-xs font-mono p-3 text-center space-y-2">
                      <Clock size={32} className="text-amber-400" />
                      <span className="font-bold">PAIRING EXPIRED</span>
                      <p className="text-[10px] text-slate-400">The 5-minute cryptographic token has expired.</p>
                      <button
                        onClick={generatePairingSession}
                        className="mt-2 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Generate New Pairing
                      </button>
                    </div>
                  )}

                  {(fsmState === 'KEY_GENERATION_FAILED' || fsmState === 'QR_GENERATION_FAILED' || fsmState === 'AUTH_FAILED') && (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-rose-400 text-xs font-mono p-3 text-center space-y-2">
                      <AlertTriangle size={32} className="text-rose-400" />
                      <span className="font-bold">PAIRING ERROR</span>
                      <p className="text-[10px] text-slate-400 leading-tight">{errorMessage || 'Unable to establish secure handshake'}</p>
                      <button
                        onClick={generatePairingSession}
                        className="mt-2 px-3 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    </div>
                  )}

                  {fsmState === 'SENSOR_DISCONNECTED' && (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-amber-400 text-xs font-mono p-3 text-center space-y-2">
                      <AlertTriangle size={32} className="text-amber-400" />
                      <span className="font-bold">SENSOR OFFLINE</span>
                      <p className="text-[10px] text-slate-400">Heartbeat timed out (&gt;10s). Sensor disconnected.</p>
                      <button
                        onClick={generatePairingSession}
                        className="mt-2 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Re-Pair Sensor
                      </button>
                    </div>
                  )}
                </div>

                {/* Expiration Countdown or Pairing Status */}
                <div className="mt-3 flex items-center justify-between w-full px-2">
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                    <Shield size={12} />
                    {fsmState === 'CONNECTED'
                      ? 'AUTHENTICATED SENSOR CONNECTED'
                      : fsmState === 'WAITING_FOR_SENSOR'
                      ? 'SCAN TO PAIR TACTICAL EDGE SENSOR'
                      : fsmState === 'PAIRING_EXPIRED'
                      ? 'TOKEN EXPIRED'
                      : 'TACTICAL EDGE SENSOR PROTOCOL'}
                  </span>
                  {(fsmState === 'WAITING_FOR_SENSOR' || fsmState === 'KEY_READY' || fsmState === 'QR_READY') && (
                    <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                      <Clock size={10} /> {formatCountdown(remainingSeconds)}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Connection Specifications & Truthful Live Status */}
              <div className="space-y-3 font-mono">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Shield size={14} />
                      TACTICAL EDGE SENSOR PROTOCOL
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      HMAC-SHA256 AUTHENTICATED
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500 text-[9px] block">INGESTION TARGET:</span>
                      <span className="text-cyan-300 font-bold">{targetCameraId.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">SECURITY ZONE:</span>
                      <span className="text-slate-200">{targetCameraName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">STREAM CARRIER:</span>
                      <span className="text-purple-300">{transportLabel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">NEURAL PIPELINE:</span>
                      <span className="text-emerald-400">YOLOv8 + ByteTrack (CENTRAL CV)</span>
                    </div>
                  </div>
                </div>

                {/* Direct Pairing Link Box */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>DIRECT SENSOR PAIRING LINK:</span>
                    {fsmState === 'PAIRING_EXPIRED' && (
                      <span className="text-amber-400 text-[9px]">EXPIRED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={directUrl || (fsmState === 'GENERATING_KEY' ? 'Generating Cryptographic Link...' : '')}
                      placeholder="Generating Secure Pairing Link..."
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-cyan-300 text-[11px] rounded font-mono outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      disabled={!directUrl}
                      title="Copy Mobile URL"
                      className="p-1.5 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 border border-cyan-500/40 rounded cursor-pointer transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    {directUrl && (
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in new tab to test sensor stream"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded cursor-pointer transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Truthful Connection Status Bar */}
                <div
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    fsmState === 'CONNECTED'
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : fsmState === 'SENSOR_DISCONNECTED'
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      : fsmState === 'PAIRING_EXPIRED'
                      ? 'bg-slate-900 border-amber-600/40 text-amber-400'
                      : fsmState === 'GENERATING_KEY'
                      ? 'bg-slate-900/50 border-cyan-600/30 text-cyan-400'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          fsmState === 'CONNECTED'
                            ? 'bg-emerald-400 animate-ping'
                            : fsmState === 'SENSOR_DISCONNECTED'
                            ? 'bg-amber-400'
                            : fsmState === 'GENERATING_KEY'
                            ? 'bg-cyan-400 animate-pulse'
                            : 'bg-slate-500'
                        }`}
                      ></span>
                      <span className="font-semibold">
                        {fsmState === 'CONNECTED'
                          ? `CONNECTED: ${sensorDetails.sensorId || 'Tactical Edge Sensor'}`
                          : fsmState === 'SENSOR_DISCONNECTED'
                          ? 'SENSOR DISCONNECTED (Heartbeat timeout)'
                          : fsmState === 'PAIRING_EXPIRED'
                          ? 'PAIRING TOKEN EXPIRED'
                          : fsmState === 'GENERATING_KEY'
                          ? 'GENERATING SECURE PAIRING...'
                          : 'WAITING FOR SENSOR SCAN...'}
                      </span>
                    </div>
                    {fsmState === 'CONNECTED' && (
                      <span className="text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded font-bold">
                        HB: {sensorDetails.lastHeartbeatAgo ?? 0}s ago
                      </span>
                    )}
                  </div>
                </div>

                {/* Connection Details Panel (Runtime Derived) */}
                {fsmState === 'CONNECTED' && (
                  <div className="p-3 bg-slate-900/80 border border-emerald-500/30 rounded-lg text-[10px] space-y-1 text-slate-300 font-mono">
                    <div className="text-emerald-400 font-bold text-[11px] mb-1 flex items-center gap-1">
                      <Activity size={12} /> TACTICAL TELEMETRY ACTIVE
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SENSOR ID:</span>
                      <span className="text-cyan-300 font-bold">{sensorDetails.sensorId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CAMERA BINDING:</span>
                      <span className="text-slate-200">{targetCameraId.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TRANSPORT:</span>
                      <span className="text-purple-300">{sensorDetails.transport || (isHttps ? 'WSS' : 'WS')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">AUTH PROTOCOL:</span>
                      <span className="text-emerald-400">VERIFIED (HMAC-SHA256)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">LAST HEARTBEAT:</span>
                      <span className="text-slate-200">{sensorDetails.lastHeartbeatAgo ?? 0}s ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CV PIPELINE:</span>
                      <span className="text-cyan-300 font-semibold">YOLOv8 + ByteTrack (CENTRAL CV)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rtsp' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Radio size={14} className="text-amber-400" />
                  Connect Mobile App RTSP / HTTP Feed:
                </div>
                <p className="text-[11px] text-slate-400">
                  Supported formats: <strong>RTSP (H.264 / AAC)</strong> or <strong>HTTP MJPEG</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-bold text-[11px]">Stream URL / Ingestion Endpoint:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rtspUrl}
                    onChange={(e) => setRtspUrl(e.target.value)}
                    placeholder="http://192.168.1.50:8080/video or rtsp://..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 text-amber-300 text-xs rounded font-mono outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleTestRtsp}
                    disabled={rtspTesting}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs cursor-pointer font-bold transition-colors"
                  >
                    {rtspTesting ? <RefreshCw size={14} className="animate-spin" /> : 'TEST URL'}
                  </button>
                </div>
              </div>

              {rtspStatus && (
                <div
                  className={`p-2.5 rounded border text-xs ${
                    rtspStatus.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {rtspStatus.message}
                </div>
              )}

              {/* Quick Presets */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Quick URL Presets:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setRtspUrl('http://192.168.1.50:8080/video')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded cursor-pointer"
                  >
                    IP Webcam (HTTP MJPEG)
                  </button>
                  <button
                    onClick={() => setRtspUrl('rtsp://192.168.1.50:8080/h264_pcm.sdp')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded cursor-pointer"
                  >
                    IP Webcam (RTSP H.264)
                  </button>
                  <button
                    onClick={() => setRtspUrl('http://192.168.1.50:4747/video')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded cursor-pointer"
                  >
                    DroidCam
                  </button>
                  <button
                    onClick={() => setRtspUrl('rtsp://admin:admin123@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded cursor-pointer"
                  >
                    Hikvision / CP PLUS
                  </button>
                </div>
              </div>

              {/* Command Line Helper */}
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400">
                <div className="text-[9px] text-cyan-400 mb-1 font-bold">TERMINAL COMMAND TO RUN HIGH-PERFORMANCE CV SERVICE:</div>
                <code className="text-emerald-300 select-all block bg-black/60 p-1.5 rounded">
                  python cv_service/main.py --source &quot;{rtspUrl}&quot; --camera-id {targetCameraId.toLowerCase()}
                </code>
              </div>

              <button
                onClick={handleApplyRtsp}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <Radio size={16} />
                CONNECT FEED TO {targetCameraId.toUpperCase()}
              </button>
            </div>
          )}

          {activeTab === 'usb' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Video size={14} className="text-cyan-400" />
                  Select Connected USB / Desktop Video Device:
                </div>
                <p className="text-[11px] text-slate-400">
                  Direct hardware device ingestion uses browser <code>getUserMedia()</code> capture forwarded through the authenticated ingestion gateway to Central YOLOv8 + ByteTrack.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-bold text-[11px]">Detected Physical Hardware Devices:</label>
                {usbDevices.length > 0 ? (
                  <select
                    value={selectedUsbId}
                    onChange={(e) => setSelectedUsbId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded font-mono outline-none"
                  >
                    {usbDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Hardware Device #${i + 1} (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-slate-900 text-slate-400 text-xs rounded">
                    No physical external hardware capture cards or USB cameras reported by browser device registry.
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400">
                <div className="text-[9px] text-cyan-400 mb-1 font-bold">TACTICAL HARDWARE INGRESS ARCHITECTURE:</div>
                <div>Webcam / Capture Device &rarr; getUserMedia() &rarr; Node Gateway &rarr; Python CV &rarr; YOLOv8 &rarr; Tactical Matrix.</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <Shield size={12} className="text-cyan-400" />
            <span>SEEMADRISHTI TACTICAL INGESTION GATEWAY</span>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-lg cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
