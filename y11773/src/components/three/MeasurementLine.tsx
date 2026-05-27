import { useRef, useMemo } from 'react';
import { Line, Vector3, BufferGeometry, LineBasicMaterial } from 'three';

interface MeasurementLineProps {
  start: [number, number, number];
  end: [number, number, number];
  distance: number;
}

export function MeasurementLine({ start, end }: MeasurementLineProps) {
  const lineRef = useRef<Line>(null);

  const midpoint = useMemo(() => {
    return [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 0.3,
      (start[2] + end[2]) / 2,
    ] as [number, number, number];
  }, [start, end]);

  const geometry = useMemo(() => {
    const geo = new BufferGeometry().setFromPoints([
      new Vector3(...start),
      new Vector3(...end),
    ]);
    return geo;
  }, [start, end]);

  const material = useMemo(() => {
    return new LineBasicMaterial({
      color: '#4169e1',
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
  }, []);

  return (
    <group>
      <line ref={lineRef} geometry={geometry} material={material} />
      {[...Array(10)].map((_, i) => {
        const t = (i + 0.5) / 10;
        const pos: [number, number, number] = [
          start[0] + (end[0] - start[0]) * t,
          start[1] + (end[1] - start[1]) * t,
          start[2] + (end[2] - start[2]) * t,
        ];
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#ffd700" />
          </mesh>
        );
      })}
      <sprite position={midpoint}>
        <spriteMaterial
          color="white"
          transparent
          opacity={0.9}
        />
      </sprite>
    </group>
  );
}
