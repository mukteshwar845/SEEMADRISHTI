import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Shield, Cpu, Activity, Radio, Sparkles, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface SwarmNodeData {
  id: string;
  name: string;
  role: string;
  color: number;
  hex: string;
  x: number;
  y: number;
  z: number;
  status: 'ONLINE' | 'ACTIVE' | 'PROCESSING';
}

const AGENT_NODES: SwarmNodeData[] = [
  { id: 'sentinel', name: 'SENTINEL-01', role: 'Perception & Tripwires', color: 0x00f0ff, hex: '#00f0ff', x: -3.5, y: 1.2, z: 0.5, status: 'ACTIVE' },
  { id: 'pathfinder', name: 'PATHFINDER-02', role: 'Kinematics & Re-ID', color: 0x10b981, hex: '#10b981', x: -1.2, y: 3.2, z: -1.0, status: 'ONLINE' },
  { id: 'commander', name: 'COMMANDER-03', role: 'ROE & QRT Dispatch', color: 0xef4444, hex: '#ef4444', x: 2.8, y: 2.0, z: 0.8, status: 'ONLINE' },
  { id: 'forensic', name: 'LEX-FORENSIC-04', role: 'SHA-256 Custody', color: 0xa855f7, hex: '#a855f7', x: 2.2, y: -2.2, z: -0.5, status: 'ONLINE' },
  { id: 'awareness', name: 'AWARENESS-05', role: 'Multi-Sensor Fusion', color: 0xf59e0b, hex: '#f59e0b', x: -2.5, y: -2.0, z: 1.2, status: 'ACTIVE' },
];

