import type { Position } from '../../types';

interface CenterOfGravityProps {
  position: Position;
  heelAngle: number;
  trimAngle: number;
  isStable: boolean;
}

export function CenterOfGravity({ position, heelAngle, trimAngle, isStable }: CenterOfGravityProps) {
  return (
    <group rotation={[trimAngle * Math.PI / 180, 0, heelAngle * Math.PI / 180]}>
      <mesh position={[position.x, position.y, position.z]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={isStable ? '#22c55e' : '#ef4444'}
          emissive={isStable ? '#22c55e' : '#ef4444'}
          emissiveIntensity={0.5}
        />
      </mesh>

      <group position={[position.x, position.y, position.z]}>
        <mesh position={[2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4, 8]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, 0, 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4, 8]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      </group>

      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color="#64748b"
          transparent
          opacity={0.5}
        />
      </mesh>

      <mesh position={[0, 2, position.z]}>
        <boxGeometry args={[Math.abs(position.x) * 2 + 0.1, 0.05, 0.05]} />
        <meshStandardMaterial
          color={Math.abs(position.x) > 0.5 ? '#ef4444' : '#f59e0b'}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}
