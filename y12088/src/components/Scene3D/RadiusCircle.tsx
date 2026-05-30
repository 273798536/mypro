import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RadiusCircleProps {
  position: { x: number; y: number; z: number };
  radius: number;
  color: string;
}

export const RadiusCircle: React.FC<RadiusCircleProps> = ({ position, radius, color }) => {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [radius]);

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }))} />
    </group>
  );
};
