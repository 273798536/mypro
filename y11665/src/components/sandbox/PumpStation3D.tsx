import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PumpStation } from '@/types';

interface PumpStation3DProps {
  station: PumpStation;
}

export default function PumpStation3D({ station }: PumpStation3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && station.status === 'running') {
      groupRef.current.children.forEach((child, i) => {
        if (i === 1) {
          child.rotation.y += delta * 2;
        }
      });
    }
  });

  const color = station.status === 'running' ? '#00FF88' : station.status === 'standby' ? '#FFB547' : '#FF4444';

  return (
    <group ref={groupRef} position={station.position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.6} roughness={0.4} />
      </mesh>

      {station.status === 'running' && (
        <mesh position={[0, 0.9, 0]}>
          <torusGeometry args={[0.25, 0.04, 8, 16]} />
          <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={1} />
        </mesh>
      )}

      <pointLight color={color} intensity={station.status === 'running' ? 3 : 1} distance={5} />

      <Html position={[0, 1.5, 0]} center distanceFactor={15}>
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
          <div style={{ color, fontWeight: 600 }}>{station.name}</div>
          <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
            供压: {station.supplyPressure.toFixed(2)} MPa
          </div>
          <div style={{ fontSize: '9px', opacity: 0.7 }}>
            {station.status === 'running' ? '运行中' : station.status === 'standby' ? '待机' : '故障'}
          </div>
        </div>
      </Html>
    </group>
  );
}
