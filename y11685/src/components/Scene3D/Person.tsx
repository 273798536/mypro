import { useState } from 'react';
import { Person as PersonType } from '@/types';
import { useMineStore } from '@/store/useMineStore';

interface PersonProps {
  person: PersonType;
}

export function Person({ person }: PersonProps) {
  const [hovered, setHovered] = useState(false);
  const setSelectedObject = useMineStore((state) => state.setSelectedObject);

  const bodyColor = hovered ? '#5ba3ff' : '#3182ce';

  return (
    <group
      position={person.position}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedObject({
          type: 'person',
          id: person.id,
          position: person.position,
        });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ffd4a3" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.25]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      <mesh position={[-0.12, 0.15, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#4a5568" roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.15, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#4a5568" roughness={0.8} />
      </mesh>

      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.28, 0.3, 0.1, 16]} />
        <meshStandardMaterial color="#f6e05e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 0.15, 16]} />
        <meshStandardMaterial color="#f6e05e" roughness={0.6} />
      </mesh>

      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#fff"
          emissiveIntensity={0.5 + Math.sin(Date.now() * 0.003) * 0.3}
        />
      </mesh>
    </group>
  );
}
