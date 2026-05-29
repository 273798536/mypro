import { useState } from 'react';
import { AlertTriangle, ChevronUp, ChevronDown, Crosshair, CheckCircle, XCircle, Layers, Repeat, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { PendingItem, PendingType } from '@/types';
import { COLORS, formatAddress } from '@/utils/colors';

const TYPE_CONFIG: Record<PendingType, {
  icon: typeof Layers;
  label: string;
  color: string;
  description: string;
}> = {
  internal_mislabel: {
    icon: GitBranch,
    label: '内部转账误标',
    color: COLORS.node.high,
    description: '系统检测到可能被误标为高风险的内部转账',
  },
  cross_chain_duplicate: {
    icon: Repeat,
    label: '跨链重复交易',
    color: COLORS.node.pending,
    description: '检测到多笔相同金额的跨链重复交易',
  },
  dense_cluster: {
    icon: Layers,
    label: '节点过密聚类',
    color: COLORS.node.medium,
    description: '地址聚类连接过于密集，需要人工审查',
  },
};

export function PendingArea() {
  const { pendingItems, focusOnPendingItem, highlightedNodeIds, highlightedEdgeIds, clearHighlights } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeType, setActiveType] = useState<PendingType | 'all'>('all');

  const groupedItems = pendingItems.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<PendingType, PendingItem[]>);

  const filteredItems = activeType === 'all'
    ? pendingItems
    : groupedItems[activeType] || [];

  const isHighlightActive = highlightedNodeIds.length > 0 || highlightedEdgeIds.length > 0;

  return (
    <>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-t-xl flex items-center gap-2 transition-all hover:scale-105"
        style={{
          backgroundColor: isExpanded ? COLORS.panelBg : 'rgba(15, 31, 53, 0.95)',
          border: `1px solid ${COLORS.panelBorder}`,
          borderBottom: 'none',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <AlertTriangle size={16} style={{ color: COLORS.node.medium }} />
        <span className="text-xs font-semibold tracking-wide"
              style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
          待确认异常
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: pendingItems.length > 0 ? COLORS.node.high : 'rgba(255,255,255,0.1)',
                color: pendingItems.length > 0 ? COLORS.background : COLORS.text.secondary,
              }}>
          {pendingItems.length}
        </span>
        {isExpanded ? <ChevronDown size={16} style={{ color: COLORS.text.secondary }} />
                    : <ChevronUp size={16} style={{ color: COLORS.text.secondary }} />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: 400, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-20 left-4 right-4 z-10 rounded-xl overflow-hidden"
            style={{
              backgroundColor: COLORS.panelBg,
              border: `1px solid ${COLORS.panelBorder}`,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)',
              maxHeight: '45vh',
            }}
          >
            <div className="p-4 border-b flex items-center justify-between"
                 style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-sm tracking-wide"
                    style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
                  异常检测结果
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveType('all')}
                    className="px-2 py-1 rounded text-xs font-medium transition-all"
                    style={{
                      backgroundColor: activeType === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: activeType === 'all' ? COLORS.text.primary : COLORS.text.muted,
                    }}
                  >
                    全部 ({pendingItems.length})
                  </button>
                  {(Object.keys(TYPE_CONFIG) as PendingType[]).map(type => {
                    const config = TYPE_CONFIG[type];
                    const count = groupedItems[type]?.length || 0;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveType(type)}
                        className="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1"
                        style={{
                          backgroundColor: activeType === type ? `${config.color}20` : 'transparent',
                          color: activeType === type ? config.color : COLORS.text.muted,
                        }}
                      >
                        <config.icon size={12} />
                        {count}
                      </button>
                    );
                  })}
                </div>
              </div>
              {isHighlightActive && (
                <button
                  onClick={clearHighlights}
                  className="px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: COLORS.node.high,
                  }}
                >
                  <XCircle size={14} />
                  清除高亮
                </button>
              )}
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(45vh - 65px)' }}>
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="mx-auto mb-3" style={{ color: COLORS.node.low }} />
                  <p className="text-sm" style={{ color: COLORS.text.muted }}>
                    当前分类下没有待确认异常
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {(Object.keys(TYPE_CONFIG) as PendingType[]).filter(type =>
                    activeType === 'all' || activeType === type
                  ).map(type => {
                    const items = groupedItems[type] || [];
                    if (items.length === 0) return null;

                    const config = TYPE_CONFIG[type];
                    const Icon = config.icon;

                    return (
                      <div key={type} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                               style={{ backgroundColor: `${config.color}20` }}>
                            <Icon size={16} style={{ color: config.color }} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold"
                                 style={{ color: COLORS.text.primary }}>
                              {config.label}
                            </div>
                            <div className="text-[10px]" style={{ color: COLORS.text.muted }}>
                              {config.description}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {items.map(item => (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isHighlightActive && item.relatedNodeIds.some(id => highlightedNodeIds.includes(id))
                                  ? config.color
                                  : 'rgba(255,255,255,0.05)'}`,
                              }}
                              onClick={() => focusOnPendingItem(item.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-xs flex-1" style={{ color: COLORS.text.secondary }}>
                                  {item.description}
                                </p>
                                <button
                                  className="p-1 rounded hover:bg-white/10 shrink-0 ml-2"
                                  style={{ color: COLORS.node.selected }}
                                  title="定位到3D视图"
                                >
                                  <Crosshair size={14} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]"
                                   style={{ color: COLORS.text.muted }}>
                                <span>{item.relatedNodeIds.length} 个地址</span>
                                <span>•</span>
                                <span>{item.relatedEdgeIds.length} 笔交易</span>
                              </div>
                              {item.relatedNodeIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.relatedNodeIds.slice(0, 3).map(nodeId => (
                                    <span
                                      key={nodeId}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                                      style={{
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        color: COLORS.text.muted,
                                      }}
                                    >
                                      {formatAddress(nodeId, 4, 4)}
                                    </span>
                                  ))}
                                  {item.relatedNodeIds.length > 3 && (
                                    <span className="px-1.5 py-0.5 text-[10px]"
                                          style={{ color: COLORS.text.muted }}>
                                      +{item.relatedNodeIds.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PendingArea;
