import { motion, AnimatePresence } from 'framer-motion';
import type { GraphNode, GraphEdge, RiskLevel } from '../types';
import {
  getRiskLevelColor,
  getNodeTypeIcon,
  getNodeTypeText,
  getRiskLevelText,
} from '../utils';
import { useGameStore } from '../store/gameStore';

interface RelationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeStates: Record<string, RiskLevel>;
  showCorrectAnswers?: boolean;
  highlightNodeIds?: string[];
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

export function RelationGraph({
  nodes,
  edges,
  nodeStates,
  showCorrectAnswers = false,
  highlightNodeIds = [],
  onNodeClick,
  width = 800,
  height = 600,
}: RelationGraphProps) {
  const selectedNodeId = useGameStore((state) => state.selectedNodeId);
  const setSelectedNode = useGameStore((state) => state.setSelectedNode);

  const getNodeColor = (node: GraphNode) => {
    if (showCorrectAnswers) {
      return getRiskLevelColor(node.trueRiskLevel);
    }
    return getRiskLevelColor(nodeStates[node.id] || 'unknown');
  };

  const getNodeGlow = (node: GraphNode) => {
    const state = nodeStates[node.id] || 'unknown';
    if (state !== 'unknown') {
      return `drop-shadow(0 0 8px ${getNodeColor(node)})`;
    }
    return 'none';
  };

  const isHighlighted = (nodeId: string) => {
    return highlightNodeIds.includes(nodeId);
  };

  const isConnectedToSelected = (nodeId: string) => {
    if (!selectedNodeId) return false;
    return edges.some(
      (e) =>
        (e.sourceId === selectedNodeId && e.targetId === nodeId) ||
        (e.sourceId === nodeId && e.targetId === selectedNodeId)
    );
  };

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodeId === nodeId) {
      setSelectedNode(null);
    } else {
      setSelectedNode(nodeId);
    }
    onNodeClick?.(nodeId);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#1E293B"
              strokeWidth="1"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g className="edges">
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.sourceId);
            const targetNode = nodes.find((n) => n.id === edge.targetId);
            if (!sourceNode || !targetNode) return null;

            const isHighlightedEdge =
              selectedNodeId &&
              (edge.sourceId === selectedNodeId ||
                edge.targetId === selectedNodeId);

            return (
              <g key={edge.id}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={isHighlightedEdge ? '#3B82F6' : 'url(#lineGradient)'}
                  strokeWidth={isHighlightedEdge ? 3 : 2}
                  opacity={isHighlightedEdge ? 1 : 0.5}
                  className="transition-all duration-300"
                />
                {isHighlightedEdge && (
                  <motion.circle
                    r={4}
                    fill="#3B82F6"
                    initial={{ x: sourceNode.x, y: sourceNode.y }}
                    animate={{
                      x: targetNode.x,
                      y: targetNode.y,
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                )}
              </g>
            );
          })}
        </g>

        <g className="nodes">
          {nodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const connected = isConnectedToSelected(node.id);
            const highlighted = isHighlighted(node.id);
            const color = getNodeColor(node);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.id)}
                style={{ cursor: 'pointer' }}
                className="group"
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.circle
                      initial={{ r: 30, opacity: 0.5 }}
                      animate={{ r: 45, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      fill={color}
                    />
                  )}
                </AnimatePresence>

                {highlighted && (
                  <motion.circle
                    r={38}
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                <motion.circle
                  r={28}
                  fill="#0F172A"
                  stroke={color}
                  strokeWidth={isSelected ? 4 : connected ? 3 : 2}
                  style={{
                    filter: getNodeGlow(node),
                    opacity: selectedNodeId && !isSelected && !connected ? 0.4 : 1,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="transition-opacity duration-300"
                />

                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="20"
                  className="pointer-events-none"
                >
                  {getNodeTypeIcon(node.type)}
                </text>

                <text
                  y={45}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#E2E8F0"
                  fontWeight="600"
                  className="pointer-events-none font-mono"
                >
                  {node.name}
                </text>

                <text
                  y={60}
                  textAnchor="middle"
                  fontSize="10"
                  fill={color}
                  fontWeight="500"
                  className="pointer-events-none"
                >
                  {showCorrectAnswers
                    ? `✓ ${getRiskLevelText(node.trueRiskLevel)}`
                    : getRiskLevelText(nodeStates[node.id] || 'unknown')}
                </text>

                {node.chainLength && (
                  <text
                    y={-40}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#94A3B8"
                    className="pointer-events-none"
                  >
                    关系链 {node.chainLength}度
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <AnimatePresence>
        {selectedNodeId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-4 border border-slate-700"
          >
            {(() => {
              const node = nodes.find((n) => n.id === selectedNodeId);
              if (!node) return null;
              const state = nodeStates[node.id] || 'unknown';

              return (
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 shrink-0"
                    style={{
                      borderColor: getNodeColor(node),
                      backgroundColor: `${getNodeColor(node)}20`,
                    }}
                  >
                    {getNodeTypeIcon(node.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-white">
                        {node.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {getNodeTypeText(node.type)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${getNodeColor(node)}30`,
                          color: getNodeColor(node),
                        }}
                      >
                        {showCorrectAnswers
                          ? getRiskLevelText(node.trueRiskLevel)
                          : getRiskLevelText(state)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{node.description}</p>
                    {node.falsePositiveType && (
                      <div className="mt-2 p-2 bg-amber-900/30 border border-amber-700/50 rounded text-xs text-amber-300">
                        <span className="font-medium">⚠️ 注意：</span>
                        {node.falsePositiveReason}
                      </div>
                    )}
                    {node.tagLagInfo && (
                      <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-300">
                        <span className="font-medium">🏷️ 标签更新：</span>
                        从 {getRiskLevelText(node.tagLagInfo.oldTag)} 更新为{' '}
                        {getRiskLevelText(node.tagLagInfo.newTag)}
                        （{node.tagLagInfo.updateTime}）
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
