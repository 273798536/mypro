import { useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import type { Cage, CageStatus } from '@/types';

const statusColor: Record<CageStatus, THREE.ColorRepresentation> = {
  normal: 0x22c55e,
  pending: 0xf59e0b,
  error: 0xef4444,
};

const CAGE_SIZE: [number, number, number] = [0.9, 0.55, 0.75];

export default function CageMesh() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const cages = useLayoutStore((s) => s.cages);
  const selectedId = useLayoutStore((s) => s.selectedCageId);
  const selectCage = useLayoutStore((s) => s.selectCage);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorTmp = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    cages.forEach((cage: Cage, i: number) => {
      dummy.position.set(cage.x, cage.y, cage.z);
      const isSelected = selectedId === cage.id;
      const scale = isSelected ? 1.08 : 1;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      colorTmp.set(statusColor[cage.status]);
      if (isSelected) colorTmp.offsetHSL(0, 0, 0.15);
      mesh.setColorAt(i, colorTmp);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const i = (e as unknown as { instanceId: number }).instanceId;
    if (typeof i === 'number' && cages[i]) {
      selectCage(cages[i].id === selectedId ? null : cages[i].id);
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(cages.length, 1)]}
      castShadow
      receiveShadow
      onClick={handleClick}
    >
      <boxGeometry args={CAGE_SIZE} />
      <meshStandardMaterial metalness={0.3} roughness={0.55} />
    </instancedMesh>
  );
}
