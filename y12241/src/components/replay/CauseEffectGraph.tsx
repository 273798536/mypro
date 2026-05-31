import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { CauseEffectNode } from '../../types';

interface CauseEffectGraphProps {
  rootNode: CauseEffectNode;
}

const nodeColors = {
  operation: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
    icon: Zap,
  },
  anomaly: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-300',
    icon: AlertTriangle,
  },
  result: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
    icon: CheckCircle,
  },
};

function TreeNode({ node, depth = 0 }: { node: CauseEffectNode; depth?: number }) {
  const colors = nodeColors[node.type];
  const Icon = colors.icon;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: depth * 0.2 }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.bg} ${colors.border} min-w-[200px] max-w-[300px]`}
      >
        <Icon className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
        <span className={`text-xs ${colors.text} truncate`}>{node.label}</span>
      </motion.div>

      {node.children.length > 0 && (
        <>
          <div className="w-px h-6 bg-slate-600" />
          <div className="flex gap-4 relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-8px)] h-px bg-slate-600" />
            )}
            {node.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {node.children.length > 1 && <div className="w-px h-4 bg-slate-600" />}
                <TreeNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CauseEffectGraph({ rootNode }: CauseEffectGraphProps) {
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      <h3 className="font-display font-bold text-slate-200 mb-6">因果链分析</h3>

      <div className="overflow-x-auto pb-4">
        <div className="flex justify-center min-w-[600px]">
          <TreeNode node={rootNode} />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <h4 className="text-xs text-slate-400 mb-3">图例说明</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-400">操作</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">异常</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span className="text-xs text-slate-400">结果</span>
          </div>
        </div>
      </div>
    </div>
  );
}
