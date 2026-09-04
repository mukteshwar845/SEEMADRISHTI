import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radar,
  Crosshair,
  Shield,
  Activity,
  AlertTriangle,
  Compass,
  Radio,
  Eye,
  MapPin,
  Maximize2,
  Minimize2,
  Footprints,
  Truck,
  Plane,
  Volume2,
  VolumeX,
  Target,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ViewMode } from '../../types';

interface TacticalRadarGisViewProps {
  onSelectCamera?: (cameraId: string) => void;
  onOpenTargetJourney?: (trackId: number) => void;
}

interface RadarContact {
  id: string;
  trackId: number;
  label: string;
  type: 'HUMAN' | 'VEHICLE' | 'DRONE' | 'PATROL';
  distanceMeters: number;
  angleDeg: number; // 0 - 360
  speedKmh: number;
  headingDeg: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'FRIENDLY';
  sector: string;
  nearestCam: string;
}

interface CameraNodeMarker {
  id: string;
  name: string;
  sector: string;
  angleDeg: number;
  distanceMeters: number;
  fovAngle: number; // central facing angle
  fovWidth: number; // 60 degrees
  status: 'Online' | 'Motion' | 'Breach' | 'Offline';
}

export const TacticalRadarGisView: React.FC<TacticalRadarGisViewProps> = ({
  onSelectCamera,
  onOpenTargetJourney,
}) => {
  const { isDaylight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedContact, setSelectedContact] = useState<RadarContact | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [radarRange, setRadarRange] = useState<number>(500); // 500 meters
  const [measureToolActive, setMeasureToolActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  // 9 Camera Sensor Nodes along the border arc
  const cameraNodes: CameraNodeMarker[] = [
    { id: 'cam-01', name: 'Sector Alpha Main Gate', sector: 'Alpha', angleDeg: 350, distanceMeters: 280, fovAngle: 170, fovWidth: 60, status: 'Online' },
    { id: 'cam-02', name: 'Sector Bravo Perimeter', sector: 'Bravo', angleDeg: 25, distanceMeters: 310, fovAngle: 205, fovWidth: 60, status: 'Breach' },
    { id: 'cam-03', name: 'Sector Charlie Checkpoint', sector: 'Charlie', angleDeg: 65, distanceMeters: 350, fovAngle: 245, fovWidth: 60, status: 'Motion' },
    { id: 'cam-04', name: 'Sector Delta Checkpost', sector: 'Delta', angleDeg: 105, distanceMeters: 320, fovAngle: 285, fovWidth: 60, status: 'Online' },
    { id: 'cam-05', name: 'Sector Echo Forest', sector: 'Echo', angleDeg: 145, distanceMeters: 390, fovAngle: 325, fovWidth: 60, status: 'Online' },
    { id: 'cam-06', name: 'Sector Foxtrot Pass', sector: 'Foxtrot', angleDeg: 195, distanceMeters: 340, fovAngle: 15, fovWidth: 60, status: 'Online' },
    { id: 'cam-07', name: 'Sector Golf Outpost', sector: 'Golf', angleDeg: 235, distanceMeters: 330, fovAngle: 55, fovWidth: 60, status: 'Online' },
    { id: 'cam-08', name: 'Sector Hotel Gate', sector: 'Hotel', angleDeg: 275, distanceMeters: 300, fovAngle: 95, fovWidth: 60, status: 'Online' },
    { id: 'cam-09', name: 'Sector India Coastal', sector: 'India', angleDeg: 315, distanceMeters: 360, fovAngle: 135, fovWidth: 60, status: 'Online' },
  ];

  // Border Pillars along the international boundary fence
  const borderPillars = [
    { id: 'BP-101', angleDeg: 340, distanceMeters: 420 },
    { id: 'BP-102', angleDeg: 15, distanceMeters: 430 },
    { id: 'BP-103', angleDeg: 50, distanceMeters: 440 },
    { id: 'BP-104', angleDeg: 85, distanceMeters: 435 },
    { id: 'BP-105', angleDeg: 120, distanceMeters: 450 },
    { id: 'BP-106', angleDeg: 160, distanceMeters: 440 },
    { id: 'BP-107', angleDeg: 200, distanceMeters: 430 },
    { id: 'BP-108', angleDeg: 240, distanceMeters: 435 },
    { id: 'BP-109', angleDeg: 280, distanceMeters: 440 },
  ];

  // Live Contacts (Intruders + Patrol Units)
  const [contacts, setContacts] = useState<RadarContact[]>([
    {
      id: 'tgt-201',
      trackId: 201,
      label: 'INTRUDER #201 [TARGET]',
      type: 'HUMAN',
      distanceMeters: 295,
      angleDeg: 23,
      speedKmh: 4.8,
      headingDeg: 195,
      threatLevel: 'CRITICAL',
      sector: 'Sector Bravo',
      nearestCam: 'cam-02',
    },
    {
      id: 'tgt-405',
      trackId: 405,
      label: 'SUSPICIOUS VEHICLE [APPROACH]',
      type: 'VEHICLE',
      distanceMeters: 380,
      angleDeg: 62,
      speedKmh: 42.0,
      headingDeg: 240,
      threatLevel: 'HIGH',
      sector: 'Sector Charlie',
      nearestCam: 'cam-03',
    },
    {
      id: 'ptl-alpha',
      trackId: 901,
      label: 'QRF SQUAD ALPHA',
      type: 'PATROL',
      distanceMeters: 180,
      angleDeg: 15,
      speedKmh: 28.0,
      headingDeg: 30,
      threatLevel: 'FRIENDLY',
      sector: 'Sector Bravo',
      nearestCam: 'cam-02',
    },
    {
      id: 'ptl-bravo',
      trackId: 902,
      label: 'BORDER PATROL BRAVO',
      type: 'PATROL',
      distanceMeters: 220,
      angleDeg: 345,
      speedKmh: 5.2,
      headingDeg: 10,
      threatLevel: 'FRIENDLY',
      sector: 'Sector Alpha',
      nearestCam: 'cam-01',
    },
    {
      id: 'uav-recon',
      trackId: 903,
      label: 'FALCON-01 TACTICAL UAV',
      type: 'DRONE',
      distanceMeters: 320,
      angleDeg: 110,
      speedKmh: 54.0,
      headingDeg: 290,
      threatLevel: 'FRIENDLY',
      sector: 'Sector Delta',
      nearestCam: 'cam-04',
    },
  ]);

  // Sweep Animation & Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sweepAngle = 0;
    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 25;

      // 1. Clear background
      ctx.fillStyle = '#02050f';
      ctx.fillRect(0, 0, width, height);

      // 2. Polar grid rings
      const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
      rings.forEach((rRatio) => {
        const r = radius * rRatio;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = rRatio === 1.0 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.15)';
        ctx.lineWidth = rRatio === 1.0 ? 1.5 : 0.75;
        ctx.setLineDash(rRatio === 1.0 ? [] : [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring distance label
        ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.round(radarRange * rRatio)}m`, centerX + 4, centerY - r + 10);
      });

      // 3. Crosshairs (N/S/E/W)
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Degree labels
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.font = '10px monospace';
      ctx.fillText('0° [NORTH - BORDER]', centerX - 55, centerY - radius - 8);
      ctx.fillText('90° [EAST]', centerX + radius - 10, centerY - 8);
      ctx.fillText('180° [SOUTH - BASE]', centerX - 50, centerY + radius + 15);
      ctx.fillText('270° [WEST]', centerX - radius - 60, centerY - 8);

      // 4. Border Fence Arc & Pillars
      ctx.beginPath();
      borderPillars.forEach((bp, idx) => {
        const rad = (bp.angleDeg - 90) * (Math.PI / 180);
        const distRatio = bp.distanceMeters / radarRange;
        const x = centerX + radius * distRatio * Math.cos(rad);
        const y = centerY + radius * distRatio * Math.sin(rad);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw border pillars
      borderPillars.forEach((bp) => {
        const rad = (bp.angleDeg - 90) * (Math.PI / 180);
        const distRatio = bp.distanceMeters / radarRange;
        const x = centerX + radius * distRatio * Math.cos(rad);
        const y = centerY + radius * distRatio * Math.sin(rad);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.fillStyle = 'rgba(248, 113, 113, 0.8)';
        ctx.font = '8px monospace';
        ctx.fillText(bp.id, x + 5, y + 2);
      });

      // 5. Camera FOV Cones
      cameraNodes.forEach((cam) => {
        const camRad = (cam.angleDeg - 90) * (Math.PI / 180);
        const distRatio = cam.distanceMeters / radarRange;
        const camX = centerX + radius * distRatio * Math.cos(camRad);
        const camY = centerY + radius * distRatio * Math.sin(camRad);

        // Draw FOV sector fan
        const fovRadCenter = (cam.fovAngle - 90) * (Math.PI / 180);
        const halfFov = (cam.fovWidth / 2) * (Math.PI / 180);
        const fovRange = radius * 0.35;

        ctx.beginPath();
        ctx.moveTo(camX, camY);
        ctx.arc(camX, camY, fovRange, fovRadCenter - halfFov, fovRadCenter + halfFov);
        ctx.closePath();

        const colorMap: Record<string, string> = {
          Breach: 'rgba(244, 63, 94, 0.25)',
          Motion: 'rgba(245, 158, 11, 0.2)',
          Online: 'rgba(6, 182, 212, 0.1)',
          Offline: 'rgba(100, 116, 139, 0.05)',
        };
        ctx.fillStyle = colorMap[cam.status] || colorMap.Online;
        ctx.fill();
        ctx.strokeStyle = cam.status === 'Breach' ? '#f43f5e' : cam.status === 'Motion' ? '#f59e0b' : 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node circle
        ctx.beginPath();
        ctx.arc(camX, camY, 4, 0, Math.PI * 2);
        ctx.fillStyle = cam.status === 'Breach' ? '#f43f5e' : '#06b6d4';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(cam.id.toUpperCase(), camX + 6, camY - 4);
      });

      // 6. Rotating Radar Sweep Beam
      const sweepRad = (sweepAngle - 90) * (Math.PI / 180);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, sweepRad - 0.35, sweepRad);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Leading beam edge
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(sweepRad), centerY + radius * Math.sin(sweepRad));
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // 7. Render Contacts
      contacts.forEach((contact) => {
        const rad = (contact.angleDeg - 90) * (Math.PI / 180);
        const distRatio = contact.distanceMeters / radarRange;
        const x = centerX + radius * distRatio * Math.cos(rad);
        const y = centerY + radius * distRatio * Math.sin(rad);

        const isFriendly = contact.threatLevel === 'FRIENDLY';
        const isCritical = contact.threatLevel === 'CRITICAL';

        // Blip pulse
        ctx.beginPath();
        ctx.arc(x, y, isCritical ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isFriendly ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';
        ctx.fill();

        if (isCritical) {
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Heading vector
        const hRad = (contact.headingDeg - 90) * (Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14 * Math.cos(hRad), y + 14 * Math.sin(hRad));
        ctx.strokeStyle = isFriendly ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Contact label
        ctx.fillStyle = isFriendly ? '#34d399' : isCritical ? '#f87171' : '#fbbf24';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`[${contact.trackId}] ${contact.type}`, x + 8, y + 3);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px monospace';
        ctx.fillText(`${contact.speedKmh} km/h`, x + 8, y + 12);
      });

      // 8. Range Measurement Line
      if (measurePoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(measurePoints[0].x, measurePoints[0].y);
        ctx.lineTo(measurePoints[1].x, measurePoints[1].y);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const midX = (measurePoints[0].x + measurePoints[1].x) / 2;
        const midY = (measurePoints[0].y + measurePoints[1].y) / 2;
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`DIST: ${measuredDistance?.toFixed(1)}m`, midX + 8, midY - 6);
      }

      // Advance sweep angle
      sweepAngle = (sweepAngle + 1.2) % 360;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [contacts, radarRange, measurePoints, measuredDistance]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (measureToolActive) {
      if (measurePoints.length === 0 || measurePoints.length === 2) {
        setMeasurePoints([{ x, y }]);
        setMeasuredDistance(null);
      } else if (measurePoints.length === 1) {
        const p1 = measurePoints[0];
        const p2 = { x, y };
        setMeasurePoints([p1, p2]);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const pixelDist = Math.sqrt(dx * dx + dy * dy);
        const radius = Math.min(canvas.width / 2, canvas.height / 2) - 25;
        const meters = (pixelDist / radius) * radarRange;
        setMeasuredDistance(meters);
      }
      return;
    }

    // Check if clicked contact
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 25;

    for (const contact of contacts) {
      const rad = (contact.angleDeg - 90) * (Math.PI / 180);
      const distRatio = contact.distanceMeters / radarRange;
      const cx = centerX + radius * distRatio * Math.cos(rad);
      const cy = centerY + radius * distRatio * Math.sin(rad);

      const d = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (d <= 15) {
        setSelectedContact(contact);
        return;
      }
    }

    // Check if clicked camera node
    for (const cam of cameraNodes) {
      const camRad = (cam.angleDeg - 90) * (Math.PI / 180);
      const distRatio = cam.distanceMeters / radarRange;
      const cx = centerX + radius * distRatio * Math.cos(camRad);
      const cy = centerY + radius * distRatio * Math.sin(camRad);

      const d = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (d <= 15) {
        if (onSelectCamera) onSelectCamera(cam.id);
        return;
      }
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header & Range Bar */}
      <div className="p-4 bg-slate-950/90 border border-cyan-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Radar size={22} className="animate-spin" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              TACTICAL RADAR GIS // BORDER ZERO-LINE PERIMETER
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded border border-emerald-500/30 font-bold">
                RADAR ACTIVE [360° SWEEP]
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Zero Line International Boundary &bull; 9 Field Camera Cones &bull; QRF Vectors &bull; Live Target Tracking
            </p>
          </div>
        </div>

        {/* Tactical Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setMeasureToolActive(!measureToolActive)}
            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              measureToolActive
                ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Crosshair size={14} />
            {measureToolActive ? 'RANGEFINDER [ACTIVE]' : 'RANGEFINDER'}
          </button>

          <select
            value={radarRange}
            onChange={(e) => setRadarRange(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-cyan-300 rounded-lg font-mono outline-none"
          >
            <option value={250}>RANGE: 250m</option>
            <option value={500}>RANGE: 500m</option>
            <option value={1000}>RANGE: 1000m</option>
          </select>
        </div>
      </div>

      {/* Main Radar Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Center Radar Canvas (8 cols on lg) */}
        <div className="lg:col-span-8 p-4 bg-slate-950 border border-cyan-500/30 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <canvas
            ref={canvasRef}
            width={620}
            height={620}
            onClick={handleCanvasClick}
            className="cursor-crosshair max-w-full max-h-[620px] rounded-full border border-cyan-500/20"
          />

          <div className="absolute bottom-3 left-4 text-[10px] text-slate-500 space-y-0.5">
            <div>Click any node (CAM-01..09) or contact to inspect.</div>
            {measureToolActive && (
              <div className="text-amber-400 font-bold">
                Rangefinder active: Click two points to measure real-world distance in meters.
              </div>
            )}
          </div>
        </div>

        {/* Right Info Panel: Target Feed & Camera Sectors (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Contacts Inspector */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Target size={14} /> RADAR CONTACT TRACKS ({contacts.length})
              </span>
              <span className="text-[10px] text-emerald-400">REAL-TIME</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedContact?.id === c.id
                      ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {c.type === 'HUMAN' && <Footprints size={12} className="text-rose-400" />}
                      {c.type === 'VEHICLE' && <Truck size={12} className="text-amber-400" />}
                      {c.type === 'DRONE' && <Plane size={12} className="text-cyan-400" />}
                      {c.type === 'PATROL' && <Shield size={12} className="text-emerald-400" />}
                      {c.label}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      c.threatLevel === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                      c.threatLevel === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {c.threatLevel}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Dist: {c.distanceMeters}m @ {c.angleDeg}°</span>
                    <span>Speed: {c.speedKmh} km/h</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedContact && (
              <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-1.5 text-[11px] text-slate-200">
                <div className="text-cyan-300 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>TARGET LOCK // {selectedContact.label}</span>
                  <button
                    onClick={() => onOpenTargetJourney && onOpenTargetJourney(selectedContact.trackId)}
                    className="text-[10px] text-amber-300 hover:underline cursor-pointer"
                  >
                    Open Journey &rarr;
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nearest Sensor:</span>
                  <span className="text-cyan-300 font-bold">{selectedContact.nearestCam.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sector:</span>
                  <span>{selectedContact.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Speed:</span>
                  <span className="text-emerald-400 font-bold">{selectedContact.speedKmh} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heading:</span>
                  <span>{selectedContact.headingDeg}° Vector</span>
                </div>
              </div>
            )}
          </div>

          {/* Border Sector Status */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5 text-cyan-400">
              <Compass size={14} /> ACTIVE BORDER SECTOR FOV STATUS
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              {cameraNodes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCamera && onSelectCamera(c.id)}
                  className={`p-2 rounded-lg border text-center cursor-pointer transition-colors ${
                    c.status === 'Breach' ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                    c.status === 'Motion' ? 'bg-amber-950/50 border-amber-500/40 text-amber-300' :
                    'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold">{c.id.toUpperCase()}</div>
                  <div className="text-[9px] text-slate-400">{c.sector}</div>
                  <div className="text-[8px] mt-0.5 font-bold uppercase">{c.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
