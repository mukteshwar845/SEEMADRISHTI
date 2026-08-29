import React, { useState, useEffect } from 'react';
import { DetectionItem } from '../types';
import { initialDetections } from '../data/mockData';
import {
  Scan,
  Filter,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  Layers,
  Car,
  User,
  ShieldAlert,
} from 'lucide-react';
import { fetchEvents, exportDetectionsCSV } from '../services/api';
import { webSocketService } from '../services/websocketService';

export const DetectionsView: React.FC = () => {
  const [detections, setDetections] = useState<DetectionItem[]>(initialDetections);
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const mapped: DetectionItem[] = res.data.map((evt: any) => {
            const meta = typeof evt.metadata === 'object' && evt.metadata !== null ? evt.metadata : {};
            const d = new Date(evt.timestamp);
            const timeStr = isNaN(d.getTime()) ? '00:00:00' : d.toLocaleTimeString();
            const labelStr = (meta.class_name || evt.event_type || 'PERSON').toUpperCase();
            const label: DetectionItem['label'] =
              labelStr === 'VEHICLE' || labelStr === 'CAR' || labelStr === 'TRUCK'
                ? 'VEHICLE'
                : labelStr === 'NO_HELMET'
                ? 'NO_HELMET'
                : labelStr === 'LOITERING'
                ? 'LOITERING'
                : labelStr === 'INTRUSION'
                ? 'INTRUSION'
                : 'PERSON';
            return {
              id: evt.id,
              camera: evt.camera_id?.toUpperCase() || 'CAM-01',
              location: evt.zone_name || 'Border Sector Alpha',
              label,
              confidence: (evt.confidence || 0.95) > 1 ? (evt.confidence || 95) / 100 : (evt.confidence || 0.95),
              riskScore: evt.risk_score !== undefined ? evt.risk_score : 50,
              time: timeStr,
              bbox: meta.bbox || { x: 100, y: 100, width: 60, height: 120 },
              color: label === 'INTRUSION' ? '#f43f5e' : label === 'VEHICLE' ? '#f59e0b' : '#10b981',
            };
          });
          setDetections(mapped);
        }
      })
      .catch(() => {});

    const unsubDet = webSocketService.onDetection((payload: any) => {
      if (payload && payload.detections && Array.isArray(payload.detections)) {
        const mappedList: DetectionItem[] = payload.detections.map((det: any, idx: number) => {
          const labelStr = (det.class_name || det.label || 'PERSON').toUpperCase();
          const label: DetectionItem['label'] =
            labelStr === 'VEHICLE' || labelStr === 'CAR' || labelStr === 'TRUCK'
              ? 'VEHICLE'
              : labelStr === 'NO_HELMET'
              ? 'NO_HELMET'
              : labelStr === 'LOITERING'
              ? 'LOITERING'
              : labelStr === 'INTRUSION'
              ? 'INTRUSION'
              : 'PERSON';
          return {
            id: `ws-det-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            camera: (payload.camera_id || 'CAM-01').toUpperCase(),
            location: 'Border Sector Line',
            label,
            confidence: det.confidence || 0.95,
            riskScore: label === 'INTRUSION' ? 92 : label === 'LOITERING' ? 74 : 18,
            time: new Date().toLocaleTimeString(),
            bbox: det.bbox ? {
              x: det.bbox.x1 || 100,
              y: det.bbox.y1 || 100,
              width: (det.bbox.x2 - det.bbox.x1) || 60,
              height: (det.bbox.y2 - det.bbox.y1) || 120,
            } : { x: 100, y: 100, width: 60, height: 120 },
            color: label === 'INTRUSION' ? '#ef4444' : label === 'VEHICLE' ? '#38bdf8' : '#10b981',
          };
        });
        setDetections((prev) => [...mappedList, ...prev].slice(0, 80));
      } else if (payload) {
        const labelStr = (payload.label || 'PERSON').toUpperCase();
        const label: DetectionItem['label'] =
          labelStr === 'VEHICLE'
            ? 'VEHICLE'
            : labelStr === 'NO_HELMET'
            ? 'NO_HELMET'
            : labelStr === 'LOITERING'
            ? 'LOITERING'
            : labelStr === 'INTRUSION'
            ? 'INTRUSION'
            : 'PERSON';
        const newItem: DetectionItem = {
          id: payload.id || `det-${Date.now()}`,
          camera: payload.camera?.toUpperCase() || 'CAM-01',
          location: payload.location || 'Border Sector Alpha',
          label,
          confidence: payload.confidence || 0.95,
          riskScore: payload.riskScore || 50,
          time: payload.time || new Date().toLocaleTimeString(),
          bbox: payload.bbox || { x: 100, y: 100, width: 60, height: 120 },
          color: payload.color || '#10b981',
        };
        setDetections((prev) => [newItem, ...prev.slice(0, 79)]);
      }
    });

    return () => {
      unsubDet();
    };
  }, []);

  const personCount = detections.filter((d) => d.label === 'PERSON').length;
  const vehicleCount = detections.filter((d) => ['VEHICLE', 'CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].includes(d.label)).length;
  const intrusionCount = detections.filter((d) => d.label === 'INTRUSION' || d.riskScore >= 70).length;
  const ppeCount = detections.filter((d) => d.label.includes('HELMET') || d.label.includes('PPE')).length;

  const filtered = detections.filter((d) => {
    const matchesClass = filterClass === 'ALL' || d.label === filterClass;
    const matchesSearch =
      d.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.camera.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-4" id="detections-view-root">
      {/* Header Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <User size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">PERSON DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">{personCount}</p>
            <p className="text-[10px] text-emerald-400">Verified neural tracks</p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Car size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">VEHICLE DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">{vehicleCount}</p>
            <p className="text-[10px] text-amber-400">Ground transport telemetry</p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">INTRUSION DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">{intrusionCount}</p>
            <p className="text-[10px] text-red-400">Restricted zone breaches</p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Scan size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">SAFETY / PPE</p>
            <p className="text-2xl font-extrabold text-white">{ppeCount}</p>
            <p className="text-[10px] text-blue-400">Compliance checkpoints</p>
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
                    filterClass === cls
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#182338] text-slate-400 hover:text-white'
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
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0e1626] text-slate-400 uppercase font-mono text-[11px] border-b border-[#1c273c]">
              <tr>
                <th className="py-2.5 px-3">Class Tag</th>
                <th className="py-2.5 px-3">Camera Node</th>
                <th className="py-2.5 px-3">Location Sector</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b263b] font-mono">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#162136] transition-colors">
                  <td className="py-2.5 px-3 font-bold">
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
                  </td>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">{item.camera}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{item.location}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.riskScore > 75
                              ? 'bg-red-500'
                              : item.riskScore > 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.riskScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{item.riskScore}/100</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
