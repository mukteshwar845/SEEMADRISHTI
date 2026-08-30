import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDown,
  Camera,
  Activity,
  Layers,
  Radio,
  Share2,
  ChevronRight,
  TrendingUp,
  Flame,
  Info,
  Check,
  Eye,
  Crosshair,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { BehaviorChainRecord, ChainEventRecord, fetchIncidentBehaviorChain } from '../services/api';
import { webSocketService } from '../services/websocketService';

interface ThreatBehaviorChainProps {
  chain?: BehaviorChainRecord | null;
  trackId?: number;
  cameraId?: string;
  incidentId?: string;
  onClose?: () => void;
  compact?: boolean;
}

export const ThreatBehaviorChain: React.FC<ThreatBehaviorChainProps> = ({
  chain: initialChain,
  trackId,
  cameraId,
  incidentId,
  onClose,
  compact = false,
}) => {
  const [chain, setChain] = useState<BehaviorChainRecord | null>(initialChain || null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'EVIDENCE' | 'RISK'>('TIMELINE');

  // Load from API if incidentId provided and chain not passed
  useEffect(() => {
    if (initialChain) {
      setChain(initialChain);
      return;
    }
    if (incidentId) {
      setLoading(true);
      fetchIncidentBehaviorChain(incidentId)
        .then((res) => {
          if (res.data) setChain(res.data);
        })
        .catch((err) => {
          console.warn('[ThreatBehaviorChain] Error fetching incident chain:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [initialChain, incidentId]);

  // Subscribe to live WebSocket behavior chain updates
  useEffect(() => {
    const unsub = webSocketService.onBehaviorChain((update: any) => {
      if (!update) return;
      if (
        (chain && update.chain_id === chain.chain_id) ||
        (trackId !== undefined && update.track_id === trackId && (!cameraId || update.camera_id === cameraId.toLowerCase())) ||
        (incidentId && update.incident_id === incidentId)
      ) {
        setChain((prev) => ({
          ...(prev || {}),
          ...update,
        }));
      }
    });

    return () => {
      unsub();
    };
  }, [chain?.chain_id, trackId, cameraId, incidentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-neutral-400 bg-neutral-900/60 border border-neutral-800 rounded-lg">
        <Activity className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <span className="text-xs font-mono uppercase tracking-wider">CORRELATING TARGET BEHAVIOR SEQUENCE...</span>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="p-6 bg-neutral-900/40 border border-neutral-800/80 rounded-lg text-center">
        <div className="inline-flex p-3 rounded-full bg-neutral-800/50 mb-3 text-neutral-500">
          <Layers className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-neutral-300">NO ACTIVE BEHAVIOR CHAIN</div>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Behavior chains are constructed dynamically when targets perform multi-stage movements across perimeter tripwires and restricted zones.
        </p>
      </div>
    );
  }

  const events = chain.events || [];
  const riskScore = chain.risk_score || 0;
  const isCritical = chain.risk_level === 'CRITICAL' || riskScore >= 80;
  const isHigh = chain.risk_level === 'HIGH' || (riskScore >= 50 && riskScore < 80);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'DETECTION':
        return { color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', label: 'TARGET DETECTED' };
      case 'PERIMETER_APPROACH':
        return { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'PERIMETER APPROACH' };
      case 'TRIPWIRE_CROSSING':
        return { color: 'text-rose-400 bg-rose-500/15 border-rose-500/40', label: 'TRIPWIRE BREACH' };
      case 'RESTRICTED_ZONE_ENTRY':
        return { color: 'text-red-400 bg-red-500/20 border-red-500/50', label: 'RESTRICTED ENTRY' };
      case 'LOITERING':
        return { color: 'text-amber-300 bg-amber-500/20 border-amber-500/40', label: 'LOITERING DWELL' };
      case 'RE_ENTRY':
        return { color: 'text-crimson-400 bg-rose-600/20 border-rose-500/50', label: 'RE-ENTRY CYCLE' };
      case 'CROSS_CAMERA_HANDOVER':
        return { color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/40', label: 'CAMERA HANDOVER' };
      case 'RISK_ESCALATION':
        return { color: 'text-orange-400 bg-orange-500/20 border-orange-500/50', label: 'THREAT ESCALATION' };
      case 'INCIDENT_CREATED':
        return { color: 'text-red-300 bg-red-600/30 border-red-500/70', label: 'CRITICAL INCIDENT' };
      default:
        return { color: 'text-neutral-400 bg-neutral-800 border-neutral-700', label: type.replace(/_/g, ' ') };
    }
  };

  const getPatternBadgeColor = (pattern: string) => {
    switch (pattern) {
      case 'POSSIBLE_RECONNAISSANCE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/40 shadow-rose-950/40';
      case 'MULTI_EVENT_SECURITY_BREACH':
        return 'text-red-400 bg-red-500/10 border-red-500/40 shadow-red-950/40';
      case 'REPEATED_REENTRY':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/40 shadow-orange-950/40';
      case 'PERSISTENT_LOITERING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/40 shadow-amber-950/40';
      case 'RESTRICTED_AREA_INTRUSION':
        return 'text-red-400 bg-red-500/10 border-red-500/40 shadow-red-950/40';
      case 'NORMAL_MOVEMENT':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-neutral-400 bg-neutral-800/60 border-neutral-700';
    }
  };

  return (
    <div className={`bg-neutral-950/90 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md ${compact ? 'p-3' : 'p-5'}`}>
      {/* Tactical HUD Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isCritical ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' : isHigh ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'}`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                THREAT BEHAVIOR CHAIN
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                {chain.chain_id}
              </span>
              {chain.correlation_id && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  {chain.correlation_id}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-semibold text-white">
                TARGET #{chain.track_id} ({chain.class_name?.toUpperCase() || 'PERSON'})
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {chain.camera_ids?.join(' ➔ ') || chain.camera_id}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-neutral-500">SYSTEM RISK</div>
            <div className="flex items-center gap-1.5 justify-end">
              <span className={`text-sm font-bold font-mono ${isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'}`}>
                {riskScore} / 100
              </span>
              <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${isCritical ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : isHigh ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                {chain.risk_level}
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pattern Banner & Evidence Header */}
      <div className="mt-4 p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              BEHAVIOR PATTERN:
            </span>
            <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono tracking-wide border shadow-sm ${getPatternBadgeColor(chain.behavior_pattern)}`}>
              {chain.behavior_pattern.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              CONFIDENCE:
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${chain.confidence >= 0.85 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'}`}>
              {chain.confidence > 0 ? `${Math.round(chain.confidence * 100)}% (${chain.confidence_label})` : 'INSUFFICIENT DATA'}
            </span>
          </div>
        </div>

        {chain.explanation && (
          <p className="text-xs text-neutral-300 mt-2 leading-relaxed font-sans border-t border-neutral-800/80 pt-2">
            {chain.explanation}
          </p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mt-4 border-b border-neutral-800/70 pb-2">
        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${activeTab === 'TIMELINE' ? 'bg-neutral-800 text-white font-bold border border-neutral-700' : 'text-neutral-400 hover:text-neutral-200'}`}
        >
          <Clock className="w-3.5 h-3.5" />
          CHRONOLOGICAL SEQUENCE ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('EVIDENCE')}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${activeTab === 'EVIDENCE' ? 'bg-neutral-800 text-white font-bold border border-neutral-700' : 'text-neutral-400 hover:text-neutral-200'}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          CONFIRMED EVIDENCE ({chain.evidence?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('RISK')}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${activeTab === 'RISK' ? 'bg-neutral-800 text-white font-bold border border-neutral-700' : 'text-neutral-400 hover:text-neutral-200'}`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          RISK CONTRIBUTION
        </button>
      </div>

      {/* Tab 1: Chronological Vertical Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs font-mono">
              NO PIPELINE EVENTS RECORDED FOR TARGET
            </div>
          ) : (
            events.map((ev, idx) => {
              const badge = getEventBadge(ev.event_type);
              const formattedTime = ev.timestamp
                ? new Date(ev.timestamp > 1e11 ? ev.timestamp : ev.timestamp * 1000).toLocaleTimeString([], { hour12: false })
                : `--:--:--`;

              return (
                <div key={idx} className="relative flex items-start gap-3 group">
                  {/* Step Connector Line */}
                  {idx < events.length - 1 && (
                    <div className="absolute left-[15px] top-[26px] bottom-[-8px] w-0.5 bg-neutral-800 group-hover:bg-neutral-700 transition-colors" />
                  )}

                  {/* Sequence Node */}
                  <div className="w-[30px] h-[30px] rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-neutral-300 flex-shrink-0 z-10">
                    {ev.sequence || idx + 1}
                  </div>

                  {/* Event Detail Box */}
                  <div className="flex-1 p-2.5 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {ev.camera_id?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Metadata attributes */}
                    <div className="mt-1.5 text-xs text-neutral-400 font-sans">
                      {ev.event_type === 'TRIPWIRE_CROSSING' && (
                        <span>
                          Crossed {ev.metadata?.tripwire_name || 'Tripwire'} (Direction:{' '}
                          <strong className="text-rose-400 font-mono">{ev.metadata?.direction || 'IN'}</strong>)
                        </span>
                      )}
                      {ev.event_type === 'RESTRICTED_ZONE_ENTRY' && (
                        <span>
                          Breached perimeter geofence in{' '}
                          <strong className="text-red-400">{ev.metadata?.zone_name || 'Restricted Area'}</strong>
                        </span>
                      )}
                      {ev.event_type === 'LOITERING' && (
                        <span>
                          Persistent loitering duration:{' '}
                          <strong className="text-amber-400 font-mono">
                            {ev.metadata?.dwell_seconds ? `${ev.metadata.dwell_seconds}s` : 'Prolonged'}
                          </strong>
                        </span>
                      )}
                      {ev.event_type === 'RE_ENTRY' && (
                        <span>
                          Re-entry cycle{' '}
                          <strong className="text-crimson-400 font-mono">
                            #{ev.metadata?.reentry_count || 1}
                          </strong>{' '}
                          into boundary zone
                        </span>
                      )}
                      {ev.event_type === 'CROSS_CAMERA_HANDOVER' && (
                        <span>
                          Corridor transit:{' '}
                          <strong className="text-indigo-300 font-mono">
                            {ev.metadata?.from_camera?.toUpperCase()} ➔ {ev.metadata?.to_camera?.toUpperCase()}
                          </strong>
                        </span>
                      )}
                      {ev.event_type === 'RISK_ESCALATION' && (
                        <span>
                          Risk escalated to{' '}
                          <strong className="text-orange-400 font-mono">
                            {ev.metadata?.risk_score}/100 ({ev.metadata?.risk_level})
                          </strong>
                        </span>
                      )}
                      {ev.event_type === 'INCIDENT_CREATED' && (
                        <span>
                          Forensic incident package sealed:{' '}
                          <strong className="text-red-400 font-mono">
                            {ev.metadata?.incident_id || chain.incident_id}
                          </strong>
                        </span>
                      )}
                      {ev.event_type === 'DETECTION' && (
                        <span>Initial detection confirmed via YOLOv8 model</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Verified Evidence Checklist */}
      {activeTab === 'EVIDENCE' && (
        <div className="mt-4 space-y-2.5">
          <div className="text-[11px] font-mono text-neutral-400 uppercase mb-2">
            DETERMINISTIC EVIDENCE CRITERIA MET BY REAL PIPELINE:
          </div>

          {[
            { label: 'Restricted-zone interaction', desc: 'Target centroid confirmed inside polygon geofence' },
            { label: 'Tripwire crossing', desc: 'Centroid trajectory intersects calibrated tripwire line segment' },
            { label: 'Prolonged dwell', desc: 'Dwell accumulation exceeded the operational loitering threshold (≥15s)' },
            { label: 'Re-entry detected', desc: 'Multiple independent zone-entry cycles tracked for same target' },
            { label: 'Counter-flow movement', desc: 'Velocity vector directly opposes designated egress direction' },
            { label: 'Cross-camera continuation', desc: 'Target matched across camera topology handover corridors' },
          ].map((item, i) => {
            const isConfirmed = chain.evidence?.some((e) =>
              e.toLowerCase().includes(item.label.toLowerCase()) || item.label.toLowerCase().includes(e.toLowerCase())
            );

            return (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${isConfirmed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-neutral-900/30 border-neutral-800 text-neutral-500'}`}
              >
                <div className={`p-1 rounded-full mt-0.5 ${isConfirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-600'}`}>
                  {isConfirmed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className={`text-xs font-mono font-bold ${isConfirmed ? 'text-emerald-300' : 'text-neutral-500'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Authoritative Risk Breakdown */}
      {activeTab === 'RISK' && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase">
                AUTHORITATIVE RISK ENGINE SCORE
              </span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {riskScore} <span className="text-sm text-neutral-500">/ 100</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold font-mono border ${isCritical ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
              {chain.risk_level}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              BEHAVIOR CONTRIBUTION FACTORS
            </span>

            {chain.risk_contributions && chain.risk_contributions.length > 0 ? (
              chain.risk_contributions.map((factor: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-neutral-900/50 border border-neutral-800/80 text-xs">
                  <span className="text-neutral-300 font-mono">
                    {factor.factor || factor.code || factor.description || 'Behavior Factor'}
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    +{factor.points || factor.score || 10}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-neutral-500 font-mono">
                No individual penalty factors recorded. Base trajectory evaluation active.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
