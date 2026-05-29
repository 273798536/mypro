import { useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

function ArrowHead({ position, direction, color }: {
  position: [number, number, number];
  direction: [number, number, number];
  color: string;
}) {
  const coneRef = useRef<THREE.Mesh>(null);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(...direction).normalize();
    q.setFromUnitVectors(up, dir);
    return q;
  }, [direction]);

  return (
    <mesh position={position} quaternion={quaternion} ref={coneRef}>
      <coneGeometry args={[0.06, 0.18, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

export function FieldLines() {
  const fieldLines = useStore((s) => s.fieldLines);

  const lineData = useMemo(() => {
    const result: {
      points: [number, number, number][];
      arrows: { position: [number, number, number]; direction: [number, number, number] }[];
    }[] = [];

    for (const line of fieldLines) {
      if (line.length < 2) continue;

      const sampledPoints: [number, number, number][] = [];
      const step = Math.max(1, Math.floor(line.length / 60));
      for (let i = 0; i < line.length; i += step) {
        sampledPoints.push(line[i]);
      }
      if (sampledPoints[0] !== line[line.length - 1]) {
        sampledPoints.push(line[line.length - 1]);
      }

      const arrows: { position: [number, number, number]; direction: [number, number, number] }[] = [];
      const arrowInterval = Math.max(5, Math.floor(line.length / 4));
      for (let i = arrowInterval; i < line.length - 1; i += arrowInterval) {
        const prev = line[i - 1];
        const next = line[i + 1];
        const dx = next[0] - prev[0];
        const dy = next[1] - prev[1];
        const dz = next[2] - prev[2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0.0001) {
          arrows.push({
            position: line[i],
            direction: [dx / len, dy / len, dz / len],
          });
        }
      }

      result.push({ points: sampledPoints, arrows });
    }

    return result;
  }, [fieldLines]);

  return (
    <group>
      {lineData.map((data, idx) => (
        <group key={idx}>
          <Line
            points={data.points}
            color="#00f0ff"
            lineWidth={1.5}
            transparent
            opacity={0.7}
          />
          {data.arrows.map((arrow, aIdx) => (
            <ArrowHead
              key={aIdx}
              position={arrow.position}
              direction={arrow.direction}
              color="#00f0ff"
            />
          ))}
        </group>
      ))}
    </group>
  );
}
