import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  PointCloudData, TrajectoryPoint, LineOfSightResult, MeasurementResult, DisasterAnalytics
} from '../types/api';

interface DigitalTwinViewerProps {
  pointCloud: PointCloudData | null;
  trajectory: TrajectoryPoint[];
  showPointCloud: boolean;
  showMesh: boolean;
  showWireframe: boolean;
  showTrajectory: boolean;
  showDisasterLayer: boolean;
  colorMode: 'RGB' | 'HEIGHT' | 'CONFIDENCE' | 'SEMANTIC';
  pointSize: number;
  showFog: boolean;
  losResult: LineOfSightResult | null;
  measurementResult: MeasurementResult | null;
  selectedPoints: [number, number, number][];
  onPointClick?: (point: [number, number, number]) => void;
  isPickingPoint?: boolean;
  cameraPreset?: 'TOP' | 'ISO' | 'FRONT' | 'RESET' | null;
  focusTarget?: [number, number, number] | null;
  isAutoRotating?: boolean;
  disasterData?: DisasterAnalytics | null;
}

export const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({
  pointCloud,
  trajectory,
  showPointCloud,
  showMesh,
  showWireframe,
  showTrajectory,
  showDisasterLayer,
  colorMode,
  pointSize,
  showFog,
  losResult,
  measurementResult,
  selectedPoints,
  onPointClick,
  isPickingPoint = false,
  cameraPreset = null,
  focusTarget = null,
  isAutoRotating = false,
  disasterData = null
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pointsMeshRef = useRef<THREE.Points | null>(null);
  const surfaceMeshRef = useRef<THREE.Mesh | null>(null);
  const trajLineRef = useRef<THREE.Line | null>(null);
  const frustumsGroupRef = useRef<THREE.Group | null>(null);
  const losLineRef = useRef<THREE.Line | null>(null);
  const losCollisionMarkerRef = useRef<THREE.Mesh | null>(null);
  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const disasterGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  // 1. Initialize Three.js Scene, Camera, Lighting & Controls
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    if (showFog) {
      scene.fog = new THREE.FogExp2(0x030712, 0.008);
    }
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 40, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controlsRef.current = controls;

    // Cinematic Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.4);
    dirLight1.position.set(30, 60, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x6366f1, 0.9);
    dirLight2.position.set(-30, 30, -30);
    scene.add(dirLight2);

    // High-Tech Ground Grid
    const grid = new THREE.GridHelper(140, 70, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.05;
    scene.add(grid);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render Loop with Auto-Orbit
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        if (isAutoRotating) {
          controlsRef.current.autoRotate = true;
          controlsRef.current.autoRotateSpeed = 1.5;
        } else {
          controlsRef.current.autoRotate = false;
        }
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Fog Environment
  useEffect(() => {
    if (!sceneRef.current) return;
    if (showFog) {
      sceneRef.current.fog = new THREE.FogExp2(0x030712, 0.008);
    } else {
      sceneRef.current.fog = null;
    }
  }, [showFog]);

  // Update Point Cloud Particles & Surface Mesh
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pointsMeshRef.current) {
      scene.remove(pointsMeshRef.current);
      pointsMeshRef.current.geometry.dispose();
      pointsMeshRef.current = null;
    }
    if (surfaceMeshRef.current) {
      scene.remove(surfaceMeshRef.current);
      surfaceMeshRef.current.geometry.dispose();
      surfaceMeshRef.current = null;
    }

    if (pointCloud && pointCloud.points.length > 0) {
      const numPts = pointCloud.points.length;
      const positions = new Float32Array(numPts * 3);
      const colors = new Float32Array(numPts * 3);

      let minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < numPts; i++) {
        const y = pointCloud.points[i][2];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const heightRange = Math.max(1e-3, maxY - minY);

      for (let i = 0; i < numPts; i++) {
        const p = pointCloud.points[i];
        const rgb = pointCloud.colors[i];
        const conf = pointCloud.confidences[i] || 0.8;

        positions[i * 3] = p[0];
        positions[i * 3 + 1] = p[2];
        positions[i * 3 + 2] = -p[1];

        let r = rgb[0], g = rgb[1], b = rgb[2];

        if (colorMode === 'HEIGHT') {
          const normH = (p[2] - minY) / heightRange;
          r = Math.sin(normH * Math.PI * 1.5);
          g = Math.sin(normH * Math.PI);
          b = Math.cos(normH * Math.PI * 0.5);
        } else if (colorMode === 'CONFIDENCE') {
          if (conf > 0.8) { r = 0.06; g = 0.71; b = 0.50; }
          else if (conf > 0.5) { r = 0.96; g = 0.62; b = 0.04; }
          else { r = 0.95; g = 0.25; b = 0.37; }
        } else if (colorMode === 'SEMANTIC') {
          // Class based color simulation (Buildings: cyan, Roads: indigo, Vegetation: emerald, Terrain: slate)
          if (p[2] > 6.0) { r = 0.02; g = 0.71; b = 0.83; } // Building
          else if (p[2] < 1.0) { r = 0.38; g = 0.40; b = 0.94; } // Road
          else { r = 0.06; g = 0.72; b = 0.50; } // Vegetation
        }

        colors[i * 3] = Math.max(0, Math.min(1, r));
        colors[i * 3 + 1] = Math.max(0, Math.min(1, g));
        colors[i * 3 + 2] = Math.max(0, Math.min(1, b));
      }

      // 1. Render Point Cloud
      if (showPointCloud) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: pointSize,
          vertexColors: true,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9
        });

        const ptsMesh = new THREE.Points(geometry, material);
        scene.add(ptsMesh);
        pointsMeshRef.current = ptsMesh;
      }

      // 2. Render Poisson Surface Mesh (Delaunay triangulation approximation)
      if (showMesh) {
        const meshGeo = new THREE.BufferGeometry();
        meshGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        meshGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Generate synthetic face indices for demo mesh representation
        const indices: number[] = [];
        for (let i = 0; i < numPts - 2; i += 3) {
          indices.push(i, i + 1, i + 2);
        }
        meshGeo.setIndex(indices);
        meshGeo.computeVertexNormals();

        const meshMat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          wireframe: showWireframe,
          roughness: 0.4,
          metalness: 0.1,
          side: THREE.DoubleSide
        });

        const sMesh = new THREE.Mesh(meshGeo, meshMat);
        scene.add(sMesh);
        surfaceMeshRef.current = sMesh;
      }
    }
  }, [pointCloud, showPointCloud, showMesh, showWireframe, colorMode, pointSize]);

  // Update Trajectory & Frustum Pyramids
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (trajLineRef.current) {
      scene.remove(trajLineRef.current);
      trajLineRef.current.geometry.dispose();
      trajLineRef.current = null;
    }
    if (frustumsGroupRef.current) {
      scene.remove(frustumsGroupRef.current);
      frustumsGroupRef.current = null;
    }

    if (showTrajectory && trajectory.length > 0) {
      const points: THREE.Vector3[] = trajectory.map(
        pt => new THREE.Vector3(pt.x, pt.z + 8, -pt.y)
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 3 });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      trajLineRef.current = line;

      const frustumGroup = new THREE.Group();
      points.forEach((pos, idx) => {
        if (idx % 3 === 0) {
          const coneGeo = new THREE.ConeGeometry(0.8, 1.5, 4);
          const coneMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true });
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.copy(pos);
          cone.rotation.x = Math.PI;
          frustumGroup.add(cone);
        }
      });
      scene.add(frustumGroup);
      frustumsGroupRef.current = frustumGroup;
    }
  }, [trajectory, showTrajectory]);

  // Update Line-Of-Sight Ray & Collision Markers
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (losLineRef.current) {
      scene.remove(losLineRef.current);
      losLineRef.current = null;
    }
    if (losCollisionMarkerRef.current) {
      scene.remove(losCollisionMarkerRef.current);
      losCollisionMarkerRef.current = null;
    }

    if (losResult) {
      const obs = losResult.observer;
      const tgt = losResult.target;
      const pts = [
        new THREE.Vector3(obs[0], obs[2], -obs[1]),
        new THREE.Vector3(tgt[0], tgt[2], -tgt[1])
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(pts);
      const color = losResult.status === 'CLEAR' ? 0x10b981 : 0xf43f5e;
      const material = new THREE.LineDashedMaterial({ color, dashSize: 0.8, gapSize: 0.3 });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      scene.add(line);
      losLineRef.current = line;

      if (losResult.obstruction) {
        const obsPt = losResult.obstruction.point;
        const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, wireframe: true });
        const marker = new THREE.Mesh(sphereGeo, sphereMat);
        marker.position.set(obsPt[0], obsPt[2], -obsPt[1]);
        scene.add(marker);
        losCollisionMarkerRef.current = marker;
      }
    }
  }, [losResult]);

  // Update 3D Measurement Visual Markers (Selected Points & Vectors)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (measurementGroupRef.current) {
      scene.remove(measurementGroupRef.current);
      measurementGroupRef.current = null;
    }

    if (selectedPoints.length > 0) {
      const mGroup = new THREE.Group();

      selectedPoints.forEach((pt, idx) => {
        const sphereGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: idx === 0 ? 0x06b6d4 : 0x6366f1,
          wireframe: true
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(pt[0], pt[2], -pt[1]);
        mGroup.add(sphere);
      });

      if (selectedPoints.length === 2) {
        const p1 = new THREE.Vector3(selectedPoints[0][0], selectedPoints[0][2], -selectedPoints[0][1]);
        const p2 = new THREE.Vector3(selectedPoints[1][0], selectedPoints[1][2], -selectedPoints[1][1]);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const lineColor = measurementResult?.type === 'DISTANCE_3D' ? 0x10b981 : 0x06b6d4;
        const lineMat = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 3 });
        const line = new THREE.Line(lineGeo, lineMat);
        mGroup.add(line);
      }

      scene.add(mGroup);
      measurementGroupRef.current = mGroup;
    }
  }, [selectedPoints, measurementResult]);

  // Update Disaster Response 3D Hazards & Warnings
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (disasterGroupRef.current) {
      scene.remove(disasterGroupRef.current);
      disasterGroupRef.current = null;
    }

    if (showDisasterLayer) {
      const dGroup = new THREE.Group();

      const damagedLocs: [number, number, number][] = disasterData?.damaged_structures
        ? disasterData.damaged_structures.map((d) => d.location)
        : [
            [5.2, 18.4, 12.0],
            [-14.5, 32.1, 8.5]
          ];

      damagedLocs.forEach((loc) => {
        const boxGeo = new THREE.BoxGeometry(10, loc[2], 10);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, wireframe: true });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(loc[0], loc[2] / 2, -loc[1]);
        dGroup.add(box);

        const beaconGeo = new THREE.SphereGeometry(1.5, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(loc[0], loc[2] + 2, -loc[1]);
        dGroup.add(beacon);
      });

      scene.add(dGroup);
      disasterGroupRef.current = dGroup;
    }
  }, [showDisasterLayer, disasterData]);

  // Handle Camera Presets & Focus Animations
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (cameraPreset === 'TOP') {
      cameraRef.current.position.set(0, 90, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (cameraPreset === 'ISO') {
      cameraRef.current.position.set(40, 40, 40);
      controlsRef.current.target.set(0, 0, 0);
    } else if (cameraPreset === 'RESET') {
      cameraRef.current.position.set(0, 40, 50);
      controlsRef.current.target.set(0, 0, 0);
    }
    controlsRef.current.update();
  }, [cameraPreset]);

  useEffect(() => {
    if (focusTarget && cameraRef.current && controlsRef.current) {
      const [x, y, z] = focusTarget;
      cameraRef.current.position.set(x + 15, z + 15, -y + 15);
      controlsRef.current.target.set(x, z, -y);
      controlsRef.current.update();
    }
  }, [focusTarget]);

  // Handle Canvas Click Raycasting for Point Selection
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPickingPoint || !mountRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      if (onPointClick) {
        onPointClick([pt.x, -pt.z, pt.y]);
      }
    }
  };

  return (
    <div className="relative w-full h-full" onClick={handleCanvasClick}>
      <div
        ref={mountRef}
        className={`w-full h-full ${isPickingPoint ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Point Picker Active Badge */}
      {isPickingPoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-full border border-cyan-500/40 text-xs font-bold text-cyan-300 flex items-center gap-2 shadow-xl animate-pulse">
          <span>🎯 CLICK 3D POINT IN SCENE TO SELECT METRIC COORDINATES</span>
        </div>
      )}

      {/* Viewport Overlay Controls Guide */}
      <div className="absolute top-4 left-4 glass-card p-3 rounded-xl border border-white/10 text-xs text-slate-300 shadow-2xl space-y-1 backdrop-blur-md hidden sm:block">
        <div className="font-bold text-cyan-400 font-outfit">3D VIEWPORT NAVIGATION</div>
        <div>• Left Click + Drag: Rotate 3D Scene</div>
        <div>• Right Click + Drag: Pan Camera</div>
        <div>• Scroll Wheel: Zoom Perspective</div>
      </div>
    </div>
  );
};
