
import React from 'react';
import { forbiddenZones } from '../../data/sampleData';

interface GridProps {
  width: number;
  height: number;
  gridSize?: number;
}

export const Grid: React.FC<GridProps> = ({ width, height, gridSize = 20 }) => {
  const horizontalLines = [];
  const verticalLines = [];

  for (let y = 0; y <= height; y += gridSize) {
    horizontalLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={y % (gridSize * 5) === 0 ? '#34495e' : '#2c3e50'}
        strokeWidth={y % (gridSize * 5) === 0 ? 1 : 0.5}
        opacity={y % (gridSize * 5) === 0 ? 0.6 : 0.3}
      />
    );
  }

  for (let x = 0; x <= width; x += gridSize) {
    verticalLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={x % (gridSize * 5) === 0 ? '#34495e' : '#2c3e50'}
        strokeWidth={x % (gridSize * 5) === 0 ? 1 : 0.5}
        opacity={x % (gridSize * 5) === 0 ? 0.6 : 0.3}
      />
    );
  }

  return (
    <g>
      <defs>
        <pattern id="grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#2c3e50" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      </defs>

      <rect x={0} y={0} width={width} height={height} fill="url(#grid-pattern)" />

      {horizontalLines}
      {verticalLines}

      {forbiddenZones.map((zone, index) => (
        <g key={`forbidden-${index}`}>
          <rect
            x={zone.x}
            y={zone.y}
            width={zone.width}
            height={zone.height}
            fill="#e74c3c"
            fillOpacity={0.15}
            stroke="#e74c3c"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          <text
            x={zone.x + zone.width / 2}
            y={zone.y + zone.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e74c3c"
            fontSize={10}
            fontWeight="bold"
          >
            {zone.label}
          </text>
        </g>
      ))}

      {[0, 100, 200, 300, 400, 500].map((x) => (
        <text
          key={`label-x-${x}`}
          x={x}
          y={height - 5}
          textAnchor="middle"
          fill="#7f8c8d"
          fontSize={9}
        >
          {x}
        </text>
      ))}
      {[0, 100, 200, 300, 400].map((y) => (
        <text
          key={`label-y-${y}`}
          x={15}
          y={y + 4}
          textAnchor="start"
          fill="#7f8c8d"
          fontSize={9}
        >
          {y}
        </text>
      ))}
    </g>
  );
};
