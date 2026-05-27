import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { generateWaveGrid } from '@/utils/physicsEngine';

interface WaveSurfaceProps {
  gridSize?: number;
}

export function WaveSurface({ gridSize = 10 }: WaveSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const colorsRef = useRef<Float32Array | null>(null);

  const {
    waveParams,
    obstacles,
    time,
    gridResolution,
    displayOptions,
    isPlaying,
    setTime,
    setFps,
    isPerformanceMode,
  } = useAppStore();

  const lastFrameTime = useRef(performance.now());
  const frameCount = useRef(0);
  const fpsUpdateInterval = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      gridSize,
      gridSize,
      gridResolution - 1,
      gridResolution - 1
    );
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [gridSize, gridResolution]);

  useEffect(() => {
    geometryRef.current = geometry;
    const positionAttribute = geometry.getAttribute('position');
    const count = positionAttribute.count;
    colorsRef.current = new Float32Array(count * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsRef.current, 3));
  }, [geometry]);

  useFrame((_, delta) => {
    if (!meshRef.current || !geometryRef.current || !colorsRef.current) return;

    if (isPlaying) {
      const newTime = time + delta;
      setTime(newTime);
    }

    frameCount.current++;
    fpsUpdateInterval.current += delta;
    if (fpsUpdateInterval.current >= 0.5) {
      const now = performance.now();
      const fps = (frameCount.current / fpsUpdateInterval.current);
      setFps(fps);
      frameCount.current = 0;
      fpsUpdateInterval.current = 0;
      lastFrameTime.current = now;
    }

    const { heights, amplitudes, penetrations } = generateWaveGrid(
      gridSize,
      gridResolution,
      time,
      waveParams,
      obstacles
    );

    const positions = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
    const colors = colorsRef.current;
    const maxAmp = waveParams.source1.amplitude + waveParams.source2.amplitude;

    for (let i = 0; i < gridResolution * gridResolution; i++) {
      const z = heights[i];
      positions.setZ(i, z);

      const amp = amplitudes[i];
      const normalizedAmp = Math.min(1, amp / maxAmp);
      const penetration = penetrations[i];

      if (displayOptions.showHeatmap) {
        if (penetration) {
          colors[i * 3] = 0.9;
          colors[i * 3 + 1] = 0.2;
          colors[i * 3 + 2] = 0.2;
        } else {
          const t = normalizedAmp;
          colors[i * 3] = t;
          colors[i * 3 + 1] = 0.2 + 0.3 * (1 - t);
          colors[i * 3 + 2] = 1 - t * 0.5;
        }
      } else {
        const baseColor = isPerformanceMode ? 0.3 : 0.4;
        colors[i * 3] = baseColor;
        colors[i * 3 + 1] = baseColor + 0.2;
        colors[i * 3 + 2] = baseColor + 0.4;
      }
    }

    positions.needsUpdate = true;
    const colorAttribute = geometryRef.current.getAttribute('color') as THREE.BufferAttribute;
    colorAttribute.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        wireframe={displayOptions.showMesh}
        transparent
        opacity={displayOptions.showMesh ? 0.85 : 0.95}
        metalness={0.1}
        roughness={0.3}
      />
    </mesh>
  );
}
