import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CrossSectionData } from '@/types';

interface PointCloud3DViewerProps {
  crossSection: CrossSectionData;
  collisionRisk?: 'low' | 'medium' | 'high';
  height?: string;
}

export default function PointCloud3DViewer({
  crossSection,
  collisionRisk = 'low',
  height = '400px',
}: PointCloud3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.5, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const heightNum = parseFloat(height);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1f3a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / heightNum, 0.1, 1000);
    camera.position.set(0, 0, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightNum);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(10, 20, 0x3761bc, 0x1a365d);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    const onResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / heightNum;
      camera.updateProjectionMatrix();
      renderer.setSize(w, heightNum);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationRef.current);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [height]);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      (pointsRef.current.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(crossSection.points.length * 3);
    const colors = new Float32Array(crossSection.points.length * 3);

    const colorMap = {
      low: { r: 0.22, g: 0.63, b: 0.41 },
      medium: { r: 0.87, g: 0.42, b: 0.13 },
      high: { r: 0.94, g: 0.27, b: 0.27 },
    };
    const baseColor = colorMap[collisionRisk];

    crossSection.points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const intensity = point.intensity ?? 0.7;
      colors[i * 3] = baseColor.r * (0.6 + intensity * 0.4);
      colors[i * 3 + 1] = baseColor.g * (0.6 + intensity * 0.4);
      colors[i * 3 + 2] = baseColor.b * (0.6 + intensity * 0.4);
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    sceneRef.current.add(points);
    pointsRef.current = points;
  }, [crossSection, collisionRisk]);

  useEffect(() => {
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (pointsRef.current && !isDraggingRef.current) {
        rotationRef.current.y += 0.003;
      }

      if (pointsRef.current) {
        pointsRef.current.rotation.x = rotationRef.current.x;
        pointsRef.current.rotation.y = rotationRef.current.y;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;
    rotationRef.current.y += deltaX * 0.01;
    rotationRef.current.x += deltaY * 0.01;
    rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const delta = e.deltaY * 0.01;
    cameraRef.current.position.z = Math.max(3, Math.min(20, cameraRef.current.position.z + delta));
  };

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing bg-tech-gray-900/40 border border-white/10"
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
