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

    // 1. Scene setup with volumetric atmospheric fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020512, 0.022);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.8, 9.5);

    // 3. WebGL Renderer with High Performance & Alpha
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020510, 1);
    container.appendChild(renderer.domElement);

    // 4. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x051829, 1.8);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x00f0ff, 5, 35);
    pointLightCyan.position.set(6, 7, 6);
    scene.add(pointLightCyan);

    const pointLightTeal = new THREE.PointLight(0x14b8a6, 4, 30);
    pointLightTeal.position.set(-6, -5, 5);
    scene.add(pointLightTeal);

    const pointLightViolet = new THREE.PointLight(0xa855f7, 2.5, 25);
    pointLightViolet.position.set(0, 8, -6);
    scene.add(pointLightViolet);

    // 5. Holographic Globe / Tactical Sphere Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Outer wireframe sphere
    const sphereGeo = new THREE.SphereGeometry(3.4, 40, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const innerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(innerSphere);

    // Inner subtle glowing core
    const coreGeo = new THREE.SphereGeometry(2.8, 28, 28);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreSphere);

    // Latitude / Longitude Tactical Rings
    const ringGeo1 = new THREE.RingGeometry(3.8, 3.86, 90);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    globeGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(4.1, 4.15, 90);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 3.2;
    ring2.rotation.y = 0.3;
    globeGroup.add(ring2);

    const ringGeo3 = new THREE.RingGeometry(4.5, 4.55, 90);
    const ringMat3 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.y = Math.PI / 2.6;
    globeGroup.add(ring3);

    // 6. Surveillance Radar Scan Beam
    const radarBeamGeo = new THREE.ConeGeometry(4.2, 5.5, 40, 1, true, 0, Math.PI / 2.5);
    const radarBeamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const radarBeam = new THREE.Mesh(radarBeamGeo, radarBeamMat);
    radarBeam.position.set(0, 0, 0);
    radarBeam.rotation.x = Math.PI / 2;
    globeGroup.add(radarBeam);

    // 7. Tactical Nodes / Surveillance Points on Sphere
    const nodeCount = 42;
    const nodePositions: THREE.Vector3[] = [];
    const nodeGroup = new THREE.Group();
    globeGroup.add(nodeGroup);

    const nodeGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const nodeMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const nodeMatTeal = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const nodeMatAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const nodeMatPink = new THREE.MeshBasicMaterial({ color: 0xec4899 });

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const radius = 3.3;

      const pos = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );
      nodePositions.push(pos);

      const mat =
        i % 9 === 0 ? nodeMatPink : i % 5 === 0 ? nodeMatAmber : i % 3 === 0 ? nodeMatTeal : nodeMatCyan;
      const nodeMesh = new THREE.Mesh(nodeGeo, mat);
      nodeMesh.position.copy(pos);
      nodeGroup.add(nodeMesh);
    }

    // Connect node arcs with line segments
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
    });
    const lineGeo = new THREE.BufferGeometry();
    const lineCoords: number[] = [];

    for (let i = 0; i < nodePositions.length; i++) {
      const nextIdx1 = (i + 2) % nodePositions.length;
      const nextIdx2 = (i + 5) % nodePositions.length;
      lineCoords.push(
        nodePositions[i].x,
        nodePositions[i].y,
        nodePositions[i].z,
        nodePositions[nextIdx1].x,
        nodePositions[nextIdx1].y,
        nodePositions[nextIdx1].z
      );
      lineCoords.push(
        nodePositions[i].x,
        nodePositions[i].y,
        nodePositions[i].z,
        nodePositions[nextIdx2].x,
        nodePositions[nextIdx2].y,
        nodePositions[nextIdx2].z
      );
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    globeGroup.add(lines);

    // 8. Cyber Floating Particle Field
    const particlesCount = 600;
    const particlePositions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 38;
      particlePositions[i + 1] = (Math.random() - 0.5) * 38;
      particlePositions[i + 2] = (Math.random() - 0.5) * 38;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // 9. Floating Cyber Ground Grid
    const gridHelper = new THREE.GridHelper(32, 32, 0x00f0ff, 0x092d42);
    gridHelper.position.y = -3.8;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    scene.add(gridHelper);

    // 10. Mouse interaction tracking for smooth parallax
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX = (event.clientX / innerWidth) * 2 - 1;
      mouseY = -(event.clientY / innerHeight) * 2 + 1;
      targetRotationY = mouseX * 0.35;
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
      globeGroup.rotation.y += 0.003;
      globeGroup.rotation.x = THREE.MathUtils.lerp(globeGroup.rotation.x, targetRotationX, 0.04);
      globeGroup.rotation.z = THREE.MathUtils.lerp(globeGroup.rotation.z, -targetRotationY * 0.4, 0.04);

      // Radar scan rotation
      radarBeam.rotation.z = elapsedTime * 1.4;

      // Particle subtle drifting
      particles.rotation.y = elapsedTime * 0.015;
      gridHelper.rotation.y = Math.sin(elapsedTime * 0.1) * 0.015;

      // Pulsing cyan rim light
      pointLightCyan.intensity = 4.0 + Math.sin(elapsedTime * 2.5) * 1.5;

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

