import { useMemo } from 'react';
import * as THREE from 'three';
import type { WakeConeGeometry } from '@/utils/wakeCalculation';
import { wakeLossToColor } from '@/utils/wakeCalculation';

interface WakeConeProps {
  cone: WakeConeGeometry;
  highlighted: boolean;
}

export default function WakeCone({ cone, highlighted }: WakeConeProps) {
  const { position, rotation, scale } = useMemo(() => {
    const dir = new THREE.Vector3(...cone.direction).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    const midPoint = new THREE.Vector3(...cone.origin).add(
      dir.clone().multiplyScalar(cone.length / 2)
    );

    return {
      position: [midPoint.x, midPoint.y, midPoint.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      scale: [cone.tipRadius * 2, cone.length, cone.tipRadius * 2] as [
        number,
        number,
        number
      ],
    };
  }, [cone]);

  const color = wakeLossToColor(cone.maxSpeedLoss * 100);
  const opacity = highlighted ? 0.45 : cone.isOutOfBounds ? 0.35 : 0.22;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>
        <coneGeometry args={[0.5, 1, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <coneGeometry args={[0.5, 1, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.4}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
