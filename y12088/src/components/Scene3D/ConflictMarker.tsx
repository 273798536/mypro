import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Conflict } from '../../types';

interface ConflictMarkerProps {
  conflict: Conflict;
}

export const ConflictMarker: React.FC<ConflictMarkerProps> = ({ conflict }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const getColor = () => {
    switch (conflict.type) {
      case 'crossing':
        return '#ff7d00';
      case 'overheight':
        return '#ff4d4f';
      case 'blind':
        return '#86909c';
      default:
        return '#ff4d4f';
    }
  };

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = conflict.position.y + Math.sin(elapsed * 3) * 0.3;
    }
    if (pulseRef.current && conflict.status !== 'resolved') {
      const scale = 1 + Math.sin(elapsed * 4) * 0.2;
      pulseRef.current.scale.setScalar(scale);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(elapsed * 4) * 0.2;
    }
  });

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.5);
    shape.lineTo(-1, 0);
    shape.lineTo(1, 0);
    shape.closePath();
    const extrudeSettings = { depth: 0.2, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group position={[conflict.position.x, 0, conflict.position.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={0.5}
          transparent
          opacity={conflict.status === 'resolved' ? 0.3 : 0.9}
        />
      </mesh>
      <mesh ref={pulseRef} position={[0, conflict.position.y, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial
          color={getColor()}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
