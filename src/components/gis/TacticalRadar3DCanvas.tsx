import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Box,
  Compass,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Eye,
  Crosshair,
  Shield,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export interface RadarContact3D {
  id: string;
  trackId: number;
  label: string;
  type: 'HUMAN' | 'VEHICLE' | 'DRONE' | 'PATROL';
  distanceMeters: number;
  angleDeg: number;
  speedKmh: number;
  headingDeg: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'FRIENDLY';
  sector: string;
  nearestCam: string;
}

export interface CameraNode3D {
  id: string;
  name: string;
  sector: string;
  angleDeg: number;
  distanceMeters: number;
  fovAngle: number;
  fovWidth: number;
  status: 'Online' | 'Motion' | 'Breach' | 'Offline';
}

interface TacticalRadar3DCanvasProps {
  contacts: RadarContact3D[];
  cameraNodes: CameraNode3D[];
  radarRange: number;
  onSelectContact?: (contact: RadarContact3D) => void;
  onSelectCamera?: (cameraId: string) => void;
  className?: string;
}

type ViewAnglePreset = 'ISOMETRIC' | 'TOP_DOWN' | 'PERIMETER' | 'DRONE_ORBIT';

export const TacticalRadar3DCanvas: React.FC<TacticalRadar3DCanvasProps> = ({
  contacts,
  cameraNodes,
  radarRange,
  onSelectContact,
  onSelectCamera,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<ViewAnglePreset>('ISOMETRIC');
  const [hoveredTarget, setHoveredTarget] = useState<RadarContact3D | null>(null);
  const [hoveredCamera, setHoveredCamera] = useState<CameraNode3D | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  // References to mutable Three.js controls
  const controlsRef = useRef<{
    setPreset: (preset: ViewAnglePreset) => void;
    zoom: (delta: number) => void;
    reset: () => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean previous elements if any
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth || container.offsetWidth || 800;
    const height = container.clientHeight || container.offsetHeight || 580;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020713, 0.016);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const defaultCamPos = new THREE.Vector3(0, 34, 46);
    camera.position.copy(defaultCamPos);
    camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer with graceful error handling
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x020612, 1);
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('[3D RADAR] WebGL context initialization failed:', err);
      setWebGlSupported(false);
      return;
    }

    // 4. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x0a2540, 2.2);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x00f0ff, 5, 100);
    mainLight.position.set(0, 30, 0);
    scene.add(mainLight);

    const cornerLight = new THREE.PointLight(0x0284c7, 3, 70);
    cornerLight.position.set(30, 15, -30);
    scene.add(cornerLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 5. 3D Holographic Topographic Terrain Plane
    const terrainSize = 68;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 56, 56);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const elevation =
        Math.sin(x * 0.11) * 2.2 +
        Math.cos(z * 0.13) * 1.8 +
        Math.sin((x + z) * 0.07) * 1.4;
      pos.setY(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0x004066,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.y = -1.6;
    worldGroup.add(terrainMesh);

    // 6. Concentric 3D Radar Range Rings (100m, 250m, 375m, 500m equivalent)
    const maxRadius = 26;
    [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
      const r = maxRadius * ratio;
      const ringGeo = new THREE.RingGeometry(r - 0.1, r, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ratio === 1.0 ? 0x00f0ff : 0x0ea5e9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ratio === 1.0 ? 0.7 : 0.3,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      worldGroup.add(ring);
    });

    // 7. Radar Crosshairs & Compass Cardinal Axes
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-maxRadius, 0.06, 0),
      new THREE.Vector3(maxRadius, 0.06, 0),
      new THREE.Vector3(0, 0.06, -maxRadius),
      new THREE.Vector3(0, 0.06, maxRadius),
    ]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.35 });
    const axisLines = new THREE.LineSegments(axisGeo, axisMat);
    worldGroup.add(axisLines);

    // 8. Central Command Watchtower
    const towerGroup = new THREE.Group();
    const towerBaseGeo = new THREE.CylinderGeometry(0.6, 1.2, 5.0, 8);
    const towerBaseMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
    const towerBase = new THREE.Mesh(towerBaseGeo, towerBaseMat);
    towerBase.position.y = 2.5;
    towerGroup.add(towerBase);

    // Pulsing radar dome
    const domeGeo = new THREE.SphereGeometry(0.95, 20, 20);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 5.2;
    towerGroup.add(dome);
    worldGroup.add(towerGroup);

    // 9. 3D Radar Sweeping Beam (Volumetric Conical Sector)
    const sweepGeo = new THREE.ConeGeometry(maxRadius, 1.4, 48, 1, true, 0, Math.PI / 3);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    });
    const sweepBeam = new THREE.Mesh(sweepGeo, sweepMat);
    sweepBeam.rotation.x = Math.PI / 2;
    sweepBeam.position.y = 0.25;
    worldGroup.add(sweepBeam);

    // 10. Camera Sensor Node Beacons (Raycastable)
    const interactiveObjects: THREE.Object3D[] = [];
    const cameraMeshes: THREE.Group[] = [];

    cameraNodes.forEach((cam) => {
      const rad = (cam.angleDeg - 90) * (Math.PI / 180);
      const distRatio = Math.min(1.0, cam.distanceMeters / radarRange);
      const x = maxRadius * distRatio * Math.cos(rad);
      const z = maxRadius * distRatio * Math.sin(rad);

      const camGroup = new THREE.Group();
      camGroup.position.set(x, 0.5, z);

      // Sentry Beacon Pole
      const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 3.2, 8);
      const poleColor = cam.status === 'Breach' ? 0xff0055 : cam.status === 'Motion' ? 0xf59e0b : 0x00f0ff;
      const poleMat = new THREE.MeshBasicMaterial({ color: poleColor });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.6;
      camGroup.add(pole);

      // Sentry Head Sensor Dome
      const headGeo = new THREE.SphereGeometry(0.45, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color: poleColor });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 3.3;
      camGroup.add(head);

      // FOV Radar Wedge
      const fovGeo = new THREE.ConeGeometry(5.2, 0.25, 20, 1, true, -(cam.fovWidth * Math.PI) / 360, (cam.fovWidth * Math.PI) / 180);
      const fovMat = new THREE.MeshBasicMaterial({
        color: poleColor,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });
      const fovWedge = new THREE.Mesh(fovGeo, fovMat);
      fovWedge.rotation.x = Math.PI / 2;
      fovWedge.rotation.z = (cam.fovAngle * Math.PI) / 180;
      camGroup.add(fovWedge);

      camGroup.userData = { isCamera: true, data: cam };
      worldGroup.add(camGroup);
      cameraMeshes.push(camGroup);
      interactiveObjects.push(camGroup);
    });

    // 11. 3D Tactical Contacts (Intruder, Vehicle, Drone, Patrols)
    let droneMeshRef: THREE.Mesh | null = null;

    contacts.forEach((contact) => {
      const rad = (contact.angleDeg - 90) * (Math.PI / 180);
      const distRatio = Math.min(1.0, contact.distanceMeters / radarRange);
      const x = maxRadius * distRatio * Math.cos(rad);
      const z = maxRadius * distRatio * Math.sin(rad);

      const grp = new THREE.Group();

      if (contact.type === 'DRONE') {
        grp.position.set(x, 8.5, z);
        const droneGeo = new THREE.OctahedronGeometry(0.75, 0);
        const droneMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
        const droneMesh = new THREE.Mesh(droneGeo, droneMat);
        grp.add(droneMesh);
        droneMeshRef = droneMesh;

        // Ground Altitude Projection Circle
        const shadowGeo = new THREE.RingGeometry(0.8, 0.9, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = Math.PI / 2;
        shadow.position.y = -8.4;
        grp.add(shadow);
      } else {
        grp.position.set(x, 0.9, z);
        const color = contact.threatLevel === 'FRIENDLY' ? 0x10b981 : contact.threatLevel === 'CRITICAL' ? 0xff0055 : 0xf59e0b;
        const sphereGeo = new THREE.SphereGeometry(contact.type === 'VEHICLE' ? 0.7 : 0.52, 14, 14);
        const sphereMat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        grp.add(mesh);

        // Pulse beacon ring around critical targets
        const haloGeo = new THREE.RingGeometry(0.85, 0.98, 20);
        const haloMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        grp.add(halo);
      }

      grp.userData = { isContact: true, data: contact };
      worldGroup.add(grp);
      interactiveObjects.push(grp);
    });

    // 12. Mouse & Touch 3D Orbit Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationY = 0;
    let rotationX = 0.25;
    let autoRotate = true;
    let currentDist = 58;

    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      autoRotate = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouseCoord.x = (clientX / rect.width) * 2 - 1;
      mouseCoord.y = -(clientY / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        rotationY += dx * 0.008;
        rotationX = Math.max(-0.15, Math.min(0.85, rotationX + dy * 0.006));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        // Raycast for hover tooltip
        raycaster.setFromCamera(mouseCoord, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
          let rootObj: THREE.Object3D | null = intersects[0].object;
          while (rootObj && !rootObj.userData?.isContact && !rootObj.userData?.isCamera && rootObj.parent !== worldGroup) {
            rootObj = rootObj.parent;
          }

          if (rootObj?.userData?.isContact) {
            setHoveredTarget(rootObj.userData.data);
            setHoveredCamera(null);
            setTooltipPos({ x: clientX + 15, y: clientY + 15 });
          } else if (rootObj?.userData?.isCamera) {
            setHoveredCamera(rootObj.userData.data);
            setHoveredTarget(null);
            setTooltipPos({ x: clientX + 15, y: clientY + 15 });
          }
        } else {
          setHoveredTarget(null);
          setHoveredCamera(null);
          setTooltipPos(null);
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseCoord.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseCoord, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects, true);

      if (intersects.length > 0) {
        let rootObj: THREE.Object3D | null = intersects[0].object;
        while (rootObj && !rootObj.userData?.isContact && !rootObj.userData?.isCamera && rootObj.parent !== worldGroup) {
          rootObj = rootObj.parent;
        }

        if (rootObj?.userData?.isContact && onSelectContact) {
          onSelectContact(rootObj.userData.data);
        } else if (rootObj?.userData?.isCamera && onSelectCamera) {
          onSelectCamera(rootObj.userData.data.id);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      currentDist = Math.max(22, Math.min(85, currentDist + (e.deltaY > 0 ? 3 : -3)));
      const dir = camera.position.clone().normalize();
      camera.position.copy(dir.multiplyScalar(currentDist));
      setZoomLevel(Math.round((58 / currentDist) * 100) / 100);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Touch Support
    let prevTouchX = 0;
    let prevTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevTouchX = e.touches[0].clientX;
        prevTouchY = e.touches[0].clientY;
        autoRotate = false;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - prevTouchX;
        const dy = e.touches[0].clientY - prevTouchY;
        rotationY += dx * 0.008;
        rotationX = Math.max(-0.15, Math.min(0.85, rotationX + dy * 0.006));
        prevTouchX = e.touches[0].clientX;
        prevTouchY = e.touches[0].clientY;
      }
    };
    const onTouchEnd = () => {
      isDragging = false;
    };
    container.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // Preset View Angles
    controlsRef.current = {
      setPreset: (preset: ViewAnglePreset) => {
        setActivePreset(preset);
        autoRotate = false;
        if (preset === 'ISOMETRIC') {
          camera.position.set(0, 34, 46);
          rotationX = 0.25;
          rotationY = 0;
          currentDist = 58;
        } else if (preset === 'TOP_DOWN') {
          camera.position.set(0, 60, 0.1);
          rotationX = 0.95;
          rotationY = 0;
          currentDist = 60;
        } else if (preset === 'PERIMETER') {
          camera.position.set(0, 14, 42);
          rotationX = 0.08;
          rotationY = 0;
          currentDist = 45;
        } else if (preset === 'DRONE_ORBIT') {
          autoRotate = true;
          camera.position.set(0, 28, 48);
          rotationX = 0.22;
        }
        camera.lookAt(0, 0, 0);
      },
      zoom: (delta: number) => {
        currentDist = Math.max(22, Math.min(85, currentDist + delta));
        const dir = camera.position.clone().normalize();
        camera.position.copy(dir.multiplyScalar(currentDist));
        setZoomLevel(Math.round((58 / currentDist) * 100) / 100);
      },
      reset: () => {
        controlsRef.current?.setPreset('ISOMETRIC');
      },
    };

    // 13. Dynamic Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // World Rotation
      if (autoRotate) {
        rotationY += 0.003;
      }
      worldGroup.rotation.y = rotationY;
      worldGroup.rotation.x = rotationX;

      // Volumetric Radar Beam Rotation (360° Continuous Sweep)
      sweepBeam.rotation.z = -elapsed * 1.8;

      // Pulse Central Tower Dome
      const domeScale = 1.0 + Math.sin(elapsed * 4.5) * 0.1;
      dome.scale.set(domeScale, domeScale, domeScale);

      // Rotate Airborne Drone
      if (droneMeshRef) {
        droneMeshRef.rotation.y += 0.045;
        droneMeshRef.rotation.x += 0.02;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 14. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          camera.aspect = cr.width / cr.height;
          camera.updateProjectionMatrix();
          renderer.setSize(cr.width, cr.height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onClick);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [contacts, cameraNodes, radarRange, onSelectContact, onSelectCamera]);

  return (
    <div
      id="tactical-radar-3d-wrapper"
      className={`relative w-full h-[580px] rounded-3xl overflow-hidden bg-[#020510] border border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.22)] select-none ${className}`}
    >
      {/* 3D WebGL Canvas Mount Node */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Left HUD Info Bar */}
      <div className="absolute top-3.5 left-4 z-20 flex items-center gap-2.5 pointer-events-none">
        <span className="w-3 h-3 bg-cyan-400 rounded-full animate-ping shadow-[0_0_12px_#00f0ff]" />
        <div className="flex flex-col">
          <span className="text-xs font-mono font-black text-cyan-300 tracking-widest drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
            3D HOLOGRAPHIC TERRAIN RADAR // ZERO-LINE GRID
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Real-time WebGL Volumetric Sweep &bull; 9 Sentry Cones &bull; {contacts.length} Contacts
          </span>
        </div>
      </div>

      {/* Top Right Quick Angle Presets Bar */}
      <div className="absolute top-3.5 right-4 z-20 flex items-center gap-1.5 p-1 bg-black/75 backdrop-blur-md rounded-xl border border-white/15 text-[10px] font-mono font-bold">
        <button
          onClick={() => controlsRef.current?.setPreset('ISOMETRIC')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activePreset === 'ISOMETRIC'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Isometric 45° Tactical Overview"
        >
          45° ISO
        </button>

        <button
          onClick={() => controlsRef.current?.setPreset('TOP_DOWN')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activePreset === 'TOP_DOWN'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Top-Down 90° Orthogonal Map"
        >
          90° TOP
        </button>

        <button
          onClick={() => controlsRef.current?.setPreset('PERIMETER')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activePreset === 'PERIMETER'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Low-Angle Sentry Ground View"
        >
          SENTRY
        </button>

        <button
          onClick={() => controlsRef.current?.setPreset('DRONE_ORBIT')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activePreset === 'DRONE_ORBIT'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Continuous 360° Cinematic Drone Orbit"
        >
          ORBIT 360°
        </button>
      </div>

      {/* Floating Zoom & Reset Control Bar (Bottom Left) */}
      <div className="absolute bottom-12 left-4 z-20 flex items-center gap-1.5 p-1 bg-black/80 backdrop-blur-md rounded-xl border border-white/15 text-xs font-mono">
        <button
          onClick={() => controlsRef.current?.zoom(-8)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => controlsRef.current?.zoom(8)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={() => controlsRef.current?.reset()}
          className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-all cursor-pointer"
          title="Reset Camera View"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Bottom Status / Instructions Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[10px] font-mono bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30">
        <span className="text-slate-300 flex items-center gap-2">
          <span className="text-cyan-400 font-bold">[3D CONTROLS]:</span>
          <span>DRAG TO ORBIT // WHEEL TO ZOOM // CLICK TARGET OR SENTRY BEACON TO INSPECT</span>
        </span>
        <span className="text-cyan-400 font-bold hidden md:inline">
          RANGE: {radarRange}M &bull; 60 FPS INFERENCE &bull; WEBGL 3D
        </span>
      </div>

      {/* Interactive Raycasted Hover Tooltip */}
      {tooltipPos && hoveredTarget && (
        <div
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          className="absolute z-30 pointer-events-none p-2.5 rounded-xl bg-slate-950/95 border border-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.4)] backdrop-blur-md text-xs font-mono animate-fadeIn"
        >
          <div className="flex items-center gap-1.5 font-black text-cyan-300">
            <Crosshair size={13} className="text-rose-400 animate-pulse" />
            <span>{hoveredTarget.label}</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-300">
            <div>DIST: <span className="text-white font-bold">{hoveredTarget.distanceMeters}m</span></div>
            <div>SPEED: <span className="text-cyan-300 font-bold">{hoveredTarget.speedKmh} km/h</span></div>
            <div>SECTOR: <span className="text-white font-bold">{hoveredTarget.sector}</span></div>
            <div>THREAT: <span className="text-rose-400 font-bold">{hoveredTarget.threatLevel}</span></div>
          </div>
          <div className="mt-1 text-[9px] text-cyan-400 font-bold">CLICK TO LOCK TARGET &rarr;</div>
        </div>
      )}

      {tooltipPos && hoveredCamera && (
        <div
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          className="absolute z-30 pointer-events-none p-2.5 rounded-xl bg-slate-950/95 border border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-md text-xs font-mono animate-fadeIn"
        >
          <div className="flex items-center gap-1.5 font-black text-emerald-300">
            <Eye size={13} className="text-emerald-400" />
            <span>{hoveredCamera.name}</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-300">
            <div>STATUS: <span className="text-emerald-300 font-bold">{hoveredCamera.status}</span></div>
            <div>FOV: <span className="text-white font-bold">{hoveredCamera.fovWidth}° @ {hoveredCamera.fovAngle}°</span></div>
          </div>
          <div className="mt-1 text-[9px] text-emerald-400 font-bold">CLICK TO OPEN LIVE FEED &rarr;</div>
        </div>
      )}
    </div>
  );
};
