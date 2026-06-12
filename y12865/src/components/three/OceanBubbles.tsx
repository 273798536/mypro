import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BubblesProps {
  count?: number;
  spread?: number;
}

export default function OceanBubbles({ count = 80, spread = 50 }: BubblesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * spread,
      y: -Math.random() * 25,
      z: (Math.random() - 0.5) * spread,
      speed: 0.2 + Math.random() * 0.8,
      scale: 0.03 + Math.random() * 0.08,
      wobble: Math.random() * Math.PI * 2,
    }));
  }, [count, spread]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      p.y += p.speed * delta;
      p.wobble += delta * 0.5;
      if (p.y > 2) {
        p.y = -25;
        p.x = (Math.random() - 0.5) * spread;
        p.z = (Math.random() - 0.5) * spread;
      }
      dummy.position.set(p.x + Math.sin(p.wobble) * 0.3, p.y, p.z + Math.cos(p.wobble) * 0.3);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#88ddff" transparent opacity={0.25} />
    </instancedMesh>
  );
}
