import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CurrentParticlesProps {
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  current: number;
  color?: string;
  count?: number;
}

export default function CurrentParticles({
  startPoint,
  endPoint,
  current,
  color = '#00D4FF',
  count = 50,
}: CurrentParticlesProps) {
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const direction = useMemo(() => {
    return endPoint.clone().sub(startPoint).normalize();
  }, [startPoint, endPoint]);

  const particlesData = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      progress: Math.random(),
      speed: 0.5 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const intensity = Math.min(Math.abs(current) * 100, 1);
    if (intensity < 0.01) {
      particlesRef.current.visible = false;
      return;
    }

    particlesRef.current.visible = true;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const p = particlesData[i];
      const progress = (time * p.speed + p.offset) % 1;
      
      const pos = startPoint.clone().add(
        direction.clone().multiplyScalar(progress * 12 - 6)
      );
      pos.x += Math.sin(time * 3 + p.offset) * 0.1;
      pos.y += Math.cos(time * 2 + p.offset) * 0.1;

      dummy.position.copy(pos);
      dummy.scale.set(0.05 + intensity * 0.05, 0.05 + intensity * 0.05, 0.05 + intensity * 0.05);
      dummy.updateMatrix();
      particlesRef.current.setMatrixAt(i, dummy.matrix);
    }
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={particlesRef}
      args={[undefined, undefined, count]}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={Math.min(Math.abs(current) * 100, 0.8)}
      />
    </instancedMesh>
  );
}
