import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point3D } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { pointToPlaneDistance } from '@/utils/sectionMath';

interface PointCloudProps {
  points: Point3D[];
}

export default function PointCloud({ points }: PointCloudProps) {
  const ref = useRef<THREE.Points>(null);
  const params = useGameStore((s) => s.currentParams);
  const outlierMarks = useGameStore((s) => s.outlierMarks);
  const selectedPointId = useGameStore((s) => s.selectedPointId);
  const setSelectedPoint = useGameStore((s) => s.setSelectedPoint);
  const markOutlier = useGameStore((s) => s.markOutlier);

  const markedIds = useMemo(
    () => new Set(outlierMarks.map((m) => m.pointId)),
    [outlierMarks]
  );

  const { positions, colors, ids } = useMemo(() => {
    const n = points.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const ids: string[] = new Array(n);

    const halfThick = params.thickness / 2;

    for (let i = 0; i < n; i++) {
      const p = points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      ids[i] = p.id;

      const d = pointToPlaneDistance(p, params);
      const inSection = Math.abs(d) <= halfThick;

      if (markedIds.has(p.id)) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.42;
        colors[i * 3 + 2] = 0.21;
      } else if (p.isOutlier) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.24;
      } else if (inSection) {
        const t = p.intensity;
        colors[i * 3] = 0.0 + t * 0.2;
        colors[i * 3 + 1] = 0.9 + t * 0.1;
        colors[i * 3 + 2] = 1.0;
      } else {
        const t = p.intensity * 0.4;
        colors[i * 3] = 0.2 + t * 0.2;
        colors[i * 3 + 1] = 0.4 + t * 0.3;
        colors[i * 3 + 2] = 0.6 + t * 0.3;
      }
    }

    return { positions, colors, ids };
  }, [points, params, markedIds]);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.rotation.y = Math.sin(t * 0.05) * 0.02;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const idx = e.intersections[0]?.instanceId ?? e.intersections[0]?.index;
    if (idx !== undefined && ids[idx]) {
      const pid = ids[idx];
      if (selectedPointId === pid) {
        markOutlier(pid, '视口中点击标记');
      } else {
        setSelectedPoint(pid);
      }
    }
  };

  return (
    <points
      ref={ref}
      onClick={handleClick}
      onPointerMissed={() => setSelectedPoint(null)}
    >
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
        size={0.055}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </points>
  );
}
