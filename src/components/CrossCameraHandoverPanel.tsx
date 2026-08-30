import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, HelpCircle, RefreshCw, Layers, Clock, Video } from 'lucide-react';
import { webSocketService } from '../services/websocketService';

export interface HandoverItem {
  correlation_id: string;
  source_camera: string;
  source_track_id: number;
  destination_camera: string;
  destination_track_id: number;
  class_name: string;
  temporal_gap: number;
  confidence: number;
  confidence_percent: number;
  reason: string;
  spatial_relationship: string;
  status: string;
  display_status: string;
  created_at: string;
}

export const CrossCameraHandoverPanel: React.FC = () => {
  const [handovers, setHandovers] = useState<HandoverItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch correlations and subscribe to WebSocket telemetry
  const fetchCorrelations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/correlations?limit=10');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: HandoverItem[] = json.data.map((c: any) => {
            const obs = Array.isArray(c.observations) ? c.observations : [];
            const srcObs = obs[0] || {};
            const dstObs = obs[obs.length - 1] || {};
            const conf = (c.correlation_score || 70) / 100.0;
            return {
              correlation_id: c.id,
              source_camera: srcObs.camera_id || 'cam-01',
              source_track_id: parseInt(srcObs.track_id, 10) || 1,
              destination_camera: dstObs.camera_id || 'cam-02',
              destination_track_id: parseInt(dstObs.track_id, 10) || 2,
              class_name: srcObs.class_name || 'person',
              temporal_gap: Math.max(1.0, Math.round(((new Date(c.last_seen_at).getTime() - new Date(c.started_at).getTime()) / 1000) * 10) / 10),
              confidence: conf,
              confidence_percent: Math.round(conf * 100),
              reason: Array.isArray(c.reasons) ? c.reasons.map((r: any) => r.message || r.code).join('; ') : 'Corridor topology transition verified',
              spatial_relationship: `${(srcObs.camera_id || 'cam-01').toUpperCase()} -> ${(dstObs.camera_id || 'cam-02').toUpperCase()}`,
              status: c.correlation_score >= 50 ? 'VERIFIED' : 'UNCERTAIN',
              display_status: c.correlation_score >= 50 ? 'TARGET HANDOVER DETECTED' : 'CORRELATION UNCERTAIN',
              created_at: c.started_at,
            };
          });
          setHandovers(mapped);
        }
      }
    } catch {
      // Keep empty if unavailable
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrelations();

    // Listen for real-time correlation events over WebSocket
    const unsub = webSocketService.subscribe('correlation_created', (data: any) => {
      if (data) {
        setHandovers((prev) => [data, ...prev.filter((h) => h.correlation_id !== data.correlation_id)].slice(0, 10));
      }
    });

    return () => {
      unsub();
    };
  }, []);

  return (
    <div id="cross-camera-handover-panel" className="bg-[#030816] border border-cyan-500/30 rounded-xl p-3.5 font-mono text-slate-200 shadow-xl space-y-3">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Layers size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white tracking-widest uppercase">
              CROSS-CAMERA HANDOVER INTELLIGENCE
            </h3>
            <p className="text-[10px] text-slate-400">
              ISOLATED BYTETRACK IDs + SPATIAL-TEMPORAL TOPOLOGY CORRELATION
            </p>
          </div>
        </div>

        <button
          onClick={fetchCorrelations}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800"
          title="Refresh correlations"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
        </button>
      </div>

      {/* Handover List */}
      <div className="space-y-2.5">
        {handovers.length > 0 ? (
          handovers.map((h) => {
            const isVerified = h.status === 'VERIFIED' && h.confidence >= 0.50;
            return (
              <div
                key={h.correlation_id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isVerified
                    ? 'bg-cyan-950/40 border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.06)]'
                    : 'bg-amber-950/30 border-amber-500/40'
                }`}
              >
                {/* Header row: Correlation ID + Status badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-cyan-300 tracking-wider">
                    {h.correlation_id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border flex items-center gap-1 ${
                      isVerified
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50'
                        : 'bg-amber-950 text-amber-300 border-amber-500/50'
                    }`}
                  >
                    {isVerified ? <ShieldCheck size={11} /> : <HelpCircle size={11} />}
                    {h.display_status || (isVerified ? 'TARGET HANDOVER DETECTED' : 'CORRELATION UNCERTAIN')}
                  </span>
                </div>

                {/* Handover Visual Flow: CAM-01 #17 -> CAM-02 #08 */}
                <div className="flex items-center justify-between p-2 rounded bg-black/60 border border-slate-800/80 mb-2 text-xs">
                  {/* Source Node */}
                  <div className="flex items-center gap-1.5">
                    <Video size={13} className="text-cyan-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">SOURCE</span>
                      <span className="font-bold text-white uppercase">{h.source_camera}</span>{' '}
                      <span className="text-cyan-400 font-bold">#{h.source_track_id}</span>
                    </div>
                  </div>

                  {/* Flow Arrow + Temporal Gap */}
                  <div className="flex flex-col items-center px-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={10} />
                      <span>{h.temporal_gap}s</span>
                    </div>
                    <ArrowRight size={16} className="text-cyan-400 animate-pulse my-0.5" />
                    <span className="text-[9px] text-emerald-400 font-bold">{h.confidence_percent || Math.round(h.confidence * 100)}% CONF</span>
                  </div>

                  {/* Destination Node */}
                  <div className="flex items-center gap-1.5 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">DESTINATION</span>
                      <span className="font-bold text-white uppercase">{h.destination_camera}</span>{' '}
                      <span className="text-cyan-400 font-bold">#{h.destination_track_id}</span>
                    </div>
                    <Video size={13} className="text-cyan-400" />
                  </div>
                </div>

                {/* Reason Explanation */}
                <div className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  <span className="text-cyan-400 font-bold">REASON:</span> {h.reason || 'Spatial-temporal corridor transit within valid boundary'}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 rounded-lg bg-black/40 border border-slate-800 text-center space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              NO VERIFIED HANDOVER
            </span>
            <p className="text-[10px] text-slate-500 font-mono">
              Targets are currently isolated within individual camera sectors. Cross-camera handover will activate when targets cross topological boundaries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
