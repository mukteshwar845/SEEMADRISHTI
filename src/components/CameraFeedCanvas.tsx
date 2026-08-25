import React, { useRef, useEffect } from 'react';
import { CameraFeed } from '../types';

interface CameraFeedCanvasProps {
  camera: CameraFeed;
  showAiBoxes?: boolean;
  showZones?: boolean;
  showMotionTrails?: boolean;
  isNightVision?: boolean;
  onSimulateThreat?: () => void;
  className?: string;
}

export const CameraFeedCanvas: React.FC<CameraFeedCanvasProps> = ({
  camera,
  showAiBoxes = true,
  showZones = true,
  showMotionTrails = true,
  isNightVision = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation states per camera
  const simState = useRef({
    tick: Math.random() * 100,
    // CAM 1 state (Gate)
    cam1_p1: { x: 190, y: 155, vx: 0.35, vy: 0.1, score: 0.95 },
    cam1_p2: { x: 235, y: 160, vx: 0.3, vy: 0.08, score: 0.98 },
    cam1_car: { x: 380, y: 175, vx: -0.25, vy: 0.05, score: 0.92 },
    // CAM 2 state (Perimeter)
    cam2_patrol: { x: 140, y: 150, vx: 0.4, vy: 0, score: 0.94 },
    // CAM 3 state (Armory)
    cam3_forklift: { x: 260, y: 165, vx: 0.15, score: 0.88 },
    // CAM 4 state (Corridor)
    cam4_person: { x: 240, y: 140, vx: -0.2, vy: 0.25, score: 0.96 },
    scanline: 0,
  });

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      const s = simState.current;
      s.tick += 0.02;

      ctx.clearRect(0, 0, w, h);

      // Render scene according to camera id
      if (camera.id === 'cam-1') {
        renderCam1(ctx, w, h, s);
      } else if (camera.id === 'cam-2') {
        renderCam2(ctx, w, h, s, isNightVision);
      } else if (camera.id === 'cam-3') {
        renderCam3(ctx, w, h, s, isNightVision);
      } else {
        renderCam4(ctx, w, h, s);
      }

      // Scanline effect
      s.scanline = (s.scanline + 1.2) % h;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, s.scanline);
      ctx.lineTo(w, s.scanline);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    // Helper: Draw AI Bounding Box
    const drawBBox = (
      x: number,
      y: number,
      bw: number,
      bh: number,
      color: string,
      label: string,
      score: number
    ) => {
      if (!showAiBoxes) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, bw, bh);

      // Corner brackets
      const cl = 6;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Top Left
      ctx.moveTo(x, y + cl);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cl, y);
      // Top Right
      ctx.moveTo(x + bw - cl, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw, y + cl);
      // Bottom Left
      ctx.moveTo(x, y + bh - cl);
      ctx.lineTo(x, y + bh);
      ctx.lineTo(x + cl, y + bh);
      // Bottom Right
      ctx.moveTo(x + bw - cl, y + bh);
      ctx.lineTo(x + bw, y + bh);
      ctx.lineTo(x + bw, y + bh - cl);
      ctx.stroke();

      // Label background
      ctx.fillStyle = color;
      const tagText = `${label} ${score.toFixed(2)}`;
      ctx.font = 'bold 9px monospace';
      const tw = ctx.measureText(tagText).width;
      ctx.fillRect(x, y - 13, tw + 6, 13);

      // Text
      ctx.fillStyle = '#0a0f1d';
      ctx.fillText(tagText, x + 3, y - 3);
      ctx.restore();
    };

    // CAM 1: Main Checkpoint Gate
    const renderCam1 = (c: CanvasRenderingContext2D, w: number, h: number, st: typeof simState.current) => {
      // Sky
      const sky = c.createLinearGradient(0, 0, 0, h * 0.4);
      sky.addColorStop(0, '#475569');
      sky.addColorStop(1, '#64748b');
      c.fillStyle = sky;
      c.fillRect(0, 0, w, h * 0.4);

      // Mountains / Horizon
      c.fillStyle = '#1e293b';
      c.beginPath();
      c.moveTo(0, h * 0.4);
      for (let x = 0; x <= w; x += 20) {
        c.lineTo(x, h * 0.4 - Math.sin(x * 0.04) * 8 - 4);
      }
      c.lineTo(w, h * 0.4);
      c.closePath();
      c.fill();

      // Asphalt Road
      const road = c.createLinearGradient(0, h * 0.4, 0, h);
      road.addColorStop(0, '#334155');
      road.addColorStop(1, '#1e293b');
      c.fillStyle = road;
      c.fillRect(0, h * 0.4, w, h * 0.6);

      // Zebra crossing
      c.fillStyle = '#cbd5e1';
      for (let i = 0; i < 6; i++) {
        c.fillRect(w * 0.28 + i * 16, h * 0.62, 10, 35);
      }

      // Guard Booth
      c.fillStyle = '#0f172a';
      c.fillRect(w * 0.68, h * 0.32, 70, 75);
      c.fillStyle = '#38bdf8';
      c.fillRect(w * 0.70, h * 0.36, 30, 22); // window
      c.fillStyle = '#f59e0b';
      c.fillRect(w * 0.66, h * 0.58, 6, 26); // barrier post
      c.fillStyle = '#ef4444';
      c.fillRect(w * 0.48, h * 0.60, 90, 4); // barrier arm

      // Intrusion Danger Zone Polygon
      if (showZones) {
        c.save();
        c.fillStyle = 'rgba(239, 68, 68, 0.15)';
        c.strokeStyle = '#ef4444';
        c.lineWidth = 1;
        c.setLineDash([3, 3]);
        c.beginPath();
        c.moveTo(w * 0.62, h * 0.36);
        c.lineTo(w * 0.92, h * 0.36);
        c.lineTo(w * 0.90, h * 0.75);
        c.lineTo(w * 0.56, h * 0.78);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#ef4444';
        c.font = 'bold 9px sans-serif';
        c.fillText('INTRUSION ZONE', w * 0.64, h * 0.42);
        c.restore();
      }

      // Move Pedestrian 1
      st.cam1_p1.x += st.cam1_p1.vx;
      st.cam1_p1.y += st.cam1_p1.vy;
      if (st.cam1_p1.x > w * 0.55 || st.cam1_p1.x < w * 0.25) st.cam1_p1.vx *= -1;
      if (st.cam1_p1.y > h * 0.75 || st.cam1_p1.y < h * 0.55) st.cam1_p1.vy *= -1;

      // Draw Pedestrian 1
      c.fillStyle = '#3b82f6';
      c.beginPath();
      c.arc(st.cam1_p1.x + 8, st.cam1_p1.y - 12, 4, 0, Math.PI * 2);
      c.fill();
      c.fillRect(st.cam1_p1.x + 4, st.cam1_p1.y - 8, 8, 16);
      drawBBox(st.cam1_p1.x, st.cam1_p1.y - 18, 18, 30, '#10b981', 'PERSON', st.cam1_p1.score);

      // Move Pedestrian 2
      st.cam1_p2.x += st.cam1_p2.vx;
      if (st.cam1_p2.x > w * 0.6 || st.cam1_p2.x < w * 0.3) st.cam1_p2.vx *= -1;

      c.fillStyle = '#10b981';
      c.beginPath();
      c.arc(st.cam1_p2.x + 8, st.cam1_p2.y - 12, 4, 0, Math.PI * 2);
      c.fill();
      c.fillRect(st.cam1_p2.x + 4, st.cam1_p2.y - 8, 8, 16);
      drawBBox(st.cam1_p2.x, st.cam1_p2.y - 18, 18, 30, '#10b981', 'PERSON', st.cam1_p2.score);

      // Move Vehicle
      st.cam1_car.x += st.cam1_car.vx;
      if (st.cam1_car.x < w * 0.35 || st.cam1_car.x > w * 0.58) st.cam1_car.vx *= -1;

      c.fillStyle = '#e2e8f0';
      c.fillRect(st.cam1_car.x, st.cam1_car.y, 65, 24);
      c.fillStyle = '#1e293b';
      c.fillRect(st.cam1_car.x + 12, st.cam1_car.y - 10, 36, 12);
      c.fillStyle = '#0f172a';
      c.beginPath();
      c.arc(st.cam1_car.x + 14, st.cam1_car.y + 24, 6, 0, Math.PI * 2);
      c.arc(st.cam1_car.x + 50, st.cam1_car.y + 24, 6, 0, Math.PI * 2);
      c.fill();
      drawBBox(st.cam1_car.x - 4, st.cam1_car.y - 14, 73, 44, '#f59e0b', 'VEHICLE', st.cam1_car.score);
    };

    // CAM 2: Perimeter Border Fence
    const renderCam2 = (c: CanvasRenderingContext2D, w: number, h: number, st: typeof simState.current, isNight: boolean) => {
      // Background (Dusk / Night thermal)
      const grad = c.createLinearGradient(0, 0, 0, h);
      if (isNight) {
        grad.addColorStop(0, '#022c22');
        grad.addColorStop(1, '#064e3b');
      } else {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.4, '#1e293b');
        grad.addColorStop(1, '#020617');
      }
      c.fillStyle = grad;
      c.fillRect(0, 0, w, h);

      // Perimeter wire fence posts
      c.strokeStyle = isNight ? '#34d399' : '#64748b';
      c.lineWidth = 1.5;
      for (let x = 20; x < w; x += 40) {
        c.beginPath();
        c.moveTo(x, h * 0.3);
        c.lineTo(x, h * 0.85);
        c.stroke();
      }

      // Diamond mesh pattern
      c.strokeStyle = isNight ? 'rgba(52, 211, 153, 0.25)' : 'rgba(148, 163, 184, 0.2)';
      c.lineWidth = 1;
      for (let y = h * 0.35; y < h * 0.85; y += 12) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }

      // Searchlight cone
      c.save();
      const lightGrad = c.createRadialGradient(w * 0.5, 0, 10, w * 0.5, h * 0.7, 180);
      lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      c.fillStyle = lightGrad;
      c.beginPath();
      c.moveTo(w * 0.5, 0);
      c.lineTo(w * 0.2, h);
      c.lineTo(w * 0.8, h);
      c.closePath();
      c.fill();
      c.restore();

      // Warning Buffer Zone
      if (showZones) {
        c.save();
        c.fillStyle = 'rgba(245, 158, 11, 0.12)';
        c.strokeStyle = '#f59e0b';
        c.lineWidth = 1;
        c.setLineDash([4, 4]);
        c.strokeRect(w * 0.15, h * 0.45, w * 0.7, h * 0.35);
        c.fillRect(w * 0.15, h * 0.45, w * 0.7, h * 0.35);
        c.fillStyle = '#f59e0b';
        c.font = 'bold 9px sans-serif';
        c.fillText('BUFFER SECTOR 02', w * 0.18, h * 0.52);
        c.restore();
      }

      // Patrol officer moving along fence
      st.cam2_patrol.x += st.cam2_patrol.vx;
      if (st.cam2_patrol.x > w * 0.75 || st.cam2_patrol.x < w * 0.2) st.cam2_patrol.vx *= -1;

      // Draw Tactical Officer
      c.fillStyle = isNight ? '#a7f3d0' : '#38bdf8';
      c.beginPath();
      c.arc(st.cam2_patrol.x + 8, h * 0.65 - 14, 4, 0, Math.PI * 2);
      c.fill();
      c.fillRect(st.cam2_patrol.x + 4, h * 0.65 - 10, 8, 18);
      drawBBox(
        st.cam2_patrol.x,
        h * 0.65 - 20,
        18,
        32,
        '#10b981',
        'PATROL_UNIT',
        st.cam2_patrol.score
      );
    };

    // CAM 3: Tactical Warehouse & Armory
    const renderCam3 = (c: CanvasRenderingContext2D, w: number, h: number, st: typeof simState.current, isNight: boolean) => {
      // Warehouse Interior
      c.fillStyle = isNight ? '#052e16' : '#111827';
      c.fillRect(0, 0, w, h);

      // Industrial Roof beams
      c.strokeStyle = isNight ? '#166534' : '#374151';
      c.lineWidth = 2;
      for (let x = 0; x < w; x += 60) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(w * 0.5, h * 0.25);
        c.stroke();
      }

      // Shelves with Cargo Crates
      c.fillStyle = '#1e293b';
      c.fillRect(20, h * 0.35, 65, 80);
      c.fillRect(w - 85, h * 0.35, 65, 80);
      c.fillStyle = '#f59e0b';
      c.fillRect(25, h * 0.4, 25, 20);
      c.fillRect(55, h * 0.4, 25, 20);
      c.fillRect(25, h * 0.65, 55, 20);

      // Forklift Moving
      st.cam3_forklift.x += st.cam3_forklift.vx;
      if (st.cam3_forklift.x > w * 0.65 || st.cam3_forklift.x < w * 0.35) st.cam3_forklift.vx *= -1;

      c.fillStyle = '#eab308';
      c.fillRect(st.cam3_forklift.x, h * 0.65, 45, 24);
      c.fillStyle = '#0f172a';
      c.fillRect(st.cam3_forklift.x + 30, h * 0.55, 4, 34);
      c.fillRect(st.cam3_forklift.x + 34, h * 0.72, 14, 4); // forks
      c.beginPath();
      c.arc(st.cam3_forklift.x + 10, h * 0.89, 5, 0, Math.PI * 2);
      c.arc(st.cam3_forklift.x + 36, h * 0.89, 5, 0, Math.PI * 2);
      c.fill();
      drawBBox(
        st.cam3_forklift.x - 2,
        h * 0.53,
        54,
        42,
        '#f59e0b',
        'EQUIPMENT',
        st.cam3_forklift.score
      );

      // Green IR timestamp / HUD
      c.fillStyle = isNight ? '#22c55e' : '#94a3b8';
      c.font = '8px monospace';
      c.fillText('NIGHTVISION IR ACTIVE [FILTER 850nm]', 15, 20);
    };

    // CAM 4: Command Center Server Corridor
    const renderCam4 = (c: CanvasRenderingContext2D, w: number, h: number, st: typeof simState.current) => {
      // Perspective corridor
      c.fillStyle = '#0f172a';
      c.fillRect(0, 0, w, h);

      // Hallway perspective walls
      c.fillStyle = '#1e293b';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(w * 0.3, h * 0.25);
      c.lineTo(w * 0.3, h * 0.75);
      c.lineTo(0, h);
      c.closePath();
      c.fill();

      c.beginPath();
      c.moveTo(w, 0);
      c.lineTo(w * 0.7, h * 0.25);
      c.lineTo(w * 0.7, h * 0.75);
      c.lineTo(w, h);
      c.closePath();
      c.fill();

      // Back door
      c.fillStyle = '#020617';
      c.fillRect(w * 0.3, h * 0.25, w * 0.4, h * 0.5);
      c.fillStyle = '#38bdf8';
      c.fillRect(w * 0.45, h * 0.35, w * 0.1, h * 0.3); // glass door pane

      // Server rack blinking LEDs on left wall
      for (let i = 0; i < 8; i++) {
        const ledY = h * 0.28 + i * 14;
        const isBlinking = Math.sin(st.tick * 4 + i) > 0;
        c.fillStyle = isBlinking ? '#10b981' : '#38bdf8';
        c.beginPath();
        c.arc(w * 0.18, ledY, 2, 0, Math.PI * 2);
        c.fill();
      }

      // Restricted Security Zone
      if (showZones) {
        c.save();
        c.fillStyle = 'rgba(239, 68, 68, 0.12)';
        c.strokeStyle = '#ef4444';
        c.lineWidth = 1;
        c.setLineDash([3, 3]);
        c.strokeRect(w * 0.32, h * 0.4, w * 0.36, h * 0.45);
        c.fillRect(w * 0.32, h * 0.4, w * 0.36, h * 0.45);
        c.fillStyle = '#ef4444';
        c.font = 'bold 8px sans-serif';
        c.fillText('RESTRICTED ACCESS', w * 0.35, h * 0.46);
        c.restore();
      }

      // Officer / Analyst moving down corridor
      st.cam4_person.y += st.cam4_person.vy;
      if (st.cam4_person.y > h * 0.65 || st.cam4_person.y < h * 0.35) {
        st.cam4_person.vy *= -1;
      }

      const pScale = 0.5 + (st.cam4_person.y / h) * 0.6;
      const px = w * 0.5 - 6 * pScale;
      const py = st.cam4_person.y;

      c.fillStyle = '#f43f5e';
      c.beginPath();
      c.arc(px + 6 * pScale, py - 10 * pScale, 4 * pScale, 0, Math.PI * 2);
      c.fill();
      c.fillRect(px, py - 6 * pScale, 12 * pScale, 18 * pScale);

      // Biometric Facial Recognition target box
      drawBBox(
        px - 3,
        py - 16 * pScale,
        18 * pScale + 6,
        28 * pScale + 6,
        '#38bdf8',
        'FACE_AUTH',
        st.cam4_person.score
      );
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [camera.id, showAiBoxes, showZones, showMotionTrails, isNightVision]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={270}
      className={`w-full h-full object-cover block ${className}`}
    />
  );
};
