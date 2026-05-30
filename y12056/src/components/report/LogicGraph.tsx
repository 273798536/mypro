import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Connection, ConditionCard, LemmaCard, ConclusionSlot } from '@/types/game';

interface LogicGraphProps {
  connections: Connection[];
  cards: (ConditionCard | LemmaCard)[];
  slots: ConclusionSlot[];
}

interface NodePosition {
  x: number;
  y: number;
  id: string;
  type: string;
  content: string;
  isCorrect: boolean;
}

export default function LogicGraph({ connections, cards, slots }: LogicGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { nodes, width, height } = useMemo(() => {
    const conditionNodes: NodePosition[] = cards
      .filter(c => c.type === 'condition')
      .map((c, i) => ({
        id: c.id,
        type: 'condition',
        x: 80,
        y: 80 + i * 90,
        content: c.content,
        isCorrect: true,
      }));

    const lemmaNodes: NodePosition[] = cards
      .filter(c => c.type === 'lemma')
      .map((c, i) => ({
        id: c.id,
        type: 'lemma',
        x: 350,
        y: 80 + i * 90,
        content: c.name,
        isCorrect: c.isCorrect,
      }));

    const conclusionNodes: NodePosition[] = slots.map((s, i) => ({
      id: s.id,
      type: 'conclusion',
      x: 620,
      y: 80 + i * 90,
      content: s.content,
      isCorrect: true,
    }));

    const allNodes = [...conditionNodes, ...lemmaNodes, ...conclusionNodes];
    const maxY = Math.max(...allNodes.map(n => n.y)) + 100;

    return {
      nodes: allNodes,
      width: 750,
      height: Math.max(maxY, 400),
    };
  }, [cards, slots]);

  const getNodeColor = (type: string, isCorrect: boolean) => {
    if (!isCorrect) return 'bg-accent-rose border-accent-rose';
    switch (type) {
      case 'condition':
        return 'bg-accent-amber/10 border-accent-amber';
      case 'lemma':
        return 'bg-accent-emerald/10 border-accent-emerald';
      case 'conclusion':
        return 'bg-primary/10 border-primary';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getNodeTextColor = (type: string, isCorrect: boolean) => {
    if (!isCorrect) return 'text-accent-rose';
    switch (type) {
      case 'condition':
        return 'text-accent-amber';
      case 'lemma':
        return 'text-accent-emerald';
      case 'conclusion':
        return 'text-primary';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectionPath = (from: NodePosition, to: NodePosition) => {
    const startX = from.x + 100;
    const startY = from.y + 25;
    const endX = to.x;
    const endY = to.y + 25;
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'condition':
        return '条件';
      case 'lemma':
        return '引理';
      case 'conclusion':
        return '结论';
      default:
        return type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-card p-6 border-2 border-neutral-ivory overflow-auto"
    >
      <h3 className="text-lg font-bold text-neutral-ink mb-6">逻辑推理链</h3>

      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="absolute inset-0">
          <defs>
            <marker
              id="arrowhead-correct"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
            </marker>
            <marker
              id="arrowhead-wrong"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
          </defs>

          {connections.map((conn, idx) => {
            const fromNode = nodes.find(n => n.id === conn.fromId);
            const toNode = nodes.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            const isHighlighted = hoveredNode === conn.fromId || hoveredNode === conn.toId ||
              selectedNode === conn.fromId || selectedNode === conn.toId;

            return (
              <motion.path
                key={conn.id}
                d={getConnectionPath(fromNode, toNode)}
                fill="none"
                stroke={conn.isCorrect ? '#10b981' : '#ef4444'}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeDasharray={conn.isCorrect ? '0' : '8 4'}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isHighlighted ? 1 : 0.5 }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                markerEnd={conn.isCorrect ? 'url(#arrowhead-correct)' : 'url(#arrowhead-wrong)'}
              />
            );
          })}
        </svg>

        {nodes.map((node, idx) => {
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              whileHover={{ scale: 1.05 }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedNode(isSelected ? null : node.id)}
              className={cn(
                'absolute w-[180px] rounded-xl border-2 p-3 cursor-pointer transition-all',
                getNodeColor(node.type, node.isCorrect),
                isHovered && 'shadow-lg z-10',
                isSelected && 'ring-2 ring-offset-2 ring-accent-violet'
              )}
              style={{ left: node.x, top: node.y }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-bold',
                  getNodeTextColor(node.type, node.isCorrect),
                  'bg-white/50'
                )}>
                  {getTypeLabel(node.type)}
                </span>
                {!node.isCorrect && (
                  <span className="text-accent-rose text-xs">✗</span>
                )}
              </div>
              <p className="text-sm font-serif text-neutral-ink line-clamp-2">
                {node.content}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-neutral-ivory">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-accent-emerald" />
          <span className="text-xs text-neutral-slate">正确推理</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-accent-rose" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-neutral-slate">错误推理</span>
        </div>
      </div>
    </motion.div>
  );
}
