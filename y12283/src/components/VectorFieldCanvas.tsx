import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StreamlineData, Vector3 as Vector3Type } from '../types';

interface VectorFieldCanvasProps {
  streamlines: StreamlineData[];
  seedPoints: { id: string; position: Vector3Type }[];
  onScreenshot?: (dataUrl: string) => void;
}

const NORMAL_COLOR = 0x00d4ff;
const EXPLOSION_COLOR = 0xff3366;
const SEED_POINT_COLOR = 0x00ff88;
const GRID_COLOR = 0x1a3a5c;
const BOUNDARY_COLOR = 0xffaa00;

const VectorFieldCanvas: React.FC<VectorFieldCanvasProps> = ({
  streamlines,
  seedPoints,
  onScreenshot,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const streamlineMeshesRef = useRef<THREE.Line[]>([]);
  const seedPointMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number>(0);

  const takeScreenshot = useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      onScreenshot?.(dataUrl);
    }
  }, [onScreenshot]);

  useEffect(() => {
    (window as unknown as { takeVectorFieldScreenshot: () => void }).takeVectorFieldScreenshot = takeScreenshot;
    return () => {
      delete (window as unknown as { takeVectorFieldScreenshot?: () => void }).takeVectorFieldScreenshot;
    };
  }, [takeScreenshot]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 15, 35);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(12, 10, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    const gridHelper = new THREE.GridHelper(20, 20, GRID_COLOR, GRID_COLOR);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(11);
    scene.add(axesHelper);

    const boundaryGeometry = new THREE.BoxGeometry(20, 20, 20);
    const boundaryEdges = new THREE.EdgesGeometry(boundaryGeometry);
    const boundaryLine = new THREE.LineSegments(
      boundaryEdges,
      new THREE.LineBasicMaterial({ color: BOUNDARY_COLOR, transparent: true, opacity: 0.3 })
    );
    scene.add(boundaryLine);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00d4ff, 1, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    streamlineMeshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    streamlineMeshesRef.current = [];

    streamlines.forEach((streamline) => {
      const points = streamline.points.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      );

      const normalGeometry = new THREE.BufferGeometry();
      const normalPositions: number[] = [];
      const explosionSegments: Map<number, number[]> = new Map();

      streamline.explosionRegions.forEach((region) => {
        explosionSegments.set(region.startIndex, [
          region.startIndex,
          region.endIndex,
        ]);
      });

      let inExplosion = false;
      let explosionStartIdx = -1;

      for (let i = 0; i < points.length - 1; i++) {
        const isExplosionStart = explosionSegments.has(i);
        if (isExplosionStart && !inExplosion) {
          inExplosion = true;
          explosionStartIdx = i;
        }

        if (!inExplosion) {
          normalPositions.push(
            points[i].x,
            points[i].y,
            points[i].z,
            points[i + 1].x,
            points[i + 1].y,
            points[i + 1].z
          );
        }

        if (inExplosion) {
          const segment = explosionSegments.get(explosionStartIdx);
          if (segment && i >= segment[1] - 1) {
            const explosionPoints = points.slice(explosionStartIdx, segment[1] + 1);
            const explosionGeometry = new THREE.BufferGeometry();
            const explosionPositions: number[] = [];
            for (let j = 0; j < explosionPoints.length - 1; j++) {
              explosionPositions.push(
                explosionPoints[j].x,
                explosionPoints[j].y,
                explosionPoints[j].z,
                explosionPoints[j + 1].x,
                explosionPoints[j + 1].y,
                explosionPoints[j + 1].z
              );
            }
            explosionGeometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(explosionPositions, 3)
            );
            const explosionLine = new THREE.LineSegments(
              explosionGeometry,
              new THREE.LineBasicMaterial({
                color: EXPLOSION_COLOR,
                linewidth: 3,
              })
            );
            sceneRef.current?.add(explosionLine);
            streamlineMeshesRef.current.push(explosionLine);
            inExplosion = false;
            explosionStartIdx = -1;
          }
        }
      }

      if (normalPositions.length > 0) {
        normalGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(normalPositions, 3)
        );
        const normalLine = new THREE.LineSegments(
          normalGeometry,
          new THREE.LineBasicMaterial({ color: NORMAL_COLOR, linewidth: 2 })
        );
        sceneRef.current?.add(normalLine);
        streamlineMeshesRef.current.push(normalLine);
      }
    });
  }, [streamlines]);

  useEffect(() => {
    if (!sceneRef.current) return;

    seedPointMeshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    seedPointMeshesRef.current = [];

    seedPoints.forEach((seed) => {
      const geometry = new THREE.SphereGeometry(0.25, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: SEED_POINT_COLOR });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(seed.position.x, seed.position.y, seed.position.z);
      sceneRef.current?.add(sphere);
      seedPointMeshesRef.current.push(sphere);

      const ringGeometry = new THREE.RingGeometry(0.3, 0.4, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: SEED_POINT_COLOR,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(seed.position.x, seed.position.y, seed.position.z);
      ring.lookAt(cameraRef.current?.position || new THREE.Vector3(0, 0, 0));
      sceneRef.current?.add(ring);
      seedPointMeshesRef.current.push(ring);
    });
  }, [seedPoints]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default VectorFieldCanvas;
