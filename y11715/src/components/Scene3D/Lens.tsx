import React from 'react';

interface LensProps {
  position: [number, number, number];
  height?: number;
}

export const Lens: React.FC<LensProps> = ({ position, height = 12 }) => {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, height, 32]} />
        <meshStandardMaterial
          color="#60a5fa"
          transparent
          opacity={0.3}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[height / 2 - 0.1, height / 2, 64]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};
