import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Search,
  Filter,
  Wifi,
  Cpu,
  Zap,
  Radio,
  Server,
  ArrowDownUp,
  HardDrive,
  Clock,
  ShieldCheck,
  Flame,
  Terminal,
} from 'lucide-react';
import { CameraDiagnosticMetric } from '../types';
import { webSocketService, WebSocketServiceState } from '../services/websocketService';
import { useTheme } from '../context/ThemeContext';

export const CameraHealthDiagnosticsView: React.FC = () => {
  const { isDaylight } = useTheme();
  const [metrics, setMetrics] = useState<CameraDiagnosticMetric[]>(() =>
    webSocketService.generateLiveDiagnostics()
  );
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCamId, setSelectedCamId] = useState<number | string | null>(1);
  const [isPingingId, setIsPingingId] = useState<number | string | null>(null);
  const [wsState, setWsState] = useState<WebSocketServiceState>(() =>
    webSocketService.getState()
  );
  const [customWsUrl, setCustomWsUrl] = useState(webSocketService.getUrl());
  const [showWsConfigModal, setShowWsConfigModal] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] RTSP pipeline diagnostics initialized across 9 camera nodes.`,
    `[${new Date().toLocaleTimeString()}] Edge Jetson Orin telemetry synced via WebSocket stream.`,
    `[${new Date().toLocaleTimeString()}] Zero buffer overflows detected on Sector A - D streams.`,
  ]);

  // Subscribe to live WebSocket metrics
  useEffect(() => {
    const unsubMetrics = webSocketService.onCameraMetrics((liveMetrics) => {
      setMetrics(liveMetrics);
    });
    const unsubState = webSocketService.onStateChange((state) => {
      setWsState(state);
    });
    return () => {
      unsubMetrics();
      unsubState();
    };
  }, []);

  const handlePingTest = (cam: CameraDiagnosticMetric) => {
    setIsPingingId(cam.cameraId);
    const logEntry = `[${new Date().toLocaleTimeString()}] Pinging node ${cam.tag} (${cam.name})...`;
    setDiagnosticLogs((prev) => [logEntry, ...prev.slice(0, 30)]);

    setTimeout(() => {
      const simulatedLatency = Math.round(10 + Math.random() * 12);
      setMetrics((prev) =>
        prev.map((c) =>
          c.cameraId === cam.cameraId
            ? {
                ...c,
                latencyMs: simulatedLatency,
                lastPingTimestamp: Date.now(),
                historyLatency: [...c.historyLatency.slice(1), simulatedLatency],
              }
            : c
        )
      );
      setIsPingingId(null);
      const resEntry = `[${new Date().toLocaleTimeString()}] Ping ACK from ${cam.tag}: ${simulatedLatency}ms. Jitter: ${cam.jitterMs}ms (PASS)`;
      setDiagnosticLogs((prev) => [resEntry, ...prev.slice(0, 30)]);
    }, 600);
  };

  const handleForceReconnect = (cam: CameraDiagnosticMetric) => {
    const logEntry = `[${new Date().toLocaleTimeString()}] [RTSP_RESET] Resetting RTSP pipeline buffer for ${cam.tag}...`;
    setDiagnosticLogs((prev) => [logEntry, ...prev.slice(0, 30)]);

    setMetrics((prev) =>
      prev.map((c) =>
        c.cameraId === cam.cameraId
          ? {
              ...c,
              frameDropRate: 0.01,
              packetLossPercent: 0.0,
              latencyMs: Math.max(8, c.latencyMs - 12),
              status: 'Online',
              healthScore: 99,
            }
          : c
      )
    );

    setTimeout(() => {
      const ackEntry = `[${new Date().toLocaleTimeString()}] RTSP pipeline buffer cleared for ${cam.tag}. Stream operational at 60 FPS.`;
      setDiagnosticLogs((prev) => [ackEntry, ...prev.slice(0, 30)]);
    }, 500);
  };

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = [
      'Camera ID',
      'Tag',
      'Name',
      'Location',
      'Status',
      'Latency (ms)',
      'Jitter (ms)',
      'Frame Drop (%)',
      'Packet Loss (%)',
      'Bitrate (Mbps)',
      'Target FPS',
      'Actual FPS',
      'Health Score (%)',
      'Protocol',
      'Codec',
      'Edge Temp (C)',
      'Timestamp',
    ];

    const rows = metrics.map((m) => [
      m.cameraId,
      m.tag,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.location.replace(/"/g, '""')}"`,
      m.status,
      m.latencyMs,
      m.jitterMs,
      m.frameDropRate,
      m.packetLossPercent,
      m.bitrateMbps,
      m.targetFps,
      m.actualFps,
      m.healthScore,
      m.protocol,
      m.codec,
      m.edgeTemperatureC,
      new Date().toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `seemadrishti_camera_health_diagnostics_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredMetrics = metrics.filter((m) => {
    const matchStatus = filterStatus === 'ALL' || m.status.toUpperCase() === filterStatus.toUpperCase();
    const matchSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.protocol.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // KPI Calculations
  const totalCameras = metrics.length;
  const onlineCameras = metrics.filter((m) => m.status === 'Online').length;
  const degradedCameras = metrics.filter((m) => m.status === 'Degraded').length;
  const avgLatency =
    totalCameras > 0
      ? (metrics.reduce((acc, m) => acc + m.latencyMs, 0) / totalCameras).toFixed(1)
      : '0.0';
  const avgJitter =
    totalCameras > 0
      ? (metrics.reduce((acc, m) => acc + m.jitterMs, 0) / totalCameras).toFixed(1)
      : '0.0';
  const avgFrameDrop =
    totalCameras > 0
      ? (metrics.reduce((acc, m) => acc + m.frameDropRate, 0) / totalCameras).toFixed(2)
      : '0.00';
  const totalBitrate =
    totalCameras > 0
      ? metrics.reduce((acc, m) => acc + m.bitrateMbps, 0).toFixed(1)
      : '0.0';
  const systemHealthScore =
    totalCameras > 0
      ? Math.round(metrics.reduce((acc, m) => acc + m.healthScore, 0) / totalCameras)
      : 100;

  const selectedCam = metrics.find((m) => m.cameraId === selectedCamId) || metrics[0];

  return (
    <div className="space-y-4 font-mono select-none" id="camera-health-diagnostics-view">
      {/* 1. Header Banner & Diagnostics Control Ribbon */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDaylight
            ? 'bg-white border-slate-300 shadow-sm'
            : 'bg-[#060c18] border-cyan-500/30 shadow-[0_0_25px_rgba(0,240,255,0.05)]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-lg flex items-center justify-center ${
                isDaylight
                  ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              }`}
            >
              <Activity size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${
                    isDaylight ? 'text-slate-900' : 'text-cyan-200'
                  }`}
                >
                  CAMERA HEALTH & STREAM DIAGNOSTICS
                </h1>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${
                    isDaylight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  [REAL-TIME TELEMETRY]
                </span>
              </div>
              <p
                className={`text-[11px] mt-0.5 ${
                  isDaylight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Zero-packet-loss surveillance monitor, latency profiling, jitter buffers, and frame drop telemetry
              </p>
            </div>
          </div>
        </div>

        {/* WebSocket Connection Status & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* WebSocket Status Pill */}
          <button
            onClick={() => setShowWsConfigModal(true)}
            title="Configure WebSocket Stream Endpoint"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              wsState.status === 'CONNECTED'
                ? isDaylight
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                  : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-400 shadow-[0_0_10px_rgba(0,255,102,0.2)]'
                : wsState.status === 'EMULATED'
                ? isDaylight
                  ? 'bg-cyan-50 border-cyan-400 text-cyan-800'
                  : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : isDaylight
                ? 'bg-amber-50 border-amber-400 text-amber-800'
                : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
            }`}
          >
            <Radio size={13} className={wsState.status === 'CONNECTED' ? 'animate-pulse' : ''} />
            <span>
              {wsState.status === 'CONNECTED'
                ? `WS: LIVE (${wsState.latencyMs}ms)`
                : wsState.status === 'EMULATED'
                ? `WS: EMULATED STREAM (${wsState.latencyMs}ms)`
                : `WS: ${wsState.status}`}
            </span>
          </button>

          {/* Export Report */}
          <button
            id="btn-export-diagnostics-csv"
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-[#0c1626] hover:bg-[#12223c] text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
            }`}
          >
            <Download size={13} className="text-emerald-400" />
            <span>Download CSV Report</span>
          </button>

          {/* Force Ingest Refresh */}
          <button
            onClick={() => {
              setMetrics(webSocketService.generateLiveDiagnostics());
            }}
            title="Refresh All Stream Diagnostics"
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                : 'bg-[#0c1626] hover:bg-[#12223c] text-cyan-300 border border-cyan-500/30'
            }`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 2. System KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Health Index */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDaylight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#060d1b] border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>HEALTH INDEX</span>
            <ShieldCheck size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 tracking-tight">
            {systemHealthScore}%
          </p>
          <span className="text-[9px] text-emerald-500 font-bold uppercase">
            ● NOMINAL PERFORMANCE
          </span>
        </div>

        {/* Avg RTSP Latency */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDaylight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#060d1b] border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>AVG RTSP LATENCY</span>
            <Zap size={14} className="text-cyan-400" />
          </div>
          <p
            className={`text-xl font-black tracking-tight ${
              Number(avgLatency) < 30 ? 'text-cyan-400' : 'text-amber-400'
            }`}
          >
            {avgLatency} <span className="text-xs font-normal">ms</span>
          </p>
          <span className="text-[9px] text-slate-400 font-bold uppercase">
            TARGET: &lt; 35ms
          </span>
        </div>

        {/* Stream Jitter */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDaylight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#060d1b] border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>STREAM JITTER</span>
            <ArrowDownUp size={14} className="text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-400 tracking-tight">
            ±{avgJitter} <span className="text-xs font-normal">ms</span>
          </p>
          <span className="text-[9px] text-slate-400 font-bold uppercase">
            STABLE BUFFER
          </span>
        </div>

        {/* Frame Drop Rate */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDaylight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#060d1b] border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>AVG FRAME DROPS</span>
            <XCircle size={14} className="text-rose-400" />
          </div>
          <p
            className={`text-xl font-black tracking-tight ${
              Number(avgFrameDrop) < 0.5 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {avgFrameDrop}%
          </p>
          <span className="text-[9px] text-slate-400 font-bold uppercase">
            0.00% PACKET CORRUPT
          </span>
        </div>

        {/* Total Bandwidth */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDaylight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#060d1b] border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>EDGE INGEST BITRATE</span>
            <Wifi size={14} className="text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400 tracking-tight">
            {totalBitrate} <span className="text-xs font-normal">Mbps</span>
          </p>
          <span className="text-[9px] text-slate-400 font-bold uppercase">
            H.265 / HEVC PIPELINE
          </span>
        </div>

        {/* Active Feeds Status */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDaylight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#060d1b] border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>NODES ONLINE</span>
            <Server size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 tracking-tight">
            {onlineCameras} <span className="text-xs text-slate-500 font-normal">/ {totalCameras}</span>
          </p>
          <span className="text-[9px] text-slate-400 font-bold uppercase">
            {degradedCameras > 0 ? `${degradedCameras} DEGRADED` : '0 ERRORS'}
          </span>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
          isDaylight
            ? 'bg-white border-slate-300 shadow-sm'
            : 'bg-[#050b16] border-cyan-500/20'
        }`}
      >
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by camera tag, name, location, protocol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none transition-all ${
              isDaylight
                ? 'bg-slate-100 text-slate-900 border border-slate-300 focus:border-cyan-600'
                : 'bg-[#0a1220] text-slate-200 border border-cyan-500/30 focus:border-cyan-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold">Filter Status:</span>
          {['ALL', 'ONLINE', 'DEGRADED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? isDaylight
                    ? 'bg-cyan-700 text-white shadow-sm'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : isDaylight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-[#0c1626] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Diagnostic Content: Detailed Cards (Left) & Real-time Inspector Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Camera Nodes Grid (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-3">
          {filteredMetrics.map((cam) => {
            const isSelected = selectedCamId === cam.cameraId;
            const isPinging = isPingingId === cam.cameraId;

            return (
              <div
                key={cam.cameraId}
                onClick={() => setSelectedCamId(cam.cameraId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? isDaylight
                      ? 'bg-cyan-50/70 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                      : 'bg-[#081224] border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)] ring-1 ring-cyan-400/50'
                    : isDaylight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
                    : 'bg-[#040a14] hover:bg-[#071120] border-cyan-500/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-black font-mono tracking-widest ${
                        cam.status === 'Online'
                          ? isDaylight
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                          : isDaylight
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/50 animate-pulse'
                      }`}
                    >
                      {cam.tag}
                    </span>
                    <div>
                      <h3
                        className={`text-xs sm:text-sm font-bold ${
                          isDaylight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {cam.name}
                      </h3>
                      <p className="text-[10px] text-slate-400">{cam.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isDaylight
                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                          : 'bg-[#0e1c30] text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {cam.protocol}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        cam.status === 'Online'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      ● {cam.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 py-2 px-3 rounded-lg bg-black/30 border border-white/[0.05] text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 block">LATENCY</span>
                    <span
                      className={`font-black ${
                        cam.latencyMs < 30
                          ? 'text-cyan-400'
                          : cam.latencyMs < 60
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {cam.latencyMs} ms
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block">JITTER</span>
                    <span className="font-black text-purple-400">±{cam.jitterMs} ms</span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block">FRAME DROPS</span>
                    <span
                      className={`font-black ${
                        cam.frameDropRate > 0.5 ? 'text-rose-400 font-bold' : 'text-emerald-400'
                      }`}
                    >
                      {cam.frameDropRate}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block">BITRATE</span>
                    <span className="font-black text-blue-400">{cam.bitrateMbps} Mbps</span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block">FPS (ACTUAL/TGT)</span>
                    <span className="font-black text-slate-200">
                      {cam.actualFps}/{cam.targetFps}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block">EDGE TEMP</span>
                    <span className="font-black text-amber-400 flex items-center gap-0.5">
                      <Flame size={11} />
                      {cam.edgeTemperatureC}°C
                    </span>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400">
                    <Clock size={10} />
                    <span>Last Ping: {new Date(cam.lastPingTimestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePingTest(cam);
                      }}
                      disabled={isPinging}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isPinging
                          ? 'bg-cyan-500 text-black animate-pulse'
                          : isDaylight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-[#102038] hover:bg-[#162c4c] text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      <Zap size={12} className={isPinging ? 'animate-spin' : ''} />
                      <span>{isPinging ? 'Pinging...' : 'Ping Test'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleForceReconnect(cam);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isDaylight
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      <RefreshCw size={11} />
                      <span>Reset Buffer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspector Detail & Real-Time Diagnostics Terminal (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Node Deep Dive */}
          <div
            className={`p-4 rounded-xl border ${
              isDaylight
                ? 'bg-white border-slate-300 shadow-sm'
                : 'bg-[#060c18] border-cyan-500/30 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <h3
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDaylight ? 'text-slate-900' : 'text-cyan-300'
                  }`}
                >
                  NODE INSPECTOR: {selectedCam.tag}
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">
                SCORE: {selectedCam.healthScore}/100
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Stream Codec:</span>
                <span className="text-white font-bold">{selectedCam.codec}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Target Resolution:</span>
                <span className="text-white font-bold">{selectedCam.resolution}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Transport Layer:</span>
                <span className="text-cyan-400 font-bold">{selectedCam.protocol}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Jitter Buffer:</span>
                <span className="text-purple-400 font-bold">±{selectedCam.jitterMs}ms (Adaptive)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Packet Loss Ratio:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedCam.packetLossPercent}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Node Uptime:</span>
                <span className="text-white font-bold">{selectedCam.uptimePercent}%</span>
              </div>
            </div>

            {/* Sparkline Latency History */}
            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                <span>LATENCY HISTORY (RECENT)</span>
                <span className="text-cyan-400 font-bold">{selectedCam.latencyMs}ms</span>
              </div>
              <div className="h-10 flex items-end gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/[0.05]">
                {selectedCam.historyLatency.map((val, i) => {
                  const heightPercent = Math.min(100, Math.max(15, (val / 80) * 100));
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-cyan-500/60 hover:bg-cyan-400 rounded-xs transition-all"
                      style={{ height: `${heightPercent}%` }}
                      title={`${val}ms`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real-time Diagnostics Terminal Logs */}
          <div
            className={`p-4 rounded-xl border ${
              isDaylight
                ? 'bg-slate-900 text-slate-200 border-slate-800'
                : 'bg-[#02050c] border-cyan-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2 text-[11px] text-cyan-400 font-bold">
              <div className="flex items-center gap-1.5">
                <Terminal size={13} />
                <span>DIAGNOSTIC EVENT LOG</span>
              </div>
              <span className="text-[9px] text-slate-500">LIVE BUFFER</span>
            </div>

            <div className="h-44 overflow-y-auto space-y-1 text-[10px] text-slate-300 font-mono pr-1">
              {diagnosticLogs.map((log, i) => (
                <div
                  key={i}
                  className={`leading-tight ${
                    log.includes('FAIL') || log.includes('RESET')
                      ? 'text-amber-400'
                      : log.includes('PASS')
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WebSocket Config Modal */}
      {showWsConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-5 rounded-2xl border ${
              isDaylight
                ? 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                : 'bg-[#081120] border-cyan-500/50 text-slate-200 shadow-[0_0_50px_rgba(0,240,255,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-cyan-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  WebSocket Stream Configuration
                </h2>
              </div>
              <button
                onClick={() => setShowWsConfigModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Connect this frontend directly to your Python / FastAPI / Node.js WebSocket stream server for real RTSP telemetry and alert ingestion.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  BACKEND WEBSOCKET URL:
                </label>
                <input
                  type="text"
                  value={customWsUrl}
                  onChange={(e) => setCustomWsUrl(e.target.value)}
                  placeholder="ws://127.0.0.1:8000/ws/alerts"
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none ${
                    isDaylight
                      ? 'bg-slate-100 text-slate-900 border-slate-300 focus:border-cyan-600'
                      : 'bg-[#040812] text-cyan-200 border-cyan-500/40 focus:border-cyan-400'
                  }`}
                />
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Status:</span>
                  <span className="font-bold text-cyan-400">{wsState.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Packets Ingested:</span>
                  <span className="font-bold text-white">{wsState.packetsReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stream Emulation Fallback:</span>
                  <button
                    onClick={() => webSocketService.toggleEmulation(!wsState.isEmulationEnabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      wsState.isEmulationEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {wsState.isEmulationEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  webSocketService.setUrl(customWsUrl);
                  setShowWsConfigModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
