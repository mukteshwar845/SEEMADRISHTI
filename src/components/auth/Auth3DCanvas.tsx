import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Auth3DCanvasProps {
  className?: string;
  theme?: 'dark' | 'daylight';
  accentColor?: string;
}

export const Auth3DCanvas: React.FC<Auth3DCanvasProps> = ({
  className = '',
  accentColor = '#00f0ff',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.025);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 9);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x02040a, 1);
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x002233, 1.5);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x00f0ff, 4, 30);
    pointLightCyan.position.set(5, 6, 5);
    scene.add(pointLightCyan);

    const pointLightPurple = new THREE.PointLight(0xec4899, 3, 30);
    pointLightPurple.position.set(-6, -4, 4);
    scene.add(pointLightPurple);

    // 5. Holographic Globe / Radar Sphere Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Inner wireframe sphere
    const sphereGeo = new THREE.SphereGeometry(3.2, 32, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const innerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(innerSphere);

    // Latitude / Longitude Tactical Rings
    const ringGeo = new THREE.RingGeometry(3.6, 3.65, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    globeGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring2.rotation.x = Math.PI / 4;
    globeGroup.add(ring2);

    const ring3 = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.24, 64),
      new THREE.MeshBasicMaterial({
        color: 0xec4899,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25,
      })
    );
    ring3.rotation.y = Math.PI / 3;
    globeGroup.add(ring3);

    // 6. Surveillance Radar Scan Beam
    const radarBeamGeo = new THREE.ConeGeometry(3.8, 4.5, 32, 1, true);
    const radarBeamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const radarBeam = new THREE.Mesh(radarBeamGeo, radarBeamMat);
    radarBeam.position.set(0, 0, 0);
    radarBeam.rotation.x = Math.PI / 2;
    globeGroup.add(radarBeam);

    // 7. Tactical Nodes / Surveillance Camera Points on Sphere
    const nodeCount = 36;
    const nodePositions: THREE.Vector3[] = [];
    const nodeGroup = new THREE.Group();
    globeGroup.add(nodeGroup);

    const nodeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const nodeMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const nodeMatRed = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const radius = 3.2;

      const pos = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );
      nodePositions.push(pos);

      const nodeMesh = new THREE.Mesh(nodeGeo, i % 7 === 0 ? nodeMatRed : nodeMatCyan);
      nodeMesh.position.copy(pos);
      nodeGroup.add(nodeMesh);
    }

    // Connect node arcs with line segments
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.2,
    });
    const lineGeo = new THREE.BufferGeometry();
    const lineCoords: number[] = [];

    for (let i = 0; i < nodePositions.length; i++) {
      const nextIdx = (i + 3) % nodePositions.length;
      lineCoords.push(
        nodePositions[i].x,
        nodePositions[i].y,
        nodePositions[i].z,
        nodePositions[nextIdx].x,
        nodePositions[nextIdx].y,
        nodePositions[nextIdx].z
      );
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    globeGroup.add(lines);

    // 8. Cyber Floating Particle Grid / Starfield
    const particlesCount = 450;
    const particlePositions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 35;
      particlePositions[i + 1] = (Math.random() - 0.5) * 35;
      particlePositions[i + 2] = (Math.random() - 0.5) * 35;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.045,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // 9. Floating Cyber Ground Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x00f0ff, 0x072635);
    gridHelper.position.y = -3.8;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.35;
    scene.add(gridHelper);

    // 10. Mouse interaction tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX = (event.clientX / innerWidth) * 2 - 1;
      mouseY = -(event.clientY / innerHeight) * 2 + 1;
      targetRotationY = mouseX * 0.4;
      targetRotationX = mouseY * 0.2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 11. Responsive resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 12. Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous rotation
      globeGroup.rotation.y += 0.0035;
      globeGroup.rotation.x = THREE.MathUtils.lerp(globeGroup.rotation.x, targetRotationX, 0.05);
      globeGroup.rotation.z = THREE.MathUtils.lerp(globeGroup.rotation.z, -targetRotationY * 0.5, 0.05);

      // Radar scan rotation
      radarBeam.rotation.z = elapsedTime * 1.5;

      // Particle subtle drifting
      particles.rotation.y = elapsedTime * 0.02;
      gridHelper.rotation.y = Math.sin(elapsedTime * 0.1) * 0.02;

      // Pulsing lights
      pointLightCyan.intensity = 3.5 + Math.sin(elapsedTime * 2) * 1.2;

      renderer.render(scene, camera);
    };

    animate();

    // 13. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [accentColor]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};
