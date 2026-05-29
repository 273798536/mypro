import { useRef, useMemo } from 'react';
import { GridHelper } from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';

interface GroundGridProps {
  size?: number;
  divisions?: number;
}

export function GroundGrid({ size = 10000, divisions = 100 }: GroundGridProps) {
  const gridRef = useRef<GridHelper>(null);
  const visible = useAppStore(state => state.visibleLayers.grid);

  const { gridMaterial, sectionMaterial } = useMemo(() => {
    return {
      gridMaterial: { color: 0x1e3a5f, transparent: true, opacity: 0.3 },
      sectionMaterial: { color: 0x3b82f6, transparent: true, opacity: 0.5 }
    };
  }, []);

  useFrame(() => {
    if (gridRef.current) {
      gridRef.current.position.y = 0;
    }
  });

  if (!visible) return null;

  return (
    <group>
      <gridHelper
        ref={gridRef}
        args={[size, divisions, 0x1e3a5f, 0x1e293b]}
        position={[0, 0, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color={0x0a1628}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}
