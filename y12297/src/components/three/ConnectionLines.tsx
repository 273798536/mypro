import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProductNode3D } from '../../../shared/types';
import { generateConnections } from '../../utils/3dLayout';

interface ConnectionLinesProps {
  nodes: ProductNode3D[];
}

export function ConnectionLines({ nodes }: ConnectionLinesProps) {
  const linesRef = useRef<THREE.Group>(null);

  const connections = useMemo(() => generateConnections(nodes), [nodes]);

  const lineData = useMemo(() => {
    return connections.map((conn, i) => {
      const positions = new Float32Array([
        conn.start[0], conn.start[1], conn.start[2],
        conn.end[0], conn.end[1], conn.end[2],
      ]);
      const color = new THREE.Color(conn.color);
      return { positions, color, opacity: conn.opacity, index: i };
    });
  }, [connections]);

  useFrame((state) => {
    if (!linesRef.current) return;
    const time = state.clock.getElapsedTime();

    linesRef.current.children.forEach((child, i) => {
      const line = child as THREE.Line;
      if (line.material) {
        const mat = line.material as THREE.LineBasicMaterial;
        const baseOpacity = lineData[i]?.opacity || 0.2;
        mat.opacity = baseOpacity * (0.7 + Math.sin(time * 0.5 + i * 0.3) * 0.3);
      }
    });
  });

  return (
    <group ref={linesRef}>
      {lineData.map((data, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={data.positions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={data.color}
            transparent
            opacity={data.opacity}
            linewidth={1}
          />
        </line>
      ))}
    </group>
  );
}
