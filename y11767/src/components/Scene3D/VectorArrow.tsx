import { useMemo } from 'react';
import { Vector3, Quaternion, Euler } from 'three';

interface VectorArrowProps {
  position: Vector3;
  direction: Vector3;
  color: string;
  scale?: number;
}

export function VectorArrow({ position, direction, color, scale = 1 }: VectorArrowProps) {
  const { length, rotation, headLength, headWidth, shaftLength } = useMemo(() => {
    const len = direction.length();
    if (len < 0.01) {
      return {
        length: 0,
        rotation: [0, 0, 0] as [number, number, number],
        headLength: 0,
        headWidth: 0,
        shaftLength: 0,
      };
    }
    const actualLength = len * scale;
    const hLength = Math.min(0.2 * actualLength, 0.2);
    const sLength = actualLength - hLength;

    const dir = direction.clone().normalize();
    const up = new Vector3(0, 1, 0);
    const quaternion = new Quaternion().setFromUnitVectors(up, dir);
    const euler = new Euler().setFromQuaternion(quaternion);

    return {
      length: actualLength,
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      headLength: hLength,
      headWidth: 0.1,
      shaftLength: sLength,
    };
  }, [direction, scale]);

  if (length < 0.01) return null;

  const shaftCenter = position.clone().add(
    direction.clone().normalize().multiplyScalar(shaftLength / 2)
  );

  const coneCenter = position.clone().add(
    direction.clone().normalize().multiplyScalar(shaftLength + headLength / 2)
  );

  return (
    <group>
      <mesh position={shaftCenter.toArray()} rotation={rotation}>
        <cylinderGeometry args={[0.03, 0.03, shaftLength, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh position={coneCenter.toArray()} rotation={rotation}>
        <coneGeometry args={[headWidth, headLength, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
