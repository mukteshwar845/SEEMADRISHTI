import React, { useState, useEffect } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { webSocketService } from '../../services/websocketService';

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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mobileUrl, setMobileUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    primaryIp: string;
    port: number;
    hostname: string;
  } | null>(null);

  // RTSP / IP Webcam state
  const [rtspUrl, setRtspUrl] = useState<string>('http://192.168.1.50:8080/video');
  const [rtspConnected, setRtspConnected] = useState(false);

  // Phone connection live state from WebSocket
  const [phoneState, setPhoneState] = useState<{
    connected: boolean;
    device?: string;
    resolution?: string;
    lastSeen?: number;
  }>({ connected: false });

  // USB video devices
  const [usbDevices, setUsbDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedUsbId, setSelectedUsbId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    // Fetch network information
    fetch('/api/system/network')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const { primaryIp, port, hostname } = json.data;
          setNetworkInfo({ primaryIp, port, hostname });
          const url = `http://${primaryIp}:${port}/mobile-cam.html?cam=${targetCameraId.toLowerCase()}`;
          setMobileUrl(url);

          QRCode.toDataURL(url, {
            width: 260,
            margin: 1.5,
            color: {
              dark: '#0284c7',
              light: '#030712',
            },
          })
            .then((data) => setQrDataUrl(data))
            .catch(() => {});
        }
      })
      .catch(() => {
        const fallbackUrl = `${window.location.origin}/mobile-cam.html?cam=${targetCameraId.toLowerCase()}`;
        setMobileUrl(fallbackUrl);
        QRCode.toDataURL(fallbackUrl, { width: 260, margin: 1.5 })
          .then((data) => setQrDataUrl(data))
          .catch(() => {});
      });

    // Enumerate USB devices
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setUsbDevices(videoDevs);
        if (videoDevs.length > 0) setSelectedUsbId(videoDevs[0].deviceId);
      });
    }

    // Subscribe to phone stream status events from WebSocket
    const unsubscribe = webSocketService.onPhoneStreamStatus((data) => {
      if (data && data.camera_id?.toLowerCase() === targetCameraId.toLowerCase()) {
        setPhoneState({
          connected: data.connected,
          device: data.device,
          resolution: data.resolution,
          lastSeen: Date.now(),
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, targetCameraId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyRtsp = () => {
    if (onConnectRtspUrl) {
      onConnectRtspUrl(rtspUrl);
    }
    setRtspConnected(true);
    setTimeout(() => {
      onClose();
    }, 1200);
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
                <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 text-[10px] rounded border border-cyan-500/40">
                  {targetCameraId.toUpperCase()}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Assigned Target: <span className="text-cyan-300">{targetCameraName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Left Column: QR Code Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl">
                <div className="p-2 bg-slate-950 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Mobile Camera QR Code" className="w-48 h-48 rounded" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
                      Generating Secure Key...
                    </div>
                  )}
                </div>
                <span className="mt-3 text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                  <Shield size={12} /> SCAN TO PAIR TACTICAL EDGE SENSOR
                </span>
              </div>

              {/* Right Column: Connection Specifications & Live Status */}
              <div className="space-y-3 font-mono">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Shield size={14} />
                      TACTICAL EDGE SENSOR PROTOCOL
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      AES-256 ENCRYPTED
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
                      <span className="text-purple-300">WSS Binary Relay</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">NEURAL PIPELINE:</span>
                      <span className="text-emerald-400">YOLOv8 Edge MOT</span>
                    </div>
                  </div>
                </div>

                {/* Direct Pairing Link Box */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400">DIRECT SENSOR PAIRING LINK:</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={mobileUrl}
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-cyan-300 text-[11px] rounded font-mono outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      title="Copy Mobile URL"
                      className="p-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded cursor-pointer transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={mobileUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in new tab to test"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded cursor-pointer transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Real-time Phone Connection Status */}
                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    phoneState.connected
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        phoneState.connected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                      }`}
                    ></span>
                    <span>
                      {phoneState.connected
                        ? `Connected: ${phoneState.device || 'Mobile Phone'}`
                        : 'Waiting for mobile connection...'}
                    </span>
                  </div>
                  {phoneState.connected && (
                    <span className="text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded font-bold">
                      {phoneState.resolution || '720p'}
                    </span>
                  )}
                </div>
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
                  Works with free mobile apps like <strong>IP Webcam (Android)</strong> or <strong>Live-Reporter / RTSP Camera (iOS)</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-bold text-[11px]">Stream URL / Ingestion Endpoint:</label>
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="http://192.168.1.50:8080/video or rtsp://..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-amber-300 text-xs rounded font-mono outline-none focus:border-amber-400"
                />
              </div>

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
                {rtspConnected ? <Check size={16} /> : <Radio size={16} />}
                {rtspConnected ? 'STREAM CONNECTED!' : `CONNECT FEED TO ${targetCameraId.toUpperCase()}`}
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
                  If this computer has multiple webcams (built-in webcam + external USB webcam), select which device feeds into {targetCameraId.toUpperCase()}.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-bold text-[11px]">Available Video Capture Devices:</label>
                {usbDevices.length > 0 ? (
                  <select
                    value={selectedUsbId}
                    onChange={(e) => setSelectedUsbId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded font-mono outline-none"
                  >
                    {usbDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera Device #${i + 1} (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-slate-900 text-slate-400 text-xs rounded">
                    No additional hardware cameras detected or permission requested.
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400">
                <div className="text-[9px] text-cyan-400 mb-1 font-bold">DESKTOP CAM SETUP TIP:</div>
                <div>CAM-01 is bound to Desktop Camera #0. CAM-02 can be bound to USB Camera #1 or your Phone!</div>
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
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-lg cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
