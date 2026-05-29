import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ClipPlanes() {
  const sliceSettings = useAppStore((s) => s.sliceSettings);
  const gridSize = useAppStore((s) => s.vizSettings.gridSize);

  const planeGeo = useMemo(() => [1, 1] as [number, number], []);

  const size = gridSize * 2;

  return (
    <group>
      {sliceSettings.xEnabled && (
        <mesh position={[sliceSettings.xPosition, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.08}
            side={2}
            depthWrite={false}
          />
        </mesh>
      )}
      {sliceSettings.yEnabled && (
        <mesh position={[0, sliceSettings.yPosition, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            color="#7c3aed"
            transparent
            opacity={0.08}
            side={2}
            depthWrite={false}
          />
        </mesh>
      )}
      {sliceSettings.zEnabled && (
        <mesh position={[0, 0, sliceSettings.zPosition]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            color="#f97316"
            transparent
            opacity={0.08}
            side={2}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
