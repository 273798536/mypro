
import React from 'react';
import type { PathNode } from '../../types';

interface PathLineProps {
  nodes: PathNode[];
  color?: string;
  isSelected?: boolean;
}

export const PathLine: React.FC<PathLineProps> = ({
  nodes,
  color = '#e67e22',
  isSelected = false,
}) => {
  if (nodes.length < 2) return null;

  const pathData = nodes
    .map((node, index) => {
      const prefix = index === 0 ? 'M' : 'L';
      return `${prefix} ${node.x} ${node.y}`;
    })
    .join(' ');

  return (
    <g>
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={isSelected ? 4 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isSelected ? 1 : 0.7}
        style={{
          filter: isSelected ? 'drop-shadow(0 0 8px rgba(230, 126, 34, 0.5))' : 'none',
        }}
      />

      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={isSelected ? 8 : 6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.15}
      />

      {nodes.slice(0, -1).map((node, index) => {
        const nextNode = nodes[index + 1];
        const midX = (node.x + nextNode.x) / 2;
        const midY = (node.y + nextNode.y) / 2;
        const angle = Math.atan2(nextNode.y - node.y, nextNode.x - node.x) * (180 / Math.PI);

        return (
          <g key={`arrow-${index}`} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
            <polygon
              points="0,-5 8,0 0,5"
              fill={color}
              opacity={isSelected ? 0.9 : 0.6}
            />
          </g>
        );
      })}
    </g>
  );
};
