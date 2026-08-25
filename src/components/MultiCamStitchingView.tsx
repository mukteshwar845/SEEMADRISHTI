import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Sparkles,
  ShieldAlert,
  Compass,
  ArrowRight,
  Maximize2,
  Navigation,
  Eye,
  Radio,
  Sliders,
} from 'lucide-react';

export const MultiCamStitchingView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [overlapBlend, setOverlapBlend] = useState(35);
  const [showPredictiveVectors, setShowPredictiveVectors] = useState(true);
  const [reidTrackingActive, setReidTrackingActive] = useState(true);
  const [stitchingStatus, setStitchingStatus] = useState('SYNCED & HOMOGRAPHY CALIBRATED');

  // Multi-camera stitched canvas simulation
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let intruderX = 220;
    let intruderY = 180;
    let intruderVx = 0.8;
    let intruderVy = 0.15;
    const trajectory: { x: number; y: number }[] = [];

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      // 1. Background Wide Panoramic Landscape
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#334155');
      skyGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.4);

      // Terrain / Border Perimeter Ground
      const groundGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
      groundGrad.addColorStop(0, '#3b4252');
      groundGrad.addColorStop(1, '#1e222b');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.4, w, h * 0.6);

      // Border Fence line running continuously across the stitched feed
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      ctx.lineTo(w, h * 0.48);
      ctx.stroke();

      for (let x = 0; x < w; x += 22) {
        ctx.beginPath();
        const y = h * 0.52 - ((h * 0.52 - h * 0.48) * x) / w;
        ctx.moveTo(x, y - 45);
        ctx.lineTo(x, y + 25);
        ctx.stroke();
      }

      // 2. Camera Boundary Stitch Line & Overlap Seam
      const seamX = w * 0.5;
      const blendW = (overlapBlend / 100) * 80;

      // Left Camera Label HUD
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(0, 0, seamX - blendW / 2, h);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(seamX + blendW / 2, 0, w - (seamX + blendW / 2), h);

      // Overlap blend corridor
      const blendGrad = ctx.createLinearGradient(seamX - blendW / 2, 0, seamX + blendW / 2, 0);
      blendGrad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
      blendGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
      blendGrad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
      ctx.fillStyle = blendGrad;
      ctx.fillRect(seamX - blendW / 2, 0, blendW, h);

      // Seam Indicator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(seamX, 0);
      ctx.lineTo(seamX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Move simulated intruder across cameras (CAM 1 -> CAM 2 transition)
      intruderX += intruderVx;
      intruderY += intruderVy;
      if (intruderX > w * 0.85) {
        intruderX = w * 0.15;
        intruderY = 180;
        trajectory.length = 0;
      }

      trajectory.push({ x: intruderX, y: intruderY });
      if (trajectory.length > 40) trajectory.shift();

      // Draw Trajectory & Anomaly Heat Vector
      if (showPredictiveVectors && trajectory.length > 2) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < trajectory.length; i++) {
          const pt = trajectory[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Predictive Forward Arrow (AI Prediction where target will reach in +3 seconds)
        const predX = intruderX + intruderVx * 60;
        const predY = intruderY + intruderVy * 60;

        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(intruderX, intruderY);
        ctx.lineTo(predX, predY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target arrival zone circle
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.beginPath();
        ctx.arc(predX, predY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('EST. TGT (+3.2s)', predX + 12, predY + 4);
      }

      // Draw Intruder Target Box & Cross-Camera ReID Label
      const inCam = intruderX < seamX ? 'CAM 1 (North Entry)' : 'CAM 2 (Perimeter)';
      const targetId = 'REID-TARGET #084';

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(intruderX - 16, intruderY - 35, 32, 50);

      // Target head & body
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(intruderX, intruderY - 25, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(intruderX - 6, intruderY - 18, 12, 22);

      // HUD Label
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(intruderX - 50, intruderY - 52, 100, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${targetId}`, intruderX - 44, intruderY - 40);

      // ReID Active Indicator
      if (reidTrackingActive) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(intruderX - 50, intruderY + 18, 100, 14);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText(`SEAMLESS ReID: 98%`, intruderX - 45, intruderY + 28);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [overlapBlend, showPredictiveVectors, reidTrackingActive]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto" id="stitching-view-root">
      {/* Header Info */}
      <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Layers size={18} />
            </span>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-[0.2em] font-mono">
              PANORAMIC MULTI-CAMERA FEED STITCHING & ReID
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Homographic feature alignment joining CAM 1 (Checkpoint Gate) and CAM 2 (East Perimeter Fence) into continuous 180° border coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            {stitchingStatus}
          </span>
        </div>
      </div>

      {/* Panoramic Stitched Canvas Viewport */}
      <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="relative w-full aspect-[21/9] bg-black rounded-xl overflow-hidden border border-white/[0.08]">
          {/* Top Info HUD */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-purple-600/90 backdrop-blur-md text-white text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              <Radio size={13} className="animate-pulse" />
              <span>STITCHED PANORAMA [CAM 1 + CAM 2]</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-black/80 text-emerald-400 text-xs font-mono border border-emerald-500/30 font-bold">
              FOV: 180° | LATENCY: 42ms
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={960}
            height={410}
            className="w-full h-full object-cover block"
          />

          {/* Bottom Controls Overlay */}
          <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-slate-300 font-mono font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPredictiveVectors}
                  onChange={(e) => setShowPredictiveVectors(e.target.checked)}
                  className="rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Predictive Trajectory AI</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 font-mono font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={reidTrackingActive}
                  onChange={(e) => setReidTrackingActive(e.target.checked)}
                  className="rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                />
                <span>Cross-Camera ReID Tracking</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[11px] font-mono">Overlap Seam Width:</span>
              <input
                type="range"
                min={15}
                max={60}
                value={overlapBlend}
                onChange={(e) => setOverlapBlend(Number(e.target.value))}
                className="w-24 accent-purple-500 cursor-pointer"
              />
              <span className="text-purple-300 font-mono text-xs font-bold">{overlapBlend}px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence & Border Feature Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-1 font-mono">
            <Navigation size={14} />
            <span>Target Handover Accuracy</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">99.4%</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Zero-loss target identity persistence when moving across blind spots.
          </p>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1 font-mono">
            <Sparkles size={14} />
            <span>Anomalous Pattern Score</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">88 / 100</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            High zigzag velocity detected along perimeter boundary fence.
          </p>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase mb-1 font-mono">
            <Radio size={14} />
            <span>Tactical Guard Rerouting</span>
          </div>
          <p className="text-xl font-black text-white font-mono">Patrol 02 Dispatched</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Intercept vector predicted at checkpoint gate within 45 seconds.
          </p>
        </div>
      </div>
    </div>
  );
};
