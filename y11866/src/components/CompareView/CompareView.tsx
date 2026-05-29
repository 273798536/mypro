import { useMemo } from 'react';
import { ArrowLeft, X, ArrowRight, Undo2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { COLORS, formatAddress, formatAmount, formatTimestamp, getRiskLabel } from '@/utils/colors';
import type { TransferEdge, WalletNode, RiskLevel } from '@/types';

interface DiffItem {
  id: string;
  type: 'node' | 'edge';
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  timestamp: number;
  originalNode?: WalletNode;
  modifiedNode?: WalletNode;
  originalEdge?: TransferEdge;
  modifiedEdge?: TransferEdge;
}

export function CompareView() {
  const navigate = useNavigate();
  const { nodes, edges, originalDataSnapshot, corrections, undoCorrection, exitCompareMode } = useAppStore();

  const diffs = useMemo((): DiffItem[] => {
    if (!originalDataSnapshot) return [];

    const items: DiffItem[] = [];

    corrections.forEach(corr => {
      const item: DiffItem = {
        id: corr.id,
        type: corr.targetType,
        field: corr.field,
        oldValue: corr.oldValue,
        newValue: corr.newValue,
        reason: corr.reason,
        timestamp: corr.timestamp,
      };

      if (corr.targetType === 'node') {
        item.originalNode = originalDataSnapshot.nodes.find(n => n.id === corr.targetId);
        item.modifiedNode = nodes.find(n => n.id === corr.targetId);
      } else {
        item.originalEdge = originalDataSnapshot.edges.find(e => e.id === corr.targetId);
        item.modifiedEdge = edges.find(e => e.id === corr.targetId);
      }

      items.push(item);
    });

    return items;
  }, [originalDataSnapshot, nodes, edges, corrections]);

  const riskColor = (level: RiskLevel) => COLORS.node[level];

  const handleGoBack = () => {
    exitCompareMode();
    navigate('/');
  };

  const stats = useMemo(() => {
    const riskChanges = corrections.reduce((acc, c) => {
      const key = `${c.oldValue}→${c.newValue}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: corrections.length,
      edges: corrections.filter(c => c.targetType === 'edge').length,
      nodes: corrections.filter(c => c.targetType === 'node').length,
      riskChanges,
    };
  }, [corrections]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
          style={{
            backgroundColor: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <ArrowLeft size={18} style={{ color: COLORS.text.secondary }} />
          <span className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
            返回分析视图
          </span>
        </button>
      </div>

      <div className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2 tracking-wider"
              style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
            修正对比视图
          </h1>
          <p className="text-sm" style={{ color: COLORS.text.muted }}>
            原始数据与修正后数据并排对比，高亮显示所有变更
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: COLORS.panelBg, border: `1px solid ${COLORS.panelBorder}` }}>
            <div className="text-3xl font-bold mb-1" style={{ color: COLORS.node.selected }}>{stats.total}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>总修正数</div>
          </div>
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: COLORS.panelBg, border: `1px solid ${COLORS.panelBorder}` }}>
            <div className="text-3xl font-bold mb-1" style={{ color: COLORS.node.relay }}>{stats.edges}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>交易边修正</div>
          </div>
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: COLORS.panelBg, border: `1px solid ${COLORS.panelBorder}` }}>
            <div className="text-3xl font-bold mb-1" style={{ color: COLORS.node.medium }}>{stats.nodes}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>地址节点修正</div>
          </div>
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: COLORS.panelBg, border: `1px solid ${COLORS.panelBorder}` }}>
            <div className="text-3xl font-bold mb-1" style={{ color: COLORS.node.low }}>
              {Object.keys(stats.riskChanges).length}
            </div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>风险等级变更类型</div>
          </div>
        </div>

        {diffs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <CheckCircle2 size={40} style={{ color: COLORS.node.low }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: COLORS.text.primary }}>
              暂无修正记录
            </h2>
            <p className="text-sm mb-6" style={{ color: COLORS.text.muted }}>
              在分析视图中手动修正风险等级后，变更将显示在这里
            </p>
            <button
              onClick={handleGoBack}
              className="px-6 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: COLORS.node.selected, color: COLORS.background }}
            >
              开始分析
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 rounded-lg text-xs font-semibold"
                 style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: COLORS.text.muted }}>
              <div className="col-span-1">类型</div>
              <div className="col-span-3">对象</div>
              <div className="col-span-2 text-center">原始值</div>
              <div className="col-span-1 text-center">变更</div>
              <div className="col-span-2 text-center">修正后</div>
              <div className="col-span-2">原因</div>
              <div className="col-span-1 text-center">操作</div>
            </div>

            {diffs.map((diff, index) => (
              <motion.div
                key={diff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-12 gap-4 items-center p-4 rounded-xl"
                style={{
                  backgroundColor: COLORS.panelBg,
                  border: `1px solid ${COLORS.panelBorder}`,
                }}
              >
                <div className="col-span-1">
                  <span className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: diff.type === 'edge'
                            ? `${COLORS.node.relay}20`
                            : `${COLORS.node.medium}20`,
                          color: diff.type === 'edge' ? COLORS.node.relay : COLORS.node.medium,
                        }}>
                    {diff.type === 'edge' ? '交易' : '地址'}
                  </span>
                </div>

                <div className="col-span-3">
                  <div className="font-mono text-sm" style={{ color: COLORS.text.primary }}>
                    {diff.type === 'edge'
                      ? formatAddress(diff.modifiedEdge?.id || diff.originalEdge?.id || '')
                      : formatAddress(diff.modifiedNode?.id || diff.originalNode?.id || '')}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.text.muted }}>
                    {diff.type === 'edge'
                      ? `${formatAmount(diff.modifiedEdge?.amount || 0)} ${diff.modifiedEdge?.token}`
                      : diff.modifiedNode?.label || diff.originalNode?.label}
                  </div>
                </div>

                <div className="col-span-2 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${riskColor(diff.oldValue as RiskLevel)}20`,
                          border: `1px solid ${riskColor(diff.oldValue as RiskLevel)}`,
                          color: riskColor(diff.oldValue as RiskLevel),
                        }}>
                    {getRiskLabel(diff.oldValue as RiskLevel)}
                  </span>
                </div>

                <div className="col-span-1 text-center">
                  <ArrowRight size={20} style={{ color: COLORS.node.selected }} />
                </div>

                <div className="col-span-2 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${riskColor(diff.newValue as RiskLevel)}20`,
                          border: `1px solid ${riskColor(diff.newValue as RiskLevel)}`,
                          color: riskColor(diff.newValue as RiskLevel),
                        }}>
                    {getRiskLabel(diff.newValue as RiskLevel)}
                  </span>
                </div>

                <div className="col-span-2">
                  <p className="text-xs" style={{ color: COLORS.text.secondary }}>
                    {diff.reason}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: COLORS.text.muted }}>
                    {formatTimestamp(diff.timestamp)}
                  </p>
                </div>

                <div className="col-span-1 text-center">
                  <button
                    onClick={() => undoCorrection(diff.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: COLORS.text.secondary }}
                    title="撤销此修正"
                  >
                    <Undo2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8 p-6 rounded-xl"
             style={{ backgroundColor: 'rgba(6, 182, 212, 0.05)', border: `1px solid ${COLORS.panelBorder}` }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: COLORS.text.primary }}>
            <X size={16} style={{ color: COLORS.node.selected }} />
            变更说明
          </h3>
          <ul className="space-y-2 text-xs" style={{ color: COLORS.text.secondary }}>
            <li>• 所有手动修正都会被记录，并可在此视图中进行对比审查</li>
            <li>• 点击左侧的撤销按钮可以恢复到原始风险等级</li>
            <li>• 修正原因会被永久保存，用于审计追踪</li>
            <li>• 建议在导出最终报告前，在此视图确认所有变更</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CompareView;
