import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Clock, ShieldAlert, AlertTriangle, Layers, Filter } from 'lucide-react';

interface DwellBucketData {
  bucket: string;
  label: string;
  rangeSec: string;
  cam1: number;
  cam2: number;
  cam3: number;
  cam4: number;
  total: number;
  threatCategory: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

const defaultDwellData: DwellBucketData[] = [
  {
    bucket: '< 15s',
    label: 'Rapid Transit',
    rangeSec: '0 - 15s',
    cam1: 420,
    cam2: 290,
    cam3: 180,
    cam4: 310,
    total: 1200,
    threatCategory: 'NORMAL',
  },
  {
    bucket: '15 - 30s',
    label: 'Brief Halt',
    rangeSec: '15 - 30s',
    cam1: 185,
    cam2: 140,
    cam3: 95,
    cam4: 160,
    total: 580,
    threatCategory: 'NORMAL',
  },
  {
    bucket: '30 - 60s',
    label: 'Suspicious Dwell',
    rangeSec: '30 - 60s',
    cam1: 85,
    cam2: 110,
    cam3: 45,
    cam4: 70,
    total: 310,
    threatCategory: 'ELEVATED',
  },
  {
    bucket: '60 - 120s',
    label: 'Loitering Threat',
    rangeSec: '60 - 120s',
    cam1: 32,
    cam2: 68,
    cam3: 24,
    cam4: 38,
    total: 162,
    threatCategory: 'HIGH',
  },
  {
    bucket: '> 120s',
    label: 'Critical Trespass',
    rangeSec: '> 120s',
    cam1: 12,
    cam2: 45,
    cam3: 9,
    cam4: 18,
    total: 84,
    threatCategory: 'CRITICAL',
  },
];

export const RechartsDwellDistributionChart: React.FC = () => {
  const [activeCamFilter, setActiveCamFilter] = useState<'ALL' | 'CAM-01' | 'CAM-02' | 'CAM-03' | 'CAM-04'>('ALL');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = defaultDwellData.find((d) => d.bucket === label);
      return (
        <div className="bg-slate-950/95 border border-cyan-500/40 p-3 rounded-xl shadow-2xl text-[11px] font-mono text-slate-200 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-cyan-300">{label} ({dataPoint?.rangeSec})</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                dataPoint?.threatCategory === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                  : dataPoint?.threatCategory === 'HIGH'
                  ? 'bg-orange-950 text-orange-300 border border-orange-500/50'
                  : dataPoint?.threatCategory === 'ELEVATED'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
              }`}
            >
              {dataPoint?.threatCategory}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 mb-2">
            Category: <span className="font-bold text-white">{dataPoint?.label}</span>
          </div>

          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex justify-between items-center text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300">{entry.name}:</span>
                </span>
                <span className="font-bold text-white">{entry.value} objects</span>
              </div>
            ))}
            <div className="border-t border-slate-800 pt-1 mt-1 flex justify-between font-bold text-cyan-400 text-[10px]">
              <span>TOTAL DETECTIONS:</span>
              <span>{dataPoint?.total} objects</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#0a0f1d]/90 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={15} />
          </span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              RECHARTS DWELL TIME DISTRIBUTION
              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                LOITERING DETECTION
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Histogram breakdown of object residency durations across camera grid nodes
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px]">
          {(['ALL', 'CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'] as const).map((cam) => (
            <button
              key={cam}
              onClick={() => setActiveCamFilter(cam)}
              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                activeCamFilter === cam
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cam}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={defaultDwellData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="bucket"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#334155' }}
              label={{
                value: 'DETECTION COUNT',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 9,
                offset: 10,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              formatter={(value) => <span className="text-slate-300">{value}</span>}
            />
            <ReferenceLine y={200} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'ELEVATED ALERT DENSITY', fill: '#f43f5e', fontSize: 9, position: 'top' }} />

            {activeCamFilter === 'ALL' || activeCamFilter === 'CAM-01' ? (
              <Bar dataKey="cam1" name="CAM-01 (Main Gate)" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
            ) : null}
            {activeCamFilter === 'ALL' || activeCamFilter === 'CAM-02' ? (
              <Bar dataKey="cam2" name="CAM-02 (Fence Line)" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
            ) : null}
            {activeCamFilter === 'ALL' || activeCamFilter === 'CAM-03' ? (
              <Bar dataKey="cam3" name="CAM-03 (Compound)" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
            ) : null}
            {activeCamFilter === 'ALL' || activeCamFilter === 'CAM-04' ? (
              <Bar dataKey="cam4" name="CAM-04 (Perimeter Rd)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Footer Line */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[9px]">TOTAL SAMPLES</span>
          <span className="text-white font-bold text-xs">2,336 OBJECTS</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[9px]">AVG RESIDENCY</span>
          <span className="text-cyan-400 font-bold text-xs">26.4 SECONDS</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[9px]">LOITERING RATIO</span>
          <span className="text-amber-400 font-bold text-xs">10.5% (&gt;60s)</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[9px]">HIGHEST BREACH ZONE</span>
          <span className="text-rose-400 font-bold text-xs">CAM-02 FENCE</span>
        </div>
      </div>
    </div>
  );
};
