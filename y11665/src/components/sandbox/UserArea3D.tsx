import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { UserArea } from '@/types';
import { getPressureColor } from '@/hooks/usePressureCalc';
import { useWaterStore } from '@/store/useWaterStore';

interface UserArea3DProps {
  area: UserArea;
}

export default function UserArea3D({ area }: UserArea3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { pressureThreshold } = useWaterStore();

  useFrame((_, delta) => {
    if (meshRef.current) {
      const isLow = area.currentPressure < pressureThreshold && area.currentPressure >= 0;
      const isBad = area.currentPressure < 0;
      if (isLow || isBad) {
        meshRef.current.scale.y = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
      }
    }
  });

  const color = getPressureColor(area.currentPressure, pressureThreshold, area.currentPressure < 0 ? 'bad' : 'good');

  return (
    <group position={area.position}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.6, 0.6, 0.8, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.5}
          side={2}
        />
      </mesh>

      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.02, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      <Html position={[0, 1.2, 0]} center distanceFactor={15}>
        <div
          style={{
            background: 'rgba(14, 42, 71, 0.9)',
            border: `1px solid ${color}`,
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#fff',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          <div style={{ color, fontWeight: 600 }}>{area.name}</div>
          <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
            {area.currentPressure < 0 ? '异常' : `${area.currentPressure.toFixed(2)} MPa`}
          </div>
        </div>
      </Html>
    </group>
  );
}
