import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { PendingItem } from '@/types';

const PendingItemCard = ({ item }: { item: PendingItem }) => {
  const { resolvePendingItem, resourcePoints } = useGameStore();
  const canResolve = resourcePoints >= 25;

  const getTypeIcon = () => {
    switch (item.type) {
      case 'duplicate_stake':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'sync_lag':
        return <Clock className="w-5 h-5 text-orange-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case 'duplicate_stake':
        return '重复质押';
      case 'sync_lag':
        return '同步落后';
      default:
        return '待处理';
    }
  };

  const getUrgencyColor = () => {
    if (item.roundsPending >= 3) return 'border-red-500 bg-red-500/10';
    if (item.roundsPending >= 2) return 'border-orange-500 bg-orange-500/10';
    return 'border-amber-500 bg-amber-500/10';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-4 rounded-lg border ${getUrgencyColor()} ${item.isResolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <motion.div
            animate={item.isResolved ? {} : { scale: [1, 1.1, 1] }}
            transition={{ repeat: item.isResolved ? 0 : Infinity, duration: 2 }}
          >
            {item.isResolved ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              getTypeIcon()
            )}
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                item.isResolved 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {getTypeLabel()}
              </span>
              <span className="text-xs text-slate-400">
                {item.nodeName}
              </span>
            </div>
            <p className="text-sm text-slate-300">{item.description}</p>
            {!item.isResolved && (
              <p className="text-xs mt-2 text-slate-400">
                已等待 <span className="text-amber-400 font-mono">{item.roundsPending}</span> 回合
                {item.roundsPending >= 2 && (
                  <span className="text-red-400 ml-2">
                    ⚠️ {3 - item.roundsPending} 回合后将触发额外惩罚
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {!item.isResolved && (
          <motion.button
            whileHover={{ scale: canResolve ? 1.05 : 1 }}
            whileTap={{ scale: canResolve ? 0.95 : 1 }}
            onClick={() => canResolve && resolvePendingItem(item.id)}
            disabled={!canResolve}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
              canResolve
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            处理 (-25)
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export const PendingArea = () => {
  const { pendingItems } = useGameStore();
  const unresolvedItems = pendingItems.filter((p) => !p.isResolved);
  const resolvedItems = pendingItems.filter((p) => p.isResolved);
  const hasItems = pendingItems.length > 0;

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className={`rounded-xl border-2 p-5 ${
        unresolvedItems.length > 0
          ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10'
          : 'border-slate-700 bg-slate-800/30'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 font-['Orbitron']">
          <AlertTriangle className={`w-5 h-5 ${unresolvedItems.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          待确认区
          {unresolvedItems.length > 0 && (
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="px-2 py-0.5 text-xs bg-amber-500 text-slate-900 rounded-full font-bold"
            >
              {unresolvedItems.length}
            </motion.span>
          )}
        </h2>
      </div>

      {!hasItems ? (
        <div className="text-center py-8 text-slate-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>暂无待确认事项</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          <AnimatePresence>
            {unresolvedItems.map((item) => (
              <PendingItemCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
          {resolvedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-3">已处理</p>
              <AnimatePresence>
                {resolvedItems.slice(-3).map((item) => (
                  <PendingItemCard key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {unresolvedItems.length > 0 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-300">
            ⚠️ 待确认事项超过 3 回合未处理，将被标记为「运营失误」并追加惩罚
          </p>
        </div>
      )}
    </motion.div>
  );
};
