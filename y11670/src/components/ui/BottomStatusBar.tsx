import { AlertTriangle, CheckCircle, Clock, Route, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '../../store/networkStore';

export const BottomStatusBar = () => {
  const { 
    anomalies, 
    selectedNodeId, 
    getNodeById, 
    pathResult,
    clearPath,
    highlightNodes,
    clearHighlights,
  } = useNetworkStore();

  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);
  const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-4 bg-glass-bg backdrop-blur-xl rounded-2xl border border-glass-border px-6 py-3">
        <AnimatePresence mode="popLayout">
          {selectedNode && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-3 pr-4 border-r border-glass-border"
            >
              <MousePointer2 className="w-4 h-4 text-neon-cyan" />
              <div>
                <div className="text-sm font-mono text-white truncate max-w-48">
                  {selectedNode.label}
                </div>
                <div className="text-xs text-gray-500">已选中</div>
              </div>
            </motion.div>
          )}

          {pathResult && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-3 pr-4 border-r border-glass-border"
            >
              <Route className="w-4 h-4 text-neon-green" />
              <div>
                <div className="text-sm font-mono text-neon-green">
                  路径追踪: {pathResult.nodes.length} 节点
                </div>
                <div className="text-xs text-gray-500">
                  总金额: {pathResult.totalAmount.toFixed(2)} ETH
                </div>
              </div>
              <button
                onClick={clearPath}
                className="p-1 rounded hover:bg-space-blue/50 text-gray-400 hover:text-white"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
            unresolvedAnomalies.length > 0 
              ? 'bg-neon-red/10 text-neon-red' 
              : 'bg-neon-green/10 text-neon-green'
          }`}>
            {unresolvedAnomalies.length > 0 ? (
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span className="font-mono text-sm">
              {unresolvedAnomalies.length} 异常
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-glass-border" />

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neon-cyan" />
            交易所
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neon-red" />
            可疑
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            已修正
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neon-yellow" />
            待确认
          </div>
        </div>
      </div>
    </motion.div>
  );
};
