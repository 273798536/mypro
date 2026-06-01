import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioSegment, HighlightPoint, AnomalyDetail } from '../types';

interface Waterfall3DProps {
  segment: AudioSegment | null;
  highlights: HighlightPoint[];
  anomalies: AnomalyDetail[];
  onFrameSelect: (frameIndex: number, frequencyIndex?: number) => void;
  onAnomalySelect: (anomalyId: string) => void;
}

const Waterfall3D: React.FC<Waterfall3DProps> = ({
  segment,
  highlights,
  anomalies,
  onFrameSelect,
  onAnomalySelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const waterfallMeshRef = useRef<THREE.Mesh | null>(null);
  const highlightMeshesRef = useRef<THREE.Mesh[]>([]);
  const anomalyLineRef = useRef<THREE.Line | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationIdRef = useRef<number>(0);

  const getAmplitudeColor = useCallback((amplitude: number): THREE.Color => {
    const normalized = Math.min(Math.max(amplitude, 0), 1);
    const hue = (1 - normalized) * 0.65;
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  }, []);

  const createWaterfallGeometry = useCallback((seg: AudioSegment) => {
    const frameCount = seg.frames.length;
    const freqBins = seg.frequencyBins;
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const timeScale = 10;
    const freqScale = 8;
    const ampScale = 3;

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      const frame = seg.frames[frameIdx];
      const x = (frameIdx / (frameCount - 1) - 0.5) * timeScale;

      for (let freqIdx = 0; freqIdx < freqBins; freqIdx++) {
        const z = (freqIdx / (freqBins - 1) - 0.5) * freqScale;
        const amplitude = frame.amplitudes[freqIdx] || 0;
        const y = amplitude * ampScale;

        vertices.push(x, y, z);

        const color = getAmplitudeColor(amplitude);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let frameIdx = 0; frameIdx < frameCount - 1; frameIdx++) {
      for (let freqIdx = 0; freqIdx < freqBins - 1; freqIdx++) {
        const a = frameIdx * freqBins + freqIdx;
        const b = a + 1;
        const c = a + freqBins;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [getAmplitudeColor]);

  const createHighlightPoints = useCallback((
    points: HighlightPoint[],
    seg: AudioSegment
  ) => {
    const meshes: THREE.Mesh[] = [];
    const frameCount = seg.frames.length;
    const freqBins = seg.frequencyBins;
    const timeScale = 10;
    const freqScale = 8;
    const ampScale = 3;

    points.forEach((point) => {
      const x = (point.frameIndex / (frameCount - 1) - 0.5) * timeScale;
      const z = (point.frequencyIndex / (freqBins - 1) - 0.5) * freqScale;
      
      const frame = seg.frames[point.frameIndex];
      const amplitude = frame?.amplitudes[point.frequencyIndex] || 0;
      const y = amplitude * ampScale + 0.1;

      const geometry = new THREE.SphereGeometry(0.08, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: point.color || '#e94560',
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData = {
        frameIndex: point.frameIndex,
        frequencyIndex: point.frequencyIndex,
        type: point.type,
        anomalyId: point.anomalyId
      };

      meshes.push(mesh);
    });

    return meshes;
  }, []);

  const createAnomalyPath = useCallback((
    anomalyList: AnomalyDetail[],
    seg: AudioSegment
  ) => {
    const frameCount = seg.frames.length;
    const freqBins = seg.frequencyBins;
    const timeScale = 10;
    const freqScale = 8;
    const ampScale = 3;

    const points: THREE.Vector3[] = [];

    anomalyList.forEach((anomaly) => {
      if (anomaly.affectedRange) {
        const { startFrame, endFrame, startFreq, endFreq } = anomaly.affectedRange;
        
        for (let f = startFrame; f <= endFrame; f++) {
          const frame = seg.frames[f];
          if (!frame) continue;

          const x = (f / (frameCount - 1) - 0.5) * timeScale;
          
          const freqStartIdx = startFreq ? 
            frame.frequencies.findIndex(freq => freq >= startFreq) : 0;
          const freqEndIdx = endFreq ?
            frame.frequencies.findIndex(freq => freq >= endFreq) : freqBins - 1;

          for (let fi = Math.max(0, freqStartIdx); fi <= Math.min(freqBins - 1, freqEndIdx); fi++) {
            const z = (fi / (freqBins - 1) - 0.5) * freqScale;
            const amplitude = frame.amplitudes[fi] || 0;
            const y = amplitude * ampScale + 0.05;
            points.push(new THREE.Vector3(x, y, z));
          }
        }
      } else if (anomaly.frameIndex !== undefined) {
        const frame = seg.frames[anomaly.frameIndex];
        if (!frame) return;

        const x = (anomaly.frameIndex / (frameCount - 1) - 0.5) * timeScale;
        const freqIdx = anomaly.frequencyIndex || 0;
        const z = (freqIdx / (freqBins - 1) - 0.5) * freqScale;
        const amplitude = frame.amplitudes[freqIdx] || 0;
        const y = amplitude * ampScale + 0.05;
        
        points.push(new THREE.Vector3(x, y, z));
      }
    });

    if (points.length === 0) return null;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#ef4444',
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });

    return new THREE.Line(geometry, material);
  }, []);

  const createAxes = useCallback(() => {
    const group = new THREE.Group();

    const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-6, 0, 0),
      new THREE.Vector3(6, 0, 0)
    ]);
    const xAxisMat = new THREE.LineBasicMaterial({ color: '#3b82f6' });
    const xAxis = new THREE.Line(xAxisGeom, xAxisMat);
    group.add(xAxis);

    const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 4, 0)
    ]);
    const yAxisMat = new THREE.LineBasicMaterial({ color: '#22c55e' });
    const yAxis = new THREE.Line(yAxisGeom, yAxisMat);
    group.add(yAxis);

    const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -5),
      new THREE.Vector3(0, 0, 5)
    ]);
    const zAxisMat = new THREE.LineBasicMaterial({ color: '#f59e0b' });
    const zAxis = new THREE.Line(zAxisGeom, zAxisMat);
    group.add(zAxis);

    return group;
  }, []);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const intersects = raycasterRef.current.intersectObjects([
      ...highlightMeshesRef.current,
      waterfallMeshRef.current
    ].filter(Boolean) as THREE.Object3D[]);

    if (intersects.length > 0) {
      const firstHit = intersects[0];
      const userData = (firstHit.object as THREE.Mesh).userData;

      if (userData.type === 'anomaly' && userData.anomalyId) {
        onAnomalySelect(userData.anomalyId);
      } else if (userData.frameIndex !== undefined) {
        onFrameSelect(userData.frameIndex, userData.frequencyIndex);
      } else if (waterfallMeshRef.current && firstHit.face) {
        const vertexIndex = firstHit.face.a;
        const positions = waterfallMeshRef.current.geometry.attributes.position;
        if (positions && segment) {
          const x = positions.getX(vertexIndex);
          const frameCount = segment.frames.length;
          const timeScale = 10;
          const frameIdx = Math.round(((x / timeScale) + 0.5) * (frameCount - 1));
          onFrameSelect(Math.max(0, Math.min(frameCount - 1, frameIdx)));
        }
      }
    }
  }, [segment, onFrameSelect, onAnomalySelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(8, 6, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const axes = createAxes();
    scene.add(axes);

    const gridHelper = new THREE.GridHelper(15, 15, 0x333340, 0x222230);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
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

    containerRef.current.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick);
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [createAxes, handleClick]);

  useEffect(() => {
    if (!sceneRef.current || !segment) return;

    if (waterfallMeshRef.current) {
      sceneRef.current.remove(waterfallMeshRef.current);
      waterfallMeshRef.current.geometry.dispose();
      (waterfallMeshRef.current.material as THREE.Material).dispose();
    }

    const geometry = createWaterfallGeometry(segment);
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 20,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    sceneRef.current.add(mesh);
    waterfallMeshRef.current = mesh;

    highlightMeshesRef.current.forEach(m => {
      sceneRef.current?.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    highlightMeshesRef.current = [];

    const highlightMeshes = createHighlightPoints(highlights, segment);
    highlightMeshes.forEach(m => {
      sceneRef.current?.add(m);
    });
    highlightMeshesRef.current = highlightMeshes;

    if (anomalyLineRef.current) {
      sceneRef.current.remove(anomalyLineRef.current);
      anomalyLineRef.current.geometry.dispose();
      (anomalyLineRef.current.material as THREE.Material).dispose();
    }

    const anomalyPath = createAnomalyPath(anomalies, segment);
    if (anomalyPath) {
      sceneRef.current.add(anomalyPath);
      anomalyLineRef.current = anomalyPath;
    }

  }, [segment, highlights, anomalies, createWaterfallGeometry, createHighlightPoints, createAnomalyPath]);

  return (
    <div 
      ref={containerRef} 
      className="canvas-container w-full h-full"
      style={{ minHeight: '500px' }}
    />
  );
};

export default Waterfall3D;
