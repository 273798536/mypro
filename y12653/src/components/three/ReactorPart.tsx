import { useRef, useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import type { ReactorPart as ReactorPartType } from '@/types';
import { useReactorStore } from '@/store/useReactorStore';

interface ReactorPartProps {
  part: ReactorPartType;
  selected: boolean;
  onClick: () => void;
}

const statusOutlineColor: Record<ReactorPartType['status'], string> = {
  danger: '#E74C3C',
  warning: '#FF8A3D',
  normal: '#2ECC71',
};

export default function ReactorPart({ part, selected, onClick }: ReactorPartProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const clipPlanes = useReactorStore((s) => s.clipPlanes);

  const threePlanes = useMemo(() => {
    if (!clipPlanes.enabled) return [];
    return [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), clipPlanes.x),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), clipPlanes.y),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), clipPlanes.z),
    ];
  }, [clipPlanes.enabled, clipPlanes.x, clipPlanes.y, clipPlanes.z]);

  const geometry = useMemo(() => {
    switch (part.geometry) {
      case 'cylinder':
        return <cylinderGeometry args={[part.size[0] / 2, part.size[0] / 2, part.size[1], 48]} />;
      case 'box':
        return <boxGeometry args={[part.size[0], part.size[1], part.size[2]]} />;
      case 'sphere':
        return <sphereGeometry args={[part.size[0] / 2, 48, 48]} />;
      case 'cone':
        return <coneGeometry args={[part.size[0] / 2, part.size[1], 48]} />;
    }
  }, [part.geometry, part.size]);

  const meshNode = (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {geometry}
      <meshStandardMaterial
        color={part.color}
        metalness={0.7}
        roughness={0.35}
        emissive={selected ? part.color : '#000000'}
        emissiveIntensity={selected ? 0.35 : 0}
        clippingPlanes={threePlanes}
        clipShadows
      />
    </mesh>
  );

  return (
    <group position={part.position} rotation={part.rotation || [0, 0, 0]}>
      {selected ? (
        <Outlines
          color={statusOutlineColor[part.status]}
          thickness={0.02}
          transparent
          opacity={0.9}
        >
          {meshNode}
        </Outlines>
      ) : (
        meshNode
      )}
    </group>
  );
}
