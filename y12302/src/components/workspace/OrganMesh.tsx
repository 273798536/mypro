import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrganModel } from '../../types';
import { hexToRgb } from '../../utils/colorUtils';

interface OrganMeshProps {
  organ: OrganModel;
  isSelected: boolean;
  onClick: () => void;
}

export function OrganMesh({ organ, isSelected, onClick }: OrganMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => hexToRgb(organ.color), [organ.color]);

  const geometry = useMemo(() => {
    const [x, y, z] = organ.size || [40, 30, 35];
    switch (organ.shapeType) {
      case 'sphere':
        return new THREE.SphereGeometry(Math.max(x, y, z) / 2, 32, 32);
      case 'box':
        return new THREE.BoxGeometry(x, y, z);
      case 'cylinder':
        return new THREE.CylinderGeometry(x / 2, x / 2, z, 32);
      case 'ellipsoid':
      default:
        return new THREE.SphereGeometry(1, 32, 32).scale(x / 2, y / 2, z / 2);
    }
  }, [organ.shapeType, organ.size]);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.02;
      meshRef.current.scale.setScalar(pulse);
    }
    if (outlineRef.current) {
      outlineRef.current.visible = isSelected;
    }
  });

  return (
    <group
      position={organ.position}
      rotation={organ.rotation}
      scale={organ.scale}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <meshStandardMaterial
          color={new THREE.Color(color.r, color.g, color.b)}
          transparent
          opacity={organ.opacity}
          side={THREE.DoubleSide}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      
      {isSelected && (
        <mesh ref={outlineRef} geometry={geometry}>
          <meshBasicMaterial
            color={new THREE.Color(color.r, color.g, color.b)}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
