import type { BallastTank } from '../../types';

interface BallastProps {
  tanks: BallastTank[];
  heelAngle: number;
  trimAngle: number;
}

export function Ballast({ tanks, heelAngle, trimAngle }: BallastProps) {
  return (
    <group rotation={[trimAngle * Math.PI / 180, 0, heelAngle * Math.PI / 180]}>
      {tanks.map((tank) => {
        const fillRatio = tank.currentLevel / tank.capacity;
        const isMissing = tank.currentLevel === 0;

        return (
          <group key={tank.id} position={[tank.position.x, tank.position.y, tank.position.z]}>
            <mesh>
              <boxGeometry args={[tank.dimensions.width, tank.dimensions.height, tank.dimensions.depth]} />
              <meshStandardMaterial
                color={isMissing ? '#ef4444' : '#64748b'}
                transparent
                opacity={0.2}
                wireframe={isMissing}
              />
            </mesh>

            {fillRatio > 0 && (
              <mesh position={[0, -tank.dimensions.height / 2 + (tank.dimensions.height * fillRatio) / 2, 0]}>
                <boxGeometry args={[
                  tank.dimensions.width * 0.9,
                  tank.dimensions.height * fillRatio * 0.9,
                  tank.dimensions.depth * 0.9,
                ]} />
                <meshStandardMaterial
                  color="#0ea5e9"
                  transparent
                  opacity={0.7}
                  metalness={0.1}
                  roughness={0.9}
                />
              </mesh>
            )}

            {isMissing && (
              <mesh position={[0, tank.dimensions.height / 2 + 0.5, 0]}>
                <sphereGeometry args={[0.15]} />
                <meshStandardMaterial
                  color="#ef4444"
                  emissive="#ef4444"
                  emissiveIntensity={1}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
