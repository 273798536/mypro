
import { useMemo } from 'react';
import * as THREE from 'three';

interface FlowLinesProps {
  velocity: number;
  angleOfAttack: number;
}

export function FlowLines({ velocity, angleOfAttack }: FlowLinesProps) {
  const lineData = useMemo(() => {
    const flowLines: { positions: Float32Array; color: THREE.Color }[] = [];
    const alphaRad = (angleOfAttack * Math.PI) / 180;

    const numLines = 8;
    const lineLength = 4;
    const startX = -2;
    const segments = 40;

    for (let i = 0; i < numLines; i++) {
      const yOffset = (i - numLines / 2) * 0.2 + 0.1;
      const positions = new Float32Array((segments + 1) * 3);

      for (let s = 0; s <= segments; s++) {
        const t = (s / segments) * lineLength;
        const x = startX + t;
        const baseY = yOffset + t * Math.tan(alphaRad);
        const disturbance = Math.sin(t * 2) * 0.05 * (velocity / 50);

        positions[s * 3] = x;
        positions[s * 3 + 1] = baseY + disturbance;
        positions[s * 3 + 2] = 0;
      }

      const intensity = Math.min(1, velocity / 100);
      const color = new THREE.Color().setHSL(0.55, 0.8, 0.3 + intensity * 0.3);

      flowLines.push({ positions, color });
    }

    return flowLines;
  }, [velocity, angleOfAttack]);

  return (
    <group>
      {lineData.map((data, idx) => (
        <line key={idx}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={data.positions.length / 3}
              array={data.positions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={data.color} transparent opacity={0.6} />
        </line>
      ))}
    </group>
  );
}
