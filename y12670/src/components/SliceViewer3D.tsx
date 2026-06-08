import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SliceData } from '@/types';

interface SliceViewer3DProps {
  slices: SliceData[];
  selectedSliceId?: string | null;
  expectedRange?: { min: number; max: number };
  onViewChange?: (position: [number, number, number], target: [number, number, number]) => void;
  onSliceClick?: (sliceId: string) => void;
  initialView?: { position: [number, number, number]; target: [number, number, number] };
}

const SliceViewer3D: React.FC<SliceViewer3DProps> = ({
  slices,
  selectedSliceId,
  expectedRange = { min: 0, max: 1 },
  onViewChange,
  onSliceClick,
  initialView,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const sliceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const lastViewRef = useRef<{ position: [number, number, number]; target: [number, number, number] } | null>(null);

  const getSliceColor = (value: number, depth: number, maxDepth: number, isOutOfBounds: boolean): THREE.Color => {
    if (isOutOfBounds) {
      return new THREE.Color(1.0, 0.2, 0.2);
    }
    const t = depth / Math.max(maxDepth, 0.001);
    const r = 0.15 + t * 0.4 + value * 0.25;
    const g = 0.35 + (1 - t) * 0.35 + value * 0.2;
    const b = 0.75 + value * 0.2;
    return new THREE.Color(
      Math.min(1, Math.max(0, r)),
      Math.min(1, Math.max(0, g)),
      Math.min(1, Math.max(0, b))
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(3);
    (axesHelper as any).position.set(-4.5, 0.05, -4.5);
    scene.add(axesHelper);

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const meshes = Array.from(sliceMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const sliceId = mesh.userData.sliceId as string;
        if (sliceId && onSliceClick) {
          onSliceClick(sliceId);
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();

      if (onViewChange && cameraRef.current && controlsRef.current) {
        const pos: [number, number, number] = [
          cameraRef.current.position.x,
          cameraRef.current.position.y,
          cameraRef.current.position.z,
        ];
        const tgt: [number, number, number] = [
          controlsRef.current.target.x,
          controlsRef.current.target.y,
          controlsRef.current.target.z,
        ];
        const changed =
          !lastViewRef.current ||
          lastViewRef.current.position.some((v, i) => Math.abs(v - pos[i]) > 0.01) ||
          lastViewRef.current.target.some((v, i) => Math.abs(v - tgt[i]) > 0.01);
        if (changed) {
          lastViewRef.current = { position: pos, target: tgt };
          onViewChange(pos, tgt);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    sliceMeshesRef.current.forEach((mesh) => {
      sceneRef.current!.remove(mesh);
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    });
    sliceMeshesRef.current.clear();

    const maxDepth = slices.length > 0 ? slices[slices.length - 1].depth : 1;
    const spacing = 1;

    slices.forEach((slice, sliceIndex) => {
      const planeSize = 4;
      const resolution = slice.data.length;
      if (resolution < 2) return;

      const geometry = new THREE.PlaneGeometry(
        planeSize,
        planeSize,
        resolution - 1,
        resolution - 1
      );
      const positions = geometry.attributes.position;
      const colors: number[] = [];
      const range = expectedRange || { min: 0, max: 1 };

      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const idx = y * resolution + x;
          const value = slice.data[y]?.[x] ?? 0;
          const height = (typeof value === 'number' ? value : 0) * 0.5;
          positions.setZ(idx, height);

          const isOOB =
            typeof value !== 'number' ||
            isNaN(value) ||
            value < range.min ||
            value > range.max;
          const color = getSliceColor(
            typeof value === 'number' && !isNaN(value) ? Math.max(0, Math.min(1, value)) : 0,
            slice.depth,
            maxDepth,
            isOOB
          );
          colors.push(color.r, color.g, color.b);
        }
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const isSelected = selectedSliceId === slice.id;
      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 25,
        transparent: true,
        opacity: isSelected ? 1.0 : 0.82,
        emissive: isSelected ? new THREE.Color(0x1e40af) : new THREE.Color(0x000000),
        emissiveIntensity: isSelected ? 0.35 : 0,
      });

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: isSelected ? 0x60a5fa : 0x475569,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.25,
      });
      const lineSegments = new THREE.LineSegments(edges, lineMaterial);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.add(lineSegments);
      mesh.position.z = sliceIndex * spacing - (slices.length - 1) * spacing / 2;
      mesh.rotation.x = -Math.PI / 2;
      mesh.userData.type = 'slice';
      mesh.userData.sliceId = slice.id;
      mesh.userData.sliceIndex = sliceIndex;

      sliceMeshesRef.current.set(slice.id, mesh);
      sceneRef.current!.add(mesh);
    });
  }, [slices, selectedSliceId, expectedRange]);

  useEffect(() => {
    if (initialView && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...initialView.position);
      controlsRef.current.target.set(...initialView.target);
      controlsRef.current.update();
    }
  }, [initialView]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default SliceViewer3D;
