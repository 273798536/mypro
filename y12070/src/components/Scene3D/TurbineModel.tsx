import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Turbine } from '../../data/types';
import { useStore } from '../../store/useStore';

interface TurbineModelProps {
  turbine: Turbine;
  scale?: number;
}

export default function TurbineModel({ turbine, scale = 1 }: TurbineModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bladeRef = useRef<THREE.Group>(null);
  const windSpeed = useStore((s) => s.windSpeed);
  const wakeResults = useStore((s) => s.wakeResults);

  const wakeData = useMemo(
    () => wakeResults.find((w) => w.turbineId === turbine.id),
    [wakeResults, turbine.id]
  );

  const bladeRotationSpeed = windSpeed * 0.03;

  const poleHeight = (turbine.hubHeight / 120) * 8 * scale;
  const bladeLen = (turbine.rotorDiameter / 154) * 6 * scale;

  const color = useMemo(() => {
    if (!wakeData || wakeData.deficit < 0.05) return '#E8ECF1';
    if (wakeData.deficit < 0.15) return '#FBBF24';
    if (wakeData.deficit < 0.3) return '#FF6B35';
    return '#EF4444';
  }, [wakeData]);

  useFrame((_, delta) => {
    if (bladeRef.current) {
      bladeRef.current.rotation.z += bladeRotationSpeed * delta * 60;
    }
  });

  const pos: [number, number, number] = [turbine.x * scale * 0.01, 0, turbine.y * scale * 0.01];

  return (
    <group ref={groupRef} position={pos}>
      <mesh position={[0, poleHeight / 2, 0]}>
        <cylinderGeometry args={[0.12 * scale, 0.2 * scale, poleHeight, 8]} />
        <meshStandardMaterial color="#D1D5DB" metalness={0.6} roughness={0.3} />
      </mesh>

      <group position={[0, poleHeight, 0]}>
        <mesh>
          <sphereGeometry args={[0.3 * scale, 12, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>

        <group ref={bladeRef}>
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
              <mesh position={[0, bladeLen / 2, 0]}>
                <boxGeometry args={[0.18 * scale, bladeLen, 0.04 * scale]} />
                <meshStandardMaterial color="#F9FAFB" metalness={0.3} roughness={0.5} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      <pointLight position={[0, poleHeight + 1, 0]} color="#EF4444" intensity={0.5} distance={20} />

      <Html position={[0, poleHeight + 2.5, 0]} center distanceFactor={80}>
        <div
          style={{
            background: 'rgba(10,22,40,0.85)',
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: '2px 6px',
            color: color,
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {turbine.id}
          {wakeData && wakeData.deficit > 0.01 && (
            <span style={{ color: '#FF6B35', marginLeft: 4 }}>
              -{(wakeData.deficit * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </Html>

      <mesh position={[0, -0.5, 0]}>
        <ringGeometry args={[1.2 * scale, 1.5 * scale, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
