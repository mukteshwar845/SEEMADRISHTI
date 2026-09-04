import React, { useState } from 'react';
import {
  Zap,
  Play,
  RotateCcw,
  ShieldAlert,
  Flame,
  Truck,
  Eye,
  Activity,
  CheckCircle2,
  Video,
  Sliders,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { DefconLevel } from '../../types';

interface DefenseSandboxViewProps {
  onTriggerAlert?: (camera: any) => void;
  onSetDefcon?: (level: DefconLevel) => void;
  onNavigate?: (view: string) => void;
}

interface SandboxScenario {
  id: string;
  title: string;
  code: string;
  targetCam: string;
  targetCamName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  videoFixture: string;
  escalation: string;
  expectedRiskScore: number;
}

export const DefenseSandboxView: React.FC<DefenseSandboxViewProps> = ({
  onTriggerAlert,
  onSetDefcon,
  onNavigate,
}) => {
  const { isDaylight } = useTheme();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [scenarioState, setScenarioState] = useState<'IDLE' | 'EXECUTING' | 'TRIGGERED'>('IDLE');
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [nightEnhancement, setNightEnhancement] = useState<boolean>(false);

  const scenarios: SandboxScenario[] = [
    {
      id: 'scen-1',
      title: 'Night-Time Barbed Wire Crossing',
      code: 'EXERCISE-ALPHA',
      targetCam: 'CAM-02',
      targetCamName: 'Sector Bravo Perimeter Fence',
      severity: 'CRITICAL',
      description: 'Simulates a covert intruder traversing the primary border wire at 02:40 AM with cutting shears. Tests tripwire zone geofence and Kalman trajectory dwell estimation.',
      videoFixture: '/fixtures/loitering_test.mp4',
      escalation: 'DEFCON 2 // Immediate Armed Breach Escalation',
      expectedRiskScore: 94,
    },
    {
      id: 'scen-2',
      title: 'High-Speed Vehicle Checkpoint Incursion',
      code: 'EXERCISE-BRAVO',
      targetCam: 'CAM-03',
      targetCamName: 'Sector Charlie Vehicle Checkpoint',
      severity: 'HIGH',
      description: 'Vehicle accelerates through approach corridor at 62 km/h without decelerating for entry gate. Tests optical flow speed calculation and automated barrier interlock.',
      videoFixture: '/fixtures/moving_objects.mp4',
      escalation: 'DEFCON 3 // QRF Squad Alpha Roadblock Dispatch',
      expectedRiskScore: 82,
    },
    {
      id: 'scen-3',
      title: 'Multi-Camera Target Handover (CAM-01 -> CAM-02)',
      code: 'EXERCISE-CHARLIE',
      targetCam: 'CAM-01',
      targetCamName: 'Sector Alpha to Sector Bravo Corridor',
      severity: 'HIGH',
      description: 'Re-identification (ReID) test: tracks a lone target crossing from Alpha Main Gate coverage wedge into Bravo Exclusion Fence without losing Kalman filter track identity.',
      videoFixture: '/fixtures/intrusion_test.mp4',
      escalation: 'Target Journey Handover Matrix Updated (94% ReID Match)',
      expectedRiskScore: 78,
    },
    {
      id: 'scen-4',
      title: 'Dense Fog & Low-Light Atmospheric Stress Test',
      code: 'EXERCISE-DELTA',
      targetCam: 'CAM-05',
      targetCamName: 'Sector Echo Forest Canopy',
      severity: 'MEDIUM',
      description: 'Atmospheric visibility drops to 15%. Evaluates Contrast-Limited Adaptive Histogram Equalization (CLAHE) and infrared night enhancement filter.',
      videoFixture: '/fixtures/sample_test.mp4',
      escalation: 'Night Intelligence CLAHE Enhancement Engaged',
      expectedRiskScore: 65,
    },
  ];

  const handleExecuteScenario = (scen: SandboxScenario) => {
    setActiveScenarioId(scen.id);
    setScenarioState('EXECUTING');
    setTelemetryLogs([`[0.0s] Initializing ${scen.code}: ${scen.title}`]);

    setTimeout(() => {
      setTelemetryLogs((prev) => [
        ...prev,
        `[0.8s] Routing surveillance stream to central neural pipeline: ${scen.targetCam}...`,
      ]);
    }, 800);

    setTimeout(() => {
      setTelemetryLogs((prev) => [
        ...prev,
        `[1.6s] YOLOv8 Edge inference active: Kalman tracker assigned Track #${Math.floor(Math.random() * 500) + 100}`,
      ]);
    }, 1600);

    setTimeout(() => {
      setTelemetryLogs((prev) => [
        ...prev,
        `[2.4s] Zone violation confirmed! Risk score escalated to ${scen.expectedRiskScore} [${scen.severity}]`,
        `[2.8s] ${scen.escalation}`,
      ]);
      setScenarioState('TRIGGERED');

      if (scen.severity === 'CRITICAL' && onSetDefcon) {
        onSetDefcon(2);
      } else if (scen.severity === 'HIGH' && onSetDefcon) {
        onSetDefcon(3);
      }

      if (onTriggerAlert) {
        onTriggerAlert({
          id: scen.targetCam.toLowerCase(),
          name: scen.targetCamName,
          tag: scen.targetCam,
        });
      }
    }, 2800);
  };

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="p-4 bg-slate-950/90 border border-cyan-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/80 border border-amber-500/40 rounded-xl text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              DEFENSE SCENARIO SANDBOX // EVALUATOR EXERCISE LAB
              <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] rounded border border-amber-500/30 font-bold">
                SIH EVALUATION READY
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              One-click live field exercise injection: wire crossing, vehicle incursion, ReID handover, and night-vision stress test.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setActiveScenarioId(null);
            setScenarioState('IDLE');
            setTelemetryLogs([]);
          }}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={14} /> RESET LAB
        </button>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 4 Selectable Scenarios (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-400 px-1">
            SELECT INTRUSION / EVALUATION SCENARIO:
          </div>

          {scenarios.map((scen) => {
            const isSelected = activeScenarioId === scen.id;
            return (
              <div
                key={scen.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{scen.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    scen.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' :
                    scen.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                    'bg-slate-900 text-slate-300'
                  }`}>
                    {scen.severity}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {scen.description}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-900 text-[10px]">
                  <span className="text-cyan-400 font-bold">{scen.targetCam} &bull; {scen.code}</span>
                  <button
                    onClick={() => handleExecuteScenario(scen)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg cursor-pointer flex items-center gap-1 transition-all shadow-sm"
                  >
                    <Play size={10} /> INJECT SCENARIO
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Live Playback, CLAHE Filter, Telemetry Feed (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Video Preview with CLAHE filter toggle */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Video size={14} /> LIVE CAMERA REPLAY // {activeScenario.targetCam}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNightEnhancement(!nightEnhancement)}
                  className={`px-2 py-0.5 rounded text-[10px] border font-bold transition-colors cursor-pointer ${
                    nightEnhancement
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  <Eye size={10} className="inline mr-1" />
                  CLAHE NIGHT VISION: {nightEnhancement ? 'ON' : 'OFF'}
                </button>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  scenarioState === 'TRIGGERED' ? 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse' :
                  scenarioState === 'EXECUTING' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                  'bg-slate-900 text-slate-400'
                }`}>
                  {scenarioState === 'TRIGGERED' ? 'BREACH CONFIRMED' : scenarioState === 'EXECUTING' ? 'SIMULATING...' : 'STANDBY'}
                </span>
              </div>
            </div>

            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video
                key={activeScenario.videoFixture}
                src={activeScenario.videoFixture}
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-cover ${nightEnhancement ? 'contrast-150 brightness-125 saturate-50 sepia-25 hue-rotate-90' : ''}`}
              />

              {/* HUD Target Overlay */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur rounded text-[10px] text-cyan-400 border border-cyan-500/30">
                AI MOT INFERENCE: 640x640 // 14ms
              </div>

              {scenarioState === 'TRIGGERED' && (
                <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-rose-950/90 border border-rose-500 text-rose-200 rounded-lg text-xs font-bold animate-bounce shadow-[0_0_20px_rgba(244,63,94,0.5)]">
                  ALERT DISPATCHED // RISK SCORE: {activeScenario.expectedRiskScore}
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Log Output */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Terminal size={14} className="text-amber-400" /> TACTICAL EXERCISE LOGS
            </div>
            <div className="p-3 bg-black/60 rounded-xl min-h-[110px] max-h-[140px] overflow-y-auto space-y-1 text-xs text-slate-300 font-mono">
              {telemetryLogs.length === 0 ? (
                <span className="text-slate-600 italic">Select and inject any scenario to begin exercise.</span>
              ) : (
                telemetryLogs.map((l, i) => (
                  <div key={i} className="text-emerald-300">{l}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
