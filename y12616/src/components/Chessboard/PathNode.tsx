
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { PathNode as PathNodeType } from '../../types';
import { useDragNode } from '../../hooks/useDragNode';
import { dataSourceLabels } from '../../data/sampleData';

interface PathNodeProps {
  node: PathNodeType;
  pathId: string;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
}

export const PathNodeComponent: React.FC<PathNodeProps> = ({
  node,
  pathId,
  isSelected,
  onSelect,
}) => {
  const { isDragging, handleMouseDown, enableDrag, disableDrag } = useDragNode({
    pathId,
    nodeId: node.id,
    gridSize: 20,
    snapToGrid: true,
  });

  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (isDragging) {
      enableDrag();
    } else {
      disableDrag();
    }
    return () => disableDrag();
  }, [isDragging, enableDrag, disableDrag]);

  const hasAnomalies = node.anomalies.filter((a) => !a.isFixed).length > 0;
  const sourceColor = node.source ? dataSourceLabels[node.source]?.color : '#7f8c8d';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={handleClick}
      style={{ cursor: node.isDraggable ? 'grab' : 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isSelected && (
        <circle
          r={20}
          fill="none"
          stroke="#3498db"
          strokeWidth={2}
          strokeDasharray="4,2"
          className="animate-pulse"
        />
      )}

      {hasAnomalies && (
        <circle
          r={22}
          fill="none"
          stroke="#e74c3c"
          strokeWidth={2}
          className="animate-pulse"
        />
      )}

      <circle
        r={isSelected ? 14 : 12}
        fill={isSelected ? '#3498db' : sourceColor}
        stroke="#fff"
        strokeWidth={2}
        onMouseDown={node.isDraggable ? handleMouseDown : undefined}
        style={{
          cursor: node.isDraggable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
          filter: isDragging ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none',
          transition: 'r 0.15s ease',
        }}
      />

      {hasAnomalies ? (
        <AlertTriangle
          x={-8}
          y={-8}
          size={16}
          color="#fff"
          fill="#e74c3c"
        />
      ) : node.anomalies.length > 0 ? (
        <CheckCircle
          x={-8}
          y={-8}
          size={16}
          color="#27ae60"
          fill="#fff"
        />
      ) : null}

      {node.label && (
        <text
          y={30}
          textAnchor="middle"
          fill="#ecf0f1"
          fontSize={11}
          fontWeight={isSelected ? 'bold' : 'normal'}
        >
          {node.label}
        </text>
      )}

      {(hovered || isSelected) && (
        <g>
          <rect
            x={-45}
            y={-55}
            width={90}
            height={22}
            rx={4}
            fill="#1a252f"
            opacity={0.95}
          />
          <text
            y={-40}
            textAnchor="middle"
            fill="#ecf0f1"
            fontSize={10}
            fontWeight="bold"
          >
            ({node.x}, {node.y})
          </text>
        </g>
      )}
    </g>
  );
};
