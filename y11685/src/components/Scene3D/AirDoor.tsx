import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AirDoor as AirDoorType } from '@/types';
import { useMineStore } from '@/store/useMineStore';

interface AirDoorProps {
  door: AirDoorType;
  hasError: boolean;
}

export function AirDoor({ door, hasError }: AirDoorProps) {
  const doorRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetRotation = door.status === 'open' ? -Math.PI / 2.5 : 0;
  const currentRotation = useRef(0);
  const setSelectedObject = useMineStore((state) => state.setSelectedObject);

  useFrame((_, delta) => {
    if (doorRef.current) {
      const diff = targetRotation - currentRotation.current;
      currentRotation.current += diff * delta * 3;
      doorRef.current.rotation.y = currentRotation.current;
    }
  });

  const doorColor = door.status === 'open' ? '#38a169' : '#e53e3e';
  const emissiveIntensity = hasError ? 0.5 : hovered ? 0.3 : 0.1;

  return (
    <group
      position={door.position}
      rotation={door.rotation || [0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedObject({
          type: 'door',
          id: door.id,
          position: door.position,
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
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 3.2, 0.6]} />
        <meshStandardMaterial
          color="#5a5a5a"
          roughness={0.7}
        />
      </mesh>

      <group ref={doorRef} position={[0.1, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.5, 2.5, 0.15]} />
          <meshStandardMaterial
            color={doorColor}
            emissive={doorColor}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={0.9}
          />
        </mesh>

        <mesh position={[-1.1, 0.8, 0.1]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {hasError && (
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial
            color="#e53e3e"
            emissive="#e53e3e"
            emissiveIntensity={0.8 + Math.sin(Date.now() * 0.005) * 0.3}
          />
        </mesh>
      )}
    </group>
  );
}
