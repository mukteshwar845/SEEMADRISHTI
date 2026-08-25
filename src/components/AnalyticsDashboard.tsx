import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  Camera,
  ShieldAlert,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Zap,
} from 'lucide-react';
import { CameraFeed } from '../types';

interface AnalyticsDashboardProps {
  cameras?: CameraFeed[];
}

// 24-hour mock data generated with realistic surveillance pattern
// Night: fewer general pedestrians, higher proportion of suspicious intrusions & loitering
// Day: high vehicle and person traffic, peak at rush hours (08:00 - 10:00 and 17:00 - 19:00)
// Afternoon: safety helmet infractions
const generate24HourData = () => {
  const hours = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  ];

  return hours.map((hour, idx) => {
    const isNight = idx < 6 || idx >= 22;
    const isPeakRush = (idx >= 7 && idx <= 9) || (idx >= 17 && idx <= 19);
    const isMidday = idx >= 11 && idx <= 15;

    let person = isNight ? Math.floor(8 + Math.random() * 12) : isPeakRush ? Math.floor(110 + Math.random() * 45) : Math.floor(55 + Math.random() * 30);
    let vehicle = isNight ? Math.floor(3 + Math.random() * 8) : isPeakRush ? Math.floor(95 + Math.random() * 40) : Math.floor(40 + Math.random() * 25);
    let intrusion = isNight ? Math.floor(5 + Math.random() * 8) : Math.floor(1 + Math.random() * 4);
    let noHelmet = isMidday ? Math.floor(8 + Math.random() * 10) : Math.floor(1 + Math.random() * 5);
    let loitering = isNight ? Math.floor(4 + Math.random() * 6) : Math.floor(2 + Math.random() * 4);
    let abandoned = isPeakRush ? Math.floor(1 + Math.random() * 3) : Math.random() > 0.6 ? 1 : 0;

    const totalAnomalies = intrusion + noHelmet + loitering + abandoned;
    const totalDetections = person + vehicle + totalAnomalies;
    const anomalyRate = Number(((totalAnomalies / (totalDetections || 1)) * 100).toFixed(1));
    const riskIndex = Math.min(100, Math.floor(totalAnomalies * 5.2 + (isNight ? 25 : 5)));

    // Camera contributions for this hour
    const cam1 = Math.floor(totalDetections * 0.42);
    const cam2 = Math.floor(totalDetections * 0.28);
    const cam3 = Math.floor(totalDetections * 0.12);
    const cam4 = Math.floor(totalDetections * 0.18);

    const cam1Anomalies = Math.floor(totalAnomalies * 0.35);
    const cam2Anomalies = Math.floor(totalAnomalies * 0.40);
    const cam3Anomalies = Math.floor(totalAnomalies * 0.10);
    const cam4Anomalies = Math.floor(totalAnomalies * 0.15);

    return {
      hour,
      hourIndex: idx,
      totalDetections,
      person,
      vehicle,
      intrusion,
      noHelmet,
      loitering,
      abandoned,
      totalAnomalies,
      anomalyRate,
      riskIndex,
      cam1,
      cam2,
      cam3,
      cam4,
      cam1Anomalies,
      cam2Anomalies,
      cam3Anomalies,
      cam4Anomalies,
    };
  });
};

const detectionTypesData = [
  { name: 'Person', count: 1245, color: '#3b82f6', percentage: 43.8, isAnomaly: false },
  { name: 'Vehicle', count: 980, color: '#06b6d4', percentage: 34.5, isAnomaly: false },
  { name: 'Perimeter Intrusion', count: 214, color: '#f43f5e', percentage: 7.5, isAnomaly: true },
  { name: 'Safety / No-Helmet', count: 182, color: '#f59e0b', percentage: 6.4, isAnomaly: true },
  { name: 'Loitering Anomaly', count: 148, color: '#a855f7', percentage: 5.2, isAnomaly: true },
  { name: 'Unattended Object', count: 73, color: '#ec4899', percentage: 2.6, isAnomaly: true },
];

