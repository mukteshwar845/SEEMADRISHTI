import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import {
  Sliders,
  Save,
  RotateCcw,
  ShieldAlert,
  Move,
  Plus,
  Trash2,
  CheckCircle,
  Eye,
  Crosshair,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  Video,
  Info,
} from 'lucide-react';

interface ZoneItem {
  id: string;
  camera_id: string;
  name: string;
  polygon: [number, number][];
  zone_type: 'RESTRICTED_ZONE' | 'TRIPWIRE';
  direction?: 'IN' | 'OUT' | 'BOTH';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  is_normalized?: boolean;
}

export const CameraCalibrationView: React.FC = () => {
  const [selectedCam, setSelectedCam] = useState<string>('cam-01');
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activeVertexIdx, setActiveVertexIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch zones for current camera
  const loadZones = useCallback(async (camId: string) => {
    try {
      const res = await fetch(`/api/zones?camera_id=${camId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setZones(
            json.data.map((z: any) => ({
              id: z.id,
              camera_id: z.camera_id || camId,
              name: z.name || 'Calibrated Zone',
              polygon: Array.isArray(z.polygon) ? z.polygon : [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]],
              zone_type: z.zone_type || (z.polygon?.length === 2 ? 'TRIPWIRE' : 'RESTRICTED_ZONE'),
              direction: z.direction || 'BOTH',
              severity: z.severity || 'HIGH',
              enabled: z.enabled !== false,
              is_normalized: true,
            }))
          );
          setSelectedZoneId(json.data[0].id);
          return;
        }
      }

      // Fallback default zones if backend is empty
      const defaults: ZoneItem[] = [
        {
          id: `zone-${camId}-restricted`,
          camera_id: camId,
          name: `${camId.toUpperCase()} Restricted Zone Alpha`,
          polygon: [[0.2, 0.55], [0.85, 0.55], [0.85, 0.95], [0.2, 0.95]],
          zone_type: 'RESTRICTED_ZONE',
          severity: 'HIGH',
          enabled: true,
          is_normalized: true,
        },
        {
          id: `line-${camId}-tripwire`,
          camera_id: camId,
          name: `${camId.toUpperCase()} Entry Tripwire`,
          polygon: [[0.2, 0.72], [0.85, 0.72]],
          zone_type: 'TRIPWIRE',
          direction: 'BOTH',
          severity: 'CRITICAL',
          enabled: true,
          is_normalized: true,
        },
      ];
      setZones(defaults);
      setSelectedZoneId(defaults[0].id);
    } catch {
      setErrorMessage('Failed to connect to backend zones API');
    }
  }, []);

  useEffect(() => {
    loadZones(selectedCam);
  }, [selectedCam, loadZones]);

  // Selected active zone object
  const activeZone = zones.find((z) => z.id === selectedZoneId) || null;

  // Handle vertex drag
  const handlePointerDown = (vertexIdx: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveVertexIdx(vertexIdx);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeVertexIdx === null || !activeZone || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;

    // Clamp coordinates strictly to [0.0, 1.0]
    const clampedX = Math.max(0.0, Math.min(1.0, parseFloat(rawX.toFixed(3))));
    const clampedY = Math.max(0.0, Math.min(1.0, parseFloat(rawY.toFixed(3))));

    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== activeZone.id) return z;
        const nextPoly = [...z.polygon];
        nextPoly[activeVertexIdx] = [clampedX, clampedY];
        return { ...z, polygon: nextPoly };
      })
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeVertexIdx !== null) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture release safety
      }
      setActiveVertexIdx(null);
    }
  };

  // Add vertex to active polygon
  const handleAddVertex = () => {
    if (!activeZone) return;
    if (activeZone.zone_type === 'TRIPWIRE' && activeZone.polygon.length >= 2) return;
    const poly = activeZone.polygon;
    const lastPt = poly[poly.length - 1] || [0.5, 0.5];
    const newPt: [number, number] = [
      Math.min(0.95, lastPt[0] + 0.05),
      Math.min(0.95, lastPt[1] + 0.05),
    ];
    setZones((prev) =>
      prev.map((z) => (z.id === activeZone.id ? { ...z, polygon: [...z.polygon, newPt] } : z))
    );
  };

  // Remove last vertex
  const handleRemoveVertex = () => {
    if (!activeZone) return;
    const minVertices = activeZone.zone_type === 'TRIPWIRE' ? 2 : 3;
    if (activeZone.polygon.length <= minVertices) return;
    setZones((prev) =>
      prev.map((z) =>
        z.id === activeZone.id ? { ...z, polygon: z.polygon.slice(0, -1) } : z
      )
    );
  };

  // Save changes to backend REST API (persists to SQLite & camera_zones.json)
  const handleSaveToBackend = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      for (const z of zones) {
        await fetchWithAuth('/api/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: z.id,
            camera_id: z.camera_id,
            name: z.name,
            polygon: z.polygon,
            zone_type: z.zone_type,
            direction: z.direction || 'BOTH',
            severity: z.severity || 'HIGH',
            enabled: z.enabled,
          }),
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setErrorMessage('Failed to save calibration geometry to server');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 font-mono text-slate-200">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030816] p-4 rounded-xl border border-cyan-500/30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white uppercase">
              CAMERA CALIBRATION & INTRUSION ZONE CONFIGURATOR
            </h2>
            <p className="text-[11px] text-slate-400">
              INTERACTIVE OPERATOR TOOL // PERSISTS TO config/camera_zones.json
            </p>
          </div>
        </div>

        {/* Camera Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <Video size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400">CAMERA:</span>
            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const id = `cam-0${num}`;
                return (
                  <option key={id} value={id} className="bg-slate-900 text-white">
                    CAM-0{num} (SECTOR {String.fromCharCode(64 + num)})
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleSaveToBackend}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save size={14} />
            <span>{isSaving ? 'PERSISTING...' : 'SAVE CALIBRATION'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-400" />
          <span>Calibrated geometry successfully persisted to SQLite and synced to config/camera_zones.json!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={15} className="text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Calibration Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive Video + SVG Overlay Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative aspect-video rounded-xl overflow-hidden bg-black border border-cyan-500/30 select-none shadow-2xl touch-none"
          >
            {/* Underlying Real VisDrone Video Stream */}
            <video
              ref={videoRef}
              src={`/fixtures/visdrone/${selectedCam.toUpperCase()}.mp4`}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Tactical Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20 border border-cyan-500/40">
              <div className="border-r border-b border-cyan-500/40" />
              <div className="border-r border-b border-cyan-500/40" />
              <div className="border-r border-b border-cyan-500/40" />
              <div className="border-b border-cyan-500/40" />
            </div>

            {/* Interactive SVG Geometry Canvas */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {zones.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                const isTripwire = zone.zone_type === 'TRIPWIRE';
                const pts = zone.polygon;

                if (isTripwire && pts.length >= 2) {
                  const p1 = pts[0];
                  const p2 = pts[1];
                  return (
                    <g key={zone.id}>
                      <line
                        x1={`${p1[0] * 100}%`}
                        y1={`${p1[1] * 100}%`}
                        x2={`${p2[0] * 100}%`}
                        y2={`${p2[1] * 100}%`}
                        stroke={isSelected ? '#00f0ff' : '#f59e0b'}
                        strokeWidth={isSelected ? '4' : '2.5'}
                        strokeDasharray={isSelected ? '6,3' : undefined}
                      />
                      {/* Tripwire Center Marker */}
                      <circle
                        cx={`${((p1[0] + p2[0]) / 2) * 100}%`}
                        cy={`${((p1[1] + p2[1]) / 2) * 100}%`}
                        r="4"
                        fill="#00f0ff"
                      />
                    </g>
                  );
                }

                if (!isTripwire && pts.length >= 3) {
                  const svgPoints = pts
                    .map((p) => `${p[0] * 100}%,${p[1] * 100}%`)
                    .join(' ');
                  return (
                    <polygon
                      key={zone.id}
                      points={svgPoints}
                      fill={isSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(239, 68, 68, 0.2)'}
                      stroke={isSelected ? '#00f0ff' : '#ef4444'}
                      strokeWidth={isSelected ? '3' : '2'}
                    />
                  );
                }
                return null;
              })}
            </svg>

            {/* Draggable Vertex Handles for Selected Zone */}
            {activeZone &&
              activeZone.polygon.map((pt, idx) => (
                <div
                  key={idx}
                  onPointerDown={handlePointerDown(idx)}
                  style={{
                    left: `${pt[0] * 100}%`,
                    top: `${pt[1] * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute w-5 h-5 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-125 z-20 ${
                    activeVertexIdx === idx
                      ? 'bg-cyan-400 ring-4 ring-cyan-500/50 scale-125 shadow-[0_0_15px_#00f0ff]'
                      : 'bg-yellow-400 ring-2 ring-black shadow-md'
                  }`}
                  title={`Vertex ${idx + 1}: (${pt[0].toFixed(2)}, ${pt[1].toFixed(2)})`}
                >
                  <span className="text-[9px] font-black text-black select-none">
                    {idx + 1}
                  </span>
                </div>
              ))}

            {/* Video Source Watermark */}
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[10px] text-cyan-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{selectedCam.toUpperCase()} LIVE CALIBRATION VIEW</span>
            </div>

            <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[9px] text-slate-400">
              DRAG VERTICES TO CALIBRATE
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span>
              MODE:{' '}
              <strong className="text-cyan-400">
                {activeZone?.zone_type || 'NONE SELECTED'}
              </strong>
            </span>
            <span>
              VERTICES:{' '}
              <strong className="text-white">
                {activeZone?.polygon.length || 0}
              </strong>
            </span>
            <span>
              COORDINATES:{' '}
              <strong className="text-emerald-400">NORMALIZED [0.0 - 1.0]</strong>
            </span>
          </div>
        </div>

        {/* Geometry & Attributes Control Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="bg-[#0a1020] p-4 rounded-xl border border-slate-800 flex flex-col space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Layers size={14} className="text-cyan-400" />
              CONFIGURED GEOMETRIES ({zones.length})
            </h3>

            {/* Zone List Selector */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    zone.id === selectedZoneId
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{zone.name}</span>
                    <span className="text-[10px] text-slate-400">
                      TYPE: {zone.zone_type} // {zone.polygon.length} PTS
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      zone.zone_type === 'TRIPWIRE'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {zone.zone_type === 'TRIPWIRE' ? 'LINE' : 'POLYGON'}
                  </span>
                </div>
              ))}
            </div>

            {/* Active Zone Attribute Editor */}
            {activeZone && (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    ZONE LABEL / IDENTIFIER
                  </label>
                  <input
                    type="text"
                    value={activeZone.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setZones((prev) =>
                        prev.map((z) => (z.id === activeZone.id ? { ...z, name: val } : z))
                      );
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {activeZone.zone_type === 'TRIPWIRE' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      TRIPWIRE CROSSING DIRECTION
                    </label>
                    <select
                      value={activeZone.direction || 'BOTH'}
                      onChange={(e) => {
                        const dir = e.target.value as any;
                        setZones((prev) =>
                          prev.map((z) => (z.id === activeZone.id ? { ...z, direction: dir } : z))
                        );
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-800 text-cyan-300 text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="BOTH">BOTH DIRECTIONS (BIDIRECTIONAL)</option>
                      <option value="IN">INBOUND ONLY (ENTRY)</option>
                      <option value="OUT">OUTBOUND ONLY (EXIT)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    ALERT SEVERITY LEVEL
                  </label>
                  <select
                    value={activeZone.severity || 'HIGH'}
                    onChange={(e) => {
                      const sev = e.target.value as any;
                      setZones((prev) =>
                        prev.map((z) => (z.id === activeZone.id ? { ...z, severity: sev } : z))
                      );
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-800 text-amber-300 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL (MAX DEFCON)</option>
                    <option value="HIGH">HIGH SEVERITY</option>
                    <option value="MEDIUM">MEDIUM SEVERITY</option>
                    <option value="LOW">LOW SEVERITY</option>
                  </select>
                </div>

                {/* Vertex Management Buttons */}
                {activeZone.zone_type === 'RESTRICTED_ZONE' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleAddVertex}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>ADD VERTEX</span>
                    </button>
                    <button
                      onClick={handleRemoveVertex}
                      disabled={activeZone.polygon.length <= 3}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                      <span>REMOVE VERTEX</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#030816] p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Info size={13} />
              <span>CALIBRATION PROTOCOL</span>
            </div>
            <p>
              1. Select a camera node from the top dropdown.
            </p>
            <p>
              2. Click on any geometry to reveal vertex handles.
            </p>
            <p>
              3. Drag yellow handles directly over the real video feed.
            </p>
            <p>
              4. Click <strong className="text-white">SAVE CALIBRATION</strong> to persist into the Python CV Engine and Node backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
