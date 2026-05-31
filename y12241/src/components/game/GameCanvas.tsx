import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, RotateCcw, Play, Eye } from 'lucide-react';
import NodeRenderer from './NodeRenderer';
import WireRenderer from './WireRenderer';
import LogicChainLayer from './LogicChainLayer';
import {
  useGameStore,
  useNodes,
  useWires,
  useGameStatus,
  useLogicChains,
  useSelectedNode,
  useSelectedTool,
  useTriggerPoints,
  useOperations,
} from '../../store/useGameStore';
import { useNavigate } from 'react-router-dom';

export default function GameCanvas() {
  const nodes = useNodes();
  const wires = useWires();
  const status = useGameStatus();
  const logicChains = useLogicChains();
  const selectedNode = useSelectedNode();
  const selectedTool = useSelectedTool();
  const triggerPoints = useTriggerPoints();
  const operations = useOperations();
  const resetGame = useGameStore(state => state.actions.resetGame);
  const gameId = useGameStore(state => state.gameState.id);
  const navigate = useNavigate();

  const [rippleNodeId, setRippleNodeId] = useState<string | null>(null);
  const [highlightedOpId, setHighlightedOpId] = useState<string | null>(null);

  useEffect(() => {
    if (operations.length > 0) {
      const lastOp = operations[operations.length - 1];
      setRippleNodeId(lastOp.nodeIds?.[0] || null);
      const timer = setTimeout(() => setRippleNodeId(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [operations.length]);

  const handleGoToReplay = () => {
    navigate(`/replay/${gameId}`);
  };

  return (
    <div className="relative w-full h-full grid-bg rounded-xl border border-slate-700/50 overflow-hidden">
      <svg
        viewBox="0 0 800 500"
        className="w-full h-full"
        style={{ minHeight: '400px' }}
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
              stroke="rgba(148, 163, 184, 0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g className="wires-layer">
          {wires.map(wire => (
            <WireRenderer key={wire.id} wire={wire} nodes={nodes} />
          ))}
        </g>

        {selectedTool === 'wire' && selectedNode && (
          <line
            x1={nodes.find(n => n.id === selectedNode)?.x || 0}
            y1={nodes.find(n => n.id === selectedNode)?.y || 0}
            x2={nodes.find(n => n.id === selectedNode)?.x || 0}
            y2={nodes.find(n => n.id === selectedNode)?.y || 0}
            stroke="#06B6D4"
            strokeWidth={2}
            strokeDasharray="5 5"
            className="pointer-events-none"
          />
        )}

        <g className="nodes-layer">
          {nodes.map(node => (
            <NodeRenderer
              key={node.id}
              node={node}
              showRipple={rippleNodeId === node.id}
            />
          ))}
        </g>

        <LogicChainLayer
          logicChains={logicChains}
          nodes={nodes}
          wires={wires}
          highlightOperationId={highlightedOpId || undefined}
        />
      </svg>

      <div className="absolute top-4 left-4 flex items-center gap-4">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50">
          <span className="text-slate-400 text-xs">阶段</span>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3].map(stage => (
              <div
                key={stage}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  operations.length >= (stage === 1 ? 0 : stage === 2 ? 1 : 4)
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700 text-slate-500'
                }`}
              >
                {stage}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50">
          <span className="text-slate-400 text-xs">关键节点</span>
          <div className="flex gap-1 mt-1">
            {triggerPoints.map((tp, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  tp.type === 'win'
                    ? 'bg-cyan-500'
                    : tp.type === 'anomaly'
                    ? 'bg-red-500'
                    : tp.type === 'connect'
                    ? 'bg-green-500'
                    : 'bg-red-600'
                }`}
                title={`步骤${tp.stepNumber}: ${tp.description}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50 text-xs">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-300">电源</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50 text-xs">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-300">变电站</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50 text-xs">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-300">用户区</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50 text-xs">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-slate-300">并联</span>
        </div>
      </div>

      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl max-w-md w-full mx-4 text-center"
            >
              {status === 'won' ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-green-400">
                    救援成功！
                  </h2>
                  <p className="text-slate-400">
                    所有用户区已恢复供电，电路救援队出色完成任务！
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-slate-500 mb-1">触发连通点</p>
                    <p className="text-amber-400 font-mono">
                      步骤 {triggerPoints.find(t => t.type === 'win')?.stepNumber || '-'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-red-400">
                    救援失败
                  </h2>
                  <p className="text-slate-400">
                    {triggerPoints.find(t => t.type === 'lose')?.description || '电路出现严重异常'}
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-slate-500 mb-1">失败触发点</p>
                    <p className="text-red-400 font-mono">
                      步骤 {triggerPoints.find(t => t.type === 'lose')?.stepNumber || '-'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  重新开始
                </button>
                <button
                  onClick={handleGoToReplay}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  查看回放
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
