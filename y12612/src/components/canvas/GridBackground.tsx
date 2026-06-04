import { Rect, Line } from 'react-konva';

interface GridBackgroundProps {
  width: number;
  height: number;
  gridSize?: number;
}

export function GridBackground({ width, height, gridSize = 40 }: GridBackgroundProps) {
  const lines = [];

  for (let i = 0; i <= width / gridSize; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * gridSize, 0, i * gridSize, height]}
        stroke={i % 5 === 0 ? '#cbd5e0' : '#edf2f7'}
        strokeWidth={i % 5 === 0 ? 1 : 0.5}
      />
    );
  }

  for (let i = 0; i <= height / gridSize; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * gridSize, width, i * gridSize]}
        stroke={i % 5 === 0 ? '#cbd5e0' : '#edf2f7'}
        strokeWidth={i % 5 === 0 ? 1 : 0.5}
      />
    );
  }

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#f7fafc" />
      {lines}
    </>
  );
}
