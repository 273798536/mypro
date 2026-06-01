import { useRef, useMemo } from 'react';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { generateStarParticles } from '../../utils/3dLayout';

interface StarFieldProps {
  count?: number;
}

export function StarField({ count = 500 }: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => generateStarParticles(count), [count]);

  const positions = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      arr[i * 3] = p.position[0];
      arr[i * 3 + 1] = p.position[1];
      arr[i * 3 + 2] = p.position[2];
    });
    return arr;
  }, [particles]);

  const colors = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      arr[i * 3] = 0.7 + Math.random() * 0.3;
      arr[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      arr[i * 3 + 2] = 1.0;
    });
    return arr;
  }, [particles]);

  return (
    <Points ref={pointsRef} positions={positions} colors={colors} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={0.15}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}
