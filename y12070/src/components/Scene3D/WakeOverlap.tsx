import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export default function WakeOverlap() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wakeResults = useStore((s) => s.wakeResults);
  const showWake = useStore((s) => s.showWake);
  const scale = 0.01;

  const overlaps = useMemo(() => {
    if (!showWake) return [];
    return wakeResults.filter((w) => w.affectedBy.length > 1);
  }, [wakeResults, showWake]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    overlaps.forEach((w, i) => {
      const turbine = w.turbineId;
      const turbineNum = parseInt(turbine.replace('T', ''), 10) - 1;
      const row = Math.floor(turbineNum / 3);
      const col = turbineNum % 3;
      const x = (col * 800 + row * 200) * scale;
      const z = row * 600 * scale;
      const pulse = 1 + Math.sin(t * 3 + i) * 0.2;
      dummy.position.set(x, 8 * scale, z);
      dummy.scale.set(pulse * 3 * scale, pulse * 3 * scale, pulse * 3 * scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (overlaps.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, overlaps.length]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#EF4444" transparent opacity={0.25} depthWrite={false} />
    </instancedMesh>
  );
}
