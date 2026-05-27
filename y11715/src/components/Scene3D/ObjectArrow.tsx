import React from 'react';

interface ObjectArrowProps {
  position: [number, number, number];
  height: number;
  color: string;
  isVirtual?: boolean;
  label?: string;
}

export const ObjectArrow: React.FC<ObjectArrowProps> = ({
  position,
  height,
  color,
  isVirtual = false,
  label,
}) => {
  const actualHeight = Math.abs(height);
  const direction = height >= 0 ? 1 : -1;

  return (
    <group position={position}>
      <mesh position={[0, (actualHeight / 2) * direction, 0]}>
        <cylinderGeometry args={[0.15, 0.15, actualHeight, 16]} />
        <meshStandardMaterial
          color={color}
          transparent={isVirtual}
          opacity={isVirtual ? 0.5 : 1}
        />
      </mesh>
      <mesh position={[0, (actualHeight + 0.4) * direction, 0]} rotation={[0, 0, direction > 0 ? 0 : Math.PI]}>
        <coneGeometry args={[0.4, 0.8, 16]} />
        <meshStandardMaterial
          color={color}
          transparent={isVirtual}
          opacity={isVirtual ? 0.5 : 1}
        />
      </mesh>
      {label && (
        <group position={[0.5, actualHeight * direction, 0]}>
          <mesh>
            <planeGeometry args={[2, 0.6]} />
            <meshBasicMaterial color="#0a1628" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
};
