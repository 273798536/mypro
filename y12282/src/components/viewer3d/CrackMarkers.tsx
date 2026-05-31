import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CrackPoint } from '../../types';

interface CrackMarkersProps {
  cracks: CrackPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CrackMarkers({ cracks, selectedId, onSelect }: CrackMarkersProps) {
  return (
    <group>
      {cracks.map((crack) => (
        <CrackMarker
          key={crack.id}
          crack={crack}
          isSelected={selectedId === crack.id}
          onClick={() => onSelect(crack.id === selectedId ? null : crack.id)}
        />
      ))}
    </group>
  );
}

interface CrackMarkerProps {
  crack: CrackPoint;
  isSelected: boolean;
  onClick: () => void;
}

function CrackMarker({ crack, isSelected, onClick }: CrackMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef(0);

  useFrame((state) => {
    if (meshRef.current) {
      pulseRef.current += 0.05;
      const scale = 1 + Math.sin(pulseRef.current) * 0.1;
      meshRef.current.scale.setScalar(isSelected ? scale * 1.2 : scale);
    }
  });

  const color = crack.isDuplicate ? 0xff6b6b : isSelected ? 0xffd93d : 0xff9f43;

  return (
    <group position={[crack.position.x, crack.position.y, crack.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
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
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={crack.isDuplicate ? 0.9 : 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group position={[0, 1.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <coneGeometry args={[0.2, 0.4, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
      {crack.isDuplicate && (
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[1, 0.05, 8, 32]} />
          <meshBasicMaterial color={0xff4444} transparent opacity={0.6} />
        </mesh>
      )}
      {(hovered || isSelected) && (
        <Html position={[1.5, 0, 0]} center distanceFactor={10}>
          <div
            className={`
              px-3 py-2 rounded-lg text-xs whitespace-nowrap
              ${crack.isDuplicate ? 'bg-red-600' : isSelected ? 'bg-yellow-600' : 'bg-gray-800'}
              text-white shadow-lg
            `}
          >
            <div className="font-bold">{crack.id}</div>
            <div className="text-gray-200 text-[10px] mt-1">{crack.description}</div>
            {crack.isDuplicate && (
              <div className="text-red-200 text-[10px] mt-1">
                ⚠️ 疑似重复 (关联: {crack.duplicateOf})
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
