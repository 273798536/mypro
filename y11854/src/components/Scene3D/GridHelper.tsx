import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useStore } from '@/store/useStore';

export function GridHelper() {
  const gridVisible = useStore((s) => s.gridVisible);

  const gridLines = useMemo(() => {
    if (!gridVisible) return [];

    const lines: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const size = 10;
    const step = 1;

    for (let i = -size; i <= size; i += step) {
      lines.push({ start: [i, -size, 0], end: [i, size, 0] });
      lines.push({ start: [-size, i, 0], end: [size, i, 0] });
    }

    return lines;
  }, [gridVisible]);

  if (!gridVisible) return null;

  return (
    <group>
      {gridLines.map((line, idx) => {
        const isAxis = line.start[0] === 0 || line.start[1] === 0;
        return (
          <Line
            key={idx}
            points={[line.start, line.end]}
            color={isAxis ? '#334466' : '#1a2240'}
            lineWidth={isAxis ? 1.5 : 0.5}
            transparent
            opacity={isAxis ? 0.6 : 0.3}
          />
        );
      })}
    </group>
  );
}
