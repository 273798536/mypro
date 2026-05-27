import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { trajectories } from '@/data/trajectories';
import { getHeatmapColor } from '@/utils/color';

interface HeatmapProps {
  bounds: [number, number, number, number];
  opacity: number;
  visible: boolean;
}

export const Heatmap: React.FC<HeatmapProps> = ({ bounds, opacity, visible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [minX, minZ, maxX, maxZ] = bounds;
  const resolution = 64;

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(resolution, resolution);

    const cellWidth = (maxX - minX) / resolution;
    const cellHeight = (maxZ - minZ) / resolution;
    const densityGrid: number[][] = [];

    for (let i = 0; i < resolution; i++) {
      densityGrid.push(new Array(resolution).fill(0));
    }

    trajectories.forEach((traj) => {
      traj.points.forEach((point) => {
        const gx = Math.floor((point.x - minX) / cellWidth);
        const gz = Math.floor((point.z - minZ) / cellHeight);
        if (gx >= 0 && gx < resolution && gz >= 0 && gz < resolution) {
          const radius = 2;
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
              const nx = gx + dx;
              const nz = gz + dz;
              if (nx >= 0 && nx < resolution && nz >= 0 && nz < resolution) {
                const dist = Math.sqrt(dx * dx + dz * dz);
                densityGrid[nz][nx] += Math.max(0, 1 - dist / radius) * 0.3;
              }
            }
          }
        }
      });
    });

    let maxDensity = 0;
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        maxDensity = Math.max(maxDensity, densityGrid[i][j]);
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 4;
        const density = densityGrid[i][j];
        if (density > 0 && maxDensity > 0) {
          const normalized = Math.min(1, density / maxDensity);
          const color = getHeatmapColor(normalized);
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          imageData.data[idx] = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
          imageData.data[idx + 3] = Math.floor(normalized * 255 * 0.8);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [bounds, minX, minZ, maxX, maxZ]);

  useFrame((state) => {
    if (meshRef.current && visible) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * (0.7 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1);
    }
  });

  const width = maxX - minX;
  const height = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX, 0.1, centerZ]}
      visible={visible}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
};

interface TrajectoryLinesProps {
  visible: boolean;
}

export const TrajectoryLines: React.FC<TrajectoryLinesProps> = ({ visible }) => {
  const lines = useMemo(() => {
    return trajectories.map((traj) => {
      const points = traj.points.map(
        (p) => new THREE.Vector3(p.x, p.y + 0.5, p.z)
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return { id: traj.id, geometry, slopeId: traj.slopeId };
    });
  }, []);

  if (!visible) return null;

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.id}
          points={trajectories.find((t) => t.id === line.id)?.points.map((p) => [p.x, p.y + 0.5, p.z] as [number, number, number]) || []}
          color="#4FC3F7"
          opacity={0.4}
          transparent
        />
      ))}
    </group>
  );
};
