import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SurfacePoint } from '../../types';
import { getRiskColor } from '../../engine/RiskSurfaceEngine';

interface RiskSurfaceMeshProps {
  surfaceData: SurfacePoint[][];
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
  highlightedRegion?: { x: [number, number]; y: [number, number] } | null;
  onPointClick?: (point: SurfacePoint) => void;
}

export function RiskSurfaceMesh({ surfaceData, bounds, highlightedRegion, onPointClick }: RiskSurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  const { geometry, colors, positions } = useMemo(() => {
    if (!surfaceData.length || !surfaceData[0].length) {
      return {
        geometry: new THREE.BufferGeometry(),
        colors: new Float32Array(),
        positions: new Float32Array()
      };
    }

    const nx = surfaceData.length;
    const ny = surfaceData[0].length;
    
    const positions = new Float32Array(nx * ny * 3);
    const colors = new Float32Array(nx * ny * 3);
    const indices: number[] = [];

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const point = surfaceData[i][j];
        const idx = (i * ny + j) * 3;
        
        positions[idx] = point.x;
        positions[idx + 1] = point.z;
        positions[idx + 2] = point.y;

        const color = new THREE.Color(getRiskColor(point.z, bounds.zMin, bounds.zMax));
        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;
      }
    }

    for (let i = 0; i < nx - 1; i++) {
      for (let j = 0; j < ny - 1; j++) {
        const a = i * ny + j;
        const b = (i + 1) * ny + j;
        const c = i * ny + j + 1;
        const d = (i + 1) * ny + j + 1;
        indices.push(a, b, d, a, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry, colors, positions };
  }, [surfaceData, bounds]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      const time = state.clock.getElapsedTime();
      material.opacity = 0.85 + Math.sin(time * 0.5) * 0.05;
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (!onPointClick || !surfaceData.length) return;

    const point = event.point;
    const nx = surfaceData.length;
    const ny = surfaceData[0].length;
    
    let closestPoint: SurfacePoint | null = null;
    let minDist = Infinity;

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const p = surfaceData[i][j];
        const dist = Math.sqrt(
          Math.pow(p.x - point.x, 2) +
          Math.pow(p.z - point.y, 2) +
          Math.pow(p.y - point.z, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closestPoint = p;
        }
      }
    }

    if (closestPoint && minDist < 1) {
      onPointClick(closestPoint);
    }
  };

  if (!surfaceData.length) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      
      <lineSegments ref={wireframeRef} geometry={geometry}>
        <lineBasicMaterial color="#64748b" transparent opacity={0.3} />
      </lineSegments>

      {highlightedRegion && (
        <HighlightRegionBox
          region={highlightedRegion}
          zMin={bounds.zMin}
          zMax={bounds.zMax}
        />
      )}
    </group>
  );
}

function HighlightRegionBox({
  region,
  zMin,
  zMax
}: {
  region: { x: [number, number]; y: [number, number] };
  zMin: number;
  zMax: number;
}) {
  const xSize = region.x[1] - region.x[0];
  const ySize = region.y[1] - region.y[0];
  const zSize = zMax - zMin + 2;
  
  const xCenter = (region.x[0] + region.x[1]) / 2;
  const yCenter = (region.y[0] + region.y[1]) / 2;
  const zCenter = (zMin + zMax) / 2;

  return (
    <mesh position={[xCenter, zCenter, yCenter]}>
      <boxGeometry args={[xSize, zSize, ySize]} />
      <meshBasicMaterial
        color="#f59e0b"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(xSize, zSize, ySize)]} />
        <lineBasicMaterial color="#f59e0b" linewidth={2} />
      </lineSegments>
    </mesh>
  );
}
