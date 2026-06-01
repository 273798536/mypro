import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ProductBatch } from '../../types';
import { useStore } from '../../store/useStore';

interface ProductProps {
  product: ProductBatch;
  isSelected: boolean;
}

export function Product({ product, isSelected }: ProductProps) {
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const setSelection = useStore((state) => state.setSelection);

  const sensitivityColors = {
    high: '#FF6B6B',
    medium: '#FFD93D',
    low: '#6BCB77',
  };

  const sensitivityLabels = {
    high: '高敏感',
    medium: '中敏感',
    low: '低敏感',
  };

  useFrame((state) => {
    if (glowRef.current && product.isBlocking) {
      const intensity = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = intensity;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelection('product', product.id);
  };

  const showLabel = isSelected || hovered;
  const { width, height, depth } = product.dimensions;

  return (
    <group
      ref={groupRef}
      position={product.position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={product.isBlocking ? '#FFA502' : sensitivityColors[product.temperatureSensitivity]}
          emissive={isSelected ? '#00D4FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : 0}
          transparent
          opacity={0.7}
        />
      </mesh>

      {product.isBlocking && (
        <mesh ref={glowRef} position={[0, height / 2, 0]}>
          <boxGeometry args={[width * 1.1, height * 1.1, depth * 1.1]} />
          <meshBasicMaterial
            color="#FF4757"
            transparent
            opacity={0.3}
            side={2}
          />
        </mesh>
      )}

      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width * 1.02, height * 1.02, depth * 1.02]} />
        <meshBasicMaterial
          color={sensitivityColors[product.temperatureSensitivity]}
          transparent
          opacity={0.15}
          wireframe
        />
      </mesh>

      {product.isBlocking && (
        <Html position={[0, height + 0.3, 0]} center distanceFactor={10}>
          <div className="bg-red-900/90 border border-red-500 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
            ⚠ 遮挡探头
          </div>
        </Html>
      )}

      {showLabel && (
        <Html position={[width / 2 + 0.3, height / 2, 0]} center distanceFactor={8}>
          <div className="bg-slate-900/95 border border-slate-600/50 rounded px-3 py-2 text-xs whitespace-nowrap font-mono min-w-[160px]">
            <div className="text-slate-200 font-medium mb-1 truncate max-w-[180px]">
              {product.name}
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400">温敏等级:</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${sensitivityColors[product.temperatureSensitivity]}20`,
                  color: sensitivityColors[product.temperatureSensitivity],
                }}
              >
                {sensitivityLabels[product.temperatureSensitivity]}
              </span>
            </div>
            <div className="text-slate-400 text-[10px]">
              入库: {product.storageTime}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
