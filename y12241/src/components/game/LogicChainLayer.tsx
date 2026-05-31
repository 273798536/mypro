import { motion } from 'framer-motion';
import { LogicChain, Node, Wire } from '../../types';

interface LogicChainLayerProps {
  logicChains: LogicChain[];
  nodes: Node[];
  wires: Wire[];
  highlightOperationId?: string;
}

export default function LogicChainLayer({
  logicChains,
  nodes,
  wires,
  highlightOperationId,
}: LogicChainLayerProps) {
  const getElementPosition = (element: { type: 'node' | 'wire'; id: string }) => {
    if (element.type === 'node') {
      const node = nodes.find(n => n.id === element.id);
      if (node) return { x: node.x, y: node.y };
    } else {
      const wire = wires.find(w => w.id === element.id);
      if (wire) {
        const fromNode = nodes.find(n => n.id === wire.fromNodeId);
        const toNode = nodes.find(n => n.id === wire.toNodeId);
        if (fromNode && toNode) {
          return {
            x: (fromNode.x + toNode.x) / 2,
            y: (fromNode.y + toNode.y) / 2,
          };
        }
      }
    }
    return { x: 0, y: 0 };
  };

  const visibleChains = highlightOperationId
    ? logicChains.filter(lc => lc.operationId === highlightOperationId)
    : logicChains.slice(-3);

  return (
    <g className="logic-chain-layer pointer-events-none">
      {visibleChains.map((chain, index) => {
        const sourcePos = getElementPosition(chain.sourceElement);
        const resultPos = getElementPosition(chain.resultElement);

        if (sourcePos.x === 0 || resultPos.x === 0) return null;

        const midX = (sourcePos.x + resultPos.x) / 2;
        const midY = (sourcePos.y + resultPos.y) / 2 - 50;
        const judgmentY = midY - 15;

        const delay = index * 0.2;

        return (
          <g key={chain.id} className="logic-chain-group">
            <motion.path
              d={`M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${resultPos.x} ${resultPos.y}`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 0.6 }}
              transition={{ duration: 0.6, delay, ease: 'easeOut' }}
            />

            <motion.path
              d={`M ${sourcePos.x} ${sourcePos.y} L ${midX} ${judgmentY}`}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 0.8 }}
              transition={{ duration: 0.4, delay: delay + 0.3, ease: 'easeOut' }}
            />

            <motion.path
              d={`M ${midX} ${judgmentY} L ${resultPos.x} ${resultPos.y}`}
              fill="none"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 0.8 }}
              transition={{ duration: 0.4, delay: delay + 0.5, ease: 'easeOut' }}
            />

            <motion.g
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: delay + 0.4 }}
            >
              <rect
                x={midX - 60}
                y={judgmentY - 12}
                width={120}
                height={24}
                rx={4}
                fill="rgba(15, 23, 42, 0.9)"
                stroke="#F59E0B"
                strokeWidth={1}
              />
              <text
                x={midX}
                y={judgmentY + 4}
                textAnchor="middle"
                className="fill-amber-400 text-[10px] font-mono"
              >
                {chain.judgment.length > 12 ? chain.judgment.slice(0, 12) + '...' : chain.judgment}
              </text>
            </motion.g>

            <motion.circle
              cx={sourcePos.x}
              cy={sourcePos.y}
              r={6}
              fill="#3B82F6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay }}
            />
            <text
              x={sourcePos.x}
              y={sourcePos.y - 15}
              textAnchor="middle"
              className="fill-blue-400 text-[9px] font-mono"
            >
              来源
            </text>

            <motion.circle
              cx={resultPos.x}
              cy={resultPos.y}
              r={6}
              fill="#10B981"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: delay + 0.6 }}
            />
            <text
              x={resultPos.x}
              y={resultPos.y - 15}
              textAnchor="middle"
              className="fill-green-400 text-[9px] font-mono"
            >
              结果
            </text>
          </g>
        );
      })}
    </g>
  );
}
