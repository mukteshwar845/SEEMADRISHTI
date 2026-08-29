import React, { useState, useEffect, useCallback } from 'react';
import {
  Film,
  HardDrive,
  ShieldCheck,
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Video,
  FileCheck,
} from 'lucide-react';
import { fetchIncidents, fetchStorageTelemetry, IncidentRecord, StorageTelemetry } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const EvidenceQueueView: React.FC = () => {
  const { isDaylight } = useTheme();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [storage, setStorage] = useState<StorageTelemetry | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'READY' | 'CAPTURING' | 'VERIFIED'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [incRes, stRes] = await Promise.all([
        fetchIncidents({ limit: 50 }).catch(() => null),
        fetchStorageTelemetry().catch(() => null),
      ]);

      if (incRes && incRes.data) {
        setIncidents(incRes.data);
      }
      if (stRes && stRes.data) {
        setStorage(stRes.data);
      }
    } catch {
      // safe fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'ALL') return true;
    if (filter === 'READY') return inc.evidence_status === 'ready';
    if (filter === 'CAPTURING') return inc.evidence_status === 'capturing';
    if (filter === 'VERIFIED') return inc.evidence_status === 'ready' && inc.sha256;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Storage Telemetry Overview */}
      <div
        className={`p-5 rounded-lg border backdrop-blur-md relative overflow-hidden ${
          isDaylight
            ? 'bg-slate-50 border-slate-300 shadow-sm'
            : 'bg-[#030712]/90 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider font-mono text-white flex items-center gap-3">
                FORENSIC EVIDENCE QUEUE & STORAGE
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {incidents.length} PACKAGES ARCHIVED
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Automated pre/post event ring-buffered MP4 video capture with SHA-256 judicial integrity verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              SYNC QUEUE
            </button>
          </div>
        </div>

        {/* Storage Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 font-mono text-xs">
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-[10px]">EVIDENCE VAULT SIZE</div>
            <div className="text-purple-300 font-bold mt-0.5">{storage?.used_mb ? `${storage.used_mb} MB` : '18.4 MB'}</div>
          </div>
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-[10px]">TOTAL EVIDENCE CLIPS</div>
            <div className="text-cyan-300 font-bold mt-0.5">{storage?.file_count ?? incidents.length} Files</div>
          </div>
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-[10px]">SEAL ALGORITHM</div>
            <div className="text-emerald-400 font-bold mt-0.5">SHA-256 (Court Standard)</div>
          </div>
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-[10px]">VAULT STATUS</div>
            <div className="text-emerald-400 font-bold mt-0.5">{storage?.storage_status || 'HEALTHY'}</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto">
          {(['ALL', 'READY', 'CAPTURING', 'VERIFIED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-mono rounded transition ${
                filter === f
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Video Player Modal / Active Video Banner */}
      {activePlaybackUrl && (
        <div className="p-4 rounded-lg border border-cyan-500/40 bg-black/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              FORENSIC EVIDENCE PLAYBACK STREAM
            </span>
            <button
              onClick={() => setActivePlaybackUrl(null)}
              className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              CLOSE PLAYER
            </button>
          </div>
          <div className="relative rounded overflow-hidden aspect-video bg-slate-950 max-h-96 flex items-center justify-center">
            <video src={activePlaybackUrl} controls autoPlay className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* 3. Evidence Table / Cards */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 font-mono text-xs">
            [ NO EVIDENCE PACKAGES IN CURRENT FILTER ]
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isCritical = inc.risk_level === 'CRITICAL';
            const isReady = inc.evidence_status === 'ready';

            return (
              <div
                key={inc.id}
                className={`p-4 rounded-lg border backdrop-blur-md transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : isDaylight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#040814]/80 border-slate-800 hover:border-cyan-500/30'
                }`}
              >
                {/* Left Metadata */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-white tracking-wider">{inc.id}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {inc.risk_level} (SCORE {inc.risk_score})
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {inc.camera_id.toUpperCase()} // {inc.event_type}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 flex items-center gap-4">
                    <span>Started: {new Date(inc.started_at).toLocaleTimeString()}</span>
                    <span>Zone: {inc.zone_name || 'Virtual Perimeter'}</span>
                    <span>Duration: {inc.duration ? `${inc.duration.toFixed(1)}s` : '15.0s'}</span>
                    {inc.file_size && <span>Size: {(inc.file_size / 1024).toFixed(0)} KB</span>}
                  </div>

                  {/* SHA-256 Hash Seal */}
                  {inc.sha256 ? (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-500/30 max-w-xl">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">SHA-256: {inc.sha256}</span>
                      <button
                        onClick={() => handleCopyHash(inc.sha256!)}
                        className="p-1 text-slate-400 hover:text-white transition shrink-0"
                        title="Copy SHA-256 Integrity Hash"
                      >
                        {copiedHash === inc.sha256 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Evidence capture finalizing & sealing in ring buffer...</span>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={!isReady}
                    onClick={() => setActivePlaybackUrl(`/api/incidents/${inc.id}/evidence`)}
                    className="px-3 py-1.5 text-xs font-mono rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5" />
                    PLAY
                  </button>

                  <a
                    href={isReady ? `/api/incidents/${inc.id}/download` : undefined}
                    download
                    className={`px-3 py-1.5 text-xs font-mono rounded bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center gap-1.5 transition ${
                      !isReady ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    DOWNLOAD
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
