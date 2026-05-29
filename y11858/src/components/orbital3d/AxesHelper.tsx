import { Line } from '@react-three/drei';

export function AxesHelper() {
  const length = 8;

  return (
    <group>
      <Line
        points={[[-length, 0, 0], [length, 0, 0]]}
        color="#ef4444"
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      <Line
        points={[[0, -length, 0], [0, length, 0]]}
        color="#22c55e"
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      <Line
        points={[[0, 0, -length], [0, 0, length]]}
        color="#3b82f6"
        lineWidth={1}
        transparent
        opacity={0.4}
      />
    </group>
  );
}
