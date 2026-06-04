
import React from 'react';
import { Grid } from './Grid';
import { PathLine } from './PathLine';
import { PathNodeComponent } from './PathNode';
import { AnomalyLayer } from './AnomalyLayer';
import type { TransportPath } from '../../types';
import { usePathStore } from '../../store/usePathStore';
import { dataSourceLabels } from '../../data/sampleData';

interface ChessboardProps {
  width?: number;
  height?: number;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  width = 600,
  height = 500,
}) => {
  const {
    paths,
    selectedPathId,
    selectedNodeId,
    selectPath,
    selectNode,
    selectAnomaly,
    getFilteredPaths,
  } = usePathStore();

  const filteredPaths = getFilteredPaths();

  const handleAnomalyClick = (pathId: string, nodeId: string, anomalyId: string) => {
    selectPath(pathId);
    selectNode(nodeId);
    selectAnomaly(anomalyId);
  };

  const handleBackgroundClick = () => {
    selectNode(null);
    selectAnomaly(null);
  };

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
      <svg
        id="chessboard-svg"
        width={width}
        height={height}
        onClick={handleBackgroundClick}
        className="block"
      >
        <defs>
          <linearGradient id="board-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="url(#board-bg)" />
        <Grid width={width} height={height} gridSize={20} />

        {filteredPaths.map((path: TransportPath) => (
          <g key={path.id}>
            <PathLine
              nodes={path.nodes}
              color={dataSourceLabels[path.source.type]?.color || '#e67e22'}
              isSelected={path.id === selectedPathId}
            />
          </g>
        ))}

        {filteredPaths.map((path: TransportPath) => (
          <g key={`nodes-${path.id}`}>
            {path.nodes.map((node) => (
              <PathNodeComponent
                key={node.id}
                node={node}
                pathId={path.id}
                isSelected={node.id === selectedNodeId && path.id === selectedPathId}
                onSelect={(nodeId) => {
                  selectPath(path.id);
                  selectNode(nodeId);
                }}
              />
            ))}
          </g>
        ))}

        <AnomalyLayer paths={filteredPaths} onAnomalyClick={handleAnomalyClick} />
      </svg>

      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded text-xs text-slate-300">
          矿区棋盘 · {filteredPaths.length} 条路径
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-slate-400">
        <span>比例尺</span>
        <div className="w-16 h-1 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 rounded" />
        <span>100m</span>
      </div>
    </div>
  );
};
