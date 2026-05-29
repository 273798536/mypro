import { useState } from 'react';
import { X, Copy, Check, Edit2, ChevronDown, ChevronUp, AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useSelectedNode, useSelectedEdge, useNodeEdges } from '@/store/useAppStore';
import type { RiskLevel } from '@/types';
import { COLORS, formatAddress, formatAmount, formatTimestamp, getRiskLabel, getChainColor } from '@/utils/colors';

const RISK_OPTIONS: { value: RiskLevel; icon: typeof Shield; label: string }[] = [
  { value: 'low', icon: ShieldCheck, label: '低风险' },
  { value: 'medium', icon: Shield, label: '中风险' },
  { value: 'high', icon: ShieldAlert, label: '高风险' },
  { value: 'pending', icon: AlertTriangle, label: '待确认' },
];

export function DetailPanel() {
  const { selectedNodeId, selectedEdgeId, setSelectedNode, setSelectedEdge, updateNodeRisk, updateEdgeRisk } = useAppStore();
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  const nodeEdges = useNodeEdges(selectedNodeId);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | null>(null);
  const [expandedEdges, setExpandedEdges] = useState<Set<string>>(new Set());

  const hasSelection = selectedNodeId || selectedEdgeId;

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEdgeExpand = (edgeId: string) => {
    setExpandedEdges(prev => {
      const next = new Set(prev);
      if (next.has(edgeId)) {
        next.delete(edgeId);
      } else {
        next.add(edgeId);
      }
      return next;
    });
  };

  const handleEditRisk = () => {
    if (selectedNode) {
      setSelectedRisk(selectedNode.riskLevel);
    } else if (selectedEdge) {
      setSelectedRisk(selectedEdge.riskLevel);
    }
    setEditReason('');
    setIsEditing(true);
  };

  const handleSaveRisk = () => {
    if (!selectedRisk) return;

    if (selectedNode && selectedNode.riskLevel !== selectedRisk) {
      updateNodeRisk(selectedNode.id, selectedRisk, editReason);
    } else if (selectedEdge && selectedEdge.riskLevel !== selectedRisk) {
      updateEdgeRisk(selectedEdge.id, selectedRisk, editReason);
    }
    setIsEditing(false);
    setSelectedRisk(null);
    setEditReason('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRisk(null);
    setEditReason('');
  };

  const handleClose = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsEditing(false);
  };

  if (!hasSelection) {
    return (
      <motion.div
        initial={{ x: 350 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute right-4 top-4 bottom-24 w-80 rounded-xl overflow-hidden z-10 flex flex-col"
        style={{
          backgroundColor: COLORS.panelBg,
          border: `1px solid ${COLORS.panelBorder}`,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}>
              <Shield size={32} style={{ color: COLORS.node.selected }} />
            </div>
            <h3 className="text-sm font-semibold mb-2"
                style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
              选择地址或交易
            </h3>
            <p className="text-xs" style={{ color: COLORS.text.muted }}>
              点击3D视图中的节点或连线查看详细信息
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 350 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute right-4 top-4 bottom-24 w-80 rounded-xl overflow-hidden z-10 flex flex-col"
      style={{
        backgroundColor: COLORS.panelBg,
        border: `1px solid ${COLORS.panelBorder}`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="p-4 border-b flex items-center justify-between"
           style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <h2 className="font-semibold text-sm tracking-wide"
            style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
          {selectedNode ? '地址详情' : '交易详情'}
        </h2>
        <button
          onClick={handleClose}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: COLORS.text.secondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedNode && (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                   style={{ backgroundColor: `${COLORS.node[selectedNode.riskLevel]}20` }}>
                {selectedNode.type === 'relay' ? (
                  <div className="w-6 h-6" style={{
                    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    backgroundColor: COLORS.node[selectedNode.riskLevel],
                  }} />
                ) : selectedNode.type === 'risk' ? (
                  <div className="w-6 h-6 rounded-full" style={{
                    backgroundColor: COLORS.node[selectedNode.riskLevel],
                  }} />
                ) : (
                  <div className="w-6 h-6 rounded-lg" style={{
                    backgroundColor: COLORS.node[selectedNode.riskLevel],
                  }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-1 truncate"
                     style={{ color: COLORS.text.primary }}>
                  {selectedNode.label}
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="text-xs font-mono" style={{ color: COLORS.text.secondary }}>
                    {formatAddress(selectedNode.id)}
                  </code>
                  <button
                    onClick={() => handleCopy(selectedNode.id, selectedNode.id)}
                    className="p-0.5 hover:bg-white/10 rounded"
                    style={{ color: COLORS.text.muted }}
                  >
                    {copiedId === selectedNode.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs mb-1" style={{ color: COLORS.text.muted }}>交易次数</div>
                <div className="text-lg font-bold" style={{ color: COLORS.node.selected }}>{selectedNode.txCount}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs mb-1" style={{ color: COLORS.text.muted }}>总交易额</div>
                <div className="text-lg font-bold" style={{ color: COLORS.node.medium }}>{formatAmount(selectedNode.totalAmount)}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: COLORS.text.muted }}>风险等级</span>
                {isEditing ? (
                  <select
                    value={selectedRisk || ''}
                    onChange={(e) => setSelectedRisk(e.target.value as RiskLevel)}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: selectedRisk ? `${COLORS.node[selectedRisk]}20` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${selectedRisk ? COLORS.node[selectedRisk] : COLORS.panelBorder}`,
                      color: selectedRisk ? COLORS.node[selectedRisk] : COLORS.text.primary,
                      outline: 'none',
                    }}
                  >
                    {RISK_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${COLORS.node[selectedNode.riskLevel]}20`,
                          border: `1px solid ${COLORS.node[selectedNode.riskLevel]}`,
                          color: COLORS.node[selectedNode.riskLevel],
                        }}>
                    {getRiskLabel(selectedNode.riskLevel)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: COLORS.text.muted }}>所属链</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${getChainColor(selectedNode.chain)}20`,
                        color: getChainColor(selectedNode.chain),
                      }}>
                  {selectedNode.chain}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: COLORS.text.muted }}>节点类型</span>
                <span className="text-xs" style={{ color: COLORS.text.secondary }}>
                  {selectedNode.type === 'relay' ? '中转地址' : selectedNode.type === 'risk' ? '风险地址' : '普通地址'}
                </span>
              </div>

              {selectedNode.isInternal && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: COLORS.text.muted }}>内部地址</span>
                  <span className="text-xs" style={{ color: COLORS.node.relay }}>是</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div>
                <label className="block text-xs mb-1.5" style={{ color: COLORS.text.muted }}>修正原因</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="请输入修正原因..."
                  className="w-full px-3 py-2 rounded-lg text-xs resize-none"
                  rows={3}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${COLORS.panelBorder}`,
                    color: COLORS.text.primary,
                    outline: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>
            )}

            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRisk}
                  disabled={!selectedRisk || !editReason.trim()}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedRisk && editReason.trim() ? COLORS.node.selected : 'rgba(255,255,255,0.1)',
                    color: selectedRisk && editReason.trim() ? COLORS.background : COLORS.text.muted,
                  }}
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: COLORS.text.secondary,
                  }}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditRisk}
                className="w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: `${COLORS.node.selected}15`,
                  border: `1px solid ${COLORS.node.selected}40`,
                  color: COLORS.node.selected,
                }}
              >
                <Edit2 size={14} />
                手动修正风险等级
              </button>
            )}

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold"
                    style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
                  关联交易 ({nodeEdges.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {nodeEdges.slice(0, 10).map(edge => (
                  <div key={edge.id} className="p-2 rounded-lg cursor-pointer transition-all hover:bg-white/5"
                       onClick={() => { setSelectedEdge(edge.id); setSelectedNode(null); }}
                       style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: COLORS.node[edge.riskLevel] }} />
                        <span className="text-xs font-mono" style={{ color: COLORS.text.secondary }}>
                          {formatAddress(edge.id)}
                        </span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: COLORS.node[edge.riskLevel] }}>
                        {formatAmount(edge.amount)} {edge.token}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: COLORS.text.muted }}>
                        {edge.source === selectedNode.id ? '转出 →' : '← 转入'}
                      </span>
                      <span className="text-[10px]" style={{ color: COLORS.text.muted }}>
                        {formatTimestamp(edge.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.node[selectedEdge.riskLevel]}10` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.node[selectedEdge.riskLevel] }} />
                  <span className="text-xs font-medium" style={{ color: COLORS.node[selectedEdge.riskLevel] }}>
                    {getRiskLabel(selectedEdge.riskLevel)}
                  </span>
                </div>
                <span className="text-lg font-bold" style={{ color: COLORS.text.primary }}>
                  {formatAmount(selectedEdge.amount)} {selectedEdge.token}
                </span>
              </div>
              <div className="text-xs font-mono flex items-center gap-1.5" style={{ color: COLORS.text.secondary }}>
                {formatAddress(selectedEdge.id)}
                <button
                  onClick={() => handleCopy(selectedEdge.id, selectedEdge.id)}
                  className="p-0.5 hover:bg-white/10 rounded"
                  style={{ color: COLORS.text.muted }}
                >
                  {copiedId === selectedEdge.id ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1.5" style={{ color: COLORS.text.muted }}>转出地址</div>
                <div className="flex items-center justify-between p-2 rounded-lg"
                     style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <code className="text-xs font-mono" style={{ color: COLORS.text.secondary }}>
                    {formatAddress(selectedEdge.source)}
                  </code>
                  <button
                    onClick={() => handleCopy(selectedEdge.source, `source-${selectedEdge.id}`)}
                    className="p-0.5 hover:bg-white/10 rounded"
                    style={{ color: COLORS.text.muted }}
                  >
                    {copiedId === `source-${selectedEdge.id}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: `${COLORS.node.selected}20` }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.node.selected} strokeWidth="2">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <div className="text-xs mb-1.5" style={{ color: COLORS.text.muted }}>转入地址</div>
                <div className="flex items-center justify-between p-2 rounded-lg"
                     style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <code className="text-xs font-mono" style={{ color: COLORS.text.secondary }}>
                    {formatAddress(selectedEdge.target)}
                  </code>
                  <button
                    onClick={() => handleCopy(selectedEdge.target, `target-${selectedEdge.id}`)}
                    className="p-0.5 hover:bg-white/10 rounded"
                    style={{ color: COLORS.text.muted }}
                  >
                    {copiedId === `target-${selectedEdge.id}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs mb-1" style={{ color: COLORS.text.muted }}>交易时间</div>
                <div className="text-xs font-mono" style={{ color: COLORS.text.primary }}>
                  {formatTimestamp(selectedEdge.timestamp)}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs mb-1" style={{ color: COLORS.text.muted }}>所属链</div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${getChainColor(selectedEdge.chain)}20`,
                        color: getChainColor(selectedEdge.chain),
                      }}>
                  {selectedEdge.chain}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {selectedEdge.isCrossChain && (
                <div className="flex items-center gap-2 p-2 rounded-lg"
                     style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <AlertTriangle size={14} style={{ color: COLORS.node.pending }} />
                  <span className="text-xs" style={{ color: COLORS.node.pending }}>跨链交易</span>
                </div>
              )}
              {selectedEdge.isDuplicate && (
                <div className="flex items-center gap-2 p-2 rounded-lg"
                     style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <AlertTriangle size={14} style={{ color: COLORS.node.medium }} />
                  <span className="text-xs" style={{ color: COLORS.node.medium }}>疑似重复交易</span>
                </div>
              )}
              {selectedEdge.isModified && (
                <div className="flex items-center gap-2 p-2 rounded-lg"
                     style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}>
                  <Edit2 size={14} style={{ color: COLORS.node.selected }} />
                  <span className="text-xs" style={{ color: COLORS.node.selected }}>已手动修正</span>
                </div>
              )}
              {selectedEdge.notes && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-xs mb-1" style={{ color: COLORS.text.muted }}>备注</div>
                  <div className="text-xs" style={{ color: COLORS.text.secondary }}>{selectedEdge.notes}</div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: COLORS.text.muted }}>风险等级</span>
                {!isEditing && (
                  <span className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${COLORS.node[selectedEdge.riskLevel]}20`,
                          border: `1px solid ${COLORS.node[selectedEdge.riskLevel]}`,
                          color: COLORS.node[selectedEdge.riskLevel],
                        }}>
                    {getRiskLabel(selectedEdge.riskLevel)}
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {RISK_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedRisk(opt.value)}
                          className="p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                          style={{
                            backgroundColor: selectedRisk === opt.value ? `${COLORS.node[opt.value]}20` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selectedRisk === opt.value ? COLORS.node[opt.value] : 'rgba(255,255,255,0.1)'}`,
                            color: selectedRisk === opt.value ? COLORS.node[opt.value] : COLORS.text.secondary,
                          }}
                        >
                          <Icon size={14} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: COLORS.text.muted }}>修正原因</label>
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="请输入修正原因..."
                      className="w-full px-3 py-2 rounded-lg text-xs resize-none"
                      rows={3}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.panelBorder}`,
                        color: COLORS.text.primary,
                        outline: 'none',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveRisk}
                      disabled={!selectedRisk || !editReason.trim()}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: selectedRisk && editReason.trim() ? COLORS.node.selected : 'rgba(255,255,255,0.1)',
                        color: selectedRisk && editReason.trim() ? COLORS.background : COLORS.text.muted,
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: COLORS.text.secondary,
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleEditRisk}
                  className="w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: `${COLORS.node.selected}15`,
                    border: `1px solid ${COLORS.node.selected}40`,
                    color: COLORS.node.selected,
                  }}
                >
                  <Edit2 size={14} />
                  手动修正风险等级
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DetailPanel;
