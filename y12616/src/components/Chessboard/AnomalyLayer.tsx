
import React from 'react';
import type { TransportPath } from '../../types';
import { anomalyTypeLabels } from '../../data/sampleData';

interface AnomalyLayerProps {
  paths: TransportPath[];
  onAnomalyClick: (pathId: string, nodeId: string, anomalyId: string) => void;
}

export const AnomalyLayer: React.FC<AnomalyLayerProps> = ({ paths, onAnomalyClick }) => {
  return (
    <g>
      {paths.map((path) =>
        path.nodes.map((node) =>
          node.anomalies
            .filter((a) => !a.isFixed)
            .map((anomaly, index) => {
              const color = anomalyTypeLabels[anomaly.type]?.color || '#e74c3c';
              const offsetX = (index % 2 === 0 ? 1 : -1) * 25;
              const offsetY = -50 - Math.floor(index / 2) * 24;

              return (
                <g
                  key={anomaly.id}
                  transform={`translate(${node.x + offsetX}, ${node.y + offsetY})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnomalyClick(path.id, node.id, anomaly.id);
                  }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={80}
                    height={20}
                    rx={4}
                    fill={color}
                    opacity={0.9}
                    className="hover:opacity-100 transition-opacity"
                  />
                  <polygon
                    points={`${40 - offsetX > 0 ? 0 : 76},20 ${40 - offsetX > 0 ? 8 : 68},20 ${40 - offsetX > 0 ? 4 : 72},26`}
                    fill={color}
                    opacity={0.9}
                  />
                  <text
                    x={40}
                    y={14}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={9}
                    fontWeight="bold"
                  >
                    {anomalyTypeLabels[anomaly.type]?.label || '异常'}
                  </text>
                </g>
              );
            })
        )
      )}
    </g>
  );
};
