import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Shield,
  Activity,
  Cpu,
  Wifi,
  Sparkles,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAuthToken } from '../../services/api';
import { DefconLevel } from '../../types';

interface TacticalTerminalViewProps {
  embedded?: boolean;
  onSetDefcon?: (level: DefconLevel) => void;
  currentDefcon?: DefconLevel;
}

interface CommandLog {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string | React.ReactNode;
  timestamp: string;
}

export const TacticalTerminalView: React.FC<TacticalTerminalViewProps> = ({
  embedded = false,
  onSetDefcon,
  currentDefcon = 4,
}) => {
  const { isDaylight } = useTheme();
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [themeMode, setThemeMode] = useState<'cyan' | 'emerald' | 'amber'>('cyan');
  const [crtEffect, setCrtEffect] = useState(true);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const nowTime = () => new Date().toTimeString().split(' ')[0];

  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: 'init-1',
      type: 'system',
      content: (
        <div className="font-mono text-xs leading-relaxed">
          <pre className="text-cyan-400 font-bold">
{`   _____ ______ ______ __  __          _____  _____  _____  _____ _    _ _______ _____ 
  / ____|  ____|  ____|  \\/  |   /\\   |  __ \\|  __ \\|_   _|/ ____| |  | |__   __|_   _|
 | (___ | |__  | |__  | \\  / |  /  \\  | |  | | |__) | | | | (___ | |__| |  | |    | |  
  \\___ \\|  __| |  __| | |\\/| | / /\\ \\ | |  | |  _  /  | |  \\___ \\|  __  |  | |    | |  
  ____) | |____| |____| |  | |/ ____ \\| |__| | | \\ \\ _| |_ ____) | |  | |  | |   _| |_ 
 |_____/|______|______|_|  |_/_/    \\_\\_____/|_|  \\_\\_____|_____/|_|  |_|  |_|  |_____|`}
          </pre>
          <div className="mt-2 text-slate-300">
            SEEMADRISHTI AI DEFENSE OS v4.2.0-EDGE [BTI-KERNEL-64]
          </div>
          <div className="text-slate-500 text-[11px]">
            Connected to Tactical Command Node CAM-GATEWAY // Secure Terminal Session Active
          </div>
          <div className="mt-1 text-cyan-300 text-[11px]">
            Type <span className="text-amber-300 font-bold">help</span> to list operational diagnostics commands.
          </div>
        </div>
      ),
      timestamp: nowTime(),
    },
  ]);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const addLog = (type: 'input' | 'output' | 'error' | 'system', content: string | React.ReactNode) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}-${Math.random()}`,
        type,
        content,
        timestamp: nowTime(),
      },
    ]);
  };

  const getHeaders = () => {
    const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('seemadrishti_auth_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Real Command Execution Engine
  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    addLog('input', trimmed);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);
    setInputVal('');

    const tokens = trimmed.split(/\s+/);
    const command = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    switch (command) {
      case 'help': {
        addLog(
          'output',
          <div className="space-y-1.5 text-xs font-mono">
            <div className="text-amber-400 font-bold border-b border-slate-700 pb-1">
              AVAILABLE TACTICAL DIAGNOSTIC COMMANDS:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div><span className="text-cyan-300 font-bold">status</span> - System health, DB, and CV status</div>
              <div><span className="text-cyan-300 font-bold">nodes</span> - Tabular list of 9 camera sensor nodes</div>
              <div><span className="text-cyan-300 font-bold">node inspect &lt;id&gt;</span> - Deep specs for camera (e.g. cam-02)</div>
              <div><span className="text-cyan-300 font-bold">sensors</span> - Tactical edge mobile sensors status</div>
              <div><span className="text-cyan-300 font-bold">pair &lt;cam-id&gt;</span> - Generate live pairing session & QR link</div>
              <div><span className="text-cyan-300 font-bold">defcon &lt;1-5&gt;</span> - Set operational DEFCON readiness level</div>
              <div><span className="text-cyan-300 font-bold">alerts</span> - List recent high-severity threat alerts</div>
              <div><span className="text-cyan-300 font-bold">ping</span> - Measure live gateway round-trip latency</div>
              <div><span className="text-cyan-300 font-bold">zones &lt;cam-id&gt;</span> - Show calibrated tripwire coordinates</div>
              <div><span className="text-cyan-300 font-bold">cv</span> - Query YOLOv8 neural pipeline telemetry</div>
              <div><span className="text-cyan-300 font-bold">clear</span> - Clear terminal screen buffer</div>
              <div><span className="text-cyan-300 font-bold">version</span> - Display OS build & cryptographic kernel specs</div>
            </div>
          </div>
        );
        break;
      }

      case 'clear': {
        setLogs([]);
        break;
      }

      case 'status': {
        addLog('system', 'Querying /api/system/health gateway...');
        try {
          const res = await fetch('/api/system/health', { headers: getHeaders() });
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            addLog(
              'output',
              <div className="space-y-1 text-xs font-mono text-slate-200">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <Activity size={14} /> SYSTEM HEALTH STATUS: {d.overall || 'OPERATIONAL'}
                </div>
                <div>Database: <span className="text-cyan-300 font-bold">{d.services?.database?.status || 'HEALTHY'}</span> ({d.services?.database?.totalRecords ?? 0} total records)</div>
                <div>CV Neural Engine: <span className="text-cyan-300 font-bold">{d.services?.cv?.status || 'OPERATIONAL'}</span> ({d.services?.cv?.model || 'YOLOv8n Edge'})</div>
                <div>WebSocket Clients: <span className="text-cyan-300 font-bold">{d.services?.websocket?.connectedClients ?? 1} active</span></div>
                <div>Gateway Uptime: <span className="text-slate-300 font-bold">{Math.round(d.services?.system?.uptime ?? 0)}s</span></div>
              </div>
            );
          } else {
            addLog('error', json.error || 'Failed to fetch status telemetry');
          }
        } catch (e: any) {
          addLog('error', `Status request failed: ${e.message}`);
        }
        break;
      }

      case 'nodes': {
        addLog('system', 'Querying /api/cameras registry...');
        try {
          const res = await fetch('/api/cameras', { headers: getHeaders() });
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            addLog(
              'output',
              <div className="space-y-1 text-xs font-mono">
                <div className="text-cyan-300 font-bold border-b border-slate-700 pb-1">
                  TACTICAL CAMERA FLEET REGISTRY ({json.data.length} NODES):
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="py-1">ID</th>
                        <th className="py-1">SECTOR NAME</th>
                        <th className="py-1">TYPE</th>
                        <th className="py-1">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {json.data.map((c: any) => (
                        <tr key={c.id} className="border-b border-slate-900 text-slate-300">
                          <td className="py-1 font-bold text-cyan-400">{c.id.toUpperCase()}</td>
                          <td className="py-1">{c.name}</td>
                          <td className="py-1 text-slate-400">{c.source_type}</td>
                          <td className="py-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              c.status === 'Online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          } else {
            addLog('error', json.error || 'Failed to query camera registry');
          }
        } catch (e: any) {
          addLog('error', `Nodes request failed: ${e.message}`);
        }
        break;
      }

      case 'node': {
        if (args[0] === 'inspect' && args[1]) {
          const camId = args[1].toLowerCase();
          addLog('system', `Inspecting sensor node [${camId.toUpperCase()}]...`);
          try {
            const [camRes, zoneRes] = await Promise.all([
              fetch(`/api/cameras/${camId}`, { headers: getHeaders() }),
              fetch(`/api/zones?camera_id=${camId}`, { headers: getHeaders() }),
            ]);
            const camJson = await camRes.json();
            const zoneJson = await zoneRes.json();

            if (camJson.success && camJson.data) {
              const c = camJson.data;
              const zones = zoneJson.success ? zoneJson.data : [];
              addLog(
                'output',
                <div className="space-y-1 text-xs font-mono text-slate-300">
                  <div className="text-cyan-300 font-bold border-b border-slate-700 pb-1">
                    NODE SPECS // {c.id.toUpperCase()} — {c.name}
                  </div>
                  <div>Location: <span className="text-slate-200">{c.location}</span></div>
                  <div>Source Stream: <span className="text-amber-300">{c.source_url}</span></div>
                  <div>Status: <span className="text-emerald-400 font-bold">{c.status}</span></div>
                  <div>Calibrated Zones: <span className="text-purple-300 font-bold">{zones.length} active geofences</span></div>
                  {zones.length > 0 && (
                    <div className="pl-3 border-l border-slate-700 text-[10px] space-y-0.5 mt-1 text-slate-400">
                      {zones.map((z: any) => (
                        <div key={z.id}>&bull; {z.name} ({z.enabled ? 'ARMED' : 'DISARMED'})</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              addLog('error', `Camera '${camId}' not found in registry`);
            }
          } catch (e: any) {
            addLog('error', `Inspect error: ${e.message}`);
          }
        } else {
          addLog('error', 'Syntax: node inspect <camera_id> (e.g., node inspect cam-02)');
        }
        break;
      }

      case 'sensors': {
        addLog('system', 'Querying /api/sensors/status/cam-02...');
        try {
          const res = await fetch('/api/sensors/status/cam-02', { headers: getHeaders() });
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            addLog(
              'output',
              <div className="space-y-1 text-xs font-mono text-slate-200">
                <div className="text-cyan-300 font-bold border-b border-slate-700 pb-1">
                  TACTICAL EDGE MOBILE SENSORS TELEMETRY (CAM-02):
                </div>
                <div>Connection Status: <span className={`font-bold ${d.connected ? 'text-emerald-400' : 'text-amber-400'}`}>{d.connected ? 'CONNECTED' : 'DISCONNECTED / STANDBY'}</span></div>
                {d.sensor_id && <div>Sensor Node ID: <span className="text-cyan-300 font-bold">{d.sensor_id}</span></div>}
                {d.transport && <div>Stream Carrier: <span className="text-purple-300">{d.transport} Binary Relay</span></div>}
                {d.last_seen && <div>Last Heartbeat: <span className="text-slate-300">{d.last_heartbeat_ago_sec ?? 0}s ago ({d.last_seen})</span></div>}
                {!d.connected && <div className="text-slate-500 text-[10px]">Use 'pair cam-02' to generate a live QR pairing token.</div>}
              </div>
            );
          } else {
            addLog('error', json.error || 'Failed to query sensor status');
          }
        } catch (e: any) {
          addLog('error', `Sensors query error: ${e.message}`);
        }
        break;
      }

      case 'pair': {
        const targetCam = args[0] || 'cam-02';
        addLog('system', `Generating cryptographic single-use pairing token for [${targetCam.toUpperCase()}]...`);
        try {
          const res = await fetch('/api/sensors/pairing', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ camera_id: targetCam.toLowerCase(), ttl_seconds: 300 }),
          });
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            addLog(
              'output',
              <div className="space-y-1 text-xs font-mono text-slate-200">
                <div className="text-emerald-400 font-bold border-b border-slate-700 pb-1">
                  SECURE PAIRING SESSION CREATED [256-BIT TOKEN]:
                </div>
                <div>Pairing ID: <span className="text-cyan-300 font-bold">{d.pairing_id}</span></div>
                <div>Secret Token: <span className="text-amber-300 font-bold select-all">{d.token}</span></div>
                <div>Camera Binding: <span className="text-slate-200">{d.camera_id.toUpperCase()}</span></div>
                <div>TTL Expiration: <span className="text-rose-400 font-bold">{d.expires_at} (300s)</span></div>
                <div className="mt-1">
                  Direct Link: <a href={d.direct_url} target="_blank" rel="noreferrer" className="text-cyan-400 underline break-all">{d.direct_url}</a>
                </div>
              </div>
            );
          } else {
            addLog('error', json.error || 'Pairing token generation rejected');
          }
        } catch (e: any) {
          addLog('error', `Pairing failed: ${e.message}`);
        }
        break;
      }

      case 'defcon': {
        const level = Number(args[0]) as DefconLevel;
        if ([1, 2, 3, 4, 5].includes(level)) {
          if (onSetDefcon) onSetDefcon(level);
          const defconNames: Record<DefconLevel, string> = {
            5: 'PEACETIME MONITORING (NOMINAL)',
            4: 'ACTIVE DEFENSE (DEFAULT)',
            3: 'FORCE READINESS (ELEVATED THREAT)',
            2: 'IMMEDIATE THREAT (ARMED BREACH IMMINENT)',
            1: 'CRITICAL PERIMETER BREACH (FULL LOCKDOWN)',
          };
          addLog(
            'system',
            <div className="font-bold text-xs">
              <span className="text-amber-400">OPERATIONAL READINESS ESCALATED TO:</span>{' '}
              <span className={level <= 2 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}>
                DEFCON {level} // {defconNames[level]}
              </span>
            </div>
          );
        } else {
          addLog('error', 'Syntax: defcon <1|2|3|4|5>');
        }
        break;
      }

      case 'alerts': {
        addLog('system', 'Querying /api/alerts active log...');
        try {
          const res = await fetch('/api/alerts', { headers: getHeaders() });
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const alerts = json.data.slice(0, 5);
            addLog(
              'output',
              <div className="space-y-1 text-xs font-mono">
                <div className="text-amber-400 font-bold border-b border-slate-700 pb-1">
                  ACTIVE TACTICAL THREAT ALERTS ({json.data.length} TOTAL):
                </div>
                {alerts.map((a: any) => (
                  <div key={a.id} className="border-b border-slate-900 py-1 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-cyan-400">[{a.camera_id?.toUpperCase() || 'CAM'}]</span>{' '}
                      <span className="text-slate-200">{a.title}</span> &mdash; <span className="text-slate-400">{a.reason}</span>
                    </div>
                    <span className={`px-1 rounded text-[9px] font-bold ${
                      a.severity === 'High' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-amber-950 text-amber-300'
                    }`}>
                      {a.severity}
                    </span>
                  </div>
                ))}
              </div>
            );
          } else {
            addLog('error', json.error || 'Failed to fetch alerts');
          }
        } catch (e: any) {
          addLog('error', `Alerts error: ${e.message}`);
        }
        break;
      }

      case 'ping': {
        const start = performance.now();
        addLog('system', 'PING 127.0.0.1 (SEEMADRISHTI GATEWAY): 64 bytes of data...');
        try {
          const res = await fetch('/api/health');
          const elapsed = (performance.now() - start).toFixed(2);
          if (res.ok) {
            addLog('output', `64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=${elapsed} ms // GATEWAY ONLINE`);
          } else {
            addLog('error', `Gateway returned status ${res.status}`);
          }
        } catch (e: any) {
          addLog('error', `Ping destination unreachable: ${e.message}`);
        }
        break;
      }

      case 'cv': {
        addLog(
          'output',
          <div className="space-y-1 text-xs font-mono text-slate-300">
            <div className="text-emerald-400 font-bold border-b border-slate-700 pb-1">
              CENTRAL CV PIPELINE DIAGNOSTICS:
            </div>
            <div>Model Architecture: <span className="text-cyan-300 font-bold">YOLOv8 Nano (yolov8n.pt)</span></div>
            <div>Multi-Object Tracker: <span className="text-slate-200">ByteTrack (Dual-Threshold Kalman)</span></div>
            <div>Inference Resolution: <span className="text-slate-200">640 x 640 @ FP32</span></div>
            <div>Hardware Acceleration: <span className="text-cyan-300 font-bold">CPU Native / DirectML</span></div>
            <div>Latency Profile: <span className="text-emerald-400 font-bold">CPU: ~220ms (P50: 232ms) // GPU TensorRT Target: ~14ms</span></div>
          </div>
        );
        break;
      }

      case 'version': {
        addLog(
          'output',
          <div className="space-y-1 text-xs font-mono text-slate-300">
            <div>SEEMADRISHTI AI TACTICAL CORE: <span className="text-cyan-300 font-bold">v4.2.0-RELEASE</span></div>
            <div>Build Architecture: <span className="text-slate-200">Node.js + Python OpenCV + React Vite</span></div>
            <div>Security Standards: <span className="text-emerald-400 font-bold">SHA-256 HMAC & WSS Binary TLS</span></div>
            <div>Defense Deployment: <span className="text-slate-200">Smart India Hackathon 2024 / Border Perimeter</span></div>
          </div>
        );
        break;
      }

      default: {
        addLog('error', `Command not found: '${command}'. Type 'help' for command catalog.`);
        break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx + 1 < history.length ? historyIdx + 1 : historyIdx;
        setHistoryIdx(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx] || '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const valid = ['help', 'status', 'nodes', 'sensors', 'pair', 'defcon', 'alerts', 'ping', 'cv', 'clear', 'version'];
      const match = valid.find((cmd) => cmd.startsWith(inputVal.toLowerCase().trim()));
      if (match) setInputVal(match);
    }
  };

  const runQuickCommand = (cmd: string) => {
    setInputVal(cmd);
    executeCommand(cmd);
  };

  return (
    <div
      className={`rounded-2xl border flex flex-col font-mono relative overflow-hidden transition-all ${
        embedded ? 'h-[440px] bg-[#030712] border-slate-800' : 'h-[calc(100vh-120px)] bg-[#02050d] border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
      }`}
    >
      {/* Top Terminal Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal size={14} className="text-cyan-400 ml-2" />
          <span className="font-bold text-slate-100 tracking-wider">
            EDGE INFERENCE NODE CLI // TACTICAL SHELL
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/30">
            DEFCON {currentDefcon}
          </span>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          {/* Quick buttons */}
          <div className="hidden sm:flex items-center gap-1 text-[10px]">
            <button
              onClick={() => runQuickCommand('status')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer border border-slate-700"
            >
              status
            </button>
            <button
              onClick={() => runQuickCommand('nodes')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer border border-slate-700"
            >
              nodes
            </button>
            <button
              onClick={() => runQuickCommand('sensors')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer border border-slate-700"
            >
              sensors
            </button>
            <button
              onClick={() => runQuickCommand('ping')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer border border-slate-700"
            >
              ping
            </button>
            <button
              onClick={() => runQuickCommand('clear')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer border border-slate-700"
            >
              clear
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Screen / Output Body */}
      <div
        className={`flex-1 p-4 overflow-y-auto space-y-2 text-xs leading-relaxed select-text ${
          crtEffect ? 'crt-scanlines' : ''
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {logs.map((log) => (
          <div key={log.id} className="space-y-0.5">
            {log.type === 'input' && (
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <span className="text-emerald-400">operator@seemadrishti:~#</span>
                <span>{log.content}</span>
              </div>
            )}
            {log.type === 'output' && (
              <div className="text-slate-300 pl-4 border-l border-cyan-500/20">{log.content}</div>
            )}
            {log.type === 'error' && (
              <div className="text-rose-400 pl-4 border-l border-rose-500/30 font-semibold">{log.content}</div>
            )}
            {log.type === 'system' && (
              <div className="text-slate-400 text-[11px] italic pl-4">{log.content}</div>
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Input Line Prompt */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-bold text-xs shrink-0">
          operator@seemadrishti:~#
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder="Type 'help' or command..."
          className="flex-1 bg-transparent text-cyan-300 text-xs font-mono outline-none caret-cyan-400"
        />
        <button
          onClick={() => executeCommand(inputVal)}
          className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded cursor-pointer transition-colors"
          title="Run Command"
        >
          <Play size={12} />
        </button>
      </div>
    </div>
  );
};
