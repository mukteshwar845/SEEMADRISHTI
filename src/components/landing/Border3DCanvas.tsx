import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Border3DCanvasProps {
  className?: string;
  threatLevel?: 'nominal' | 'elevated' | 'critical';
}

export const Border3DCanvas: React.FC<Border3DCanvasProps> = ({
  className = '',
  threatLevel = 'nominal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Atmosphere Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020611, 0.02);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 14, 28);
    camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x02040a, 0);
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x0a192f, 1.8);
    scene.add(ambientLight);

    const primaryLight = new THREE.PointLight(0x00f0ff, 4, 60);
    primaryLight.position.set(0, 20, 10);
    scene.add(primaryLight);

    const perimeterLight = new THREE.PointLight(
      threatLevel === 'critical' ? 0xff0055 : threatLevel === 'elevated' ? 0xf59e0b : 0x00ff66,
      3,
      50
    );
    perimeterLight.position.set(0, 6, 0);
    scene.add(perimeterLight);

    // Group for all rotating tactical objects
    const tacticalGroup = new THREE.Group();
    scene.add(tacticalGroup);

    // 5. Border Terrain Elevation Grid (Holographic Wireframe Topography)
    const gridSegments = 50;
    const terrainGeo = new THREE.PlaneGeometry(64, 64, gridSegments, gridSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    // Apply gentle topographic undulating elevation wave
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Create ridge lines & valley simulating mountain passes and perimeter line
      const elevation =
        Math.sin(x * 0.15) * 1.5 +
        Math.cos(z * 0.12) * 1.8 +
        Math.sin((x + z) * 0.08) * 1.2;
      pos.setY(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0x004866,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -2.5;
    tacticalGroup.add(terrain);

    // 6. Perimeter Tripwire & Boundary Fence Line
    const fenceLength = 48;
    const fenceCurvePoints = [];
    for (let i = -fenceLength / 2; i <= fenceLength / 2; i += 3) {
      const curveY = Math.sin(i * 0.1) * 0.6;
      fenceCurvePoints.push(new THREE.Vector3(i, curveY, 0));
    }
    const fenceCurve = new THREE.CatmullRomCurve3(fenceCurvePoints);
    const fenceGeo = new THREE.TubeGeometry(fenceCurve, 64, 0.08, 8, false);
    const fenceMat = new THREE.MeshBasicMaterial({
      color: threatLevel === 'critical' ? 0xff0055 : 0x00f0ff,
      transparent: true,
      opacity: 0.9,
    });
    const fenceLine = new THREE.Mesh(fenceGeo, fenceMat);
    tacticalGroup.add(fenceLine);

    // Tripwire laser glow above fence
    const laserPoints = fenceCurvePoints.map((p) => new THREE.Vector3(p.x, p.y + 1.2, p.z));
    const laserCurve = new THREE.CatmullRomCurve3(laserPoints);
    const laserGeo = new THREE.TubeGeometry(laserCurve, 64, 0.04, 8, false);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.85,
    });
    const laserLine = new THREE.Mesh(laserGeo, laserMat);
    tacticalGroup.add(laserLine);

    // 7. Tactical Surveillance Sensor Towers along the Perimeter
    const towerGeo = new THREE.CylinderGeometry(0.2, 0.5, 3.8, 6);
    const towerHeadGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x0f2744,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true,
    });
    const towerHeadMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: false,
    });

    const towerCount = 7;
    const towers: THREE.Group[] = [];
    const towerSpacing = fenceLength / (towerCount - 1);

    for (let i = 0; i < towerCount; i++) {
      const towerGroup = new THREE.Group();
      const towerBase = new THREE.Mesh(towerGeo, towerMat);
      const towerHead = new THREE.Mesh(towerHeadGeo, towerHeadMat);
      towerHead.position.y = 2.1;

      // Pulse ring on top of each sensor tower
      const ringGeo = new THREE.RingGeometry(0.8, 0.9, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const pulseRing = new THREE.Mesh(ringGeo, ringMat);
      pulseRing.rotation.x = Math.PI / 2;
      pulseRing.position.y = 2.1;

      towerGroup.add(towerBase);
      towerGroup.add(towerHead);
      towerGroup.add(pulseRing);

      const xPos = -fenceLength / 2 + i * towerSpacing;
      towerGroup.position.set(xPos, 0, 0);
      towers.push(towerGroup);
      tacticalGroup.add(towerGroup);
    }

    // 8. 360° Rotating Radar Sweep Cone
    const radarGeo = new THREE.ConeGeometry(18, 0.4, 64, 1, true, 0, Math.PI / 4);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const radarBeam = new THREE.Mesh(radarGeo, radarMat);
    radarBeam.rotation.x = Math.PI / 2;
    radarBeam.position.y = 0.5;
    tacticalGroup.add(radarBeam);

    // Radar Concentric Range Rings
    [6, 12, 18, 24].forEach((radius) => {
      const circleGeo = new THREE.RingGeometry(radius - 0.04, radius, 64);
      const circleMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.16,
      });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.rotation.x = Math.PI / 2;
      circle.position.y = -0.2;
      tacticalGroup.add(circle);
    });

    // 9. Patrolling UAV Drone Trajectory Rings & Quadcopter Nodes
    const uavOrbitGeo = new THREE.RingGeometry(14.8, 15.0, 64);
    const uavOrbitMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const uavOrbit = new THREE.Mesh(uavOrbitGeo, uavOrbitMat);
    uavOrbit.rotation.x = Math.PI / 3;
    uavOrbit.rotation.y = 0.2;
    uavOrbit.position.y = 6;
    tacticalGroup.add(uavOrbit);

    // Active UAV Drones (Moving nodes on orbit)
    const droneGeo = new THREE.OctahedronGeometry(0.45, 0);
    const droneMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      wireframe: true,
    });
    const droneMesh1 = new THREE.Mesh(droneGeo, droneMat);
    const droneMesh2 = new THREE.Mesh(droneGeo, droneMat.clone());
    tacticalGroup.add(droneMesh1);
    tacticalGroup.add(droneMesh2);

    // 10. Intrusion Detection Blips (Pulsing holographic targets)
    const blipGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const blipMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.9,
    });
    const targetBlip1 = new THREE.Mesh(blipGeo, blipMat);
    targetBlip1.position.set(-6, 0.4, 4);
    tacticalGroup.add(targetBlip1);

    const targetBlip2 = new THREE.Mesh(
      blipGeo,
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 })
    );
    targetBlip2.position.set(12, 0.4, -6);
    tacticalGroup.add(targetBlip2);

    // 11. Subtle Mouse Parallax Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRotationY = mouseX * 0.35;
      targetRotationX = mouseY * 0.2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 12. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slow tactical orbit rotation
      tacticalGroup.rotation.y += 0.0018;

      // Smooth mouse parallax lerp
      tacticalGroup.rotation.y += (targetRotationY - tacticalGroup.rotation.y * 0.1) * 0.01;
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.03;
      camera.position.y += (14 - mouseY * 2 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Rotate radar beam
      radarBeam.rotation.z -= 0.035;

      // Animate UAV Drone Flight around orbit
      const droneAngle1 = elapsedTime * 0.75;
      droneMesh1.position.set(
        Math.cos(droneAngle1) * 15,
        6 + Math.sin(droneAngle1 * 2) * 1.5,
        Math.sin(droneAngle1) * 12
      );
      droneMesh1.rotation.y += 0.05;

      const droneAngle2 = elapsedTime * 0.75 + Math.PI;
      droneMesh2.position.set(
        Math.cos(droneAngle2) * 15,
        6 + Math.sin(droneAngle2 * 2) * 1.5,
        Math.sin(droneAngle2) * 12
      );
      droneMesh2.rotation.y += 0.05;

      // Pulse tower lights
      towers.forEach((tw, index) => {
        const ring = tw.children[2] as THREE.Mesh;
        if (ring) {
          const scale = 1 + Math.sin(elapsedTime * 3 + index) * 0.3;
          ring.scale.set(scale, scale, 1);
        }
      });

      // Pulse intrusion blips
      const blipScale = 1 + Math.sin(elapsedTime * 6) * 0.4;
      targetBlip1.scale.set(blipScale, blipScale, blipScale);
      targetBlip2.scale.set(blipScale, blipScale, blipScale);

      renderer.render(scene, camera);
    };

    animate();

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
    };
  }, [threatLevel]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden pointer-events-auto select-none ${className}`}
    />
  );
};