export const Swarm3DTopology: React.FC<{
  className?: string;
  onSelectAgent?: (agentId: string) => void;
}> = ({ className = '', onSelectAgent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<SwarmNodeData | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth || container.offsetWidth || 700;
    const height = container.clientHeight || container.offsetHeight || 320;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    // 3. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f0ff, 5, 35);
    pointLight.position.set(0, 5, 8);
    scene.add(pointLight);

    // Main Swarm Rotation Group
    const swarmGroup = new THREE.Group();
    scene.add(swarmGroup);

    // Central Neural Core (Pulsing Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    swarmGroup.add(coreMesh);

    // Inner glowing core
    const innerCoreGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    swarmGroup.add(innerCoreMesh);

    // Orbital Rings
    const ringGeo1 = new THREE.RingGeometry(4.2, 4.28, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    swarmGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(4.8, 4.86, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    swarmGroup.add(ring2);

    // 5. Agent Nodes & Meshes
    const nodeMeshes: THREE.Mesh[] = [];
    const interactiveMeshes: THREE.Object3D[] = [];

    AGENT_NODES.forEach((node) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(node.x, node.y, node.z);

      // Outer wireframe halo
      const nodeGeo = new THREE.OctahedronGeometry(0.55, 0);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: node.color,
        wireframe: true,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeGroup.add(nodeMesh);
      nodeMeshes.push(nodeMesh);

      // Inner glowing core
      const nodeCoreGeo = new THREE.SphereGeometry(0.24, 14, 14);
      const nodeCoreMat = new THREE.MeshBasicMaterial({
        color: node.color,
      });
      const nodeCoreMesh = new THREE.Mesh(nodeCoreGeo, nodeCoreMat);
      nodeGroup.add(nodeCoreMesh);

      nodeGroup.userData = { isAgent: true, agent: node };
      swarmGroup.add(nodeGroup);
      interactiveMeshes.push(nodeGroup);
    });

    // 6. Neural Link Lines between all 5 Agents
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
    });

    const linePoints: THREE.Vector3[] = [];
    for (let i = 0; i < AGENT_NODES.length; i++) {
      for (let j = i + 1; j < AGENT_NODES.length; j++) {
        linePoints.push(new THREE.Vector3(AGENT_NODES[i].x, AGENT_NODES[i].y, AGENT_NODES[i].z));
        linePoints.push(new THREE.Vector3(AGENT_NODES[j].x, AGENT_NODES[j].y, AGENT_NODES[j].z));
      }
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const neuralLines = new THREE.LineSegments(lineGeo, lineMat);
    swarmGroup.add(neuralLines);

    // 7. Dynamic Data Pulse Particles traversing neural lines
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 6.5;
      particlePositions[idx + 1] = (Math.random() - 0.5) * 6.5;
      particlePositions[idx + 2] = (Math.random() - 0.5) * 3.5;

      particleColors[idx] = 0.0;
      particleColors[idx + 1] = 0.94;
      particleColors[idx + 2] = 1.0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    swarmGroup.add(particles);

    // Mouse Drag & Raycast Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationY = 0;
    let rotationX = 0;
    let autoRotate = true;

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
        rotationX = Math.max(-0.6, Math.min(0.6, rotationX + dy * 0.006));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        raycaster.setFromCamera(mouseCoord, camera);
        const intersects = raycaster.intersectObjects(interactiveMeshes, true);

        if (intersects.length > 0) {
          let root: THREE.Object3D | null = intersects[0].object;
          while (root && !root.userData?.isAgent && root.parent !== swarmGroup) {
            root = root.parent;
          }
          if (root?.userData?.isAgent) {
            setHoveredNode(root.userData.agent);
          }
        } else {
          setHoveredNode(null);
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
      const intersects = raycaster.intersectObjects(interactiveMeshes, true);

      if (intersects.length > 0) {
        let root: THREE.Object3D | null = intersects[0].object;
        while (root && !root.userData?.isAgent && root.parent !== swarmGroup) {
          root = root.parent;
        }
        if (root?.userData?.isAgent) {
          setActiveNodeId(root.userData.agent.id);
          if (onSelectAgent) {
            onSelectAgent(root.userData.agent.id);
          }
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate) {
        rotationY += 0.004;
      }
      swarmGroup.rotation.y = rotationY;
      swarmGroup.rotation.x = rotationX;

      // Pulse central core
      const coreScale = 1.0 + Math.sin(elapsedTime * 2.5) * 0.09;
      coreMesh.scale.set(coreScale, coreScale, coreScale);
      coreMesh.rotation.y += 0.012;
      coreMesh.rotation.x += 0.006;

      // Rotate individual agent nodes
      nodeMeshes.forEach((mesh, index) => {
        mesh.rotation.x += 0.02 * (index % 2 === 0 ? 1 : -1);
        mesh.rotation.y += 0.022;
      });

      // Animate particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        posArray[idx + 1] += Math.sin(elapsedTime + i) * 0.012;
        posArray[idx] += Math.cos(elapsedTime + i) * 0.009;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

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
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onSelectAgent]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-950/80 border border-cyan-500/35 backdrop-blur-xl shadow-[0_0_35px_rgba(0,240,255,0.18)] ${className}`}
    >
      {/* HUD Header */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping shadow-[0_0_10px_#00f0ff]" />
          <span className="text-xs font-mono font-black text-cyan-300 tracking-wider">
            3D SWARM NEURAL MESH TOPOLOGY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300">
            5/5 AGENTS SYNAPSED
          </span>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-72 cursor-grab active:cursor-grabbing" />

      {/* Interactive Bottom Roster Grid */}
      <div className="grid grid-cols-5 gap-1.5 p-2.5 bg-black/60 border-t border-white/[0.08] text-[10px] font-mono">
        {AGENT_NODES.map((node) => {
          const isHovered = hoveredNode?.id === node.id || activeNodeId === node.id;
          return (
            <button
              key={node.id}
              onClick={() => {
                setActiveNodeId(node.id);
                if (onSelectAgent) onSelectAgent(node.id);
              }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer border ${
                isHovered
                  ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] hover:border-cyan-400/40'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.hex }} />
                <span className="font-bold text-slate-200 truncate">{node.name.split('-')[0]}</span>
              </div>
              <span className="text-[8px] text-slate-400 truncate max-w-full">{node.role.split('&')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
