import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Clock,
  Layers,
  Camera,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  History,
  Trash2,
  Footprints,
  Flame,
  Compass,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  searchIntelligence,
  fetchSearchHistory,
  clearSearchHistory,
  IntelligenceSearchResponse,
  SearchResultItem,
  TrackJourneyResult,
} from '../services/api';

interface IntelligenceSearchProps {
  onOpenIncident?: (incidentId: string) => void;
  onSelectCamera?: (cameraId: string) => void;
  onHighlightCameras?: (cameraIds: string[]) => void;
  onOpenBehaviorChain?: (trackId: number, cameraId?: string) => void;
  onNavigateToTimeline?: () => void;
  onOpenTargetJourney?: (trackId?: number) => void;
  onOpenThreatMap?: (cameraId?: string) => void;
}

const QUICK_QUERIES = [
  'Show critical incidents in the last 10 minutes',
  'Show person #27 journey',
  'Which cameras had restricted breaches?',
  'Show all tripwire crossings',
  'Show unresolved incidents',
  'Show all vehicles',
];

export const IntelligenceSearch: React.FC<IntelligenceSearchProps> = ({
  onOpenIncident,
  onSelectCamera,
  onHighlightCameras,
  onOpenBehaviorChain,
  onNavigateToTimeline,
  onOpenTargetJourney,
  onOpenThreatMap,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<IntelligenceSearchResponse | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; query: string; timestamp: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load history on mount
  useEffect(() => {
    fetchSearchHistory()
      .then((res) => {
        if (res.data) setHistory(res.data);
      })
      .catch(() => {});
  }, []);

  const handleExecuteSearch = async (queryString: string) => {
    const q = queryString.trim();
    if (!q) return;

    setQuery(q);
    setIsSearching(true);
    setShowHistory(false);
    setIsExpanded(true);

    try {
      const res = await searchIntelligence(q);
      setSearchResponse(res);

      // Extract matching cameras and trigger highlighting callback
      const matchedCams = new Set<string>();
      if (res.results) {
        res.results.forEach((r) => {
          if (r.type === 'camera_stat' && r.breach_count && r.breach_count > 0 && r.camera_id) {
            matchedCams.add(r.camera_id);
          } else if (r.camera_id) {
            matchedCams.add(r.camera_id);
          }
          if (r.camera_ids) {
            r.camera_ids.forEach((c) => matchedCams.add(c));
          }
        });
      }
      if (res.journey?.camera_path) {
        res.journey.camera_path.forEach((c) => matchedCams.add(c));
      }

      if (onHighlightCameras && matchedCams.size > 0) {
        onHighlightCameras(Array.from(matchedCams));
      }

      // Refresh history
      fetchSearchHistory()
        .then((hRes) => {
          if (hRes.data) setHistory(hRes.data);
        })
        .catch(() => {});
    } catch (err: any) {
      console.warn('[IntelligenceSearch] Search failed:', err);
      setSearchResponse({
        success: false,
        query: q,
        result_count: 0,
        results: [],
        chips: [q.toUpperCase()],
        message: `Search query failed: ${err?.message || 'Server connection error'}`,
        insufficient_data: true,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchResponse(null);
    setIsExpanded(false);
    if (onHighlightCameras) onHighlightCameras([]);
  };

  const handleClearHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await clearSearchHistory();
      setHistory([]);
    } catch {}
  };

  return (
    <div className="w-full bg-slate-900/90 border border-cyan-500/20 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all mb-4">
      {/* Search Input Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800/80 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <Search className="w-5 h-5" />
          </div>

          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecuteSearch(query);
              }}
              onFocus={() => {
                if (history.length > 0 && !searchResponse) setShowHistory(true);
              }}
              placeholder="Search surveillance intelligence... (e.g., 'Show critical incidents in the last 10 minutes', 'Show person #27 journey')"
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 font-mono"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => handleExecuteSearch(query)}
            disabled={!query.trim() || isSearching}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-bold tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>SEARCH</span>
          </button>

          {searchResponse && (
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
            >
              CLOSE
            </button>
          )}
        </div>

        {/* Quick Query Suggestions */}
        {!searchResponse && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-[11px] font-mono scrollbar-none">
            <span className="text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              PROMPTS:
            </span>
            {QUICK_QUERIES.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleExecuteSearch(prompt)}
                className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-900 transition-all shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Search History Dropdown */}
        {showHistory && history.length > 0 && !searchResponse && (
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 px-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3 h-3" />
                RECENT QUERIES
              </span>
              <button
                onClick={handleClearHistory}
                className="text-[10px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                CLEAR
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
              {history.slice(0, 6).map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleExecuteSearch(h.query)}
                  className="text-left px-2 py-1 rounded hover:bg-slate-900 text-xs font-mono text-slate-400 hover:text-cyan-300 truncate transition-colors"
                >
                  ⏱ {h.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Results Display Area */}
      {isExpanded && searchResponse && (
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-4">
          {/* Header & Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  INTERPRETED INTENT &amp; FILTERS:
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {searchResponse.result_count} MATCHING RESULT{searchResponse.result_count === 1 ? '' : 'S'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {searchResponse.chips && searchResponse.chips.length > 0 ? (
                  searchResponse.chips.map((chip, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    >
                      {chip}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">GLOBAL SEARCH // UNRESTRICTED</span>
                )}
              </div>
            </div>

            <div className="text-right font-mono text-xs text-slate-500">
              {searchResponse.message}
            </div>
          </div>

          {/* Case 1: Target Journey View */}
          {searchResponse.journey && (
            <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Footprints className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-mono font-bold text-white">
                    CHRONOLOGICAL JOURNEY: {searchResponse.journey.class_name?.toUpperCase()} #{searchResponse.journey.track_id}
                  </span>
                  {searchResponse.journey.correlation_id && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                      {searchResponse.journey.correlation_id}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    PATH: {searchResponse.journey.camera_path.map((c) => c.toUpperCase()).join(' ➔ ')}
                  </span>
                  {onOpenBehaviorChain && (
                    <button
                      onClick={() => onOpenBehaviorChain(searchResponse.journey!.track_id)}
                      className="px-2 py-1 text-[10px] font-mono font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      VIEW BEHAVIOR CHAIN
                    </button>
                  )}
                </div>
              </div>

              {/* Status Note */}
              <div className="text-xs font-mono text-indigo-300 bg-indigo-950/40 p-2 rounded border border-indigo-500/20">
                ℹ {searchResponse.journey.status_note}
              </div>

              {/* Milestones Flow */}
              <div className="space-y-2 pt-1 max-h-[320px] overflow-y-auto pr-1">
                {searchResponse.journey.steps.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {st.timestamp ? new Date(st.timestamp > 1e11 ? st.timestamp : st.timestamp * 1000).toLocaleTimeString() : '--:--:--'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 text-[10px] font-bold">
                      {st.camera_id.toUpperCase()}
                    </span>
                    <span className="text-slate-200 flex-1">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case 2: Camera Breakdown Matrix View */}
          {searchResponse.results.some((r) => r.type === 'camera_stat') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  CCTV NODE BREACH AUDIT:
                </span>
                <div className="flex items-center gap-2">
                  {onOpenBehaviorChain && searchResponse.journey?.track_id && (
                    <button
                      onClick={() => onOpenBehaviorChain(searchResponse.journey!.track_id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Layers size={12} />
                      VIEW BEHAVIOR CHAIN
                    </button>
                  )}
                  {onOpenTargetJourney && searchResponse.journey?.track_id && (
                    <button
                      onClick={() => onOpenTargetJourney(searchResponse.journey!.track_id)}
                      className="px-2.5 py-1 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Footprints size={12} />
                      OPEN IN TARGET JOURNEY
                    </button>
                  )}
                  {onOpenThreatMap && (
                    <button
                      onClick={() => onOpenThreatMap()}
                      className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Flame size={12} />
                      <span>VIEW DYNAMIC THREAT MAP</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2">
                {searchResponse.results
                  .filter((r) => r.type === 'camera_stat')
                  .map((cStat, i) => (
                    <div
                      key={i}
                      onClick={() => onSelectCamera && onSelectCamera(cStat.camera_id || 'cam-01')}
                      className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                        cStat.breach_count && cStat.breach_count > 0
                          ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-900/40'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {cStat.camera_name}
                      </div>
                      <div className={`text-base font-mono font-bold mt-1 ${cStat.breach_count && cStat.breach_count > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                        {cStat.breach_count || 0}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {cStat.breach_count === 1 ? 'breach' : 'breaches'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Case 3: Standard Incidents & Events Cards */}
          {searchResponse.results.filter((r) => r.type !== 'camera_stat' && r.type !== 'journey').length > 0 && (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {searchResponse.results
                .filter((r) => r.type !== 'camera_stat' && r.type !== 'journey')
                .map((item, idx) => {
                  const isCrit = item.risk_level === 'CRITICAL' || (item.risk_score && item.risk_score >= 80);
                  const isHi = item.risk_level === 'HIGH' || (item.risk_score && item.risk_score >= 50 && item.risk_score < 80);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border font-mono text-xs font-bold ${isCrit ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : isHi ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'}`}>
                          {item.risk_level || 'INFO'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white">
                              {item.incident_id || item.event_id || item.chain_id}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {item.camera_id?.toUpperCase()}
                            </span>
                            {item.track_id && (
                              <span className="text-xs text-slate-400 font-mono">
                                TARGET #{item.track_id}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 font-sans mt-0.5">
                            {item.event_type?.replace(/_/g, ' ') || item.behavior_pattern?.replace(/_/g, ' ') || 'Perimeter Activity'}
                            {item.zone_name && ` in ${item.zone_name}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono text-[10px] text-slate-500">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '--:--:--'}
                          {item.risk_score !== undefined && (
                            <div className="text-slate-300 font-bold">
                              RISK: {item.risk_score}/100
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.incident_id && onOpenIncident && (
                            <button
                              onClick={() => onOpenIncident(item.incident_id!)}
                              className="px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer transition-colors"
                            >
                              OPEN INCIDENT
                            </button>
                          )}
                          {item.camera_id && onSelectCamera && (
                            <button
                              onClick={() => onSelectCamera(item.camera_id!)}
                              className="px-2 py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
                            >
                              VIEW CAM
                            </button>
                          )}
                          {item.track_id && onOpenBehaviorChain && (
                            <button
                              onClick={() => onOpenBehaviorChain(item.track_id!, item.camera_id)}
                              className="px-2 py-1 text-[10px] font-mono rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 cursor-pointer transition-colors"
                            >
                              CHAIN
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* No results experience */}
          {searchResponse.result_count === 0 && !searchResponse.journey && (
            <div className="py-8 text-center bg-slate-900/40 border border-slate-800 rounded-lg">
              <div className="inline-flex p-3 rounded-full bg-slate-800/60 mb-2 text-slate-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-sm font-mono font-bold text-slate-300">
                NO MATCHING SURVEILLANCE EVENTS
              </div>
              <p className="text-xs text-slate-500 mt-1 font-sans max-w-md mx-auto">
                No real telemetry, events, or incidents satisfied the query constraints. Try widening the time range or targeting a specific camera sector.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
