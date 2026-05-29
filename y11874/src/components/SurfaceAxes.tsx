import { Line, Text } from '@react-three/drei';
import { useSurfaceStore } from '@/store/useSurfaceStore';

function AxisLine({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={2}
    />
  );
}

export default function SurfaceAxes() {
  const surfaceData = useSurfaceStore((s) => s.surfaceData);
  if (!surfaceData) return null;

  const { xMin, xMax, yMin, yMax, zMin, zMax } = surfaceData;
  const padding = 0.3;
  const xLen = xMax + padding;
  const yLen = yMax + padding;
  const zUp = Math.min(zMax + padding, 10);

  return (
    <group>
      <AxisLine start={[-xLen, 0, 0]} end={[xLen, 0, 0]} color="#ff4444" />
      <AxisLine start={[0, 0, -yLen]} end={[0, 0, yLen]} color="#44ff44" />
      <AxisLine start={[0, zMin - padding, 0]} end={[0, zUp, 0]} color="#4488ff" />

      <Text position={[xLen + 0.3, 0, 0]} fontSize={0.35} color="#ff6666">X</Text>
      <Text position={[0, 0, yLen + 0.3]} fontSize={0.35} color="#66ff66">Y</Text>
      <Text position={[0, zUp + 0.3, 0]} fontSize={0.35} color="#6688ff">Z</Text>

      <gridHelper
        args={[Math.max(xLen, yLen) * 2, 20, '#1a2a3a', '#0d1520']}
        position={[0, zMin - padding, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}
