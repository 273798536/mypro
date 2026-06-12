import { useMemo } from 'react';
import * as THREE from 'three';

export default function DepthGrid() {
  const lines = useMemo(() => {
    const result: { y: number; opacity: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      result.push({ y: -i * 2, opacity: 0.06 - i * 0.004 });
    }
    return result;
  }, []);

  return (
    <group>
      {lines.map((line, i) => (
        <gridHelper
          key={i}
          args={[100, 20, '#0088cc', '#005599']}
          position={[0, line.y, 0]}
          material-transparent
          material-opacity={line.opacity}
        />
      ))}
    </group>
  );
}
