import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, AlertTriangle, Zap, Eye, Navigation, Scale, Globe, Square, Play, RotateCcw } from 'lucide-react';

interface SimStatus {
  running: boolean;
  currentStep: number;
  totalSteps: number;
  loopCount: number;
  startedAt: string | null;
}

const SCENARIO_STEPS = [
  { label: 'SENTINEL: Humanoid detected on CAM-03', agent: 'SENTINEL', color: '#00f0ff', icon: Eye, delayMs: 0 },
  { label: 'SENTINEL: Lock-on tracking TRK-9921', agent: 'SENTINEL', color: '#00f0ff', icon: Eye, delayMs: 2000 },
  { label: 'SENTINEL: TRIPWIRE NW-04 BREACHED ⚡ HIGH ALERT', agent: 'SENTINEL', color: '#ef4444', icon: AlertTriangle, delayMs: 4000 },
  { label: 'PATHFINDER: Cross-camera handover → CAM-06', agent: 'PATHFINDER', color: '#ec4899', icon: Navigation, delayMs: 6000 },
  { label: 'PATHFINDER: Multi-cam corridor CORRELATED', agent: 'PATHFINDER', color: '#ec4899', icon: Navigation, delayMs: 8000 },
  { label: 'COMMANDER: QRT Delta-02 dispatched — ETA 42s', agent: 'COMMANDER', color: '#10b981', icon: Shield, delayMs: 10000 },
  { label: 'AWARENESS-05: Fog advisory — FLIR activated', agent: 'AWARENESS', color: '#f59e0b', icon: Globe, delayMs: 14000 },
  { label: 'LEX FORENSIC: SHA-256 evidence sealed ✓', agent: 'LEX', color: '#a855f7', icon: Scale, delayMs: 18000 },
];

const LOOP_DURATION_MS = 35000;

