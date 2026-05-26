import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { IntegrationResult, SimulationParams } from '../types';
import { RayGenerator } from '../physics/RayGenerator';
import { screenshotExporter } from '../utils/screenshot';

interface Scene3DProps {
  params: SimulationParams;
  results: IntegrationResult[];
  isRunning: boolean;
}

export interface Scene3DHandle {
  getCanvas: () => HTMLCanvasElement | null;
  resetCamera: () => void;
}

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(({ params, results, isRunning }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number | null>(null);
  const blackHoleRef = useRef<THREE.Mesh | null>(null);
  const eventHorizonRef = useRef<THREE.Mesh | null>(null);
  const photonSphereRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const raysRef = useRef<THREE.Line[]>([]);
  const starsRef = useRef<THREE.Points | null>(null);
  const accretionDiskRef = useRef<THREE.Mesh | null>(null);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 50, 150);

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 10, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.autoRotate = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 100 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      color.setHSL(0.55 + Math.random() * 0.1, 0.5 + Math.random() * 0.3, 0.7 + Math.random() * 0.3);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    starsRef.current = stars;

    const blackHoleGeometry = new THREE.SphereGeometry(2, 32, 32);
    const blackHoleMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.FrontSide,
    });
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    scene.add(blackHole);
    blackHoleRef.current = blackHole;

    const diskGeometry = new THREE.RingGeometry(2.5, 8, 64);
    const diskMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    scene.add(accretionDisk);
    accretionDiskRef.current = accretionDisk;

    const eventHorizonGeometry = new THREE.SphereGeometry(2.2, 32, 32);
    const eventHorizonMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const eventHorizon = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
    scene.add(eventHorizon);
    eventHorizonRef.current = eventHorizon;

    const photonSphereGeometry = new THREE.SphereGeometry(3, 32, 32);
    const photonSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const photonSphere = new THREE.Mesh(photonSphereGeometry, photonSphereMaterial);
    scene.add(photonSphere);
    photonSphereRef.current = photonSphere;

    const grid = new THREE.GridHelper(40, 40, 0x1a1a3a, 0x0f0f2a);
    grid.position.y = -10;
    scene.add(grid);
    gridRef.current = grid;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    screenshotExporter.setCanvas(renderer.domElement);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();

      if (accretionDiskRef.current) {
        accretionDiskRef.current.rotation.z += 0.002;
      }

      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0001;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const updateBlackHoleVisualization = useCallback(() => {
    const mass = params.blackHoleMass;
    const scale = Math.min(Math.max(mass / 10, 0.5), 3);

    if (blackHoleRef.current) {
      blackHoleRef.current.scale.setScalar(scale);
    }

    if (eventHorizonRef.current) {
      eventHorizonRef.current.scale.setScalar(scale * 1.1);
      eventHorizonRef.current.visible = params.showEventHorizon;
    }

    if (photonSphereRef.current) {
      photonSphereRef.current.scale.setScalar(scale * 1.5);
      photonSphereRef.current.visible = params.showPhotonSphere;
    }

    if (accretionDiskRef.current) {
      accretionDiskRef.current.scale.set(scale * 1.25, 1, scale * 1.25);
    }

    if (gridRef.current) {
      gridRef.current.visible = params.showGrid;
    }
  }, [params.blackHoleMass, params.showEventHorizon, params.showPhotonSphere, params.showGrid]);

  const updateRayLines = useCallback(() => {
    if (!sceneRef.current) return;

    raysRef.current.forEach((ray) => {
      sceneRef.current?.remove(ray);
      ray.geometry.dispose();
      if (ray.material instanceof THREE.Material) {
        ray.material.dispose();
      }
    });
    raysRef.current = [];

    results.forEach((result, index) => {
      if (result.points.length < 2) return;

      const points = result.points.map(
        (p) => new THREE.Vector3(p[0], p[2], p[1])
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      let color: number;
      switch (result.status) {
        case 'absorbed':
          color = 0xff4757;
          break;
        case 'escaped':
          color = 0x2ed573;
          break;
        case 'error':
          color = 0xffa502;
          break;
        default:
          color = 0x00d4ff;
      }

      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      sceneRef.current?.add(line);
      raysRef.current.push(line);
    });
  }, [results]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => rendererRef.current?.domElement || null,
    resetCamera: () => {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(20, 10, 20);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.reset();
      }
    },
  }));

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  useEffect(() => {
    updateBlackHoleVisualization();
  }, [updateBlackHoleVisualization]);

  useEffect(() => {
    updateRayLines();
  }, [updateRayLines]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full canvas-container"
      onDoubleClick={() => {
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(20, 10, 20);
          cameraRef.current.lookAt(0, 0, 0);
          controlsRef.current.reset();
        }
      }}
    />
  );
});

Scene3D.displayName = 'Scene3D';

export default Scene3D;
