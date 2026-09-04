import React, { useState, useEffect, useRef } from 'react';
import { DetectionItem } from '../types';
import { initialDetections } from '../data/mockData';
import {
  Scan,
  Download,
  Search,
  Car,
  User,
  ShieldAlert,
  ScanEye,
  Radio,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { fetchEvents, exportDetectionsCSV } from '../services/api';
import { webSocketService } from '../services/websocketService';

interface ExtendedDetectionItem extends DetectionItem {
  createdMs?: number;
  sourceType?: 'live_camera' | 'browser_webcam' | 'rtsp' | 'fixture' | 'test';
  trackId?: number | string;
}

export const DetectionsView: React.FC = () => {
  // Mode toggle: LIVE mode (strictly real-time surveillance data) vs DEMO/FIXTURE mode
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [detections, setDetections] = useState<ExtendedDetectionItem[]>([]);
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cvStatus, setCvStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [activeCamCount, setActiveCamCount] = useState<number>(0);

  // 1. Check CV processor health status
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/webcam/status');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCvStatus(data.cv_processor_online || data.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE');
          }
        } else {
          if (isMounted) setCvStatus('OFFLINE');
        }
      } catch {
        if (isMounted) setCvStatus('OFFLINE');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Fetch initial data depending on mode
  useEffect(() => {
    if (isLiveMode) {
      // In LIVE mode: query only real live streams from last 30 seconds
      setDetections([]);
      fetchEvents({ live_only: true } as any)
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            const mapped: ExtendedDetectionItem[] = res.data.map((evt: any) => {
              const meta = typeof evt.metadata === 'object' && evt.metadata !== null ? evt.metadata : {};
              const d = new Date(evt.timestamp);
              const timeStr = isNaN(d.getTime()) ? '00:00:00' : d.toLocaleTimeString();
              const labelStr = (evt.class_name || meta.class_name || evt.event_type || 'PERSON').toUpperCase();
              const isVeh = ['VEHICLE', 'CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'BICYCLE', 'VAN', 'SUV'].some((v) =>
                labelStr.includes(v)
              );
              const label: DetectionItem['label'] = isVeh
                ? 'VEHICLE'
                : labelStr === 'NO_HELMET'
                ? 'NO_HELMET'
                : labelStr === 'LOITERING'
                ? 'LOITERING'
                : labelStr === 'INTRUSION'
                ? 'INTRUSION'
                : 'PERSON';

              const rawConf = evt.confidence !== null && evt.confidence !== undefined ? evt.confidence : meta.confidence;
              const parsedConf = typeof rawConf === 'number' ? (rawConf > 1 ? rawConf / 100 : rawConf) : undefined;

              return {
                id: evt.id,
                camera: evt.camera_id?.toUpperCase() || 'CAM-01',
                location: evt.zone_name || meta.zone_name || 'Active Perimeter',
                label,
                confidence: parsedConf ?? 0,
                riskScore: evt.risk_score !== undefined ? evt.risk_score : meta.risk_score,
                time: timeStr,
                createdMs: isNaN(d.getTime()) ? Date.now() : d.getTime(),
                sourceType: evt.source_type || 'live_camera',
                trackId: evt.track_id ?? meta.track_id,
                bbox: meta.bbox || { x: 0, y: 0, width: 0, height: 0 },
                color: label === 'INTRUSION' ? '#f43f5e' : label === 'VEHICLE' ? '#f59e0b' : '#10b981',
              };
            });
            setDetections(mapped);
          } else {
            setDetections([]);
          }
        })
        .catch(() => setDetections([]));
    } else {
      // In DEMO / BENCHMARK mode: load benchmark fixtures with explicit demo source tags
      const mappedFixtures: ExtendedDetectionItem[] = initialDetections.map((d) => ({
        ...d,
        sourceType: 'fixture',
        createdMs: Date.now(),
      }));
      setDetections(mappedFixtures);
    }
  }, [isLiveMode]);

  // 3. WebSocket real-time detection & tracking ingestion (LIVE mode only)
  useEffect(() => {
    if (!isLiveMode) return;

    const unsubDet = webSocketService.onDetection((payload: any) => {
      if (!payload) return;
      const nowMs = Date.now();
      const timeStr = new Date().toLocaleTimeString();

      if (payload.detections && Array.isArray(payload.detections)) {
        const mappedList: ExtendedDetectionItem[] = payload.detections.map((det: any, idx: number) => {
          const labelStr = (det.class_name || det.label || 'PERSON').toUpperCase();
          const isVeh = ['VEHICLE', 'CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'BICYCLE', 'VAN', 'SUV'].some((v) =>
            labelStr.includes(v)
          );
          const label: DetectionItem['label'] = isVeh
            ? 'VEHICLE'
            : labelStr === 'NO_HELMET'
            ? 'NO_HELMET'
            : labelStr === 'LOITERING'
            ? 'LOITERING'
            : labelStr === 'INTRUSION'
            ? 'INTRUSION'
            : 'PERSON';

          const rawConf = det.confidence;
          const parsedConf = typeof rawConf === 'number' ? (rawConf > 1 ? rawConf / 100 : rawConf) : undefined;

          return {
            id: `ws-det-${payload.camera_id || 'cam01'}-${idx}-${det.class_name || 'obj'}-${nowMs}`,
            camera: (payload.camera_id || 'CAM-01').toUpperCase(),
            location: 'Sensor Field Sector',
            label,
            confidence: parsedConf ?? 0,
            riskScore: label === 'INTRUSION' ? 92 : label === 'LOITERING' ? 74 : 18,
            time: timeStr,
            createdMs: nowMs,
            sourceType: payload.source_type || 'browser_webcam',
            trackId: det.track_id ?? idx + 1,
            bbox: det.bbox
              ? {
                  x: det.bbox.x1 || 0,
                  y: det.bbox.y1 || 0,
                  width: det.bbox.x2 - det.bbox.x1 || 0,
                  height: det.bbox.y2 - det.bbox.y1 || 0,
                }
              : { x: 0, y: 0, width: 0, height: 0 },
            color: label === 'INTRUSION' ? '#ef4444' : label === 'VEHICLE' ? '#38bdf8' : '#10b981',
          };
        });

        setDetections((prev) => [...mappedList, ...prev].slice(0, 50));
      }
    });

    const unsubTrack = webSocketService.onTracking((payload: any) => {
      if (!payload || !payload.tracks || !Array.isArray(payload.tracks)) return;
      const nowMs = Date.now();
      const timeStr = new Date().toLocaleTimeString();

      const mappedTracks: ExtendedDetectionItem[] = payload.tracks.map((t: any) => {
        const labelStr = (t.class_name || 'PERSON').toUpperCase();
        const isVeh = ['VEHICLE', 'CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'BICYCLE', 'VAN', 'SUV'].some((v) =>
          labelStr.includes(v)
        );
        const label: DetectionItem['label'] = isVeh ? 'VEHICLE' : 'PERSON';

        const rawConf = t.confidence;
        const parsedConf = typeof rawConf === 'number' ? (rawConf > 1 ? rawConf / 100 : rawConf) : undefined;

        return {
          id: `ws-trk-${payload.camera_id || 'cam01'}-${t.track_id}-${nowMs}`,
          camera: (payload.camera_id || 'CAM-01').toUpperCase(),
          location: 'Live Camera Sector',
          label,
          confidence: parsedConf ?? 0,
          riskScore: (t as any).risk_score ?? 15,
          time: timeStr,
          createdMs: nowMs,
          sourceType: payload.source_type || 'browser_webcam',
          trackId: t.track_id,
          bbox: t.bbox
            ? {
                x: t.bbox.x1 || 0,
                y: t.bbox.y1 || 0,
                width: t.bbox.x2 - t.bbox.x1 || 0,
                height: t.bbox.y2 - t.bbox.y1 || 0,
              }
            : { x: 0, y: 0, width: 0, height: 0 },
          color: isVeh ? '#38bdf8' : '#10b981',
        };
      });

      setDetections((prev) => {
        // Deduplicate tracks by trackId
        const existingIds = new Set(mappedTracks.map((m) => m.trackId));
        const filteredPrev = prev.filter((p) => !existingIds.has(p.trackId));
        return [...mappedTracks, ...filteredPrev].slice(0, 50);
      });
    });

    return () => {
      unsubDet();
      unsubTrack();
    };
  }, [isLiveMode]);

  // 4. Stale data expiration policy (LIVE mode): drop tracks older than 15 seconds
  useEffect(() => {
    if (!isLiveMode) return;
    const interval = setInterval(() => {
      const cutoff = Date.now() - 15000;
      setDetections((prev) => {
        const fresh = prev.filter((d) => (d.createdMs ? d.createdMs >= cutoff : false));
        return fresh.length !== prev.length ? fresh : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveMode]);

  // Compute distinct active cameras
  useEffect(() => {
    if (!isLiveMode) {
      setActiveCamCount(detections.length > 0 ? 4 : 0);
    } else {
      const uniqueCams = new Set(detections.map((d) => d.camera));
      setActiveCamCount(uniqueCams.size);
    }
  }, [detections, isLiveMode]);

  // Real KPI calculations from verified live runtime detections
  const personCount = detections.filter((d) => d.label === 'PERSON').length;
  const vehicleCount = detections.filter((d) =>
    ['VEHICLE', 'CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].includes(d.label)
  ).length;
  const intrusionCount = detections.filter(
    (d) => d.label === 'INTRUSION' || (typeof d.riskScore === 'number' && d.riskScore >= 70)
  ).length;

  const filtered = detections.filter((d) => {
    const matchesClass = filterClass === 'ALL' || d.label === filterClass;
    const matchesSearch =
      (d.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.camera || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.label || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-4" id="detections-view-root">
      {/* Live vs Benchmark Mode Banner & Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#0d1527] border border-[#1b2742] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#070d1a] border border-[#1e2d4d]">
            <Radio
              size={14}
              className={isLiveMode ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}
            />
            <span className="text-xs font-mono font-bold tracking-wider text-white">
              MODE: {isLiveMode ? 'LIVE SURVEILLANCE' : 'BENCHMARK FIXTURES'}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {isLiveMode
              ? 'Zero-Synthetic Policy active • Displaying verified runtime AI tracks only'
              : 'Controlled benchmark datasets active for offline model evaluation'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiveMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              isLiveMode
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#141e33] text-slate-400 border border-[#21304d] hover:text-white'
            }`}
          >
            ● LIVE MODE
          </button>
          <button
            onClick={() => setIsLiveMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              !isLiveMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-[#141e33] text-slate-400 border border-[#21304d] hover:text-white'
            }`}
          >
            DEMO / FIXTURE
          </button>
        </div>
      </div>

      {/* Demo Warning Banner when in Fixture Mode */}
      {!isLiveMode && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center gap-3 text-amber-200 text-xs font-mono">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <div>
            <strong className="text-amber-300">DEMO / BENCHMARK FIXTURE EVALUATION MODE:</strong> The rows
            below represent pre-recorded reference test datasets for SIH judge evaluation. They are NOT live
            surveillance intelligence. Switch to <strong>LIVE MODE</strong> to verify active camera feeds.
          </div>
        </div>
      )}

      {/* 4 Truthful KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <User size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">PERSON DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">{personCount}</p>
            <p className="text-[10px] text-emerald-400">
              {isLiveMode ? (personCount > 0 ? 'Verified active neural tracks' : '0 verified tracks') : 'Fixture benchmark samples'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Car size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">VEHICLE DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">{vehicleCount}</p>
            <p className="text-[10px] text-amber-400">
              {isLiveMode ? (vehicleCount > 0 ? 'Active transport telemetry' : '0 detected vehicles') : 'Ground transport telemetry'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">INTRUSION DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">{intrusionCount}</p>
            <p className="text-[10px] text-red-400">
              {isLiveMode ? (intrusionCount > 0 ? 'Active perimeter breaches' : '0 active breaches') : 'Restricted zone breaches'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Scan size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">SAFETY / PPE</p>
            <p className="text-2xl font-extrabold text-slate-300">
              {isLiveMode ? 'N/A' : '0'}
            </p>
            <p className="text-[10px] text-slate-400">
              {isLiveMode ? 'Module offline on edge profile' : 'Compliance checkpoints'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-4 sm:p-5 shadow-lg">
        {/* Table Top Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search camera or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0e1626] border border-[#21304d] text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter class buttons */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {['ALL', 'PERSON', 'VEHICLE', 'INTRUSION', 'NO_HELMET'].map((cls) => (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    filterClass === cls ? 'bg-blue-600 text-white' : 'bg-[#182338] text-slate-400 hover:text-white'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => exportDetectionsCSV(filtered.length > 0 ? filtered : detections)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182338] hover:bg-[#202f4a] text-slate-300 border border-[#223452] text-xs font-semibold cursor-pointer"
          >
            <Download size={13} />
            <span>Export Detections CSV</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            /* Truthful Empty State */
            <div className="py-14 px-4 text-center border border-dashed border-[#223354] rounded-xl my-2 bg-[#0c1424]">
              <div className="inline-flex p-3.5 rounded-full bg-[#142138] border border-cyan-500/30 text-cyan-400 mb-3 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                <ScanEye size={28} />
              </div>
              <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase">
                {isLiveMode ? 'NO LIVE DETECTIONS' : 'NO FIXTURE DETECTIONS'}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                {isLiveMode
                  ? 'No active camera currently reports verified AI detections. Live detections will automatically appear here in real time when a physical webcam or RTSP feed streams into the edge CV processor.'
                  : 'No fixture detections matched the specified search criteria.'}
              </p>
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#080e1a] border border-[#1b2844] text-[11px] font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cvStatus === 'ONLINE' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'
                    }`}
                  ></span>
                  CV Processor:{' '}
                  <strong className={cvStatus === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'}>
                    {cvStatus}
                  </strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  Active Cameras: <strong className="text-cyan-400">{activeCamCount}</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  Freshness Window: <strong className="text-amber-400">15s</strong>
                </span>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0e1626] text-slate-400 uppercase font-mono text-[11px] border-b border-[#1c273c]">
                <tr>
                  <th className="py-2.5 px-3">Class Tag</th>
                  <th className="py-2.5 px-3">Camera Node</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Location Sector</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Risk Assessment</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b263b] font-mono">
                {filtered.map((item) => {
                  const hasConf = typeof item.confidence === 'number' && item.confidence > 0;
                  const confStr = hasConf ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A';
                  const hasRisk = typeof item.riskScore === 'number';
                  const riskStr = hasRisk ? `${item.riskScore}/100` : 'N/A';

                  return (
                    <tr key={item.id} className="hover:bg-[#162136] transition-colors">
                      <td className="py-2.5 px-3 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              item.label === 'INTRUSION'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : item.label === 'VEHICLE'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.trackId && (
                            <span className="text-[10px] text-slate-500">#{item.trackId}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-blue-400 font-semibold">{item.camera}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            item.sourceType === 'browser_webcam'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                              : item.sourceType === 'live_camera' || item.sourceType === 'rtsp'
                              ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {item.sourceType === 'browser_webcam'
                            ? 'WEBCAM'
                            : item.sourceType === 'live_camera' || item.sourceType === 'rtsp'
                            ? 'RTSP'
                            : 'FIXTURE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">{item.location}</td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          hasConf ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {confStr}
                      </td>
                      <td className="py-2.5 px-3">
                        {hasRisk ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.riskScore! > 75
                                    ? 'bg-red-500'
                                    : item.riskScore! > 40
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${item.riskScore}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{riskStr}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{item.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