export const ThreatDemoButton: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [loopCount, setLoopCount] = useState(0);
  const [loopProgress, setLoopProgress] = useState(0); // 0-100
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimersRef = useRef<NodeJS.Timeout[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loopStartRef = useRef<number>(0);

  const clearAll = useCallback(() => {
    stepTimersRef.current.forEach((t) => clearTimeout(t));
    stepTimersRef.current = [];
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = null;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
  }, []);

  const startLoop = useCallback(async (loopNum: number) => {
    // Fire backend
    try {
      await fetch('/api/v1/agents/simulation/start', { method: 'POST' });
    } catch {
      // fallback to frontend-only
    }

    loopStartRef.current = Date.now();
    setLoopCount(loopNum);
    setCompletedSteps([]);
    setCurrentStepIdx(0);

    // Progress bar
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - loopStartRef.current;
      setLoopProgress(Math.min(100, Math.round((elapsed / LOOP_DURATION_MS) * 100)));
    }, 100);

    // Step activations
    SCENARIO_STEPS.forEach((step, idx) => {
      const t = setTimeout(() => {
        setCurrentStepIdx(idx);
        setCompletedSteps((prev) => {
          const next = [...prev];
          // Mark all previous steps done
          for (let i = 0; i < idx; i++) {
            if (!next.includes(i)) next.push(i);
          }
          return next;
        });
      }, step.delayMs);
      stepTimersRef.current.push(t);
    });

    // Mark all done at end
    const allDoneTimer = setTimeout(() => {
      setCompletedSteps(SCENARIO_STEPS.map((_, i) => i));
      setCurrentStepIdx(-1);
      setLoopProgress(100);
    }, 20000);
    stepTimersRef.current.push(allDoneTimer);

    // Schedule next loop
    loopTimerRef.current = setTimeout(() => {
      if (loopTimerRef.current !== null) {
        setLoopProgress(0);
        startLoop(loopNum + 1);
      }
    }, LOOP_DURATION_MS);
  }, []);

  const handleStart = useCallback(() => {
    clearAll();
    setRunning(true);
    setLoopProgress(0);
    startLoop(1);
  }, [clearAll, startLoop]);

  const handleStop = useCallback(async () => {
    clearAll();
    setRunning(false);
    setCurrentStepIdx(-1);
    setCompletedSteps([]);
    setLoopProgress(0);
    try {
      await fetch('/api/v1/agents/simulation/stop', { method: 'POST' });
    } catch {}
  }, [clearAll]);

  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  const agentColors: Record<string, string> = {
    SENTINEL: '#00f0ff',
    PATHFINDER: '#ec4899',
    COMMANDER: '#10b981',
    AWARENESS: '#f59e0b',
    LEX: '#a855f7',
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(10,15,30,0.95) 100%)',
        border: running ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(0,240,255,0.25)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: running ? '0 0 30px rgba(239,68,68,0.15), inset 0 0 30px rgba(239,68,68,0.05)' : '0 0 20px rgba(0,240,255,0.08)',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Animated scan line when running */}
      {running && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
            animation: 'scanLine 2s linear infinite',
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: running ? 'rgba(239,68,68,0.2)' : 'rgba(0,240,255,0.1)',
              border: running ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(0,240,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {running ? (
              <AlertTriangle size={18} color="#ef4444" />
            ) : (
              <Zap size={18} color="#00f0ff" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
              AUTONOMOUS THREAT SIMULATION
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: running ? '#ef4444' : '#00f0ff', fontFamily: 'monospace' }}>
              {running ? `⬤ LIVE — LOOP #${loopCount}` : '◉ STANDBY'}
            </div>
          </div>
        </div>

        {/* Control Button */}
        {!running ? (
          <button
            onClick={handleStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #00f0ff20, #00f0ff40)',
              color: '#00f0ff',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              outline: '1px solid rgba(0,240,255,0.5)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #00f0ff30, #00f0ff60)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(0,240,255,0.3)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #00f0ff20, #00f0ff40)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <Play size={14} />
            RUN LIVE DEMO
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              outline: '1px solid rgba(239,68,68,0.5)',
              transition: 'all 0.2s',
            }}
          >
            <Square size={14} />
            STOP DEMO
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.06)',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${loopProgress}%`,
            background: running ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'rgba(0,240,255,0.4)',
            borderRadius: '2px',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Scenario label */}
      <div
        style={{
          fontSize: '10px',
          color: '#64748b',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}
      >
        SCENARIO: FENCE_BREACH_NORTHWEST — CAM-03 → CAM-06 → CAM-09
        {running && ` • AUTO-LOOPS EVERY 35s`}
      </div>

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {SCENARIO_STEPS.map((step, idx) => {
          const isActive = currentStepIdx === idx;
          const isDone = completedSteps.includes(idx);
          const isPending = !isActive && !isDone;
          const StepIcon = step.icon;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: '6px',
                background: isActive
                  ? `${step.color}18`
                  : isDone
                  ? 'rgba(255,255,255,0.03)'
                  : 'transparent',
                border: isActive
                  ? `1px solid ${step.color}40`
                  : '1px solid transparent',
                transition: 'all 0.3s ease',
                opacity: !running && !isDone ? 0.4 : 1,
              }}
            >
              {/* Step icon */}
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isDone
                    ? `${agentColors[step.agent]}20`
                    : isActive
                    ? `${step.color}20`
                    : 'rgba(255,255,255,0.05)',
                  border: isActive ? `1px solid ${step.color}` : isDone ? `1px solid ${agentColors[step.agent]}50` : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: isActive ? 'pulse 1s infinite' : 'none',
                }}
              >
                <StepIcon size={11} color={isActive ? step.color : isDone ? agentColors[step.agent] : '#475569'} />
              </div>

              {/* Step label */}
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: isActive ? step.color : isDone ? '#94a3b8' : '#475569',
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.02em',
                  flex: 1,
                }}
              >
                {step.label}
              </span>

              {/* Status indicator */}
              {isDone && <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'monospace' }}>✓</span>}
              {isActive && (
                <span
                  style={{
                    fontSize: '10px',
                    color: step.color,
                    fontFamily: 'monospace',
                    animation: 'blink 1s step-end infinite',
                  }}
                >
                  ●
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Loop counter footer */}
      {running && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>
            LOOPS COMPLETED: {Math.max(0, loopCount - 1)}
          </span>
          <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>
            NEXT LOOP IN: {Math.max(0, Math.round(((100 - loopProgress) / 100) * (LOOP_DURATION_MS / 1000)))}s
          </span>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ThreatDemoButton;
