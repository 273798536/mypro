import type { CargoItem } from '../../types';

interface CargoProps {
  items: CargoItem[];
  heelAngle: number;
  trimAngle: number;
}

export function Cargo({ items, heelAngle, trimAngle }: CargoProps) {
  return (
    <group rotation={[trimAngle * Math.PI / 180, 0, heelAngle * Math.PI / 180]}>
      {items.map((item) => (
        <group key={item.id} position={[item.position.x, item.position.y, item.position.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[item.dimensions.width, item.dimensions.height, item.dimensions.depth]} />
            <meshStandardMaterial
              color={item.color}
              metalness={0.3}
              roughness={0.6}
              transparent
              opacity={0.9}
            />
          </mesh>
          <mesh position={[0, item.dimensions.height / 2 + 0.05, 0]}>
            <boxGeometry args={[item.dimensions.width + 0.1, 0.1, item.dimensions.depth + 0.1]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
