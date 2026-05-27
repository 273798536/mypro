import { useMemo } from 'react';
import * as THREE from 'three';

interface RotorProps {
  radius?: number;
  height?: number;
  poles?: number;
  angle?: number;
}

export const Rotor = ({ radius = 1.8, height = 1.8, poles = 4, angle = 0 }: RotorProps) => {
  const magnetColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i < poles; i++) {
      colors.push(i % 2 === 0 ? '#ef4444' : '#3b82f6');
    }
    return colors;
  }, [poles]);

  return (
    <group rotation={[0, (angle * Math.PI) / 180, 0]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, height, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {Array.from({ length: poles }).map((_, i) => {
        const poleAngle = (i / poles) * Math.PI * 2;
        const x = Math.cos(poleAngle) * radius * 0.85;
        const z = Math.sin(poleAngle) * radius * 0.85;

        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -poleAngle + Math.PI / 2, 0]}>
            <mesh>
              <boxGeometry args={[0.4, height * 0.9, 0.6]} />
              <meshStandardMaterial
                color={magnetColors[i]}
                metalness={0.3}
                roughness={0.5}
                emissive={magnetColors[i]}
                emissiveIntensity={0.2}
              />
            </mesh>
            <mesh position={[0, 0, 0.35]}>
              <boxGeometry args={[0.35, height * 0.85, 0.1]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );
      })}

      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, height + 0.5, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
};
