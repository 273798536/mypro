import { useMemo } from 'react';
import { Vector3, BufferGeometry } from 'three';
import { SetbackLine as SetbackLineType } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface SetbackLineProps {
  line: SetbackLineType;
}

const TYPE_COLORS: Record<string, string> = {
  boundary: '#EF4444',
  setback: '#EAB308',
  road: '#3B82F6',
};

export function SetbackLine({ line }: SetbackLineProps) {
  const { showSetbackLines } = useAppStore();

  const geometry = useMemo(() => {
    if (!showSetbackLines) return null;
    
    const points = line.points.map(p => new Vector3(...p));
    return new BufferGeometry().setFromPoints(points);
  }, [line, showSetbackLines]);

  if (!showSetbackLines || !geometry) return null;

  const color = TYPE_COLORS[line.type] || '#ffffff';

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} linewidth={3} transparent opacity={0.8} />
      </lineSegments>
      
      {line.points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
