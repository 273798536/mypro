import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point3D } from '@/types';
import { useGameStore } from '@/store/useGameStore';

interface OutlierPointsProps {
  points: Point3D[];
}

export default function OutlierPoints({ points }: OutlierPointsProps) {
  const ref = useRef<THREE.Points>(null);
  const haloRef = useRef<THREE.Points>(null);
  const outlierMarks = useGameStore((s) => s.outlierMarks);

  const approved = useMemo(
    () => new Set(outlierMarks.filter((m) => m.status === 'approved').map((m) => m.pointId)),
    [outlierMarks]
  );
  const pending = useMemo(
    () => new Set(outlierMarks.filter((m) => m.status === 'pending').map((m) => m.pointId)),
    [outlierMarks]
  );

  const outlierPoints = useMemo(() => points.filter((p) => p.isOutlier || approved.has(p.id) || pending.has(p.id)), [points, approved, pending]);

  const { positions, colors } = useMemo(() => {
    const n = outlierPoints.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const p = outlierPoints[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      if (approved.has(p.id)) {
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 0.53;
      } else if (pending.has(p.id)) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.42;
        colors[i * 3 + 2] = 0.21;
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.24;
      }
    }
    return { positions, colors };
  }, [outlierPoints, approved, pending]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 3) * 0.25;
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.PointsMaterial;
      mat.size = 0.22 * pulse;
      mat.opacity = 0.35 + Math.sin(t * 3) * 0.15;
    }
  });

  if (outlierPoints.length === 0) return null;

  return (
    <group>
      <points ref={haloRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ff6b35"
          size={0.22}
          sizeAttenuation
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.11}
          vertexColors
          sizeAttenuation
          transparent
          opacity={1}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
