import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Valve } from '@/types';
import { useWaterStore } from '@/store/useWaterStore';

interface Valve3DProps {
  valve: Valve;
}

export default function Valve3D({ valve }: Valve3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { toggleValve, saveValveState, selectedValveId, selectValve } = useWaterStore();

  useFrame((_, delta) => {
    if (meshRef.current) {
      const scale = valve.isOpen ? 1 : 0.7;
      meshRef.current.scale.lerp({ x: scale, y: scale, z: scale } as any, delta * 5);
      if (!valve.isSaved) {
        meshRef.current.rotation.y += delta * 0.5;
      }
    }
  });

  const color = valve.isOpen ? '#FFB547' : '#FF6B6B';
  const unsavedColor = !valve.isSaved ? '#FFDD00' : color;

  const isSelected = selectedValveId === valve.id;

  return (
    <group position={valve.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          toggleValve(valve.id);
          selectValve(valve.id);
        }}
      >
        <cylinderGeometry args={[0.18, 0.25, 0.3, 8]} />
        <meshStandardMaterial
          color={unsavedColor}
          emissive={unsavedColor}
          emissiveIntensity={valve.isOpen ? 0.8 : 0.4}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {isSelected && (
        <mesh>
          <torusGeometry args={[0.35, 0.03, 8, 24]} />
          <meshBasicMaterial color="#00D4FF" transparent opacity={0.6} />
        </mesh>
      )}

      <Html position={[0, 0.6, 0]} center distanceFactor={15}>
        <div
          style={{
            background: 'rgba(14, 42, 71, 0.9)',
            border: `1px solid ${unsavedColor}`,
            borderRadius: '4px',
            padding: '3px 8px',
            color: '#fff',
            fontSize: '10px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: unsavedColor, fontWeight: 600 }}>{valve.id}</span>
          <span style={{ marginLeft: 6, opacity: 0.8 }}>
            {valve.isOpen ? '开' : '关'}
            {!valve.isSaved && ' (未保存)'}
          </span>
        </div>
      </Html>

      {!valve.isSaved && (
        <pointLight color="#FFDD00" intensity={2} distance={3} />
      )}
    </group>
  );
}
