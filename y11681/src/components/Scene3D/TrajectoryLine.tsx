import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TrajectoryPoint } from '@/types/trajectory';

interface Props {
  points: TrajectoryPoint[];
  color: string;
  progress: number;
}

export function TrajectoryLine({ points, color, progress }: Props) {
  const lineRef = useRef<any>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const visibleCount = Math.max(2, Math.floor(points.length * progress));

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(points.length * 3);
    const col = new Float32Array(points.length * 3);

    const startColor = new THREE.Color('#FFC93C');
    const midColor = new THREE.Color('#32E0C4');
    const endColor = new THREE.Color('#FF6B6B');

    for (let i = 0; i < points.length; i++) {
      const t = i / Math.max(1, points.length - 1);
      pos[i * 3] = points[i].x;
      pos[i * 3 + 1] = points[i].y;
      pos[i * 3 + 2] = points[i].z;

      let c: THREE.Color;
      if (t < 0.5) {
        c = startColor.clone().lerp(midColor, t * 2);
      } else {
        c = midColor.clone().lerp(endColor, (t - 0.5) * 2);
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return { positions: pos, colors: col };
  }, [points]);

  useFrame(() => {
    if (geometryRef.current) {
      geometryRef.current.setDrawRange(0, visibleCount);
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={points.length}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={points.length}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.9} linewidth={2} />
    </line>
  );
}
