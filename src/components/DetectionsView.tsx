import React, { useState } from 'react';
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

export const DetectionsView: React.FC = () => {
  const [detections, setDetections] = useState<DetectionItem[]>(initialDetections);
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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
            <p className="text-2xl font-extrabold text-white">1,245</p>
            <p className="text-[10px] text-emerald-400">43.6% of total traffic</p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Car size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">VEHICLE DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">1,102</p>
            <p className="text-[10px] text-amber-400">38.8% of total traffic</p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">INTRUSION DETECTIONS</p>
            <p className="text-2xl font-extrabold text-white">134</p>
            <p className="text-[10px] text-red-400">Restricted zone breaches</p>
          </div>
        </div>

        <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Scan size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">SAFETY / PPE</p>
            <p className="text-2xl font-extrabold text-white">341</p>
            <p className="text-[10px] text-blue-400">Helmet & vest anomalies</p>
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
            onClick={() => alert('Exporting Detection Log CSV/JSON...')}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182338] hover:bg-[#202f4a] text-slate-300 border border-[#223452] text-xs font-semibold cursor-pointer"
          >
            <Download size={13} />
            <span>Export Detections</span>
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
