import { useState } from 'react';
import { 
  X, Wallet, Hash, Calendar, DollarSign, Activity, 
  Tag, FileText, AlertCircle, CheckCircle, Clock, 
  ArrowRightLeft, Plus, Send, Users, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '../../store/networkStore';
import type { NodeStatus } from '../../types';

export const DetailPanel = () => {
  const { 
    selectedNodeId, 
    selectNode, 
    getNodeById, 
    getNodeEdges,
    getRelatedAnomalies,
    updateNodeStatus,
    addNote,
    pathResult,
    clearPath,
  } = useNetworkStore();

  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'anomalies'>('info');

  const node = selectedNodeId ? getNodeById(selectedNodeId) : null;
  const edges = selectedNodeId ? getNodeEdges(selectedNodeId) : [];
  const anomalies = selectedNodeId ? getRelatedAnomalies(selectedNodeId) : [];

  if (!selectedNodeId || !node) {
    return (
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute right-6 top-28 bottom-6 w-96 z-40"
      >
        <div className="h-full bg-glass-bg backdrop-blur-xl rounded-2xl border border-glass-border flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-space-blue/50 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-neon-cyan" />
            </div>
            <p className="text-gray-400 font-mono text-sm">点击节点查看详情</p>
            <p className="text-gray-500 text-xs mt-2">双击节点可聚焦视图</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote(node.id, newNote, '当前用户');
      setNewNote('');
    }
  };

  const statusConfig: Record<NodeStatus, { label: string; color: string; icon: React.ReactNode }> = {
    untreated: { label: '未处理', color: 'text-gray-400', icon: <Clock className="w-4 h-4" /> },
    corrected: { label: '已修正', color: 'text-neon-green', icon: <CheckCircle className="w-4 h-4" /> },
    pending: { label: '待确认', color: 'text-neon-yellow', icon: <AlertCircle className="w-4 h-4" /> },
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="absolute right-6 top-28 bottom-6 w-96 z-40"
    >
      <div className="h-full bg-glass-bg backdrop-blur-xl rounded-2xl border border-glass-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${statusConfig[node.status].color} bg-space-blue/50`}>
                  {statusConfig[node.status].icon}
                  {statusConfig[node.status].label}
                </span>
                {node.isExchange && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono text-neon-cyan bg-neon-cyan/10">
                    <Building2 className="w-3 h-3" />
                    交易所
                  </span>
                )}
                {node.isSuspicious && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono text-neon-red bg-neon-red/10">
                    <AlertCircle className="w-3 h-3" />
                    可疑
                  </span>
                )}
              </div>
              <h2 className="font-orbitron font-bold text-white text-lg truncate">
                {node.label}
              </h2>
              <p className="font-mono text-xs text-gray-500 truncate mt-1">
                {node.address}
              </p>
            </div>
            <button
              onClick={() => selectNode(null)}
              className="p-2 rounded-lg hover:bg-space-blue/50 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {pathResult && (
            <div className="mt-4 p-3 bg-neon-green/10 rounded-xl border border-neon-green/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neon-green">
                  <Zap className="w-4 h-4" />
                  <span className="font-mono text-sm">路径追踪完成</span>
                </div>
                <button
                  onClick={clearPath}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  清除
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                途经 {pathResult.nodes.length} 个节点，总金额 {pathResult.totalAmount.toFixed(2)} ETH
              </p>
            </div>
          )}
        </div>

        <div className="flex border-b border-glass-border">
          {(['info', 'transactions', 'anomalies'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 font-mono text-sm transition-all relative ${
                activeTab === tab
                  ? 'text-neon-cyan'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'info' && '基本信息'}
              {tab === 'transactions' && `交易 (${edges.length})`}
              {tab === 'anomalies' && `异常 (${anomalies.length})`}
              {activeTab === tab && (
                <motion.div
                  layoutId="detailTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <InfoRow icon={<DollarSign className="w-4 h-4" />} label="余额" value={`${node.balance.toFixed(2)} ETH`} />
                <InfoRow icon={<Activity className="w-4 h-4" />} label="交易数" value={node.txCount.toString()} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="首次出现" value={node.firstSeen.toLocaleDateString()} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="最后活跃" value={node.lastSeen.toLocaleDateString()} />
                <InfoRow icon={<Hash className="w-4 h-4" />} label="重要性评分" value={`${(node.importance * 100).toFixed(0)}%`} />

                <div className="pt-4 border-t border-glass-border">
                  <div className="flex items-center gap-2 text-neon-purple mb-3">
                    <Tag className="w-4 h-4" />
                    <span className="font-mono text-sm font-bold">标签</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {node.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-xs font-mono"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                        <span className="opacity-50 ml-1">({tag.source})</span>
                      </span>
                    ))}
                    {node.tags.length === 0 && (
                      <span className="text-xs text-gray-500">暂无标签</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-glass-border">
                  <div className="flex items-center gap-2 text-neon-purple mb-3">
                    <FileText className="w-4 h-4" />
                    <span className="font-mono text-sm font-bold">调查备注</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {node.notes.map(note => (
                      <div key={note.id} className="p-3 bg-space-blue/30 rounded-xl">
                        <p className="text-sm text-gray-300">{note.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{note.author}</span>
                          <span>{note.updatedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                      placeholder="添加备注..."
                      className="flex-1 bg-space-blue/50 border border-glass-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                    />
                    <button
                      onClick={handleAddNote}
                      className="p-2 bg-neon-cyan text-space-black rounded-lg hover:bg-neon-cyan/80 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-glass-border">
                  <div className="flex items-center gap-2 text-neon-purple mb-3">
                    <Activity className="w-4 h-4" />
                    <span className="font-mono text-sm font-bold">状态更新</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['untreated', 'corrected', 'pending'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => updateNodeStatus(node.id, status)}
                        className={`py-2 px-3 rounded-lg font-mono text-xs transition-all ${
                          node.status === status
                            ? `${statusConfig[status].color.replace('text-', 'bg-')}/20 border ${statusConfig[status].color.replace('text-', 'border-')}`
                            : 'bg-space-blue/50 border border-glass-border text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {statusConfig[status].label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                {edges.map(edge => {
                  const isOutgoing = edge.source === node.id;
                  return (
                    <div key={edge.id} className="p-3 bg-space-blue/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className={`w-4 h-4 ${isOutgoing ? 'text-neon-red' : 'text-neon-green'}`} />
                          <span className="font-mono text-sm">
                            {isOutgoing ? '转出' : '转入'}
                          </span>
                        </div>
                        <span className={`font-mono font-bold ${isOutgoing ? 'text-neon-red' : 'text-neon-green'}`}>
                          {isOutgoing ? '-' : '+'}{edge.amount.toFixed(2)} ETH
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {isOutgoing ? '至' : '自'}: {edge.id.slice(0, 20)}...
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {edge.timestamp.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
                {edges.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无交易记录
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'anomalies' && (
              <motion.div
                key="anomalies"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                {anomalies.map(anomaly => (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-xl border ${
                      anomaly.resolved
                        ? 'bg-neon-green/10 border-neon-green/30'
                        : anomaly.severity === 'high'
                        ? 'bg-neon-red/10 border-neon-red/30'
                        : anomaly.severity === 'medium'
                        ? 'bg-neon-yellow/10 border-neon-yellow/30'
                        : 'bg-space-blue/30 border-glass-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                        anomaly.severity === 'high' ? 'bg-neon-red text-white' :
                        anomaly.severity === 'medium' ? 'bg-neon-yellow text-space-black' :
                        'bg-gray-500 text-white'
                      }`}>
                        {anomaly.severity === 'high' ? '高危' : anomaly.severity === 'medium' ? '中危' : '低危'}
                      </span>
                      {anomaly.resolved && (
                        <span className="text-neon-green text-xs">已处理</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300">{anomaly.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      类型: {anomaly.type === 'cycle' ? '循环转账' : 
                             anomaly.type === 'exchange_hub' ? '交易所中转' : '标签冲突'}
                    </p>
                  </div>
                ))}
                {anomalies.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-neon-green/50" />
                    <p>暂无异常记录</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-gray-400">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className="font-mono text-white text-sm">{value}</span>
  </div>
);

const Building2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);