const cameraSummaryData = [
  {
    camera: 'CAM 1',
    name: 'Checkpoint Alpha',
    location: 'North Main Gate',
    total: 1210,
    anomalies: 82,
    normal: 1128,
    rate: '6.8%',
    riskLevel: 'Elevated',
    color: '#3b82f6',
  },
  {
    camera: 'CAM 2',
    name: 'Border Perimeter',
    location: 'East Fence Boundary',
    total: 814,
    anomalies: 106,
    normal: 708,
    rate: '13.0%',
    riskLevel: 'High Risk',
    color: '#f43f5e',
  },
  {
    camera: 'CAM 3',
    name: 'Armory Logistics',
    location: 'Warehouse Bay A',
    total: 320,
    anomalies: 21,
    normal: 299,
    rate: '6.5%',
    riskLevel: 'Moderate',
    color: '#f59e0b',
  },
  {
    camera: 'CAM 4',
    name: 'Server Corridor',
    location: 'Internal Lobby Post',
    total: 498,
    anomalies: 38,
    normal: 460,
    rate: '7.6%',
    riskLevel: 'Moderate',
    color: '#10b981',
  },
];

const radarThreatDistribution = [
  { subject: 'Perimeter Breaches', CAM1: 65, CAM2: 95, CAM3: 20, CAM4: 40 },
  { subject: 'Night Activity', CAM1: 45, CAM2: 88, CAM3: 30, CAM4: 75 },
  { subject: 'Safety PPE Violations', CAM1: 85, CAM2: 40, CAM3: 70, CAM4: 15 },
  { subject: 'Loitering Index', CAM1: 50, CAM2: 60, CAM3: 40, CAM4: 92 },
  { subject: 'Vehicle Anomalies', CAM1: 90, CAM2: 30, CAM3: 55, CAM4: 20 },
  { subject: 'Blindspot Infiltration', CAM1: 30, CAM2: 92, CAM3: 65, CAM4: 35 },
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '12h' | '6h'>('24h');
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('all');
  const [chartMetric, setChartMetric] = useState<'all' | 'anomalies' | 'classes'>('all');
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Raw 24-hour surveillance timeline
  const baseTimeline = useMemo(() => generate24HourData(), []);

  // Filtered timeline based on hours
  const filteredTimeline = useMemo(() => {
    let sliceCount = 24;
    if (timeRange === '12h') sliceCount = 12;
    if (timeRange === '6h') sliceCount = 6;
    return baseTimeline.slice(24 - sliceCount);
  }, [baseTimeline, timeRange]);

  // Aggregate summary statistics
  const summaryStats = useMemo(() => {
    const totalDetections = filteredTimeline.reduce((acc, curr) => acc + curr.totalDetections, 0);
    const totalAnomalies = filteredTimeline.reduce((acc, curr) => acc + curr.totalAnomalies, 0);
    const totalIntrusions = filteredTimeline.reduce((acc, curr) => acc + curr.intrusion, 0);
    const avgConfidence = 96.8;
    const avgAnomalyRate = Number(((totalAnomalies / (totalDetections || 1)) * 100).toFixed(1));
    
    // Find peak hour
    let peakHour = filteredTimeline[0];
    filteredTimeline.forEach((item) => {
      if (item.totalAnomalies > (peakHour?.totalAnomalies || 0)) {
        peakHour = item;
      }
    });

    return {
      totalDetections,
      totalAnomalies,
      totalIntrusions,
      avgConfidence,
      avgAnomalyRate,
      peakHour: peakHour ? `${peakHour.hour} (${peakHour.totalAnomalies} alerts)` : '03:00',
    };
  }, [filteredTimeline]);

  // Export report simulation
  const handleExportReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      reportTitle: "TRINETRA AI Surveillance 24H Analytics Report",
      generatedAt: new Date().toISOString(),
      timeRange,
      summaryStats,
      timeline: filteredTimeline,
      cameraBreakdown: cameraSummaryData,
    }, null, 2));
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trinetra-analytics-24h-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setNotificationMsg('Analytics 24-Hour telemetry report exported successfully.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="analytics-dashboard-root">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 text-xs font-mono font-bold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* 1. Header with Controls & Range Pickers */}
      <div className="p-4 sm:p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <TrendingUp size={20} />
            </span>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-[0.18em] font-mono">
              AI DETECTION & ANOMALY ANALYTICS (PAST 24 HOURS)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Statistical regression, neural detection frequency, cross-camera anomaly patterns, and risk velocity trends.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center bg-[#060911] border border-white/[0.08] rounded-xl p-0.5 text-xs font-mono">
            {(['24h', '12h', '6h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Camera Filter Selector */}
          <select
            value={selectedCameraFilter}
            onChange={(e) => setSelectedCameraFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#060911] border border-white/[0.08] text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">All 4 Cameras</option>
            <option value="cam-1">CAM 1 - Main Checkpoint</option>
            <option value="cam-2">CAM 2 - Perimeter Fence</option>
            <option value="cam-3">CAM 3 - Armory Logistics</option>
            <option value="cam-4">CAM 4 - Server Lobby</option>
          </select>

          {/* Export Report Button */}
          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Download size={13} className="text-cyan-400" />
            <span>EXPORT JSON/CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Analytical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total 24h Detections */}
        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              TOTAL 24H DETECTIONS
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Eye size={15} />
            </span>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {summaryStats.totalDetections.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 flex items-center font-bold">
              <ArrowUpRight size={13} /> +14.2% vs yesterday
            </span>
            <span className="text-slate-400">96.8% Model Conf</span>
          </div>
        </div>

        {/* 24h Anomalies */}
        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              24H ANOMALY BREACHES
            </span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertTriangle size={15} />
            </span>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
              {summaryStats.totalAnomalies}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-rose-400 font-bold">{summaryStats.avgAnomalyRate}% Anomaly Ratio</span>
            <span className="text-slate-400">{summaryStats.totalIntrusions} High Risk</span>
          </div>
        </div>

        {/* Peak Anomaly Hour */}
        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              PEAK THREAT WINDOW
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Clock size={15} />
            </span>
          </div>
          <div className="my-2">
            <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight">
              {summaryStats.peakHour}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-amber-400 font-bold">Night Shift Sector</span>
            <span className="text-slate-400">Post 02 Fence</span>
          </div>
        </div>

        {/* Tactical Response Velocity */}
        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              MEAN INTERCEPT TIME
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Zap size={15} />
            </span>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              1m 18s
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-bold">99.4% Handover</span>
            <span className="text-slate-400">Patrol Squad Alpha</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Chart: Detection Patterns by Hour (Past 24 Hours) */}
      <div className="p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                HOURLY DETECTION PATTERNS & VOLUME TRAJECTORY
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Temporal distribution of human pedestrians, vehicles, and anomalous perimeter triggers over 24 hours.
            </p>
          </div>

          {/* Metric View Switcher */}
          <div className="flex items-center gap-1.5 bg-[#060911] border border-white/[0.08] rounded-xl p-1 text-[11px] font-mono">
            <button
              onClick={() => setChartMetric('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMetric === 'all'
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stacked Volume
            </button>
            <button
              onClick={() => setChartMetric('anomalies')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMetric === 'anomalies'
                  ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Anomalies Only
            </button>
            <button
              onClick={() => setChartMetric('classes')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMetric === 'classes'
                  ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Class Breakdown
            </button>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'all' ? (
              <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPerson" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVehicle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Area
                  type="monotone"
                  dataKey="person"
                  name="Persons"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPerson)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="vehicle"
                  name="Vehicles"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVehicle)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="totalAnomalies"
                  name="Anomalies & Breaches"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAnomaly)"
                  stackId="1"
                />
              </AreaChart>
            ) : chartMetric === 'anomalies' ? (
              <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIntrusion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLoitering" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHelmet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Area
                  type="monotone"
                  dataKey="intrusion"
                  name="Perimeter Intrusion"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#colorIntrusion)"
                />
                <Area
                  type="monotone"
                  dataKey="loitering"
                  name="Suspicious Loitering"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#colorLoitering)"
                />
                <Area
                  type="monotone"
                  dataKey="noHelmet"
                  name="No-Helmet Infraction"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#colorHelmet)"
                />
              </AreaChart>
            ) : (
              <BarChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="person" name="Persons" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vehicle" name="Vehicles" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalAnomalies" name="Anomalies" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Dual Section: Detections by Type (Donut) & Anomaly Frequency Trends (Line/Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Detections by Class / Type (5 Cols) */}
        <div className="lg:col-span-5 p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between">
          <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                DETECTIONS BY OBJECT CLASS
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">24h Classified Neural Categories</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              6 Classes
            </span>
          </div>

          {/* Pie / Donut Chart */}
          <div className="h-56 w-full my-2 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={detectionTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {detectionTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0a0f1d" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} detections`, name]}
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center HUD Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-white font-mono">2,842</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">TOTAL</span>
            </div>
          </div>

          {/* Detailed Class Breakdown Badges */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06] font-mono text-xs">
            {detectionTypesData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                  {item.isAnomaly && (
                    <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      ANOMALY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{item.count.toLocaleString()}</span>
                  <span className="font-bold text-white w-10 text-right">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Anomaly Frequency & Threat Risk Velocity Trend (7 Cols) */}
        <div className="lg:col-span-7 p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between">
          <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Flame size={15} className="text-rose-400" />
                <span>24H ANOMALY FREQUENCY & RISK INDEX TREND</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Threat density correlation (0-100 Risk Score) vs Anomaly Rate percentage.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/30 animate-pulse">
              LIVE TELEMETRY
            </span>
          </div>

          {/* Anomaly Trend Chart */}
          <div className="h-64 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="riskIndex"
                  name="Calculated Threat Risk Index (0-100)"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="anomalyRate"
                  name="Anomaly Trigger Rate (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tactical Bottom Callout */}
          <div className="p-3 bg-[#060911] border border-white/[0.06] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldAlert size={15} className="text-amber-400" />
              <span>Critical Breach Window: <strong>01:00 - 04:30 AM</strong></span>
            </div>
            <span className="text-emerald-400 font-bold">Patrol Drone Recon Activated</span>
          </div>
        </div>
      </div>

      {/* 5. Camera Node Volume & Threat Comparison (Bar Chart + Radar Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Stacked Camera Volumes (7 cols) */}
        <div className="lg:col-span-7 p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-4">
          <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Camera size={16} className="text-blue-400" />
                <span>DETECTIONS & ANOMALIES BY CAMERA NODE</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Comparative throughput and violation distribution across configured RTSP nodes.
              </p>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraSummaryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="camera" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="normal" name="Standard Traffic (Persons/Vehicles)" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="anomalies" name="Threat Anomalies" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Camera Performance Table Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {cameraSummaryData.map((c) => (
              <div key={c.camera} className="p-2.5 rounded-xl bg-[#060911] border border-white/[0.06] font-mono">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-white">{c.camera}</span>
                  <span className="text-[9px] text-slate-400">{c.rate} Anom</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{c.name}</p>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-slate-300 font-bold">{c.total} total</span>
                  <span className={c.anomalies > 50 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                    {c.anomalies} alt
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Radar Vector Threat Matrix (5 cols) */}
        <div className="lg:col-span-5 p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Radio size={15} className="text-purple-400" />
              <span>RADAR THREAT PROFILE DISPERSION</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Multi-vector tactical comparison between Checkpoint CAM 1 & Perimeter CAM 2.
            </p>
          </div>

          <div className="h-64 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarThreatDistribution}>
                <PolarGrid stroke="#ffffff15" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
                <Radar name="CAM 1 (Checkpoint)" dataKey="CAM1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
                <Radar name="CAM 2 (Border Fence)" dataKey="CAM2" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.45} />
                <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '10px', fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b14',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-[11px] font-mono text-purple-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
            <span>CAM 2 exhibits 42% higher blindspot and nighttime infiltration risk.</span>
          </div>
        </div>
      </div>

      {/* 6. Hourly Anomaly Heat Matrix Audit Table */}
      <div className="p-5 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              24-HOUR DETAILED HOURLY AUDIT LOG
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Chronological log of all detections, class distributions, and anomaly severity ratings.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.06]">
            Displaying {filteredTimeline.length} Hourly Slots
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3">Hour Window</th>
                <th className="py-2.5 px-3">Total Traffic</th>
                <th className="py-2.5 px-3">Persons</th>
                <th className="py-2.5 px-3">Vehicles</th>
                <th className="py-2.5 px-3">Perimeter Intrusions</th>
                <th className="py-2.5 px-3">No-Helmet/Loiter</th>
                <th className="py-2.5 px-3">Anomaly Rate</th>
                <th className="py-2.5 px-3 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTimeline.map((row) => (
                <tr key={row.hour} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span>{row.hour}</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-200">{row.totalDetections}</td>
                  <td className="py-2.5 px-3 text-blue-400">{row.person}</td>
                  <td className="py-2.5 px-3 text-cyan-400">{row.vehicle}</td>
                  <td className="py-2.5 px-3 font-bold">
                    {row.intrusion > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {row.intrusion} BREACHES
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-amber-400">
                    {row.noHelmet + row.loitering + row.abandoned}
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        row.anomalyRate > 15
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : row.anomalyRate > 8
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {row.anomalyRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    <span
                      className={
                        row.riskIndex > 60
                          ? 'text-rose-400'
                          : row.riskIndex > 35
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {row.riskIndex} / 100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
